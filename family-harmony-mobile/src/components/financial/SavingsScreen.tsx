import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function SavingsScreen() {
    const theme = useTheme();

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.header}>
                        <Icon name="piggy-bank" size={40} color={theme.colors.tertiary} />
                        <View style={styles.headerText}>
                            <Text variant="titleLarge">Total Savings</Text>
                            <Text variant="headlineMedium" style={{ color: theme.colors.tertiary }}>
                                0 FCFA
                            </Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>

            <Card style={styles.card}>
                <Card.Title title="Shareholdings" />
                <Card.Content>
                    <View style={styles.row}>
                        <Text variant="bodyLarge">Total Shares</Text>
                        <Text variant="titleMedium">0</Text>
                    </View>
                    <View style={styles.row}>
                        <Text variant="bodyLarge">Share Value</Text>
                        <Text variant="titleMedium">50,000 FCFA</Text>
                    </View>
                    <View style={[styles.row, styles.totalRow]}>
                        <Text variant="titleMedium">Total Value</Text>
                        <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                            0 FCFA
                        </Text>
                    </View>
                </Card.Content>
            </Card>

            <Card style={styles.card}>
                <Card.Title title="Dividends" />
                <Card.Content>
                    <Text variant="bodyMedium" style={styles.emptyText}>
                        No dividend history available.
                    </Text>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    card: {
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerText: {
        marginLeft: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalRow: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    emptyText: {
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 16,
    },
});
