// app/(tabs)/categories.js
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
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    Loader,
    FolderTree,
} from 'lucide-react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Language',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await api.get('/categories');
            setCategories(response.data.data.categories);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            Alert.alert('Error', 'Failed to load categories');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchCategories();
    };

    const handleOpenModal = (mode, category = null) => {
        setModalMode(mode);
        if (mode === 'edit' && category) {
            setSelectedCategory(category);
            setFormData({
                name: category.name,
                type: category.type,
            });
        } else {
            setFormData({
                name: '',
                type: 'Language',
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCategory(null);
        setFormData({
            name: '',
            type: 'Language',
        });
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Category name is required');
            return;
        }

        setSubmitting(true);

        try {
            if (modalMode === 'create') {
                await api.post('/categories', formData);
                Alert.alert('Success', 'Category created successfully');
            } else {
                await api.put(`/categories/${selectedCategory._id}`, formData);
                Alert.alert('Success', 'Category updated successfully');
            }
            fetchCategories();
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
            await api.delete(`/categories/${selectedCategory._id}`);
            Alert.alert('Success', 'Category deleted successfully');
            fetchCategories();
            setShowDeleteModal(false);
            setSelectedCategory(null);
        } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Delete failed');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCategories = categories.filter(
        (category) =>
            category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            category.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-200 px-4 py-4">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View className="p-2 bg-blue-50 rounded-xl mr-3">
                            <FolderTree size={24} color="#2563eb" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-gray-900">Categories</Text>
                            <Text className="text-xs text-gray-600">
                                Manage languages and genres
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Add Button */}
                <TouchableOpacity
                    onPress={() => handleOpenModal('create')}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 8 }}
                >
                    <Plus size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text className="text-white font-semibold">Add Category</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View className="px-4 py-4">
                <View className="relative">
                    <View className="absolute left-4 top-1/2 -translate-y-2.5 z-10">
                        <Search size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                        placeholder="Search categories..."
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
                    {filteredCategories.length === 0 ? (
                        <View className="py-12">
                            <Text className="text-center text-gray-500">
                                No categories found
                            </Text>
                        </View>
                    ) : (
                        <View style={{ marginBottom: 16 }}>
                            {filteredCategories.map((category, index) => (
                                <View
                                    key={category._id}
                                    className="bg-white rounded-xl border border-gray-200 p-4"
                                    style={{ marginBottom: 12 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text className="text-base font-semibold text-gray-900 mb-1">
                                                {category.name}
                                            </Text>
                                            <View
                                                style={{
                                                    alignSelf: 'flex-start',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 4,
                                                    borderRadius: 20,
                                                    backgroundColor: category.type === 'Language' ? '#dbeafe' : '#f3e8ff',
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: '500',
                                                        color: category.type === 'Language' ? '#1e40af' : '#7e22ce',
                                                    }}
                                                >
                                                    {category.type}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <TouchableOpacity
                                                onPress={() => handleOpenModal('edit', category)}
                                                style={{ paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#dbeafe', borderRadius: 8, marginRight: 8 }}
                                            >
                                                <Edit2 size={18} color="#2563eb" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setSelectedCategory(category);
                                                    setShowDeleteModal(true);
                                                }}
                                                style={{ paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#fee2e2', borderRadius: 8 }}
                                            >
                                                <Trash2 size={18} color="#dc2626" />
                                            </TouchableOpacity>
                                        </View>
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
                animationType="fade"
                onRequestClose={handleCloseModal}
            >
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <View className="bg-white rounded-2xl w-full max-w-md">
                        {/* Modal Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text className="text-xl font-bold text-gray-900">
                                {modalMode === 'create' ? 'Add Category' : 'Edit Category'}
                            </Text>
                            <TouchableOpacity
                                onPress={handleCloseModal}
                                style={{ paddingHorizontal: 8, paddingVertical: 8, borderRadius: 8 }}
                            >
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Body */}
                        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
                            <View style={{ marginBottom: 16 }}>
                                <Text className="text-sm font-semibold text-gray-700 mb-2">
                                    Type
                                </Text>
                                <View style={{ flexDirection: 'row' }}>
                                    {['Language', 'Genre'].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            onPress={() => setFormData({ ...formData, type })}
                                            style={{
                                                flex: 1,
                                                marginRight: 12,
                                                paddingHorizontal: 16,
                                                paddingVertical: 12,
                                                borderRadius: 8,
                                                borderWidth: 2,
                                                backgroundColor: formData.type === type ? '#dbeafe' : '#f9fafb',
                                                borderColor: formData.type === type ? '#3b82f6' : '#e5e7eb',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    textAlign: 'center',
                                                    fontWeight: '600',
                                                    color: formData.type === type ? '#1e40af' : '#374151',
                                                }}
                                            >
                                                {type}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={{ marginBottom: 24 }}>
                                <Text className="text-sm font-semibold text-gray-700 mb-2">
                                    Name
                                </Text>
                                <TextInput
                                    value={formData.name}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, name: text })
                                    }
                                    placeholder="Enter category name"
                                    placeholderTextColor="#9ca3af"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                                />
                            </View>

                            <View style={{ flexDirection: 'row' }}>
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
                                Delete Category
                            </Text>
                            <Text className="text-gray-600 text-center mb-6">
                                Are you sure you want to delete "
                                <Text className="font-semibold">{selectedCategory?.name}</Text>
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
                                        setSelectedCategory(null);
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

export default Categories;
