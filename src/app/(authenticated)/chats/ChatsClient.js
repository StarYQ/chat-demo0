// file: src/app/(authenticated)/chats/ChatsClient.jsx
"use client"; // This makes it a client component

import React, { useState, useEffect } from 'react';
import supabaseBrowserClient from '@/lib/supabase';
import Link from 'next/link';

export default function ChatsClient({ initialChats, userId }) {
  const [chats, setChats] = useState(initialChats);
  const [newUserEmail, setNewUserEmail] = useState('');

  useEffect(() => {
    const channel = supabaseBrowserClient
      .channel('chats-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        () => refreshChats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats_users' },
        () => refreshChats()
      )
      .subscribe();

    return () => {
      supabaseBrowserClient.removeChannel(channel);
    };
  }, []);

  async function refreshChats() {
    const { data: chatIds } = await supabaseBrowserClient
      .from('chats_users')
      .select('chat_id')
      .eq('user_id', userId);

    if (!chatIds) return;

    const chatIdList = chatIds.map((entry) => entry.chat_id);
    if (chatIdList.length === 0) {
      setChats([]);
      return;
    }

    const { data: fetchedChats } = await supabaseBrowserClient
      .from('chats')
      .select('id, created_at')
      .in('id', chatIdList);

    setChats(fetchedChats || []);
  }

  async function createChatWithUser() {
    if (!newUserEmail) {
      alert('Please enter an email address');
      return;
    }
  
    // 1) Fetch the user ID from our profiles table
    const response = await fetch(`/api/find-user-by-email?email=${encodeURIComponent(newUserEmail)}`);
    
    if (!response.ok) {
      alert('No user found with that email!');
      return;
    }
  
    const { user: existingUser } = await response.json(); // { id, email }
  
    // 2) Create a new chat
    const { data: newChat, error: chatError } = await supabaseBrowserClient
      .from('chats')
      .insert({})
      .select()
      .single();
  
    if (!newChat) {
      alert('Could not create chat.');
      return;
    }
  
    // 3) Add users to the chat
    const { error: joinError } = await supabaseBrowserClient
      .from('chats_users')
      .insert([
        { chat_id: newChat.id, user_id: userId },
        { chat_id: newChat.id, user_id: existingUser.id },
      ]);
  
    if (joinError) {
      alert('Could not add users to chat.');
      return;
    }
  
    // Refresh chat list
    refreshChats();
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>My Chats</h1>
      {chats.length === 0 && <p>No chats yet.</p>}
      <ul style={{ marginTop: '1rem' }}>
        {chats.map((chat) => (
          <li key={chat.id} style={{ padding: '4px 0' }}>
            <Link href={`/chats/${chat.id}`}>Chat #{chat.id}</Link>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: '2rem' }}>
        <input
          type="email"
          placeholder="Other user's email"
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
        />
        <button onClick={createChatWithUser}>Create Chat</button>
      </div>
    </div>
  );
}
