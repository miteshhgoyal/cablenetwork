import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar } from 'react-native'
import React, { useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Loading from '../../components/Loading'
import CustomKeyboardView from "../../components/CustomKeyboardView"
import { useAuth } from '@/context/authContext'
import api from '@/services/api'

const signin = () => {
    const { login } = useAuth()
    const router = useRouter()
    const searchParams = useLocalSearchParams()
    const from = searchParams.from || '/(tabs)/accounts'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [passwordVisible, setPasswordVisible] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        setError('')

        // Basic validation
        if (!email.trim()) {
            setError('Email is required')
            return
        }
        if (!password.trim() || password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setIsLoading(true)
        try {
            const response = await api.post('/auth/signin', { email, password })

            if (response.data.data) {
                const { accessToken, refreshToken, user } = response.data.data
                await login({ accessToken, refreshToken, user })
                router.replace(from)
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Invalid credentials'
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }

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
                    <View className="items-center mb-8">
                        <View className="w-16 h-16 bg-orange-500 rounded-full items-center justify-center mb-4">
                            <Ionicons name="person" size={32} color="white" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-800">Sign In</Text>
                        <Text className="text-gray-500 mt-1">Welcome back!</Text>
                    </View>

                    {/* Error Message */}
                    {error ? (
                        <View className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                            <Text className="text-red-600 text-sm">{error}</Text>
                        </View>
                    ) : null}

                    {/* Email Input */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
                        <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-3">
                            <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                placeholderTextColor="#9ca3af"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                className="flex-1 ml-2 text-gray-900"
                            />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-2">Password</Text>
                        <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-3">
                            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry={!passwordVisible}
                                className="flex-1 ml-2 text-gray-900"
                            />
                            <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
                                <Ionicons
                                    name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color="#9ca3af"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Forgot Password */}
                    <TouchableOpacity
                        onPress={() => router.push('/forgot-password')}
                        className="items-end mb-6"
                    >
                        <Text className="text-orange-500 text-sm">Forgot Password?</Text>
                    </TouchableOpacity>

                    {/* Submit Button */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isLoading}
                        className={`py-3 rounded-lg ${isLoading ? 'bg-gray-400' : 'bg-orange-500'}`}
                    >
                        {isLoading ? (
                            <View className="flex-row items-center justify-center">
                                <Loading size={20} color="white" />
                                <Text className="text-white font-semibold ml-2">Signing In...</Text>
                            </View>
                        ) : (
                            <Text className="text-white font-semibold text-center">Sign In</Text>
                        )}
                    </TouchableOpacity>

                    {/* Sign Up Link */}
                    <View className="flex-row justify-center items-center mt-6">
                        <Text className="text-gray-600">Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/signup')}>
                            <Text className="text-orange-500 font-semibold">Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </CustomKeyboardView>
    )
}

export default signin
