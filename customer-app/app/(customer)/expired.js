// app/(customer)/expired.js
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AlertCircle, Calendar, Smartphone, User, LogOut } from 'lucide-react-native';
import { useAuth } from '@/context/authContext';

export default function ExpiredScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { logout } = useAuth();

    const {
        status = 'Expired',
        expiryDate,
        subscriberName,
        macAddress,
        deviceModel,
        osVersion
    } = params;

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/signin');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}>
                {/* Icon */}
                <View className="items-center mb-6">
                    <View className="bg-red-100 p-4 rounded-full">
                        <AlertCircle size={64} color="#ef4444" />
                    </View>
                </View>

                {/* Title */}
                <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
                    Subscription {status === 'Inactive' ? 'Inactive' : 'Expired'}
                </Text>

                <Text className="text-base text-gray-600 text-center mb-8 px-4">
                    {status === 'Inactive'
                        ? 'Your subscription is currently inactive. Please contact your admin or reseller to activate.'
                        : 'Your subscription has expired. Please contact your admin or reseller to renew.'}
                </Text>

                {/* Info Card */}
                <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
                    {/* Subscriber Name */}
                    <View className="flex-row items-center mb-4">
                        <View className="bg-blue-100 p-3 rounded-full mr-3">
                            <User size={20} color="#3b82f6" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs text-gray-500 mb-1">Subscriber</Text>
                            <Text className="text-base font-semibold text-gray-800">{subscriberName || 'N/A'}</Text>
                        </View>
                    </View>

                    {/* Expiry Date */}
                    <View className="flex-row items-center mb-4">
                        <View className="bg-red-100 p-3 rounded-full mr-3">
                            <Calendar size={20} color="#ef4444" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs text-gray-500 mb-1">Expiry Date</Text>
                            <Text className="text-base font-semibold text-gray-800">{formatDate(expiryDate)}</Text>
                        </View>
                    </View>

                    {/* MAC Address */}
                    <View className="flex-row items-center">
                        <View className="bg-gray-100 p-3 rounded-full mr-3">
                            <Smartphone size={20} color="#6b7280" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs text-gray-500 mb-1">Device MAC</Text>
                            <Text className="text-sm font-mono text-gray-800">{macAddress || 'N/A'}</Text>
                        </View>
                    </View>

                    {/* Device Info (if available) */}
                    {deviceModel && (
                        <View className="mt-4 pt-4 border-t border-gray-200">
                            <Text className="text-xs text-gray-500 mb-2">Device Info</Text>
                            <Text className="text-sm text-gray-700">{deviceModel}</Text>
                            {osVersion && <Text className="text-xs text-gray-500 mt-1">OS: {osVersion}</Text>}
                        </View>
                    )}
                </View>

                {/* Contact Message */}
                <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                    <Text className="text-sm text-yellow-800 font-medium text-center">
                        Please contact your admin or reseller to renew your subscription
                    </Text>
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    onPress={handleLogout}
                    className="bg-blue-600 py-4 rounded-xl flex-row items-center justify-center"
                >
                    <LogOut size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text className="text-white font-semibold text-base">Back to Login</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
