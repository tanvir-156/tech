import React, { useState } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';

import { colors } from '../../theme';

import {
  Button,
  Header,
  Input,
  T,
} from '../../components/ui';

import { api, endpoints } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useToast } from '../../store/Toast';
import { useNav } from '../../navigation/hooks';

// =========================================================
// MOBILE NUMBER VALIDATION
// =========================================================

function normalizePhone(value: string): string {
  return value.trim().replace(/[\s-]/g, '');
}

function validatePhone(value: string): string {

  const phone = normalizePhone(value);

  if (!phone) {
    return 'Mobile number is required.';
  }

  const phoneRegex = /^(?:0|\+880|880)1[3-9]\d{8}$/;

  if (!phoneRegex.test(phone)) {
    return 'Enter a valid Bangladeshi mobile number.';
  }

  return '';
}

// =========================================================
// ACCOUNT INFORMATION
// =========================================================

export default function AccountInfo() {

  const nav = useNav();
  const toast = useToast();

  const { user, reload } = useAuth();

  const [first, setFirst] = useState(
    user?.first_name ?? ''
  );

  const [last, setLast] = useState(
    user?.last_name ?? ''
  );

  const [phone, setPhone] = useState(
    user?.phone ?? ''
  );

  const [busy, setBusy] = useState(false);

  const [phoneTouched, setPhoneTouched] =
    useState(false);

  // =====================================================
  // VALIDATION
  // =====================================================

  const phoneError = validatePhone(phone);

  const isFormValid =
    first.trim().length > 0 &&
    !phoneError;

  // =====================================================
  // SAVE ACCOUNT INFORMATION
  // =====================================================

  const save = async () => {

    if (busy) {
      return;
    }

    setPhoneTouched(true);

    if (!first.trim()) {

      toast(
        'First name is required.',
        'info'
      );

      return;
    }

    if (phoneError) {

      toast(phoneError, 'error');

      return;
    }

    setBusy(true);

    try {

      await api(endpoints.me, {
        method: 'PATCH',

        body: {
          first_name: first.trim(),
          last_name: last.trim(),
          phone: normalizePhone(phone),
        },
      });

      await reload();

      toast(
        'Profile updated.',
        'success'
      );

      nav.goBack();

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

    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
      }}
    >

      <Header title="Account Information" />

      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={{ flex: 1 }}
      >

        <ScrollView
          contentContainerStyle={{
            padding: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >

          {/* EMAIL */}

          <Input
            label="Email"
            icon="mail-outline"
            value={user?.email ?? ''}
            editable={false}
            hint="Your email can't be changed."
          />

          {/* FIRST AND LAST NAME */}

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
            }}
          >

            <Input
              style={{ flex: 1 }}
              label="First name"
              value={first}
              onChangeText={setFirst}
              editable={!busy}
              required
            />

            <Input
              style={{ flex: 1 }}
              label="Last name"
              value={last}
              onChangeText={setLast}
              editable={!busy}
            />

          </View>

          {/* MOBILE NUMBER */}

          <Input
            label="Mobile number"
            icon="call-outline"
            value={phone}
            placeholder="01XXXXXXXXX"
            keyboardType="phone-pad"
            autoComplete="tel"
            editable={!busy}
            required

            onChangeText={(value) => {

              setPhone(value);

              setPhoneTouched(true);

            }}

            onBlur={() => {
              setPhoneTouched(true);
            }}

            style={{ marginBottom: 0 }}
          />

          {/* MOBILE NUMBER ERROR */}

          {phoneTouched && !!phoneError && (

            <T
              size={11.5}
              color={colors.danger}
              style={{
                marginTop: 5,
                marginBottom: 10,
              }}
            >
              {phoneError}
            </T>

          )}

          {/* VALID MOBILE NUMBER */}

          {phoneTouched && !phoneError && (

            <T
              size={11.5}
              color={colors.success}
              style={{
                marginTop: 5,
                marginBottom: 10,
              }}
            >
              Valid mobile number.
            </T>

          )}

          {/* SAVE BUTTON */}

          <Button
            title="Save changes"
            onPress={save}
            loading={busy}
            disabled={!isFormValid || busy}
            style={{
              marginTop: 16,
              width: '100%',
            }}
          />

        </ScrollView>

      </KeyboardAvoidingView>

    </View>

  );
}