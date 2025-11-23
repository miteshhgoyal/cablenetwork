// app/(tabs)/profile.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/authContext';
import {
    User,
    Mail,
    Phone,
    Shield,
    Edit2,
    Save,
    X,
    Eye,
    EyeOff,
    IndianRupee,
    Package as PackageIcon,
    LogOut,
} from 'lucide-react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const Profile = () => {
    const { user: authUser, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editing, setEditing] = useState(false);
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        currentPassword: '',
        newPassword: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get('/profile');
            setProfile(response.data.data.user);
            setFormData({
                name: response.data.data.user.name,
                phone: response.data.data.user.phone,
                currentPassword: '',
                newPassword: '',
            });
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            Alert.alert('Error', 'Failed to load profile');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchProfile();
    };

    const handleEdit = () => {
        setEditing(true);
    };

    const handleCancel = () => {
        setEditing(false);
        setShowPasswordFields(false);
        setFormData({
            name: profile.name,
            phone: profile.phone,
            currentPassword: '',
            newPassword: '',
        });
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }
        if (!formData.phone.trim()) {
            Alert.alert('Error', 'Phone is required');
            return;
        }

        if (showPasswordFields) {
            if (!formData.currentPassword) {
                Alert.alert('Error', 'Current password is required');
                return;
            }
            if (!formData.newPassword) {
                Alert.alert('Error', 'New password is required');
                return;
            }
            if (formData.newPassword.length < 6) {
                Alert.alert('Error', 'New password must be at least 6 characters');
                return;
            }
        }

        setSubmitting(true);

        try {
            const updateData = {
                name: formData.name,
                phone: formData.phone,
            };

            if (showPasswordFields && formData.newPassword) {
                updateData.currentPassword = formData.currentPassword;
                updateData.newPassword = formData.newPassword;
            }

            const response = await api.put('/profile', updateData);
            setProfile(response.data.data.user);
            setEditing(false);
            setShowPasswordFields(false);
            setFormData({
                ...formData,
                currentPassword: '',
                newPassword: '',
            });
            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={{ backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 32 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{ width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
                            <User size={32} color="#ffffff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 }}>
                                {profile?.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Shield size={14} color="#dbeafe" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#dbeafe', textTransform: 'uppercase' }}>
                                    {profile?.role}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
                    {/* Balance Card */}
                    <View style={{ backgroundColor: '#2563eb', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <IndianRupee size={18} color="#dbeafe" style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: 13, color: '#dbeafe' }}>Available Balance</Text>
                        </View>
                        <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#ffffff' }}>
                            {(profile?.balance || 0).toLocaleString('en-IN')}
                        </Text>
                    </View>

                    {/* Account Info */}
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 20, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 16 }}>
                            Account Information
                        </Text>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                                <Text style={{ fontSize: 13, color: '#6b7280' }}>Status</Text>
                                <View style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    backgroundColor: profile?.status === 'Active' ? '#dcfce7' : '#fee2e2',
                                    borderColor: profile?.status === 'Active' ? '#bbf7d0' : '#fecaca',
                                }}>
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: profile?.status === 'Active' ? '#166534' : '#991b1b',
                                    }}>
                                        {profile?.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                                <Text style={{ fontSize: 13, color: '#6b7280' }}>Member Since</Text>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                                    {formatDate(profile?.createdAt)}
                                </Text>
                            </View>

                            {profile?.subscriberLimit && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                                    <Text style={{ fontSize: 13, color: '#6b7280' }}>Subscriber Limit</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                                        {profile.subscriberLimit}
                                    </Text>
                                </View>
                            )}

                            {profile?.partnerCode && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
                                    <Text style={{ fontSize: 13, color: '#6b7280' }}>Partner Code</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', fontFamily: 'monospace' }}>
                                        {profile.partnerCode}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Packages */}
                    {profile?.packages && profile.packages.length > 0 && (
                        <View style={{ backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 20, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <PackageIcon size={18} color="#2563eb" style={{ marginRight: 8 }} />
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>
                                    Assigned Packages
                                </Text>
                            </View>
                            {profile.packages.map((pkg) => (
                                <View
                                    key={pkg._id}
                                    style={{ paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 }}
                                >
                                    <Text style={{ fontWeight: '600', color: '#111827', fontSize: 13, marginBottom: 8 }}>
                                        {pkg.name}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={{ fontSize: 12, color: '#6b7280' }}>₹{pkg.cost}</Text>
                                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                            {pkg.duration} days
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Profile Details */}
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 20, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
                                Profile Details
                            </Text>
                            {!editing && (
                                <TouchableOpacity
                                    onPress={handleEdit}
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2563eb', borderRadius: 8 }}
                                >
                                    <Edit2 size={14} color="#ffffff" style={{ marginRight: 6 }} />
                                    <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 13 }}>Edit</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View>
                            {/* Name */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                                    Full Name
                                </Text>
                                <View style={{ position: 'relative' }}>
                                    <User size={18} color="#9ca3af" style={{ position: 'absolute', left: 12, top: 12, zIndex: 10 }} />
                                    <TextInput
                                        value={formData.name}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, name: text })
                                        }
                                        editable={editing}
                                        style={{
                                            paddingLeft: 44,
                                            paddingRight: 16,
                                            paddingVertical: 12,
                                            borderWidth: 1,
                                            borderColor: '#e5e7eb',
                                            borderRadius: 8,
                                            color: '#111827',
                                            backgroundColor: editing ? '#f9fafb' : '#f3f4f6',
                                        }}
                                    />
                                </View>
                            </View>

                            {/* Email (Read-only) */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                                    Email Address
                                </Text>
                                <View style={{ position: 'relative' }}>
                                    <Mail size={18} color="#9ca3af" style={{ position: 'absolute', left: 12, top: 12, zIndex: 10 }} />
                                    <TextInput
                                        value={profile?.email}
                                        editable={false}
                                        style={{
                                            paddingLeft: 44,
                                            paddingRight: 16,
                                            paddingVertical: 12,
                                            borderWidth: 1,
                                            borderColor: '#e5e7eb',
                                            borderRadius: 8,
                                            color: '#6b7280',
                                            backgroundColor: '#f3f4f6',
                                        }}
                                    />
                                </View>
                                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
                                    Email cannot be changed
                                </Text>
                            </View>

                            {/* Phone */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                                    Phone Number
                                </Text>
                                <View style={{ position: 'relative' }}>
                                    <Phone size={18} color="#9ca3af" style={{ position: 'absolute', left: 12, top: 12, zIndex: 10 }} />
                                    <TextInput
                                        value={formData.phone}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, phone: text })
                                        }
                                        editable={editing}
                                        keyboardType="phone-pad"
                                        style={{
                                            paddingLeft: 44,
                                            paddingRight: 16,
                                            paddingVertical: 12,
                                            borderWidth: 1,
                                            borderColor: '#e5e7eb',
                                            borderRadius: 8,
                                            color: '#111827',
                                            backgroundColor: editing ? '#f9fafb' : '#f3f4f6',
                                        }}
                                    />
                                </View>
                            </View>

                            {/* Change Password Section */}
                            {editing && (
                                <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                                    <TouchableOpacity
                                        onPress={() => setShowPasswordFields(!showPasswordFields)}
                                        style={{ marginBottom: 16 }}
                                    >
                                        <Text style={{ fontSize: 13, color: '#2563eb', fontWeight: '600' }}>
                                            {showPasswordFields
                                                ? 'Cancel Password Change'
                                                : 'Change Password'}
                                        </Text>
                                    </TouchableOpacity>

                                    {showPasswordFields && (
                                        <View>
                                            {/* Current Password */}
                                            <View style={{ marginBottom: 16 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                                                    Current Password
                                                </Text>
                                                <View style={{ position: 'relative' }}>
                                                    <TextInput
                                                        value={formData.currentPassword}
                                                        onChangeText={(text) =>
                                                            setFormData({
                                                                ...formData,
                                                                currentPassword: text,
                                                            })
                                                        }
                                                        placeholder="Enter current password"
                                                        placeholderTextColor="#9ca3af"
                                                        secureTextEntry={!showCurrentPassword}
                                                        autoCapitalize="none"
                                                        style={{
                                                            paddingLeft: 16,
                                                            paddingRight: 44,
                                                            paddingVertical: 12,
                                                            backgroundColor: '#f9fafb',
                                                            borderWidth: 1,
                                                            borderColor: '#e5e7eb',
                                                            borderRadius: 8,
                                                            color: '#111827',
                                                        }}
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() =>
                                                            setShowCurrentPassword(!showCurrentPassword)
                                                        }
                                                        style={{ position: 'absolute', right: 12, top: 12, zIndex: 10 }}
                                                    >
                                                        {showCurrentPassword ? (
                                                            <EyeOff size={18} color="#9ca3af" />
                                                        ) : (
                                                            <Eye size={18} color="#9ca3af" />
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            {/* New Password */}
                                            <View style={{ marginBottom: 16 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                                                    New Password
                                                </Text>
                                                <View style={{ position: 'relative' }}>
                                                    <TextInput
                                                        value={formData.newPassword}
                                                        onChangeText={(text) =>
                                                            setFormData({
                                                                ...formData,
                                                                newPassword: text,
                                                            })
                                                        }
                                                        placeholder="Enter new password (min 6 characters)"
                                                        placeholderTextColor="#9ca3af"
                                                        secureTextEntry={!showNewPassword}
                                                        autoCapitalize="none"
                                                        style={{
                                                            paddingLeft: 16,
                                                            paddingRight: 44,
                                                            paddingVertical: 12,
                                                            backgroundColor: '#f9fafb',
                                                            borderWidth: 1,
                                                            borderColor: '#e5e7eb',
                                                            borderRadius: 8,
                                                            color: '#111827',
                                                        }}
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                                        style={{ position: 'absolute', right: 12, top: 12, zIndex: 10 }}
                                                    >
                                                        {showNewPassword ? (
                                                            <EyeOff size={18} color="#9ca3af" />
                                                        ) : (
                                                            <Eye size={18} color="#9ca3af" />
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Action Buttons */}
                            {editing && (
                                <View style={{ flexDirection: 'row', marginTop: 16 }}>
                                    <TouchableOpacity
                                        onPress={handleSubmit}
                                        disabled={submitting}
                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 8, marginRight: 12, opacity: submitting ? 0.5 : 1 }}
                                    >
                                        {submitting ? (
                                            <>
                                                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                                                <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 13 }}>
                                                    Saving...
                                                </Text>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} color="#ffffff" style={{ marginRight: 8 }} />
                                                <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 13 }}>Save</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleCancel}
                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f3f4f6', borderRadius: 8 }}
                                    >
                                        <X size={16} color="#374151" style={{ marginRight: 8 }} />
                                        <Text style={{ color: '#374151', fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert(
                                'Logout',
                                'Are you sure you want to logout?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Logout',
                                        style: 'destructive',
                                        onPress: logout,
                                    },
                                ],
                                { cancelable: true }
                            );
                        }}
                        style={{ borderWidth: 2, borderColor: '#fecaca', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fee2e2', marginBottom: 24 }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <LogOut size={18} color="#dc2626" style={{ marginRight: 8 }} />
                            <Text style={{ color: '#dc2626', textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}>
                                Logout from Account
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Profile;
