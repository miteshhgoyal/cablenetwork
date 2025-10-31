// app/index.js
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function Index() {
    return (
        <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
        </SafeAreaView>
    );
}

export default Index;
