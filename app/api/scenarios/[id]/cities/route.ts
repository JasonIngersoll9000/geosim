import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CityRegistryInsert } from '@/lib/types/database'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('city_registry')
    .select('*')
    .eq('scenario_id', params.id)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const body: CityRegistryInsert = await req.json()
  const { data, error } = await supabase
    .from('city_registry')
    .insert({ ...body, scenario_id: params.id })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
