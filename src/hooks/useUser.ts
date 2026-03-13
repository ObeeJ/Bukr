/**
 * useUser
 * High-level: Convenience hook that exposes the current user and auth status
 * without importing the full AuthContext directly.
 * Low-level: Thin wrapper around useAuth — destructures only `user` and
 * `isAuthenticated` so components that don’t need signIn/signOut don’t
 * take an unnecessary dependency on the full auth interface.
 */
import { useAuth } from '@/contexts/AuthContext';

export const useUser = () => {
    const { user, isAuthenticated } = useAuth();
    return { user, isAuthenticated };
};