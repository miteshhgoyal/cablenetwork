// app/(auth)/signin.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useAuth } from '@/context/authContext';
import { Lock, Smartphone, AlertCircle } from 'lucide-react-native';

export default function SignInScreen() {
    const { login } = useAuth();
    const [partnerCode, setPartnerCode] = useState('');
    const [customMac, setCustomMac] = useState('');
    const [showCustomMac, setShowCustomMac] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setError('');

        if (!partnerCode.trim()) {
            setError('Please enter your partner code');
            return;
        }

        setLoading(true);

        try {
            const result = await login(partnerCode.trim(), {
                customMac: showCustomMac && customMac.trim() ? customMac.trim() : null
            });

            if (!result.success) {
                handleLoginError(result);
            }
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginError = (result) => {
        const { code, message } = result;

        switch (code) {
            case 'MAC_FRESH':
                Alert.alert(
                    '🆕 Device Registered',
                    message || 'Your device has been registered. Contact admin to assign packages.',
                    [
                        {
                            text: 'Use Custom MAC',
                            onPress: () => setShowCustomMac(true)
                        },
                        { text: 'OK', style: 'cancel' }
                    ]
                );
                break;

            case 'MAC_SWITCHED_PARTNER':
                Alert.alert(
                    '🔄 Partner Code Switched',
                    message || 'Device moved to new partner code successfully.',
                    [{ text: 'OK' }]
                );
                break;

            case 'MAC_INACTIVE':
                Alert.alert(
                    '⚠️ Account Inactive',
                    message || 'Device is inactive. Contact admin to activate.',
                    [
                        {
                            text: 'Use Custom MAC',
                            onPress: () => setShowCustomMac(true)
                        },
                        { text: 'OK', style: 'cancel' }
                    ]
                );
                break;

            case 'SUBSCRIPTION_EXPIRED':
                Alert.alert(
                    '⏰ Subscription Expired',
                    message || 'Subscription expired. Contact admin to renew.',
                    [
                        {
                            text: 'Use Custom MAC',
                            onPress: () => setShowCustomMac(true)
                        },
                        { text: 'OK', style: 'cancel' }
                    ]
                );
                break;

            case 'NO_PACKAGES':
                Alert.alert(
                    '📦 No Packages',
                    message || 'No active packages. Contact admin.',
                    [{ text: 'OK' }]
                );
                break;

            case 'CUSTOM_MAC_NOT_ACTIVE':
                setError(message || 'Custom MAC not found or not active.');
                break;

            case 'CUSTOM_MAC_NO_PACKAGES':
                setError(message || 'Custom MAC has no active packages.');
                break;

            case 'CUSTOM_MAC_EXPIRED':
                setError(message || 'Custom MAC subscription expired.');
                break;

            case 'RESELLER_INACTIVE':
                Alert.alert(
                    '🚫 Reseller Inactive',
                    message || 'Reseller account is inactive. Contact admin.',
                    [{ text: 'OK' }]
                );
                break;

            case 'DISTRIBUTOR_INACTIVE':
                Alert.alert(
                    '🚫 Service Unavailable',
                    message || 'Distributor account is inactive. Contact admin.',
                    [{ text: 'OK' }]
                );
                break;

            default:
                setError(message || 'Login failed. Check your partner code.');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-gray-950"
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-1 justify-center px-6 py-12">
                    <View className="items-center mb-12">
                        <View className="bg-orange-500 w-24 h-24 rounded-3xl items-center justify-center mb-4">
                            <Text className="text-white text-4xl font-bold">TV</Text>
                        </View>
                        <Text className="text-white text-3xl font-bold mb-2">Welcome Back</Text>
                        <Text className="text-gray-400 text-base text-center">
                            Sign in to access your IPTV channels
                        </Text>
                    </View>

                    {error && (
                        <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex-row items-start">
                            <AlertCircle size={20} color="#ef4444" style={{ marginRight: 12, marginTop: 2 }} />
                            <Text className="text-red-400 text-sm flex-1 leading-5">{error}</Text>
                        </View>
                    )}

                    <View className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
                        <View className="mb-5">
                            <Text className="text-gray-300 text-sm font-medium mb-2">Partner Code</Text>
                            <View className="flex-row items-center bg-gray-800 rounded-xl px-4 border border-gray-700">
                                <Lock size={20} color="#9ca3af" />
                                <TextInput
                                    className="flex-1 text-white py-4 px-3 text-base"
                                    placeholder="Enter your partner code"
                                    placeholderTextColor="#6b7280"
                                    value={partnerCode}
                                    onChangeText={setPartnerCode}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            className="flex-row items-center justify-between py-3 mb-4"
                            onPress={() => {
                                setShowCustomMac(!showCustomMac);
                                if (showCustomMac) setCustomMac('');
                                setError('');
                            }}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <View className="flex-row items-center">
                                <Smartphone size={18} color="#f97316" style={{ marginRight: 8 }} />
                                <Text className="text-gray-300 text-sm">Use Custom MAC</Text>
                            </View>
                            <View className={`w-12 h-6 rounded-full ${showCustomMac ? 'bg-orange-500' : 'bg-gray-700'}`}>
                                <View className={`w-5 h-5 rounded-full bg-white mt-0.5 ${showCustomMac ? 'ml-6' : 'ml-0.5'}`} />
                            </View>
                        </TouchableOpacity>

                        {showCustomMac && (
                            <View className="mb-5 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                                <Text className="text-gray-300 text-sm font-medium mb-2">Custom MAC Address</Text>
                                <View className="flex-row items-center bg-gray-800 rounded-xl px-4 border border-gray-700">
                                    <Smartphone size={20} color="#9ca3af" />
                                    <TextInput
                                        className="flex-1 text-white py-4 px-3 text-base font-mono"
                                        placeholder="00:00:00:00:00:00"
                                        placeholderTextColor="#6b7280"
                                        value={customMac}
                                        onChangeText={setCustomMac}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        editable={!loading}
                                    />
                                </View>
                                <Text className="text-gray-500 text-xs mt-2">
                                    Enter an active MAC to use channels from that account
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            className={`rounded-xl py-4 ${loading ? 'bg-orange-500/50' : 'bg-orange-500'}`}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white text-center font-semibold text-base">
                                    Sign In
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                        <Text className="text-blue-400 text-sm text-center leading-5">
                            <Text className="font-semibold">New user?</Text> Device will be registered automatically.
                            Contact admin to assign packages.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}