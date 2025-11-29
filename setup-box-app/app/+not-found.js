import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function NotFound() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/');
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }} />
    );
}
