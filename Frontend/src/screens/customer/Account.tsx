import React from 'react';
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients } from '../../theme';
import { Button, Card, LightStatus, MenuRow, T } from '../../components/ui';
import { WaveBackground } from '../../components/Brand';
import { initials } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useShop } from '../../store/Shop';
import { useNav } from '../../navigation/hooks';

export default function Account() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const { wishlist, compareIds, clearCompare } = useShop();

  const confirmLogout = () =>
    Alert.alert('Sign out', 'Do you want to sign out of TechNest?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          clearCompare();
          await logout();
        },
      },
    ]);

  const headH = 150 + insets.top;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      <LightStatus />
      <LinearGradient colors={gradients.dark} style={{ height: headH, paddingTop: insets.top + 16, paddingHorizontal: 20, justifyContent: 'center' }}>
        <WaveBackground width={width} height={headH} />
        {user ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={styles.avatar}>
              <T size={22} weight="bold" color={colors.white}>
                {initials(user.first_name, user.last_name, user.email)}
              </T>
            </View>
            <View style={{ flex: 1 }}>
              <T size={18} weight="bold" color={colors.white} numberOfLines={1}>
                {`${user.first_name} ${user.last_name}`.trim() || 'TechNest customer'}
              </T>
              <T size={12.5} color="#D8CEC6" numberOfLines={1}>
                {user.email}
              </T>
            </View>
          </View>
        ) : (
          <View>
            <T size={20} weight="bold" color={colors.white}>
              Welcome to TechNest
            </T>
            <T size={12.5} color="#D8CEC6">
              Sign in to track orders and save favourites.
            </T>
          </View>
        )}
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, marginTop: -22 }}>
        {!user && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Button title="Sign in" onPress={() => nav.navigate('Login')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Register" variant="dark" onPress={() => nav.navigate('Register')} />
            </View>
          </View>
        )}
        <Card padded={false} style={{ paddingHorizontal: 14 }}>
          <MenuRow icon="receipt-outline" title="My Orders" onPress={() => nav.navigate('Orders')} />
          <MenuRow icon="heart-outline" title="Wishlist" badge={wishlist?.items.length} onPress={() => nav.navigate('Wishlist')} />
          <MenuRow icon="git-compare-outline" title="Compare" badge={compareIds.length} onPress={() => nav.navigate('Compare')} />
          {user && (
            <>
              <MenuRow icon="location-outline" title="Addresses" onPress={() => nav.navigate('Address')} />
              <MenuRow icon="person-outline" title="Account Information" onPress={() => nav.navigate('AccountInfo')} />
              <MenuRow icon="lock-closed-outline" title="Change Password" onPress={() => nav.navigate('ChangePassword')} last />
            </>
          )}
        </Card>

        <Card padded={false} style={{ paddingHorizontal: 14, marginTop: 14 }}>
          <MenuRow icon="notifications-outline" title="Notifications" onPress={() => nav.navigate('Notifications')} />
          <MenuRow icon="help-circle-outline" title="Help & Support" onPress={() => nav.navigate('Help')} />
          <MenuRow icon="information-circle-outline" title="About TechNest" onPress={() => nav.navigate('About')} />
          <MenuRow icon="server-outline" title="Server settings" onPress={() => nav.navigate('ServerSettings')} />
          <MenuRow icon="shield-checkmark-outline" title="Staff & admin panel" subtitle="For TechNest team members" onPress={() => nav.navigate('StaffLogin')} last />
        </Card>

        {user && (
          <Card padded={false} style={{ paddingHorizontal: 14, marginTop: 14 }}>
            <MenuRow icon="log-out-outline" title="Sign out" danger onPress={confirmLogout} last right={<View />} />
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
});
