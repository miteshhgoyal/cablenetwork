// app/_layout.js
import React, { useEffect, useState } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar, View, ActivityIndicator, Text, Image } from 'react-native';
import { AuthProvider, useAuth } from '@/context/authContext';
import { Calendar, CheckCircle2, AlertCircle } from 'lucide-react-native';
import './globals.css';

function MainLayout() {
    const { isAuthenticated, loading, subscriptionStatus, checkSubscriptionStatus, user } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const [checking, setChecking] = useState(false);
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        if (loading) return;
        handleNavigation();
    }, [isAuthenticated, loading, subscriptionStatus]);

    // ✅ Show splash for 2.5 seconds on app start
    useEffect(() => {
        if (!loading && isAuthenticated && user) {
            const timer = setTimeout(() => {
                setShowSplash(false);
            }, 2500); // Show for 2.5 seconds
            return () => clearTimeout(timer);
        } else {
            setShowSplash(false);
        }
    }, [loading, isAuthenticated, user]);

    const handleNavigation = async () => {
        const inAuthGroup = segments[0] === '(auth)';
        const inTabsGroup = segments[0] === '(tabs)';
        const currentRoute = segments.join('/');

        // ✅ CASE 1: Not authenticated -> Sign in
        if (!isAuthenticated) {
            if (!inAuthGroup && currentRoute !== '(auth)/signin') {
                
                setTimeout(() => router.replace('/(auth)/signin'), 100);
            }
            return;
        }

        // ✅ CASE 2: Authenticated but status not yet checked
        if (isAuthenticated && !subscriptionStatus) {
            
            setChecking(true);
            await checkSubscriptionStatus();
            setChecking(false);
            return;
        }

        // ✅ Wait for splash to finish before navigating
        if (showSplash) {
            
            return;
        }

        // ✅ CASE 3: EXPIRED or INACTIVE -> Expired page
        if (subscriptionStatus === 'EXPIRED' || subscriptionStatus === 'INACTIVE') {
            if (!inTabsGroup || segments[1] !== 'expired') {
                
                setTimeout(() => router.replace('/(tabs)/expired'), 100);
            }
            return;
        }

        // ✅ CASE 4: ACTIVE -> Tabs
        if (subscriptionStatus === 'ACTIVE') {
            // If we're in auth group OR route is empty (app just opened)
            if (inAuthGroup || currentRoute === '' || currentRoute === 'index') {
                
                setTimeout(() => router.replace('/(tabs)'), 100);
            } else if (inTabsGroup) {
                
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

    // ✅ SPLASH SCREEN with Expiry Info
    if (loading || checking || (showSplash && isAuthenticated && user)) {
        const daysRemaining = getDaysRemaining();
        const isExpiring = daysRemaining !== null && daysRemaining < 7;
        const isExpired = daysRemaining !== null && daysRemaining <= 0;

        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />

                {/* App Logo/Name */}
                <View className="items-center mb-12">
                    <View className="bg-orange-500 w-20 h-20 rounded-2xl items-center justify-center mb-4">
                        <Text className="text-white text-3xl font-bold">TV</Text>
                    </View>
                    <Text className="text-white text-2xl font-bold">IPTV Player</Text>
                </View>

                {/* Loading Spinner */}
                <ActivityIndicator size="large" color="#f97316" />

                {/* Expiry Info Card - Show if user data exists */}
                {user && user.expiryDate && !loading && (
                    <View className="mt-8 mx-8 bg-gray-900 rounded-2xl p-5 border border-gray-800 w-80">
                        {/* User Name */}
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

                        {/* Expiry Date */}
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

                            {/* Days Badge */}
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
                    </View>
                )}

                {/* Loading Text */}
                <Text className="text-gray-500 text-sm mt-6">
                    {loading ? 'Loading...' : checking ? 'Verifying...' : 'Welcome!'}
                </Text>
            </View>
        );
    }

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
