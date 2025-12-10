"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./useAuth";
import type { UserResponse } from "@/schemas/api";

// ============================================================================
// useRequireAuth Hook
// ============================================================================

/**
 * Hook that ensures the user is authenticated before accessing a page.
 * Redirects to /login if not authenticated.
 * Shows loading state while checking authentication.
 *
 * @returns The current authenticated user
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * export default function ProfilePage() {
 *   const user = useRequireAuth();
 *
 *   if (!user) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <div>Welcome, {user.full_name}!</div>;
 * }
 * ```
 */
export function useRequireAuth(): UserResponse | null {
  const { user, isAuthenticated, loading, initializing } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait for auth to initialize (checking token and /auth/me)
    if (initializing || loading) {
      return;
    }

    // Redirect to login if not authenticated, preserving the return URL
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/auth?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, loading, initializing, router, pathname]);

  // Return null while loading or redirecting
  if (initializing || loading || !isAuthenticated) {
    return null;
  }

  return user;
}
