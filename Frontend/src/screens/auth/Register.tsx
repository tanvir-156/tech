import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api, ApiError } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useToast } from '../../store/Toast';
import { Button, Input, T } from '../../components/ui';
import { colors } from '../../theme';
import { useNav } from '../../navigation/hooks';
import { AuthLayout } from './Layout';

export default function Register() {
  const nav = useNav();
  const toast = useToast();
  const [f, setF] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', password2: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!f.first_name.trim()) e.first_name = 'Required';
    if (!f.email.trim() || !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email';
    if (!f.phone.trim()) e.phone = 'Required';
    if (f.password.length < 8) e.password = 'At least 8 characters';
    if (f.password !== f.password2) e.password2 = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      await api('/api/v1/accounts/register/', {
        method: 'POST',
        auth: false,
        body: { ...f, email: f.email.trim(), first_name: f.first_name.trim(), last_name: f.last_name.trim(), phone: f.phone.trim() },
      });
      toast('We sent a 6-digit code to your email.', 'success');
      nav.replace('VerifyEmail', { email: f.email.trim() });
    } catch (err) {
      if (err instanceof ApiError && err.fields && typeof err.fields === 'object') {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fields)) {
          mapped[k] = Array.isArray(v) ? v.join(' ') : String(v);
        }
        if (Object.keys(mapped).length) setErrors(mapped);
      }
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Join TechNest for faster checkout and order tracking.">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input style={{ flex: 1 }} label="First name" value={f.first_name} onChangeText={set('first_name')} error={errors.first_name} placeholder="Tanvir" required />
        <Input style={{ flex: 1 }} label="Last name" value={f.last_name} onChangeText={set('last_name')} error={errors.last_name} placeholder="Hasan" />
      </View>
      <Input label="Email" icon="mail-outline" value={f.email} onChangeText={set('email')} error={errors.email} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} placeholder="you@example.com" required />
      <Input label="Mobile number" icon="call-outline" value={f.phone} onChangeText={set('phone')} error={errors.phone} keyboardType="phone-pad" placeholder="01712345678" required />
      <Input label="Password" icon="lock-closed-outline" value={f.password} onChangeText={set('password')} error={errors.password} secure placeholder="At least 8 characters" required />
      <Input label="Confirm password" icon="lock-closed-outline" value={f.password2} onChangeText={set('password2')} error={errors.password2} secure placeholder="Repeat password" required />
      <Button title="Create account" onPress={submit} loading={busy} iconRight="arrow-forward" />
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 18, gap: 6 }}>
        <T color={colors.muted}>Already have an account?</T>
        <Pressable onPress={() => nav.replace('Login')}>
          <T weight="bold" color={colors.primary}>
            Sign in
          </T>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
