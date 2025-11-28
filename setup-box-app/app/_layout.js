import React, { useEffect, useState } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar, View, ActivityIndicator, Text } from 'react-native';
import { AuthProvider, useAuth } from '@/context/authContext';
import { Calendar, CheckCircle2, AlertCircle } from 'lucide-react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import './globals.css';


function MainLayout() {
    const { isAuthenticated, loading, subscriptionStatus, checkSubscriptionStatus, user } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const [checking, setChecking] = useState(false);
    const [showSplash, setShowSplash] = useState(true);
    const [statusChecked, setStatusChecked] = useState(false);


    useEffect(() => {
        // Lock orientation to landscape on mount
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, []);


    // Step 1: Check subscription status FIRST when authenticated
    useEffect(() => {
        const checkStatus = async () => {
            if (!loading && isAuthenticated && !statusChecked) {
                setChecking(true);
                await checkSubscriptionStatus();
                setChecking(false);
                setStatusChecked(true);
            }
        };
        checkStatus();
    }, [isAuthenticated, loading, statusChecked]);


    // Step 2: Show splash UNTIL status is checked
    useEffect(() => {
        if (!loading && isAuthenticated && statusChecked) {
            const timer = setTimeout(() => {
                setShowSplash(false);
            }, 2000);
            return () => clearTimeout(timer);
        } else if (!loading && !isAuthenticated) {
            setShowSplash(false);
        }
    }, [loading, isAuthenticated, statusChecked, subscriptionStatus]);


    // Step 3: Navigate based on status
    useEffect(() => {
        if (loading || checking || showSplash) {
            return;
        }
        handleNavigation();
    }, [isAuthenticated, loading, subscriptionStatus, checking, showSplash]);


    const handleNavigation = () => {
        const inAuthGroup = segments[0] === '(auth)';
        const inTabsGroup = segments[0] === '(tabs)';
        const currentRoute = segments.join('/');


        if (!isAuthenticated) {
            if (!inAuthGroup && currentRoute !== '(auth)/signin') {
                setTimeout(() => router.replace('/(auth)/signin'), 100);
            }
            return;
        }


        if (subscriptionStatus === 'ACTIVE') {
            if (inAuthGroup || currentRoute === '' || currentRoute === 'index') {
                setTimeout(() => router.replace('/(tabs)/index'), 100);
            }
            return;
        }
    };


    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };


    const getDaysRemaining = () => {
        if (!user?.expiryDate) return null;
        const now = new Date();
        const expiry = new Date(user.expiryDate);
        const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return days;
    };


    // Show splash/loading screen
    if (loading || checking || showSplash) {
        const daysRemaining = getDaysRemaining();
        const isExpiring = daysRemaining !== null && daysRemaining < 7 && daysRemaining > 0;
        const isExpired = daysRemaining !== null && daysRemaining <= 0;


        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                <View className="items-center mb-12">
                    <View className="bg-orange-500 w-20 h-20 rounded-2xl items-center justify-center mb-4">
                        <Text className="text-white text-3xl font-bold">TV</Text>
                    </View>
                    <Text className="text-white text-2xl font-bold">IPTV Player</Text>
                </View>
                <ActivityIndicator size="large" color="#f97316" />
                {user && user.expiryDate && statusChecked && (
                    <View className="mt-8 mx-8 bg-gray-900 rounded-2xl p-5 border border-gray-800 w-80">
                        <View className="flex-row items-center mb-4 pb-4 border-b border-gray-800">
                            <View className={`p-2 rounded-full mr-3 ${isExpired ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                                {isExpired ? (
                                    <AlertCircle size={20} color="#ef4444" />
                                ) : (
                                    <CheckCircle2 size={20} color="#3b82f6" />
                                )}
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-xs mb-1">Welcome back</Text>
                                <Text className="text-white font-semibold text-base">
                                    {user.name || user.subscriberName || 'User'}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1">
                                <View className={`p-2 rounded-full mr-3 ${isExpired || isExpiring ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                                    <Calendar size={20} color={isExpired || isExpiring ? '#ef4444' : '#22c55e'} />
                                </View>
                                <View>
                                    <Text className="text-gray-400 text-xs mb-1">
                                        {isExpired ? 'Expired' : 'Expires On'}
                                    </Text>
                                    <Text className="text-white font-semibold text-sm">
                                        {formatDate(user.expiryDate)}
                                    </Text>
                                </View>
                            </View>
                            {daysRemaining !== null && !isExpired && (
                                <View className={`px-3 py-1.5 rounded-full ${isExpiring ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                                    <Text className={`text-xs font-bold ${isExpiring ? 'text-red-500' : 'text-green-500'}`}>
                                        {daysRemaining} days
                                    </Text>
                                </View>
                            )}
                            {isExpired && (
                                <View className="px-3 py-1.5 rounded-full bg-red-500/20">
                                    <Text className="text-xs font-bold text-red-500">EXPIRED</Text>
                                </View>
                            )}
                        </View>
                        {subscriptionStatus && (
                            <View className="mt-4 pt-4 border-t border-gray-800">
                                <Text className={`text-center text-sm font-semibold ${subscriptionStatus === 'ACTIVE' ? 'text-green-500' :
                                        subscriptionStatus === 'EXPIRED' ? 'text-red-500' :
                                            'text-yellow-500'
                                    }`}>
                                    {subscriptionStatus === 'ACTIVE' && '✓ Active Subscription'}
                                    {subscriptionStatus === 'EXPIRED' && '✕ Subscription Expired'}
                                    {subscriptionStatus === 'INACTIVE' && '⚠ Subscription Inactive'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
                <Text className="text-gray-500 text-sm mt-6">
                    {loading ? 'Loading...' : checking ? 'Verifying subscription...' : 'Welcome!'}
                </Text>
            </View>
        );
    }


    // NEW: Show expired screen if subscription is not active
    if (!loading && !checking && !showSplash && (subscriptionStatus === 'EXPIRED' || subscriptionStatus === 'INACTIVE')) {
        const daysRemaining = getDaysRemaining();
        const isExpiring = daysRemaining !== null && daysRemaining < 7 && daysRemaining > 0;
        const isExpired = daysRemaining !== null && daysRemaining <= 0;

        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                <View className="items-center mb-8">
                    <View className="bg-red-500 w-20 h-20 rounded-2xl items-center justify-center mb-4">
                        <AlertCircle size={40} color="#ffffff" />
                    </View>
                    <Text className="text-white text-2xl font-bold mb-2">Subscription Expired</Text>
                    <Text className="text-gray-400 text-center px-8">
                        Your subscription has expired. Please contact support to renew and continue enjoying our services.
                    </Text>
                </View>

                {user && user.expiryDate && (
                    <View className="mt-4 mx-8 bg-gray-900 rounded-2xl p-5 border border-gray-800 w-80">
                        <View className="flex-row items-center mb-4 pb-4 border-b border-gray-800">
                            <View className="p-2 rounded-full mr-3 bg-red-500/20">
                                <AlertCircle size={20} color="#ef4444" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-xs mb-1">Account</Text>
                                <Text className="text-white font-semibold text-base">
                                    {user.name || user.subscriberName || 'User'}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1">
                                <View className="p-2 rounded-full mr-3 bg-red-500/20">
                                    <Calendar size={20} color="#ef4444" />
                                </View>
                                <View>
                                    <Text className="text-gray-400 text-xs mb-1">Expired On</Text>
                                    <Text className="text-white font-semibold text-sm">
                                        {formatDate(user.expiryDate)}
                                    </Text>
                                </View>
                            </View>
                            <View className="px-3 py-1.5 rounded-full bg-red-500/20">
                                <Text className="text-xs font-bold text-red-500">EXPIRED</Text>
                            </View>
                        </View>
                    </View>
                )}

                <Text className="text-gray-500 text-sm mt-8 text-center px-8">
                    Contact your service provider to renew your subscription
                </Text>
            </View>
        );
    }


    // Render main app navigation
    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#111827" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="index" />
            </Stack>
        </>
    );
}


export default function RootLayout() {
    return (
        <AuthProvider>
            <MainLayout />
        </AuthProvider>
    );
}
