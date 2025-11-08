// services/securityService.js
import * as Device from 'expo-device';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import api from './api';

export const checkDeviceSecurity = async () => {
    try {
        // Check if device is emulator (basic security check)
        const isEmulator = !Device.isDevice;

        // Check VPN status
        const netInfo = await NetInfo.fetch();
        const isVPNActive = netInfo.type === 'vpn';

        // Get device info (Expo compatible)
        const deviceModel = Device.modelName || 'Unknown';
        const osVersion = Device.osVersion || 'Unknown';
        const appVersion = Constants.expoConfig?.version || '1.0.0';

        console.log('📱 Device Info:', { deviceModel, osVersion, appVersion, isEmulator, isVPNActive });

        // Send to server
        try {
            await api.post('/customer/update-security-info', {
                isRooted: isEmulator,
                isVPNActive,
                deviceModel,
                osVersion,
                appVersion
            });
            console.log('✅ Security info sent to server');
        } catch (error) {
            console.error('❌ Failed to send security info:', error.message);
        }

        return {
            success: true,
            isRooted: isEmulator,
            isVPNActive,
            deviceModel,
            osVersion
        };
    } catch (error) {
        console.error('❌ Security check error:', error);
        return { success: false, error: error.message };
    }
};

// Check security periodically
export const startSecurityMonitoring = () => {
    console.log('🔒 Starting security monitoring...');

    // Check immediately
    checkDeviceSecurity();

    // Then check every 10 minutes
    const intervalId = setInterval(() => {
        console.log('🔄 Performing periodic security check...');
        checkDeviceSecurity();
    }, 10 * 60 * 1000); // 10 minutes

    return intervalId;
};

export const stopSecurityMonitoring = (intervalId) => {
    if (intervalId) {
        clearInterval(intervalId);
        console.log('✅ Security monitoring stopped');
    }
};
