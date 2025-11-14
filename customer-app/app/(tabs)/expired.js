// app/(tabs)/expired.js
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertCircle, Calendar, HardDrive, User, LogOut } from 'lucide-react-native';
import { useAuth } from '../../context/authContext';

export default function ExpiredScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/signin');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
                {/* Icon */}
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                    <View style={{ backgroundColor: 'rgba(239,68,68,0.2)', padding: 24, borderRadius: 100 }}>
                        <AlertCircle size={80} color="#ef4444" />
                    </View>
                </View>

                {/* Title */}
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 12 }}>
                    Subscription Expired
                </Text>

                <Text style={{ fontSize: 16, color: '#9ca3af', textAlign: 'center', marginBottom: 40, paddingHorizontal: 24 }}>
                    Your subscription has expired. Contact admin to renew.
                </Text>

                {/* Info Card */}
                <View style={{ backgroundColor: '#1f2937', borderRadius: 16, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#374151' }}>
                    {/* Name */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#374151' }}>
                        <View style={{ backgroundColor: 'rgba(59,130,246,0.2)', padding: 12, borderRadius: 100, marginRight: 16 }}>
                            <User size={24} color="#3b82f6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Subscriber</Text>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>{user?.name || 'N/A'}</Text>
                        </View>
                    </View>

                    {/* Expiry */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#374151' }}>
                        <View style={{ backgroundColor: 'rgba(239,68,68,0.2)', padding: 12, borderRadius: 100, marginRight: 16 }}>
                            <Calendar size={24} color="#ef4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Expired On</Text>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>{formatDate(user?.expiryDate)}</Text>
                        </View>
                    </View>

                    {/* MAC */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#374151', padding: 12, borderRadius: 100, marginRight: 16 }}>
                            <HardDrive size={24} color="#9ca3af" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>MAC Address</Text>
                            <Text style={{ fontSize: 14, fontFamily: 'monospace', color: '#fff' }}>{user?.macAddress || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                {/* Contact */}
                <View style={{ backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', borderRadius: 12, padding: 16, marginBottom: 32 }}>
                    <Text style={{ color: '#eab308', fontWeight: '600', marginBottom: 4, textAlign: 'center' }}>Contact Support</Text>
                    <Text style={{ color: 'rgba(254,243,199,0.8)', fontSize: 14, textAlign: 'center' }}>
                        Reach out to admin to renew your subscription.
                    </Text>
                </View>

                {/* Logout */}
                <TouchableOpacity
                    onPress={handleLogout}
                    style={{ backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                >
                    <LogOut size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Back to Login</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
