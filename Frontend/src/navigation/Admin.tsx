import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, gradients, shadow } from '../theme';
import { Sheet, MenuRow } from '../components/ui';
import { useNav } from './hooks';
import { useAdmin } from '../store/Admin';

import Dashboard from '../screens/admin/Dashboard';
import AdminOrders from '../screens/admin/Orders';
import AdminOrderDetail from '../screens/admin/OrderDetail';
import AdminProducts from '../screens/admin/Products';
import ProductForm from '../screens/admin/ProductForm';
import AdminCategories from '../screens/admin/Categories';
import Inventory from '../screens/admin/Inventory';
import More from '../screens/admin/More';
import Reports from '../screens/admin/Reports';
import ResourceList from '../screens/admin/ResourceList';
import RecordScreen from '../screens/admin/Record';
import ServerSettings from '../screens/auth/ServerSettings';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { label: 'Home', icon: 'home-outline', active: 'home' },
  Orders: { label: 'Orders', icon: 'bag-handle-outline', active: 'bag-handle' },
  Products: { label: 'Products', icon: 'cube-outline', active: 'cube' },
  More: { label: 'More', icon: 'ellipsis-horizontal', active: 'ellipsis-horizontal' },
};

function AdminTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const { can } = useAdmin();
  const [open, setOpen] = useState(false);

  const create = (resource: string, title: string) => {
    setOpen(false);
    setTimeout(() => {
      if (resource === 'products') nav.navigate('AdminProductForm', {});
      else nav.navigate('AdminRecord', { resource, title });
    }, 150);
  };

  const quick: { resource: string; title: string; icon: keyof typeof Ionicons.glyphMap; sub: string }[] = [
    { resource: 'products', title: 'Add product', icon: 'cube-outline', sub: 'Create a product with variants and images' },
    { resource: 'categories', title: 'Add category', icon: 'grid-outline', sub: 'New category or sub-category' },
    { resource: 'brands', title: 'Add brand', icon: 'ribbon-outline', sub: 'Register a new brand' },
    { resource: 'discounts', title: 'Add discount', icon: 'pricetag-outline', sub: 'Promo code or automatic discount' },
    { resource: 'notices', title: 'Add notice', icon: 'megaphone-outline', sub: 'Announcement shown to customers' },
  ];

  const order = ['Dashboard', 'Orders', 'Create', 'Products', 'More'];
  const routes = order
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is (typeof state.routes)[number] => Boolean(r));

  return (
    <>
      <View style={[styles.bar, shadow.md, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {routes.map((route) => {
          if (route.name === 'Create') {
            return (
              <View key={route.key} style={styles.fabSlot}>
                <Pressable onPress={() => setOpen(true)} style={[styles.fabWrap, shadow.glow]}>
                  <LinearGradient colors={gradients.primary} style={styles.fab}>
                    <Ionicons name="add" size={30} color={colors.white} />
                  </LinearGradient>
                </Pressable>
              </View>
            );
          }
          const meta = META[route.name];
          const index = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
              }}
              style={styles.item}
            >
              <Ionicons name={focused ? meta.active : meta.icon} size={23} color={focused ? colors.primary : colors.muted} />
              <Text style={[styles.label, { color: focused ? colors.primary : colors.muted, fontFamily: focused ? font.bold : font.medium }]}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Quick create">
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          {quick
            .filter((q) => can(q.resource))
            .map((q, i, arr) => (
              <MenuRow key={q.resource} icon={q.icon} title={q.title} subtitle={q.sub} onPress={() => create(q.resource, q.title)} last={i === arr.length - 1} />
            ))}
        </View>
      </Sheet>
    </>
  );
}

const Empty = () => null;

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <AdminTabBar {...props} />}>
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Orders" component={AdminOrders} />
      <Tab.Screen name="Create" component={Empty} />
      <Tab.Screen name="Products" component={AdminProducts} />
      <Tab.Screen name="More" component={More} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="AdminTabs" component={Tabs} />
      <Stack.Screen name="AdminOrderDetail" component={AdminOrderDetail} />
      <Stack.Screen name="AdminProductForm" component={ProductForm} />
      <Stack.Screen name="AdminCategories" component={AdminCategories} />
      <Stack.Screen name="AdminInventory" component={Inventory} />
      <Stack.Screen name="AdminReports" component={Reports} />
      <Stack.Screen name="AdminList" component={ResourceList} />
      <Stack.Screen name="AdminRecord" component={RecordScreen} />
      <Stack.Screen name="ServerSettings" component={ServerSettings} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    paddingTop: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 10.5 },
  fabSlot: { flex: 1, alignItems: 'center' },
  fabWrap: { marginTop: -30, borderRadius: 30, borderWidth: 4, borderColor: colors.white },
  fab: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
});
