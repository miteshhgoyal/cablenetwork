import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, Modal, Pressable } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Constants from 'expo-constants';
import Loading from '../../components/Loading';
import CustomKeyboardView from "../../components/CustomKeyboardView";
import { useAuth } from '@/context/authContext';

const signin = () => {
    const { login } = useAuth();
    const [partnerCode, setPartnerCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [deviceInfo, setDeviceInfo] = useState({});

    // ✅ Custom MAC Modal States
    const [showCustomMacModal, setShowCustomMacModal] = useState(false);
    const [customMac, setCustomMac] = useState('');
    const [inactiveMessage, setInactiveMessage] = useState('');

    React.useEffect(() => {
        const getDeviceInfo = async () => {
            const info = {
                macAddress: Device.modelId || Device.osBuildId || 'UNKNOWN_DEVICE',
                deviceName: Device.deviceName || 'Unknown Device',
                modelName: Device.modelName || 'Unknown Model',
                brand: Device.brand || 'Unknown',
                osName: Device.osName || 'Unknown OS',
                osVersion: Device.osVersion || 'Unknown',
                appVersion: Application.nativeApplicationVersion || '1.0.0',
                buildVersion: Application.nativeBuildVersion || '1',
            };
            setDeviceInfo(info);
        };
        getDeviceInfo();
    }, []);

    const handleSubmit = async (useCustomMac = false) => {
        setError('');


    if (!partnerCode.trim() && !useCustomMac) {
        setError('Partner code is required');
        return;
    }

    if (useCustomMac && !customMac.trim()) {
        setError('Please enter custom MAC address');
        return;
    }


        setIsLoading(true);
        try {
            const result = await login(
                partnerCode.trim(),
                {
                    ...deviceInfo,
                    customMac: useCustomMac ? customMac.trim() : null
                }
            );

            if (result.success) {
                // Success - authContext will navigate
                setShowCustomMacModal(false);
                setCustomMac('');
            } else {
                // ✅ Check if can use custom MAC
                if (result.data?.canUseCustomMac && (result.code === 'MAC_INACTIVE' || result.code === 'SUBSCRIPTION_EXPIRED')) {
                    setInactiveMessage(result.message);
                    setShowCustomMacModal(true);
                } else if (result.code === 'CUSTOM_MAC_NOT_ACTIVE' || result.code === 'CUSTOM_MAC_EXPIRED') {
                    setError(result.message);
                    setShowCustomMacModal(false);
                } else {
                    setError(result.message || 'Login failed');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCustomMacLogin = () => {
        handleSubmit(true);
    };

    const closeModal = () => {
        setShowCustomMacModal(false);
        setCustomMac('');
        setInactiveMessage('');
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
                                <Text className="text-white text-sm font-semibold ml-2">This Device</Text>
                            </View>

                            <View className="flex-row items-center justify-between py-2 border-b border-gray-800">
                                <Text className="text-gray-400 text-xs">MAC Address:</Text>
                                <Text className="text-white text-xs font-mono font-semibold">
                                    {deviceInfo.macAddress || 'Loading...'}
                                </Text>
                            </View>

                            <View className="flex-row items-center justify-between py-2 border-b border-gray-800">
                                <Text className="text-gray-400 text-xs">Device Name:</Text>
                                <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                                    {deviceInfo.deviceName || 'Loading...'}
                                </Text>
                            </View>

                            <View className="flex-row items-center justify-between py-2">
                                <Text className="text-gray-400 text-xs">OS:</Text>
                                <Text className="text-white text-xs font-semibold">
                                    {deviceInfo.osName} {deviceInfo.osVersion}
                                </Text>
                            </View>
                        </View>

                        {/* Partner Code Input */}
                        <View className="mb-6">
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
                                    onSubmitEditing={() => handleSubmit(false)}
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
                            onPress={() => handleSubmit(false)}
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

                        {/* Info Cards */}
                        <View className="mt-10">
                            <TouchableOpacity onPress={() => setShowCustomMacModal(true)} className="bg-gray-900 p-4 rounded-xl border border-gray-800">

                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 bg-orange-500/20 rounded-full items-center justify-center">
                                        <Ionicons name="swap-horizontal-outline" size={20} color="#f97316" />
                                    </View>
                                    <View className="ml-3 flex-1">
                                        <Text className="text-white font-semibold text-sm">Custom MAC Support</Text>
                                        <Text className="text-gray-400 text-xs mt-0.5">Login with another device's active MAC</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <View className="mt-10 items-center">
                            <Text className="text-center text-gray-400 text-xs">
                                Contact admin/reseller for activation or device management
                            </Text>
                            <Text className="text-center text-gray-600 text-xs mt-3">
                                Version {deviceInfo.appVersion || '1.0.0'}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </CustomKeyboardView>

            {/* ✅ CUSTOM MAC MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showCustomMacModal}
                onRequestClose={closeModal}
            >
                <Pressable
                    className="flex-1 bg-black/80 justify-end"
                    onPress={closeModal}
                    pointerEvents="box-none"
                >
                    <Pressable
                        className="bg-gray-900 rounded-t-3xl p-6 border-t-2 border-orange-500"
                        onPress={(e) => e.stopPropagation()}
                        pointerEvents="auto"
                    >
                        {/* Header */}
                        <View className="items-center mb-6">
                            <View className="w-16 h-16 bg-orange-500/20 rounded-full items-center justify-center mb-4">
                                <Ionicons name="swap-horizontal" size={32} color="#f97316" />
                            </View>
                            <Text className="text-xl font-bold text-white">Use Custom MAC</Text>
                            <Text className="text-gray-400 text-sm mt-2 text-center">
                                Your device is not active. Login with another device's active MAC address.
                            </Text>
                        </View>

                        {/* Inactive Message */}
                        {inactiveMessage ? (
                            <View className="mb-6 p-4 bg-yellow-900/30 rounded-xl border border-yellow-600">
                                <Text className="text-yellow-300 text-xs leading-5">{inactiveMessage}</Text>
                            </View>
                        ) : null}

                        {/* Current Device Info */}
                        <View className="mb-6 p-4 bg-gray-800 rounded-xl">
                            <Text className="text-gray-400 text-xs mb-2">Your Device MAC:</Text>
                            <Text className="text-white text-sm font-mono font-bold">{deviceInfo.macAddress}</Text>
                        </View>

                        {/* Custom MAC Input */}
                        <View className="mb-6">
                            <Text className="text-sm font-semibold text-gray-300 mb-3">Custom MAC Address</Text>
                            <View className="flex-row items-center bg-gray-800 border-2 border-orange-500/50 rounded-xl px-4 py-4">
                                <Ionicons name="hardware-chip-outline" size={22} color="#f97316" />
                                <TextInput
                                    value={customMac}
                                    onChangeText={setCustomMac}
                                    placeholder="Enter active MAC address"
                                    placeholderTextColor="#6b7280"
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    className="flex-1 ml-3 text-white text-base font-mono"
                                />
                                {customMac.length > 0 && (
                                    <TouchableOpacity onPress={() => setCustomMac('')}>
                                        <Ionicons name="close-circle" size={20} color="#6b7280" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Text className="text-gray-500 text-xs mt-2">
                                Enter the MAC address of an already active device
                            </Text>
                        </View>

                        {/* Buttons */}
                        <View pointerEvents="auto">
                            <TouchableOpacity
                                onPress={handleCustomMacLogin}
                                disabled={isLoading || !customMac.trim()}
                                className={`py-4 mb-3 rounded-xl ${(!customMac.trim() || isLoading) ? 'bg-gray-700' : 'bg-orange-500'}`}
                            >
                                <View className="flex-row items-center justify-center">
                                    <Ionicons name="checkmark-circle" size={22} color="white" />
                                    <Text className="text-white font-bold text-base ml-2">Login with Custom MAC</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={closeModal}
                                className="py-4 rounded-xl bg-gray-800 border border-gray-700"
                            >
                                <View className="flex-row items-center justify-center">
                                    <Ionicons name="close" size={22} color="#9ca3af" />
                                    <Text className="text-gray-400 font-semibold text-base ml-2">Cancel</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

export default signin;
