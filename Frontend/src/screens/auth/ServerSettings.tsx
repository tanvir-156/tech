import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { defaultBaseUrl, getBaseUrl, normalizeBaseUrl, resetBaseUrl, setBaseUrl } from '../../config';
import { clearCatalogCache } from '../../lib/catalog';
import { useToast } from '../../store/Toast';
import { Button, Card, Header, Input, T } from '../../components/ui';
import { colors } from '../../theme';

export default function ServerSettings() {
  const toast = useToast();
  const [value, setValue] = useState(getBaseUrl());
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  const test = async (url: string) => {
    setStatus('testing');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(`${normalizeBaseUrl(url)}/api/v1/core/notices/`, { signal: controller.signal });
      setStatus(res.ok || res.status < 500 ? 'ok' : 'fail');
    } catch {
      setStatus('fail');
    } finally {
      clearTimeout(timer);
    }
  };

  const save = async () => {
    const saved = await setBaseUrl(value);
    clearCatalogCache();
    setValue(saved);
    toast('Server address saved.', 'success');
  };

  const reset = async () => {
    const url = await resetBaseUrl();
    clearCatalogCache();
    setValue(url);
    setStatus('idle');
    toast('Using the automatic address.', 'info');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Server settings" />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Card>
          <T weight="bold" size={15}>
            Django API address
          </T>
          <T size={12.5} color={colors.muted} style={{ marginTop: 4, marginBottom: 14 }}>
            Use your computer's local IP address when testing on a real phone (for example http://192.168.0.10:8000). Android emulators use http://10.0.2.2:8000.
          </T>
          <Input value={value} onChangeText={setValue} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.0.10:8000" icon="server-outline" />
          {status !== 'idle' && (
            <T
              size={12.5}
              weight="medium"
              color={status === 'ok' ? colors.success : status === 'fail' ? colors.danger : colors.muted}
              style={{ marginBottom: 12 }}
            >
              {status === 'testing' ? 'Testing connection…' : status === 'ok' ? 'Connected — the server responded.' : "Couldn't reach the server. Check the address, Wi-Fi and that Django runs on 0.0.0.0:8000."}
            </T>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="Test" variant="ghost" onPress={() => test(value)} small />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Save" onPress={save} small />
            </View>
          </View>
          <View style={{ height: 10 }} />
          <Button title={`Use automatic (${defaultBaseUrl()})`} variant="soft" onPress={reset} small />
        </Card>
      </ScrollView>
    </View>
  );
}
