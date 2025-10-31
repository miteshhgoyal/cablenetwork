import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/authContext';

const HomeHeader = ({ title, subtitle, onNotificationPress }) => {
    const { user } = useAuth();

    return (
        <SafeAreaView edges={['top']} className="bg-white border-b border-gray-200">
            <View className="px-6 py-4">
                <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                        <Text className="text-sm text-gray-600">
                            Welcome back,
                        </Text>
                        <Text className="text-xl font-bold text-gray-900">
                            {user?.firstName || 'User'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={onNotificationPress}
                        className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
                    >
                        <Ionicons name="notifications-outline" size={24} color="#374151" />
                        {/* Notification Badge */}
                        <View className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    </TouchableOpacity>
                </View>

                {subtitle && (
                    <Text className="text-sm text-gray-500 mt-1">
                        {subtitle}
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
};

export default HomeHeader;
