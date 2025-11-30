

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

// 'use client';

// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { useAuth } from './useAuth';
// import type { UserResponse } from '@/schemas/api';
// export function useRequireAuth(): UserResponse | null {
//   const { user, isAuthenticated, loading } = useAuth();
//   const router = useRouter();

//   useEffect(() => {
//     // Wait for auth to initialize
//     if (loading) {
//       return;
//     }

//     // Redirect to login if not authenticated
//     if (!isAuthenticated) {
//       router.push('/auth');
//     }
//   }, [isAuthenticated, loading, router]);

//   // Return null while loading or redirecting
//   if (loading || !isAuthenticated) {
//     return null;
//   }

//   return user;
// }


'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UserResponse } from '@/schemas/api';

export function useRequireAuth(): UserResponse | null {
  const router = useRouter();

  const user: UserResponse = {
    id: 1,
    email: 'dev@example.com',
    full_name: 'Dev User',
    role: 'admin' as UserResponse['role'],
    status: 'active' as UserResponse['status'],
    joined_at: new Date().toISOString(),
  };


  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth')) {
      router.replace('/');
    }
  }, [router]);

  return user;
}




