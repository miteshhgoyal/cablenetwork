import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ErrorState = ({
    title = 'Something went wrong',
    message = 'Please try again',
    onRetry,
    retryText = 'Try Again'
}) => {
    return (
        <View className="flex-1 items-center justify-center py-20 px-6">
            <Ionicons name="alert-circle" size={64} color="#ef4444" />

            <Text className="text-xl font-semibold text-gray-700 mt-4 text-center">
                {title}
            </Text>

            {message && (
                <Text className="text-gray-500 text-center mt-2">
                    {message}
                </Text>
            )}

            {onRetry && (
                <TouchableOpacity
                    onPress={onRetry}
                    className="mt-6 bg-orange-500 px-6 py-3 rounded-lg"
                >
                    <Text className="text-white font-semibold">
                        {retryText}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export default ErrorState;
