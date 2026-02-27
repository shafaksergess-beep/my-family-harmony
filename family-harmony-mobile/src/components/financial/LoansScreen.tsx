import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip, useTheme, FAB } from 'react-native-paper';
import { useFinancials } from '../../hooks/useFinancials';
import { format } from 'date-fns';

export default function LoansScreen() {
    const { loans, loadingLoans, refetchLoans } = useFinancials();
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
                            {format(new Date(item.created_at), 'MMM dd, yyyy')}
                        </Text>
                    </View>
                    <Chip
                        icon={item.status === 'approved' ? 'check-circle' : item.status === 'rejected' ? 'close-circle' : 'clock-outline'}
                        style={{
                            backgroundColor:
                                item.status === 'approved' ? '#E8F5E9' :
                                    item.status === 'rejected' ? '#FFEBEE' : '#FFF3E0'
                        }}
                        textStyle={{
                            color:
                                item.status === 'approved' ? '#2E7D32' :
                                    item.status === 'rejected' ? '#C62828' : '#EF6C00'
                        }}
                    >
                        {item.status.toUpperCase()}
                    </Chip>
                </View>
                <Text variant="bodyMedium" style={styles.details}>
                    Interest: {item.interest_rate}% • Term: {item.duration_months} months
                </Text>
                {item.purpose && (
                    <Text variant="bodySmall" style={styles.purpose}>
                        Purpose: {item.purpose}
                    </Text>
                )}
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={loans}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={loadingLoans} onRefresh={refetchLoans} />
                }
                ListEmptyComponent={
                    !loadingLoans ? (
                        <View style={styles.emptyState}>
                            <Text variant="bodyLarge">No active loans</Text>
                        </View>
                    ) : null
                }
            />
            <FAB
                icon="hand-coin"
                style={[styles.fab, { backgroundColor: theme.colors.secondary }]}
                onPress={() => console.log('Apply for loan')}
                label="Apply for Loan"
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
        color: '#D84315', // Deep Orange for loans
    },
    date: {
        color: '#666',
        marginTop: 4,
    },
    details: {
        marginTop: 8,
        color: '#333',
    },
    purpose: {
        marginTop: 4,
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
