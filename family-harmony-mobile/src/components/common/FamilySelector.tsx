import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Menu, Button, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useFamily } from '../../context/FamilyContext';

export default function FamilySelector() {
    const { families, selectedFamily, selectFamily, isLoading } = useFamily();
    const [visible, setVisible] = useState(false);
    const theme = useTheme();

    const openMenu = () => setVisible(true);
    const closeMenu = () => setVisible(false);

    const handleSelect = (familyId: string) => {
        selectFamily(familyId);
        closeMenu();
    };

    if (isLoading) {
        return <ActivityIndicator size="small" />;
    }

    if (families.length === 0) {
        return (
            <Button mode="outlined" onPress={() => { }}>
                No Families Found
            </Button>
        );
    }

    return (
        <View style={styles.container}>
            <Menu
                visible={visible}
                onDismiss={closeMenu}
                anchor={
                    <Button
                        mode="outlined"
                        onPress={openMenu}
                        icon="chevron-down"
                        contentStyle={{ flexDirection: 'row-reverse' }}
                        style={styles.button}
                    >
                        {selectedFamily?.name || 'Select Family'}
                    </Button>
                }
            >
                {families.map((family) => (
                    <Menu.Item
                        key={family.id}
                        onPress={() => handleSelect(family.id)}
                        title={family.name}
                        leadingIcon={selectedFamily?.id === family.id ? 'check' : undefined}
                    />
                ))}
            </Menu>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    button: {
        borderColor: '#e0e0e0',
        backgroundColor: '#fff',
    },
});
