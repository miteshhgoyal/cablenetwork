import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import * as ScreenOrientation from 'expo-screen-orientation';

function Index() {
    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, []);

    return (
        <View className="flex-1 bg-black justify-center items-center">
            <ActivityIndicator size="large" color="#f97316" />
        </View>
    );
}

export default Index;
