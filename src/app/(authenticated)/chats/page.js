import { createClient } from '@/utils/supabase/server';
import ChatsClient from './ChatsClient';
import Navbar from '@/components/Navbar';

export default async function ChatsPage() {
  const supabase = await createClient();

  // 1) Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Please log in.</div>;
  }

  // 2) Fetch all chat IDs that this user is part of
  const { data: chatIds } = await supabase
    .from('chats_users')
    .select('chat_id')
    .eq('user_id', user.id);

  let initialChats = [];
  if (chatIds && chatIds.length > 0) {
    const chatIdList = chatIds.map((entry) => entry.chat_id);

    // 3) Fetch the actual chats
    const { data: fetchedChats } = await supabase
      .from('chats')
      .select('id, created_at')
      .in('id', chatIdList);

    initialChats = fetchedChats || [];
  }

  return (
    <><Navbar user={user} />
    <ChatsClient
      userId={user.id}
      initialChats={initialChats} /></>
  );
}
