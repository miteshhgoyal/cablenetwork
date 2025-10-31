// app/(tabs)/credit.js
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
    Plus,
    CreditCard,
    Filter,
    IndianRupee,
    TrendingUp,
    TrendingDown,
    X,
} from 'lucide-react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const Credit = () => {
    const { user } = useAuth();
    const [credits, setCredits] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        type: 'Debit',
        amount: '',
        user: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const canAccess = user?.role !== 'reseller';

    useEffect(() => {
        if (canAccess) {
            fetchCredits();
            fetchUsers();
        }
    }, [typeFilter, canAccess]);

    const fetchCredits = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (typeFilter) params.append('type', typeFilter);

            const response = await api.get(`/credit?${params.toString()}`);
            setCredits(response.data.data.credits);
        } catch (error) {
            console.error('Failed to fetch credits:', error);
            Alert.alert('Error', 'Failed to load credits');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/credit/users');
            setUsers(response.data.data.users);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchCredits();
        fetchUsers();
    };

    const handleOpenModal = () => {
        setFormData({
            type: 'Debit',
            amount: '',
            user: '',
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({
            type: 'Debit',
            amount: '',
            user: '',
        });
    };

    const handleSubmit = async () => {
        if (!formData.amount.trim()) {
            Alert.alert('Error', 'Amount is required');
            return;
        }
        if (!formData.user) {
            Alert.alert('Error', 'Please select a user');
            return;
        }

        setSubmitting(true);

        try {
            await api.post('/credit', formData);
            Alert.alert('Success', 'Credit transaction created successfully');
            fetchCredits();
            fetchUsers();
            handleCloseModal();
        } catch (error) {
            console.error('Submit error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCredits = credits.filter((credit) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            credit.user?.name.toLowerCase().includes(searchLower) ||
            credit.user?.email.toLowerCase().includes(searchLower) ||
            credit.amount.toString().includes(searchLower)
        );
    });

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!canAccess) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center px-4">
                <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                    <X size={32} color="#dc2626" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
                    Access Denied
                </Text>
                <Text className="text-gray-600 text-center">
                    You do not have permission to access this page.
                </Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-200 px-4 py-4">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                        <View className="p-2 bg-blue-50 rounded-xl mr-3">
                            <CreditCard size={24} color="#2563eb" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-gray-900">
                                Credit Management
                            </Text>
                            <Text className="text-xs text-gray-600">
                                Manage user credits and transactions
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
                        onPress={handleOpenModal}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 8 }}
                    >
                        <Plus size={18} color="#ffffff" />
                        <Text className="text-white font-semibold ml-2">Add Credit</Text>
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
                        placeholder="Search by username, email, or amount..."
                        placeholderTextColor="#9ca3af"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900"
                    />
                </View>

                {showFilters && (
                    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                            Type
                        </Text>
                        <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden mb-3">
                            <Picker
                                selectedValue={typeFilter}
                                onValueChange={(value) => setTypeFilter(value)}
                                style={{ height: 50 }}
                            >
                                <Picker.Item label="All Types" value="" />
                                <Picker.Item label="Debit" value="Debit" />
                                <Picker.Item label="Reverse Credit" value="Reverse Credit" />
                            </Picker>
                        </View>

                        {typeFilter && (
                            <TouchableOpacity
                                onPress={() => setTypeFilter('')}
                                style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}
                            >
                                <Text className="text-sm text-blue-600 font-semibold">
                                    Clear all filters
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Stats Cards */}
                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                    <View className="flex-1 bg-white rounded-xl p-4 border border-gray-200 mr-3">
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View>
                                <Text className="text-xs text-gray-600 mb-1">Total Debits</Text>
                                <Text className="text-xl font-bold text-green-600">
                                    {credits.filter((c) => c.type === 'Debit').length}
                                </Text>
                            </View>
                            <View className="p-2 bg-green-50 rounded-xl">
                                <TrendingUp size={20} color="#16a34a" />
                            </View>
                        </View>
                    </View>
                    <View className="flex-1 bg-white rounded-xl p-4 border border-gray-200">
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View>
                                <Text className="text-xs text-gray-600 mb-1">Reverse Credits</Text>
                                <Text className="text-xl font-bold text-red-600">
                                    {credits.filter((c) => c.type === 'Reverse Credit').length}
                                </Text>
                            </View>
                            <View className="p-2 bg-red-50 rounded-xl">
                                <TrendingDown size={20} color="#dc2626" />
                            </View>
                        </View>
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
                    {filteredCredits.length === 0 ? (
                        <View className="py-12">
                            <Text className="text-center text-gray-500">
                                No credit transactions found
                            </Text>
                        </View>
                    ) : (
                        <View style={{ marginBottom: 16 }}>
                            {filteredCredits.map((credit, index) => (
                                <View
                                    key={credit._id}
                                    className="bg-white rounded-xl border border-gray-200 p-4"
                                    style={{ marginBottom: 12 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text className="text-base font-bold text-gray-900 mb-1">
                                                {credit.user?.name || 'N/A'}
                                            </Text>
                                            <Text className="text-xs text-gray-500 mb-2">
                                                {credit.user?.email || 'N/A'}
                                            </Text>
                                            <View
                                                style={{
                                                    alignSelf: 'flex-start',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 4,
                                                    borderRadius: 20,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    borderWidth: 1,
                                                    backgroundColor: credit.type === 'Debit' ? '#dcfce7' : '#fee2e2',
                                                    borderColor: credit.type === 'Debit' ? '#bbf7d0' : '#fecaca',
                                                }}
                                            >
                                                {credit.type === 'Debit' ? (
                                                    <TrendingUp size={12} color="#16a34a" />
                                                ) : (
                                                    <TrendingDown size={12} color="#dc2626" />
                                                )}
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: '600',
                                                        marginLeft: 4,
                                                        color: credit.type === 'Debit' ? '#166534' : '#991b1b',
                                                    }}
                                                >
                                                    {credit.type}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={{ alignItems: 'flex-end' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                <IndianRupee size={16} color={credit.type === 'Debit' ? '#16a34a' : '#dc2626'} />
                                                <Text
                                                    style={{
                                                        fontSize: 18,
                                                        fontWeight: 'bold',
                                                        color: credit.type === 'Debit' ? '#16a34a' : '#dc2626',
                                                    }}
                                                >
                                                    {credit.type === 'Debit' ? '+' : '-'}
                                                    {credit.amount}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text className="text-xs text-gray-600 mr-1">Balance:</Text>
                                                <IndianRupee size={12} color="#6b7280" />
                                                <Text className="text-xs text-gray-900 font-semibold">
                                                    {credit.user?.balance || 0}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text className="text-xs text-gray-500">
                                                By: {user?.name || 'System'}
                                            </Text>
                                            <Text className="text-xs text-gray-500">
                                                {formatDate(credit.createdAt)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Add Credit Modal */}
            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={handleCloseModal}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl max-h-[85%]">
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text className="text-xl font-bold text-gray-900">
                                Add Credit Transaction
                            </Text>
                            <TouchableOpacity onPress={handleCloseModal} className="p-2 rounded-lg">
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-6 py-4" keyboardShouldPersistTaps="handled">
                            <View>
                                {/* Type */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-3">
                                        Type *
                                    </Text>
                                    <View style={{ flexDirection: 'row' }}>
                                        <TouchableOpacity
                                            onPress={() => setFormData({ ...formData, type: 'Debit' })}
                                            style={{
                                                flex: 1,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                paddingHorizontal: 16,
                                                paddingVertical: 12,
                                                borderRadius: 8,
                                                borderWidth: 2,
                                                marginRight: 12,
                                                backgroundColor: formData.type === 'Debit' ? '#dcfce7' : '#f9fafb',
                                                borderColor: formData.type === 'Debit' ? '#16a34a' : '#e5e7eb',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontWeight: '600',
                                                    color: formData.type === 'Debit' ? '#166534' : '#374151',
                                                }}
                                            >
                                                Debit
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setFormData({ ...formData, type: 'Reverse Credit' })}
                                            style={{
                                                flex: 1,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                paddingHorizontal: 16,
                                                paddingVertical: 12,
                                                borderRadius: 8,
                                                borderWidth: 2,
                                                backgroundColor: formData.type === 'Reverse Credit' ? '#fee2e2' : '#f9fafb',
                                                borderColor: formData.type === 'Reverse Credit' ? '#dc2626' : '#e5e7eb',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontWeight: '600',
                                                    fontSize: 12,
                                                    color: formData.type === 'Reverse Credit' ? '#991b1b' : '#374151',
                                                }}
                                            >
                                                Reverse Credit
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Amount */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Amount *
                                    </Text>
                                    <TextInput
                                        value={formData.amount}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, amount: text })
                                        }
                                        placeholder="Enter Amount"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="numeric"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* User */}
                                <View style={{ marginBottom: 24 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        User *
                                    </Text>
                                    <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                        <Picker
                                            selectedValue={formData.user}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, user: value })
                                            }
                                            style={{ height: 50 }}
                                        >
                                            <Picker.Item label="Select User" value="" />
                                            {users.map((u) => (
                                                <Picker.Item
                                                    key={u._id}
                                                    label={`${u.name} - ₹${u.balance} (${u.role})`}
                                                    value={u._id}
                                                />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>

                                {/* Buttons */}
                                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                                    <TouchableOpacity
                                        onPress={handleSubmit}
                                        disabled={submitting}
                                        style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 8, marginRight: 12, opacity: submitting ? 0.5 : 1 }}
                                    >
                                        <Text className="text-white text-center font-semibold">
                                            {submitting ? 'Creating...' : 'Create'}
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
        </SafeAreaView>
    );
};

export default Credit;
