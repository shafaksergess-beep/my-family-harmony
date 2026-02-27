import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import DashboardScreen from '../components/dashboard/DashboardScreen';
import ContributionsScreen from '../components/financial/ContributionsScreen';
import MeetingsScreen from '../components/meetings/MeetingsScreen';
import FamilyScreen from '../components/family/FamilyScreen';
import ProfileScreen from '../components/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
    const theme = useTheme();

    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={{
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: '#999',
                    headerStyle: {
                        backgroundColor: theme.colors.primary,
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            >
                <Tab.Screen
                    name="Dashboard"
                    component={DashboardScreen}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="view-dashboard" size={size} color={color} />
                        ),
                        title: 'Family Together',
                    }}
                />
                <Tab.Screen
                    name="Finances"
                    component={ContributionsScreen}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="cash-multiple" size={size} color={color} />
                        ),
                        title: 'Finances',
                    }}
                />
                <Tab.Screen
                    name="Meetings"
                    component={MeetingsScreen}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="calendar-account" size={size} color={color} />
                        ),
                        title: 'Meetings',
                    }}
                />
                <Tab.Screen
                    name="Family"
                    component={FamilyScreen}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="account-group" size={size} color={color} />
                        ),
                        title: 'Family',
                    }}
                />
                <Tab.Screen
                    name="Profile"
                    component={ProfileScreen}
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="account-circle" size={size} color={color} />
                        ),
                        title: 'Profile',
                    }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
}
