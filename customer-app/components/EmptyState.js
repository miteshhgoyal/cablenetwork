import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EmptyState = ({
    icon = 'folder-open-outline',
    title = 'No data found',
    message = 'There is nothing to show here yet',
    actionText,
    onAction,
    iconSize = 64
}) => {
    return (
        <View className="flex-1 items-center justify-center py-20 px-6">
            <Ionicons name={icon} size={iconSize} color="#cbd5e1" />

            <Text className="text-xl font-semibold text-gray-700 mt-4 text-center">
                {title}
            </Text>

            {message && (
                <Text className="text-gray-500 text-center mt-2">
                    {message}
                </Text>
            )}

            {actionText && onAction && (
                <TouchableOpacity
                    onPress={onAction}
                    className="mt-6 bg-orange-500 px-6 py-3 rounded-lg flex-row items-center gap-2"
                >
                    <Ionicons name="add" size={20} color="white" />
                    <Text className="text-white font-semibold">
                        {actionText}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export default EmptyState;
