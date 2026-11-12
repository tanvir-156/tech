import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../../lib/api';
import { ApiError } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useToast } from '../../store/Toast';
import { Button, Input, T } from '../../components/ui';
import { colors } from '../../theme';
import { useNav } from '../../navigation/hooks';
import { AuthLayout } from './Layout';

export default function Login() {
  const nav = useNav();
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      toast('Welcome back!', 'success');
      if (nav.canGoBack()) nav.goBack();
      else nav.reset({ index: 0, routes: [{ name: 'CustomerTabs' }] });
    } catch (e) {
      const needsVerify =
        e instanceof ApiError && typeof e.fields.email === 'string' && /verify/i.test(String(e.fields.email));
      const needsVerifyList =
        e instanceof ApiError && Array.isArray(e.fields.email) && /verify/i.test(String((e.fields.email as unknown[])[0]));
      if (needsVerify || needsVerifyList) {
        try {
          await api('/api/v1/accounts/resend-email-otp/', { method: 'POST', auth: false, body: { email: email.trim() } });
        } catch {
          /* cooldown or mail error: user can resend on the next screen */
        }
        toast('Please verify your email to continue.', 'info');
        nav.navigate('VerifyEmail', { email: email.trim() });
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue shopping with TechNest.">
      <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} placeholder="you@example.com" />
      <Input label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secure placeholder="Your password" onSubmitEditing={submit} returnKeyType="go" />
      <Pressable onPress={() => nav.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 12 }}>
        <T size={13} weight="medium" color={colors.primary}>
          Forgot password?
        </T>
      </Pressable>
      {!!error && (
        <View style={{ backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 12, marginBottom: 14 }}>
          <T size={12.5} color={colors.danger}>
            {error}
          </T>
        </View>
      )}
      <Button title="Sign in" onPress={submit} loading={busy} iconRight="arrow-forward" />
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 6 }}>
        <T color={colors.muted}>New to TechNest?</T>
        <Pressable onPress={() => nav.navigate('Register')}>
          <T weight="bold" color={colors.primary}>
            Create account
          </T>
        </Pressable>
      </View>
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 22 }} />
      <Button title="Staff & admin sign in" variant="ghost" icon="shield-checkmark-outline" onPress={() => nav.navigate('StaffLogin')} small />
      <Pressable onPress={() => nav.navigate('ServerSettings')} style={{ alignSelf: 'center', marginTop: 16 }}>
        <T size={12} color={colors.muted}>
          Server settings
        </T>
      </Pressable>
    </AuthLayout>
  );
}
