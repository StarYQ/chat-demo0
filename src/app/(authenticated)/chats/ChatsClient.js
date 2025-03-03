// file: src/app/(authenticated)/chats/ChatsClient.jsx
"use client"; // This makes it a client component

import React, { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import Link from 'next/link';

export default function ChatsClient({ initialChats, userId }) {
  const [chats, setChats] = useState(initialChats);
  const [newUserEmail, setNewUserEmail] = useState('');

  useEffect(() => {
    const channel = supabase
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
      supabase.removeChannel(channel);
    };
  }, []);

  async function refreshChats() {
    const { data: chatIds } = await supabase
      .from('chats_users')
      .select('chat_id')
      .eq('user_id', userId);

    if (!chatIds) return;

    const chatIdList = chatIds.map((entry) => entry.chat_id);
    if (chatIdList.length === 0) {
      setChats([]);
      return;
    }

    const { data: fetchedChats } = await supabase
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
  
    // 2) Create a new chat (empty insert should use defaults)
    const { data: newChat, error: chatError, status } = await supabase
    .from('chats')
    .insert([{}])
    .select('*')
    .single();

    console.log("Insert response:", { newChat, chatError, status });

    if (!newChat) {
      console.error("Error creating chat:", chatError);
      alert('Could not create chat.');
      return;
    }
  
    // 3) Add users to the chat
    const { error: joinError } = await supabase
      .from('chats_users')
      .insert([
        { chat_id: newChat.id, user_id: userId },
        { chat_id: newChat.id, user_id: existingUser.id },
      ]);
  
    if (joinError) {
      console.error("Error adding users to chat:", joinError);
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
