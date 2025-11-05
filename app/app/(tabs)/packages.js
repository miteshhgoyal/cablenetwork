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
    Check,
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

    const toggleGenre = (genreId) => {
        if (formData.genres.includes(genreId)) {
            setFormData({
                ...formData,
                genres: formData.genres.filter((id) => id !== genreId),
            });
        } else {
            setFormData({
                ...formData,
                genres: [...formData.genres, genreId],
            });
        }
    };

    const toggleChannel = (channelId) => {
        if (formData.channels.includes(channelId)) {
            setFormData({
                ...formData,
                channels: formData.channels.filter((id) => id !== channelId),
            });
        } else {
            setFormData({
                ...formData,
                channels: [...formData.channels, channelId],
            });
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            {/* Header */}
            <View style={{ backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 40, height: 40, backgroundColor: '#eff6ff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                            <PackageIcon size={24} color="#2563eb" />
                        </View>
                        <View>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
                                Packages
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                {canModify ? 'Manage subscription packages' : 'View available packages'}
                            </Text>
                        </View>
                    </View>
                </View>

                {canModify && (
                    <TouchableOpacity
                        onPress={() => handleOpenModal('create')}
                        activeOpacity={0.8}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            backgroundColor: '#2563eb',
                            borderRadius: 8,
                        }}
                    >
                        <Plus size={18} color="#ffffff" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>
                            Add Package
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <View style={{ position: 'relative' }}>
                    <View style={{ position: 'absolute', left: 12, top: '50%', zIndex: 10 }}>
                        <Search size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                        placeholder="Search packages..."
                        placeholderTextColor="#9ca3af"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        style={{
                            width: '100%',
                            paddingLeft: 40,
                            paddingRight: 16,
                            paddingVertical: 12,
                            backgroundColor: '#ffffff',
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            fontSize: 14,
                            color: '#111827',
                        }}
                    />
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1, paddingHorizontal: 16 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {filteredPackages.length === 0 ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, color: '#6b7280' }}>
                                No packages found
                            </Text>
                        </View>
                    ) : (
                        <View style={{ paddingBottom: 20 }}>
                            {filteredPackages.map((pkg, index) => (
                                <View
                                    key={pkg._id}
                                    style={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#e5e7eb',
                                        paddingHorizontal: 16,
                                        paddingVertical: 16,
                                        marginBottom: 12,
                                    }}
                                >
                                    <View style={{ marginBottom: 12 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
                                            {pkg.name}
                                        </Text>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                                                <IndianRupee size={16} color="#059669" />
                                                <Text style={{ fontSize: 16, fontWeight: '700', color: '#16a34a', marginLeft: 4 }}>
                                                    {pkg.cost}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Calendar size={16} color="#6b7280" />
                                                <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>
                                                    {getDurationText(pkg.duration)}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {pkg.genres && pkg.genres.length > 0 && (
                                                <Text style={{ fontSize: 12, color: '#6b7280', marginRight: 12 }}>
                                                    {pkg.genres.length} Genre{pkg.genres.length > 1 ? 's' : ''}
                                                </Text>
                                            )}
                                            {pkg.channels && pkg.channels.length > 0 && (
                                                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                                    {pkg.channels.length} Channel{pkg.channels.length > 1 ? 's' : ''}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Action Buttons */}
                                    <View style={{ flexDirection: 'row', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                                        <TouchableOpacity
                                            onPress={() => handleViewDetails(pkg)}
                                            activeOpacity={0.7}
                                            style={{
                                                flex: 1,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                paddingHorizontal: 12,
                                                paddingVertical: 8,
                                                backgroundColor: '#f3f4f6',
                                                borderRadius: 6,
                                                marginRight: 8,
                                            }}
                                        >
                                            <Eye size={14} color="#6b7280" />
                                            <Text style={{ color: '#374151', fontWeight: '600', fontSize: 12, marginLeft: 4 }}>
                                                View
                                            </Text>
                                        </TouchableOpacity>
                                        {canModify && (
                                            <>
                                                <TouchableOpacity
                                                    onPress={() => handleOpenModal('edit', pkg)}
                                                    activeOpacity={0.7}
                                                    style={{
                                                        flex: 1,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        backgroundColor: '#dbeafe',
                                                        borderRadius: 6,
                                                        marginRight: 8,
                                                    }}
                                                >
                                                    <Edit2 size={14} color="#2563eb" />
                                                    <Text style={{ color: '#1e40af', fontWeight: '600', fontSize: 12, marginLeft: 4 }}>
                                                        Edit
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSelectedPackage(pkg);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    activeOpacity={0.7}
                                                    style={{
                                                        flex: 1,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        backgroundColor: '#fee2e2',
                                                        borderRadius: 6,
                                                    }}
                                                >
                                                    <Trash2 size={14} color="#dc2626" />
                                                    <Text style={{ color: '#b91c1c', fontWeight: '600', fontSize: 12, marginLeft: 4 }}>
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
                <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
                                {modalMode === 'create' ? 'Add Package' : 'Edit Package'}
                            </Text>
                            <TouchableOpacity onPress={handleCloseModal} activeOpacity={0.7}>
                                <X size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={{ paddingHorizontal: 24, paddingVertical: 16 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Package Name */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
                                    PACKAGE NAME *
                                </Text>
                                <TextInput
                                    value={formData.name}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, name: text })
                                    }
                                    placeholder="Enter package name"
                                    placeholderTextColor="#9ca3af"
                                    style={{
                                        width: '100%',
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        backgroundColor: '#f3f4f6',
                                        borderWidth: 1,
                                        borderColor: '#d1d5db',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        color: '#111827',
                                    }}
                                />
                            </View>

                            {/* Cost */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
                                    COST (₹) *
                                </Text>
                                <TextInput
                                    value={formData.cost}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, cost: text })
                                    }
                                    placeholder="Enter cost"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="numeric"
                                    style={{
                                        width: '100%',
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        backgroundColor: '#f3f4f6',
                                        borderWidth: 1,
                                        borderColor: '#d1d5db',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        color: '#111827',
                                    }}
                                />
                            </View>

                            {/* Duration */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
                                    DURATION (DAYS) *
                                </Text>
                                <TextInput
                                    value={formData.duration}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, duration: text })
                                    }
                                    placeholder="Enter duration in days"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="numeric"
                                    style={{
                                        width: '100%',
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        backgroundColor: '#f3f4f6',
                                        borderWidth: 1,
                                        borderColor: '#d1d5db',
                                        borderRadius: 8,
                                        fontSize: 14,
                                        color: '#111827',
                                    }}
                                />
                            </View>

                            {/* Genres with Checkmarks */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
                                    GENRES (OPTIONAL)
                                </Text>
                                <View style={{ backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 200 }}>
                                    {genres.length === 0 ? (
                                        <Text style={{ fontSize: 12, color: '#6b7280', paddingVertical: 8 }}>
                                            No genres available
                                        </Text>
                                    ) : (
                                        <ScrollView nestedScrollEnabled>
                                            {genres.map((genre) => (
                                                <TouchableOpacity
                                                    key={genre._id}
                                                    onPress={() => toggleGenre(genre._id)}
                                                    activeOpacity={0.7}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        paddingVertical: 10,
                                                        paddingHorizontal: 8,
                                                        borderRadius: 6,
                                                        backgroundColor: formData.genres.includes(genre._id) ? '#eff6ff' : '#ffffff',
                                                        marginBottom: 6,
                                                        borderWidth: formData.genres.includes(genre._id) ? 1.5 : 1,
                                                        borderColor: formData.genres.includes(genre._id) ? '#3b82f6' : '#e5e7eb',
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            width: 20,
                                                            height: 20,
                                                            borderRadius: 4,
                                                            borderWidth: 2,
                                                            borderColor: formData.genres.includes(genre._id) ? '#3b82f6' : '#d1d5db',
                                                            backgroundColor: formData.genres.includes(genre._id) ? '#3b82f6' : '#ffffff',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: 10,
                                                        }}
                                                    >
                                                        {formData.genres.includes(genre._id) && (
                                                            <Check size={14} color="#ffffff" />
                                                        )}
                                                    </View>
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
                                    )}
                                </View>
                                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                                    Selected: {formData.genres.length}
                                </Text>
                            </View>

                            {/* Channels with Checkmarks */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
                                    CHANNELS (OPTIONAL)
                                </Text>
                                <View style={{ backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 200 }}>
                                    {channels.length === 0 ? (
                                        <Text style={{ fontSize: 12, color: '#6b7280', paddingVertical: 8 }}>
                                            No channels available
                                        </Text>
                                    ) : (
                                        <ScrollView nestedScrollEnabled>
                                            {channels.map((channel) => (
                                                <TouchableOpacity
                                                    key={channel._id}
                                                    onPress={() => toggleChannel(channel._id)}
                                                    activeOpacity={0.7}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        paddingVertical: 10,
                                                        paddingHorizontal: 8,
                                                        borderRadius: 6,
                                                        backgroundColor: formData.channels.includes(channel._id) ? '#eff6ff' : '#ffffff',
                                                        marginBottom: 6,
                                                        borderWidth: formData.channels.includes(channel._id) ? 1.5 : 1,
                                                        borderColor: formData.channels.includes(channel._id) ? '#3b82f6' : '#e5e7eb',
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            width: 20,
                                                            height: 20,
                                                            borderRadius: 4,
                                                            borderWidth: 2,
                                                            borderColor: formData.channels.includes(channel._id) ? '#3b82f6' : '#d1d5db',
                                                            backgroundColor: formData.channels.includes(channel._id) ? '#3b82f6' : '#ffffff',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: 10,
                                                        }}
                                                    >
                                                        {formData.channels.includes(channel._id) && (
                                                            <Check size={14} color="#ffffff" />
                                                        )}
                                                    </View>
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
                                    )}
                                </View>
                                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                                    Selected: {formData.channels.length}
                                </Text>
                            </View>

                            {/* Buttons */}
                            <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={submitting}
                                    activeOpacity={0.8}
                                    style={{
                                        flex: 1,
                                        paddingHorizontal: 16,
                                        paddingVertical: 14,
                                        backgroundColor: submitting ? '#d1d5db' : '#2563eb',
                                        borderRadius: 8,
                                        marginRight: 12,
                                    }}
                                >
                                    <Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: '700', fontSize: 14 }}>
                                        {submitting
                                            ? 'Saving...'
                                            : modalMode === 'create'
                                                ? 'Create'
                                                : 'Update'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleCloseModal}
                                    activeOpacity={0.8}
                                    style={{
                                        flex: 1,
                                        paddingHorizontal: 16,
                                        paddingVertical: 14,
                                        backgroundColor: '#f3f4f6',
                                        borderRadius: 8,
                                    }}
                                >
                                    <Text style={{ color: '#374151', textAlign: 'center', fontWeight: '700', fontSize: 14 }}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
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
                <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, width: '100%', maxHeight: '80%' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
                                Package Details
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowViewModal(false)}
                                activeOpacity={0.7}
                            >
                                <X size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 4 }}>
                                    PACKAGE NAME
                                </Text>
                                <Text style={{ fontSize: 16, color: '#111827', fontWeight: '600' }}>
                                    {selectedPackage?.name}
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                                <View style={{ flex: 1, marginRight: 16 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 4 }}>
                                        COST
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <IndianRupee size={16} color="#059669" />
                                        <Text style={{ fontSize: 16, color: '#16a34a', fontWeight: '700', marginLeft: 4 }}>
                                            {selectedPackage?.cost}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 4 }}>
                                        DURATION
                                    </Text>
                                    <Text style={{ fontSize: 16, color: '#111827', fontWeight: '600' }}>
                                        {getDurationText(selectedPackage?.duration || 0)}
                                    </Text>
                                </View>
                            </View>

                            {selectedPackage?.genres && selectedPackage.genres.length > 0 && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 8 }}>
                                        GENRES ({selectedPackage.genres.length})
                                    </Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                        {selectedPackage.genres.map((genre) => (
                                            <View
                                                key={genre._id}
                                                style={{
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    backgroundColor: '#f3e8ff',
                                                    borderWidth: 1,
                                                    borderColor: '#e9d5ff',
                                                    borderRadius: 16,
                                                    marginRight: 8,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <Text style={{ fontSize: 12, color: '#9333ea', fontWeight: '600' }}>
                                                    {genre.name}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {selectedPackage?.channels && selectedPackage.channels.length > 0 && (
                                <View>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 8 }}>
                                        CHANNELS ({selectedPackage.channels.length})
                                    </Text>
                                    <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 200 }}>
                                        <ScrollView nestedScrollEnabled>
                                            {selectedPackage.channels.map((channel) => (
                                                <View
                                                    key={channel._id}
                                                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                                                >
                                                    <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#d1d5db', marginRight: 8 }}>
                                                        <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', fontWeight: '600' }}>
                                                            {channel.lcn}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ fontSize: 14, color: '#111827' }}>
                                                        {channel.name}
                                                    </Text>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={{ paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#f3f4f6', borderTopWidth: 1, borderTopColor: '#d1d5db' }}>
                            <TouchableOpacity
                                onPress={() => setShowViewModal(false)}
                                activeOpacity={0.8}
                                style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#d1d5db', borderRadius: 8 }}
                            >
                                <Text style={{ color: '#374151', textAlign: 'center', fontWeight: '700', fontSize: 14 }}>
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
                <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, width: '100%' }}>
                        <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 24 }}>
                            <View style={{ width: 48, height: 48, backgroundColor: '#fee2e2', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Trash2 size={28} color="#dc2626" />
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
                                Delete Package
                            </Text>
                            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
                                Are you sure you want to delete{'\n'}
                                <Text style={{ fontWeight: '600' }}>"{selectedPackage?.name}"</Text>?{'\n'}
                                This action cannot be undone.
                            </Text>
                            <View style={{ flexDirection: 'row', width: '100%' }}>
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    disabled={submitting}
                                    activeOpacity={0.8}
                                    style={{
                                        flex: 1,
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        backgroundColor: submitting ? '#fca5a5' : '#dc2626',
                                        borderRadius: 8,
                                        marginRight: 12,
                                    }}
                                >
                                    <Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: '700', fontSize: 14 }}>
                                        {submitting ? 'Deleting...' : 'Delete'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowDeleteModal(false);
                                        setSelectedPackage(null);
                                    }}
                                    activeOpacity={0.8}
                                    style={{
                                        flex: 1,
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        backgroundColor: '#f3f4f6',
                                        borderRadius: 8,
                                    }}
                                >
                                    <Text style={{ color: '#374151', textAlign: 'center', fontWeight: '700', fontSize: 14 }}>
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
