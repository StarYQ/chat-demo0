"use client";

import React, { useState, useEffect } from 'react';
import supabaseBrowserClient from '@/lib/supabase';

export default function ChatDetailClient({ chatId, initialMessages }) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [newMessage, setNewMessage] = useState('');

  // Subscribe to realtime changes (like Svelte’s messagesWatcher)
  useEffect(() => {
    const channel = supabaseBrowserClient
      .channel(`messages-realtime-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,  // only notifications for this chat
        },
        (payload) => {
          console.log('messages changed:', payload);
          refreshMessages();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabaseBrowserClient.removeChannel(channel);
    };
  }, [chatId]);

  async function refreshMessages() {
    const { data, error } = await supabaseBrowserClient
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  }

  async function sendMessage() {
    const {
      data: { user },
      error: userError,
    } = await supabaseBrowserClient.auth.getUser();

    if (!user) {
      alert('Please log in again.');
      return;
    }

    // Insert a new message
    const { error: insertError } = await supabaseBrowserClient
      .from('messages')
      .insert([
        {
          chat_id: parseInt(chatId),
          author_id: user.id,
          content: newMessage,
        },
      ]);

    if (insertError) {
      console.error('Error inserting message:', insertError);
    } else {
      setNewMessage('');
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Chat #{chatId}</h2>

      <div style={{ margin: '1rem 0' }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: '0.5rem' }}>
            <strong>{m.author_id}</strong>: {m.content}
          </div>
        ))}
      </div>

      <div>
        <input
          type="text"
          placeholder="Enter a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ marginRight: '0.5rem' }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
