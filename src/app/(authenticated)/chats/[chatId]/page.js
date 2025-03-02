// file: src/app/(authenticated)/chats/[chatId]/page.jsx
import React from 'react'
import ChatDetailClient from './ChatDetailClient'
import { createClient } from '@/utils/supabase/server'

export default async function ChatDetailPage({ params }) {
  const supabase = await createClient()

  // SSR fetch existing messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', params.chatId)
    .order('created_at', { ascending: true })

  return (
    <ChatDetailClient
      chatId={params.chatId}
      initialMessages={messages || []}
    />
  )
}
