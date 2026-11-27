import React, { useState } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme';
import { Button, Header, Input, T } from '../../components/ui';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useToast } from '../../store/Toast';
import { useNav } from '../../navigation/hooks';


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
// CHANGE PASSWORD SCREEN
// =========================================================

export default function ChangePassword() {

  const nav = useNav();
  const toast = useToast();

  const { logout } = useAuth();

  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  const [busy, setBusy] = useState(false);

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
  // SAVE NEW PASSWORD
  // =====================================================

  const save = async () => {

    if (busy) return;

    if (!cur) {

      return toast(
        'Enter your current password.',
        'info'
      );

    }

    if (!passwordValid) {

      return toast(
        'New password must meet all requirements.',
        'info'
      );

    }

    if (!passwordsMatch) {

      return toast(
        'New passwords do not match.',
        'error'
      );

    }

    setBusy(true);

    try {

      await api('/api/v1/accounts/change-password/', {

        method: 'POST',

        body: {
          current_password: cur,
          new_password: pw,
          new_password2: pw2,
        },

      });

      // The server revokes existing tokens
      // after a password change.

      toast(
        'Password changed. Please sign in again.',
        'success'
      );

      await logout();

      nav.reset({
        index: 0,
        routes: [
          {
            name: 'CustomerTabs',
          },
        ],
      });

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

      <Header title="Change Password" />

      <KeyboardAvoidingView

        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }

        style={{ flex: 1 }}

      >

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >


          {/* CURRENT PASSWORD */}

          <Input
            label="Current password"
            icon="lock-closed-outline"
            secure
            value={cur}
            onChangeText={setCur}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter current password"
            required
          />


          {/* NEW PASSWORD */}

          <Input
            label="New password"
            icon="key-outline"
            secure
            value={pw}
            onChangeText={setPw}
            onFocus={() =>
              setPasswordFocused(true)
            }
            onBlur={() =>
              setPasswordFocused(false)
            }
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter new password"
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
                        name={
                          valid
                            ? 'checkmark'
                            : 'ellipse'
                        }
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


          {/* CONFIRM NEW PASSWORD */}

          <Input
            label="Confirm new password"
            icon="key-outline"
            secure
            value={pw2}
            onChangeText={setPw2}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Repeat new password"
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


          {/* UPDATE PASSWORD BUTTON */}

          <Button
            title="Update password"
            onPress={save}
            loading={busy}
            disabled={
              busy ||
              !cur ||
              !passwordValid ||
              !passwordsMatch
            }
          />

        </ScrollView>

      </KeyboardAvoidingView>

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

  content: {
    padding: 16,
    paddingBottom: 30,
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