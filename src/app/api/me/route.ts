import { NextResponse } from 'next/server';
import { getSession } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  const u = session?.user as any;
  return NextResponse.json({
    success: true,
    user: u?.email
      ? { uid: u.id, email: u.email, name: u.name, role: u.role, provider: 'better-auth' }
      : null,
  });
}
