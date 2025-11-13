// app/(tabs)/subscribers.js
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
import { useAuth } from '../../context/authContext';
import {
    Search,
    Filter,
    UserCheck,
    Eye,
    Edit2,
    Trash2,
    X,
    CheckCircle,
} from 'lucide-react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const Subscribers = () => {
    const { user } = useAuth();
    const [subscribers, setSubscribers] = useState([]);
    const [resellers, setResellers] = useState([]);
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [resellerFilter, setResellerFilter] = useState('');
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showActivateModal, setShowActivateModal] = useState(false); // NEW
    const [selectedSubscriber, setSelectedSubscriber] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        subscriberName: '',
        macAddress: '',
        serialNumber: '',
        status: 'Active',
        expiryDate: '',
        package: '',
    });

    useEffect(() => {
        fetchSubscribers();
        fetchPackages();
        if (user.role !== 'reseller') {
            fetchResellers();
        }
    }, [statusFilter, resellerFilter]);

    const fetchSubscribers = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (resellerFilter) params.append('resellerId', resellerFilter);

            const response = await api.get(`/subscribers?${params.toString()}`);
            setSubscribers(response.data.data.subscribers);
        } catch (error) {
            console.error('Failed to fetch subscribers:', error);
            Alert.alert('Error', 'Failed to load subscribers');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchResellers = async () => {
        try {
            const response = await api.get('/subscribers/resellers');
            setResellers(response.data.data.resellers);
        } catch (error) {
            console.error('Failed to fetch resellers:', error);
        }
    };

    const fetchPackages = async () => {
        try {
            const response = await api.get('/subscribers/packages');
            setPackages(response.data.data.packages);
        } catch (error) {
            console.error('Failed to fetch packages:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchSubscribers();
    };

    const handleViewDetails = (subscriber) => {
        setSelectedSubscriber(subscriber);
        setShowViewModal(true);
    };

    const handleEdit = (subscriber) => {
        setSelectedSubscriber(subscriber);
        setFormData({
            subscriberName: subscriber.subscriberName,
            macAddress: subscriber.macAddress,
            serialNumber: subscriber.serialNumber,
            status: subscriber.status,
            expiryDate: new Date(subscriber.expiryDate).toISOString().split('T')[0],
            package: subscriber.primaryPackageId?._id || '',
        });
        setShowEditModal(true);
    };

    const handleDeleteClick = (subscriber) => {
        setSelectedSubscriber(subscriber);
        setShowDeleteModal(true);
    };

    // NEW: Activate handler
    const handleActivateClick = (subscriber) => {
        setSelectedSubscriber(subscriber);
        setShowActivateModal(true);
    };

    // NEW: Activate subscriber API call
    const handleActivate = async () => {
        setSubmitting(true);
        try {
            await api.patch(`/subscribers/${selectedSubscriber._id}/activate`, {
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            });
            Alert.alert('Success', 'Subscriber activated successfully');
            fetchSubscribers();
            setShowActivateModal(false);
            setSelectedSubscriber(null);
        } catch (error) {
            console.error('Activate error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Activation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!formData.subscriberName.trim()) {
            Alert.alert('Error', 'Subscriber name is required');
            return;
        }
        if (!formData.macAddress.trim()) {
            Alert.alert('Error', 'MAC address is required');
            return;
        }
        if (!formData.serialNumber.trim()) {
            Alert.alert('Error', 'Serial number is required');
            return;
        }
        if (!formData.expiryDate) {
            Alert.alert('Error', 'Expiry date is required');
            return;
        }

        setSubmitting(true);

        try {
            await api.put(`/subscribers/${selectedSubscriber._id}`, formData);
            Alert.alert('Success', 'Subscriber updated successfully');
            fetchSubscribers();
            setShowEditModal(false);
            setSelectedSubscriber(null);
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Update failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await api.delete(`/subscribers/${selectedSubscriber._id}`);
            Alert.alert('Success', 'Subscriber deleted successfully');
            fetchSubscribers();
            setShowDeleteModal(false);
            setSelectedSubscriber(null);
        } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Delete failed');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredSubscribers = subscribers.filter((subscriber) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            subscriber.subscriberName.toLowerCase().includes(searchLower) ||
            subscriber.macAddress.toLowerCase().includes(searchLower) ||
            subscriber.serialNumber?.toLowerCase().includes(searchLower) ||
            subscriber.resellerId?.name.toLowerCase().includes(searchLower)
        );
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active':
                return { bg: '#dcfce7', border: '#bbf7d0', text: '#166534' };
            case 'Inactive':
                return { bg: '#fee2e2', border: '#fecaca', text: '#991b1b' };
            case 'Fresh':
                return { bg: '#dbeafe', border: '#bfdbfe', text: '#1e40af' };
            default:
                return { bg: '#f3f4f6', border: '#e5e7eb', text: '#374151' };
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-200 px-4 py-4">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                        <View className="p-2 bg-blue-50 rounded-xl mr-3">
                            <UserCheck size={24} color="#2563eb" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-gray-900">Subscribers</Text>
                            <Text className="text-xs text-gray-600">
                                View and manage subscribers
                            </Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => setShowFilters(!showFilters)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f3f4f6', borderRadius: 8 }}
                >
                    <Filter size={18} color="#374151" />
                    <Text className="text-gray-700 font-semibold ml-2">Filters</Text>
                </TouchableOpacity>
            </View>

            {/* Search and Filters */}
            <View className="px-4 py-4">
                <View className="relative mb-4">
                    <View className="absolute left-4 top-1/2 -translate-y-2.5 z-10">
                        <Search size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                        placeholder="Search by name, MAC, or serial..."
                        placeholderTextColor="#9ca3af"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900"
                    />
                </View>

                {showFilters && (
                    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                        <View>
                            {/* Status Filter */}
                            <View style={{ marginBottom: 16 }}>
                                <Text className="text-sm font-semibold text-gray-700 mb-2">
                                    Status
                                </Text>
                                <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                    <Picker
                                        selectedValue={statusFilter}
                                        onValueChange={(value) => setStatusFilter(value)}
                                        style={{ height: 50 }}
                                    >
                                        <Picker.Item label="All Status" value="" />
                                        <Picker.Item label="Active" value="Active" />
                                        <Picker.Item label="Inactive" value="Inactive" />
                                        <Picker.Item label="Fresh" value="Fresh" />
                                    </Picker>
                                </View>
                            </View>

                            {/* Reseller Filter */}
                            {user.role !== 'reseller' && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Reseller
                                    </Text>
                                    <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                        <Picker
                                            selectedValue={resellerFilter}
                                            onValueChange={(value) => setResellerFilter(value)}
                                            style={{ height: 50 }}
                                        >
                                            <Picker.Item label="All Resellers" value="" />
                                            {resellers.map((reseller) => (
                                                <Picker.Item
                                                    key={reseller._id}
                                                    label={reseller.name}
                                                    value={reseller._id}
                                                />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>
                            )}
                        </View>

                        {(statusFilter || resellerFilter) && (
                            <TouchableOpacity
                                onPress={() => {
                                    setStatusFilter('');
                                    setResellerFilter('');
                                }}
                                style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 16 }}
                            >
                                <Text className="text-sm text-blue-600 font-semibold">
                                    Clear all filters
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Stats Cards */}
                <View style={{ flexDirection: 'row', marginBottom: 16, flexWrap: 'wrap' }}>
                    <View className="bg-white rounded-xl p-3 border border-gray-200" style={{ width: '23%', marginRight: '2%', marginBottom: 8 }}>
                        <Text className="text-xs text-gray-600 mb-1">Total</Text>
                        <Text className="text-lg font-bold text-gray-900">
                            {filteredSubscribers.length}
                        </Text>
                    </View>
                    <View className="bg-white rounded-xl p-3 border border-gray-200" style={{ width: '23%', marginRight: '2%', marginBottom: 8 }}>
                        <Text className="text-xs text-gray-600 mb-1">Active</Text>
                        <Text className="text-lg font-bold text-green-600">
                            {filteredSubscribers.filter((s) => s.status === 'Active').length}
                        </Text>
                    </View>
                    <View className="bg-white rounded-xl p-3 border border-gray-200" style={{ width: '23%', marginRight: '2%', marginBottom: 8 }}>
                        <Text className="text-xs text-gray-600 mb-1">Inactive</Text>
                        <Text className="text-lg font-bold text-red-600">
                            {filteredSubscribers.filter((s) => s.status === 'Inactive').length}
                        </Text>
                    </View>
                    <View className="bg-white rounded-xl p-3 border border-gray-200" style={{ width: '23%', marginBottom: 8 }}>
                        <Text className="text-xs text-gray-600 mb-1">Fresh</Text>
                        <Text className="text-lg font-bold text-blue-600">
                            {filteredSubscribers.filter((s) => s.status === 'Fresh').length}
                        </Text>
                    </View>
                </View>
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
                    {filteredSubscribers.length === 0 ? (
                        <View className="py-12">
                            <Text className="text-center text-gray-500">
                                No subscribers found
                            </Text>
                        </View>
                    ) : (
                        <View style={{ marginBottom: 16 }}>
                            {filteredSubscribers.map((subscriber, index) => {
                                const colors = getStatusColor(subscriber.status);
                                return (
                                    <View
                                        key={subscriber._id}
                                        className="bg-white rounded-xl border border-gray-200 p-4"
                                        style={{ marginBottom: 12 }}
                                    >
                                        <View style={{ marginBottom: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text className="text-base font-bold text-gray-900 flex-1">
                                                    {subscriber.subscriberName}
                                                </Text>
                                                <View
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 4,
                                                        borderRadius: 12,
                                                        borderWidth: 1,
                                                        backgroundColor: colors.bg,
                                                        borderColor: colors.border,
                                                    }}
                                                >
                                                    <Text style={{
                                                        fontSize: 12,
                                                        fontWeight: '600',
                                                        color: colors.text,
                                                    }}>
                                                        {subscriber.status}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={{ marginBottom: 8 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                    <Text className="text-xs text-gray-500 w-24">MAC:</Text>
                                                    <Text className="text-xs text-gray-900 font-mono">
                                                        {subscriber.macAddress}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                    <Text className="text-xs text-gray-500 w-24">Serial:</Text>
                                                    <Text className="text-xs text-gray-900 font-mono">
                                                        {subscriber.serialNumber}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                    <Text className="text-xs text-gray-500 w-24">Expires:</Text>
                                                    <Text className="text-xs text-gray-900">
                                                        {formatDate(subscriber.expiryDate)}
                                                    </Text>
                                                </View>
                                                {subscriber.primaryPackageId && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                        <Text className="text-xs text-gray-500 w-24">Package:</Text>
                                                        <Text className="text-xs text-blue-600 font-semibold">
                                                            {subscriber.primaryPackageId.name}
                                                        </Text>
                                                    </View>
                                                )}
                                                {user.role !== 'reseller' && subscriber.resellerId && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Text className="text-xs text-gray-500 w-24">Reseller:</Text>
                                                        <Text className="text-xs text-gray-900">
                                                            {subscriber.resellerId.name}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {/* Action Buttons */}
                                        <View style={{ flexDirection: 'row', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                                            {/* NEW: Show Activate button for Inactive/Fresh */}
                                            {(subscriber.status === 'Inactive' || subscriber.status === 'Fresh') && (
                                                <TouchableOpacity
                                                    onPress={() => handleActivateClick(subscriber)}
                                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#dcfce7', borderRadius: 8, marginRight: 6 }}
                                                >
                                                    <CheckCircle size={16} color="#16a34a" />
                                                    <Text className="text-green-700 font-semibold text-xs ml-1">
                                                        Activate
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                onPress={() => handleViewDetails(subscriber)}
                                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#dbeafe', borderRadius: 8, marginRight: 6 }}
                                            >
                                                <Eye size={16} color="#2563eb" />
                                                <Text className="text-blue-700 font-semibold text-xs ml-1">
                                                    View
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleEdit(subscriber)}
                                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#fef3c7', borderRadius: 8, marginRight: 6 }}
                                            >
                                                <Edit2 size={16} color="#d97706" />
                                                <Text className="text-amber-700 font-semibold text-xs ml-1">
                                                    Edit
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteClick(subscriber)}
                                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#fee2e2', borderRadius: 8 }}
                                            >
                                                <Trash2 size={16} color="#dc2626" />
                                                <Text className="text-red-700 font-semibold text-xs ml-1">
                                                    Delete
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* View Details Modal - SAME AS BEFORE */}
            <Modal
                visible={showViewModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowViewModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <View className="bg-white rounded-2xl w-full max-w-md">
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text className="text-xl font-bold text-gray-900">
                                Subscriber Details
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowViewModal(false)}
                                className="p-2 rounded-lg"
                            >
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-6 py-4 max-h-96">
                            <View>
                                <View style={{ marginBottom: 12 }}>
                                    <Text className="text-sm font-semibold text-gray-600 mb-1">
                                        Subscriber Name
                                    </Text>
                                    <Text className="text-base text-gray-900">
                                        {selectedSubscriber?.subscriberName}
                                    </Text>
                                </View>

                                <View style={{ marginBottom: 12 }}>
                                    <Text className="text-sm font-semibold text-gray-600 mb-1">
                                        MAC Address
                                    </Text>
                                    <Text className="text-base text-gray-900 font-mono">
                                        {selectedSubscriber?.macAddress}
                                    </Text>
                                </View>

                                <View style={{ marginBottom: 12 }}>
                                    <Text className="text-sm font-semibold text-gray-600 mb-1">
                                        Serial Number
                                    </Text>
                                    <Text className="text-base text-gray-900 font-mono">
                                        {selectedSubscriber?.serialNumber}
                                    </Text>
                                </View>

                                <View style={{ marginBottom: 12 }}>
                                    <Text className="text-sm font-semibold text-gray-600 mb-1">
                                        Status
                                    </Text>
                                    {selectedSubscriber && (
                                        <View
                                            style={{
                                                alignSelf: 'flex-start',
                                                paddingHorizontal: 12,
                                                paddingVertical: 4,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                backgroundColor: getStatusColor(selectedSubscriber.status).bg,
                                                borderColor: getStatusColor(selectedSubscriber.status).border,
                                            }}
                                        >
                                            <Text style={{
                                                fontSize: 14,
                                                fontWeight: '600',
                                                color: getStatusColor(selectedSubscriber.status).text,
                                            }}>
                                                {selectedSubscriber.status}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={{ marginBottom: 12 }}>
                                    <Text className="text-sm font-semibold text-gray-600 mb-1">
                                        Expiry Date
                                    </Text>
                                    <Text className="text-base text-gray-900">
                                        {formatDate(selectedSubscriber?.expiryDate)}
                                    </Text>
                                </View>

                                {selectedSubscriber?.primaryPackageId && (
                                    <View style={{ marginBottom: 12 }}>
                                        <Text className="text-sm font-semibold text-gray-600 mb-1">
                                            Package
                                        </Text>
                                        <Text className="text-base text-blue-600 font-semibold">
                                            {selectedSubscriber.primaryPackageId.name} - ₹
                                            {selectedSubscriber.primaryPackageId.cost}
                                        </Text>
                                    </View>
                                )}

                                {user.role !== 'reseller' && selectedSubscriber?.resellerId && (
                                    <View style={{ marginBottom: 12 }}>
                                        <Text className="text-sm font-semibold text-gray-600 mb-1">
                                            Reseller
                                        </Text>
                                        <Text className="text-base text-gray-900">
                                            {selectedSubscriber.resellerId.name}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        <View className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <TouchableOpacity
                                onPress={() => setShowViewModal(false)}
                                className="w-full px-4 py-3 bg-gray-100 rounded-xl"
                            >
                                <Text className="text-gray-700 text-center font-semibold">
                                    Close
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ACTIVATE MODAL */}
            <Modal
                visible={showActivateModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowActivateModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <View className="bg-white rounded-2xl w-full max-w-md">
                        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
                            <View style={{ width: 48, height: 48, backgroundColor: '#dcfce7', borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }}>
                                <CheckCircle size={24} color="#16a34a" />
                            </View>
                            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                                Activate Subscriber
                            </Text>
                            <Text className="text-gray-600 text-center mb-6">
                                Are you sure you want to activate "
                                <Text className="font-semibold">
                                    {selectedSubscriber?.subscriberName}
                                </Text>
                                "? This will set status to Active and extend expiry by 30 days.
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity
                                    onPress={handleActivate}
                                    disabled={submitting}
                                    style={{ flex: 1, marginRight: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#16a34a', borderRadius: 8, opacity: submitting ? 0.5 : 1 }}
                                >
                                    <Text className="text-white text-center font-semibold">
                                        {submitting ? 'Activating...' : 'Activate'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowActivateModal(false);
                                        setSelectedSubscriber(null);
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

            {/* Edit Modal */}
            <Modal
                visible={showEditModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl max-h-[90%]">
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text className="text-xl font-bold text-gray-900">
                                Edit Subscriber
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowEditModal(false)}
                                className="p-2 rounded-lg"
                            >
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-6 py-4" keyboardShouldPersistTaps="handled">
                            <View>
                                {/* Subscriber Name */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Subscriber Name *
                                    </Text>
                                    <TextInput
                                        value={formData.subscriberName}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, subscriberName: text })
                                        }
                                        placeholder="Enter name"
                                        placeholderTextColor="#9ca3af"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* MAC Address */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        MAC Address *
                                    </Text>
                                    <TextInput
                                        value={formData.macAddress}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, macAddress: text })
                                        }
                                        placeholder="00:00:00:00:00:00"
                                        placeholderTextColor="#9ca3af"
                                        autoCapitalize="characters"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono"
                                    />
                                </View>

                                {/* Serial Number */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Serial Number *
                                    </Text>
                                    <TextInput
                                        value={formData.serialNumber}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, serialNumber: text })
                                        }
                                        placeholder="Enter serial number"
                                        placeholderTextColor="#9ca3af"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono"
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
                                            <Picker.Item label="Fresh" value="Fresh" />
                                        </Picker>
                                    </View>
                                </View>

                                {/* Expiry Date */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Expiry Date *
                                    </Text>
                                    <TextInput
                                        value={formData.expiryDate}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, expiryDate: text })
                                        }
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#9ca3af"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                    <Text className="text-xs text-gray-500 mt-1">
                                        Format: YYYY-MM-DD
                                    </Text>
                                </View>

                                {/* Package */}
                                <View style={{ marginBottom: 24 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Package (Optional)
                                    </Text>
                                    <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                        <Picker
                                            selectedValue={formData.package}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, package: value })
                                            }
                                            style={{ height: 50 }}
                                        >
                                            <Picker.Item label="Select Package" value="" />
                                            {packages.map((pkg) => (
                                                <Picker.Item
                                                    key={pkg._id}
                                                    label={`${pkg.name} - ₹${pkg.cost}`}
                                                    value={pkg._id}
                                                />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>

                                {/* Buttons */}
                                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                                    <TouchableOpacity
                                        onPress={handleUpdate}
                                        disabled={submitting}
                                        style={{ flex: 1, marginRight: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 8, opacity: submitting ? 0.5 : 1 }}
                                    >
                                        <Text className="text-white text-center font-semibold">
                                            {submitting ? 'Updating...' : 'Update'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setShowEditModal(false)}
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
                                Delete Subscriber
                            </Text>
                            <Text className="text-gray-600 text-center mb-6">
                                Are you sure you want to delete "
                                <Text className="font-semibold">
                                    {selectedSubscriber?.subscriberName}
                                </Text>
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
                                        setSelectedSubscriber(null);
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

export default Subscribers;
