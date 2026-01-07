// app/_layout.js
import React, { useEffect, useState } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { AuthProvider, useAuth } from '@/context/authContext';
import { Calendar, CheckCircle2, AlertCircle, XCircle } from 'lucide-react-native';
import './globals.css';

function MainLayout() {
    const { isAuthenticated, loading, subscriptionStatus, checkSubscriptionStatus, user, logout } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const [checking, setChecking] = useState(false);
    const [showSplash, setShowSplash] = useState(true);
    const [statusChecked, setStatusChecked] = useState(false);

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

    useEffect(() => {
        if (!loading && isAuthenticated && statusChecked) {
            const timer = setTimeout(() => setShowSplash(false), 2000);
            return () => clearTimeout(timer);
        } else if (!loading && !isAuthenticated) {
            setShowSplash(false);
        }
    }, [loading, isAuthenticated, statusChecked]);

    useEffect(() => {
        if (loading || checking || showSplash) return;
        handleNavigation();
    }, [isAuthenticated, loading, subscriptionStatus, checking, showSplash]);

    const handleNavigation = () => {
        const inAuthGroup = segments[0] === '(auth)';
        const currentRoute = segments.join('/');

        if (!isAuthenticated) {
            if (!inAuthGroup && currentRoute !== '(auth)/signin') {
                setTimeout(() => router.replace('/(auth)/signin'), 100);
            }
            return;
        }

        if (subscriptionStatus === 'ACTIVE') {
            if (inAuthGroup || currentRoute === '' || currentRoute === 'index') {
                setTimeout(() => router.replace('/(tabs)'), 100);
            }
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
        return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    };

    const getStatusInfo = () => {
        const daysRemaining = getDaysRemaining();
        const isExpiring = daysRemaining !== null && daysRemaining < 7 && daysRemaining > 0;
        const isExpired = daysRemaining !== null && daysRemaining <= 0;

        let config = {
            icon: CheckCircle2,
            color: '#3b82f6',
            bgColor: 'bg-blue-500/20',
            text: 'Active',
            message: ''
        };

        switch (subscriptionStatus) {
            case 'EXPIRED':
                config = {
                    icon: XCircle,
                    color: '#ef4444',
                    bgColor: 'bg-red-500/20',
                    text: 'Expired',
                    message: 'Your subscription has expired. Please contact your reseller or admin to renew.'
                };
                break;
            case 'INACTIVE':
                config = {
                    icon: AlertCircle,
                    color: '#f59e0b',
                    bgColor: 'bg-amber-500/20',
                    text: 'Inactive',
                    message: 'Your account is inactive. Please contact admin to activate your subscription.'
                };
                break;
            case 'FRESH':
                config = {
                    icon: AlertCircle,
                    color: '#3b82f6',
                    bgColor: 'bg-blue-500/20',
                    text: 'Pending',
                    message: 'Device registered successfully. Please contact admin to assign packages and activate your account.'
                };
                break;
            case 'RESELLER_INACTIVE':
                config = {
                    icon: XCircle,
                    color: '#ef4444',
                    bgColor: 'bg-red-500/20',
                    text: 'Service Unavailable',
                    message: 'Your reseller account is inactive. Services are temporarily unavailable.'
                };
                break;
            case 'DISTRIBUTOR_INACTIVE':
                config = {
                    icon: XCircle,
                    color: '#ef4444',
                    bgColor: 'bg-red-500/20',
                    text: 'Service Unavailable',
                    message: 'The distributor account is inactive. Services are temporarily unavailable.'
                };
                break;
            case 'NO_PACKAGES':
                config = {
                    icon: AlertCircle,
                    color: '#f97316',
                    bgColor: 'bg-orange-500/20',
                    text: 'No Packages',
                    message: 'No active packages assigned. All packages may have expired. Please contact admin.'
                };
                break;
            case 'ACTIVE':
                config = {
                    icon: CheckCircle2,
                    color: isExpiring ? '#f97316' : '#22c55e',
                    bgColor: isExpiring ? 'bg-orange-500/20' : 'bg-green-500/20',
                    text: isExpiring ? 'Expiring Soon' : 'Active',
                    message: ''
                };
                break;
        }

        return { ...config, isExpired, isExpiring, daysRemaining };
    };

    const isBlockedState = isAuthenticated && statusChecked && subscriptionStatus !== 'ACTIVE' && !loading && !checking && !showSplash;

    if (loading || checking || showSplash || isBlockedState) {
        const statusInfo = getStatusInfo();
        const StatusIcon = statusInfo.icon;

        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />

                <View className="items-center mb-12">
                    <View className="bg-orange-500 w-20 h-20 rounded-2xl items-center justify-center mb-4">
                        <Text className="text-white text-3xl font-bold">TV</Text>
                    </View>
                    <Text className="text-white text-2xl font-bold">IPTV Player</Text>
                </View>

                {(loading || checking) && <ActivityIndicator size="large" color="#f97316" />}

                {user && statusChecked && (
                    <View className="mt-8 mx-8 bg-gray-900 rounded-2xl p-5 border border-gray-800" style={{ width: 320 }}>
                        <View className="items-center mb-4 pb-4 border-b border-gray-800">
                            <View className={`${statusInfo.bgColor} w-20 h-20 rounded-full items-center justify-center mb-3`}>
                                <StatusIcon size={40} color={statusInfo.color} />
                            </View>
                            <Text className="text-white font-semibold text-lg mb-1">
                                {user.name || user.subscriberName || 'User'}
                            </Text>
                            <View className={`px-4 py-1.5 rounded-full ${statusInfo.bgColor}`}>
                                <Text className="text-xs font-semibold" style={{ color: statusInfo.color }}>
                                    {statusInfo.text.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        {user.expiryDate && (
                            <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-gray-800">
                                <View className="flex-row items-center flex-1">
                                    <Calendar size={18} color="#9ca3af" style={{ marginRight: 8 }} />
                                    <View>
                                        <Text className="text-gray-400 text-xs mb-1">
                                            {statusInfo.isExpired ? 'Expired On' : 'Expires On'}
                                        </Text>
                                        <Text className="text-white font-medium text-sm">
                                            {formatDate(user.expiryDate)}
                                        </Text>
                                    </View>
                                </View>
                                {statusInfo.daysRemaining !== null && !statusInfo.isExpired && (
                                    <View className={`px-3 py-1.5 rounded-full ${statusInfo.isExpiring ? 'bg-red-500/20' : 'bg-green-500/20'
                                        }`}>
                                        <Text className={`text-xs font-bold ${statusInfo.isExpiring ? 'text-red-500' : 'text-green-500'
                                            }`}>
                                            {statusInfo.daysRemaining} days
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {isBlockedState && statusInfo.message && (
                            <View className="mb-4">
                                <Text className="text-gray-300 text-sm text-center leading-5">
                                    {statusInfo.message}
                                </Text>
                            </View>
                        )}

                        {isBlockedState && (
                            <View>
                                <TouchableOpacity
                                    className="bg-orange-500 rounded-xl py-3 mb-2"
                                    onPress={async () => {
                                        setChecking(true);
                                        await checkSubscriptionStatus();
                                        setChecking(false);
                                    }}
                                    disabled={checking}
                                    activeOpacity={0.8}
                                >
                                    <Text className="text-white text-center font-semibold text-sm">
                                        {checking ? 'Checking...' : 'Refresh Status'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="bg-gray-800 rounded-xl py-3 border border-gray-700"
                                    onPress={logout}
                                    activeOpacity={0.8}
                                >
                                    <Text className="text-red-500 text-center font-semibold text-sm">
                                        Logout
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {(loading || (checking && !isBlockedState)) && (
                    <Text className="text-gray-500 text-sm mt-6">
                        {loading ? 'Loading...' : 'Verifying subscription...'}
                    </Text>
                )}
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