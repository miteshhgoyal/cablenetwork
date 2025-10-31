// app/(tabs)/_layout.js
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../context/authContext';
import {
    LayoutDashboard,
    FolderTree,
    Radio,
    Package,
    Tv,
    UserCheck,
    ShoppingCart,
    CircleDollarSign,
    User2,
    Building2,
} from 'lucide-react-native';

export default function TabsLayout() {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
        return null;
    }

    if (!isAuthenticated || !user) {
        return <Redirect href="/(auth)/signin" />;
    }

    const getRoleTabs = () => {
        const role = user?.role;

        switch (role) {
            case 'admin':
                return [
                    { name: 'index', title: 'Dashboard', icon: LayoutDashboard, show: true },
                    { name: 'categories', title: 'Categories', icon: FolderTree, show: true },
                    { name: 'channels', title: 'Channels', icon: Radio, show: true },
                    { name: 'packages', title: 'Packages', icon: Package, show: true },
                    { name: 'ott', title: 'OTT', icon: Tv, show: true },
                    { name: 'distributors', title: 'Distributors', icon: Building2, show: true },
                    { name: 'resellers', title: 'Resellers', icon: ShoppingCart, show: true },
                    { name: 'subscribers', title: 'Subscribers', icon: UserCheck, show: true },
                    { name: 'credit', title: 'Credit', icon: CircleDollarSign, show: true },
                    { name: 'profile', title: 'Profile', icon: User2, show: true },
                ];

            case 'distributor':
                return [
                    { name: 'index', title: 'Dashboard', icon: LayoutDashboard, show: true },
                    { name: 'categories', title: 'Categories', icon: FolderTree, show: true },
                    { name: 'channels', title: 'Channels', icon: Radio, show: true },
                    { name: 'packages', title: 'Packages', icon: Package, show: true },
                    { name: 'ott', title: 'OTT', icon: Tv, show: true },
                    { name: 'distributors', title: 'Distributors', icon: Building2, show: false },
                    { name: 'resellers', title: 'Resellers', icon: ShoppingCart, show: true },
                    { name: 'subscribers', title: 'Subscribers', icon: UserCheck, show: true },
                    { name: 'credit', title: 'Credit', icon: CircleDollarSign, show: true },
                    { name: 'profile', title: 'Profile', icon: User2, show: true },
                ];

            case 'reseller':
                return [
                    { name: 'index', title: 'Dashboard', icon: LayoutDashboard, show: true },
                    { name: 'categories', title: 'Categories', icon: FolderTree, show: false },
                    { name: 'channels', title: 'Channels', icon: Radio, show: false },
                    { name: 'packages', title: 'Packages', icon: Package, show: true },
                    { name: 'ott', title: 'OTT', icon: Tv, show: false },
                    { name: 'distributors', title: 'Distributors', icon: Building2, show: false },
                    { name: 'resellers', title: 'Resellers', icon: ShoppingCart, show: false },
                    { name: 'subscribers', title: 'Subscribers', icon: UserCheck, show: true },
                    { name: 'credit', title: 'Credit', icon: CircleDollarSign, show: false },
                    { name: 'profile', title: 'Profile', icon: User2, show: true },
                ];

            default:
                return [];
        }
    };

    const allTabs = getRoleTabs();

    return (
        <Tabs
            screenOptions={{
                headerShown: false, // ✅ NO HEADERS - THIS IS THE KEY CHANGE
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: '#3b82f6',
                tabBarInactiveTintColor: '#6b7280',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            {allTabs.map((tab) => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        title: tab.title,
                        href: tab.show ? undefined : null,
                        tabBarIcon: ({ color, size, focused }) => (
                            <tab.icon
                                size={size - 2}
                                color={color}
                                strokeWidth={focused ? 2.5 : 2}
                            />
                        ),
                    }}
                />
            ))}
        </Tabs>
    );
}
