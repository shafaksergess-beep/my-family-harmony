import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const [mfaEnabled, setMfaEnabled] = useState(false);

    const checkMfaStatus = async () => {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) {
            console.error('Error checking MFA status:', error);
            return;
        }
        setMfaEnabled(data.nextLevel === 'aal2');
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                checkMfaStatus();
            }
            setLoading(false);
        });

        // Listen for auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                checkMfaStatus();
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (!error && data.user) {
            // Optionally store credentials for biometric login
            await SecureStore.setItemAsync('user_email', email);
            await checkMfaStatus();
        }

        return { data, error };
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        return { data, error };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();

        // Clear stored credentials
        await SecureStore.deleteItemAsync('user_email');
        await SecureStore.deleteItemAsync('user_biometric_enabled');
        setMfaEnabled(false);

        return { error };
    };

    const enrollMfa = async () => {
        return await supabase.auth.mfa.enroll({
            factorType: 'totp',
        });
    };

    const verifyMfa = async (factorId: string, code: string) => {
        const { data, error } = await supabase.auth.mfa.challengeAndVerify({
            factorId,
            code,
        });
        if (!error) {
            await checkMfaStatus();
        }
        return { data, error };
    };

    const unenrollMfa = async (factorId: string) => {
        const { data, error } = await supabase.auth.mfa.unenroll({
            factorId,
        });
        if (!error) {
            setMfaEnabled(false);
        }
        return { data, error };
    };

    return {
        user,
        session,
        loading,
        mfaEnabled,
        signIn,
        signUp,
        signOut,
        enrollMfa,
        verifyMfa,
        unenrollMfa,
        checkMfaStatus,
    };
};
