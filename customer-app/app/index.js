// app/index.js
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/authContext";

function Index() {
    const { loading, isAuthenticated } = useAuth();

    // Show loading while checking auth
    if (loading) {
        return (
            <View className="flex-1 bg-orange-500 justify-center items-center">
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    // Redirect based on authentication status
    return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/signin"} />;
}

export default Index;
