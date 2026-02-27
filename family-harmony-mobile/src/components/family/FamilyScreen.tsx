import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Avatar, List, IconButton } from 'react-native-paper';
import FamilyHealthScore from './FamilyHealthScore';
import { useFamily } from '../../context/FamilyContext';

export default function FamilyScreen() {
    const { selectedFamily } = useFamily();

    return (
        <ScrollView style={styles.container}>
            <FamilyHealthScore />

            <Card style={styles.card}>
                <Card.Title 
                    title="Family Members" 
                    right={(props) => <IconButton {...props} icon="plus" onPress={() => {}} />}
                />
                <Card.Content>
                    <List.Item
                        title="You"
                        description="Admin"
                        left={props => <Avatar.Icon {...props} size={40} icon="account" />}
                    />
                    <List.Item
                        title="Joining Phase 5"
                        description="More members coming soon"
                        left={props => <Avatar.Icon {...props} size={40} icon="account-group" />}
                    />
                </Card.Content>
            </Card>

            <Card style={styles.card}>
                <Card.Title title="Heritage & Info" />
                <Card.Content>
                    <Text variant="bodySmall" style={styles.description}>
                        • Ancestry tracking{'\n'}
                        • Family tree visualization{'\n'}
                        • Important documents{'\n'}
                        • Traditions & Archives
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
    },
    description: {
        marginTop: 12,
        lineHeight: 20,
        color: '#666',
    },
});
