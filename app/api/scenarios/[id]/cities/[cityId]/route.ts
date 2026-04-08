import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { id: string; cityId: string } }) {
  const supabase = await createClient()
  const body: Record<string, unknown> = await req.json()
  const { data, error } = await supabase
    .from('city_registry')
    .update(body)
    .eq('id', params.cityId)
    .eq('scenario_id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
