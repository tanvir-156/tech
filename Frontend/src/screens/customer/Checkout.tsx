import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Button, Card, Header, Input, SelectField, StickyBar, T } from '../../components/ui';
import { api, endpoints } from '../../lib/api';
import { asList, divisions, errorMessage, money, num } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useShop } from '../../store/Shop';
import { useToast } from '../../store/Toast';
import { useNav } from '../../navigation/hooks';
import type { Address, Order } from '../../types';

export function isGatewayUrl(raw: string): boolean {
  const m = /^https:\/\/([^/:?#]+)/i.exec(raw);
  if (!m) return false;
  const host = m[1].toLowerCase();
  return host === 'sslcommerz.com' || host.endsWith('.sslcommerz.com');
}

export async function startPayment(orderId: number): Promise<void> {
  const session = await api<{ payment_url: string }>(endpoints.paymentInitiate, { method: 'POST', body: { order_id: orderId } });
  if (!isGatewayUrl(session.payment_url)) throw new Error('The server did not return a valid SSLCommerz payment link.');
  await WebBrowser.openBrowserAsync(session.payment_url);
}

export default function Checkout() {
  const nav = useNav();
  const toast = useToast();
  const { user } = useAuth();
  const { cart, cartSubtotal, reloadCart } = useShop();
  const items = cart?.items ?? [];

  const [f, setF] = useState({
    name: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
    phone: user?.phone ?? '',
    house: '',
    road: '',
    division: 'dhaka',
    district: '',
    upazila: '',
    postal: '',
    notes: '',
  });
  const [method, setMethod] = useState<'cod' | 'sslcommerz'>('cod');
  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState<{ code: string; type: string; amount: number; subtotal: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let live = true;
    api<unknown>(endpoints.address)
      .then((r) => {
        const a = asList<Address>(r)[0];
        if (!a || !live) return;
        setF((p) => ({
          ...p,
          name: p.name || `${a.first_name} ${a.last_name}`.trim(),
          house: p.house || a.address1,
          road: p.road || a.address2 || '',
          district: p.district || a.city,
          postal: p.postal || a.postal_code,
          division: divisions.some((d) => d.value === (a.region || '').toLowerCase()) ? (a.region || '').toLowerCase() : p.division,
        }));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const applied = discount && Math.abs(discount.subtotal - cartSubtotal) < 0.01 ? discount : null;
  const total = Math.max(cartSubtotal - (applied?.amount ?? 0), 0);

  const apply = async () => {
    const code = promo.trim().toUpperCase();
    if (!code) {
      toast('Enter a discount code.', 'info');
      return;
    }
    setChecking(true);
    setDiscount(null);
    try {
      const res = await api<{ discount_amount: string | number; discount_type?: string; discount?: { discount_type?: string } }>(endpoints.validateDiscount, {
        method: 'POST',
        body: { discount_type: 'promo', code, order_amount: cartSubtotal.toFixed(2) },
      });
      const type = res.discount_type ?? res.discount?.discount_type ?? 'promo';
      const amount = num(res.discount_amount);
      if (!(amount >= 0) || amount > cartSubtotal) throw new Error('This code cannot be applied to your cart.');
      setDiscount({ code, type, amount, subtotal: cartSubtotal });
      toast('Discount applied!', 'success');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setChecking(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Required';
    if (!/^(\+?880|0)?1[3-9]\d{8}$/.test(f.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a valid Bangladesh mobile number';
    if (!f.house.trim()) e.house = 'Required';
    if (!f.road.trim()) e.road = 'Required';
    if (!f.district.trim()) e.district = 'Required';
    if (!f.upazila.trim()) e.upazila = 'Required';
    if (!/^\d{4}$/.test(f.postal.trim())) e.postal = '4-digit postal code';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const place = async () => {
    if (!items.length) return;
    if (!validate()) {
      toast('Please fix the highlighted fields.', 'error');
      return;
    }
    setBusy(true);
    try {
      const order = await api<Order>(endpoints.checkout, {
        method: 'POST',
        body: {
          shipping_name: f.name.trim(),
          shipping_phone: f.phone.trim(),
          shipping_house: f.house.trim(),
          shipping_road: f.road.trim(),
          shipping_division: f.division,
          shipping_district: f.district.trim(),
          shipping_upazila: f.upazila.trim(),
          shipping_postal_code: f.postal.trim(),
          shipping_instructions: f.notes.trim(),
          payment_method: method,
          ...(applied ? { discount_type: applied.type, discount_code: applied.code } : {}),
        },
      });
      await reloadCart();
      if (method === 'sslcommerz') {
        try {
          await startPayment(order.id);
        } catch (e) {
          toast(`Order placed, but payment couldn't start: ${errorMessage(e)}`, 'error');
        }
        nav.replace('OrderDetail', { id: order.id });
      } else {
        nav.replace('OrderSuccess', { orderId: order.id, method });
      }
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Checkout" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <T size={16} weight="bold" style={{ marginBottom: 10 }}>
            Delivery address
          </T>
          <Card>
            <Input label="Full name" value={f.name} onChangeText={set('name')} error={errors.name} icon="person-outline" required />
            <Input label="Mobile number" value={f.phone} onChangeText={set('phone')} error={errors.phone} keyboardType="phone-pad" icon="call-outline" placeholder="01712345678" required />
            <Input label="House / Flat" value={f.house} onChangeText={set('house')} error={errors.house} placeholder="House 12, Flat 4B" required />
            <Input label="Road / Area" value={f.road} onChangeText={set('road')} error={errors.road} placeholder="Road 5, Section 7" required />
            <SelectField label="Division" value={f.division} onChange={set('division')} options={divisions} required />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Input style={{ flex: 1 }} label="District" value={f.district} onChangeText={set('district')} error={errors.district} placeholder="Dhaka" required />
              <Input style={{ flex: 1 }} label="Upazila / Thana" value={f.upazila} onChangeText={set('upazila')} error={errors.upazila} placeholder="Mirpur" required />
            </View>
            <Input label="Postal code" value={f.postal} onChangeText={(t) => set('postal')(t.replace(/\D/g, '').slice(0, 4))} error={errors.postal} keyboardType="number-pad" placeholder="1216" required />
            <Input label="Delivery notes (optional)" value={f.notes} onChangeText={set('notes')} multiline placeholder="Landmark, preferred time…" style={{ marginBottom: 0 }} />
          </Card>

          <T size={16} weight="bold" style={{ marginTop: 20, marginBottom: 10 }}>
            Payment method
          </T>
          <Card padded={false}>
            <PayOption selected={method === 'cod'} onPress={() => setMethod('cod')} icon="cash-outline" title="Cash on Delivery" sub="Pay when your order arrives" />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <PayOption selected={method === 'sslcommerz'} onPress={() => setMethod('sslcommerz')} icon="card-outline" title="Online payment" sub="Cards, mobile banking & net banking via SSLCommerz" />
          </Card>

          <T size={16} weight="bold" style={{ marginTop: 20, marginBottom: 10 }}>
            Have a discount code?
          </T>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Input style={{ flex: 1, marginBottom: 0 }} value={promo} onChangeText={(t) => { setPromo(t); setDiscount(null); }} autoCapitalize="characters" placeholder="Enter promo code" icon="ticket-outline" />
            <Button title="Apply" small full={false} onPress={apply} loading={checking} style={{ height: 50, width: 88 }} />
          </View>
          {applied && (
            <View style={styles.applied}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <T size={12.5} weight="medium" color={colors.success} style={{ flex: 1 }}>
                {applied.code} applied — you save {money(applied.amount)}
              </T>
            </View>
          )}

          <Card style={{ marginTop: 20 }}>
            <T weight="bold" size={14} style={{ marginBottom: 8 }}>
              Order summary
            </T>
            {items.map((i) => (
              <View key={i.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 10 }}>
                <T size={12.5} color={colors.text2} numberOfLines={1} style={{ flex: 1 }}>
                  {i.product_name} × {i.quantity}
                </T>
                <T size={12.5} weight="medium">
                  {money(num(i.discounted_price) * i.quantity)}
                </T>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
            <SumRow label="Subtotal" value={money(cartSubtotal)} />
            {applied && <SumRow label={`Discount (${applied.code})`} value={`-${money(applied.amount)}`} color={colors.success} />}
            <SumRow label="Delivery" value="Confirmed with your order" muted />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <StickyBar>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View>
            <T size={11} color={colors.muted}>
              Total amount
            </T>
            <T size={19} weight="bold" color={colors.primary}>
              {money(total)}
            </T>
          </View>
          <View style={{ flex: 1 }}>
            <Button title={method === 'cod' ? 'Place Order' : 'Place Order & Pay'} icon="lock-closed-outline" onPress={place} loading={busy} disabled={!items.length} />
          </View>
        </View>
      </StickyBar>
    </View>
  );
}

function SumRow({ label, value, color, muted }: { label: string; value: string; color?: string; muted?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <T size={12.5} color={colors.muted}>
        {label}
      </T>
      <T size={12.5} weight="medium" color={color ?? (muted ? colors.muted : colors.text)}>
        {value}
      </T>
    </View>
  );
}

function PayOption({ selected, onPress, icon, title, sub }: { selected: boolean; onPress: () => void; icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.pay, selected && { backgroundColor: colors.primarySofter }]}>
      <View style={[styles.radio, selected && { borderColor: colors.primary }]}>{selected && <View style={styles.dot} />}</View>
      <View style={styles.payIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <T weight="medium" size={13.5}>
          {title}
        </T>
        <T size={11.5} color={colors.muted}>
          {sub}
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pay: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  payIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  applied: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.successSoft, padding: 10, borderRadius: radius.md, marginTop: 10 },
});
