import { ActivityIndicator, View } from "react-native";

/**
 * Placeholder splash/loading screen.
 * Navigation and orientation are handled in _layout.js.
 */
function Index() {
    return (
        <View className="flex-1 bg-black justify-center items-center">
            <ActivityIndicator size="large" color="#f97316" />
        </View>
    );
}

export default Index;
