import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromApiRoute } from '@/lib/apiAuth';

export async function POST() {
  try {
    // Get the authenticated user from Supabase
    const user = await getUserFromApiRoute();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user already exists in profiles
    const existingProfile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (existingProfile) {
      return NextResponse.json({ message: 'User already exists' }, { status: 200 });
    }

    // Create a new profile entry
    const newProfile = await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
      },
    });

    return NextResponse.json({ profile: newProfile }, { status: 201 });
  } catch (error) {
    console.error('Error creating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
