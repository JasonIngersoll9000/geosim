// app/api/scenarios/[id]/assets/[assetId]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; assetId: string } }
) {
  const supabase = await createClient()
  const body = await req.json()
  const { data, error } = await supabase
    .from('asset_registry')
    .update(body)
    .eq('id', params.assetId)
    .eq('scenario_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
