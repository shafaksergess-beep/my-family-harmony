import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip, useTheme, FAB } from 'react-native-paper';
import { useFinancials } from '../../hooks/useFinancials';
import { format } from 'date-fns';

export default function ContributionsScreen() {
    const { contributions, loadingContributions, refetchContributions } = useFinancials();
    const theme = useTheme();

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
                <View style={styles.row}>
                    <View>
                        <Text variant="titleMedium" style={styles.amount}>
                            {item.amount.toLocaleString()} FCFA
                        </Text>
                        <Text variant="bodySmall" style={styles.date}>
                            {format(new Date(item.contribution_date), 'MMM dd, yyyy')}
                        </Text>
                    </View>
                    <Chip
                        icon={item.status === 'paid' ? 'check-circle' : 'clock-outline'}
                        style={{ backgroundColor: item.status === 'paid' ? '#E8F5E9' : '#FFF3E0' }}
                        textStyle={{ color: item.status === 'paid' ? '#2E7D32' : '#EF6C00' }}
                    >
                        {item.status.toUpperCase()}
                    </Chip>
                </View>
                {item.notes && (
                    <Text variant="bodySmall" style={styles.notes}>
                        {item.notes}
                    </Text>
                )}
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={contributions}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={loadingContributions} onRefresh={refetchContributions} />
                }
                ListEmptyComponent={
                    !loadingContributions ? (
                        <View style={styles.emptyState}>
                            <Text variant="bodyLarge">No contributions found</Text>
                        </View>
                    ) : null
                }
            />
            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => console.log('New contribution')}
                label="Pay Contribution"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    cardContent: {
        paddingVertical: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    amount: {
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    date: {
        color: '#666',
        marginTop: 4,
    },
    notes: {
        marginTop: 8,
        color: '#666',
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});
