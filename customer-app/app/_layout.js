// app/_layout.js
import React, { useEffect, useState } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar, View, ActivityIndicator, Text } from 'react-native';
import { AuthProvider, useAuth } from '@/context/authContext';
import './globals.css';

function MainLayout() {
    const { isAuthenticated, loading, subscriptionStatus, checkSubscriptionStatus } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (loading) return;
        handleNavigation();
    }, [isAuthenticated, loading, subscriptionStatus]);

    const handleNavigation = async () => {
        const inAuthGroup = segments[0] === '(auth)';
        const inTabsGroup = segments[0] === '(tabs)';

        // ✅ CASE 1: Not authenticated -> Sign in
        if (!isAuthenticated) {
            if (!inAuthGroup || segments[1] !== 'signin') {
                setTimeout(() => router.replace('/(auth)/signin'), 100);
            }
            return;
        }

        // ✅ CASE 2: Authenticated - Check subscription status
        if (isAuthenticated && !subscriptionStatus) {
            setChecking(true);
            await checkSubscriptionStatus();
            setChecking(false);
            return;
        }

        // ✅ CASE 3: EXPIRED or INACTIVE -> Expired page
        if (subscriptionStatus === 'EXPIRED' || subscriptionStatus === 'INACTIVE') {
            if (segments[1] !== 'expired') {
                setTimeout(() => router.replace('/(tabs)/expired'), 100);
            }
            return;
        }

        // ✅ CASE 4: ACTIVE -> Tabs
        if (subscriptionStatus === 'ACTIVE' && inAuthGroup) {
            setTimeout(() => router.replace('/(tabs)'), 100);
        }
    };

    if (loading || checking) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
                <ActivityIndicator size="large" color="#f97316" />
                <Text style={{ color: '#9ca3af', marginTop: 16, fontSize: 14 }}>Loading...</Text>
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
