import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Switch, List, Divider, useTheme } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MfaSettings from './MfaSettings';

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const theme = useTheme();
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState<string>('');

    useEffect(() => {
        checkBiometricAvailability();
        loadBiometricPreference();
    }, []);

    const checkBiometricAvailability = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();

        setBiometricAvailable(compatible && enrolled);

        if (compatible && enrolled) {
            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
            if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                setBiometricType('Face ID');
            } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                setBiometricType('Fingerprint');
            } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
                setBiometricType('Iris');
            } else {
                setBiometricType('Biometric');
            }
        }
    };

    const loadBiometricPreference = async () => {
        const enabled = await SecureStore.getItemAsync('biometric_enabled');
        setBiometricEnabled(enabled === 'true');
    };

    const toggleBiometric = async () => {
        if (!biometricEnabled) {
            // Enabling biometric - test it first
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Enable ${biometricType} for Family Together`,
                fallbackLabel: 'Use password',
            });

            if (result.success) {
                await SecureStore.setItemAsync('biometric_enabled', 'true');
                setBiometricEnabled(true);
                Alert.alert('Success', `${biometricType} authentication enabled!`);
            }
        } else {
            // Disabling biometric
            await SecureStore.setItemAsync('biometric_enabled', 'false');
            setBiometricEnabled(false);
            Alert.alert('Disabled', `${biometricType} authentication disabled`);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    onPress: async () => {
                        await signOut();
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            {/* User Info Card */}
            <Card style={styles.card}>
                <Card.Content style={styles.userInfo}>
                    <Icon name="account-circle" size={64} color={theme.colors.primary} />
                    <Text variant="headlineSmall" style={styles.userName}>
                        {user?.user_metadata?.full_name || 'User'}
                    </Text>
                    <Text variant="bodyMedium" style={styles.userEmail}>
                        {user?.email}
                    </Text>
                </Card.Content>
            </Card>

            {/* Security Settings */}
            <Card style={styles.card}>
                <Card.Title title="Security" />
                <Card.Content>
                    {biometricAvailable ? (
                        <List.Item
                            title={`${biometricType} Authentication`}
                            description={biometricEnabled ? 'Enabled' : 'Disabled'}
                            left={() => <List.Icon icon="fingerprint" />}
                            right={() => (
                                <Switch
                                    value={biometricEnabled}
                                    onValueChange={toggleBiometric}
                                />
                            )}
                        />
                    ) : (
                        <List.Item
                            title="Biometric Authentication"
                            description="Not available on this device"
                            left={() => <List.Icon icon="fingerprint-off" />}
                            disabled
                        />
                    )}
                    <Divider />
                    <MfaSettings />
                    <Divider />
                    <List.Item
                        title="Change Password"
                        description="Update your password"
                        left={() => <List.Icon icon="lock-reset" />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon')}
                    />
                </Card.Content>
            </Card>

            {/* App Settings */}
            <Card style={styles.card}>
                <Card.Title title="Preferences" />
                <Card.Content>
                    <List.Item
                        title="Language"
                        description="English"
                        left={() => <List.Icon icon="translate" />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => Alert.alert('Coming Soon', 'Language selection will be available soon')}
                    />
                    <Divider />
                    <List.Item
                        title="Notifications"
                        description="Manage notification preferences"
                        left={() => <List.Icon icon="bell" />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon')}
                    />
                </Card.Content>
            </Card>

            {/* About */}
            <Card style={styles.card}>
                <Card.Title title="About" />
                <Card.Content>
                    <List.Item
                        title="App Version"
                        description="1.0.0"
                        left={() => <List.Icon icon="information" />}
                    />
                    <Divider />
                    <List.Item
                        title="Help & Support"
                        description="Get help with the app"
                        left={() => <List.Icon icon="help-circle" />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => Alert.alert('Coming Soon', 'Help center will be available soon')}
                    />
                </Card.Content>
            </Card>

            {/* Logout Button */}
            <Button
                mode="outlined"
                icon="logout"
                onPress={handleLogout}
                style={styles.logoutButton}
                textColor={theme.colors.error}
            >
                Logout
            </Button>

            <View style={styles.bottomSpacing} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    card: {
        margin: 16,
    },
    userInfo: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    userName: {
        marginTop: 12,
        fontWeight: 'bold',
    },
    userEmail: {
        color: '#666',
        marginTop: 4,
    },
    logoutButton: {
        margin: 16,
        borderColor: '#f44336',
    },
    bottomSpacing: {
        height: 32,
    },
});
