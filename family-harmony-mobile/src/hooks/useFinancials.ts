import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useFamily } from '../context/FamilyContext';
import { useAuth } from './useAuth';

export const useFinancials = () => {
    const { selectedFamily } = useFamily();
    const { user } = useAuth();

    const { data: contributions, isLoading: loadingContributions, refetch: refetchContributions } = useQuery({
        queryKey: ['contributions', selectedFamily?.id],
        queryFn: async () => {
            if (!selectedFamily?.id || !user?.id) return [];

            const { data, error } = await supabase
                .from('contributions')
                .select('*')
                .eq('family_id', selectedFamily.id)
                .eq('member_id', user.id) // Assuming we want member's own contributions initially
                .order('contribution_date', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!selectedFamily?.id && !!user?.id,
    });

    const { data: loans, isLoading: loadingLoans, refetch: refetchLoans } = useQuery({
        queryKey: ['loans', selectedFamily?.id],
        queryFn: async () => {
            if (!selectedFamily?.id || !user?.id) return [];

            const { data, error } = await supabase
                .from('loans')
                .select('*')
                .eq('family_id', selectedFamily.id)
                .eq('member_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!selectedFamily?.id && !!user?.id,
    });

    return {
        contributions,
        loadingContributions,
        refetchContributions,
        loans,
        loadingLoans,
        refetchLoans,
    };
};
