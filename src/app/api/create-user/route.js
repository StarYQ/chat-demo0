// file: src/app/api/create-user/route.js

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    // Expect the user details to be sent in the request body
    const { userId, email, firstName, lastName } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and email' },
        { status: 400 }
      );
    }

    // Check if the profile already exists
    const existingProfile = await prisma.profiles.findUnique({
      where: { id: userId },
    });

    if (existingProfile) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 200 }
      );
    }

    // Create a new profile entry
    const newProfile = await prisma.profiles.create({
      data: {
        id: userId,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
      },
    });

    return NextResponse.json({ profile: newProfile }, { status: 201 });
  } catch (error) {
    console.error('Error creating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
