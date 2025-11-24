import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/authContext";
import * as ScreenOrientation from 'expo-screen-orientation'; // import screen orientation

function Index() {
    const { loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Lock orientation to landscape
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, []);

    // Navigation logic handled in _layout.js as before
    useEffect(() => {
        if (!loading) {
            // Placeholder, no action needed here
        }
    }, [loading]);

    return (
        <View className="flex-1 bg-black justify-center items-center">
            <ActivityIndicator size="large" color="#f97316" />
        </View>
    );
}

export default Index;
