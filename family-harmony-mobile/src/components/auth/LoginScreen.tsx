import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, useTheme, IconButton } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const { signIn } = useAuth();
    const theme = useTheme();

    useEffect(() => {
        checkBiometricAndAutoLogin();
    }, []);

    const checkBiometricAndAutoLogin = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const biometricEnabled = await SecureStore.getItemAsync('biometric_enabled');

        setBiometricAvailable(compatible && enrolled && biometricEnabled === 'true');

        // Auto-trigger biometric if enabled
        if (compatible && enrolled && biometricEnabled === 'true') {
            const savedEmail = await SecureStore.getItemAsync('user_email');
            if (savedEmail) {
                handleBiometricLogin();
            }
        }
    };

    const handleBiometricLogin = async () => {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Sign in to Family Together',
            fallbackLabel: 'Use password',
        });

        if (result.success) {
            const savedEmail = await SecureStore.getItemAsync('user_email');
            const savedPassword = await SecureStore.getItemAsync('user_password');

            if (savedEmail && savedPassword) {
                setLoading(true);
                const { error } = await signIn(savedEmail, savedPassword);
                if (error) {
                    setError(error.message);
                }
                setLoading(false);
            }
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        const { error } = await signIn(email, password);

        if (error) {
            setError(error.message);
        } else {
            // Save credentials for biometric login (only if biometric is enabled)
            const biometricEnabled = await SecureStore.getItemAsync('biometric_enabled');
            if (biometricEnabled === 'true') {
                await SecureStore.setItemAsync('user_password', password);
            }
        }

        setLoading(false);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
                        Family Together
                    </Text>
                    <Text variant="bodyLarge" style={styles.subtitle}>
                        Sign in to your account
                    </Text>

                    {biometricAvailable && (
                        <View style={styles.biometricContainer}>
                            <IconButton
                                icon="fingerprint"
                                size={48}
                                iconColor={theme.colors.primary}
                                onPress={handleBiometricLogin}
                            />
                            <Text variant="bodySmall" style={styles.biometricText}>
                                Use biometric authentication
                            </Text>
                        </View>
                    )}

                    <View style={styles.form}>
                        <TextInput
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            mode="outlined"
                            style={styles.input}
                            error={!!error}
                        />

                        <TextInput
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            mode="outlined"
                            style={styles.input}
                            error={!!error}
                        />

                        {error ? (
                            <HelperText type="error" visible={!!error}>
                                {error}
                            </HelperText>
                        ) : null}

                        <Button
                            mode="contained"
                            onPress={handleLogin}
                            loading={loading}
                            disabled={loading}
                            style={styles.button}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>

                        <Text variant="bodySmall" style={styles.testInfo}>
                            Test account: superadmin@test.com / TestPass123!
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        padding: 24,
    },
    title: {
        textAlign: 'center',
        marginBottom: 8,
        fontWeight: 'bold',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 32,
        color: '#666',
    },
    biometricContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    biometricText: {
        color: '#666',
        marginTop: 8,
    },
    form: {
        width: '100%',
    },
    input: {
        marginBottom: 16,
    },
    button: {
        marginTop: 8,
        paddingVertical: 8,
    },
    testInfo: {
        marginTop: 16,
        textAlign: 'center',
        color: '#666',
    },
});
