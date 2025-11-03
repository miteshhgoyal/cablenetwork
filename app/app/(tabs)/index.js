// app/(tabs)/index.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/authContext';
import { useRouter } from 'expo-router';
import {
    Users,
    Package,
    FolderTree,
    Radio,
    UserCheck,
    IndianRupee,
    RefreshCw,
    UserX,
    UserPlus,
    Building2,
    Store,
    Film,
    Target,
    BarChart3,
} from 'lucide-react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';


const Dashboard = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);


    useEffect(() => {
        fetchDashboardData();
    }, []);


    const fetchDashboardData = async () => {
        try {
            setRefreshing(true);
            const response = await api.get('/dashboard/overview');
            setDashboardData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };


    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };


    const getMenuItems = () => {
        const { role } = user;


        if (role === 'admin') {
            return [
                { title: 'Distributors', icon: Building2, color: '#6366f1', bgColor: '#eef2ff', route: 'distributors' },
                { title: 'Resellers', icon: Store, color: '#8b5cf6', bgColor: '#f5f3ff', route: 'resellers' },
                { title: 'Subscribers', icon: Users, color: '#3b82f6', bgColor: '#eff6ff', route: 'subscribers' },
                { title: 'Categories', icon: FolderTree, color: '#06b6d4', bgColor: '#ecfeff', route: 'categories' },
                { title: 'Channels', icon: Radio, color: '#14b8a6', bgColor: '#f0fdfa', route: 'channels' },
                { title: 'Packages', icon: Package, color: '#10b981', bgColor: '#f0fdf4', route: 'packages' },
                { title: 'OTT', icon: Film, color: '#f59e0b', bgColor: '#fffbeb', route: 'ott' },
                { title: 'Credit', icon: IndianRupee, color: '#ec4899', bgColor: '#fce7f3', route: 'credits' },
            ];
        }


        if (role === 'distributor') {
            return [
                { title: 'Resellers', icon: Store, color: '#8b5cf6', bgColor: '#f5f3ff', route: 'resellers' },
                { title: 'Subscribers', icon: Users, color: '#3b82f6', bgColor: '#eff6ff', route: 'subscribers' },
                { title: 'Categories', icon: FolderTree, color: '#06b6d4', bgColor: '#ecfeff', route: 'categories' },
                { title: 'Channels', icon: Radio, color: '#14b8a6', bgColor: '#f0fdfa', route: 'channels' },
                { title: 'Packages', icon: Package, color: '#10b981', bgColor: '#f0fdf4', route: 'packages' },
                { title: 'OTT', icon: Film, color: '#f59e0b', bgColor: '#fffbeb', route: 'ott' },
                { title: 'Credit', icon: IndianRupee, color: '#ec4899', bgColor: '#fce7f3', route: 'credits' },
            ];
        }


        // Reseller - minimal menu
        return [
            { title: 'Subscribers', icon: Users, color: '#3b82f6', bgColor: '#eff6ff', route: 'subscribers' },
            { title: 'Packages', icon: Package, color: '#10b981', bgColor: '#f0fdf4', route: 'packages' },
        ];
    };


    const getStatsConfig = () => {
        if (!dashboardData) return [];


        const { role } = user;
        const stats = dashboardData.stats;


        switch (role) {
            case 'admin':
                return [
                    {
                        title: 'Total Distributors',
                        value: stats.totalDistributors,
                        icon: Building2,
                        color: '#6366f1',
                        bgColor: '#eef2ff',
                        route: 'distributors',
                    },
                    {
                        title: 'Total Resellers',
                        value: stats.totalResellers,
                        icon: Store,
                        color: '#8b5cf6',
                        bgColor: '#f5f3ff',
                        route: 'resellers',
                    },
                    {
                        title: 'Total Subscribers',
                        value: stats.totalSubscribers,
                        icon: Users,
                        color: '#3b82f6',
                        bgColor: '#eff6ff',
                        route: 'subscribers',
                    },
                    {
                        title: 'Total Categories',
                        value: stats.totalCategories,
                        icon: FolderTree,
                        color: '#06b6d4',
                        bgColor: '#ecfeff',
                        route: 'categories',
                    },
                    {
                        title: 'Total Channels',
                        value: stats.totalChannels,
                        icon: Radio,
                        color: '#14b8a6',
                        bgColor: '#f0fdfa',
                        route: 'channels',
                    },
                    {
                        title: 'Total Packages',
                        value: stats.totalPackages,
                        icon: Package,
                        color: '#10b981',
                        bgColor: '#f0fdf4',
                        route: 'packages',
                    },
                    {
                        title: 'Total OTT',
                        value: stats.totalOtt,
                        icon: Film,
                        color: '#f59e0b',
                        bgColor: '#fffbeb',
                        route: 'ott',
                    },
                    {
                        title: 'Active Subscribers',
                        value: stats.activeSubscribers,
                        icon: UserCheck,
                        color: '#22c55e',
                        bgColor: '#f0fdf4',
                        route: 'subscribers',
                    },
                ];


            case 'distributor':
                return [
                    {
                        title: 'Total Resellers',
                        value: stats.totalResellers,
                        icon: Store,
                        color: '#8b5cf6',
                        bgColor: '#f5f3ff',
                        route: 'resellers',
                    },
                    {
                        title: 'Total Subscribers',
                        value: stats.totalSubscribers,
                        icon: Users,
                        color: '#3b82f6',
                        bgColor: '#eff6ff',
                        route: 'subscribers',
                    },
                    {
                        title: 'Total Categories',
                        value: stats.totalCategories,
                        icon: FolderTree,
                        color: '#06b6d4',
                        bgColor: '#ecfeff',
                        route: 'categories',
                    },
                    {
                        title: 'Total Channels',
                        value: stats.totalChannels,
                        icon: Radio,
                        color: '#14b8a6',
                        bgColor: '#f0fdfa',
                        route: 'channels',
                    },
                    {
                        title: 'Total Packages',
                        value: stats.totalPackages,
                        icon: Package,
                        color: '#10b981',
                        bgColor: '#f0fdf4',
                        route: 'packages',
                    },
                    {
                        title: 'Total OTT',
                        value: stats.totalOtt,
                        icon: Film,
                        color: '#f59e0b',
                        bgColor: '#fffbeb',
                        route: 'ott',
                    },
                    {
                        title: 'Active Subscribers',
                        value: stats.activeSubscribers,
                        icon: UserCheck,
                        color: '#22c55e',
                        bgColor: '#f0fdf4',
                        route: 'subscribers',
                    },
                    {
                        title: 'Inactive Subscribers',
                        value: stats.inactiveSubscribers,
                        icon: UserX,
                        color: '#ef4444',
                        bgColor: '#fef2f2',
                        route: 'subscribers',
                    },
                ];


            case 'reseller':
                return [
                    {
                        title: 'Total Subscriptions',
                        value: stats.totalSubscribers,
                        icon: Users,
                        color: '#3b82f6',
                        bgColor: '#eff6ff',
                        route: 'subscribers',
                    },
                    {
                        title: 'Active Subscribers',
                        value: stats.activeSubscribers,
                        icon: UserCheck,
                        color: '#22c55e',
                        bgColor: '#f0fdf4',
                        route: 'subscribers',
                    },
                    {
                        title: 'Inactive Subscribers',
                        value: stats.inactiveSubscribers,
                        icon: UserX,
                        color: '#ef4444',
                        bgColor: '#fef2f2',
                        route: 'subscribers',
                    },
                    {
                        title: 'Fresh Subscribers',
                        value: stats.freshSubscribers,
                        icon: UserPlus,
                        color: '#06b6d4',
                        bgColor: '#ecfeff',
                        route: 'subscribers',
                    },
                    {
                        title: 'Total Packages',
                        value: stats.totalPackages,
                        icon: Package,
                        color: '#10b981',
                        bgColor: '#f0fdf4',
                        route: 'packages',
                    },
                    {
                        title: 'Subscriber Limit',
                        value: stats.subscriberLimit,
                        icon: Target,
                        color: '#f59e0b',
                        bgColor: '#fffbeb',
                        route: null,
                    },
                    {
                        title: 'Available Slots',
                        value: stats.availableSlots,
                        icon: BarChart3,
                        color: '#8b5cf6',
                        bgColor: '#f5f3ff',
                        route: null,
                    },
                ];


            default:
                return [];
        }
    };


    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="text-gray-600 font-semibold mt-4">
                    Loading dashboard...
                </Text>
            </View>
        );
    }


    const stats = getStatsConfig();
    const menuItems = getMenuItems();


    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View style={{ backgroundColor: '#1e3a8a', paddingHorizontal: 16, paddingVertical: 32 }}>
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 }}>
                            Welcome back,
                        </Text>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ffffff' }}>
                            {dashboardData?.user?.name?.toUpperCase()}
                        </Text>
                        <Text style={{ color: '#bfdbfe', fontSize: 16, marginTop: 8 }}>
                            Dashboard Overview
                        </Text>
                    </View>


                    {/* Balance Card */}
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                        <Text style={{ color: '#bfdbfe', fontSize: 13, marginBottom: 8 }}>
                            Available amount
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <IndianRupee size={32} color="#ffffff" style={{ marginRight: 8 }} />
                                <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#ffffff' }}>
                                    {(dashboardData?.user?.balance || 0).toLocaleString('en-IN')}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={fetchDashboardData}
                                disabled={refreshing}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 12,
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    opacity: refreshing ? 0.5 : 1,
                                }}
                            >
                                <RefreshCw
                                    size={20}
                                    color="#ffffff"
                                    style={refreshing ? { transform: [{ rotate: '360deg' }] } : {}}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>


                {/* Stats Cards - NOW CLICKABLE */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                        Statistics
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
                        {stats.map((stat, index) => {
                            const IconComponent = stat.icon;
                            const isClickable = stat.route !== null;

                            return (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        if (isClickable) {
                                            router.push(`/${stat.route}`);
                                        }
                                    }}
                                    disabled={!isClickable}
                                    style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}
                                    activeOpacity={isClickable ? 0.7 : 1}
                                >
                                    <View
                                        style={{
                                            backgroundColor: '#ffffff',
                                            borderRadius: 16,
                                            paddingHorizontal: 16,
                                            paddingVertical: 16,
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: isClickable ? 0.1 : 0.05,
                                            shadowRadius: isClickable ? 8 : 3,
                                            elevation: isClickable ? 4 : 2,
                                            borderWidth: 1,
                                            borderColor: isClickable ? '#3b82f6' : '#e5e7eb',
                                            minHeight: 130,
                                            justifyContent: 'flex-start',
                                            transform: isClickable ? [{ scale: 1 }] : [],
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginBottom: 12,
                                                backgroundColor: stat.bgColor,
                                            }}
                                        >
                                            <IconComponent size={24} color={stat.color} />
                                        </View>
                                        <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '500', marginBottom: 8, lineHeight: 16 }}>
                                            {stat.title}
                                        </Text>
                                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                                            {stat.value}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>


                {/* Menu Buttons */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                        Management
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                        {menuItems.map((item, index) => {
                            const IconComponent = item.icon;
                            return (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => router.push(`/${item.route}`)}
                                    style={{ width: '50%', paddingHorizontal: 4, marginBottom: 12 }}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        className='flex-row items-center p-3'
                                        style={{
                                            backgroundColor: '#ffffff',
                                            borderRadius: 12,
                                            alignItems: 'center',
                                            borderWidth: 1,
                                            borderColor: '#e5e7eb',
                                        }}
                                    >
                                        <View
                                            className='mr-3'
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 10,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: item.bgColor,
                                            }}
                                        >
                                            <IconComponent size={22} color={item.color} />
                                        </View>
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#111827', textAlign: 'center' }}>
                                            {item.title}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};


export default Dashboard;
