import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

import {
  Button,
  Card,
  Header,
  Input,
  Loader,
  Sheet,
  T,
} from '../../components/ui';

import { api, endpoints } from '../../lib/api';
import { asList, errorMessage } from '../../lib/format';
import { useToast } from '../../store/Toast';
import { useNav } from '../../navigation/hooks';
import type { Address } from '../../types';


// ======================================================
// DIVISIONS
// ======================================================

export const DIVISIONS = [
  { value: 'dhaka', label: 'Dhaka' },
  { value: 'chattogram', label: 'Chattogram' },
  { value: 'rajshahi', label: 'Rajshahi' },
  { value: 'khulna', label: 'Khulna' },
  { value: 'barishal', label: 'Barishal' },
  { value: 'sylhet', label: 'Sylhet' },
  { value: 'rangpur', label: 'Rangpur' },
  { value: 'mymensingh', label: 'Mymensingh' },
];

export const divisionValue = (name: string) => {

  const value = name.trim().toLowerCase();

  return DIVISIONS.find(
    d =>
      d.value === value ||
      d.label.toLowerCase() === value
  )?.value ?? '';
};


// ======================================================
// EMPTY ADDRESS
// ======================================================

const empty: Address = {
  first_name: '',
  last_name: '',
  company: '',
  address1: '',
  address2: '',
  city: '',
  upazila: '',
  postal_code: '',
  country: 'Bangladesh',
  region: '',
};


// ======================================================
// ADDRESS SCREEN
// ======================================================

export default function AddressScreen() {

  const nav = useNav();
  const toast = useToast();

  const [a, setA] = useState<Address>({ ...empty });

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [regionOpen, setRegionOpen] = useState(false);

  const [errors, setErrors] =
    useState<Record<string, string>>({});


  // ====================================================
  // LOAD SAVED ADDRESS
  // ====================================================

  useEffect(() => {

    let live = true;

    api<unknown>(endpoints.address)
      .then(r => {

        if (!live) return;

        const first = asList<Address>(r)[0];

        if (first) {
          setA({ ...empty, ...first });
        }

      })
      .catch(e => {

        if (live) {
          toast(errorMessage(e), 'error');
        }

      })
      .finally(() => {

        if (live) {
          setLoading(false);
        }

      });

    return () => {
      live = false;
    };

  }, []);


  // ====================================================
  // UPDATE FORM FIELD
  // ====================================================

  const set = (key: keyof Address) =>
    (value: string) => {

      setA(prev => ({
        ...prev,
        [key]: value,
      }));

      setErrors(prev => ({
        ...prev,
        [key]: '',
      }));
    };


  // ====================================================
  // VALIDATE ADDRESS
  // ====================================================

  const validate = () => {

    const e: Record<string, string> = {};

    if (!a.first_name.trim()) {
      e.first_name = 'Required';
    }

    if (!a.last_name.trim()) {
      e.last_name = 'Required';
    }

    if (!a.address1.trim()) {
      e.address1 = 'Required';
    }

    if (!a.city.trim()) {
      e.city = 'Required';
    }

    if (!a.upazila?.trim()) {
      e.upazila = 'Required';
    }

    if (!divisionValue(a.region)) {
      e.region = 'Select a division';
    }

    if (!/^\d{4}$/.test(a.postal_code.trim())) {
      e.postal_code = 'Enter a 4-digit postal code';
    }

    setErrors(e);

    return Object.keys(e).length === 0;
  };


  // ====================================================
  // SAVE ADDRESS
  // ====================================================

  const save = async () => {

    if (busy || !validate()) {
      return;
    }

    setBusy(true);

    try {

      const body = {
        first_name: a.first_name.trim(),

        last_name: a.last_name.trim(),

        company: a.company?.trim() ?? '',

        address1: a.address1.trim(),

        address2: a.address2?.trim() ?? '',

        city: a.city.trim(),

        upazila: a.upazila?.trim() ?? '',

        postal_code: a.postal_code.trim(),

        country: 'Bangladesh',

        region: DIVISIONS.find(
          d => d.value === divisionValue(a.region)
        )?.label ?? a.region,
      };

      if (a.id) {

        await api(`${endpoints.address}${a.id}/`, {
          method: 'PUT',
          body,
        });

      } else {

        await api<Address>(endpoints.address, {
          method: 'POST',
          body,
        });

      }

      toast(
        'Address saved successfully.',
        'success'
      );

      nav.goBack();

    } catch (e) {

      toast(errorMessage(e), 'error');

    } finally {

      setBusy(false);

    }
  };


  // ====================================================
  // RENDER
  // ====================================================

  return (

    <View style={styles.container}>

      <Header title="My Address" />

      {loading ? (

        <Loader />

      ) : (

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >

            <T
              size={13}
              color={colors.muted}
              style={{ marginBottom: 14 }}
            >
              Enter your shipping and billing address.
            </T>

            <Card>

              <T
                size={16}
                weight="bold"
                style={styles.heading}
              >
                {a.id ? 'Edit Address' : 'Add New Address'}
              </T>


              {/* FIRST NAME AND LAST NAME */}

              <View style={styles.row}>

                <Input
                  style={styles.half}
                  label="First Name"
                  placeholder="First Name"
                  value={a.first_name}
                  onChangeText={set('first_name')}
                  error={errors.first_name}
                  required
                />

                <Input
                  style={styles.half}
                  label="Last Name"
                  placeholder="Last Name"
                  value={a.last_name}
                  onChangeText={set('last_name')}
                  error={errors.last_name}
                  required
                />

              </View>


              {/* ADDRESS LINE 1 */}

              <Input
                label="Address Line 1"
                placeholder="House, road, area"
                value={a.address1}
                onChangeText={set('address1')}
                error={errors.address1}
                multiline
                required
              />


              {/* ADDRESS LINE 2 */}

              <Input
                label="Address Line 2"
                placeholder="Apartment, floor, landmark (optional)"
                value={a.address2 ?? ''}
                onChangeText={set('address2')}
                multiline
              />


              {/* DISTRICT AND UPAZILA */}

              <View style={styles.row}>

                <Input
                  style={styles.half}
                  label="City / District"
                  placeholder="e.g. Sylhet"
                  value={a.city}
                  onChangeText={set('city')}
                  error={errors.city}
                  required
                />

                <Input
                  style={styles.half}
                  label="Upazila / Thana"
                  placeholder="e.g. Beanibazar"
                  value={a.upazila ?? ''}
                  onChangeText={set('upazila')}
                  error={errors.upazila}
                  maxLength={100}
                  required
                />

              </View>


              {/* POST CODE AND DIVISION */}

              <View style={styles.row}>

                <Input
                  style={styles.half}
                  label="Post Code"
                  placeholder="4-digit code"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={a.postal_code}
                  onChangeText={v =>
                    set('postal_code')(
                      v.replace(/\D/g, '')
                    )
                  }
                  error={errors.postal_code}
                  required
                />

                <View style={styles.half}>

                  <T
                    size={12.5}
                    weight="medium"
                    style={styles.fieldLabel}
                  >
                    Division / Region *
                  </T>

                  <Pressable
                    style={styles.select}
                    onPress={() => setRegionOpen(true)}
                  >

                    <T
                      size={12.5}
                      color={
                        a.region
                          ? colors.text
                          : colors.muted
                      }
                      numberOfLines={1}
                      style={{ flex: 1 }}
                    >
                      {a.region || 'Select Division'}
                    </T>

                    <Ionicons
                      name="chevron-down"
                      size={17}
                      color={colors.text2}
                    />

                  </Pressable>

                  {!!errors.region && (

                    <T
                      size={11}
                      color={colors.danger}
                    >
                      {errors.region}
                    </T>

                  )}

                </View>

              </View>


              {/* COUNTRY */}

              <T
                size={12.5}
                weight="medium"
                style={styles.fieldLabel}
              >
                Country *
              </T>

              <View style={styles.select}>

                <T size={13}>
                  Bangladesh
                </T>

              </View>


              {/* COMPANY */}

              <Input
                label="Company (optional)"
                placeholder="Company name"
                value={a.company ?? ''}
                onChangeText={set('company')}
              />

            </Card>

          </ScrollView>


          {/* SAVE AND CANCEL BUTTONS */}

          <View style={styles.footer}>

            <View style={{ flex: 1 }}>

              <Button
                title="Cancel"
                variant="outline"
                onPress={() => nav.goBack()}
                disabled={busy}
              />

            </View>

            <View style={{ flex: 1 }}>

              <Button
                title="Save"
                onPress={save}
                loading={busy}
              />

            </View>

          </View>

        </KeyboardAvoidingView>

      )}


      {/* DIVISION SELECTOR */}

      <Sheet
        visible={regionOpen}
        onClose={() => setRegionOpen(false)}
        title="Select Division"
      >

        <View style={{ padding: 16 }}>

          {DIVISIONS.map(d => (

            <Pressable
              key={d.value}
              style={styles.regionOption}
              onPress={() => {

                set('region')(d.label);

                setRegionOpen(false);

              }}
            >

              <T weight="medium">
                {d.label}
              </T>

              {divisionValue(a.region) === d.value && (

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


// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  heading: {
    marginBottom: 18,
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
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    marginBottom: 14,
  },

  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },

  regionOption: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

});