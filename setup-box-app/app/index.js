import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/authContext";
import * as ScreenOrientation from 'expo-screen-orientation';

function Index() {
    const { loading, isAuthenticated, subscriptionStatus } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Lock orientation to landscape
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, []);

    // Actively redirect based on auth state
    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                // Not logged in → go to sign in
                router.replace('/(auth)/signin');
            } else if (subscriptionStatus === 'ACTIVE') {
                // Logged in with active subscription → go to channels
                router.replace('/(tabs)/index');
            } else if (subscriptionStatus === 'EXPIRED' || subscriptionStatus === 'INACTIVE') {
                // Expired/inactive → _layout.js will show expired screen
                // Just trigger a navigation to tabs so _layout can intercept
                router.replace('/(tabs)/index');
            }
        }
    }, [loading, isAuthenticated, subscriptionStatus]);

    return (
        <View className="flex-1 bg-black justify-center items-center">
            <ActivityIndicator size="large" color="#f97316" />
        </View>
    );
}

export default Index;
