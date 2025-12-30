import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, Modal, Pressable, Dimensions, Platform, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Constants from 'expo-constants';
import Loading from '../../components/Loading';
import CustomKeyboardView from "../../components/CustomKeyboardView";
import { useAuth } from '@/context/authContext';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

const Signin = () => {
    const { login, checkSubscriptionStatus, isAuthenticated, subscriptionStatus } = useAuth();
    const router = useRouter();

    // States
    const [partnerCode, setPartnerCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [deviceInfo, setDeviceInfo] = useState({});
    const [showCustomMacModal, setShowCustomMacModal] = useState(false);
    const [customMac, setCustomMac] = useState('');
    const [inactiveMessage, setInactiveMessage] = useState('');

    // FIXED: Reliable TV Detection with useRef (no re-renders)
    const isTV = useRef(
        Device.deviceType === Device.DeviceType.TV ||
        Platform.isTV ||
        Device.modelName?.toLowerCase().includes('tv') ||
        Device.deviceName?.toLowerCase().includes('tv') ||
        Device.brand?.toLowerCase().includes('google')
    ).current;

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    // FIXED: Screen Orientation - Delayed for TV
    useEffect(() => {
        const initOrientation = async () => {
            try {
                // TV: Delay to prevent crash, Mobile: Immediate
                if (isTV) {
                    setTimeout(async () => {
                        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                    }, 800);
                } else {
                    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                }
            } catch (error) {
                console.log('Orientation lock failed:', error);
            }
        };
        initOrientation();
    }, []);

    // Network Check
    useEffect(() => {
        const check = async () => {
            try {
                const r1 = await fetch('https://google.com');
                console.log('FETCH google ok', r1.status);
            } catch (e) {
                console.log('FETCH google error', e?.message || e);
            }
            try {
                const r2 = await fetch('https://api.onlineiptvhub.com/api/health');
                const text = await r2.text();
                console.log('FETCH health', r2.status, text);
            } catch (e) {
                console.log('FETCH health error', e?.message || e);
            }
        };
        check();
    }, []);

    // Auto Redirect
    useEffect(() => {
        if (!isAuthenticated || subscriptionStatus !== 'ACTIVE') return;
        console.log("Redirect → user authenticated & ACTIVE");
        router.replace('/(tabs)');
    }, [isAuthenticated, subscriptionStatus]);

    // Device Info
    useEffect(() => {
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
        const finalCode = partnerCode.trim() || "2001";

        if (useCustomMac && !customMac.trim()) {
            setError('Please enter custom MAC address');
            return;
        }

        setIsLoading(true);
        try {
            let mac = deviceInfo.macAddress;
            if (!mac) {
                mac = "cph2667_15.0.0.1300(ex01)";
            }

            const finalDeviceInfo = {
                ...deviceInfo,
                macAddress: useCustomMac ? customMac.trim() : mac,
                customMac: useCustomMac ? customMac.trim() : null,
            };

            console.log(finalDeviceInfo, "→", finalCode);
            const result = await login(finalCode.trim(), finalDeviceInfo);
            console.log(result);

            if (result.success) {
                setDeviceInfo(prev => ({ ...prev, macAddress: mac }));
                setShowCustomMacModal(false);
                setCustomMac('');
                router.replace('/(tabs)');
            } else {
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

    const clearPartnerCode = () => setPartnerCode('');
    const clearCustomMac = () => setCustomMac('');

    // ========================================
    // TV LAYOUT - SIMPLIFIED & FIXED (No TVEventHandler)
    // ========================================
    if (isTV) {
        return (
            <View className="flex-1 bg-gradient-to-r from-black via-gray-900 to-black min-h-screen">
                <StatusBar barStyle="light-content" hidden />

                {/* FIXED: Hero Section with min-height */}
                <View className="flex-1 min-h-[60vh] px-12 py-16 justify-center items-center">
                    <View className="w-40 h-40 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl items-center justify-center mb-16 shadow-2xl border-4 border-white/20">
                        <Ionicons name="tv-outline" size={80} color="white" />
                    </View>
                    <Text className="text-6xl font-black text-white text-center mb-12 tracking-wide drop-shadow-lg">
                        Online IPTV Hub
                    </Text>
                    <Text className="text-2xl text-gray-200 text-center mb-8 max-w-2xl leading-relaxed">
                        Enter your partner code to unlock 1000+ live channels in HD
                    </Text>
                    <View className="w-32 h-1 bg-gradient-to-r from-orange-500 to-orange-300 rounded-full" />
                </View>

                {/* FIXED: Login Panel with proper height */}
                <View className="min-h-[35vh] max-h-[40vh] bg-gray-900/95 border-t-8 border-orange-500/50 rounded-t-3xl p-12 mx-8 shadow-2xl">
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-16 pb-8 border-b-2 border-gray-800">
                        <View className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl items-center justify-center border-4 border-orange-500/30">
                            <Ionicons name="key-outline" size={40} color="#f97316" />
                        </View>
                        <View className="flex-col items-end">
                            <Text className="text-3xl font-black text-white">Quick Access</Text>
                            <Text className="text-orange-400 text-lg font-semibold">1 Step Login</Text>
                        </View>
                    </View>

                    {/* Partner Code Input - Native TV Focus */}
                    <View className="mb-16">
                        <Text className="text-2xl font-bold text-gray-200 mb-8">Partner Code</Text>
                        <View className="flex-row items-center bg-black/60 border-4 border-orange-500/40 rounded-3xl px-8 py-8 shadow-xl">
                            <Ionicons name="key-outline" size={36} color="#f97316" />
                            <TextInput
                                value={partnerCode}
                                onChangeText={setPartnerCode}
                                placeholder="2001 (default)"
                                placeholderTextColor="#9ca3af"
                                autoCapitalize="characters"
                                autoCorrect={false}
                                maxLength={20}
                                className="flex-1 ml-8 text-3xl text-white font-mono tracking-widest"
                                style={{ paddingVertical: 0 }}
                                onSubmitEditing={() => handleSubmit(false)}
                                hasTVPreferredFocus={true}
                            />
                            {partnerCode.length > 0 && (
                                <TouchableOpacity onPress={clearPartnerCode} className="p-3">
                                    <Ionicons name="close-circle" size={32} color="#6b7280" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Device Info */}
                    <View className="flex-row items-center justify-between mb-16 bg-black/40 p-8 rounded-3xl border-2 border-gray-700 shadow-xl">
                        <View className="flex-col">
                            <Text className="text-gray-400 text-xl mb-2">Device MAC</Text>
                            <Text className="text-white text-2xl font-mono font-bold bg-gray-800 px-6 py-3 rounded-2xl" numberOfLines={1}>
                                {deviceInfo.macAddress || 'Loading...'}
                            </Text>
                        </View>
                        <View className="items-center space-y-2">
                            <Ionicons name="tv-outline" size={48} color="#f97316" />
                            <Text className="text-gray-300 text-lg font-semibold">{deviceInfo.deviceName || 'Smart TV'}</Text>
                        </View>
                    </View>

                    {/* Action Buttons - Native TV Focus */}
                    <View className="flex-row space-x-6">
                        {/* Main Login Button */}
                        <TouchableOpacity
                            onPress={() => handleSubmit(false)}
                            disabled={isLoading}
                            className={`flex-1 py-8 rounded-3xl shadow-2xl ${isLoading ? 'bg-gray-700' : 'bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700'}`}
                            hasTVPreferredFocus={true}
                        >
                            {isLoading ? (
                                <View className="flex-row items-center justify-center">
                                    <ActivityIndicator size={28} color="white" />
                                    <Text className="text-white font-black text-2xl ml-4">Verifying</Text>
                                </View>
                            ) : (
                                <View className="flex-row items-center justify-center">
                                    <Ionicons name="rocket-outline" size={36} color="white" />
                                    <Text className="text-white font-black text-2xl ml-4">START TV</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Custom MAC Button */}
                        <TouchableOpacity
                            onPress={() => setShowCustomMacModal(true)}
                            className="w-28 h-28 rounded-3xl items-center justify-center shadow-2xl bg-orange-500/30 border-4 border-orange-500/50"
                            hasTVPreferredFocus={true}
                        >
                            <Ionicons name="swap-horizontal-outline" size={36} color="#f97316" />
                            <Text className="text-white font-bold text-lg mt-2">MAC</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Error Display */}
                    {error ? (
                        <View className="mt-12 p-8 bg-red-900/50 rounded-3xl border-4 border-red-500/60 shadow-xl">
                            <View className="flex-row items-center mb-4">
                                <Ionicons name="alert-triangle" size={32} color="#ef4444" />
                                <Text className="text-red-200 text-2xl font-bold ml-4">Login Failed</Text>
                            </View>
                            <Text className="text-red-100 text-xl leading-relaxed text-center">{error}</Text>
                        </View>
                    ) : null}
                </View>

                {/* TV Footer */}
                <View className="px-12 py-8 bg-black/60 border-t-2 border-gray-800 min-h-[8vh]">
                    <Text className="text-center text-gray-400 text-xl font-semibold">
                        Online IPTV Hub v{deviceInfo.appVersion || '1.0.0'}
                    </Text>
                    <Text className="text-center text-gray-600 text-lg mt-2">
                        Contact reseller for activation
                    </Text>
                </View>

                {/* FIXED: TV Modal with orientation support */}
                <Modal
                    animationType="slide"
                    transparent
                    visible={showCustomMacModal}
                    onRequestClose={closeModal}
                    supportedOrientations={['landscape-left', 'landscape-right']}
                >
                    <Pressable className="flex-1 bg-black/95 justify-center items-center p-8">
                        <Pressable className="bg-gray-900 w-full max-w-4xl rounded-3xl p-12 border-8 border-orange-500/40 shadow-2xl max-h-[90vh]">
                            {/* Modal content exactly the same as original */}
                            <TouchableOpacity className="absolute top-8 right-8 p-4 rounded-full bg-gray-800" onPress={closeModal}>
                                <Ionicons name="close-circle" size={40} color="#6b7280" />
                            </TouchableOpacity>

                            <View className="items-center mb-12">
                                <View className="w-28 h-28 bg-gradient-to-br from-orange-500/30 to-orange-600/30 rounded-3xl items-center justify-center mb-8 border-4 border-orange-500/50">
                                    <Ionicons name="swap-horizontal" size={48} color="#f97316" />
                                </View>
                                <Text className="text-4xl font-black text-white mb-4 text-center">Custom MAC Login</Text>
                                <Text className="text-gray-300 text-2xl text-center max-w-2xl leading-relaxed mb-8">
                                    Your device needs activation. Use another device's active MAC address.
                                </Text>
                            </View>

                            {inactiveMessage ? (
                                <View className="mb-12 p-8 bg-yellow-900/50 rounded-3xl border-4 border-yellow-500/60 shadow-xl">
                                    <View className="flex-row items-center mb-4">
                                        <Ionicons name="information-circle" size={32} color="#f59e0b" />
                                        <Text className="text-yellow-100 text-2xl font-bold ml-4">Device Status</Text>
                                    </View>
                                    <Text className="text-yellow-50 text-xl leading-relaxed">{inactiveMessage}</Text>
                                </View>
                            ) : null}

                            <View className="mb-12 p-8 bg-gray-800/60 rounded-3xl border-4 border-gray-600 shadow-xl">
                                <Text className="text-gray-300 text-2xl font-bold mb-6 text-center">Your Device MAC</Text>
                                <View className="bg-black/50 p-6 rounded-2xl border-2 border-gray-500">
                                    <Text className="text-white text-3xl font-mono font-black text-center tracking-wider">
                                        {deviceInfo.macAddress || 'Loading...'}
                                    </Text>
                                </View>
                            </View>

                            <View className="mb-16">
                                <Text className="text-3xl font-bold text-gray-200 mb-8 text-center">Enter Active MAC</Text>
                                <View className="flex-row items-center bg-black/70 border-6 border-orange-500/50 rounded-3xl px-10 py-10 shadow-2xl">
                                    <Ionicons name="hardware-chip-outline" size={40} color="#f97316" />
                                    <TextInput
                                        value={customMac}
                                        onChangeText={setCustomMac}
                                        placeholder="Enter active MAC address"
                                        placeholderTextColor="#9ca3af"
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        className="flex-1 ml-10 text-3xl text-white font-mono tracking-widest"
                                        style={{ paddingVertical: 0 }}
                                        hasTVPreferredFocus={true}
                                    />
                                    {customMac.length > 0 && (
                                        <TouchableOpacity onPress={clearCustomMac} className="p-4">
                                            <Ionicons name="close-circle" size={36} color="#6b7280" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Text className="text-gray-400 text-xl mt-4 text-center font-semibold">
                                    Enter MAC from an already active device
                                </Text>
                            </View>

                            <View className="flex-row space-x-6">
                                <TouchableOpacity
                                    onPress={handleCustomMacLogin}
                                    disabled={isLoading || !customMac.trim()}
                                    className={`flex-1 py-10 rounded-3xl shadow-2xl ${(!customMac.trim() || isLoading)
                                        ? 'bg-gray-700 border-2 border-gray-600'
                                        : 'bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700'}`}
                                    hasTVPreferredFocus={true}
                                >
                                    <View className="flex-row items-center justify-center">
                                        <Ionicons name="checkmark-circle" size={40} color="white" />
                                        <Text className="text-white font-black text-3xl ml-6">LOGIN</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={closeModal}
                                    className="flex-1 py-10 rounded-3xl bg-gray-800/70 border-4 border-gray-600 items-center justify-center shadow-xl"
                                >
                                    <View className="flex-row items-center">
                                        <Ionicons name="close-circle" size={36} color="#9ca3af" />
                                        <Text className="text-gray-300 font-bold text-2xl ml-4">CANCEL</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
            </View>
        );
    }

    // ========================================
    // MOBILE PORTRAIT LAYOUT (UNCHANGED)
    // ========================================
    return (
        <View className="flex-1 bg-black">
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
                            <Text className="text-3xl font-bold text-white">Online IPTV Hub</Text>
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
                                    <TouchableOpacity onPress={clearPartnerCode}>
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

                        {/* Custom MAC Info Card */}
                        <TouchableOpacity onPress={() => setShowCustomMacModal(true)} disabled={isLoading} style={{ elevation: 5 }}>
                            <View className="mt-10">
                                <View className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                                    <View className="flex-row items-center">
                                        <View className="w-10 h-10 bg-orange-500/20 rounded-full items-center justify-center">
                                            <Ionicons name="swap-horizontal-outline" size={20} color="#f97316" />
                                        </View>
                                        <View className="ml-3 flex-1">
                                            <Text className="text-white font-semibold text-sm">Custom MAC Support</Text>
                                            <Text className="text-gray-400 text-xs mt-0.5">Login with another device's active MAC</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>

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

            {/* Mobile Custom MAC Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showCustomMacModal}
                onRequestClose={closeModal}
            >
                <Pressable
                    className="flex-1 bg-black/80 justify-end"
                    onPress={closeModal}
                >
                    <Pressable
                        className="bg-gray-900 rounded-t-3xl p-6 border-t-2 border-orange-500"
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="items-center mb-6">
                            <View className="w-16 h-16 bg-orange-500/20 rounded-full items-center justify-center mb-4">
                                <Ionicons name="swap-horizontal" size={32} color="#f97316" />
                            </View>
                            <Text className="text-xl font-bold text-white">Use Custom MAC</Text>
                            <Text className="text-gray-400 text-sm mt-2 text-center">
                                Your device is not active. Login with another device's active MAC address.
                            </Text>
                        </View>

                        {inactiveMessage ? (
                            <View className="mb-6 p-4 bg-yellow-900/30 rounded-xl border border-yellow-600">
                                <Text className="text-yellow-300 text-xs leading-5">{inactiveMessage}</Text>
                            </View>
                        ) : null}

                        <View className="mb-6 p-4 bg-gray-800 rounded-xl">
                            <Text className="text-gray-400 text-xs mb-2">Your Device MAC:</Text>
                            <Text className="text-white text-sm font-mono font-bold">{deviceInfo.macAddress}</Text>
                        </View>

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
                                    <TouchableOpacity onPress={clearCustomMac}>
                                        <Ionicons name="close-circle" size={20} color="#6b7280" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Text className="text-gray-500 text-xs mt-2">
                                Enter the MAC address of an already active device
                            </Text>
                        </View>

                        <View>
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
        </View>
    );
};

export default Signin;
