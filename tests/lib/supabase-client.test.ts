import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ auth: {}, from: vi.fn() })),
}));

// Import once at module scope — Vitest caches the module between tests in the
// same file, so the singleton `client` variable persists across both it() blocks.
import * as supabaseClient from "@/lib/supabase/client";

describe("createClient (browser)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("creates a supabase client", () => {
    const client = supabaseClient.createClient();
    expect(client).toBeDefined();
    expect(client).toHaveProperty("auth");
  });

  it("returns the same instance on repeated calls (singleton)", () => {
    const a = supabaseClient.createClient();
    const b = supabaseClient.createClient();
    expect(a).toBe(b);
  });
});
