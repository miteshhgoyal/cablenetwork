// app/(tabs)/_layout.js
import { Tabs } from 'expo-router';
import { useAuth } from '../../context/authContext';
import { Home, BarChart3, User } from 'lucide-react-native';

export default function TabsLayout() {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading || !isAuthenticated || !user) {
        return null;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    height: 70,
                    paddingBottom: 12,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: '#2563eb',
                tabBarInactiveTintColor: '#9ca3af',
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginTop: 4,
                },
            }}
        >
            {/* Dashboard Tab */}
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <Home size={size} color={color} />
                    ),
                }}
            />

            {/* Analytics Tab */}
           

            {/* Profile Tab */}
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <User size={size} color={color} />
                    ),
                }}
            />

            {/* Hidden Screens - NOT shown in tabs */}
            <Tabs.Screen
                name="categories"
                options={{
                    href: null, // Hide from tab bar
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="channels"
                options={{
                    href: null, // Hide from tab bar
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="credit"
                options={{
                    href: null, // Hide from tab bar
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="distributors"
                options={{
                    href: null, // Hide from tab bar
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="ott"
                options={{
                    href: null, // Hide from tab bar
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="packages"
                options={{
                    href: null, // Hide from tab bar
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="resellers"
                options={{
                    href: null, // Hide from tab bar
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="subscribers"
                options={{
                    href: null, // Hide from tab bar
                    headerShown: false,
                }}
            />
        </Tabs>
    );
}
