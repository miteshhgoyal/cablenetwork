// app/_layout.js
import React, { useEffect } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '@/context/authContext';
import './globals.css';

function MainLayout() {
    const { isAuthenticated, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const [isNavigating, setIsNavigating] = React.useState(false);

    useEffect(() => {
        // Don't navigate while loading or if already navigating
        if (loading || isNavigating) return;

        const inAuthGroup = segments[0] === '(auth)';

        // Only navigate if route doesn't match auth state
        if (isAuthenticated && inAuthGroup) {
            setIsNavigating(true);
            router.replace('/(tabs)');
        } else if (!isAuthenticated && !inAuthGroup) {
            setIsNavigating(true);
            router.replace('/(auth)/signin');
        }

        // Reset flag after navigation
        const timer = setTimeout(() => setIsNavigating(false), 500);
        return () => clearTimeout(timer);
    }, [isAuthenticated, loading, segments]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
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
