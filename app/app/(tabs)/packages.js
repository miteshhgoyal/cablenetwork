// app/(tabs)/packages.js
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
import { useAuth } from '../../context/authContext';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    Package as PackageIcon,
    Eye,
    IndianRupee,
    Calendar,
} from 'lucide-react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const Packages = () => {
    const { user } = useAuth();
    const [packages, setPackages] = useState([]);
    const [genres, setGenres] = useState([]);
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        cost: '',
        genres: [],
        channels: [],
        duration: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const canModify = user?.role !== 'reseller';

    useEffect(() => {
        fetchPackages();
        if (canModify) {
            fetchOptions();
        }
    }, []);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const response = await api.get('/packages');
            setPackages(response.data.data.packages);
        } catch (error) {
            console.error('Failed to fetch packages:', error);
            Alert.alert('Error', 'Failed to load packages');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const response = await api.get('/packages/options');
            setGenres(response.data.data.genres);
            setChannels(response.data.data.channels);
        } catch (error) {
            console.error('Failed to fetch options:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPackages();
    };

    const handleOpenModal = (mode, pkg = null) => {
        setModalMode(mode);
        if (mode === 'edit' && pkg) {
            setSelectedPackage(pkg);
            setFormData({
                name: pkg.name,
                cost: pkg.cost.toString(),
                genres: pkg.genres?.map((g) => g._id) || [],
                channels: pkg.channels?.map((c) => c._id) || [],
                duration: pkg.duration.toString(),
            });
        } else {
            setFormData({
                name: '',
                cost: '',
                genres: [],
                channels: [],
                duration: '',
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedPackage(null);
        setFormData({
            name: '',
            cost: '',
            genres: [],
            channels: [],
            duration: '',
        });
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Package name is required');
            return;
        }
        if (!formData.cost.trim()) {
            Alert.alert('Error', 'Cost is required');
            return;
        }
        if (!formData.duration.trim()) {
            Alert.alert('Error', 'Duration is required');
            return;
        }

        setSubmitting(true);

        try {
            if (modalMode === 'create') {
                await api.post('/packages', formData);
                Alert.alert('Success', 'Package created successfully');
            } else {
                await api.put(`/packages/${selectedPackage._id}`, formData);
                Alert.alert('Success', 'Package updated successfully');
            }
            fetchPackages();
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
            await api.delete(`/packages/${selectedPackage._id}`);
            Alert.alert('Success', 'Package deleted successfully');
            fetchPackages();
            setShowDeleteModal(false);
            setSelectedPackage(null);
        } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Delete failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewDetails = (pkg) => {
        setSelectedPackage(pkg);
        setShowViewModal(true);
    };

    const filteredPackages = packages.filter((pkg) =>
        pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getDurationText = (days) => {
        if (days >= 365) {
            const years = Math.floor(days / 365);
            return `${years} Year${years > 1 ? 's' : ''}`;
        } else if (days >= 30) {
            const months = Math.floor(days / 30);
            return `${months} Month${months > 1 ? 's' : ''}`;
        }
        return `${days} Day${days > 1 ? 's' : ''}`;
    };

    const toggleSelection = (array, item) => {
        if (array.includes(item)) {
            return array.filter((i) => i !== item);
        } else {
            return [...array, item];
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-200 px-4 py-4">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                        <View className="p-2 bg-blue-50 rounded-xl mr-3">
                            <PackageIcon size={24} color="#2563eb" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-gray-900">Packages</Text>
                            <Text className="text-xs text-gray-600">
                                {canModify ? 'Manage subscription packages' : 'View available packages'}
                            </Text>
                        </View>
                    </View>
                </View>

                {canModify && (
                    <TouchableOpacity
                        onPress={() => handleOpenModal('create')}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 8 }}
                    >
                        <Plus size={18} color="#ffffff" style={{ marginRight: 8 }} />
                        <Text className="text-white font-semibold">Add Package</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Search */}
            <View className="px-4 py-4">
                <View className="relative">
                    <View className="absolute left-4 top-1/2 -translate-y-2.5 z-10">
                        <Search size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                        placeholder="Search packages..."
                        placeholderTextColor="#9ca3af"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900"
                    />
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
                    {filteredPackages.length === 0 ? (
                        <View className="py-12">
                            <Text className="text-center text-gray-500">No packages found</Text>
                        </View>
                    ) : (
                        <View style={{ marginBottom: 16 }}>
                            {filteredPackages.map((pkg, index) => (
                                <View
                                    key={pkg._id}
                                    className="bg-white rounded-xl border border-gray-200 p-4"
                                    style={{ marginBottom: 12 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text className="text-lg font-bold text-gray-900" style={{ marginBottom: 8 }}>
                                                {pkg.name}
                                            </Text>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                                                    <IndianRupee size={16} color="#059669" />
                                                    <Text className="text-base font-bold text-green-600 ml-1">
                                                        {pkg.cost}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Calendar size={16} color="#6b7280" />
                                                    <Text className="text-sm text-gray-600 ml-1">
                                                        {getDurationText(pkg.duration)}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                {pkg.genres && pkg.genres.length > 0 && (
                                                    <Text className="text-xs text-gray-500" style={{ marginRight: 12 }}>
                                                        {pkg.genres.length} Genre{pkg.genres.length > 1 ? 's' : ''}
                                                    </Text>
                                                )}
                                                {pkg.channels && pkg.channels.length > 0 && (
                                                    <Text className="text-xs text-gray-500">
                                                        {pkg.channels.length} Channel{pkg.channels.length > 1 ? 's' : ''}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>

                                    {/* Action Buttons */}
                                    <View style={{ flexDirection: 'row', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                                        <TouchableOpacity
                                            onPress={() => handleViewDetails(pkg)}
                                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f3f4f6', borderRadius: 8, marginRight: 8 }}
                                        >
                                            <Eye size={16} color="#6b7280" />
                                            <Text className="text-gray-700 font-semibold text-xs ml-1">
                                                View
                                            </Text>
                                        </TouchableOpacity>
                                        {canModify && (
                                            <>
                                                <TouchableOpacity
                                                    onPress={() => handleOpenModal('edit', pkg)}
                                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#dbeafe', borderRadius: 8, marginRight: 8 }}
                                                >
                                                    <Edit2 size={16} color="#2563eb" />
                                                    <Text className="text-blue-700 font-semibold text-xs ml-1">
                                                        Edit
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSelectedPackage(pkg);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fee2e2', borderRadius: 8 }}
                                                >
                                                    <Trash2 size={16} color="#dc2626" />
                                                    <Text className="text-red-700 font-semibold text-xs ml-1">
                                                        Delete
                                                    </Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
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
                                {modalMode === 'create' ? 'Add Package' : 'Edit Package'}
                            </Text>
                            <TouchableOpacity onPress={handleCloseModal} className="p-2 rounded-lg">
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-6 py-4" keyboardShouldPersistTaps="handled">
                            <View>
                                {/* Package Name */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Package Name *
                                    </Text>
                                    <TextInput
                                        value={formData.name}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, name: text })
                                        }
                                        placeholder="Enter package name"
                                        placeholderTextColor="#9ca3af"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Cost */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Cost (₹) *
                                    </Text>
                                    <TextInput
                                        value={formData.cost}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, cost: text })
                                        }
                                        placeholder="Enter cost"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="numeric"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Duration */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Duration (Days) *
                                    </Text>
                                    <TextInput
                                        value={formData.duration}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, duration: text })
                                        }
                                        placeholder="Enter duration in days"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="numeric"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Genres */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Genres (Optional) - Tap to select
                                    </Text>
                                    <View className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-40">
                                        <ScrollView>
                                            {genres.map((genre) => (
                                                <TouchableOpacity
                                                    key={genre._id}
                                                    onPress={() =>
                                                        setFormData({
                                                            ...formData,
                                                            genres: toggleSelection(formData.genres, genre._id),
                                                        })
                                                    }
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        borderRadius: 8,
                                                        marginBottom: 8,
                                                        backgroundColor: formData.genres.includes(genre._id) ? '#dbeafe' : '#ffffff',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 14,
                                                            color: formData.genres.includes(genre._id) ? '#1e40af' : '#374151',
                                                            fontWeight: formData.genres.includes(genre._id) ? '600' : '400',
                                                        }}
                                                    >
                                                        {genre.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                    <Text className="text-xs text-gray-500 mt-1">
                                        Selected: {formData.genres.length}
                                    </Text>
                                </View>

                                {/* Channels */}
                                <View style={{ marginBottom: 24 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Channels (Optional) - Tap to select
                                    </Text>
                                    <View className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-40">
                                        <ScrollView>
                                            {channels.map((channel) => (
                                                <TouchableOpacity
                                                    key={channel._id}
                                                    onPress={() =>
                                                        setFormData({
                                                            ...formData,
                                                            channels: toggleSelection(formData.channels, channel._id),
                                                        })
                                                    }
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        borderRadius: 8,
                                                        marginBottom: 8,
                                                        backgroundColor: formData.channels.includes(channel._id) ? '#dbeafe' : '#ffffff',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 14,
                                                            color: formData.channels.includes(channel._id) ? '#1e40af' : '#374151',
                                                            fontWeight: formData.channels.includes(channel._id) ? '600' : '400',
                                                        }}
                                                    >
                                                        {channel.lcn} - {channel.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                    <Text className="text-xs text-gray-500 mt-1">
                                        Selected: {formData.channels.length}
                                    </Text>
                                </View>

                                {/* Buttons */}
                                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                                    <TouchableOpacity
                                        onPress={handleSubmit}
                                        disabled={submitting}
                                        style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 8, marginRight: 12, opacity: submitting ? 0.5 : 1 }}
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

            {/* View Details Modal */}
            <Modal
                visible={showViewModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowViewModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <View className="bg-white rounded-2xl w-full max-w-md max-h-[80%]">
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text className="text-xl font-bold text-gray-900">
                                Package Details
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowViewModal(false)}
                                className="p-2 rounded-lg"
                            >
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-6 py-4">
                            <View>
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-600 mb-1">
                                        Package Name
                                    </Text>
                                    <Text className="text-base text-gray-900">
                                        {selectedPackage?.name}
                                    </Text>
                                </View>

                                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                                    <View style={{ flex: 1, marginRight: 16 }}>
                                        <Text className="text-sm font-semibold text-gray-600 mb-1">
                                            Cost
                                        </Text>
                                        <View className="flex-row items-center">
                                            <IndianRupee size={16} color="#059669" />
                                            <Text className="text-base text-green-600 font-bold ml-1">
                                                {selectedPackage?.cost}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text className="text-sm font-semibold text-gray-600 mb-1">
                                            Duration
                                        </Text>
                                        <Text className="text-base text-gray-900">
                                            {getDurationText(selectedPackage?.duration || 0)}
                                        </Text>
                                    </View>
                                </View>

                                {selectedPackage?.genres && selectedPackage.genres.length > 0 && (
                                    <View style={{ marginBottom: 16 }}>
                                        <Text className="text-sm font-semibold text-gray-600 mb-2">
                                            Genres ({selectedPackage.genres.length})
                                        </Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                            {selectedPackage.genres.map((genre) => (
                                                <View
                                                    key={genre._id}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 4,
                                                        backgroundColor: '#f3e8ff',
                                                        borderWidth: 1,
                                                        borderColor: '#e9d5ff',
                                                        borderRadius: 20,
                                                        marginRight: 8,
                                                        marginBottom: 8,
                                                    }}
                                                >
                                                    <Text className="text-xs text-purple-700 font-semibold">
                                                        {genre.name}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {selectedPackage?.channels && selectedPackage.channels.length > 0 && (
                                    <View>
                                        <Text className="text-sm font-semibold text-gray-600 mb-2">
                                            Channels ({selectedPackage.channels.length})
                                        </Text>
                                        <View className="bg-gray-50 rounded-xl p-3 max-h-48">
                                            <ScrollView>
                                                {selectedPackage.channels.map((channel) => (
                                                    <View
                                                        key={channel._id}
                                                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                                                    >
                                                        <View className="bg-white px-2 py-1 rounded border border-gray-200 mr-2">
                                                            <Text className="text-xs font-mono text-gray-700">
                                                                {channel.lcn}
                                                            </Text>
                                                        </View>
                                                        <Text className="text-sm text-gray-900">
                                                            {channel.name}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </ScrollView>
                                        </View>
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

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <View className="bg-white rounded-2xl w-full max-w-md">
                        <View className="p-6">
                            <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} color="#dc2626" />
                            </View>
                            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                                Delete Package
                            </Text>
                            <Text className="text-gray-600 text-center mb-6">
                                Are you sure you want to delete "
                                <Text className="font-semibold">{selectedPackage?.name}</Text>
                                "? This action cannot be undone.
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    disabled={submitting}
                                    style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#dc2626', borderRadius: 8, marginRight: 12, opacity: submitting ? 0.5 : 1 }}
                                >
                                    <Text className="text-white text-center font-semibold">
                                        {submitting ? 'Deleting...' : 'Delete'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowDeleteModal(false);
                                        setSelectedPackage(null);
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

export default Packages;
