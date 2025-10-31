import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const DateInput = ({
    label,
    value,
    onChange,
    error,
    placeholder = 'Select date',
    minimumDate,
    maximumDate
}) => {
    const [show, setShow] = useState(false);

    const handleDateChange = (event, selectedDate) => {
        setShow(Platform.OS === 'ios');
        if (selectedDate) {
            onChange(selectedDate);
        }
    };

    const formatDate = (date) => {
        if (!date) return placeholder;
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <View className="mb-4">
            {label && (
                <Text className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </Text>
            )}

            <TouchableOpacity
                onPress={() => setShow(true)}
                className="flex-row items-center px-4 py-3 border border-gray-300 rounded-lg bg-white"
            >
                <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
                <Text
                    className={`flex-1 ml-3 text-base ${value ? 'text-gray-900' : 'text-gray-400'}`}
                >
                    {formatDate(value)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#9ca3af" />
            </TouchableOpacity>

            {error && (
                <Text className="mt-1 text-sm text-red-600">{error}</Text>
            )}

            {show && (
                <DateTimePicker
                    value={value || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                />
            )}
        </View>
    );
};

export default DateInput;
