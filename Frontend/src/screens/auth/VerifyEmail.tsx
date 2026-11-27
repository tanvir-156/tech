import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useToast } from '../../store/Toast';
import { Button, T } from '../../components/ui';
import { colors, font, radius } from '../../theme';
import { useNav, useParams } from '../../navigation/hooks';
import { AuthLayout } from './Layout';

export default function VerifyEmail() {
  const nav = useNav();
  const { email = '' } = useParams<{ email: string }>();
  const { acceptTokens } = useAuth();
  const toast = useToast();
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(45);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async () => {
    if (otp.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api<{ access: string; refresh: string }>('/api/v1/accounts/verify-email/', {
        method: 'POST',
        auth: false,
        body: { email, otp },
      });
      await acceptTokens(res.access, res.refresh);
      toast('Email verified. Welcome to TechNest!', 'success');
      nav.reset({ index: 0, routes: [{ name: 'CustomerTabs' }] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await api('/api/v1/accounts/resend-email-otp/', { method: 'POST', auth: false, body: { email } });
      toast('A new code is on its way.', 'success');
      setCooldown(60);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <AuthLayout title="Verify your email" subtitle={`Enter the 6-digit code we sent to ${email || 'your email'}.`}>
      <TextInput
        value={otp}
        onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="••••••"
        placeholderTextColor={colors.borderStrong}
        textContentType="oneTimeCode"
        autoFocus
        style={{
          height: 64,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: error ? colors.danger : otp.length === 6 ? colors.primary : colors.border,
          backgroundColor: '#FAFAFC',
          textAlign: 'center',
          fontFamily: font.bold,
          fontSize: 28,
          letterSpacing: 10,
          color: colors.text,
          marginBottom: 12,
        }}
      />
      {!!error && (
        <T size={12.5} color={colors.danger} style={{ marginBottom: 10 }} align="center">
          {error}
        </T>
      )}
      <Button title="Verify & continue" onPress={verify} loading={busy} />
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        {cooldown > 0 ? (
          <T color={colors.muted}>Resend code in {cooldown}s</T>
        ) : (
          <Pressable onPress={resend}>
            <T weight="bold" color={colors.primary}>
              Resend code
            </T>
          </Pressable>
        )}
      </View>
    </AuthLayout>
  );
}
