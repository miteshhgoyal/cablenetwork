// app/index.js
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function Index() {
    return (
        <SafeAreaView className="flex-1 bg-orange-500 justify-center items-center">
            <ActivityIndicator size="large" color="white" />
        </SafeAreaView>
    );
}

export default Index;
