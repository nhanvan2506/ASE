'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './useAuth';
import type { UserResponse } from '@/schemas/api';

// ============================================================================
// useRequireAdmin Hook
// ============================================================================

/**
 * Hook that ensures the user is authenticated AND has admin role before accessing a page.
 * Redirects to /login if not authenticated.
 * Redirects to / (home) if authenticated but not an admin.
 * Shows loading state while checking authentication.
 *
 * @returns The current authenticated admin user
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * export default function AdminDashboard() {
 *   const admin = useRequireAdmin();
 *
 *   if (!admin) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <div>Admin Dashboard - Welcome, {admin.full_name}!</div>;
 * }
 * ```
 */
export function useRequireAdmin(): UserResponse | null {
  const { user, isAuthenticated, isAdmin, loading, initializing } = useAuth();
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
      return;
    }

    // Redirect to home if authenticated but not admin
    if (isAuthenticated && !isAdmin) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, loading, initializing, router, pathname]);

  // Return null while loading or redirecting
  if (initializing || loading || !isAuthenticated || !isAdmin) {
    return null;
  }

  return user;
}
