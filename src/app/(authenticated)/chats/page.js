import React, { use, useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import supabaseBrowserClient from '@/lib/supabase'

// ChatOverview: a rough Next.js version of ChatOverviewScreen.svelte

export default async function ChatsPage() {
  // We’re in a Server Component by default. But we can still do SSR queries
  // for initial data. For realtime, we’ll show a client side approach below.

  const supabase = await createClient()

  // 1) Grab the user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // If for some reason we ended up here without a user,
    // fallback to a client redirect or an empty state.
    return <div>Loading...</div>
  }

  // 2) Fetch the list of chats that the user is a member of
  const { data: chatIds } = await supabase
    .from('chats_users')
    .select('chat_id')
    .eq('user_id', user.id)

  let chatIdList = []
  if (chatIds && chatIds.length > 0) {
    chatIdList = chatIds.map((entry) => entry.chat_id)
  }

  let initialChats = []
  if (chatIdList.length > 0) {
    const { data: fetchedChats } = await supabase
      .from('chats')
      .select('id, created_at')
      .in('id', chatIdList)
    initialChats = fetchedChats || []
  }

  // 3) Return the client UI
  return (
    <ChatsClient initialChats={initialChats} userId={user.id} />
  )
}

// A client component that can handle realtime subscription
function ChatsClient({ initialChats, userId }) {
  const [chats, setChats] = useState(initialChats)
  const [newUserEmail, setNewUserEmail] = useState('')
  
  // On mount, we can subscribe to changes in "chats" or "chats_users"
  useEffect(() => {
    const channel = supabaseBrowserClient
      .channel('chats-realtime')
      // we can watch both "chats" and "chats_users" if desired
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        (payload) => {
          console.log('chats changed: ', payload)
          refreshChats()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats_users' },
        (payload) => {
          console.log('chats_users changed: ', payload)
          refreshChats()
        }
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      supabaseBrowserClient.removeChannel(channel)
    }
  }, [])

  // Helper: refresh chat list on any DB changes
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

  // This replicates "createChatWithUser" logic
  async function createChatWithUser() {
    // 1) find user with that email from your custom "User" table
    const { data: existingUser, error } = await supabaseBrowserClient
      .from('User')
      .select('id, email')
      .eq('email', newUserEmail)
      .single()

    if (!existingUser) {
      alert('No user found with that email!')
      return
    }

    // 2) create a new row in "chats"
    const { data: newChat, error: chatError } = await supabaseBrowserClient
      .from('chats')
      .insert({})
      .select()
      .single()

    if (!newChat) {
      alert('Could not create chat.')
      return
    }

    // 3) add two rows in "chats_users": for me, and for the other user
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

    // Trigger a refresh
    refreshChats()
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>My Chats</h1>
      {chats.length === 0 && <p>No chats yet.</p>}
      <ul style={{ marginTop: '1rem' }}>
        {chats.map((chat) => (
          <li key={chat.id} style={{ padding: '4px 0' }}>
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
