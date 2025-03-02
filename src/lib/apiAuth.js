import { createClient } from '@/utils/supabase/server';

// To use in any server-based API route to retrieve the current user.
export async function getUserFromApiRoute() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return user ?? null;
}
