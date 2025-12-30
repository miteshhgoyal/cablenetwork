// services/locationService.js
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import api from './api';

const LOCATION_TASK_NAME = 'background-location-task';

// Define background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Location task error:', error);
        return;
    }

    if (data) {
        const { locations } = data;
        const location = locations[0];

        if (location) {
            try {
                await api.post('/customer/update-location', {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
            } catch (error) {
                console.error('Failed to send location:', error);
            }
        }
    }
});

export const requestLocationPermissions = async () => {
    try {
        // Request foreground permission first
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

        if (foregroundStatus !== 'granted') {
            return { success: false, message: 'Location permission denied' };
        }

        // Request background permission
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

        if (backgroundStatus !== 'granted') {
            console.warn('⚠️ Background location permission denied');
            // Still return success if foreground is granted
        }
        return { success: true };
    } catch (error) {
        console.error('Permission error:', error);
        return { success: false, message: error.message };
    }
};

export const startLocationTracking = async () => {
    try {
        const { status } = await Location.getBackgroundPermissionsAsync();

        if (status !== 'granted') {
            const permissionResult = await requestLocationPermissions();
            if (!permissionResult.success) {
                return permissionResult;
            }
        }

        // Check if already tracking
        const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (isTracking) {
            return { success: true, message: 'Already tracking' };
        }

        // Start tracking
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5 * 60 * 1000, // Update every 5 minutes
            distanceInterval: 100, // Update every 100 meters
            foregroundService: {
                notificationTitle: 'Cable Network Active',
                notificationBody: 'Tracking location for service quality',
                notificationColor: '#f97316'
            },
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true
        });


        return { success: true };
    } catch (error) {
        console.error('Start tracking error:', error);
        return { success: false, message: error.message };
    }
};

export const stopLocationTracking = async () => {
    try {
        const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

        if (isTracking) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

        } else {

        }

        return { success: true };
    } catch (error) {
        console.error('Stop tracking error:', error);
        return { success: false, message: error.message };
    }
};

export const getCurrentLocation = async () => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            return { success: false, message: 'Permission denied' };
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
        });

        return {
            success: true,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        };
    } catch (error) {
        console.error('Get location error:', error);
        return { success: false, message: error.message };
    }
};
