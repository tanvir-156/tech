import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../lib/api';
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
// FORGOT PASSWORD SCREEN
// =========================================================

export default function ForgotPassword() {

  const nav = useNav();
  const toast = useToast();

  const [step, setStep] = useState<
    'email' | 'otp' | 'reset'
  >('email');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [passwordFocused, setPasswordFocused] =
    useState(false);


  // =====================================================
  // LIVE PASSWORD VALIDATION
  // =====================================================

  const passwordValid = PASSWORD_RULES.every(
    rule => rule.test(pw)
  );

  const passwordsMatch =
    pw2.length > 0 && pw === pw2;


  // =====================================================
  // API REQUEST HANDLER
  // =====================================================

  const run = async (fn: () => Promise<void>) => {

    if (busy) return;

    setBusy(true);
    setError('');

    try {

      await fn();

    } catch (e) {

      setError(errorMessage(e));

    } finally {

      setBusy(false);

    }

  };


  // =====================================================
  // SEND RESET CODE
  // =====================================================

  const sendCode = () =>
    run(async () => {

      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {

        throw new Error(
          'Enter a valid email address.'
        );

      }

      await api('/api/v1/accounts/forgot-password/', {

        method: 'POST',
        auth: false,

        body: {
          email: email.trim(),
        },

      });

      toast(
        'If the account exists, a code has been sent.',
        'success'
      );

      setStep('otp');

    });


  // =====================================================
  // VERIFY OTP
  // =====================================================

  const verifyCode = () =>
    run(async () => {

      if (otp.length !== 6) {

        throw new Error(
          'Enter the 6-digit code.'
        );

      }

      const res = await api<{
        reset_token: string;
      }>('/api/v1/accounts/verify-password-otp/', {

        method: 'POST',
        auth: false,

        body: {
          email: email.trim(),
          otp,
        },

      });

      setToken(res.reset_token);
      setStep('reset');

    });


  // =====================================================
  // RESET PASSWORD
  // =====================================================

  const reset = () =>
    run(async () => {

      if (!passwordValid) {

        throw new Error(
          'Password must meet all requirements.'
        );

      }

      if (!passwordsMatch) {

        throw new Error(
          'Passwords do not match.'
        );

      }

      await api('/api/v1/accounts/reset-password/', {

        method: 'POST',
        auth: false,

        body: {
          reset_token: token,
          password: pw,
          password2: pw2,
        },

      });

      toast(
        'Password updated. Please sign in.',
        'success'
      );

      nav.replace('Login');

    });


  // =====================================================
  // ERROR MESSAGE
  // =====================================================

  const errBox = !!error && (

    <View style={styles.errorBox}>

      <T size={12.5} color={colors.danger}>
        {error}
      </T>

    </View>

  );


  // =====================================================
  // STEP 2: OTP VERIFICATION
  // =====================================================

  if (step === 'otp') {

    return (

      <AuthLayout
        title="Enter the code"
        subtitle={`We emailed a 6-digit code to ${email}.`}
      >

        <Input
          label="Verification code"
          icon="keypad-outline"
          value={otp}
          onChangeText={t =>
            setOtp(
              t.replace(/\D/g, '').slice(0, 6)
            )
          }
          keyboardType="number-pad"
          maxLength={6}
          placeholder="123456"
        />

        {errBox}

        <Button
          title="Verify code"
          onPress={verifyCode}
          loading={busy}
        />

        <View style={{ height: 10 }} />

        <Button
          title="Send a new code"
          variant="ghost"
          small
          onPress={sendCode}
          disabled={busy}
        />

      </AuthLayout>

    );

  }


  // =====================================================
  // STEP 3: NEW PASSWORD
  // =====================================================

  if (step === 'reset') {

    return (

      <AuthLayout
        title="New password"
        subtitle="Choose a strong password you haven't used before."
      >

        {/* NEW PASSWORD FIELD */}

        <Input
          label="New password"
          icon="lock-closed-outline"
          value={pw}
          onChangeText={value => {
            setPw(value);
            setError('');
          }}
          onFocus={() =>
            setPasswordFocused(true)
          }
          onBlur={() =>
            setPasswordFocused(false)
          }
          autoCapitalize="none"
          autoCorrect={false}
          secure
          placeholder="Enter your new password"
          required
        />


        {/* LIVE PASSWORD REQUIREMENTS */}

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

              const valid = rule.test(pw);

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


            {/* ALL REQUIREMENTS SATISFIED */}

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
          value={pw2}
          onChangeText={value => {
            setPw2(value);
            setError('');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          secure
          placeholder="Repeat password"
          required
        />


        {/* LIVE PASSWORD MATCHING */}

        {pw2.length > 0 && (

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


        {errBox}


        {/* UPDATE PASSWORD BUTTON */}

        <Button
          title="Update password"
          onPress={reset}
          loading={busy}
          disabled={
            busy ||
            !passwordValid ||
            !passwordsMatch
          }
        />

      </AuthLayout>

    );

  }


  // =====================================================
  // STEP 1: ENTER EMAIL
  // =====================================================

  return (

    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset code."
    >

      <Input
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        placeholder="you@example.com"
      />

      {errBox}

      <Button
        title="Send reset code"
        onPress={sendCode}
        loading={busy}
      />

    </AuthLayout>

  );

}


// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  errorBox: {
    backgroundColor: colors.dangerSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
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

});