import React from 'react';
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients } from '../../theme';
import { Card, LightStatus, MenuRow, T } from '../../components/ui';
import { WaveBackground } from '../../components/Brand';
import { initials } from '../../lib/format';
import { useAdmin } from '../../store/Admin';
import { useNav } from '../../navigation/hooks';

type IconName = React.ComponentProps<typeof MenuRow>['icon'];

const ICONS: Record<string, IconName> = {
  orders: 'bag-handle-outline',
  payments: 'card-outline',
  refunds: 'return-down-back-outline',
  products: 'cube-outline',
  variants: 'file-tray-stacked-outline',
  categories: 'grid-outline',
  brands: 'ribbon-outline',
  images: 'images-outline',
  colors: 'color-palette-outline',
  discounts: 'pricetag-outline',
  notices: 'megaphone-outline',
  reviews: 'star-outline',
  questions: 'chatbubbles-outline',
  customers: 'people-outline',
  addresses: 'location-outline',
  carts: 'cart-outline',
  wishlists: 'heart-outline',
  mappings: 'git-network-outline',
  builds: 'hardware-chip-outline',
  team: 'person-add-outline',
  roles: 'key-outline',
  activity: 'time-outline',
};

export default function More() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { workspace, signOut, can } = useAdmin();
  const pending = workspace?.summary?.pending_orders ?? 0;

  const go = (key: string, title: string) => {
    if (key === 'orders') nav.navigate('Orders');
    else if (key === 'products') nav.navigate('Products');
    else if (key === 'categories') nav.navigate('AdminCategories');
    else if (key === 'variants') nav.navigate('AdminInventory');
    else nav.navigate('AdminList', { resource: key, title });
  };

  const groups: Record<string, { key: string; title: string }[]> = {};
  (workspace?.sections ?? []).forEach((s) => {
    (groups[s.group] ||= []).push({ key: s.key, title: s.title });
  });

  const headH = 130 + insets.top;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <LightStatus />
      <LinearGradient colors={gradients.dark} style={{ height: headH, paddingTop: insets.top + 10, paddingHorizontal: 20, justifyContent: 'center' }}>
        <WaveBackground width={width} height={headH} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={styles.avatar}>
            <T size={20} weight="bold" color={colors.white}>
              {initials(workspace?.name?.split(' ')[0], workspace?.name?.split(' ')[1], workspace?.email ?? 'AD')}
            </T>
          </View>
          <View style={{ flex: 1 }}>
            <T size={17} weight="bold" color={colors.white} numberOfLines={1}>
              {workspace?.name || 'Staff member'}
            </T>
            <T size={12} color="#D8CEC6" numberOfLines={1}>
              {workspace?.email}
            </T>
            <T size={10.5} weight="bold" color={colors.primaryLight} style={{ marginTop: 2 }}>
              {workspace?.is_superuser ? 'SUPERUSER' : (workspace?.role || 'STAFF').toUpperCase()}
            </T>
          </View>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, marginTop: -20 }}>
        <Card padded={false} style={{ paddingHorizontal: 14 }}>
          <MenuRow icon="home-outline" title="Dashboard" onPress={() => nav.navigate('Dashboard')} />
          {can('orders') && <MenuRow icon="stats-chart-outline" title="Reports" onPress={() => nav.navigate('AdminReports')} last />}
        </Card>

        {Object.entries(groups).map(([group, items]) => (
          <View key={group} style={{ marginTop: 18 }}>
            <T size={12} weight="bold" color={colors.muted} style={{ marginBottom: 6, marginLeft: 4, letterSpacing: 0.6 }}>
              {group.toUpperCase()}
            </T>
            <Card padded={false} style={{ paddingHorizontal: 14 }}>
              {items.map((s, i) => (
                <MenuRow key={s.key} icon={ICONS[s.key] ?? 'apps-outline'} title={s.title} badge={s.key === 'orders' ? pending : undefined} onPress={() => go(s.key, s.title)} last={i === items.length - 1} />
              ))}
            </Card>
          </View>
        ))}

        <Card padded={false} style={{ paddingHorizontal: 14, marginTop: 18 }}>
          <MenuRow icon="server-outline" title="Server settings" onPress={() => nav.navigate('ServerSettings')} />
          <MenuRow
            icon="log-out-outline"
            title="Sign out of admin"
            danger
            right={<View />}
            last
            onPress={() =>
              Alert.alert('Sign out', 'Leave the admin workspace?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
              ])
            }
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
});
