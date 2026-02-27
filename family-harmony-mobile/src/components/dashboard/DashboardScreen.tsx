import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FamilySelector from '../common/FamilySelector';
import { useFamily } from '../../context/FamilyContext';

export default function DashboardScreen() {
    const { user } = useAuth();
    const { selectedFamily } = useFamily();
    const theme = useTheme();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.greeting}>
                    Welcome back! 👋
                </Text>
                <Text variant="bodyMedium" style={styles.email}>
                    {user?.user_metadata?.full_name || user?.email}
                </Text>

                <View style={{ marginTop: 16 }}>
                    <FamilySelector />
                </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
                <Card style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Card.Content style={styles.statContent}>
                        <Icon name="cash" size={32} color={theme.colors.primary} />
                        <Text variant="titleMedium" style={styles.statValue}>
                            25,000 FCFA
                        </Text>
                        <Text variant="bodySmall" style={styles.statLabel}>
                            To Pay
                        </Text>
                    </Card.Content>
                </Card>

                <Card style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
                    <Card.Content style={styles.statContent}>
                        <Icon name="heart-pulse" size={32} color="#4caf50" />
                        <Text variant="titleMedium" style={styles.statValue}>
                            Healthy
                        </Text>
                        <Text variant="bodySmall" style={styles.statLabel}>
                            Group Health
                        </Text>
                    </Card.Content>
                </Card>
            </View>

            {/* Quick Actions */}
            <Card style={styles.card}>
                <Card.Title title="Quick Actions" />
                <Card.Content>
                    <Button
                        mode="contained"
                        icon="cash-plus"
                        style={styles.actionButton}
                        onPress={() => { }}
                    >
                        Pay Contribution
                    </Button>
                    <Button
                        mode="outlined"
                        icon="hand-coin"
                        style={styles.actionButton}
                        onPress={() => { }}
                    >
                        Apply for Loan
                    </Button>
                    <Button
                        mode="outlined"
                        icon="qrcode-scan"
                        style={styles.actionButton}
                        onPress={() => { }}
                    >
                        Meeting Check-In
                    </Button>
                </Card.Content>
            </Card>

            {/* Recent Activity */}
            <Card style={styles.card}>
                <Card.Title title="Recent Activity" />
                <Card.Content>
                    <View style={styles.activityItem}>
                        <Icon name="check-circle" size={24} color="#4CAF50" />
                        <View style={styles.activityText}>
                            <Text variant="bodyMedium">November contribution paid</Text>
                            <Text variant="bodySmall" style={styles.activityDate}>
                                2 days ago
                            </Text>
                        </View>
                    </View>
                    <View style={styles.activityItem}>
                        <Icon name="calendar-check" size={24} color="#2196F3" />
                        <View style={styles.activityText}>
                            <Text variant="bodyMedium">Attended November meeting</Text>
                            <Text variant="bodySmall" style={styles.activityDate}>
                                1 week ago
                            </Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>

            <View style={styles.bottomSpacing} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    greeting: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    email: {
        color: '#666',
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
    },
    statContent: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    statValue: {
        fontWeight: 'bold',
        marginTop: 8,
    },
    statLabel: {
        color: '#666',
        marginTop: 4,
    },
    card: {
        margin: 16,
        marginTop: 0,
    },
    actionButton: {
        marginTop: 12,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    activityText: {
        flex: 1,
        marginLeft: 12,
    },
    activityDate: {
        color: '#999',
        marginTop: 2,
    },
    bottomSpacing: {
        height: 32,
    },
});
