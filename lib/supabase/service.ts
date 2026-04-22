import { createClient } from "@supabase/supabase-js";

/**
 * Service role client — bypasses RLS.
 * Only use server-side for background tasks (e.g. research pipeline).
 * Never expose to the client.
 *
 * Uses SUPABASE_URL (server-only, never inlined by Next.js DefinePlugin) so
 * the correct project URL is always read from the Lambda runtime environment,
 * even without a rebuild. Falls back to NEXT_PUBLIC_SUPABASE_URL for
 * environments that haven't added the dedicated server var yet.
 */
export function createServiceClient() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) throw new Error("SUPABASE_URL env var is not set");

  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    global: {
      // Opt out of Next.js Data Cache so queries always hit Supabase directly.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
