import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { delay } from '@/lib/utils';

export async function POST() {
  try {
    // Simulate OAuth delay
    await delay(800);

    // Create mock session
    const user = await createSession();

    return NextResponse.json({
      success: true,
      user,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
