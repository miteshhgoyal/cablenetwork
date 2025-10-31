// app/(auth)/signin.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/authContext';
import {
    Eye,
    EyeOff,
    Lock,
    Mail,
    AlertCircle,
    CheckCircle,
    Shield,
    Building2,
    Store,
    Sparkles,
} from 'lucide-react-native';

const SignIn = () => {
    const { login } = useAuth();
    const [selectedRole, setSelectedRole] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const roles = [
        {
            id: 'admin',
            label: 'Admin',
            description: 'Full system access',
            icon: Shield,
        },
        {
            id: 'distributor',
            label: 'Distributor',
            description: 'Manage resellers',
            icon: Building2,
        },
        {
            id: 'reseller',
            label: 'Reseller',
            description: 'Manage subscribers',
            icon: Store,
        },
    ];

    const handleLogin = async () => {
        setError('');
        setSuccess('');

        if (!selectedRole) {
            setError('Please select your role');
            return;
        }
        if (!email.trim()) {
            setError('Email is required');
            return;
        }
        if (!password.trim()) {
            setError('Password is required');
            return;
        }

        setLoading(true);

        try {
            const result = await login({
                email: email.trim(),
                password: password.trim(),
                role: selectedRole,
            });

            if (result.success) {
                setSuccess('✓ Login successful!');
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err) {
            setError(err.message || 'An error occurred');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        paddingHorizontal: 24,
                        paddingTop: 32,
                        paddingBottom: 40,
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                >
                    {/* Logo & Title */}
                    <View style={{ marginBottom: 40 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ width: 48, height: 48, backgroundColor: '#2563eb', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                <Sparkles size={28} color="#ffffff" />
                            </View>
                            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>IPTV</Text>
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: '500', color: '#4b5563' }}>
                            Manage your streaming platform
                        </Text>
                    </View>

                    {/* Error Message */}
                    {error ? (
                        <View style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 16 }}>
                            <AlertCircle size={20} color="#dc2626" />
                            <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#b91c1c', marginLeft: 12 }}>
                                {error}
                            </Text>
                        </View>
                    ) : null}

                    {/* Success Message */}
                    {success ? (
                        <View style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, padding: 16 }}>
                            <CheckCircle size={20} color="#16a34a" />
                            <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#166534', marginLeft: 12 }}>
                                {success}
                            </Text>
                        </View>
                    ) : null}

                    {/* Role Selection */}
                    <View style={{ marginBottom: 32 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
                            SELECT ROLE
                        </Text>
                        {roles.map((role) => {
                            const IconComponent = role.icon;
                            const isSelected = selectedRole === role.id;
                            return (
                                <TouchableOpacity
                                    key={role.id}
                                    onPress={() => {
                                        setSelectedRole(role.id);
                                        setError('');
                                    }}
                                    disabled={loading}
                                    activeOpacity={0.7}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        borderRadius: 8,
                                        borderWidth: 2,
                                        borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                                        backgroundColor: isSelected ? '#eff6ff' : '#f9fafb',
                                        marginBottom: 12,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 8,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            backgroundColor: isSelected ? '#dbeafe' : '#ffffff',
                                        }}
                                    >
                                        <IconComponent
                                            size={20}
                                            color={isSelected ? '#3b82f6' : '#9ca3af'}
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text
                                            style={{
                                                fontSize: 16,
                                                fontWeight: '700',
                                                color: isSelected ? '#1e3a8a' : '#111827',
                                                marginBottom: 4,
                                            }}
                                        >
                                            {role.label}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                            {role.description}
                                        </Text>
                                    </View>
                                    {isSelected && (
                                        <View
                                            style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: 10,
                                                backgroundColor: '#3b82f6',
                                            }}
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Email Input */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            EMAIL
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#ffffff',
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            paddingHorizontal: 12,
                        }}>
                            <Mail size={18} color="#9ca3af" />
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="admin@example.com"
                                placeholderTextColor="#d1d5db"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                                style={{
                                    flex: 1,
                                    marginLeft: 8,
                                    paddingVertical: 14,
                                    fontSize: 16,
                                    color: '#111827',
                                }}
                            />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View style={{ marginBottom: 32 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            PASSWORD
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#ffffff',
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            paddingHorizontal: 12,
                        }}>
                            <Lock size={18} color="#9ca3af" />
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                placeholderTextColor="#d1d5db"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                                style={{
                                    flex: 1,
                                    marginLeft: 8,
                                    paddingVertical: 14,
                                    fontSize: 16,
                                    color: '#111827',
                                }}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                disabled={loading}
                                activeOpacity={0.7}
                                style={{ padding: 4 }}
                            >
                                {showPassword ? (
                                    <EyeOff size={18} color="#9ca3af" />
                                ) : (
                                    <Eye size={18} color="#9ca3af" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 16,
                            borderRadius: 8,
                            backgroundColor: loading ? '#d1d5db' : '#2563eb',
                            marginBottom: 20,
                        }}
                    >
                        {loading && (
                            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                        )}
                        <Text
                            style={{
                                color: loading ? '#4b5563' : '#ffffff',
                                fontWeight: '700',
                                fontSize: 16,
                            }}
                        >
                            {loading ? 'SIGNING IN...' : 'SIGN IN'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignIn;