import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useToast } from '../../store/Toast';
import { Button, Input, T } from '../../components/ui';
import { colors } from '../../theme';
import { useNav } from '../../navigation/hooks';
import { AuthLayout } from './Layout';

export default function ForgotPassword() {
  const nav = useNav();
  const toast = useToast();
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<void>) => {
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

  const sendCode = () =>
    run(async () => {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Enter a valid email address.');
      await api('/api/v1/accounts/forgot-password/', { method: 'POST', auth: false, body: { email: email.trim() } });
      toast('If the account exists, a code has been sent.', 'success');
      setStep('otp');
    });

  const verifyCode = () =>
    run(async () => {
      if (otp.length !== 6) throw new Error('Enter the 6-digit code.');
      const res = await api<{ reset_token: string }>('/api/v1/accounts/verify-password-otp/', {
        method: 'POST',
        auth: false,
        body: { email: email.trim(), otp },
      });
      setToken(res.reset_token);
      setStep('reset');
    });

  const reset = () =>
    run(async () => {
      if (pw.length < 8) throw new Error('Password must be at least 8 characters.');
      if (pw !== pw2) throw new Error('Passwords do not match.');
      await api('/api/v1/accounts/reset-password/', {
        method: 'POST',
        auth: false,
        body: { reset_token: token, password: pw, password2: pw2 },
      });
      toast('Password updated. Please sign in.', 'success');
      nav.replace('Login');
    });

  const errBox = !!error && (
    <View style={{ backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 12, marginBottom: 14 }}>
      <T size={12.5} color={colors.danger}>
        {error}
      </T>
    </View>
  );

  if (step === 'otp') {
    return (
      <AuthLayout title="Enter the code" subtitle={`We emailed a 6-digit code to ${email}.`}>
        <Input label="Verification code" icon="keypad-outline" value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="123456" />
        {errBox}
        <Button title="Verify code" onPress={verifyCode} loading={busy} />
        <View style={{ height: 10 }} />
        <Button title="Send a new code" variant="ghost" small onPress={sendCode} disabled={busy} />
      </AuthLayout>
    );
  }
  if (step === 'reset') {
    return (
      <AuthLayout title="New password" subtitle="Choose a strong password you haven't used before.">
        <Input label="New password" icon="lock-closed-outline" value={pw} onChangeText={setPw} secure placeholder="At least 8 characters" />
        <Input label="Confirm password" icon="lock-closed-outline" value={pw2} onChangeText={setPw2} secure placeholder="Repeat password" />
        {errBox}
        <Button title="Update password" onPress={reset} loading={busy} />
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your email and we'll send you a reset code.">
      <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} placeholder="you@example.com" />
      {errBox}
      <Button title="Send reset code" onPress={sendCode} loading={busy} />
    </AuthLayout>
  );
}
