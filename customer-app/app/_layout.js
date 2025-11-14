// app/_layout.js
import React, { useEffect, useState } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar, View, ActivityIndicator, Text } from 'react-native';
import { AuthProvider, useAuth } from '@/context/authContext';
import './globals.css';

function MainLayout() {
    const { isAuthenticated, loading, user, checkSubscriptionStatus } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    const [checking, setChecking] = useState(false);
    const [showExpiry, setShowExpiry] = useState(false);
    const [expiryData, setExpiryData] = useState(null);

    useEffect(() => {
        if (loading) return;

        handleNavigation();
    }, [isAuthenticated, loading]);

    const handleNavigation = async () => {
        const inAuthGroup = segments[0] === '(auth)';

        // If not authenticated, go to login
        if (!isAuthenticated) {
            if (!inAuthGroup) {
                setTimeout(() => router.replace('/(auth)/signin'), 100);
            }
            return;
        }

        // If authenticated and has checkSubscriptionStatus function, check status
        if (checkSubscriptionStatus) {
            setChecking(true);
            const result = await checkSubscriptionStatus();
            setChecking(false);

            if (!result.valid) {
                if (result.needsLogin) {
                    router.replace('/(auth)/signin');
                } else {
                    // Expired/Inactive - show expired screen
                    router.replace('/(tabs)/expired');
                }
                return;
            }

            // Valid - show expiry info for 2.5 seconds
            setExpiryData(result.data);
            setShowExpiry(true);

            setTimeout(() => {
                setShowExpiry(false);
                if (inAuthGroup) {
                    router.replace('/(tabs)');
                }
            }, 2500);
        } else {
            // No status check function - normal flow
            setTimeout(() => {
                if (isAuthenticated && inAuthGroup) {
                    router.replace('/(tabs)');
                } else if (!isAuthenticated && !inAuthGroup) {
                    router.replace('/(auth)/signin');
                }
            }, 100);
        }
    };

    if (loading || checking) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={{ color: '#6b7280', marginTop: 16 }}>Loading...</Text>
            </View>
        );
    }

    // Show expiry info splash
    if (showExpiry && expiryData) {
        const daysRemaining = expiryData.daysRemaining;
        const isExpiringSoon = daysRemaining <= 7;

        return (
            <View style={{ flex: 1, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                <StatusBar barStyle="light-content" />
                <View style={{ alignItems: 'center', width: '100%' }}>
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
                        Welcome Back
                    </Text>
                    <Text style={{ color: '#bfdbfe', fontSize: 18, marginBottom: 32 }}>
                        {expiryData.subscriberName}
                    </Text>

                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%' }}>
                        <Text style={{ color: '#bfdbfe', fontSize: 14, marginBottom: 8, textAlign: 'center' }}>
                            Subscription Status
                        </Text>
                        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
                            {daysRemaining} Days Remaining
                        </Text>
                        <Text style={{ color: '#bfdbfe', fontSize: 14, textAlign: 'center' }}>
                            Expires: {new Date(expiryData.expiryDate).toLocaleDateString('en-IN')}
                        </Text>

                        {isExpiringSoon && (
                            <View style={{ marginTop: 16, backgroundColor: 'rgba(234,179,8,0.2)', borderRadius: 8, padding: 12 }}>
                                <Text style={{ color: '#fef3c7', fontSize: 12, textAlign: 'center' }}>
                                    ⚠️ Expiring soon! Please renew.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
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
