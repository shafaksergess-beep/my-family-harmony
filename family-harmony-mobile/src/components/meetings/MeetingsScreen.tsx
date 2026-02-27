import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, List, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { useOfflineData } from '../../hooks/useOfflineData';
import { Database } from '../../types/database.types';
import { format } from 'date-fns';

type Meeting = Database['public']['Tables']['meetings']['Row'];

export default function MeetingsScreen() {
    const { data: meetings, loading, refresh } = useOfflineData<Meeting>('meetings');
    const theme = useTheme();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.title}>All Meetings</Text>
                <IconButton icon="refresh" onPress={refresh} loading={loading} />
            </View>

            {loading && meetings.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" />
                </View>
            ) : meetings.length === 0 ? (
                <Card style={styles.card}>
                    <Card.Content>
                        <Text>No meetings found.</Text>
                    </Card.Content>
                </Card>
            ) : (
                meetings.map(meeting => (
                    <Card key={meeting.id} style={styles.card}>
                        <Card.Title 
                            title={meeting.meeting_type}
                            subtitle={`${meeting.meeting_date} at ${meeting.meeting_time || 'N/A'}`}
                            left={props => <List.Icon {...props} icon="calendar" />}
                            right={props => (
                                <View style={styles.rightAction}>
                                    {meeting.is_completed ? (
                                        <IconButton icon="check-circle" iconColor="#4caf50" size={24} />
                                    ) : (
                                        <IconButton icon="clock-outline" size={24} />
                                    )}
                                </View>
                            )}
                        />
                        {meeting.location && (
                            <Card.Content>
                                <Text variant="bodySmall" style={styles.location}>
                                    📍 {meeting.location}
                                </Text>
                            </Card.Content>
                        )}
                    </Card>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontWeight: 'bold',
    },
    card: {
        marginBottom: 16,
        elevation: 2,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    rightAction: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    location: {
        color: '#666',
        marginTop: -8,
        marginLeft: 40,
    }
});
