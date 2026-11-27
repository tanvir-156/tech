import React, { useState } from 'react';

import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadow } from '../../theme';

import {
  Button,
  Card,
  ErrorState,
  Loader,
  Segmented,
  SectionHeader,
  StatusBadge,
  T,
} from '../../components/ui';

import { AdminTopBar } from '../../components/AdminKit';
import { AreaChart } from '../../components/AreaChart';

import {
  adminApi,
  ListResponse,
  Stats,
} from '../../lib/adminApi';

import {
  api,
  endpoints,
  withQuery,
} from '../../lib/api';

import { useAsync } from '../../lib/hooks';

import {
  compact,
  money,
  orderCode,
  num,
} from '../../lib/format';

import { useAdmin } from '../../store/Admin';
import { useNav } from '../../navigation/hooks';

import type {
  Page,
  Product,
} from '../../types';


// =========================================================
// DASHBOARD PERIODS
// =========================================================

const PERIODS = [
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'custom', label: 'Custom' },
];


// =========================================================
// DATE TYPES
// =========================================================

type DateRange = {
  start: string;
  end: string;
};

type DashboardStats = Stats & {
  start_date?: string;
  end_date?: string;
  days?: number;
};


// =========================================================
// DATE HELPERS
// =========================================================

function formatApiDate(date: Date): string {

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;

}


function formatDisplayDate(date: Date): string {

  return date.toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );

}


function parseApiDate(value: string): Date {

  const [year, month, day] = value
    .split('-')
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );

}


function getInitialStartDate(): Date {

  const date = new Date();

  date.setDate(
    date.getDate() - 29
  );

  date.setHours(0, 0, 0, 0);

  return date;

}


function getRangeDays(
  start: Date,
  end: Date
): number {

  const startTime = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const endTime = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  return Math.round(
    (endTime - startTime) / 86400000
  ) + 1;

}


// =========================================================
// DASHBOARD
// =========================================================

export default function Dashboard() {

  const nav = useNav();

  const {
    can,
    workspace,
  } = useAdmin();


  // =====================================================
  // PERIOD AND DATE RANGE
  // =====================================================

  const [days, setDays] = useState('30');

  const [startDate, setStartDate] = useState<Date>(
    getInitialStartDate
  );

  const [endDate, setEndDate] = useState<Date>(
    () => new Date()
  );

  const [datePicker, setDatePicker] = useState<
    'start' | 'end' | null
  >(null);

  const [appliedRange, setAppliedRange] =
    useState<DateRange | null>(null);


  // =====================================================
  // ADMIN PERMISSIONS
  // =====================================================

  const canOrders = can('orders');
  const canCustomers = can('customers');


  // =====================================================
  // DASHBOARD API QUERY
  // =====================================================

  const overviewQuery = appliedRange
    ? `overview/?start_date=${appliedRange.start}&end_date=${appliedRange.end}`
    : `overview/?days=${days === 'custom' ? '30' : days}`;


  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  const q = useAsync(async () => {

    const stats = canOrders
      ? await adminApi<DashboardStats>(
          overviewQuery
        )
      : null;

    const [customers, products] = await Promise.all([

      canCustomers
        ? adminApi<ListResponse>(
            'resources/customers/?page_size=20'
          )
            .then(r => r.count)
            .catch(() => null)

        : Promise.resolve(null),

      api<Page<Product>>(
        withQuery(
          endpoints.products,
          { limit: 1 }
        ),
        { auth: false }
      )
        .then(r => r.count)
        .catch(() => null),

    ]);

    return {
      stats,
      customers,
      products,
    };

  }, [
    overviewQuery,
    canOrders,
    canCustomers,
  ]);


  // =====================================================
  // DASHBOARD STATISTICS
  // =====================================================

  const stats = q.data?.stats;

  const alerts =
    stats?.alerts ??
    workspace?.alerts ??
    [];

  const alertTotal = alerts.reduce(
    (total, alert) => total + alert.count,
    0
  );

  const goMenu = () =>
    nav.navigate('More');


  // =====================================================
  // SELECT PERIOD
  // =====================================================

  const changePeriod = (value: string) => {

    setDatePicker(null);

    if (value === 'custom') {

      if (days !== 'custom') {

        // Keep displaying the current report until
        // the new custom date range is applied.

        if (
          stats?.start_date &&
          stats?.end_date
        ) {

          setStartDate(
            parseApiDate(stats.start_date)
          );

          setEndDate(
            parseApiDate(stats.end_date)
          );

          setAppliedRange({
            start: stats.start_date,
            end: stats.end_date,
          });

        } else {

          const end = new Date();
          const start = new Date(end);

          start.setDate(
            start.getDate() -
            (Number(days) || 30) + 1
          );

          setStartDate(start);
          setEndDate(end);

          setAppliedRange({
            start: formatApiDate(start),
            end: formatApiDate(end),
          });

        }

      }

      setDays('custom');

      return;

    }

    setAppliedRange(null);
    setDays(value);

  };


  // =====================================================
  // HANDLE DATE PICKER
  // =====================================================

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {

    const selectedField = datePicker;

    if (Platform.OS === 'android') {
      setDatePicker(null);
    }

    if (
      event.type === 'dismissed' ||
      !selectedDate
    ) {
      return;
    }

    if (selectedField === 'start') {

      setStartDate(selectedDate);

      if (
        formatApiDate(selectedDate) >
        formatApiDate(endDate)
      ) {
        setEndDate(selectedDate);
      }

    } else if (selectedField === 'end') {

      setEndDate(selectedDate);

    }

  };


  // =====================================================
  // APPLY CUSTOM DATE RANGE
  // =====================================================

  const applyDateRange = () => {

    const start = formatApiDate(startDate);
    const end = formatApiDate(endDate);
    const today = formatApiDate(new Date());

    if (start > end) {

      Alert.alert(
        'Invalid date range',
        'Start date cannot be after end date.'
      );

      return;

    }

    if (end > today) {

      Alert.alert(
        'Invalid date range',
        'End date cannot be in the future.'
      );

      return;

    }

    const totalDays = getRangeDays(
      startDate,
      endDate
    );

    if (totalDays > 366) {

      Alert.alert(
        'Date range too large',
        'Please select a maximum of 366 days.'
      );

      return;

    }

    setDatePicker(null);

    if (
      appliedRange?.start === start &&
      appliedRange?.end === end
    ) {

      q.refresh();

      return;

    }

    setAppliedRange({
      start,
      end,
    });

    setDays('custom');

  };


  // =====================================================
  // SELECTED PERIOD LABEL
  // =====================================================

  const periodLabel =
    stats?.start_date && stats?.end_date
      ? stats.start_date === stats.end_date
        ? formatDisplayDate(
            parseApiDate(stats.start_date)
          )
        : `${formatDisplayDate(
            parseApiDate(stats.start_date)
          )} – ${formatDisplayDate(
            parseApiDate(stats.end_date)
          )}`

      : appliedRange
        ? `${formatDisplayDate(
            parseApiDate(appliedRange.start)
          )} – ${formatDisplayDate(
            parseApiDate(appliedRange.end)
          )}`

        : days === '1'
          ? 'Today'
          : `Last ${days === 'custom' ? '30' : days} days`;


  // =====================================================
  // STATISTIC CARDS
  // =====================================================

  const cards: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    sub?: string;
  }[] = [

    {
      icon: 'cart-outline',
      label: 'Total Sales',

      value: stats
        ? money(stats.revenue)
        : '—',

      sub: stats
        ? `Avg order ${money(stats.average)}`
        : 'Orders permission needed',
    },

    {
      icon: 'bag-handle-outline',
      label: 'Total Orders',

      value: stats
        ? String(stats.orders)
        : '—',

      sub: stats
        ? `${stats.pending} pending`
        : undefined,
    },

    {
      icon: 'people-outline',
      label: 'Customers',

      value: q.data?.customers != null
        ? String(q.data.customers)
        : '—',

      sub: 'Registered accounts',
    },

    {
      icon: 'cube-outline',
      label: 'Products',

      value: q.data?.products != null
        ? String(q.data.products)
        : '—',

      sub: 'In catalog',
    },

  ];


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <View style={styles.container}>

      <AdminTopBar
        onMenu={goMenu}
        alerts={alertTotal}
      />

      <ScrollView

        contentContainerStyle={{
          padding: 16,
          paddingBottom: 30,
        }}

        showsVerticalScrollIndicator={false}

        refreshControl={
          <RefreshControl
            refreshing={q.refreshing}
            onRefresh={q.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }

      >

        {/* DASHBOARD HEADING */}

        <View style={styles.heading}>

          <View style={{ flex: 1 }}>

            <T size={22} weight="bold">
              Dashboard
            </T>

            <T
              size={11.5}
              color={colors.muted}
            >
              Overview of your store performance
            </T>

          </View>

          <View style={styles.calendarIcon}>

            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.primary}
            />

          </View>

        </View>


        {/* PERIOD SELECTOR */}

        <View style={{ marginTop: 16 }}>

          <Segmented
            options={PERIODS}
            value={days}
            onChange={changePeriod}
          />

        </View>


        {/* CUSTOM DATE RANGE */}

        {days === 'custom' && (

          <Card style={styles.dateCard}>

            <View style={styles.dateHeading}>

              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.primary}
              />

              <T
                size={14}
                weight="bold"
              >
                Select date range
              </T>

            </View>

            <T
              size={11.5}
              color={colors.muted}
              style={{ marginTop: 5 }}
            >
              Choose a start and end date to view store performance.
            </T>


            {/* DATE INPUTS */}

            <View style={styles.dateRow}>

              <View style={{ flex: 1 }}>

                <T
                  size={11.5}
                  weight="medium"
                  style={styles.dateLabel}
                >
                  Start date
                </T>

                <Pressable

                  style={styles.dateInput}

                  onPress={() =>
                    setDatePicker('start')
                  }

                >

                  <Ionicons
                    name="calendar-outline"
                    size={17}
                    color={colors.primary}
                  />

                  <T
                    size={12}
                    weight="medium"
                    style={{ flex: 1 }}
                  >
                    {formatDisplayDate(startDate)}
                  </T>

                </Pressable>

              </View>


              <View style={{ flex: 1 }}>

                <T
                  size={11.5}
                  weight="medium"
                  style={styles.dateLabel}
                >
                  End date
                </T>

                <Pressable

                  style={styles.dateInput}

                  onPress={() =>
                    setDatePicker('end')
                  }

                >

                  <Ionicons
                    name="calendar-outline"
                    size={17}
                    color={colors.primary}
                  />

                  <T
                    size={12}
                    weight="medium"
                    style={{ flex: 1 }}
                  >
                    {formatDisplayDate(endDate)}
                  </T>

                </Pressable>

              </View>

            </View>


            {/* DATE PICKER */}

            {datePicker !== null && (

              <View>

                <DateTimePicker

                  key={datePicker}

                  value={
                    datePicker === 'start'
                      ? startDate
                      : endDate
                  }

                  mode="date"

                  display={
                    Platform.OS === 'ios'
                      ? 'spinner'
                      : 'default'
                  }

                  maximumDate={new Date()}

                  minimumDate={
                    datePicker === 'end'
                      ? startDate
                      : undefined
                  }

                  onChange={handleDateChange}

                />

                {Platform.OS === 'ios' && (

                  <Button
                    title="Done"
                    onPress={() =>
                      setDatePicker(null)
                    }
                  />

                )}

              </View>

            )}


            {/* SELECTED DAYS */}

            <View style={styles.durationRow}>

              <Ionicons
                name="time-outline"
                size={15}
                color={colors.muted}
              />

              <T
                size={11.5}
                color={colors.muted}
              >
                Selected period: {
                  getRangeDays(startDate, endDate)
                } day(s)
              </T>

            </View>


            {/* APPLY BUTTON */}

            <Button

              title="Apply date range"

              icon="checkmark-outline"

              onPress={applyDateRange}

              disabled={q.loading}

              style={{ marginTop: 12 }}

            />

          </Card>

        )}


        {/* ACTIVE REPORT PERIOD */}

        <View style={styles.activePeriod}>

          <Ionicons
            name="calendar-clear-outline"
            size={16}
            color={colors.primary}
          />

          <View style={{ flex: 1 }}>

            <T
              size={11}
              color={colors.muted}
            >
              Showing performance for
            </T>

            <T
              size={12}
              weight="bold"
              color={colors.primary}
            >
              {periodLabel}
            </T>

          </View>

        </View>


        {/* LOADING AND ERROR STATES */}

        {q.loading ? (

          <Loader
            style={{ paddingVertical: 80 }}
          />

        ) : q.error && !q.data ? (

          <ErrorState
            message={q.error}
            onRetry={q.retry}
          />

        ) : (

          <>

            {!!q.error && (

              <ErrorState
                message={q.error}
                onRetry={q.retry}
              />

            )}


            {/* STATISTIC CARDS */}

            <View style={styles.grid}>

              {cards.map(c => (

                <View
                  key={c.label}
                  style={styles.stat}
                >

                  <View style={styles.statIcon}>

                    <Ionicons
                      name={c.icon}
                      size={20}
                      color={colors.primary}
                    />

                  </View>

                  <T
                    size={19}
                    weight="bold"
                    style={{ marginTop: 10 }}
                    numberOfLines={1}
                  >
                    {c.value}
                  </T>

                  <T
                    size={11.5}
                    color={colors.muted}
                  >
                    {c.label}
                  </T>

                  {!!c.sub && (

                    <T
                      size={10.5}
                      color={colors.success}
                      weight="medium"
                      numberOfLines={1}
                      style={{ marginTop: 2 }}
                    >
                      {c.sub}
                    </T>

                  )}

                </View>

              ))}

            </View>


            {/* SALES OVERVIEW */}

            {stats && (

              <Card style={{ marginTop: 16 }}>

                <View style={styles.salesHeading}>

                  <View style={{ flex: 1 }}>

                    <T
                      size={15}
                      weight="bold"
                    >
                      Sales Overview
                    </T>

                    <T
                      size={11.5}
                      color={colors.muted}
                      style={{ marginTop: 3 }}
                    >
                      Paid revenue
                    </T>

                    <T
                      size={10.5}
                      color={colors.muted}
                      style={{ marginTop: 2 }}
                    >
                      {periodLabel}
                    </T>

                  </View>

                  <T
                    size={15}
                    weight="bold"
                    color={colors.primary}
                  >
                    {money(stats.revenue)}
                  </T>

                </View>


                {/* SINGLE DAY SALES */}

                {stats.series.length === 1 ? (

                  <View style={styles.singleDaySales}>

                    <View style={styles.singleDayIcon}>

                      <Ionicons
                        name="trending-up-outline"
                        size={28}
                        color={colors.primary}
                      />

                    </View>

                    <T
                      size={24}
                      weight="bold"
                      color={colors.primary}
                    >
                      {money(stats.revenue)}
                    </T>

                    <T
                      size={12}
                      color={colors.muted}
                    >
                      Paid sales for the selected day
                    </T>

                    <View style={styles.singleDayDivider} />

                    <View style={styles.singleDayDetails}>

                      <View style={styles.singleDayItem}>

                        <T
                          size={18}
                          weight="bold"
                        >
                          {stats.orders}
                        </T>

                        <T
                          size={11}
                          color={colors.muted}
                        >
                          Total orders
                        </T>

                      </View>

                      <View style={styles.verticalDivider} />

                      <View style={styles.singleDayItem}>

                        <T
                          size={18}
                          weight="bold"
                        >
                          {stats.pending}
                        </T>

                        <T
                          size={11}
                          color={colors.muted}
                        >
                          Pending orders
                        </T>

                      </View>

                    </View>

                  </View>

                ) : (

                  <AreaChart

                    data={stats.series.map(p => ({
                      label: p.date.slice(5),
                      value: num(p.value),
                    }))}

                  />

                )}

              </Card>

            )}


            {/* NEEDS ATTENTION */}

            {alerts.length > 0 && (

              <>

                <SectionHeader
                  style={{ marginTop: 22 }}
                  title="Needs attention"
                />

                <Card padded={false}>

                  {alerts.map((a, i) => (

                    <Pressable

                      key={a.key + a.title}

                      onPress={() =>
                        nav.navigate(
                          'AdminList',
                          {
                            resource: a.key,
                            title: a.title,
                            filter: a.filter,
                          }
                        )
                      }

                      style={[
                        styles.alert,

                        i < alerts.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        },
                      ]}

                    >

                      <View style={styles.alertCount}>

                        <T
                          size={13}
                          weight="bold"
                          color={colors.primary}
                        >
                          {compact(a.count)}
                        </T>

                      </View>

                      <T
                        size={13}
                        weight="medium"
                        style={{ flex: 1 }}
                      >
                        {a.title}
                      </T>

                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color={colors.muted}
                      />

                    </Pressable>

                  ))}

                </Card>

              </>

            )}


            {/* RECENT ORDERS */}

            {stats && (

              <>

                <SectionHeader

                  style={{ marginTop: 22 }}

                  title="Recent orders"

                  action="View all"

                  onAction={() =>
                    nav.navigate('Orders')
                  }

                />

                {stats.recent.length > 0 ? (

                  <View style={{ gap: 10 }}>

                    {stats.recent.map(o => (

                      <Card

                        key={o.id}

                        onPress={() =>
                          nav.navigate(
                            'AdminOrderDetail',
                            { id: o.id }
                          )
                        }

                      >

                        <View style={styles.orderRow}>

                          <View style={{ flex: 1 }}>

                            <T
                              weight="bold"
                              size={13.5}
                            >
                              {orderCode(o.id)}
                            </T>

                            <T
                              size={11.5}
                              color={colors.muted}
                              numberOfLines={1}
                            >
                              {String(
                                o.shipping_name ?? ''
                              )}
                            </T>

                          </View>

                          <View
                            style={{
                              alignItems: 'flex-end',
                              gap: 4,
                            }}
                          >

                            <T
                              weight="bold"
                              size={14}
                            >
                              {money(
                                num(o.total_amount)
                              )}
                            </T>

                            <StatusBadge
                              status={String(o.status)}
                            />

                          </View>

                        </View>

                      </Card>

                    ))}

                  </View>

                ) : (

                  <Card>

                    <View style={styles.emptyState}>

                      <Ionicons
                        name="receipt-outline"
                        size={32}
                        color={colors.muted}
                      />

                      <T
                        size={13}
                        weight="medium"
                      >
                        No orders found
                      </T>

                      <T
                        size={11.5}
                        color={colors.muted}
                      >
                        No orders in the selected date range.
                      </T>

                    </View>

                  </Card>

                )}

              </>

            )}


            {/* BEST SELLERS */}

            {stats && (

              <>

                <SectionHeader
                  style={{ marginTop: 22 }}
                  title="Best sellers"
                />

                {stats.sellers.length > 0 ? (

                  <Card padded={false}>

                    {stats.sellers.map((s, i) => (

                      <View

                        key={s.product_name}

                        style={[
                          styles.alert,

                          i < stats.sellers.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          },
                        ]}

                      >

                        <View
                          style={[
                            styles.alertCount,
                            {
                              backgroundColor: colors.dark,
                            },
                          ]}
                        >

                          <T
                            size={12}
                            weight="bold"
                            color={colors.white}
                          >
                            {i + 1}
                          </T>

                        </View>

                        <T
                          size={12.5}
                          weight="medium"
                          numberOfLines={2}
                          style={{ flex: 1 }}
                        >
                          {s.product_name}
                        </T>

                        <T
                          size={12}
                          weight="bold"
                          color={colors.primary}
                        >
                          {s.units} sold
                        </T>

                      </View>

                    ))}

                  </Card>

                ) : (

                  <Card>

                    <View style={styles.emptyState}>

                      <Ionicons
                        name="cube-outline"
                        size={32}
                        color={colors.muted}
                      />

                      <T
                        size={13}
                        weight="medium"
                      >
                        No sales found
                      </T>

                      <T
                        size={11.5}
                        color={colors.muted}
                      >
                        No paid product sales in this period.
                      </T>

                    </View>

                  </Card>

                )}

              </>

            )}

          </>

        )}

      </ScrollView>

    </View>

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

  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  calendarIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateCard: {
    marginTop: 14,
  },

  dateHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  dateRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },

  dateLabel: {
    marginBottom: 7,
  },

  dateInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    gap: 6,
  },

  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },

  activePeriod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },

  stat: {
    width: '47.8%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  salesHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },

  singleDaySales: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
  },

  singleDayIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  singleDayDivider: {
    height: 1,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
    marginVertical: 10,
  },

  singleDayDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },

  singleDayItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },

  verticalDivider: {
    width: 1,
    height: 35,
    backgroundColor: colors.border,
  },

  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },

  alertCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },

});