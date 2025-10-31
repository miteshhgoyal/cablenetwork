// app/(tabs)/resellers.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    Users,
    Filter,
    Eye,
    EyeOff,
} from 'lucide-react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const Resellers = () => {
    const [resellers, setResellers] = useState([]);
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedReseller, setSelectedReseller] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        subscriberLimit: '',
        partnerCode: '',
        packages: [],
        status: 'Active',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchResellers();
        fetchPackages();
    }, [statusFilter]);

    const fetchResellers = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);

            const response = await api.get(`/resellers?${params.toString()}`);
            setResellers(response.data.data.resellers);
        } catch (error) {
            console.error('Failed to fetch resellers:', error);
            Alert.alert('Error', 'Failed to load resellers');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchPackages = async () => {
        try {
            const response = await api.get('/resellers/packages');
            setPackages(response.data.data.packages);
        } catch (error) {
            console.error('Failed to fetch packages:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchResellers();
    };

    const handleOpenModal = (mode, reseller = null) => {
        setModalMode(mode);
        if (mode === 'edit' && reseller) {
            setSelectedReseller(reseller);
            setFormData({
                name: reseller.name,
                email: reseller.email,
                password: '',
                phone: reseller.phone,
                subscriberLimit: reseller.subscriberLimit?.toString() || '',
                partnerCode: reseller.partnerCode || '',
                packages: reseller.packages?.map((p) => p._id) || [],
                status: reseller.status,
            });
        } else {
            setFormData({
                name: '',
                email: '',
                password: '',
                phone: '',
                subscriberLimit: '',
                partnerCode: '',
                packages: [],
                status: 'Active',
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedReseller(null);
        setShowPassword(false);
        setFormData({
            name: '',
            email: '',
            password: '',
            phone: '',
            subscriberLimit: '',
            partnerCode: '',
            packages: [],
            status: 'Active',
        });
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }
        if (!formData.email.trim()) {
            Alert.alert('Error', 'Email is required');
            return;
        }
        if (modalMode === 'create' && !formData.password.trim()) {
            Alert.alert('Error', 'Password is required');
            return;
        }
        if (modalMode === 'create' && formData.password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        if (!formData.phone.trim()) {
            Alert.alert('Error', 'Phone is required');
            return;
        }

        setSubmitting(true);

        try {
            const submitData = { ...formData };

            if (modalMode === 'edit' && !submitData.password) {
                delete submitData.password;
            }

            if (modalMode === 'create') {
                await api.post('/resellers', submitData);
                Alert.alert('Success', 'Reseller created successfully');
            } else {
                await api.put(`/resellers/${selectedReseller._id}`, submitData);
                Alert.alert('Success', 'Reseller updated successfully');
            }
            fetchResellers();
            handleCloseModal();
        } catch (error) {
            console.error('Submit error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await api.delete(`/resellers/${selectedReseller._id}`);
            Alert.alert('Success', 'Reseller deleted successfully');
            fetchResellers();
            setShowDeleteModal(false);
            setSelectedReseller(null);
        } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Delete failed');
        } finally {
            setSubmitting(false);
        }
    };

    const togglePackageSelection = (packageId) => {
        setFormData({
            ...formData,
            packages: formData.packages.includes(packageId)
                ? formData.packages.filter((id) => id !== packageId)
                : [...formData.packages, packageId],
        });
    };

    const filteredResellers = resellers.filter((reseller) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            reseller.name.toLowerCase().includes(searchLower) ||
            reseller.email.toLowerCase().includes(searchLower) ||
            reseller.phone.toLowerCase().includes(searchLower) ||
            reseller.partnerCode?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-200 px-4 py-4">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                        <View className="p-2 bg-blue-50 rounded-xl mr-3">
                            <Users size={24} color="#2563eb" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-gray-900">Resellers</Text>
                            <Text className="text-xs text-gray-600">
                                Manage reseller accounts
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                        onPress={() => setShowFilters(!showFilters)}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f3f4f6', borderRadius: 8, marginRight: 12 }}
                    >
                        <Filter size={18} color="#374151" />
                        <Text className="text-gray-700 font-semibold ml-2">Filters</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleOpenModal('create')}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 8 }}
                    >
                        <Plus size={18} color="#ffffff" />
                        <Text className="text-white font-semibold ml-2">Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search and Filters */}
            <View className="px-4 py-4">
                <View className="relative mb-4">
                    <View className="absolute left-4 top-1/2 -translate-y-2.5 z-10">
                        <Search size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                        placeholder="Search by name, email, phone..."
                        placeholderTextColor="#9ca3af"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900"
                    />
                </View>

                {showFilters && (
                    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                            Status
                        </Text>
                        <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden mb-3">
                            <Picker
                                selectedValue={statusFilter}
                                onValueChange={(value) => setStatusFilter(value)}
                                style={{ height: 50 }}
                            >
                                <Picker.Item label="All Status" value="" />
                                <Picker.Item label="Active" value="Active" />
                                <Picker.Item label="Inactive" value="Inactive" />
                            </Picker>
                        </View>

                        {statusFilter && (
                            <TouchableOpacity
                                onPress={() => setStatusFilter('')}
                                style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}
                            >
                                <Text className="text-sm text-blue-600 font-semibold">
                                    Clear all filters
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Content */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-4"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {filteredResellers.length === 0 ? (
                        <View className="py-12">
                            <Text className="text-center text-gray-500">No resellers found</Text>
                        </View>
                    ) : (
                        <View style={{ marginBottom: 16 }}>
                            {filteredResellers.map((reseller, index) => (
                                <View
                                    key={reseller._id}
                                    className="bg-white rounded-xl border border-gray-200 p-4"
                                    style={{ marginBottom: 12 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text className="text-base font-bold text-gray-900 mb-1">
                                                {reseller.name}
                                            </Text>
                                            <Text className="text-xs text-gray-500 mb-1">
                                                {reseller.email}
                                            </Text>
                                            <Text className="text-xs text-gray-500 mb-2">
                                                {reseller.phone}
                                            </Text>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                {reseller.partnerCode && (
                                                    <Text className="text-xs text-blue-600 font-semibold mr-3">
                                                        Code: {reseller.partnerCode}
                                                    </Text>
                                                )}
                                                {reseller.subscriberLimit && (
                                                    <Text className="text-xs text-gray-600">
                                                        Limit: {reseller.subscriberLimit}
                                                    </Text>
                                                )}
                                            </View>

                                            <View
                                                style={{
                                                    alignSelf: 'flex-start',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 4,
                                                    borderRadius: 20,
                                                    borderWidth: 1,
                                                    backgroundColor: reseller.status === 'Active' ? '#dcfce7' : '#fee2e2',
                                                    borderColor: reseller.status === 'Active' ? '#bbf7d0' : '#fecaca',
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: '600',
                                                        color: reseller.status === 'Active' ? '#166534' : '#991b1b',
                                                    }}
                                                >
                                                    {reseller.status}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Action Buttons */}
                                        <View style={{ flexDirection: 'row' }}>
                                            <TouchableOpacity
                                                onPress={() => handleOpenModal('edit', reseller)}
                                                style={{ paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#dbeafe', borderRadius: 8, marginRight: 8 }}
                                            >
                                                <Edit2 size={18} color="#2563eb" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setSelectedReseller(reseller);
                                                    setShowDeleteModal(true);
                                                }}
                                                style={{ paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#fee2e2', borderRadius: 8 }}
                                            >
                                                <Trash2 size={18} color="#dc2626" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Packages Display */}
                                    {reseller.packages && reseller.packages.length > 0 && (
                                        <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                                            <Text className="text-xs font-semibold text-gray-600 mb-2">
                                                Packages ({reseller.packages.length})
                                            </Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                                {reseller.packages.slice(0, 3).map((pkg) => (
                                                    <View
                                                        key={pkg._id}
                                                        style={{
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 4,
                                                            backgroundColor: '#f3e8ff',
                                                            borderWidth: 1,
                                                            borderColor: '#e9d5ff',
                                                            borderRadius: 6,
                                                            marginRight: 8,
                                                            marginBottom: 8,
                                                        }}
                                                    >
                                                        <Text className="text-xs text-purple-700">
                                                            {pkg.name}
                                                        </Text>
                                                    </View>
                                                ))}
                                                {reseller.packages.length > 3 && (
                                                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#f3f4f6', borderRadius: 6 }}>
                                                        <Text className="text-xs text-gray-600">
                                                            +{reseller.packages.length - 3} more
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Add/Edit Modal */}
            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={handleCloseModal}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl max-h-[90%]">
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text className="text-xl font-bold text-gray-900">
                                {modalMode === 'create' ? 'Add Reseller' : 'Edit Reseller'}
                            </Text>
                            <TouchableOpacity onPress={handleCloseModal} className="p-2 rounded-lg">
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-6 py-4" keyboardShouldPersistTaps="handled">
                            <View>
                                {/* Name */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Name *
                                    </Text>
                                    <TextInput
                                        value={formData.name}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, name: text })
                                        }
                                        placeholder="Enter name"
                                        placeholderTextColor="#9ca3af"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Email */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Email *
                                    </Text>
                                    <TextInput
                                        value={formData.email}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, email: text })
                                        }
                                        placeholder="Enter email"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Password */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Password {modalMode === 'create' ? '*' : '(Optional)'}
                                    </Text>
                                    <View className="relative">
                                        <TextInput
                                            value={formData.password}
                                            onChangeText={(text) =>
                                                setFormData({ ...formData, password: text })
                                            }
                                            placeholder={
                                                modalMode === 'create'
                                                    ? 'Enter password'
                                                    : 'Leave blank to keep current'
                                            }
                                            placeholderTextColor="#9ca3af"
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 pr-12"
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: 12, top: 12, zIndex: 10 }}
                                        >
                                            {showPassword ? (
                                                <EyeOff size={18} color="#9ca3af" />
                                            ) : (
                                                <Eye size={18} color="#9ca3af" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Phone */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Phone *
                                    </Text>
                                    <TextInput
                                        value={formData.phone}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, phone: text })
                                        }
                                        placeholder="Enter phone"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="phone-pad"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Subscriber Limit */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Subscriber Limit
                                    </Text>
                                    <TextInput
                                        value={formData.subscriberLimit}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, subscriberLimit: text })
                                        }
                                        placeholder="Enter limit"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="numeric"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Partner Code */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Partner Code
                                    </Text>
                                    <TextInput
                                        value={formData.partnerCode}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, partnerCode: text })
                                        }
                                        placeholder="Enter partner code"
                                        placeholderTextColor="#9ca3af"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Status */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Status *
                                    </Text>
                                    <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                        <Picker
                                            selectedValue={formData.status}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, status: value })
                                            }
                                            style={{ height: 50 }}
                                        >
                                            <Picker.Item label="Active" value="Active" />
                                            <Picker.Item label="Inactive" value="Inactive" />
                                        </Picker>
                                    </View>
                                </View>

                                {/* Packages */}
                                <View style={{ marginBottom: 24 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Packages (Optional) - Tap to select
                                    </Text>
                                    <View className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-40">
                                        <ScrollView>
                                            {packages.map((pkg) => (
                                                <TouchableOpacity
                                                    key={pkg._id}
                                                    onPress={() => togglePackageSelection(pkg._id)}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        borderRadius: 8,
                                                        marginBottom: 8,
                                                        backgroundColor: formData.packages.includes(pkg._id) ? '#dbeafe' : '#ffffff',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 14,
                                                            color: formData.packages.includes(pkg._id) ? '#1e40af' : '#374151',
                                                            fontWeight: formData.packages.includes(pkg._id) ? '600' : '400',
                                                        }}
                                                    >
                                                        {pkg.name} - ₹{pkg.cost}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                    <Text className="text-xs text-gray-500 mt-1">
                                        Selected: {formData.packages.length}
                                    </Text>
                                </View>

                                {/* Buttons */}
                                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                                    <TouchableOpacity
                                        onPress={handleSubmit}
                                        disabled={submitting}
                                        style={{ flex: 1, marginRight: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 8, opacity: submitting ? 0.5 : 1 }}
                                    >
                                        <Text className="text-white text-center font-semibold">
                                            {submitting
                                                ? 'Saving...'
                                                : modalMode === 'create'
                                                    ? 'Create'
                                                    : 'Update'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleCloseModal}
                                        style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f3f4f6', borderRadius: 8 }}
                                    >
                                        <Text className="text-gray-700 text-center font-semibold">
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <View className="bg-white rounded-2xl w-full max-w-md">
                        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
                            <View style={{ width: 48, height: 48, backgroundColor: '#fee2e2', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginHorizontal: 'auto', marginBottom: 16 }}>
                                <Trash2 size={24} color="#dc2626" />
                            </View>
                            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                                Delete Reseller
                            </Text>
                            <Text className="text-gray-600 text-center mb-6">
                                Are you sure you want to delete "
                                <Text className="font-semibold">{selectedReseller?.name}</Text>
                                "? This action cannot be undone.
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    disabled={submitting}
                                    style={{ flex: 1, marginRight: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#dc2626', borderRadius: 8, opacity: submitting ? 0.5 : 1 }}
                                >
                                    <Text className="text-white text-center font-semibold">
                                        {submitting ? 'Deleting...' : 'Delete'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowDeleteModal(false);
                                        setSelectedReseller(null);
                                    }}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f3f4f6', borderRadius: 8 }}
                                >
                                    <Text className="text-gray-700 text-center font-semibold">
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default Resellers;
