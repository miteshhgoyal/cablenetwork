// app/(tabs)/expired.js
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertCircle, Calendar, HardDrive, User, LogOut, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../../context/authContext';

export default function ExpiredScreen() {
    const router = useRouter();
    const { user, logout, checkSubscriptionStatus, subscriptionStatus } = useAuth();
    const [checking, setChecking] = React.useState(false);

    // Refresh data on mount
    useEffect(() => {

        refreshData();
    }, []);

    const refreshData = async () => {
        setChecking(true);
        await checkSubscriptionStatus();
        setChecking(false);

        // If status becomes ACTIVE after refresh, navigate to tabs
        // This will be handled by _layout.js automatically
    };

    const handleLogout = async () => {
        await logout();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                {/* Icon */}
                <View className="items-center mb-8">
                    <View className="bg-red-500/10 p-6 rounded-full">
                        <AlertCircle size={80} color="#ef4444" />
                    </View>
                </View>

                {/* Title */}
                <Text className="text-3xl font-bold text-white text-center mb-4">
                    Subscription {user?.status === 'Inactive' ? 'Inactive' : 'Expired'}
                </Text>

                <Text className="text-gray-400 text-center text-base mb-10 px-4 leading-6">
                    Your subscription has {user?.status === 'Inactive' ? 'not been activated' : 'expired'}. Please contact your admin or reseller to {user?.status === 'Inactive' ? 'activate' : 'renew'}.
                </Text>

                {/* Info Card */}
                <View className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
                    {/* Name */}
                    <View className="flex-row items-center mb-5 pb-5 border-b border-gray-800">
                        <View className="bg-blue-500/20 p-3 rounded-full mr-4">
                            <User size={24} color="#3b82f6" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-400 text-xs mb-1">Subscriber</Text>
                            <Text className="text-white text-lg font-semibold">
                                {user?.name || user?.subscriberName || 'N/A'}
                            </Text>
                        </View>
                    </View>

                    {/* Expiry */}
                    <View className="flex-row items-center mb-5 pb-5 border-b border-gray-800">
                        <View className="bg-red-500/20 p-3 rounded-full mr-4">
                            <Calendar size={24} color="#ef4444" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-400 text-xs mb-1">
                                {user?.status === 'Inactive' ? 'Created On' : 'Expired On'}
                            </Text>
                            <Text className="text-white text-lg font-semibold">
                                {formatDate(user?.expiryDate)}
                            </Text>
                        </View>
                    </View>

                    {/* MAC */}
                    <View className="flex-row items-center">
                        <View className="bg-gray-700 p-3 rounded-full mr-4">
                            <HardDrive size={24} color="#9ca3af" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-400 text-xs mb-1">MAC Address</Text>
                            <Text className="text-white text-sm font-mono">{user?.macAddress || 'N/A'}</Text>
                        </View>
                    </View>

                    {/* Status Badge */}
                    <View className="mt-5 pt-5 border-t border-gray-800">
                        <View className="bg-red-500/20 px-4 py-2 rounded-full self-center">
                            <Text className="text-red-500 font-bold text-sm">
                                {subscriptionStatus || user?.status || 'EXPIRED'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Contact */}
                <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                    <Text className="text-yellow-400 font-semibold text-center mb-2">⚠️ Need Help?</Text>
                    <Text className="text-yellow-200/80 text-sm text-center">
                        Contact your reseller to {user?.status === 'Inactive' ? 'activate' : 'renew'} your subscription and regain access.
                    </Text>
                </View>

                {/* Refresh Button */}
                <TouchableOpacity
                    onPress={refreshData}
                    disabled={checking}
                    className="bg-blue-600 py-4 rounded-xl flex-row items-center justify-center mb-3"
                    activeOpacity={0.8}
                >
                    <RefreshCw size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text className="text-white font-bold text-base">
                        {checking ? 'Checking...' : 'Check Status Again'}
                    </Text>
                </TouchableOpacity>

                {/* Logout */}
                <TouchableOpacity
                    onPress={handleLogout}
                    className="bg-orange-600 py-4 rounded-xl flex-row items-center justify-center"
                    activeOpacity={0.8}
                >
                    <LogOut size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text className="text-white font-bold text-base">Back to Login</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
