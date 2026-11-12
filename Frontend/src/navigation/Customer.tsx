import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, shadow } from '../theme';
import { useShop } from '../store/Shop';

import Home from '../screens/customer/Home';
import Categories from '../screens/customer/Categories';
import PCBuilder from '../screens/customer/PCBuilder';
import Cart from '../screens/customer/Cart';
import Account from '../screens/customer/Account';
import ProductList from '../screens/customer/ProductList';
import Search from '../screens/customer/Search';
import ProductDetail from '../screens/customer/ProductDetail';
import Checkout from '../screens/customer/Checkout';
import OrderSuccess from '../screens/customer/OrderSuccess';
import Orders from '../screens/customer/Orders';
import OrderDetail from '../screens/customer/OrderDetail';
import Wishlist from '../screens/customer/Wishlist';
import Compare from '../screens/customer/Compare';
import AddressScreen from '../screens/customer/Address';
import AccountInfo from '../screens/customer/AccountInfo';
import ChangePassword from '../screens/customer/ChangePassword';
import Notifications from '../screens/customer/Notifications';
import { Help, About } from '../screens/customer/Info';
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register';
import VerifyEmail from '../screens/auth/VerifyEmail';
import ForgotPassword from '../screens/auth/ForgotPassword';
import StaffLogin from '../screens/auth/StaffLogin';
import ServerSettings from '../screens/auth/ServerSettings';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }> = {
  Home: { label: 'Home', icon: 'home-outline', active: 'home' },
  Category: { label: 'Category', icon: 'grid-outline', active: 'grid' },
  PCBuilder: { label: 'PC Builder', icon: 'hardware-chip-outline', active: 'hardware-chip' },
  Cart: { label: 'Cart', icon: 'cart-outline', active: 'cart' },
  Account: { label: 'Account', icon: 'person-outline', active: 'person' },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { cartCount } = useShop();
  return (
    <View style={[styles.bar, shadow.md, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
        };
        return (
          <Pressable key={route.key} onPress={onPress} style={styles.item}>
            <View>
              <Ionicons name={focused ? meta.active : meta.icon} size={23} color={focused ? colors.primary : colors.muted} />
              {route.name === 'Cart' && cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color: focused ? colors.primary : colors.muted, fontFamily: focused ? font.bold : font.medium }]}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Category" component={Categories} />
      <Tab.Screen name="PCBuilder" component={PCBuilder} />
      <Tab.Screen name="Cart" component={Cart} />
      <Tab.Screen name="Account" component={Account} />
    </Tab.Navigator>
  );
}

export default function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="CustomerTabs" component={Tabs} />
      <Stack.Screen name="ProductList" component={ProductList} />
      <Stack.Screen name="Search" component={Search} options={{ animation: 'fade' }} />
      <Stack.Screen name="ProductDetail" component={ProductDetail} />
      <Stack.Screen name="Checkout" component={Checkout} />
      <Stack.Screen name="OrderSuccess" component={OrderSuccess} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Orders" component={Orders} />
      <Stack.Screen name="OrderDetail" component={OrderDetail} />
      <Stack.Screen name="Wishlist" component={Wishlist} />
      <Stack.Screen name="Compare" component={Compare} />
      <Stack.Screen name="Address" component={AddressScreen} />
      <Stack.Screen name="AccountInfo" component={AccountInfo} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="Help" component={Help} />
      <Stack.Screen name="About" component={About} />
      <Stack.Screen name="ServerSettings" component={ServerSettings} />
      <Stack.Screen name="Login" component={Login} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmail} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="StaffLogin" component={StaffLogin} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingTop: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 10.5 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: { fontSize: 9, color: colors.white, fontFamily: font.bold },
});
