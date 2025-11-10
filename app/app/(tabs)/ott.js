// app/(tabs)/ott.js
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
    Film,
    Filter,
    Tv,
} from 'lucide-react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const Ott = () => {
    const [ottContent, setOttContent] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedOtt, setSelectedOtt] = useState(null);
    const [formData, setFormData] = useState({
        type: 'Movie',
        title: '',
        genre: '',
        language: '',
        mediaUrl: '',
        horizontalUrl: '',
        verticalUrl: '',
        seasonsCount: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchOttContent();
        fetchCategories();
    }, [typeFilter]);

    const fetchOttContent = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (typeFilter) params.append('type', typeFilter);

            const response = await api.get(`/ott?${params.toString()}`);
            setOttContent(response.data.data.ottContent);
        } catch (error) {
            console.error('Failed to fetch OTT content:', error);
            Alert.alert('Error', 'Failed to load OTT content');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/ott/categories');
            setLanguages(response.data.data.languages);
            setGenres(response.data.data.genres);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchOttContent();
    };

    const handleOpenModal = (mode, ott = null) => {
        setModalMode(mode);
        if (mode === 'edit' && ott) {
            setSelectedOtt(ott);
            setFormData({
                type: ott.type,
                title: ott.title,
                genre: ott.genre?._id || '',
                language: ott.language?._id || '',
                mediaUrl: ott.mediaUrl,
                horizontalUrl: ott.horizontalUrl,
                verticalUrl: ott.verticalUrl,
                seasonsCount: ott.seasonsCount?.toString() || '',
            });
        } else {
            setFormData({
                type: 'Movie',
                title: '',
                genre: '',
                language: '',
                mediaUrl: '',
                horizontalUrl: '',
                verticalUrl: '',
                seasonsCount: '',
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedOtt(null);
        setFormData({
            type: 'Movie',
            title: '',
            genre: '',
            language: '',
            mediaUrl: '',
            horizontalUrl: '',
            verticalUrl: '',
            seasonsCount: '',
        });
    };

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            Alert.alert('Error', 'Title is required');
            return;
        }
        if (!formData.genre) {
            Alert.alert('Error', 'Genre is required');
            return;
        }
        if (!formData.language) {
            Alert.alert('Error', 'Language is required');
            return;
        }
        if (!formData.mediaUrl.trim()) {
            Alert.alert('Error', 'Media URL is required');
            return;
        }
        if (!formData.horizontalUrl.trim()) {
            Alert.alert('Error', 'Horizontal poster URL is required');
            return;
        }
        if (!formData.verticalUrl.trim()) {
            Alert.alert('Error', 'Vertical poster URL is required');
            return;
        }
        if (formData.type === 'Web Series' && !formData.seasonsCount) {
            Alert.alert('Error', 'Seasons count is required for web series');
            return;
        }

        setSubmitting(true);

        try {
            if (modalMode === 'create') {
                await api.post('/ott', formData);
                Alert.alert('Success', 'OTT content created successfully');
            } else {
                await api.put(`/ott/${selectedOtt._id}`, formData);
                Alert.alert('Success', 'OTT content updated successfully');
            }
            fetchOttContent();
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
            await api.delete(`/ott/${selectedOtt._id}`);
            Alert.alert('Success', 'OTT content deleted successfully');
            fetchOttContent();
            setShowDeleteModal(false);
            setSelectedOtt(null);
        } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Delete failed');
        } finally {
            setSubmitting(false);
        }
    };

    // Group OTT content by language
    const groupContentByLanguage = (contentList) => {
        const grouped = contentList.reduce((acc, content) => {
            const languageName = content.language?.name || 'Unknown Language';
            if (!acc[languageName]) {
                acc[languageName] = [];
            }
            acc[languageName].push(content);
            return acc;
        }, {});

        // Sort languages alphabetically
        return Object.keys(grouped)
            .sort()
            .reduce((acc, key) => {
                acc[key] = grouped[key];
                return acc;
            }, {});
    };

    const filteredOttContent = ottContent.filter((ott) =>
        ott.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedContent = groupContentByLanguage(filteredOttContent);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-200 px-4 py-4">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                        <View className="p-2 bg-blue-50 rounded-xl mr-3">
                            <Film size={24} color="#2563eb" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-gray-900">
                                OTT Content
                            </Text>
                            <Text className="text-xs text-gray-600">
                                Manage movies and web series
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
                        placeholder="Search by title..."
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
                                <Picker.Item label="Movie" value="Movie" />
                                <Picker.Item label="Web Series" value="Web Series" />
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
            </View>

            {/* Content - Grouped by Language */}
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
                    {Object.keys(groupedContent).length === 0 ? (
                        <View className="py-12">
                            <Text className="text-center text-gray-500">
                                No OTT content found
                            </Text>
                        </View>
                    ) : (
                        Object.entries(groupedContent).map(([language, languageContent]) => (
                            <View key={language} style={{ marginBottom: 24 }}>
                                {/* Language Header */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 8 }}>
                                    <View style={{ width: 4, height: 24, backgroundColor: '#2563eb', borderRadius: 2, marginRight: 12 }} />
                                    <Text className="text-lg font-bold text-gray-900">
                                        {language}
                                    </Text>
                                    <Text className="text-sm text-gray-500 ml-2">
                                        ({languageContent.length} {languageContent.length === 1 ? 'item' : 'items'})
                                    </Text>
                                </View>

                                {/* Content for this Language */}
                                {languageContent.map((ott, index) => (
                                    <View
                                        key={ott._id}
                                        className="bg-white rounded-xl border border-gray-200 p-4"
                                        style={{ marginBottom: 12 }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                            {/* Poster Image */}
                                            <View className="w-20 h-28 bg-gray-100 rounded-lg overflow-hidden mr-3">
                                                {ott.verticalUrl ? (
                                                    <Image
                                                        source={{ uri: ott.verticalUrl }}
                                                        className="w-full h-full"
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View className="w-full h-full items-center justify-center bg-gray-200">
                                                        <Film size={24} color="#6b7280" />
                                                    </View>
                                                )}
                                            </View>

                                            {/* Content Info */}
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                    <View
                                                        style={{
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 4,
                                                            borderRadius: 20,
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            marginRight: 8,
                                                            borderWidth: 1,
                                                            backgroundColor: ott.type === 'Movie' ? '#dbeafe' : '#f3e8ff',
                                                            borderColor: ott.type === 'Movie' ? '#bfdbfe' : '#e9d5ff',
                                                        }}
                                                    >
                                                        {ott.type === 'Movie' ? (
                                                            <Film size={12} color="#2563eb" />
                                                        ) : (
                                                            <Tv size={12} color="#9333ea" />
                                                        )}
                                                        <Text
                                                            style={{
                                                                fontSize: 12,
                                                                fontWeight: '600',
                                                                marginLeft: 4,
                                                                color: ott.type === 'Movie' ? '#2563eb' : '#9333ea',
                                                            }}
                                                        >
                                                            {ott.type}
                                                        </Text>
                                                    </View>
                                                    <View className="bg-gray-100 px-2 py-1 rounded">
                                                        <Text className="text-xs font-medium text-gray-700">
                                                            #{index + 1}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text className="text-base font-bold text-gray-900 mb-1">
                                                    {ott.title}
                                                </Text>

                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                                                    <View className="bg-gray-100 px-2 py-1 rounded mr-2 mb-2">
                                                        <Text className="text-xs text-gray-700">
                                                            {ott.genre?.name || 'N/A'}
                                                        </Text>
                                                    </View>
                                                    {ott.type === 'Web Series' && ott.seasonsCount && (
                                                        <View className="bg-purple-50 px-2 py-1 rounded mb-2">
                                                            <Text className="text-xs text-purple-700 font-medium">
                                                                {ott.seasonsCount} Season{ott.seasonsCount > 1 ? 's' : ''}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Action Buttons */}
                                                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                                    <TouchableOpacity
                                                        onPress={() => handleOpenModal('edit', ott)}
                                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#dbeafe', borderRadius: 8, marginRight: 8 }}
                                                    >
                                                        <Edit2 size={16} color="#2563eb" />
                                                        <Text className="text-blue-700 font-semibold text-xs ml-1">
                                                            Edit
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setSelectedOtt(ott);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fee2e2', borderRadius: 8 }}
                                                    >
                                                        <Trash2 size={16} color="#dc2626" />
                                                        <Text className="text-red-700 font-semibold text-xs ml-1">
                                                            Delete
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))
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
                                {modalMode === 'create' ? 'Add OTT Content' : 'Edit OTT Content'}
                            </Text>
                            <TouchableOpacity onPress={handleCloseModal} className="p-2 rounded-lg">
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-6 py-4" keyboardShouldPersistTaps="handled">
                            <View>
                                {/* Type */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Type *
                                    </Text>
                                    <View className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                        <Picker
                                            selectedValue={formData.type}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, type: value, seasonsCount: value === 'Movie' ? '' : formData.seasonsCount })
                                            }
                                            style={{ height: 50 }}
                                        >
                                            <Picker.Item label="Movie" value="Movie" />
                                            <Picker.Item label="Web Series" value="Web Series" />
                                        </Picker>
                                    </View>
                                </View>

                                {/* Title */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Title *
                                    </Text>
                                    <TextInput
                                        value={formData.title}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, title: text })
                                        }
                                        placeholder="Enter title"
                                        placeholderTextColor="#9ca3af"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Genre */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Genre *
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

                                {/* Language */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Language *
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

                                {/* Seasons Count */}
                                {formData.type === 'Web Series' && (
                                    <View style={{ marginBottom: 16 }}>
                                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                                            Seasons Count *
                                        </Text>
                                        <TextInput
                                            value={formData.seasonsCount}
                                            onChangeText={(text) =>
                                                setFormData({ ...formData, seasonsCount: text })
                                            }
                                            placeholder="Enter number of seasons"
                                            placeholderTextColor="#9ca3af"
                                            keyboardType="numeric"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                        />
                                    </View>
                                )}

                                {/* Media URL */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Media URL *
                                    </Text>
                                    <TextInput
                                        value={formData.mediaUrl}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, mediaUrl: text })
                                        }
                                        placeholder="https://example.com/media"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="url"
                                        autoCapitalize="none"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Horizontal Poster URL */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Horizontal Poster URL *
                                    </Text>
                                    <TextInput
                                        value={formData.horizontalUrl}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, horizontalUrl: text })
                                        }
                                        placeholder="https://example.com/poster-h.jpg"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="url"
                                        autoCapitalize="none"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
                                </View>

                                {/* Vertical Poster URL */}
                                <View style={{ marginBottom: 24 }}>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Vertical Poster URL *
                                    </Text>
                                    <TextInput
                                        value={formData.verticalUrl}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, verticalUrl: text })
                                        }
                                        placeholder="https://example.com/poster-v.jpg"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="url"
                                        autoCapitalize="none"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                    />
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
                                Delete OTT Content
                            </Text>
                            <Text className="text-gray-600 text-center mb-6">
                                Are you sure you want to delete "
                                <Text className="font-semibold">{selectedOtt?.title}</Text>
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
                                        setSelectedOtt(null);
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

export default Ott;
