import React, { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { AppProvider, useApp } from './src/state/AppContext';
import { colors, Txt, Icon, Button } from './src/components/ui';
import type { RouteName } from './src/lib/types';
import * as Store from './src/screens/Storefront';
import * as Commerce from './src/screens/Commerce';
import * as Admin from './src/screens/Admin';

const screens: Record<RouteName, React.ComponentType> = {
  home: Store.HomeScreen,
  categories: Store.CategoriesScreen,
  catalog: Store.CatalogScreen,
  product: Store.ProductScreen,
  builder: Store.BuilderScreen,
  compare: Store.CompareScreen,
  cart: Commerce.CartScreen,
  checkout: Commerce.CheckoutScreen,
  orders: Commerce.OrdersScreen,
  orderDetail: Commerce.OrderDetailScreen,
  account: Commerce.AccountScreen,
  wishlist: Commerce.WishlistScreen,
  addresses: Commerce.AddressesScreen,
  profile: Commerce.ProfileScreen,
  notifications: Commerce.NotificationsScreen,
  support: Commerce.SupportScreen,
  about: Commerce.AboutScreen,
  login: Commerce.LoginScreen,
  register: Commerce.RegisterScreen,
  adminDashboard: Admin.AdminDashboardScreen,
  adminOrders: Admin.AdminOrdersScreen,
  adminOrderDetail: Admin.AdminOrderDetailScreen,
  adminProducts: Admin.AdminProductsScreen,
  adminProductEdit: Admin.AdminProductEditScreen,
  adminCategories: Admin.AdminCategoriesScreen,
  adminInventory: Admin.AdminInventoryScreen,
  adminReports: Admin.AdminReportsScreen,
  adminMore: Admin.AdminMoreScreen,
  adminCustomers: Admin.AdminCustomersScreen,
  adminDiscounts: Admin.AdminDiscountsScreen,
  adminPayments: Admin.AdminPaymentsScreen,
};
const noTabs = new Set<RouteName>([
  'product',
  'checkout',
  'orderDetail',
  'login',
  'register',
  'adminProductEdit',
  'adminOrderDetail',
  'profile',
  'addresses',
  'support',
  'about',
]);
const storeTabs: { name: RouteName; title: string; icon: string; filled: string }[] = [
  { name: 'home', title: 'Home', icon: 'home-outline', filled: 'home' },
  { name: 'categories', title: 'Explore', icon: 'grid-outline', filled: 'grid' },
  { name: 'builder', title: 'PC Builder', icon: 'cube-outline', filled: 'cube' },
  { name: 'cart', title: 'Cart', icon: 'bag-handle-outline', filled: 'bag-handle' },
  { name: 'account', title: 'Account', icon: 'person-outline', filled: 'person' },
];
const adminTabs: { name: RouteName; title: string; icon: string; filled: string }[] = [
  { name: 'adminDashboard', title: 'Home', icon: 'home-outline', filled: 'home' },
  { name: 'adminOrders', title: 'Orders', icon: 'receipt-outline', filled: 'receipt' },
  { name: 'adminProductEdit', title: 'Add new', icon: 'add', filled: 'add' },
  { name: 'adminProducts', title: 'Products', icon: 'cube-outline', filled: 'cube' },
  { name: 'adminMore', title: 'More', icon: 'ellipsis-horizontal', filled: 'ellipsis-horizontal' },
];
function Navigation() {
  const app = useApp();
  const admin = app.workspace === 'admin';
  const tabs = admin ? adminTabs : storeTabs;
  const cartCount = app.cart.reduce((n, i) => n + i.quantity, 0);
  return (
    <View style={s.tabBar}>
      {tabs.map((item) => {
        const active =
          item.name === app.route.name ||
          (item.name === 'categories' && app.route.name === 'catalog');
        const plus = admin && item.name === 'adminProductEdit';
        return (
          <Pressable
            key={item.name}
            accessibilityRole="tab"
            accessibilityLabel={item.title}
            accessibilityState={{ selected: active }}
            onPress={() => (plus ? app.navigate(item.name) : app.tab(item.name))}
            style={s.tab}
          >
            {plus ? (
              <LinearGradient colors={[colors.orange, '#F14B00']} style={s.add}>
                <Icon name="add" size={27} color="#fff" />
              </LinearGradient>
            ) : (
              <View style={{ position: 'relative' }}>
                <Icon
                  name={active ? item.filled : item.icon}
                  size={22}
                  color={active ? colors.orange : '#777A92'}
                />
                {item.name === 'cart' && cartCount > 0 && (
                  <View style={s.count}>
                    <Txt size={8} color="#fff" weight="bold">
                      {cartCount > 99 ? '99+' : cartCount}
                    </Txt>
                  </View>
                )}
              </View>
            )}
            <Txt
              size={9}
              weight={active ? 'semibold' : 'medium'}
              color={active ? colors.orange : colors.muted}
              style={{ marginTop: 5 }}
            >
              {item.title}
            </Txt>
            {active && <View style={s.activeDot} />}
          </Pressable>
        );
      })}
    </View>
  );
}
class ScreenBoundary extends React.Component<
  { children: ReactNode; onReset: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error('Technest screen error:', error);
  }
  render() {
    return this.state.failed ? (
      <View style={{ flex: 1, justifyContent: 'center', padding: 32, gap: 16 }}>
        <Txt size={24} weight="bold">
          Let’s try that again.
        </Txt>
        <Txt color={colors.muted}>
          This screen could not load. Your saved workspace is still available.
        </Txt>
        <Button
          title="Return home"
          onPress={() => {
            this.props.onReset();
            this.setState({ failed: false });
          }}
        />
      </View>
    ) : (
      this.props.children
    );
  }
}
function AppFrame() {
  const app = useApp();
  const Current = screens[app.route.name] || Store.HomeScreen;
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (app.route.name === 'home' || app.route.name === 'adminDashboard') return false;
      app.back();
      return true;
    });
    return () => listener.remove();
  }, [app.route, app.back]);
  const forbidden = app.mode === 'live' && app.route.name.startsWith('admin') && !app.user?.isStaff;
  return (
    <View style={s.canvas}>
      <View style={s.frame}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
          <StatusBar style="dark" />
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {app.error && (
              <View style={s.error}>
                <Icon name="cloud-offline-outline" size={18} color={colors.red} />
                <View style={{ flex: 1 }}>
                  <Txt size={11} color={colors.red} numberOfLines={3}>
                    {app.error}
                  </Txt>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry connection"
                  onPress={() => void app.refresh().catch(() => {})}
                >
                  <Txt size={11} weight="bold" color={colors.orange}>
                    Retry
                  </Txt>
                </Pressable>
                <Pressable accessibilityLabel="Dismiss error" onPress={app.clearError}>
                  <Icon name="close" size={17} color={colors.muted} />
                </Pressable>
              </View>
            )}
            <ScreenBoundary
              onReset={() => app.tab(app.workspace === 'admin' ? 'adminDashboard' : 'home')}
            >
              <View
                style={{ flex: 1 }}
                key={app.route.name + JSON.stringify(app.route.params || {})}
              >
                {!app.hydrated || (app.loading && app.products.length === 0) ? (
                  <View style={s.center}>
                    <ActivityIndicator color={colors.orange} />
                    <Txt color={colors.muted} size={12}>
                      Opening your workspace…
                    </Txt>
                  </View>
                ) : forbidden ? (
                  <View style={[s.center, { padding: 28 }]}>
                    <Icon name="lock-closed-outline" size={40} color={colors.orange} />
                    <Txt size={22} weight="bold">
                      Staff sign-in required
                    </Txt>
                    <Button
                      title="Sign in to admin"
                      onPress={() => app.navigate('login', { admin: true })}
                    />
                    <Button
                      title="Return to store"
                      variant="secondary"
                      onPress={() => app.setWorkspace('store')}
                    />
                  </View>
                ) : (
                  <Current />
                )}
              </View>
            </ScreenBoundary>
            {!noTabs.has(app.route.name) && <Navigation />}
            {app.toast && (
              <Pressable
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                onPress={app.dismissToast}
                style={[s.toast, { bottom: noTabs.has(app.route.name) ? 24 : 90 }]}
              >
                <Icon name="checkmark-circle" size={20} color="#FF9B58" />
                <Txt size={12} color="#fff" style={{ flex: 1 }}>
                  {app.toast}
                </Txt>
                <Icon name="close" size={15} color="#ADAFBF" />
              </Pressable>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}
export default function App() {
  const [loaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 900);
    return () => clearTimeout(timer);
  }, []);
  if ((!loaded && !fontError) || splash)
    return (
      <SafeAreaProvider>
        <View style={[s.canvas, { backgroundColor: '#111322' }]}>
          <LinearGradient
            colors={['#111322', '#191724', '#3F211B']}
            style={[s.center, { width: '100%', height: '100%' }]}
          >
            <Image
              source={require('./assets/splash-icon.png')}
              style={{ width: 240, height: 240 }}
              resizeMode="contain"
            />
            <ActivityIndicator color={colors.orange} />
          </LinearGradient>
        </View>
      </SafeAreaProvider>
    );
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppFrame />
      </AppProvider>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: '#EDEEF5', alignItems: 'center' },
  frame: {
    width: '100%',
    maxWidth: 520,
    flex: 1,
    backgroundColor: colors.bg,
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#DEDFEA',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 15 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDEDF4',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 73,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.orange,
    position: 'absolute',
    bottom: -5,
  },
  count: {
    position: 'absolute',
    top: -6,
    right: -9,
    backgroundColor: colors.orange,
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  add: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -15,
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#202232',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#111',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  error: {
    backgroundColor: '#FFF0F1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderColor: '#F8DDE2',
  },
});
