import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

async function signOut(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const origin = request.nextUrl.origin
  return NextResponse.redirect(new URL('/auth/login', origin))
}

export async function POST(request: NextRequest) {
  return signOut(request)
}

export async function GET(request: NextRequest) {
  return signOut(request)
}
