import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import supabaseBrowserClient from '@/lib/supabase'

// This is the server component
export default async function ChatsPage() {
  // SSR: Create a Supabase server client
  const supabase = await createClient()

  // 1) Grab the user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // If for some reason we ended up here without a user,
    // fallback to a minimal "loading" or handle redirect
    return <div>Loading...</div>
  }

  // 2) Fetch the list of chat IDs that this user is part of
  const { data: chatIds } = await supabase
    .from('chats_users')
    .select('chat_id')
    .eq('user_id', user.id)

  let chatIdList = []
  if (chatIds && chatIds.length > 0) {
    chatIdList = chatIds.map((entry) => entry.chat_id)
  }

  // 3) Fetch the actual `chats` with those IDs
  let initialChats = []
  if (chatIdList.length > 0) {
    const { data: fetchedChats } = await supabase
      .from('chats')
      .select('id, created_at')
      .in('id', chatIdList)
    initialChats = fetchedChats || []
  }

  // 4) Return the client UI with the SSR data
  return (
    <ChatsClient initialChats={initialChats} userId={user.id} />
  )
}

// This is a client component
function ChatsClient({ initialChats, userId }) {
  const [chats, setChats] = useState(initialChats)
  const [newUserEmail, setNewUserEmail] = useState('')

  // Subscribe to changes in "chats" or "chats_users"
  useEffect(() => {
    const channel = supabaseBrowserClient
      .channel('chats-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        () => {
          console.log('chats changed')
          refreshChats()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats_users' },
        () => {
          console.log('chats_users changed')
          refreshChats()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabaseBrowserClient.removeChannel(channel)
    }
  }, [])

  // Helper to re-fetch the user's chats
  async function refreshChats() {
    const { data: chatIds } = await supabaseBrowserClient
      .from('chats_users')
      .select('chat_id')
      .eq('user_id', userId)

    if (!chatIds) return

    const chatIdList = chatIds.map((entry) => entry.chat_id)
    if (chatIdList.length === 0) {
      setChats([])
      return
    }

    const { data: fetchedChats } = await supabaseBrowserClient
      .from('chats')
      .select('id, created_at')
      .in('id', chatIdList)

    setChats(fetchedChats || [])
  }

  // Creating a chat with another user by email
  async function createChatWithUser() {
    // 1) Call our server route
    const response = await fetch(`/api/find-user-by-email?email=${encodeURIComponent(newUserEmail)}`)
    if (!response.ok) {
      alert('No user found with that email!')
      return
    }

    const { user: existingUser } = await response.json()

    // 2) create a new chat
    const { data: newChat, error: chatError } = await supabaseBrowserClient
      .from('chats')
      .insert({})
      .select()
      .single()

    if (!newChat) {
      alert('Could not create chat.')
      return
    }

    // 3) add both users to `chats_users`
    const { data: joined, error: joinError } = await supabaseBrowserClient
      .from('chats_users')
      .insert([
        { chat_id: newChat.id, user_id: userId },
        { chat_id: newChat.id, user_id: existingUser.id },
      ])

    if (joinError) {
      alert('Could not add users to chat.')
      return
    }

    // 4) Refresh the chat list
    refreshChats()
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>My Chats</h1>
      {chats.length === 0 && <p>No chats yet.</p>}
      <ul style={{ marginTop: '1rem' }}>
        {chats.map((chat) => (
          <li key={chat.id}>
            <Link href={`/chats/${chat.id}`}>
              Chat #{chat.id}
            </Link>
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
        <button onClick={createChatWithUser}>
          Create Chat
        </button>
      </div>
    </div>
  )
}
