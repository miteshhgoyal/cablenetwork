import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AlertModal = ({
    visible,
    title,
    message,
    type = 'info', // 'success', 'error', 'warning', 'info'
    onConfirm,
    onCancel,
    confirmText = 'OK',
    cancelText = 'Cancel',
    showCancel = false
}) => {
    // Icon and color based on type
    const getTypeConfig = () => {
        switch (type) {
            case 'success':
                return {
                    icon: 'checkmark-circle',
                    color: '#10b981',
                    bgColor: '#d1fae5',
                    borderColor: '#6ee7b7'
                };
            case 'error':
                return {
                    icon: 'close-circle',
                    color: '#ef4444',
                    bgColor: '#fee2e2',
                    borderColor: '#fca5a5'
                };
            case 'warning':
                return {
                    icon: 'warning',
                    color: '#f59e0b',
                    bgColor: '#fef3c7',
                    borderColor: '#fcd34d'
                };
            default: // info
                return {
                    icon: 'information-circle',
                    color: '#3b82f6',
                    bgColor: '#dbeafe',
                    borderColor: '#93c5fd'
                };
        }
    };

    const config = getTypeConfig();

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel || onConfirm}
        >
            <Pressable
                className="flex-1 bg-black/50 justify-center items-center px-6"
                onPress={onCancel || onConfirm}
            >
                <Pressable
                    className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Icon */}
                    <View className="items-center mb-4">
                        <View
                            className="w-16 h-16 rounded-full items-center justify-center"
                            style={{ backgroundColor: config.bgColor }}
                        >
                            <Ionicons
                                name={config.icon}
                                size={40}
                                color={config.color}
                            />
                        </View>
                    </View>

                    {/* Title */}
                    {title && (
                        <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                            {title}
                        </Text>
                    )}

                    {/* Message */}
                    {message && (
                        <Text className="text-base text-gray-600 text-center mb-6">
                            {message}
                        </Text>
                    )}

                    {/* Buttons */}
                    <View className="flex-row gap-3">
                        {showCancel && onCancel && (
                            <TouchableOpacity
                                onPress={onCancel}
                                className="flex-1 bg-gray-100 py-3 px-4 rounded-lg"
                            >
                                <Text className="text-gray-700 font-semibold text-center">
                                    {cancelText}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={onConfirm}
                            className="flex-1 py-3 px-4 rounded-lg"
                            style={{ backgroundColor: config.color }}
                        >
                            <Text className="text-white font-semibold text-center">
                                {confirmText}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default AlertModal;
