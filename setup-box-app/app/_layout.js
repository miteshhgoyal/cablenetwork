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

    // 1) lock orientation
    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, []);

    // 2) check subscription once after auth is known
    useEffect(() => {
        const run = async () => {
            if (!loading && isAuthenticated && !statusChecked) {
                setChecking(true);
                await checkSubscriptionStatus();
                setStatusChecked(true);
                setChecking(false);
            }
        };
        run();  
    }, [loading, isAuthenticated, statusChecked, checkSubscriptionStatus]);

    // 3) control splash visibility
    useEffect(() => {
        if (!loading && isAuthenticated && statusChecked) {
            const t = setTimeout(() => setShowSplash(false), 2000);
            return () => clearTimeout(t);
        }
        if (!loading && !isAuthenticated) {
            setShowSplash(false);
        }
    }, [loading, isAuthenticated, statusChecked]);

    // 4) navigation based on state
    useEffect(() => {
console.log("navigation based on state");
        if (loading || checking || showSplash) return;

        const inAuthGroup = segments[0] === '(auth)';
        const currentRoute = segments.join('/');

        if (!isAuthenticated) {
            console.log("isAuthenticated1");

            if (!inAuthGroup) {
                console.log("isAuthenticated2");

                router.replace('/(auth)/signin');
            }
            return;
        }

        if (subscriptionStatus === 'ACTIVE') {
            console.log("subscriptionStatus1");

            if (inAuthGroup || currentRoute === '' || currentRoute === 'index') {
                console.log("subscriptionStatus2");

                router.replace('(tabs)');
            }
            return;
        }
        // EXPIRED / INACTIVE are handled by UI below; no navigation
    }, [loading, checking, showSplash, isAuthenticated, subscriptionStatus]);

    // 5) ignore sitemap / not-found internal routes
    useEffect(() => {
        const currentRoute = segments.join('/');
        if (currentRoute.includes('sitemap') || currentRoute.includes('+not-found') || currentRoute.includes('_sitemap')) {
            if (isAuthenticated && subscriptionStatus === 'ACTIVE') {
                router.replace('/(tabs)/index');
            } else if (!isAuthenticated) {
                router.replace('/(auth)/signin');
            }
        }
    }, [ isAuthenticated, subscriptionStatus]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const getDaysRemaining = () => {
        if (!user?.expiryDate) return null;
        const now = new Date();
        const expiry = new Date(user.expiryDate);
        return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    };

    // Splash / loading
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
                                {isExpired ? <AlertCircle size={20} color="#ef4444" /> : <CheckCircle2 size={20} color="#3b82f6" />}
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
                                <Text
                                    className={`text-center text-sm font-semibold ${subscriptionStatus === 'ACTIVE'
                                            ? 'text-green-500'
                                            : subscriptionStatus === 'EXPIRED'
                                                ? 'text-red-500'
                                                : 'text-yellow-500'
                                        }`}
                                >
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

    // Expired/inactive screen
    if (!loading && !checking && !showSplash && (subscriptionStatus === 'EXPIRED' || subscriptionStatus === 'INACTIVE')) {
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

    // Normal app navigation
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
