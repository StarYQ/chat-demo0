import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    // Extract the email from the query parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'No email provided' }, { status: 400 });
    }

    // Query the profiles table instead of auth.users
    const userProfile = await prisma.profiles.findUnique({
      where: { email },
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: userProfile }, { status: 200 });
  } catch (err) {
    console.error('Error fetching user from profiles:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
