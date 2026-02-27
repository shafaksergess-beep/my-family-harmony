import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, TextInput, Card, List, useTheme } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export default function MfaSettings() {
    const { mfaEnabled, enrollMfa, verifyMfa, unenrollMfa, checkMfaStatus } = useAuth();
    const theme = useTheme();
    const [enrolling, setEnrolling] = useState(false);
    const [enrollData, setEnrollData] = useState<any>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEnroll = async () => {
        setLoading(true);
        try {
            const { data, error } = await enrollMfa();
            if (error) throw error;
            setEnrollData(data);
            setEnrolling(true);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to start MFA enrollment');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        try {
            const { error } = await verifyMfa(enrollData.id, verificationCode);
            if (error) throw error;
            Alert.alert('Success', 'MFA has been enabled successfully!');
            setEnrolling(false);
            setEnrollData(null);
            setVerificationCode('');
            await checkMfaStatus();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        Alert.alert(
            'Disable MFA',
            'Are you sure you want to disable Multi-Factor Authentication? This will reduce your account security.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disable',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const { data: factors } = await supabase.auth.mfa.listFactors();
                            const totpFactor = factors?.all?.find((f: any) => f.factor_type === 'totp');
                            
                            if (totpFactor) {
                                const { error } = await unenrollMfa(totpFactor.id);
                                if (error) throw error;
                                Alert.alert('Success', 'MFA has been disabled');
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to disable MFA');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (enrolling && enrollData) {
        return (
            <Card style={styles.card}>
                <Card.Title title="Setup MFA" subtitle="Use an authenticator app" />
                <Card.Content>
                    <Text variant="bodyMedium" style={styles.instruction}>
                        1. Enter this secret key into your authenticator app (Google Authenticator, Authy, etc.):
                    </Text>
                    <View style={styles.secretContainer}>
                        <Text style={styles.secretText} selectable>{enrollData.totp.secret}</Text>
                    </View>
                    <Text variant="bodyMedium" style={styles.instruction}>
                        2. Enter the 6-digit code from the app below:
                    </Text>
                    <TextInput
                        mode="outlined"
                        label="Verification Code"
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        style={styles.input}
                    />
                    <View style={styles.buttonContainer}>
                        <Button
                            mode="contained"
                            onPress={handleVerify}
                            loading={loading}
                            disabled={loading || verificationCode.length !== 6}
                        >
                            Verify & Enable
                        </Button>
                        <Button
                            mode="text"
                            onPress={() => {
                                setEnrolling(false);
                                setEnrollData(null);
                            }}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                    </View>
                </Card.Content>
            </Card>
        );
    }

    return (
        <List.Item
            title="Multi-Factor Authentication"
            description={mfaEnabled ? 'Enabled (aal2)' : 'Disabled'}
            left={() => <List.Icon icon="shield-lock" />}
            right={() => (
                <Button
                    mode={mfaEnabled ? "outlined" : "contained"}
                    onPress={mfaEnabled ? handleDisable : handleEnroll}
                    loading={loading}
                    disabled={loading}
                >
                    {mfaEnabled ? 'Disable' : 'Enable'}
                </Button>
            )}
        />
    );
}

const styles = StyleSheet.create({
    card: {
        margin: 0,
        elevation: 0,
        backgroundColor: 'transparent',
    },
    instruction: {
        marginBottom: 8,
    },
    secretContainer: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 4,
        marginVertical: 12,
        alignItems: 'center',
    },
    secretText: {
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 1,
    },
    input: {
        marginBottom: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
