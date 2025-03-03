// file: src/app/(authenticated)/chats/page.js

import { createClient } from '@/utils/supabase/server';
import ChatsClient from './ChatsClient';

export default async function ChatsPage() {
  const supabase = await createClient();

  // 1) Grab the user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  // 2) Fetch the list of chats that the user is a member of
  const { data: chatIds } = await supabase
    .from('chats_users')
    .select('chat_id')
    .eq('user_id', user.id);

  let chatIdList = [];
  if (chatIds && chatIds.length > 0) {
    chatIdList = chatIds.map((entry) => entry.chat_id);
  }

  let initialChats = [];
  if (chatIdList.length > 0) {
    const { data: fetchedChats } = await supabase
      .from('chats')
      .select('id, created_at')
      .in('id', chatIdList);
    initialChats = fetchedChats || [];
  }

  return <ChatsClient initialChats={initialChats} userId={user.id} />;
}
