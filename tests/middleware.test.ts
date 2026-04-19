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
    vi.stubEnv("NEXT_PUBLIC_DEV_MODE", "false");
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

  describe("AC: unauthenticated users redirected to /auth/login", () => {
    it("redirects unauthenticated user accessing a protected play route", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const { middleware } = await import("@/middleware");
      const request = new NextRequest("http://localhost:3000/scenarios/abc-123/play");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toMatch(/\/auth\/login/);
    });

    it("passes redirect param so user returns to intended page after sign-in", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const { middleware } = await import("@/middleware");
      const request = new NextRequest("http://localhost:3000/scenarios/abc-123/play?turn=5");
      const response = await middleware(request);
      const location = response.headers.get("location") ?? "";
      expect(location).toContain("redirect=%2Fscenarios%2Fabc-123%2Fplay");
    });

    it("allows authenticated user to access protected route without redirect", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-1", email: "test@test.com" } } });
      const { middleware } = await import("@/middleware");
      const request = new NextRequest("http://localhost:3000/scenarios/abc-123/play");
      const response = await middleware(request);
      expect(response.status).toBe(200);
    });

    it("allows unauthenticated user to access non-protected route", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const { middleware } = await import("@/middleware");
      const request = new NextRequest("http://localhost:3000/scenarios");
      const response = await middleware(request);
      expect(response.status).toBe(200);
    });
  });

  describe("AC: dev bypass works when NEXT_PUBLIC_DEV_MODE=true", () => {
    it("bypasses auth check for protected routes when dev mode is enabled", async () => {
      vi.stubEnv("NEXT_PUBLIC_DEV_MODE", "true");
      const { middleware } = await import("@/middleware");
      const request = new NextRequest("http://localhost:3000/scenarios/abc-123/play");
      const response = await middleware(request);
      // Should pass through without redirect (no 307)
      expect(response.status).not.toBe(307);
    });
  });
});
