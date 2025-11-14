// app/(tabs)/_layout.js
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#f97316',
                tabBarStyle: {
                    backgroundColor: '#1f2937',
                    borderTopColor: '#374151',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Channels',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="tv" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="movies"
                options={{
                    title: 'Movies',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="film" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="series"
                options={{
                    title: 'Web Series',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="play-circle" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
