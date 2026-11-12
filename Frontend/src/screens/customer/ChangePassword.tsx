import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { colors } from '../../theme';
import { Button, Header, Input } from '../../components/ui';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useToast } from '../../store/Toast';
import { useNav } from '../../navigation/hooks';

export default function ChangePassword() {
  const nav = useNav();
  const toast = useToast();
  const { logout } = useAuth();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!cur) return toast('Enter your current password.', 'info');
    if (pw.length < 8) return toast('New password must be at least 8 characters.', 'info');
    if (pw !== pw2) return toast('New passwords do not match.', 'error');
    setBusy(true);
    try {
      await api('/api/v1/accounts/change-password/', {
        method: 'POST',
        body: { current_password: cur, new_password: pw, new_password2: pw2 },
      });
      // The server revokes existing tokens after a password change.
      toast('Password changed. Please sign in again.', 'success');
      await logout();
      nav.reset({ index: 0, routes: [{ name: 'CustomerTabs' }] });
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Change Password" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Input label="Current password" icon="lock-closed-outline" secure value={cur} onChangeText={setCur} />
          <Input label="New password" icon="key-outline" secure value={pw} onChangeText={setPw} hint="At least 8 characters" />
          <Input label="Confirm new password" icon="key-outline" secure value={pw2} onChangeText={setPw2} />
          <Button title="Update password" onPress={save} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
