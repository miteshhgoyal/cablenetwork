// app/(auth)/signin.js
import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, Alert } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Loading from '../../components/Loading';
import CustomKeyboardView from "../../components/CustomKeyboardView";
import { useAuth } from '@/context/authContext';

const signin = () => {
    const { login } = useAuth();
    const [partnerCode, setPartnerCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setError('');

        if (!partnerCode.trim()) {
            setError('Partner code is required');
            return;
        }

        setIsLoading(true);
        try {
            const result = await login(partnerCode.trim());

            if (!result.success) {
                setError(result.message || 'Invalid partner code');
            }
        } catch (error) {
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <CustomKeyboardView>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <ScrollView
                className="flex-1 bg-white"
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-1 justify-center px-6 py-8">
                    {/* Header */}
                    <View className="items-center mb-10">
                        <View className="w-20 h-20 bg-orange-500 rounded-3xl items-center justify-center mb-4">
                            <Ionicons name="tv" size={40} color="white" />
                        </View>
                        <Text className="text-3xl font-bold text-gray-800">Digital Cable Network</Text>
                        <Text className="text-gray-500 mt-2 text-center">Enter your partner code to access channels</Text>
                    </View>

                    {/* Error Message */}
                    {error ? (
                        <View className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                            <Text className="text-red-600 text-sm">{error}</Text>
                        </View>
                    ) : null}

                    {/* Partner Code Input */}
                    <View className="mb-6">
                        <Text className="text-sm font-medium text-gray-700 mb-2">Partner Code</Text>
                        <View className="flex-row items-center border-2 border-gray-300 rounded-xl px-4 py-3">
                            <Ionicons name="key-outline" size={20} color="#9ca3af" />
                            <TextInput
                                value={partnerCode}
                                onChangeText={setPartnerCode}
                                placeholder="Enter partner code"
                                placeholderTextColor="#9ca3af"
                                autoCapitalize="characters"
                                autoCorrect={false}
                                maxLength={20}
                                className="flex-1 ml-3 text-gray-900 text-base"
                            />
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isLoading}
                        className={`py-4 rounded-xl ${isLoading ? 'bg-gray-400' : 'bg-orange-500'}`}
                    >
                        {isLoading ? (
                            <View className="flex-row items-center justify-center">
                                <Loading size={20} color="white" />
                                <Text className="text-white font-semibold ml-2">Verifying...</Text>
                            </View>
                        ) : (
                            <Text className="text-white font-bold text-center text-base">Access Channels</Text>
                        )}
                    </TouchableOpacity>

                    {/* Info Text */}
                    <Text className="text-center text-gray-400 text-xs mt-8">
                        Contact your cable operator to get a partner code
                    </Text>
                </View>
            </ScrollView>
        </CustomKeyboardView>
    );
};

export default signin;
