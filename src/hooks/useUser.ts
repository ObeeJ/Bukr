import { useAuth } from '@/contexts/AuthContext';

export const useUser = () => {
    const { user, isAuthenticated } = useAuth();
    return { user, isAuthenticated };
};