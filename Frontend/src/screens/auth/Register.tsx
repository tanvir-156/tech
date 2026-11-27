import React, { useState } from 'react';

import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { api, ApiError } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useToast } from '../../store/Toast';
import { Button, Input, T } from '../../components/ui';
import { colors } from '../../theme';
import { useNav } from '../../navigation/hooks';
import { AuthLayout } from './Layout';


// =========================================================
// PASSWORD REQUIREMENTS
// =========================================================

const PASSWORD_RULES = [
  {
    label: 'At least 1 number (0–9)',
    test: (password: string) =>
      /[0-9]/.test(password),
  },
  {
    label: 'At least 8 characters',
    test: (password: string) =>
      password.length >= 8,
  },
  {
    label: 'At least 1 lowercase letter (a–z)',
    test: (password: string) =>
      /[a-z]/.test(password),
  },
  {
    label: 'At least 1 uppercase letter (A–Z)',
    test: (password: string) =>
      /[A-Z]/.test(password),
  },
  {
    label: 'At least 1 special character (@, #, $, %, !, &, *)',
    test: (password: string) =>
      /[^A-Za-z0-9\s]/.test(password),
  },
];


// =========================================================
// REGISTER SCREEN
// =========================================================

export default function Register() {

  const nav = useNav();
  const toast = useToast();

  const [f, setF] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password2: '',
  });

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  const [busy, setBusy] = useState(false);

  const [passwordFocused, setPasswordFocused] =
    useState(false);


  // =====================================================
  // UPDATE FORM FIELD
  // =====================================================

  const set = (k: keyof typeof f) => (v: string) => {

    setF(p => ({
      ...p,
      [k]: v,
    }));

    setErrors(p => ({
      ...p,
      [k]: '',
      ...(k === 'password' ? { password2: '' } : {}),
    }));

  };


  // =====================================================
  // LIVE PASSWORD VALIDATION
  // =====================================================

  const passwordValid = PASSWORD_RULES.every(
    rule => rule.test(f.password)
  );

  const passwordsMatch =
    f.password2.length > 0 &&
    f.password === f.password2;


  // =====================================================
  // SUBMIT REGISTRATION
  // =====================================================

  const submit = async () => {

    if (busy) return;

    const e: Record<string, string> = {};

    if (!f.first_name.trim()) {
      e.first_name = 'Required';
    }

    if (
      !f.email.trim() ||
      !/^\S+@\S+\.\S+$/.test(f.email.trim())
    ) {
      e.email = 'Enter a valid email';
    }

    if (!f.phone.trim()) {
      e.phone = 'Required';
    }

    if (!f.password) {
      e.password = 'Password is required';
    } else if (!passwordValid) {
      e.password = 'Password must meet all requirements';
    }

    if (!f.password2) {
      e.password2 = 'Confirm your password';
    } else if (f.password !== f.password2) {
      e.password2 = 'Passwords do not match';
    }

    setErrors(e);

    if (Object.keys(e).length) {
      return;
    }

    setBusy(true);

    try {

      await api('/api/v1/accounts/register/', {
        method: 'POST',
        auth: false,

        body: {
          ...f,
          email: f.email.trim(),
          first_name: f.first_name.trim(),
          last_name: f.last_name.trim(),
          phone: f.phone.trim(),
        },

      });

      toast(
        'We sent a 6-digit code to your email.',
        'success'
      );

      nav.replace('VerifyEmail', {
        email: f.email.trim(),
      });

    } catch (err) {

      if (
        err instanceof ApiError &&
        err.fields &&
        typeof err.fields === 'object'
      ) {

        const mapped: Record<string, string> = {};

        for (
          const [k, v] of Object.entries(err.fields)
        ) {

          mapped[k] = Array.isArray(v)
            ? v.join(' ')
            : String(v);

        }

        if (Object.keys(mapped).length) {
          setErrors(mapped);
        }

      }

      toast(errorMessage(err), 'error');

    } finally {

      setBusy(false);

    }

  };


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <AuthLayout
      title="Create Account"
      subtitle="Join TechNest for faster checkout and order tracking."
    >

      {/* FIRST NAME AND LAST NAME */}

      <View style={styles.nameRow}>

        <Input
          style={{ flex: 1 }}
          label="First name"
          value={f.first_name}
          onChangeText={set('first_name')}
          error={errors.first_name}
          placeholder="Tanvir"
          required
        />

        <Input
          style={{ flex: 1 }}
          label="Last name"
          value={f.last_name}
          onChangeText={set('last_name')}
          error={errors.last_name}
          placeholder="Hasan"
        />

      </View>


      {/* EMAIL */}

      <Input
        label="Email"
        icon="mail-outline"
        value={f.email}
        onChangeText={set('email')}
        error={errors.email}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        placeholder="you@example.com"
        required
      />


      {/* MOBILE NUMBER */}

      <Input
        label="Mobile number"
        icon="call-outline"
        value={f.phone}
        onChangeText={set('phone')}
        error={errors.phone}
        keyboardType="phone-pad"
        placeholder="01712345678"
        required
      />


      {/* PASSWORD */}

      <Input
        label="Password"
        icon="lock-closed-outline"
        value={f.password}
        onChangeText={set('password')}
        error={errors.password}
        onFocus={() => setPasswordFocused(true)}
        onBlur={() => setPasswordFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
        secure
        placeholder="Enter your password"
        required
      />


      {/* SHOW REQUIREMENTS ONLY WHEN PASSWORD IS FOCUSED */}

      {passwordFocused && (

        <View style={styles.passwordRequirements}>

          <T
            size={12}
            weight="medium"
            color={colors.text}
            style={{ marginBottom: 8 }}
          >
            Password must contain:
          </T>

          {PASSWORD_RULES.map(rule => {

            const valid = rule.test(f.password);

            return (

              <View
                key={rule.label}
                style={styles.requirementRow}
              >

                <View style={styles.requirementIcon}>

                  <Ionicons
                    name={valid ? 'checkmark' : 'ellipse'}
                    size={valid ? 17 : 6}
                    color={
                      valid
                        ? colors.success
                        : colors.muted
                    }
                  />

                </View>

                <T
                  size={11.5}
                  color={
                    valid
                      ? colors.success
                      : colors.muted
                  }
                  style={{ flex: 1 }}
                >
                  {rule.label}
                </T>

              </View>

            );

          })}

          {passwordValid && (

            <View style={styles.validPassword}>

              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={colors.success}
              />

              <T
                size={11.5}
                weight="medium"
                color={colors.success}
                style={{ flex: 1 }}
              >
                All password requirements satisfied.
              </T>

            </View>

          )}

        </View>

      )}


      {/* CONFIRM PASSWORD */}

      <Input
        label="Confirm password"
        icon="lock-closed-outline"
        value={f.password2}
        onChangeText={set('password2')}
        error={errors.password2}
        autoCapitalize="none"
        autoCorrect={false}
        secure
        placeholder="Repeat password"
        required
      />


      {/* LIVE CONFIRM PASSWORD VALIDATION */}

      {f.password2.length > 0 && (

        <View style={styles.matchRow}>

          <Ionicons
            name={
              passwordsMatch
                ? 'checkmark-circle-outline'
                : 'close-circle-outline'
            }
            size={16}
            color={
              passwordsMatch
                ? colors.success
                : colors.danger
            }
          />

          <T
            size={11.5}
            color={
              passwordsMatch
                ? colors.success
                : colors.danger
            }
          >
            {passwordsMatch
              ? 'Passwords match'
              : 'Passwords do not match'}
          </T>

        </View>

      )}


      {/* CREATE ACCOUNT BUTTON */}

      <Button
        title="Create account"
        onPress={submit}
        loading={busy}
        disabled={busy}
        iconRight="arrow-forward"
      />


      {/* SIGN IN LINK */}

      <View style={styles.signInRow}>

        <T color={colors.muted}>
          Already have an account?
        </T>

        <Pressable
          onPress={() => nav.replace('Login')}
        >

          <T
            weight="bold"
            color={colors.primary}
          >
            Sign in
          </T>

        </Pressable>

      </View>

    </AuthLayout>

  );

}


// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  nameRow: {
    flexDirection: 'row',
    gap: 10,
  },

  passwordRequirements: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginTop: -4,
    marginBottom: 16,
  },

  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 24,
    paddingVertical: 2,
  },

  requirementIcon: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  validPassword: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 8,
  },

  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    marginBottom: 14,
  },

  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    gap: 6,
  },

});