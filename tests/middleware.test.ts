// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

describe("middleware", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    mockGetUser.mockClear();
  });

  it("calls supabase.auth.getUser to refresh the session", async () => {
    const { middleware } = await import("@/middleware");
    const request = new NextRequest("http://localhost:3000/dashboard");
    await middleware(request);
    expect(mockGetUser).toHaveBeenCalledOnce();
  });

  it("returns a NextResponse", async () => {
    const { middleware } = await import("@/middleware");
    const request = new NextRequest("http://localhost:3000/");
    const response = await middleware(request);
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
});
