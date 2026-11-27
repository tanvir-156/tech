import React, { useState } from 'react';
import { View } from 'react-native';
import { errorMessage } from '../../lib/format';
import { useAdmin } from '../../store/Admin';
import { useToast } from '../../store/Toast';
import { Button, Input, T } from '../../components/ui';
import { colors } from '../../theme';
import { useNav } from '../../navigation/hooks';
import { AuthLayout } from './Layout';

export default function StaffLogin() {
  const nav = useNav();
  const { signIn } = useAdmin();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your staff email and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
      toast('Signed in to the admin workspace.', 'success');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <AuthLayout admin title="Staff sign in" subtitle="Manage your store anywhere, anytime. Staff accounts only.">
      <Input label="Staff email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} placeholder="admin@technest.com" />
      <Input label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secure placeholder="Your password" onSubmitEditing={submit} returnKeyType="go" />
      {!!error && (
        <View style={{ backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 12, marginBottom: 14 }}>
          <T size={12.5} color={colors.danger}>
            {error}
          </T>
        </View>
      )}
      <Button title="Open admin workspace" onPress={submit} loading={busy} icon="shield-checkmark-outline" />
      <View style={{ height: 12 }} />
      <Button title="Server settings" variant="ghost" small onPress={() => nav.navigate('ServerSettings')} />
    </AuthLayout>
  );
}
