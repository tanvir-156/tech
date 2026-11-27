import React, { useCallback, useState } from 'react';

import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius } from '../../theme';

import {
  Button,
  Card,
  Header,
  Input,
  StickyBar,
  T,
  Sheet,
} from '../../components/ui';

import { api, endpoints } from '../../lib/api';

import {
  asList,
  errorMessage,
  money,
  num,
} from '../../lib/format';

import { useAuth } from '../../store/Auth';
import { useShop } from '../../store/Shop';
import { useToast } from '../../store/Toast';
import { useNav } from '../../navigation/hooks';

import { DIVISIONS, divisionValue } from './Address';

import type { Address, Order } from '../../types';


// =========================================================
// DELIVERY CONFIGURATION
// =========================================================

export const SYLHET_DELIVERY_CHARGE = 80;
export const OTHER_DELIVERY_CHARGE = 130;

export const SYLHET_FREE_THRESHOLD = 5000;
export const OTHER_FREE_THRESHOLD = 10000;


// =========================================================
// CALCULATE DELIVERY CHARGE
// =========================================================

export function calculateDeliveryCharge(
  division: string,
  purchaseAmount: number
): number | null {

  const selectedDivision = divisionValue(division);

  if (!selectedDivision) {
    return null;
  }

  if (
    !Number.isFinite(purchaseAmount) ||
    purchaseAmount < 0
  ) {
    return null;
  }

  if (selectedDivision === 'sylhet') {

    if (purchaseAmount >= SYLHET_FREE_THRESHOLD) {
      return 0;
    }

    return SYLHET_DELIVERY_CHARGE;
  }

  if (purchaseAmount >= OTHER_FREE_THRESHOLD) {
    return 0;
  }

  return OTHER_DELIVERY_CHARGE;
}


// =========================================================
// FREE DELIVERY THRESHOLD
// =========================================================

export function getFreeDeliveryThreshold(
  division: string
): number | null {

  const selectedDivision = divisionValue(division);

  if (!selectedDivision) {
    return null;
  }

  return selectedDivision === 'sylhet'
    ? SYLHET_FREE_THRESHOLD
    : OTHER_FREE_THRESHOLD;
}


// =========================================================
// SSLCOMMERZ URL VALIDATION
// =========================================================

export function isGatewayUrl(raw: string): boolean {

  const m = /^https:\/\/([^/:?#]+)/i.exec(raw);

  if (!m) {
    return false;
  }

  const host = m[1].toLowerCase();

  return (
    host === 'sslcommerz.com' ||
    host.endsWith('.sslcommerz.com')
  );
}


// =========================================================
// START ONLINE PAYMENT
// =========================================================

type GatewayPayment = {
  id: number;
  transaction_id: string;
  status: string;
};

async function findGatewayPayment(
  transactionId: string
): Promise<GatewayPayment> {

  let page = 1;

  while (true) {

    const response = await api<{
      results: GatewayPayment[];
      next: string | null;
    }>(`/api/v1/payments/?page=${page}`);

    const payment = response.results.find(
      item => item.transaction_id === transactionId
    );

    if (payment) return payment;

    if (!response.next) break;

    page += 1;
  }

  throw new Error(
    'Payment record not found. Check your order before retrying.'
  );
}

export async function startPayment(
  orderId: number
): Promise<void> {

  const session = await api<{
    payment_url?: string;
    transaction_id: string;
    payment_status?: string;
  }>(endpoints.paymentInitiate, {
    method: 'POST',
    body: { order_id: orderId },
  });

  if (session.payment_status === 'paid') return;

  if (
    !session.payment_url ||
    !isGatewayUrl(session.payment_url)
  ) {
    throw new Error('Invalid SSLCommerz payment link.');
  }

  const payment = await findGatewayPayment(
    session.transaction_id
  );

  let subscription:
    ReturnType<typeof AppState.addEventListener> |
    undefined;

  let leftApp = AppState.currentState !== 'active';

  const returned = new Promise<void>(resolve => {

    subscription = AppState.addEventListener(
      'change',
      state => {

        if (state !== 'active') {
          leftApp = true;
        } else if (leftApp) {
          resolve();
        }

      }
    );

  });

  try {

    const browser = await WebBrowser.openBrowserAsync(
      session.payment_url
    );

    if (
      Platform.OS === 'android' &&
      browser.type === 'opened'
    ) {
      await returned;
    }

  } finally {

    subscription?.remove();

  }

  const verified = await api<GatewayPayment>(
    `/api/v1/payments/${payment.id}/verify/`,
    { method: 'POST' }
  );

  if (verified.status !== 'paid') {
    throw new Error(
      `Payment status: ${verified.status}. Check your order before paying again.`
    );
  }
}


// =========================================================
// CHECKOUT FORM TYPE
// =========================================================

type CheckoutForm = {
  first_name: string;
  last_name: string;
  phone: string;
  address1: string;
  address2: string;
  district: string;
  upazila: string;
  postal_code: string;
  division: string;
  notes: string;
};


// =========================================================
// CHECKOUT SCREEN
// =========================================================

export default function Checkout() {

  const nav = useNav();
  const toast = useToast();

  const { user } = useAuth();

  const {
    cart,
    cartSubtotal,
    reloadCart,
  } = useShop();

  const items = cart?.items ?? [];


  // =====================================================
  // CUSTOMER INFORMATION
  // =====================================================

  const [f, setF] = useState<CheckoutForm>({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    phone: user?.phone ?? '',
    address1: '',
    address2: '',
    district: '',
    upazila: '',
    postal_code: '',
    division: '',
    notes: '',
  });


  // =====================================================
  // SAVED ADDRESS
  // =====================================================

  const [savedAddress, setSavedAddress] =
    useState<Address | null>(null);

  const [divisionOpen, setDivisionOpen] =
    useState(false);


  // =====================================================
  // PAYMENT METHOD
  // =====================================================

  const [method, setMethod] =
    useState<'cod' | 'sslcommerz'>('cod');


  // =====================================================
  // DISCOUNT
  // =====================================================

  const [promo, setPromo] = useState('');

  const [discount, setDiscount] = useState<{
    code: string;
    type: string;
    amount: number;
    subtotal: number;
  } | null>(null);


  // =====================================================
  // UI STATES
  // =====================================================

  const [checking, setChecking] = useState(false);

  const [busy, setBusy] = useState(false);

  const [errors, setErrors] =
    useState<Record<string, string>>({});


  // =====================================================
  // UPDATE FORM FIELD
  // =====================================================

  const set = (key: keyof CheckoutForm) =>
    (value: string) => {

      setF(prev => ({
        ...prev,
        [key]: value,
      }));

      setErrors(prev => ({
        ...prev,
        [key]: '',
      }));

    };


  // =====================================================
  // LOAD SAVED ADDRESS
  // =====================================================

  useFocusEffect(
    useCallback(() => {

      let live = true;

      api<unknown>(endpoints.address)
        .then(r => {

          if (!live) {
            return;
          }

          const a =
            asList<Address>(r)[0] ?? null;

          setSavedAddress(a);

          if (a) {

            setF(prev => ({
              ...prev,

              first_name:
                a.first_name || prev.first_name,

              last_name:
                a.last_name || prev.last_name,

              address1: a.address1 || '',

              address2: a.address2 || '',

              district: a.city || '',

              upazila: a.upazila || '',

              postal_code:
                a.postal_code || '',

              division:
                divisionValue(a.region),
            }));

          }

        })
        .catch(() => undefined);

      return () => {
        live = false;
      };

    }, [])
  );


  // =====================================================
  // APPLIED DISCOUNT
  // =====================================================

  const applied =
    discount &&
    Math.abs(
      discount.subtotal - cartSubtotal
    ) < 0.01
      ? discount
      : null;


  // =====================================================
  // PURCHASE AMOUNT AFTER DISCOUNT
  // =====================================================

  const purchaseAmount = Math.max(
    cartSubtotal - (applied?.amount ?? 0),
    0
  );


  // =====================================================
  // DYNAMIC DELIVERY CHARGE
  // =====================================================

  const deliveryCharge = calculateDeliveryCharge(
    f.division,
    purchaseAmount
  );


  // =====================================================
  // FREE DELIVERY THRESHOLD
  // =====================================================

  const freeDeliveryThreshold =
    getFreeDeliveryThreshold(f.division);

  const remainingForFreeDelivery =
    freeDeliveryThreshold === null
      ? null
      : Math.max(
          freeDeliveryThreshold - purchaseAmount,
          0
        );


  // =====================================================
  // FINAL TOTAL
  // =====================================================

  const total =
    deliveryCharge === null
      ? null
      : purchaseAmount + deliveryCharge;


  // =====================================================
  // APPLY DISCOUNT
  // =====================================================

  const apply = async () => {

    const code = promo.trim().toUpperCase();

    if (!code) {

      toast(
        'Enter a discount code.',
        'info'
      );

      return;
    }

    setChecking(true);
    setDiscount(null);

    try {

      const res = await api<{
        discount_amount: string | number;
        discount_type?: string;
        discount?: {
          discount_type?: string;
        };
      }>(
        endpoints.validateDiscount,
        {
          method: 'POST',

          body: {
            discount_type: 'promo',
            code,
            order_amount:
              cartSubtotal.toFixed(2),
          },
        }
      );

      const type =
        res.discount_type ??
        res.discount?.discount_type ??
        'promo';

      const amount =
        num(res.discount_amount);

      if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        amount > cartSubtotal
      ) {
        throw new Error(
          'This code cannot be applied to your cart.'
        );
      }

      setDiscount({
        code,
        type,
        amount,
        subtotal: cartSubtotal,
      });

      toast(
        'Discount applied!',
        'success'
      );

    } catch (e) {

      toast(
        errorMessage(e),
        'error'
      );

    } finally {

      setChecking(false);

    }
  };


  // =====================================================
  // VALIDATE CHECKOUT FORM
  // =====================================================

  const validate = () => {

    const e: Record<string, string> = {};

    if (!f.first_name.trim()) {
      e.first_name = 'Required';
    }

    if (!f.last_name.trim()) {
      e.last_name = 'Required';
    }

    const phone =
      f.phone.replace(/[\s-]/g, '');

    if (
      !/^(\+?880|0)?1[3-9]\d{8}$/.test(phone)
    ) {
      e.phone =
        'Enter a valid Bangladesh mobile number';
    }

    if (!f.address1.trim()) {
      e.address1 = 'Required';
    }

    if (!f.district.trim()) {
      e.district = 'Required';
    }

    if (!f.upazila.trim()) {
      e.upazila = 'Required';
    }

    if (!divisionValue(f.division)) {
      e.division = 'Select division';
    }

    if (
      !/^\d{4}$/.test(
        f.postal_code.trim()
      )
    ) {
      e.postal_code =
        'Enter a 4-digit postal code';
    }

    setErrors(e);

    return Object.keys(e).length === 0;
  };


  // =====================================================
  // PLACE ORDER
  // =====================================================

  const place = async () => {

    if (!items.length || busy) {
      return;
    }

    if (!validate()) {

      toast(
        'Please fix the highlighted fields.',
        'error'
      );

      return;
    }

    setBusy(true);

    try {

      const order = await api<Order>(
        endpoints.checkout,
        {
          method: 'POST',

          body: {

            shipping_name:
              `${f.first_name.trim()} ${f.last_name.trim()}`,

            shipping_phone:
              f.phone.trim(),

            shipping_house:
              f.address1.trim(),

            shipping_road:
              f.address2.trim() ||
              f.address1.trim(),

            shipping_division:
              divisionValue(f.division),

            shipping_district:
              f.district.trim(),

            shipping_upazila:
              f.upazila.trim(),

            shipping_postal_code:
              f.postal_code.trim(),

            shipping_instructions:
              f.notes.trim(),

            payment_method: method,

            ...(applied
              ? {
                  discount_type:
                    applied.type,

                  discount_code:
                    applied.code,
                }
              : {}),
          },
        }
      );

      await reloadCart();


      // ===============================================
      // ONLINE PAYMENT
      // ===============================================

      if (method === 'sslcommerz') {

        try {

          await startPayment(order.id);

        } catch (e) {

          toast(
            `Order placed. Payment not confirmed: ${errorMessage(e)}`,
            'error'
          );

        }

        nav.replace(
          'OrderDetail',
          {
            id: order.id,
          }
        );

      } else {


        // =============================================
        // CASH ON DELIVERY
        // =============================================

        nav.replace(
          'OrderSuccess',
          {
            orderId: order.id,
            method,
          }
        );

      }

    } catch (e) {

      toast(
        errorMessage(e),
        'error'
      );

    } finally {

      setBusy(false);

    }
  };


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <View style={styles.container}>

      <Header title="Checkout" />

      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={{ flex: 1 }}
      >

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >

          {/* SHIPPING ADDRESS */}

          <View style={styles.sectionHeader}>

            <T size={16} weight="bold">
              Shipping & Billing
            </T>

            <Pressable
              onPress={() =>
                nav.navigate('Address')
              }
            >

              <T
                size={12.5}
                weight="bold"
                color={colors.primary}
              >
                {savedAddress
                  ? 'Edit saved address'
                  : 'Save an address'}
              </T>

            </Pressable>

          </View>


          <Card>

            <View style={styles.row}>

              <Input
                style={styles.half}
                label="First Name"
                value={f.first_name}
                onChangeText={set('first_name')}
                error={errors.first_name}
                required
              />

              <Input
                style={styles.half}
                label="Last Name"
                value={f.last_name}
                onChangeText={set('last_name')}
                error={errors.last_name}
                required
              />

            </View>

            <Input
              label="Mobile Number"
              value={f.phone}
              onChangeText={set('phone')}
              error={errors.phone}
              keyboardType="phone-pad"
              placeholder="01712345678"
              required
            />

            <Input
              label="Address Line 1"
              value={f.address1}
              onChangeText={set('address1')}
              error={errors.address1}
              placeholder="House, road, area"
              multiline
              required
            />

            <Input
              label="Address Line 2 (optional)"
              value={f.address2}
              onChangeText={set('address2')}
              placeholder="Apartment, floor, landmark"
              multiline
            />

            <View style={styles.row}>

              <Input
                style={styles.half}
                label="City / District"
                value={f.district}
                onChangeText={set('district')}
                error={errors.district}
                placeholder="e.g. Sylhet"
                required
              />

              <Input
                style={styles.half}
                label="Upazila / Thana"
                value={f.upazila}
                onChangeText={set('upazila')}
                error={errors.upazila}
                placeholder="e.g. Beanibazar"
                required
              />

            </View>

            <View style={styles.row}>

              <Input
                style={styles.half}
                label="Post Code"
                value={f.postal_code}
                onChangeText={v =>
                  set('postal_code')(
                    v.replace(/\D/g, '')
                  )
                }
                error={errors.postal_code}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="4-digit code"
                required
              />

              <View style={styles.half}>

                <T
                  size={12.5}
                  weight="medium"
                  style={styles.fieldLabel}
                >
                  Division *
                </T>

                <Pressable
                  style={styles.select}
                  onPress={() =>
                    setDivisionOpen(true)
                  }
                >

                  <T
                    size={12}
                    color={
                      f.division
                        ? colors.text
                        : colors.muted
                    }
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    {DIVISIONS.find(
                      d =>
                        d.value ===
                        divisionValue(f.division)
                    )?.label ??
                      'Select Division'}
                  </T>

                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={colors.text2}
                  />

                </Pressable>

                {!!errors.division && (

                  <T
                    size={11}
                    color={colors.danger}
                  >
                    {errors.division}
                  </T>

                )}

              </View>

            </View>

            <Input
              label="Delivery notes (optional)"
              value={f.notes}
              onChangeText={set('notes')}
              placeholder="Landmark, preferred time…"
              multiline
              style={{ marginBottom: 0 }}
            />

          </Card>


          {/* DELIVERY INFORMATION */}

          <Card style={{ marginTop: 16 }}>

            <View style={styles.deliveryHeading}>

              <Ionicons
                name="car-outline"
                size={21}
                color={colors.primary}
              />

              <T size={14} weight="bold">
                Delivery Information
              </T>

            </View>

            {!divisionValue(f.division) ? (

              <T
                size={12.5}
                color={colors.muted}
              >
                Select your division to see the
                delivery charge.
              </T>

            ) : (

              <>

                <T
                  size={12.5}
                  color={colors.text2}
                >
                  {divisionValue(f.division) === 'sylhet'
                    ? 'Sylhet Division: ৳80 delivery. Free on purchases of ৳5,000 or more.'
                    : 'Other divisions: ৳130 delivery. Free on purchases of ৳10,000 or more.'}
                </T>

                {deliveryCharge === 0 ? (

                  <View style={styles.freeDeliveryMessage}>

                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.success}
                    />

                    <T
                      size={12.5}
                      color={colors.success}
                      weight="medium"
                      style={{ flex: 1 }}
                    >
                      Congratulations! You qualify
                      for FREE delivery.
                    </T>

                  </View>

                ) : (

                  remainingForFreeDelivery !== null && (

                    <T
                      size={12}
                      color={colors.muted}
                      style={{ marginTop: 8 }}
                    >
                      Add {money(remainingForFreeDelivery)} more
                      to get FREE delivery.
                    </T>

                  )

                )}

              </>

            )}

          </Card>


          {/* PAYMENT METHOD */}

          <T
            size={16}
            weight="bold"
            style={styles.sectionTitle}
          >
            Payment method
          </T>

          <Card padded={false}>

            <PayOption
              selected={method === 'cod'}
              onPress={() =>
                setMethod('cod')
              }
              icon="cash-outline"
              title="Cash on Delivery"
              sub="Pay when your order arrives"
            />

            <View style={styles.divider} />

            <PayOption
              selected={
                method === 'sslcommerz'
              }
              onPress={() =>
                setMethod('sslcommerz')
              }
              icon="card-outline"
              title="Online payment"
              sub="Cards, mobile banking & net banking via SSLCommerz"
            />

          </Card>


          {/* DISCOUNT CODE */}

          <T
            size={16}
            weight="bold"
            style={styles.sectionTitle}
          >
            Have a discount code?
          </T>

          <View style={styles.promoRow}>

            <Input
              style={{
                flex: 1,
                marginBottom: 0,
              }}
              value={promo}
              onChangeText={t => {
                setPromo(t);
                setDiscount(null);
              }}
              autoCapitalize="characters"
              placeholder="Enter promo code"
              icon="ticket-outline"
            />

            <Button
              title="Apply"
              small
              full={false}
              onPress={apply}
              loading={checking}
              style={{
                height: 50,
                width: 88,
              }}
            />

          </View>

          {applied && (

            <View style={styles.applied}>

              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.success}
              />

              <T
                size={12.5}
                weight="medium"
                color={colors.success}
                style={{ flex: 1 }}
              >
                {applied.code} applied — you save{' '}
                {money(applied.amount)}
              </T>

            </View>

          )}


          {/* ORDER SUMMARY */}

          <Card style={{ marginTop: 20 }}>

            <T
              weight="bold"
              size={14}
              style={{ marginBottom: 8 }}
            >
              Order summary
            </T>

            {items.map(i => (

              <View
                key={i.id}
                style={styles.summaryItem}
              >

                <T
                  size={12.5}
                  color={colors.text2}
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {i.product_name} × {i.quantity}
                </T>

                <T
                  size={12.5}
                  weight="medium"
                >
                  {money(
                    num(i.discounted_price) *
                    i.quantity
                  )}
                </T>

              </View>

            ))}

            <View style={styles.summaryDivider} />

            <SumRow
              label="Subtotal"
              value={money(cartSubtotal)}
            />

            {applied && (

              <SumRow
                label={`Discount (${applied.code})`}
                value={`-${money(applied.amount)}`}
                color={colors.success}
              />

            )}

            <SumRow
              label="Delivery charge"
              value={
                deliveryCharge === null
                  ? 'Select division'
                  : deliveryCharge === 0
                    ? 'FREE'
                    : money(deliveryCharge)
              }
              color={
                deliveryCharge === 0
                  ? colors.success
                  : colors.text
              }
            />

            <View style={styles.summaryDivider} />

            <SumRow
              label="Total"
              value={
                total === null
                  ? 'Select division'
                  : money(total)
              }
              color={colors.primary}
              bold
            />

          </Card>

        </ScrollView>

      </KeyboardAvoidingView>


      {/* STICKY CHECKOUT BAR */}

      <StickyBar>
        <View style={styles.stickyRow}>
          <View style={styles.stickyTotal}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={12} weight="medium" color={colors.text}>
                Total amount
              </T>
              <T size={11} color={colors.muted}>
                Including delivery
              </T>
            </View>
            <T size={19} weight="bold" color={colors.primary}>
              {total === null ? 'Select division' : money(total)}
            </T>
          </View>
          <Button
            title={method === 'cod' ? 'Place Order' : 'Place Order & Pay'}
            icon="lock-closed-outline"
            onPress={place}
            loading={busy}
            disabled={!items.length || busy || deliveryCharge === null}
            style={{ width: '100%' }}
          />
        </View>
      </StickyBar>


      {/* DIVISION SELECTOR */}

      <Sheet
        visible={divisionOpen}
        onClose={() =>
          setDivisionOpen(false)
        }
        title="Select Division"
      >

        <View style={{ padding: 16 }}>

          {DIVISIONS.map(d => (

            <Pressable
              key={d.value}
              style={styles.divisionOption}
              onPress={() => {

                set('division')(d.value);

                setDivisionOpen(false);

              }}
            >

              <T weight="medium">
                {d.label}
              </T>

              {divisionValue(f.division) ===
                d.value && (

                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                />

              )}

            </Pressable>

          ))}

        </View>

      </Sheet>

    </View>
  );
}


// =========================================================
// SUMMARY ROW
// =========================================================

function SumRow({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {

  return (

    <View style={styles.sumRow}>

      <T
        size={12.5}
        color={colors.muted}
        weight={
          bold ? 'bold' : 'regular'
        }
      >
        {label}
      </T>

      <T
        size={12.5}
        weight={
          bold ? 'bold' : 'medium'
        }
        color={
          color ?? colors.text
        }
      >
        {value}
      </T>

    </View>
  );
}


// =========================================================
// PAYMENT OPTION
// =========================================================

function PayOption({
  selected,
  onPress,
  icon,
  title,
  sub,
}: {
  selected: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
}) {

  return (

    <Pressable
      onPress={onPress}
      style={[
        styles.pay,

        selected && {
          backgroundColor:
            colors.primarySofter,
        },
      ]}
    >

      <View
        style={[
          styles.radio,

          selected && {
            borderColor:
              colors.primary,
          },
        ]}
      >

        {selected && (
          <View style={styles.dot} />
        )}

      </View>

      <View style={styles.payIcon}>

        <Ionicons
          name={icon}
          size={20}
          color={colors.primary}
        />

      </View>

      <View style={{ flex: 1 }}>

        <T
          weight="medium"
          size={13.5}
        >
          {title}
        </T>

        <T
          size={11.5}
          color={colors.muted}
        >
          {sub}
        </T>

      </View>

    </Pressable>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },

  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  half: {
    flex: 1,
    minWidth: 0,
  },

  fieldLabel: {
    marginBottom: 8,
  },

  select: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  promoRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },

  applied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successSoft,
    padding: 10,
    borderRadius: radius.md,
    marginTop: 10,
  },

  deliveryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },

  freeDeliveryMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },

  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 10,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },

  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  stickyRow: {
    width: '100%',
    gap: 10,
  },

  stickyTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  pay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },

  payIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  divisionOption: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

});