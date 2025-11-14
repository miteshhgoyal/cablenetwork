// app/_layout.js (Customer App)
import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '@/context/authContext';

function MainLayout() {
    const { isAuthenticated, loading, checkSubscriptionStatus } = useAuth();
    const router = useRouter();
    const [showExpiry, setShowExpiry] = useState(false);
    const [expiryInfo, setExpiryInfo] = useState(null);

    useEffect(() => {
        if (loading) return;

        if (!isAuthenticated) {
            router.replace('/(auth)/signin');
            return;
        }

        // Check subscription status on app launch
        checkStatus();
    }, [isAuthenticated, loading]);

    const checkStatus = async () => {
        const result = await checkSubscriptionStatus();

        if (!result.valid) {
            // Redirect to expired screen
            router.replace({
                pathname: '/(customer)/expired',
                params: result.data || {}
            });
        } else if (result.data?.daysRemaining <= 7) {
            // Show expiry warning for 2-3 seconds
            setExpiryInfo(result.data);
            setShowExpiry(true);
            setTimeout(() => setShowExpiry(false), 3000);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    // Show expiry date overlay for 2-3 seconds
    if (showExpiry && expiryInfo) {
        return (
            <View className="flex-1 justify-center items-center bg-blue-600">
                <Text className="text-white text-2xl font-bold mb-2">Subscription Expiring Soon</Text>
                <Text className="text-white text-lg">Expires on: {new Date(expiryInfo.expiryDate).toLocaleDateString()}</Text>
                <Text className="text-blue-200 mt-2">{expiryInfo.daysRemaining} days remaining</Text>
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="expired" options={{ headerShown: false }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <MainLayout />
        </AuthProvider>
    );
}
