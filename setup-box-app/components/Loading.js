import React from 'react';
import { View, ActivityIndicator } from 'react-native';

const Loading = ({ size = 'large', color = '#f97316' }) => {
    return (
        <View className="items-center justify-center">
            <ActivityIndicator size={size} color={color} />
        </View>
    );
};

export default Loading;
