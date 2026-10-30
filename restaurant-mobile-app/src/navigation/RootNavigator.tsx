import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import RoomsScreen from '../screens/RoomsScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BookingFormScreen from '../screens/BookingFormScreen';
import BookingConfirmationScreen from '../screens/BookingConfirmationScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';

import { useAuth } from '../auth/AuthContext';
import { colors } from '../utils/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 9,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          elevation: 12,
          shadowColor: '#1D302B',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -5 },
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          marginTop: 2,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: color === colors.primary ? 'home' : 'home-outline',
            Menu: color === colors.primary ? 'restaurant' : 'restaurant-outline',
            Rooms: color === colors.primary ? 'bed' : 'bed-outline',
            Profile: color === colors.primary ? 'person-circle' : 'person-circle-outline',
          };

          return (
            <Ionicons
              name={icons[route.name] || 'ellipse-outline'}
              size={size + (color === colors.primary ? 1 : 0)}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Menu" component={MenuScreen} />
      <Tab.Screen name="Rooms" component={RoomsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} />

      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: true,
          title: 'Sign in',
          headerTintColor: colors.primaryDark,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontWeight: '800' },
        }}
      />

      <Stack.Screen
        name="BookingForm"
        component={BookingFormScreen}
        options={{
          headerShown: true,
          title: 'Your stay',
          headerTintColor: colors.primaryDark,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontWeight: '800' },
        }}
      />

      <Stack.Screen
        name="BookingConfirmation"
        component={BookingConfirmationScreen}
        options={{
          headerShown: true,
          title: 'Booking confirmed',
          headerTintColor: colors.primaryDark,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontWeight: '800' },
        }}
      />
      <Stack.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{
          headerShown: true,
          title: 'My bookings',
          headerTintColor: colors.primaryDark,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontWeight: '800' },
        }}
      />
      <Stack.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={{
          headerShown: true,
          title: 'My orders',
          headerTintColor: colors.primaryDark,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontWeight: '800' },
        }}
      />
    </Stack.Navigator>
  );
}
