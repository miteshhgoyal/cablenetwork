// app/(auth)/signin.js
import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, Alert } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import Loading from '../../components/Loading';
import CustomKeyboardView from "../../components/CustomKeyboardView";
import { useAuth } from '@/context/authContext';

const signin = () => {
    const { login } = useAuth();
    const [partnerCode, setPartnerCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [macAddress, setMacAddress] = useState('');

    // Get MAC address on mount
    React.useEffect(() => {
        const getMac = async () => {
            const mac = Device.modelId || Device.osBuildId || 'UNKNOWN_DEVICE';
            setMacAddress(mac);
        };
        getMac();
    }, []);

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
                // Show MAC address in error if account is inactive
                if (result.code === 'MAC_INACTIVE' || result.code === 'SUBSCRIPTION_EXPIRED') {
                    setError(`${result.message}\n\nYour Device MAC: ${macAddress}`);
                } else {
                    setError(result.message || 'Invalid partner code');
                }
            }
        } catch (error) {
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <CustomKeyboardView>
                <ScrollView
                    className="flex-1 bg-black"
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="flex-1 justify-center px-6 py-8">
                        {/* Header */}
                        <View className="items-center mb-10">
                            <View className="w-24 h-24 bg-orange-500 rounded-3xl items-center justify-center mb-6 shadow-lg">
                                <Ionicons name="tv" size={48} color="white" />
                            </View>
                            <Text className="text-3xl font-bold text-white">Digital Cable Network</Text>
                            <Text className="text-gray-400 mt-3 text-center text-base">
                                Enter your partner code to access channels
                            </Text>
                        </View>

                        {/* Error Message with MAC Address */}
                        {error ? (
                            <View className="mb-6 p-4 bg-red-900/30 rounded-xl border border-red-600">
                                <View className="flex-row items-start">
                                    <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginTop: 2 }} />
                                    <Text className="text-red-400 text-sm ml-2 flex-1" style={{ lineHeight: 20 }}>
                                        {error}
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        {/* Show MAC Address Always */}
                        <View className="mb-6 p-4 bg-gray-900 rounded-xl border border-gray-700">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <Ionicons name="hardware-chip" size={18} color="#f97316" />
                                    <Text className="text-gray-400 text-xs ml-2">Device MAC:</Text>
                                </View>
                                <Text className="text-white text-xs font-mono font-semibold">
                                    {macAddress || 'Loading...'}
                                </Text>
                            </View>
                        </View>

                        {/* Partner Code Input */}
                        <View className="mb-8">
                            <Text className="text-sm font-semibold text-gray-300 mb-3">Partner Code</Text>
                            <View className="flex-row items-center bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-4">
                                <Ionicons name="key-outline" size={22} color="#f97316" />
                                <TextInput
                                    value={partnerCode}
                                    onChangeText={setPartnerCode}
                                    placeholder="Enter partner code"
                                    placeholderTextColor="#6b7280"
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    maxLength={20}
                                    className="flex-1 ml-3 text-white text-base"
                                    onSubmitEditing={handleSubmit}
                                    returnKeyType="done"
                                />
                                {partnerCode.length > 0 && (
                                    <TouchableOpacity onPress={() => setPartnerCode('')}>
                                        <Ionicons name="close-circle" size={20} color="#6b7280" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={isLoading}
                            className={`py-4 rounded-xl ${isLoading ? 'bg-gray-700' : 'bg-orange-500'} shadow-lg`}
                            style={{ elevation: 5 }}
                        >
                            {isLoading ? (
                                <View className="flex-row items-center justify-center">
                                    <Loading size={20} color="white" />
                                    <Text className="text-white font-semibold text-base ml-2">Verifying...</Text>
                                </View>
                            ) : (
                                <View className="flex-row items-center justify-center">
                                    <Ionicons name="log-in-outline" size={22} color="white" />
                                    <Text className="text-white font-bold text-base ml-2">Access Channels</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Feature Info Cards - Same as before */}
                        <View className="mt-10 space-y-3">
                            {/* Your existing feature cards */}
                        </View>

                        {/* Footer */}
                        <View className="mt-10 items-center">
                            <View className="flex-row items-center mb-2">
                                <Ionicons name="help-circle-outline" size={16} color="#6b7280" />
                                <Text className="text-gray-500 text-xs ml-1.5">Need Help?</Text>
                            </View>
                            <Text className="text-center text-gray-400 text-xs">
                                Share your MAC address with admin/reseller for activation
                            </Text>
                        </View>

                        <Text className="text-center text-gray-600 text-xs mt-6">Version 1.0.0</Text>
                    </View>
                </ScrollView>
            </CustomKeyboardView>
        </SafeAreaView>
    );
};

export default signin;
