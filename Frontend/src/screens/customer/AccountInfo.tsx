import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { colors } from '../../theme';
import { Button, Header, Input } from '../../components/ui';
import { api, endpoints } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useAuth } from '../../store/Auth';
import { useToast } from '../../store/Toast';
import { useNav } from '../../navigation/hooks';

export default function AccountInfo() {
  const nav = useNav();
  const toast = useToast();
  const { user, reload } = useAuth();
  const [first, setFirst] = useState(user?.first_name ?? '');
  const [last, setLast] = useState(user?.last_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!first.trim()) {
      toast('First name is required.', 'info');
      return;
    }
    setBusy(true);
    try {
      await api(endpoints.me, { method: 'PATCH', body: { first_name: first.trim(), last_name: last.trim(), phone: phone.trim() } });
      await reload();
      toast('Profile updated.', 'success');
      nav.goBack();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Account Information" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Input label="Email" icon="mail-outline" value={user?.email ?? ''} editable={false} hint="Your email can't be changed." />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Input style={{ flex: 1 }} label="First name" value={first} onChangeText={setFirst} required />
            <Input style={{ flex: 1 }} label="Last name" value={last} onChangeText={setLast} />
          </View>
          <Input label="Mobile number" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Button title="Save changes" onPress={save} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
