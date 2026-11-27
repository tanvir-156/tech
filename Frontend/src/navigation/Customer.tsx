import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';

import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, shadow } from '../theme';
import { useShop } from '../store/Shop';

// ======================================================
// CUSTOMER SCREENS
// ======================================================

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

// ======================================================
// AUTH SCREENS
// ======================================================

import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register';
import VerifyEmail from '../screens/auth/VerifyEmail';
import ForgotPassword from '../screens/auth/ForgotPassword';
import StaffLogin from '../screens/auth/StaffLogin';
import ServerSettings from '../screens/auth/ServerSettings';

// ======================================================
// NAVIGATORS
// ======================================================

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const CategoryStack = createNativeStackNavigator();

// ======================================================
// BACK BUTTON ( < ) - top left corner
// Wrap any screen with withBack(Screen) to add it.
// ======================================================

function withBack<P extends object>(
  Screen: React.ComponentType<P>
) {
  function Wrapped(props: P) {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    return (
      <View style={{ flex: 1 }}>
        <Screen {...props} />

        {navigation.canGoBack() && (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backBtn,
              { top: insets.top + 8 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={colors.text}
            />
          </Pressable>
        )}
      </View>
    );
  }

  return Wrapped;
}

// Screens that get the back button
const ProductListScreen = withBack(ProductList);

// ======================================================
// TAB CONFIGURATION
// ======================================================

type TabMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: keyof typeof Ionicons.glyphMap;
};

const TAB_META: Record<string, TabMeta> = {
  Category: {
    label: 'Category',
    icon: 'grid-outline',
    active: 'grid',
  },

  PCBuilder: {
    label: 'PC Builder',
    icon: 'hardware-chip-outline',
    active: 'hardware-chip',
  },

  Home: {
    label: 'Home',
    icon: 'home-outline',
    active: 'home',
  },

  Cart: {
    label: 'Cart',
    icon: 'cart-outline',
    active: 'cart',
  },

  Account: {
    label: 'Account',
    icon: 'person-outline',
    active: 'person',
  },
};

// ======================================================
// CUSTOM BOTTOM TAB BAR
// ======================================================

function TabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { cartCount } = useShop();

  return (
    <View
      style={[
        styles.bar,
        shadow.md,
        {
          paddingBottom: Math.max(
            insets.bottom,
            8
          ),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];

        if (!meta) {
          return null;
        }

        const focused = state.index === index;
        const isCenter = route.name === 'Home';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(
              route.name as never
            );
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{
              selected: focused,
            }}
            style={styles.item}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={
                  focused
                    ? meta.active
                    : meta.icon
                }
                size={isCenter ? 27 : 23}
                color={
                  focused
                    ? colors.primary
                    : colors.muted
                }
              />

              {route.name === 'Cart' &&
                cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {cartCount > 9
                        ? '9+'
                        : cartCount}
                    </Text>
                  </View>
                )}
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: focused
                    ? colors.primary
                    : colors.muted,

                  fontFamily: focused
                    ? font.bold
                    : font.medium,
                },
              ]}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ======================================================
// HOME STACK
// ======================================================

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <HomeStack.Screen
        name="HomeScreen"
        component={Home}
      />

      <HomeStack.Screen
        name="ProductList"
        component={ProductListScreen}
      />
    </HomeStack.Navigator>
  );
}

// ======================================================
// CATEGORY STACK
// ======================================================

function CategoryStackNavigator() {
  return (
    <CategoryStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <CategoryStack.Screen
        name="CategoryScreen"
        component={Categories}
      />

      <CategoryStack.Screen
        name="ProductList"
        component={ProductListScreen}
      />
    </CategoryStack.Navigator>
  );
}

// ======================================================
// BOTTOM TABS
// Order: Category, PC Builder, Home (middle), Cart, Account
// ======================================================

function Tabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <TabBar {...props} />
      )}
    >
      <Tab.Screen
        name="Category"
        component={CategoryStackNavigator}
      />

      <Tab.Screen
        name="PCBuilder"
        component={PCBuilder}
      />

      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
      />

      <Tab.Screen
        name="Cart"
        component={Cart}
      />

      <Tab.Screen
        name="Account"
        component={Account}
      />
    </Tab.Navigator>
  );
}

// ======================================================
// MAIN CUSTOMER NAVIGATOR
// ======================================================

export default function CustomerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      {/* MAIN CUSTOMER TABS */}

      <Stack.Screen
        name="CustomerTabs"
        component={Tabs}
      />

      {/* PRODUCT SCREENS */}

      {/* ✅ ADDED: lets Wishlist, Compare and other root screens open ProductList */}
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
      />

      <Stack.Screen
        name="Search"
        component={Search}
        options={{
          animation: 'fade',
        }}
      />

      <Stack.Screen
        name="ProductDetail"
        component={ProductDetail}
      />

      {/* CHECKOUT */}

      <Stack.Screen
        name="Checkout"
        component={Checkout}
      />

      <Stack.Screen
        name="OrderSuccess"
        component={OrderSuccess}
        options={{
          gestureEnabled: false,
        }}
      />

      {/* ORDERS */}

      <Stack.Screen
        name="Orders"
        component={Orders}
      />

      <Stack.Screen
        name="OrderDetail"
        component={OrderDetail}
      />

      {/* WISHLIST AND COMPARE */}

      <Stack.Screen
        name="Wishlist"
        component={Wishlist}
      />

      <Stack.Screen
        name="Compare"
        component={Compare}
      />

      {/* ACCOUNT */}

      <Stack.Screen
        name="Address"
        component={AddressScreen}
      />

      <Stack.Screen
        name="AccountInfo"
        component={AccountInfo}
      />

      <Stack.Screen
        name="ChangePassword"
        component={ChangePassword}
      />

      <Stack.Screen
        name="Notifications"
        component={Notifications}
      />

      {/* INFORMATION */}

      <Stack.Screen
        name="Help"
        component={Help}
      />

      <Stack.Screen
        name="About"
        component={About}
      />

      {/* SETTINGS */}

      <Stack.Screen
        name="ServerSettings"
        component={ServerSettings}
      />

      {/* AUTHENTICATION */}

      <Stack.Screen
        name="Login"
        component={Login}
        options={{
          animation: 'slide_from_bottom',
        }}
      />

      <Stack.Screen
        name="Register"
        component={Register}
      />

      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmail}
      />

      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPassword}
      />

      <Stack.Screen
        name="StaffLogin"
        component={StaffLogin}
      />
    </Stack.Navigator>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  // Back button
  backBtn: {
    position: 'absolute',
    left: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    elevation: 4,
  },

  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingTop: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: colors.border,
  },

  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 3,
    minWidth: 0,
  },

  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 27,
  },

  label: {
    fontSize: 10.5,
    textAlign: 'center',
  },

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

  badgeText: {
    fontSize: 9,
    color: colors.white,
    fontFamily: font.bold,
  },
});