import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { logId: string } }
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('asset_research_log')
    .select('*')
    .eq('id', params.logId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data })
}
