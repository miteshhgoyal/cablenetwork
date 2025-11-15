// app/index.js
import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/authContext";

function Index() {
    const { loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Let _layout.js handle all navigation logic
        // This is just a placeholder that shouldn't be seen
        if (!loading) {

        }
    }, [loading]);

    return (
        <View className="flex-1 bg-black justify-center items-center">
            <ActivityIndicator size="large" color="#f97316" />
        </View>
    );
}

export default Index;
