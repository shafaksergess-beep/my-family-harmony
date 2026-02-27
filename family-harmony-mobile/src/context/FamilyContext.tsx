import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { syncAll } from '../services/sync';
import { useAuth } from '../hooks/useAuth';
import { Database } from '../types/database.types';

type Family = Database['public']['Tables']['families']['Row'];
type FamilyMember = Database['public']['Tables']['family_members']['Row'];

interface FamilyContextType {
    families: Family[];
    selectedFamily: Family | null;
    currentMember: FamilyMember | null;
    isLoading: boolean;
    selectFamily: (familyId: string) => Promise<void>;
    refreshFamilies: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [families, setFamilies] = useState<Family[]>([]);
    const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
    const [currentMember, setCurrentMember] = useState<FamilyMember | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const selectFamily = useCallback(async (familyId: string) => {
        const family = families.find(f => f.id === familyId);
        if (family) {
            setSelectedFamily(family);

            // Fetch member details for this family
            if (user) {
                const { data, error } = await supabase
                    .from('family_members')
                    .select('*')
                    .eq('family_id', familyId)
                    .eq('user_id', user.id)
                    .single();

                if (!error && data) {
                    setCurrentMember(data);
                }
            }
        }
    }, [families, user]);

    const fetchFamilies = useCallback(async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            
            // Phase 5: Trigger background sync
            syncAll().catch(e => console.error('Background sync failed:', e));

            // Get all family memberships for the user
            const { data: memberData, error: memberError } = await supabase
                .from('family_members')
                .select(`
          *,
          families:family_id (*)
        `)
                .eq('user_id', user.id);

            if (memberError) throw memberError;

            if (memberData) {
                // Extract families from the response
                const userFamilies = memberData
                    .map(m => m.families)
                    .filter((f): f is Family => f !== null);

                setFamilies(userFamilies);

                // Select first family by default if none selected
                if (userFamilies.length > 0 && !selectedFamily) {
                    await selectFamily(userFamilies[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching families:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, selectFamily, selectedFamily]);

    useEffect(() => {
        if (user) {
            fetchFamilies();
        } else {
            setFamilies([]);
            setSelectedFamily(null);
            setCurrentMember(null);
        }
    }, [user, fetchFamilies]);

    return (
        <FamilyContext.Provider
            value={{
                families,
                selectedFamily,
                currentMember,
                isLoading,
                selectFamily,
                refreshFamilies: fetchFamilies
            }}
        >
            {children}
        </FamilyContext.Provider>
    );
}

export const useFamily = () => {
    const context = useContext(FamilyContext);
    if (context === undefined) {
        throw new Error('useFamily must be used within a FamilyProvider');
    }
    return context;
};
