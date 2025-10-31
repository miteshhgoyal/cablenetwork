// app/(tabs)/index.js
import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    Modal,
    ScrollView,
    Dimensions,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/authContext';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

const { width } = Dimensions.get('window');

export default function ChannelsScreen() {
    const { channels, user, logout } = useAuth();
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [videoError, setVideoError] = useState(false);

    const handleChannelPress = (channel) => {
        setSelectedChannel(channel);
        setShowPlayer(true);
        setVideoError(false);
    };

    const closePlayer = () => {
        setShowPlayer(false);
        setSelectedChannel(null);
        setVideoError(false);
    };

    const isYouTube = (url) => {
        return url?.includes('youtube.com') || url?.includes('youtu.be');
    };

    const renderChannel = ({ item }) => (
        <TouchableOpacity
            className="m-2 bg-white rounded-2xl overflow-hidden shadow-md"
            style={{ width: (width / 2) - 24 }}
            onPress={() => handleChannelPress(item)}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: item.imageUrl }}
                style={{ width: '100%', height: 110 }}
                resizeMode="cover"
            />
            <View className="p-3">
                <Text className="text-xs font-bold text-orange-600 mb-1">
                    LCN {item.lcn}
                </Text>
                <Text
                    className="text-sm font-semibold text-gray-900"
                    numberOfLines={1}
                >
                    {item.name}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                    {item.genre?.name || 'General'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" backgroundColor="#f97316" />

            {/* Header */}
            <View className="bg-orange-500 px-6 py-4 flex-row items-center justify-between">
                <View className="flex-1">
                    <Text className="text-white text-2xl font-bold">
                        {user?.packageName || 'All Channels'}
                    </Text>
                    <Text className="text-orange-100 text-sm mt-1">
                        {channels.length} channels available
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={logout}
                    className="w-10 h-10 bg-orange-600 rounded-full items-center justify-center ml-3"
                >
                    <Ionicons name="log-out-outline" size={20} color="white" />
                </TouchableOpacity>
            </View>

            {/* Channels Grid */}
            {channels.length === 0 ? (
                <View className="flex-1 justify-center items-center px-6">
                    <Ionicons name="tv-outline" size={80} color="#d1d5db" />
                    <Text className="text-gray-500 text-center mt-4 text-lg font-semibold">
                        No channels available
                    </Text>
                    <Text className="text-gray-400 text-center mt-2 text-sm">
                        Contact your cable operator
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={channels}
                    renderItem={renderChannel}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    contentContainerStyle={{ padding: 8, paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Video Player Modal */}
            <Modal
                visible={showPlayer}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={closePlayer}
            >
                <SafeAreaView className="flex-1 bg-black">
                    <StatusBar barStyle="light-content" backgroundColor="#000" />

                    {/* Header */}
                    <View className="flex-row items-center px-4 py-3 bg-black/90 border-b border-gray-800">
                        <TouchableOpacity
                            onPress={closePlayer}
                            className="flex-row items-center"
                        >
                            <Ionicons name="chevron-back" size={24} color="white" />
                            <Text className="text-white ml-2 text-base">Back</Text>
                        </TouchableOpacity>
                        <Text
                            className="text-white font-bold text-base flex-1 text-center mr-16"
                            numberOfLines={1}
                        >
                            {selectedChannel?.name}
                        </Text>
                    </View>

                    <ScrollView className="flex-1">
                        {/* Video Player */}
                        <View className="w-full bg-black" style={{ height: 260 }}>
                            {selectedChannel && !isYouTube(selectedChannel.url) ? (
                                videoError ? (
                                    <View className="flex-1 items-center justify-center px-6">
                                        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                                        <Text className="text-white text-center mt-4 text-lg font-semibold">
                                            Unable to load stream
                                        </Text>
                                        <Text className="text-gray-400 text-sm text-center mt-2">
                                            Stream may be offline or URL is invalid
                                        </Text>
                                    </View>
                                ) : (
                                    <Video
                                        source={{ uri: selectedChannel.url }}
                                        style={{ width: '100%', height: '100%' }}
                                        useNativeControls
                                        resizeMode={ResizeMode.CONTAIN}
                                        isLooping
                                        shouldPlay
                                        onError={(error) => {
                                            console.log('Video error:', error);
                                            setVideoError(true);
                                        }}
                                        onLoad={() => setVideoError(false)}
                                    />
                                )
                            ) : (
                                <View className="flex-1 items-center justify-center px-6">
                                    <Ionicons name="logo-youtube" size={60} color="#ff0000" />
                                    <Text className="text-white text-center mt-4 text-lg font-semibold">
                                        YouTube Stream
                                    </Text>
                                    <Text className="text-gray-400 text-sm text-center mt-2">
                                        YouTube streams require YouTube app
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Channel Info */}
                        <View className="p-6">
                            <View className="flex-row items-center mb-4">
                                <View className="bg-orange-500 rounded-lg px-4 py-1.5 mr-3">
                                    <Text className="text-white font-bold text-sm">
                                        LCN {selectedChannel?.lcn}
                                    </Text>
                                </View>
                                <Text className="text-gray-400 text-sm">
                                    {selectedChannel?.genre?.name || 'General'}
                                </Text>
                            </View>

                            <Text className="text-white text-2xl font-bold mb-3">
                                {selectedChannel?.name}
                            </Text>

                            {selectedChannel?.language && (
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="language-outline" size={18} color="#9ca3af" />
                                    <Text className="text-gray-400 text-sm ml-2">
                                        {selectedChannel.language.name}
                                    </Text>
                                </View>
                            )}

                            {!selectedChannel?.url && (
                                <View className="mt-4 bg-red-900/30 border border-red-500 rounded-xl p-4">
                                    <Text className="text-red-400 text-sm">
                                        ⚠️ Stream URL not configured
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
