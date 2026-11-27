import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors, radius } from '../../theme';

import {
  Button,
  Card,
  ErrorState,
  Header,
  Img,
  Input,
  Loader,
  Sheet,
  StatusBadge,
  StickyBar,
  T,
} from '../../components/ui';

import { api, endpoints } from '../../lib/api';

import {
  dateTime,
  errorMessage,
  money,
  num,
  orderCode,
} from '../../lib/format';

import { useToast } from '../../store/Toast';
import { useNav, useParams } from '../../navigation/hooks';

import { startPayment } from './Checkout';

import type { Order } from '../../types';

// =========================================================
// ORDER TRACKING STEPS
// =========================================================

const STEPS = [
  { key: 'pending', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

// =========================================================
// REFUND API
// =========================================================

const REFUND_REQUEST_URL =
  '/api/v1/payments/refunds/request/';

const refundStatusUrl = (orderId: number) =>
  `/api/v1/payments/refunds/order/${orderId}/`;

// =========================================================
// REFUND TYPES
// =========================================================

type Refund = {
  id: number;
  payment_id: number;
  order_id: number;
  amount: string;
  currency: string;
  reason: string;
  status: string;
  status_display: string;
  admin_note?: string | null;
  failure_reason?: string | null;
  refund_reference_id?: string | null;
  processing_started_at?: string | null;
  created_at: string;
  completed_at?: string | null;
};

type RefundStatusResponse = {
  has_refund: boolean;
  refund: Refund | null;
};

type RefundRequestResponse = {
  message: string;
  refund: Refund;
};

// =========================================================
// ORDER DETAIL SCREEN
// =========================================================

export default function OrderDetail() {

  const nav = useNav();
  const toast = useToast();

  const { id = 0 } = useParams<{ id: number }>();

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState('');

  const [busy, setBusy] = useState(false);

  // =====================================================
  // REFUND STATES
  // =====================================================

  const [refund, setRefund] =
    useState<Refund | null>(null);

  const [refundOpen, setRefundOpen] =
    useState(false);

  const [refundReason, setRefundReason] =
    useState('');

  const [refundBusy, setRefundBusy] =
    useState(false);

  const [refundError, setRefundError] =
    useState('');

  const [refundLoading, setRefundLoading] =
    useState(true);

  // =====================================================
  // LOAD ORDER AND REFUND INFORMATION
  // =====================================================

  const load = useCallback(
    async (refresh = false) => {

      if (refresh) {
        setRefreshing(true);
      }

      setRefundLoading(true);
      setRefundError('');

      try {

        const result = await api<Order>(
          `${endpoints.orders}${id}/`
        );

        setOrder(result);
        setError('');

        if (result.payment_method === 'sslcommerz') {

          try {

            const response =
              await api<RefundStatusResponse>(
                refundStatusUrl(id)
              );

            setRefund(
              response.has_refund
                ? response.refund
                : null
            );

          } catch (e) {

            setRefundError(errorMessage(e));

          }

        } else {

          setRefund(null);

        }

      } catch (e) {

        setError(errorMessage(e));

      } finally {

        setLoading(false);
        setRefreshing(false);
        setRefundLoading(false);

      }

    },
    [id]
  );

  useEffect(() => {

    void load();

    return nav.addListener(
      'focus',
      () => void load()
    );

  }, [load, nav]);

  // =====================================================
  // CANCEL ORDER
  // =====================================================

  const cancel = () => {

    if (busy || refundBusy) {
      return;
    }

    Alert.alert(
      'Cancel this order?',
      'This cannot be undone.',
      [
        {
          text: 'Keep order',
          style: 'cancel',
        },
        {
          text: 'Cancel order',
          style: 'destructive',

          onPress: async () => {

            setBusy(true);

            try {

              await api(
                `${endpoints.orders}${id}/cancel/`,
                {
                  method: 'POST',
                }
              );

              toast(
                'Order cancelled.',
                'success'
              );

              await load();

            } catch (e) {

              toast(
                errorMessage(e),
                'error'
              );

            } finally {

              setBusy(false);

            }

          },

        },
      ]
    );

  };

  // =====================================================
  // PAY NOW
  // =====================================================

  const pay = async () => {

    if (busy || refundBusy) {
      return;
    }

    setBusy(true);

    try {

      await startPayment(id);

    } catch (e) {

      toast(
        errorMessage(e),
        'error'
      );

    } finally {

      await load();

      setBusy(false);

    }

  };

  // =====================================================
  // SUBMIT REFUND REQUEST
  // =====================================================

  const submitRefund = async () => {

    if (refundBusy || busy || refundLoading) {
      return;
    }

    if (
      !order ||
      order.payment_method !== 'sslcommerz' ||
      order.payment_status !== 'paid' ||
      !['pending', 'confirmed'].includes(order.status)
    ) {

      toast(
        'This order is not eligible for a refund request.',
        'error'
      );

      return;

    }

    if (
      refundError ||
      (
        refund &&
        (
          refund.status !== 'rejected' ||
          !!refund.refund_reference_id ||
          !!refund.processing_started_at
        )
      )
    ) {

      toast(
        'A refund request cannot be submitted at this time.',
        'error'
      );

      return;

    }

    const reason = refundReason.trim();

    if (!reason) {

      toast(
        'Please enter your refund reason.',
        'error'
      );

      return;

    }

    if (reason.length > 255) {

      toast(
        'Refund reason cannot exceed 255 characters.',
        'error'
      );

      return;

    }

    setRefundBusy(true);

    try {

      const response =
        await api<RefundRequestResponse>(
          REFUND_REQUEST_URL,
          {
            method: 'POST',

            body: {
              order_id: id,
              reason,
            },
          }
        );

      setRefund(response.refund);

      setRefundOpen(false);

      setRefundReason('');

      toast(
        response.message ||
          'Refund request submitted successfully.',
        'success'
      );

      await load();

    } catch (e) {

      toast(
        errorMessage(e),
        'error'
      );

    } finally {

      setRefundBusy(false);

    }

  };

  // =====================================================
  // LOADING AND ERROR
  // =====================================================

  if (loading) {

    return (
      <Shell>
        <Loader />
      </Shell>
    );

  }

  if (error || !order) {

    return (
      <Shell>
        <ErrorState
          message={error || 'Order not found'}
          onRetry={() => load()}
        />
      </Shell>
    );

  }

  // =====================================================
  // ORDER STATUS
  // =====================================================

  const cancelled =
    order.status === 'cancelled';

  const stepIndex = Math.max(
    STEPS.findIndex(
      s => s.key === order.status
    ),
    0
  );

  const activeOrder =
    ['pending', 'confirmed'].includes(
      order.status
    );

  const onlinePayment =
    order.payment_method === 'sslcommerz';

  const paid =
    order.payment_status === 'paid';

  const refunded =
    order.payment_status === 'refunded';

  // =====================================================
  // REFUND ELIGIBILITY
  // =====================================================

  const canRetryRefund =
    refund?.status === 'rejected' &&
    !refund.refund_reference_id &&
    !refund.processing_started_at;

  const hasBlockingRefund =
    !!refund && !canRetryRefund;

  const canRequestRefund =
    onlinePayment &&
    paid &&
    activeOrder &&
    !refundLoading &&
    !refundError &&
    !hasBlockingRefund;

  // =====================================================
  // CANCEL AND PAY ELIGIBILITY
  // =====================================================

  const canCancel =
    activeOrder &&
    !paid &&
    (
      !onlinePayment ||
      (!refundLoading && !refundError)
    ) &&
    (
      !hasBlockingRefund ||
      (
        refunded &&
        refund?.status === 'refunded' &&
        !!refund.completed_at
      )
    );

  const canPay =
    onlinePayment &&
    order.payment_status === 'pending' &&
    activeOrder &&
    !refundLoading &&
    !refundError &&
    !hasBlockingRefund;

  // =====================================================
  // REFUND STATUS COLOR
  // =====================================================

  const refundColor =
    refund?.status === 'refunded'
      ? colors.success
      : refund?.status === 'rejected' ||
        refund?.status === 'failed'
        ? colors.danger
        : colors.primary;

  // =====================================================
  // RENDER
  // =====================================================

  return (

    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
      }}
    >

      <Header title="Order Details" />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 30,
        }}

        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >

        {/* ORDER HEADER */}

        <View style={styles.orderHeader}>

          <View>

            <T size={20} weight="bold">
              {orderCode(order.id)}
            </T>

            <T
              size={11.5}
              color={colors.muted}
            >
              Placed on {dateTime(order.created_at)}
            </T>

          </View>

          <StatusBadge status={order.status} />

        </View>

        {/* ORDER TRACKING */}

        <Card style={{ marginTop: 16 }}>

          {cancelled ? (

            <View style={styles.cancelledRow}>

              <Ionicons
                name="close-circle"
                size={24}
                color={colors.danger}
              />

              <T
                size={13}
                color={colors.text2}
                style={{ flex: 1 }}
              >
                This order was cancelled.
              </T>

            </View>

          ) : (

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
              }}
            >

              {STEPS.map((s, i) => {

                const done = i <= stepIndex;

                return (

                  <View
                    key={s.key}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                    }}
                  >

                    <View style={styles.stepRow}>

                      <View
                        style={[
                          styles.line,
                          {
                            opacity: i === 0 ? 0 : 1,

                            backgroundColor: done
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                      />

                      <View
                        style={[
                          styles.dot,

                          done && {
                            backgroundColor:
                              colors.primary,

                            borderColor:
                              colors.primary,
                          },
                        ]}
                      >

                        {done && (

                          <Ionicons
                            name="checkmark"
                            size={13}
                            color={colors.white}
                          />

                        )}

                      </View>

                      <View
                        style={[
                          styles.line,
                          {
                            opacity:
                              i === STEPS.length - 1
                                ? 0
                                : 1,

                            backgroundColor:
                              i < stepIndex
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                      />

                    </View>

                    <T
                      size={10.5}
                      weight={
                        done ? 'bold' : 'medium'
                      }
                      color={
                        done
                          ? colors.primary
                          : colors.muted
                      }
                      style={{ marginTop: 6 }}
                    >
                      {s.label}
                    </T>

                  </View>

                );

              })}

            </View>

          )}

        </Card>

        {/* CUSTOMER AND PAYMENT INFORMATION */}

        <Card style={{ marginTop: 12 }}>

          <Info
            icon="person-outline"
            title="Customer"
            lines={[
              order.shipping_name,
              order.shipping_phone,
            ]}
          />

          <View style={styles.infoDivider} />

          <Info
            icon="location-outline"
            title="Shipping address"
            lines={[
              order.shipping_address,

              order.shipping_instructions
                ? `Note: ${order.shipping_instructions}`
                : '',
            ]}
          />

          <View style={styles.infoDivider} />

          <Info
            icon="card-outline"
            title="Payment"
            lines={[
              `${
                order.payment_method_display ??
                (
                  order.payment_method === 'cod'
                    ? 'Cash on Delivery'
                    : 'Online payment'
                )
              } · ${order.payment_status}`,
            ]}
          />

        </Card>

        {/* REFUND STATUS */}

        {refund && (

          <Card style={{ marginTop: 12 }}>

            <View style={styles.refundHeader}>

              <View style={styles.refundIcon}>

                <Ionicons
                  name="return-down-back-outline"
                  size={22}
                  color={colors.primary}
                />

              </View>

              <View style={{ flex: 1 }}>

                <T size={14} weight="bold">
                  Refund Information
                </T>

                <T
                  size={11.5}
                  color={colors.muted}
                >
                  Requested on {dateTime(refund.created_at)}
                </T>

              </View>

            </View>

            <View style={styles.infoDivider} />

            <Line
              label="Refund amount"
              value={money(num(refund.amount))}
            />

            <Line
              label="Refund status"
              value={
                refund.status_display ||
                refund.status
              }
              color={refundColor}
            />

            <T
              size={12}
              weight="medium"
              style={{ marginTop: 10 }}
            >
              Refund reason
            </T>

            <T
              size={12.5}
              color={colors.text2}
              style={{ marginTop: 4 }}
            >
              {refund.reason}
            </T>

            {!!refund.admin_note && (

              <View style={styles.refundMessage}>

                <T size={12} weight="bold">
                  Admin response
                </T>

                <T
                  size={12}
                  color={colors.text2}
                  style={{ marginTop: 4 }}
                >
                  {refund.admin_note}
                </T>

              </View>

            )}

            {!!refund.failure_reason && (

              <T
                size={12}
                color={colors.danger}
                style={{ marginTop: 8 }}
              >
                {refund.failure_reason}
              </T>

            )}

            {refund.status === 'requested' && (

              <View style={styles.refundMessage}>

                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.primary}
                />

                <T
                  size={12}
                  color={colors.text2}
                  style={{ flex: 1 }}
                >
                  Your refund request is awaiting
                  admin approval.
                </T>

              </View>

            )}

            {refund.status === 'approved' && (

              <View style={styles.refundMessage}>

                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={colors.success}
                />

                <T
                  size={12}
                  color={colors.text2}
                  style={{ flex: 1 }}
                >
                  Your refund request has been
                  approved and is awaiting processing.
                </T>

              </View>

            )}

            {refund.status === 'processing' && (

              <View style={styles.refundMessage}>

                <Ionicons
                  name="sync-outline"
                  size={18}
                  color={colors.primary}
                />

                <T
                  size={12}
                  color={colors.text2}
                  style={{ flex: 1 }}
                >
                  Your refund is being processed.
                </T>

              </View>

            )}

            {refund.status === 'refunded' && (

              <View style={styles.refundSuccess}>

                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success}
                />

                <View style={{ flex: 1 }}>

                  <T
                    size={12.5}
                    weight="bold"
                    color={colors.success}
                  >
                    Refund completed
                  </T>

                  {!!refund.completed_at && (

                    <T
                      size={11}
                      color={colors.muted}
                    >
                      {dateTime(refund.completed_at)}
                    </T>

                  )}

                </View>

              </View>

            )}

          </Card>

        )}

        {/* REFUND STATUS ERROR */}

        {!!refundError && (

          <Card style={{ marginTop: 12 }}>

            <T
              size={12}
              color={colors.danger}
            >
              Unable to load refund information.
            </T>

            <Button
              title="Retry"
              variant="outline"
              small
              onPress={() => load(true)}
              style={{ marginTop: 10 }}
            />

          </Card>

        )}

        {/* ORDER ITEMS */}

        <T
          size={16}
          weight="bold"
          style={{
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          Items ({order.items.length})
        </T>

        <View style={{ gap: 10 }}>

          {order.items.map(i => (

            <Card key={i.id}>

              <View style={styles.productRow}>

                <Img
                  uri={i.product_image}
                  style={styles.productImage}
                />

                <View style={{ flex: 1 }}>

                  <T
                    size={13}
                    weight="medium"
                    numberOfLines={2}
                  >
                    {i.product_name}
                  </T>

                  <T
                    size={11}
                    color={colors.muted}
                    numberOfLines={1}
                  >
                    {[
                      i.ram,
                      i.storage,
                      i.color_name,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </T>

                  <View style={styles.productPrice}>

                    <T
                      size={12}
                      color={colors.text2}
                    >
                      {money(num(i.unit_price))}
                      {' × '}
                      {i.quantity}
                    </T>

                    <T size={13} weight="bold">
                      {money(num(i.line_total))}
                    </T>

                  </View>

                </View>

              </View>

            </Card>

          ))}

        </View>

        {/* ORDER SUMMARY */}

        <Card style={{ marginTop: 14 }}>

          <Line
            label="Subtotal"
            value={money(num(order.subtotal))}
          />

          {num(order.discount_amount) > 0 && (

            <Line
              label={`Discount${
                order.discount_code
                  ? ` (${order.discount_code})`
                  : ''
              }`}

              value={`-${money(
                num(order.discount_amount)
              )}`}

              color={colors.success}
            />

          )}

          <Line
            label="Delivery charge"
            value={money(
              num(
                (order as any).delivery_charge ?? 80
              )
            )}
          />

          <View style={styles.summaryDivider} />

          <View style={styles.totalRow}>

            <T weight="bold" size={15}>
              Total
            </T>

            <T
              weight="bold"
              size={18}
              color={colors.primary}
            >
              {money(num(order.total_amount))}
            </T>

          </View>

        </Card>

      </ScrollView>

      {/* =================================================
          ACTION BUTTONS
      ================================================= */}

      {(canCancel || canPay || canRequestRefund) && (

        <StickyBar>

          <View style={styles.actionRow}>

            {canCancel && (

              <View style={{ flex: 1 }}>

                <Button
                  title="Cancel Order"
                  variant="outline"
                  onPress={cancel}
                  disabled={
                    busy ||
                    refundBusy ||
                    refreshing
                  }
                />

              </View>

            )}

            {canPay && (

              <View style={{ flex: 1 }}>

                <Button
                  title="Pay Now"
                  icon="card-outline"
                  onPress={pay}
                  loading={busy}
                  disabled={
                    refundBusy ||
                    refreshing
                  }
                />

              </View>

            )}

            {canRequestRefund && (

              <View style={{ flex: 1 }}>

                <Button
                  title={
                    canRetryRefund
                      ? 'Request Refund Again'
                      : 'Request Refund'
                  }

                  icon="return-down-back-outline"

                  variant="outline"

                  disabled={
                    busy ||
                    refundBusy ||
                    refreshing
                  }

                  onPress={() => {

                    setRefundReason('');

                    setRefundOpen(true);

                  }}
                />

              </View>

            )}

          </View>

        </StickyBar>

      )}

      {/* =================================================
          REFUND REQUEST SHEET
      ================================================= */}

      <Sheet
        visible={refundOpen}

        onClose={() => {

          if (!refundBusy) {

            setRefundOpen(false);

          }

        }}

        title="Request Refund"
      >

        <View style={styles.refundSheet}>

          <View style={styles.refundAmountBox}>

            <View>

              <T
                size={12}
                color={colors.muted}
              >
                Requested refund amount
              </T>

              <T
                size={23}
                weight="bold"
                color={colors.primary}
                style={{ marginTop: 4 }}
              >
                {money(num(order.total_amount))}
              </T>

            </View>

            <Ionicons
              name="wallet-outline"
              size={30}
              color={colors.primary}
            />

          </View>

          <T
            size={12.5}
            color={colors.text2}
            style={{ marginBottom: 16 }}
          >
            Please explain why you want a refund.
            Your request will be reviewed by our
            admin team before processing.
          </T>

          <Input
            label="Refund reason"
            value={refundReason}
            onChangeText={setRefundReason}
            placeholder="Enter your refund reason..."
            multiline
            maxLength={255}
            editable={!refundBusy}
            required
            style={{ marginBottom: 0 }}
          />

          <T
            size={11}
            color={colors.muted}
            style={styles.characterCount}
          >
            {refundReason.length}/255
          </T>

          <View style={styles.refundNotice}>

            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.primary}
            />

            <T
              size={11.5}
              color={colors.text2}
              style={{ flex: 1 }}
            >
              Submitting a request does not immediately
              refund your payment. Refunds are subject
              to admin approval.
            </T>

          </View>

          <Button
            title="Submit Refund Request"
            icon="send-outline"
            onPress={submitRefund}
            loading={refundBusy}
            disabled={
              !refundReason.trim() ||
              refundBusy ||
              busy ||
              refundLoading ||
              !canRequestRefund
            }
            style={{
              width: '100%',
              marginTop: 16,
            }}
          />

          <Button
            title="Close"
            variant="outline"
            disabled={refundBusy}
            onPress={() => setRefundOpen(false)}
            style={{
              width: '100%',
              marginTop: 8,
            }}
          />

        </View>

      </Sheet>

    </View>

  );

}

// =========================================================
// SCREEN SHELL
// =========================================================

function Shell({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
      }}
    >

      <Header title="Order Details" />

      {children}

    </View>

  );

}

// =========================================================
// INFORMATION ROW
// =========================================================

function Info({
  icon,
  title,
  lines,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  lines: string[];
}) {

  return (

    <View style={styles.infoRow}>

      <View style={styles.infoIcon}>

        <Ionicons
          name={icon}
          size={18}
          color={colors.primary}
        />

      </View>

      <View style={{ flex: 1 }}>

        <T weight="bold" size={13}>
          {title}
        </T>

        {lines.filter(Boolean).map((l, i) => (

          <T
            key={i}
            size={12.5}
            color={colors.text2}
          >
            {l}
          </T>

        ))}

      </View>

    </View>

  );

}

// =========================================================
// SUMMARY LINE
// =========================================================

function Line({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {

  return (

    <View style={styles.summaryLine}>

      <T
        size={12.5}
        color={colors.muted}
      >
        {label}
      </T>

      <T
        size={12.5}
        weight="medium"
        color={color}
      >
        {value}
      </T>

    </View>

  );

}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cancelledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },

  line: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },

  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },

  productRow: {
    flexDirection: 'row',
    gap: 12,
  },

  productImage: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: '#FAFAFC',
  },

  productPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 10,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  actionRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },

  refundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  refundIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  refundMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginTop: 12,
  },

  refundSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginTop: 12,
  },

  refundSheet: {
    padding: 16,
    paddingBottom: 24,
  },

  refundAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },

  characterCount: {
    textAlign: 'right',
    marginTop: 5,
    marginBottom: 12,
  },

  refundNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 12,
  },

});