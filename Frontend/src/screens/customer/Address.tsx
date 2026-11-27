import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { colors } from '../../theme';
import { Button, Header, Input, Loader, T } from '../../components/ui';
import { api, endpoints } from '../../lib/api';
import { asList, errorMessage } from '../../lib/format';
import { useToast } from '../../store/Toast';
import { useNav } from '../../navigation/hooks';
import type { Address } from '../../types';

const empty: Address = { first_name: '', last_name: '', company: '', address1: '', address2: '', city: '', postal_code: '', country: 'Bangladesh', region: '' };

export default function AddressScreen() {
  const nav = useNav();
  const toast = useToast();
  const [a, setA] = useState<Address>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api<unknown>(endpoints.address)
      .then((r) => {
        const first = asList<Address>(r)[0];
        if (first) setA({ ...empty, ...first });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof Address) => (v: string) => setA((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const e: Record<string, string> = {};
    (['first_name', 'last_name', 'address1', 'city', 'postal_code', 'country', 'region'] as const).forEach((k) => {
      if (!String(a[k] ?? '').trim()) e[k] = 'Required';
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body = { first_name: a.first_name, last_name: a.last_name, company: a.company ?? '', address1: a.address1, address2: a.address2 ?? '', city: a.city, postal_code: a.postal_code, country: a.country, region: a.region };
      if (a.id) await api(`${endpoints.address}${a.id}/`, { method: 'PUT', body });
      else {
        const created = await api<Address>(endpoints.address, { method: 'POST', body });
        setA((p) => ({ ...p, id: created.id }));
      }
      toast('Address saved.', 'success');
      nav.goBack();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="My Address" />
      {loading ? (
        <Loader />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <T size={12.5} color={colors.muted} style={{ marginBottom: 14 }}>
              Your saved address is used to pre-fill checkout.
            </T>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Input style={{ flex: 1 }} label="First name" value={a.first_name} onChangeText={set('first_name')} error={errors.first_name} required />
              <Input style={{ flex: 1 }} label="Last name" value={a.last_name} onChangeText={set('last_name')} error={errors.last_name} required />
            </View>
            <Input label="Company (optional)" value={a.company ?? ''} onChangeText={set('company')} />
            <Input label="Address line 1" value={a.address1} onChangeText={set('address1')} error={errors.address1} required />
            <Input label="Address line 2" value={a.address2 ?? ''} onChangeText={set('address2')} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Input style={{ flex: 1 }} label="City" value={a.city} onChangeText={set('city')} error={errors.city} required />
              <Input style={{ flex: 1 }} label="Postal code" value={a.postal_code} onChangeText={set('postal_code')} error={errors.postal_code} keyboardType="number-pad" required />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Input style={{ flex: 1 }} label="Country" value={a.country} onChangeText={set('country')} error={errors.country} required />
              <Input style={{ flex: 1 }} label="Region / Division" value={a.region} onChangeText={set('region')} error={errors.region} required />
            </View>
            <Button title="Save address" onPress={save} loading={busy} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
