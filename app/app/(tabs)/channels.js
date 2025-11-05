// app/(tabs)/channels.js
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
    Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    Radio,
    Lock,
    Unlock,
    AlertCircle,
} from 'lucide-react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const Channels = () => {
    const [channels, setChannels] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [userRole, setUserRole] = useState('user');
    const [canAccessUrls, setCanAccessUrls] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [urlAccessToggling, setUrlAccessToggling] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        lcn: '',
        language: '',
        genre: '',
        url: '',
        imageUrl: '',
    });

    useEffect(() => {
        fetchChannels();
        fetchCategories();
    }, []);

    const fetchChannels = async () => {
        try {
            setLoading(true);
            const response = await api.get('/channels');
            setChannels(response.data.data.channels);
            setUserRole(response.data.data.userRole || 'user');
            setCanAccessUrls(response.data.data.canAccessUrls || false);
        } catch (error) {
            console.error('Failed to fetch channels:', error);
            Alert.alert('Error', 'Failed to load channels');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/channels/categories');
            setLanguages(response.data.data.languages);
            setGenres(response.data.data.genres);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchChannels();
    };

    const handleOpenModal = (mode, channel = null) => {
        setModalMode(mode);
        if (mode === 'edit' && channel) {
            setSelectedChannel(channel);
            setFormData({
                name: channel.name,
                lcn: channel.lcn.toString(),
                language: channel.language?._id || '',
                genre: channel.genre?._id || '',
                url: channel.url || '',
                imageUrl: channel.imageUrl || '',
            });
        } else {
            setFormData({
                name: '',
                lcn: '',
                language: '',
                genre: '',
                url: '',
                imageUrl: '',
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedChannel(null);
        setFormData({
            name: '',
            lcn: '',
            language: '',
            genre: '',
            url: '',
            imageUrl: '',
        });
    };

    const canEditUrlFields = () => {
        if (userRole === 'admin') return true;
        if (userRole === 'distributor' && selectedChannel) {
            return selectedChannel.urlsAccessible;
        }
        return false;
    };

    const shouldShowUrlFields = () => {
        if (userRole === 'admin') return true;
        if (userRole === 'distributor') return true;
        return canAccessUrls;
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Channel name is required');
            return;
        }
        if (!formData.lcn.trim()) {
            Alert.alert('Error', 'LCN number is required');
            return;
        }
        if (!formData.language) {
            Alert.alert('Error', 'Language is required');
            return;
        }
        if (!formData.genre) {
            Alert.alert('Error', 'Genre is required');
            return;
        }
        if (shouldShowUrlFields()) {
            if (!formData.url.trim()) {
                Alert.alert('Error', 'Stream URL is required');
                return;
            }
            if (!formData.imageUrl.trim()) {
                Alert.alert('Error', 'Image URL is required');
                return;
            }
        }

        setSubmitting(true);

        try {
            if (modalMode === 'create') {
                await api.post('/channels', formData);
                Alert.alert('Success', 'Channel created successfully');
            } else {
                await api.put(`/channels/${selectedChannel._id}`, formData);
                Alert.alert('Success', 'Channel updated successfully');
            }
            fetchChannels();
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
            await api.delete(`/channels/${selectedChannel._id}`);
            Alert.alert('Success', 'Channel deleted successfully');
            fetchChannels();
            setShowDeleteModal(false);
            setSelectedChannel(null);
        } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Delete failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleUrlAccess = async (channel) => {
        if (userRole !== 'admin') return;

        setUrlAccessToggling(channel._id);
        try {
            const response = await api.patch(
                `/channels/${channel._id}/toggle-urls-access`
            );
            fetchChannels();
        } catch (error) {
            console.error('Toggle URL access error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to toggle URL access');
        } finally {
            setUrlAccessToggling(null);
        }
    };

    const filteredChannels = channels.filter((channel) =>
        channel.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-200 px-4 py-4">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View className="p-2 bg-blue-50 rounded-xl mr-3">
                            <Radio size={24} color="#2563eb" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-gray-900">Channels</Text>
                            <Text className="text-xs text-gray-600">
                                Manage TV channels and streams
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Add Button - Admin Only */}
                {userRole === 'admin' && (
                    <TouchableOpacity
                        onPress={() => handleOpenModal('create')}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 8 }}
                    >
                        <Plus size={18} color="#ffffff" style={{ marginRight: 8 }} />
                        <Text className="text-white font-semibold">Add Channel</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Search Bar */}
            <View className="px-4 py-4">
                <View className="relative">
                    <View className="absolute left-4 top-1/2 z-10" style={{ transform: [{ translateY: -10 }] }}>
                        <Search size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                        placeholder="Search channels..."
                        placeholderTextColor="#9ca3af"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900"
                    />
                </View>
            </View>

            {/* Access Alert for Non-Admins */}
            {userRole !== 'admin' && !canAccessUrls && (
                <View className="mx-4 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex-row items-start">
                    <AlertCircle size={20} color="#b45309" style={{ marginRight: 12, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                        <Text className="font-semibold text-amber-900 mb-1">
                            Limited Access
                        </Text>
                        <Text className="text-xs text-amber-700">
                            You don't have permission to view or edit stream URLs and images for these channels.
                        </Text>
                    </View>
                </View>
            )}

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
                    {filteredChannels.length === 0 ? (
                        <View className="py-12">
                            <Text className="text-center text-gray-500">
                                No channels found
                            </Text>
                        </View>
                    ) : (
                        <View style={{ marginBottom: 16 }}>
                            {filteredChannels.map((channel, index) => (
                                <View
                                    key={channel._id}
                                    className="bg-white rounded-xl border border-gray-200 p-4"
                                    style={{ marginBottom: 12 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                        {/* Channel Image */}
                                        <View className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden mr-3">
                                            {channel.imageUrl ? (
                                                <Image
                                                    source={{ uri: channel.imageUrl }}
                                                    className="w-full h-full"
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View className="w-full h-full items-center justify-center bg-gray-200">
                                                    <Radio size={24} color="#6b7280" />
                                                </View>
                                            )}
                                        </View>

                                        {/* Channel Info */}
                                        <View style={{ flex: 1 }}>
                                            <Text className="text-base font-bold text-gray-900" style={{ marginBottom: 8 }}>
                                                {channel.name}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                <View className="bg-blue-50 px-2 py-1 rounded" style={{ marginRight: 8 }}>
                                                    <Text className="text-xs font-medium text-blue-700">
                                                        LCN {channel.lcn}
                                                    </Text>
                                                </View>
                                                <View className="bg-purple-50 px-2 py-1 rounded">
                                                    <Text className="text-xs font-medium text-purple-700">
                                                        {channel.language?.name || 'N/A'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text className="text-xs text-gray-500">
                                                {channel.genre?.name || 'N/A'}
                                            </Text>
                                        </View>

                                        {/* Action Buttons */}
                                        <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                                            {(userRole === 'admin' || userRole === 'distributor') && (
                                                <TouchableOpacity
                                                    onPress={() => handleOpenModal('edit', channel)}
                                                    className="p-2 bg-blue-50 rounded-lg"
                                                    style={{ marginRight: 8 }}
                                                >
                                                    <Edit2 size={18} color="#2563eb" />
                                                </TouchableOpacity>
                                            )}
                                            {userRole === 'admin' && (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSelectedChannel(channel);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="p-2 bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 size={18} color="#dc2626" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>

                                    {/* Admin URL Access Toggle */}
                                    {userRole === 'admin' && (
                                        <TouchableOpacity
                                            onPress={() => handleToggleUrlAccess(channel)}
                                            disabled={urlAccessToggling === channel._id}
                                            className={`mt-3 p-2 rounded-lg flex-row items-center justify-center ${channel.urlsAccessible
                                                    ? 'bg-green-100'
                                                    : 'bg-red-100'
                                                } ${urlAccessToggling === channel._id ? 'opacity-50' : ''}`}
                                        >
                                            {urlAccessToggling === channel._id ? (
                                                <ActivityIndicator size="small" color={channel.urlsAccessible ? '#15803d' : '#dc2626'} />
                                            ) : (
                                                <>
                                                    {channel.urlsAccessible ? (
                                                        <Unlock size={16} color="#15803d" style={{ marginRight: 6 }} />
                                                    ) : (
                                                        <Lock size={16} color="#dc2626" style={{ marginRight: 6 }} />
                                                    )}
                                                    <Text className={`text-xs font-semibold ${channel.urlsAccessible ? 'text-green-700' : 'text-red-700'
                                                        }`}>
                                                        {channel.urlsAccessible ? 'URLs Enabled' : 'URLs Disabled'}
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
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
                        {/* Modal Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text className="text-xl font-bold text-gray-900">
                                {modalMode === 'create' ? 'Add Channel' : 'Edit Channel'}
                            </Text>
                            <TouchableOpacity
                                onPress={handleCloseModal}
                                className="p-2 rounded-lg"
                            >
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Body */}
                        <ScrollView className="px-6 py-4" keyboardShouldPersistTaps="handled">
                            <View>
                                {/* Channel Name */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Channel Name
                                    </Text>
                                    <TextInput
                                        value={formData.name}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, name: text })
                                        }
                                        placeholder="Enter channel name"
                                        placeholderTextColor="#9ca3af"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* LCN Number */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        LCN Number
                                    </Text>
                                    <TextInput
                                        value={formData.lcn}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, lcn: text })
                                        }
                                        placeholder="Enter LCN"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="numeric"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Language Dropdown */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Language
                                    </Text>
                                    <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                        <Picker
                                            selectedValue={formData.language}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, language: value })
                                            }
                                            style={{ height: 50 }}
                                        >
                                            <Picker.Item label="Select Language" value="" />
                                            {languages.map((lang) => (
                                                <Picker.Item
                                                    key={lang._id}
                                                    label={lang.name}
                                                    value={lang._id}
                                                />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>

                                {/* Genre Dropdown */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Genre
                                    </Text>
                                    <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                        <Picker
                                            selectedValue={formData.genre}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, genre: value })
                                            }
                                            style={{ height: 50 }}
                                        >
                                            <Picker.Item label="Select Genre" value="" />
                                            {genres.map((genre) => (
                                                <Picker.Item
                                                    key={genre._id}
                                                    label={genre.name}
                                                    value={genre._id}
                                                />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>

                                {/* URL Fields - Conditionally Visible */}
                                {shouldShowUrlFields() && (
                                    <>
                                        {/* Stream URL */}
                                        <View style={{ marginBottom: 16 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                <Text className="text-sm font-semibold text-gray-700">
                                                    Stream URL
                                                </Text>
                                                {userRole === 'distributor' && !canEditUrlFields() && (
                                                    <Lock size={16} color="#dc2626" style={{ marginLeft: 8 }} />
                                                )}
                                            </View>
                                            <TextInput
                                                value={formData.url}
                                                onChangeText={(text) =>
                                                    setFormData({ ...formData, url: text })
                                                }
                                                placeholder="https://example.com/stream"
                                                placeholderTextColor="#9ca3af"
                                                keyboardType="url"
                                                autoCapitalize="none"
                                                editable={canEditUrlFields()}
                                                className={`w-full px-4 py-3 border rounded-xl text-gray-900 ${!canEditUrlFields()
                                                        ? 'bg-gray-100 border-gray-300'
                                                        : 'bg-gray-50 border-gray-200'
                                                    }`}
                                            />
                                        </View>

                                        {/* Image URL */}
                                        <View style={{ marginBottom: 16 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                <Text className="text-sm font-semibold text-gray-700">
                                                    Image URL
                                                </Text>
                                                {userRole === 'distributor' && !canEditUrlFields() && (
                                                    <Lock size={16} color="#dc2626" style={{ marginLeft: 8 }} />
                                                )}
                                            </View>
                                            <TextInput
                                                value={formData.imageUrl}
                                                onChangeText={(text) =>
                                                    setFormData({
                                                        ...formData,
                                                        imageUrl: text,
                                                    })
                                                }
                                                placeholder="https://example.com/image.jpg"
                                                placeholderTextColor="#9ca3af"
                                                keyboardType="url"
                                                autoCapitalize="none"
                                                editable={canEditUrlFields()}
                                                className={`w-full px-4 py-3 border rounded-xl text-gray-900 ${!canEditUrlFields()
                                                        ? 'bg-gray-100 border-gray-300'
                                                        : 'bg-gray-50 border-gray-200'
                                                    }`}
                                            />
                                        </View>

                                        {/* Lock Warning for Distributors */}
                                        {userRole === 'distributor' &&
                                            selectedChannel &&
                                            !selectedChannel.urlsAccessible && (
                                                <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex-row items-start">
                                                    <Lock size={18} color="#dc2626" style={{ marginRight: 12, marginTop: 2 }} />
                                                    <Text className="text-xs text-red-700 flex-1">
                                                        Stream URLs are locked by the administrator. You cannot modify these fields until access is granted.
                                                    </Text>
                                                </View>
                                            )}
                                    </>
                                )}

                                {/* Buttons */}
                                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                                    <TouchableOpacity
                                        onPress={handleSubmit}
                                        disabled={submitting}
                                        className={`flex-1 px-4 py-3 bg-blue-600 rounded-xl items-center justify-center ${submitting ? 'opacity-50' : ''}`}
                                        style={{ marginRight: 12 }}
                                    >
                                        <Text className="text-white text-center font-semibold">
                                            {submitting
                                                ? 'Saving...'
                                                : modalMode === 'create'
                                                    ? 'Create Channel'
                                                    : 'Update Channel'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleCloseModal}
                                        className="flex-1 px-4 py-3 bg-gray-100 rounded-xl items-center justify-center"
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
                        <View className="p-6">
                            <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} color="#dc2626" />
                            </View>
                            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                                Delete Channel
                            </Text>
                            <Text className="text-gray-600 text-center mb-6">
                                Are you sure you want to delete "
                                <Text className="font-semibold">{selectedChannel?.name}</Text>
                                "? This action cannot be undone.
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    disabled={submitting}
                                    className={`flex-1 px-4 py-3 bg-red-600 rounded-xl items-center justify-center ${submitting ? 'opacity-50' : ''}`}
                                    style={{ marginRight: 12 }}
                                >
                                    <Text className="text-white text-center font-semibold">
                                        {submitting ? 'Deleting...' : 'Delete'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowDeleteModal(false);
                                        setSelectedChannel(null);
                                    }}
                                    className="flex-1 px-4 py-3 bg-gray-100 rounded-xl items-center justify-center"
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

export default Channels;
