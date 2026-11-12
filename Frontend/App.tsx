import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

import { colors } from './src/theme';
import { loadBaseUrl } from './src/config';
import { ToastProvider } from './src/store/Toast';
import { AuthProvider, useAuth } from './src/store/Auth';
import { ShopProvider } from './src/store/Shop';
import { AdminProvider, useAdmin } from './src/store/Admin';
import CustomerNavigator from './src/navigation/Customer';
import AdminNavigator from './src/navigation/Admin';
import { SplashView } from './src/components/Splash';

LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate`']);

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.white,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

function Root() {
  const auth = useAuth();
  const admin = useAdmin();
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
    'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
  });
  const [baseReady, setBaseReady] = useState(false);
  const [minTime, setMinTime] = useState(false);

  useEffect(() => {
    void loadBaseUrl().finally(() => setBaseReady(true));
    const t = setTimeout(() => setMinTime(true), 1900);
    return () => clearTimeout(t);
  }, []);

  const loading = !(fontsLoaded && baseReady && auth.ready && admin.ready && minTime);
  if (loading) return <SplashView />;

  const inAdmin = Boolean(admin.workspace);
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
      {inAdmin ? <AdminNavigator /> : <CustomerNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AuthProvider>
          <ShopProvider>
            <AdminProvider>
              <Root />
            </AdminProvider>
          </ShopProvider>
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
