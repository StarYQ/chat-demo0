"use client";

import React, { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import styles from './chats.module.css';
import msgStyles from './messages.module.css';

/**
 * This merges "chat overview" + "chat detail" into one UI:
 * - A left sidebar listing all chats
 * - A right panel for messages of the currently selected chat
 */
export default function ChatsClient({ userId, initialChats }) {
  const [chats, setChats] = useState(initialChats);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  // 1) Subscribe to changes in "chats" or "chats_users" to refresh the chat list
  useEffect(() => {
    const channel = supabase
      .channel('chats-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        refreshChats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats_users' }, () => {
        refreshChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) If user selects a chat, subscribe to changes in "messages" for that chat
  useEffect(() => {
    if (!selectedChatId) return;

    const channel = supabase
      .channel(`messages-realtime-${selectedChatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${selectedChatId}`,
        },
        () => {
          fetchMessages(selectedChatId);
        }
      )
      .subscribe();

    // On mount, fetch the initial messages
    fetchMessages(selectedChatId);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChatId]);

  /** Refresh the user's chat list */
  async function refreshChats() {
    const { data: chatIds } = await supabase
      .from('chats_users')
      .select('chat_id')
      .eq('user_id', userId);

    if (!chatIds || chatIds.length === 0) {
      setChats([]);
      return;
    }
    const chatIdList = chatIds.map((entry) => entry.chat_id);
    const { data: fetchedChats } = await supabase
      .from('chats')
      .select('id, created_at')
      .in('id', chatIdList);

    setChats(fetchedChats || []);
  }

  /** Fetch messages for the currently selected chat */
  async function fetchMessages(chatId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  }

  /** Create a new direct chat with another user by email */
  async function createChatWithUser() {
    if (!newUserEmail) {
      alert('Please enter an email address');
      return;
    }

    // 1) Look up the other user by email
    const response = await fetch(`/api/find-user-by-email?email=${encodeURIComponent(newUserEmail)}`);
    if (!response.ok) {
      alert('No user found with that email!');
      return;
    }
    const { user: existingUser } = await response.json(); // { id, email }

    // 2) Create a new chat row
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert([{}])
      .select('*')
      .single();

    if (!newChat) {
      console.error("Error creating chat:", chatError);
      alert('Could not create chat.');
      return;
    }

    // 3) Insert both participants into chats_users
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

    // 4) Refresh chat list & clear the input
    await refreshChats();
    setNewUserEmail('');
  }

  /** Send a message to the selected chat */
  async function sendMessage() {
    if (!selectedChatId) return;
    if (!newMessage.trim()) return;

    // 1) Confirm the user is still logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Please log in again.');
      return;
    }

    // 2) Insert the message
    const { error: insertError } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: selectedChatId,
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

  // 3) Render the UI
  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Chats</h2>

        {/* Chat list */}
        <ul className={styles.chatList}>
          {chats.map((chat) => (
            <li
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={
                chat.id === selectedChatId ? styles.chatItemActive : styles.chatItem
              }
            >
              Chat #{chat.id}
            </li>
          ))}
        </ul>

        {/* Create new chat */}
        <div className={styles.createChat}>
          <input
            type="email"
            placeholder="Invite user by email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            className={styles.input}
          />
          <button onClick={createChatWithUser} className={styles.button}>
            New Chat
          </button>
        </div>
      </div>

      {/* Main chat panel */}
      <div className={styles.mainPanel}>
        {selectedChatId ? (
          <div className={msgStyles.chatContainer}>
            {/* Messages */}
            <div className={msgStyles.messageList}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.author_id === userId
                      ? msgStyles.messageRowSelf
                      : msgStyles.messageRow
                  }
                >
                  <p className={msgStyles.messageAuthor}>
                    {m.author_id.slice(0, 8)}...
                  </p>
                  <p className={msgStyles.messageContent}>{m.content}</p>
                </div>
              ))}
            </div>

            {/* Message input */}
            <div className={msgStyles.inputRow}>
              <input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className={msgStyles.input}
              />
              <button onClick={sendMessage} className={msgStyles.sendButton}>
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.noChatSelected}>
            <h3>Select a chat to view messages</h3>
          </div>
        )}
      </div>
    </div>
  );
}
