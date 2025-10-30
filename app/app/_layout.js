// app/_layout.js
import React, { useEffect } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'react-native';
import { AuthProvider, useAuth } from '@/context/authContext';
import './globals.css';

function MainLayout() {
    const { isAuthenticated, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (isAuthenticated && inAuthGroup) {
            // Redirect to channels after login
            router.replace('/(tabs)');
        } else if (!isAuthenticated && !inAuthGroup) {
            // Redirect to login if not authenticated
            router.replace('/(auth)/signin');
        }
    }, [isAuthenticated, loading, segments]);

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#f97316" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
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
