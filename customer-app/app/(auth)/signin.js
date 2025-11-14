// app/(auth)/signin.js
import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, Alert } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import Loading from '../../components/Loading';
import CustomKeyboardView from "../../components/CustomKeyboardView";
import { useAuth } from '@/context/authContext';

const signin = () => {
    const { login } = useAuth();
    const [partnerCode, setPartnerCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [deviceInfo, setDeviceInfo] = useState({});

    // Get comprehensive device info on mount
    React.useEffect(() => {
        const getDeviceInfo = async () => {
            const info = {
                // Device Identification
                macAddress: Device.modelId || Device.osBuildId || 'UNKNOWN_DEVICE',
                deviceName: Device.deviceName || 'Unknown Device',
                modelName: Device.modelName || 'Unknown Model',
                brand: Device.brand || 'Unknown',
                manufacturer: Device.manufacturer || 'Unknown',

                // OS Information
                osName: Device.osName || 'Unknown OS',
                osVersion: Device.osVersion || 'Unknown',
                platformApiLevel: Device.platformApiLevel || 'N/A',

                // Device Type
                deviceType: Device.deviceType ? getDeviceTypeName(Device.deviceType) : 'Unknown',

                // App Information
                appVersion: Application.nativeApplicationVersion || '1.0.0',
                buildVersion: Application.nativeBuildVersion || '1',
                bundleId: Application.applicationId || 'unknown',

                // Additional Info
                isDevice: Device.isDevice,
                totalMemory: Device.totalMemory || 'Unknown',
                supportedCpuArchitectures: Device.supportedCpuArchitectures?.join(', ') || 'Unknown',

                // System Info
                expoVersion: Constants.expoVersion || 'Unknown',
                installationId: Constants.installationId || 'Unknown',
            };

            setDeviceInfo(info);
        };
        getDeviceInfo();
    }, []);

    const getDeviceTypeName = (type) => {
        const types = {
            [Device.DeviceType.PHONE]: 'Phone',
            [Device.DeviceType.TABLET]: 'Tablet',
            [Device.DeviceType.DESKTOP]: 'Desktop',
            [Device.DeviceType.TV]: 'TV',
            [Device.DeviceType.UNKNOWN]: 'Unknown'
        };
        return types[type] || 'Unknown';
    };

    const handleSubmit = async () => {
        setError('');

        if (!partnerCode.trim()) {
            setError('Partner code is required');
            return;
        }

        setIsLoading(true);
        try {
            const result = await login(partnerCode.trim(), deviceInfo);

            

            if (result.success) {
                // ✅ SUCCESS - authContext will navigate automatically
                
                // Don't navigate here - let _layout.js handle it
            } else {
                // ✅ Handle error codes
                if (result.code === 'MAC_INACTIVE' || result.code === 'SUBSCRIPTION_EXPIRED') {
                    setError(`${result.message}\n\n🔹 Device MAC: ${deviceInfo.macAddress}\n🔹 Device: ${deviceInfo.deviceName}`);
                } else {
                    setError(result.message || 'Invalid partner code');
                }
            }
        } catch (error) {
            console.error('Login catch error:', error);
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

                        {/* Error Message */}
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

                        {/* Device Information Card */}
                        <View className="mb-6 p-4 bg-gray-900 rounded-xl border border-gray-700">
                            <View className="flex-row items-center mb-3">
                                <Ionicons name="phone-portrait-outline" size={18} color="#f97316" />
                                <Text className="text-white text-sm font-semibold ml-2">Device Information</Text>
                            </View>

                            {/* MAC Address */}
                            <View className="flex-row items-center justify-between py-2 border-b border-gray-800">
                                <Text className="text-gray-400 text-xs">MAC Address:</Text>
                                <Text className="text-white text-xs font-mono font-semibold">
                                    {deviceInfo.macAddress || 'Loading...'}
                                </Text>
                            </View>

                            {/* Device Name */}
                            <View className="flex-row items-center justify-between py-2 border-b border-gray-800">
                                <Text className="text-gray-400 text-xs">Device Name:</Text>
                                <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                                    {deviceInfo.deviceName || 'Loading...'}
                                </Text>
                            </View>

                            {/* Model */}
                            <View className="flex-row items-center justify-between py-2 border-b border-gray-800">
                                <Text className="text-gray-400 text-xs">Model:</Text>
                                <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                                    {deviceInfo.modelName || 'Loading...'}
                                </Text>
                            </View>

                            {/* OS */}
                            <View className="flex-row items-center justify-between py-2">
                                <Text className="text-gray-400 text-xs">OS:</Text>
                                <Text className="text-white text-xs font-semibold">
                                    {deviceInfo.osName} {deviceInfo.osVersion}
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

                        {/* Feature Info Cards */}
                        <View className="mt-10 space-y-3">
                            <View className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 bg-orange-500/20 rounded-full items-center justify-center">
                                        <Ionicons name="tv-outline" size={20} color="#f97316" />
                                    </View>
                                    <View className="ml-3 flex-1">
                                        <Text className="text-white font-semibold text-sm">Live TV Channels</Text>
                                        <Text className="text-gray-400 text-xs mt-0.5">Watch 500+ channels</Text>
                                    </View>
                                </View>
                            </View>

                            <View className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 bg-orange-500/20 rounded-full items-center justify-center">
                                        <Ionicons name="film-outline" size={20} color="#f97316" />
                                    </View>
                                    <View className="ml-3 flex-1">
                                        <Text className="text-white font-semibold text-sm">Movies & Series</Text>
                                        <Text className="text-gray-400 text-xs mt-0.5">Unlimited streaming</Text>
                                    </View>
                                </View>
                            </View>

                            <View className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 bg-orange-500/20 rounded-full items-center justify-center">
                                        <Ionicons name="shield-checkmark-outline" size={20} color="#f97316" />
                                    </View>
                                    <View className="ml-3 flex-1">
                                        <Text className="text-white font-semibold text-sm">Secure Access</Text>
                                        <Text className="text-gray-400 text-xs mt-0.5">Device verified login</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Footer */}
                        <View className="mt-10 items-center">
                            <View className="flex-row items-center mb-2">
                                <Ionicons name="help-circle-outline" size={16} color="#6b7280" />
                                <Text className="text-gray-500 text-xs ml-1.5">Need Help?</Text>
                            </View>
                            <Text className="text-center text-gray-400 text-xs">
                                Share your device information with admin/reseller for activation
                            </Text>
                        </View>

                        <Text className="text-center text-gray-600 text-xs mt-6">
                            Version {deviceInfo.appVersion || '1.0.0'} • Build {deviceInfo.buildVersion || '1'}
                        </Text>
                    </View>
                </ScrollView>
            </CustomKeyboardView>
        </SafeAreaView>
    );
};

export default signin;
