import React from 'react';
import { KeyboardAvoidingView, ScrollView, Platform } from 'react-native';

const CustomKeyboardView = ({ children, inScrollView = false }) => {
    const content = inScrollView ? (
        <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
        >
            {children}
        </ScrollView>
    ) : (
        children
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {content}
        </KeyboardAvoidingView>
    );
};

export default CustomKeyboardView;
