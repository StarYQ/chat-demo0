// file: src/app/api/find-user-by-email/route.js

import { NextResponse } from 'next/server';
import supabase from '@/lib/supabaseService';

export async function GET(request) {
  try {
    // 1) Extract the "email" from the querystring
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'No email provided' }, { status: 400 });
    }

    // 2) Query the built-in auth.users table using the service client
    //    The name is "users" in the "auth" schema
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user from auth.users:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3) Return the found user to the client
    return NextResponse.json({ user: data }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in find-user-by-email:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
