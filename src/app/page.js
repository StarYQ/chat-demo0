import React from 'react';
import Home from '@/components/Home';
import { getUser } from '@/lib/auth';

export const metadata = {
  title: 'QKChatDemo - Home',
};

export default async function HomePage() {
  const user = await getUser();
  return <Home user={user} />;
}
