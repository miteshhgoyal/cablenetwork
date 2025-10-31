// app/_layout.js
import React, { useEffect } from 'react';
import { Stack, useSegments, useRouter, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'react-native';
import { AuthProvider, useAuth } from '@/context/authContext';
import './globals.css';

function MainLayout() {
    const { isAuthenticated, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const navigationState = useRootNavigationState();

    useEffect(() => {
        // Wait for navigation to be ready and auth to finish loading
        if (!navigationState?.key || loading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inTabsGroup = segments[0] === '(tabs)';

        console.log('Navigation State:', {
            isAuthenticated,
            inAuthGroup,
            inTabsGroup,
            segments,
            loading
        });

        // Redirect authenticated users from auth screens to tabs
        if (isAuthenticated && inAuthGroup) {
            router.replace('/(tabs)');
        }
        // Redirect unauthenticated users from tabs to login
        else if (!isAuthenticated && !inAuthGroup) {
            router.replace('/(auth)/signin');
        }
    }, [isAuthenticated, loading, segments, navigationState?.key]);

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#f97316" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
