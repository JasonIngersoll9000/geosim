import type { SupabaseClient } from '@supabase/supabase-js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolves a scenario identifier — either a UUID (returned as-is) or a
 * human-readable slug like "iran-2026" — to the actual scenario UUID
 * stored in the database.
 *
 * Slug resolution: takes the first hyphen-delimited word and does a
 * case-insensitive name search, returning the most-recently-created match.
 * Falls back to the original string if no match is found.
 */
export async function resolveScenarioId(
  supabase: SupabaseClient,
  idOrSlug: string,
): Promise<string> {
  if (UUID_REGEX.test(idOrSlug)) return idOrSlug

  const keyword = idOrSlug.split('-')[0]
  const { data } = await supabase
    .from('scenarios')
    .select('id')
    .ilike('name', `%${keyword}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (data as { id: string } | null)?.id ?? idOrSlug
}
