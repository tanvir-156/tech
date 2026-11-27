import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme';
import { Img, Input, MultiSelectField, SelectField, T, Toggle } from './ui';
import { Wordmark } from './Brand';
import { FormField, FormValues, PickedFile } from '../lib/formParser';
import { initials } from '../lib/format';
import { useAdmin } from '../store/Admin';

export function AdminTopBar({ onMenu, alerts }: { onMenu: () => void; alerts?: number }) {
  const insets = useSafeAreaInsets();
  const { workspace } = useAdmin();
  return (
    <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onMenu} hitSlop={10} style={styles.menuBtn}>
        <Ionicons name="menu" size={24} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Wordmark size={21} dark suffix="Admin" />
      </View>
      <View style={{ marginRight: 12 }}>
        <Ionicons name="notifications-outline" size={23} color={colors.text} />
        {!!alerts && alerts > 0 && (
          <View style={styles.dot}>
            <T size={9} weight="bold" color={colors.white}>
              {alerts > 9 ? '9+' : alerts}
            </T>
          </View>
        )}
      </View>
      <View style={styles.avatar}>
        <T size={12} weight="bold" color={colors.white}>
          {initials(workspace?.name?.split(' ')[0], workspace?.name?.split(' ')[1], workspace?.email ?? 'AD')}
        </T>
      </View>
    </View>
  );
}

export async function pickImages(multiple = true): Promise<PickedFile[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Allow photo access to upload images.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: multiple,
    quality: 0.85,
    selectionLimit: multiple ? 8 : 1,
  });
  if (res.canceled) return [];
  return res.assets.map((a, i) => {
    const ext = (a.uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
    const type = a.mimeType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
    return { uri: a.uri, name: a.fileName || `upload-${Date.now()}-${i}.${ext}`, type };
  });
}

export function FormView({
  fields,
  values,
  onChange,
  files,
  onFile,
  errors,
}: {
  fields: FormField[];
  values: FormValues;
  onChange: (name: string, value: string | boolean | string[]) => void;
  files: Record<string, PickedFile | undefined>;
  onFile: (name: string, f: PickedFile | undefined) => void;
  errors?: Record<string, string>;
}) {
  return (
    <View>
      {fields
        .filter((f) => f.kind !== 'hidden')
        .map((f) => {
          const err = errors?.[f.name];
          switch (f.kind) {
            case 'checkbox':
              return <Toggle key={f.name} label={f.label} help={f.help} value={Boolean(values[f.name])} onChange={(v) => onChange(f.name, v)} />;
            case 'select':
              return (
                <SelectField
                  key={f.name}
                  label={f.label}
                  required={f.required}
                  value={String(values[f.name] ?? '')}
                  options={f.options.map((o) => ({ value: o.value, label: o.label }))}
                  onChange={(v) => onChange(f.name, v)}
                  error={err}
                  searchable={f.options.length > 8}
                />
              );
            case 'multiselect':
              return (
                <MultiSelectField
                  key={f.name}
                  label={f.label}
                  help={f.help}
                  values={(values[f.name] as string[]) ?? []}
                  options={f.options.map((o) => ({ value: o.value, label: o.label }))}
                  onChange={(v) => onChange(f.name, v)}
                />
              );
            case 'file': {
              const picked = files[f.name];
              const preview = picked?.uri ?? f.current;
              return (
                <View key={f.name} style={{ marginBottom: 14 }}>
                  <T size={12.5} weight="medium" color={colors.text2} style={{ marginBottom: 6 }}>
                    {f.label}
                  </T>
                  <Pressable
                    onPress={async () => {
                      try {
                        const [first] = await pickImages(false);
                        if (first) onFile(f.name, first);
                      } catch {
                        /* permission denied or cancelled */
                      }
                    }}
                    style={styles.upload}
                  >
                    {preview ? (
                      <Img uri={preview} style={{ width: 84, height: 84, borderRadius: 14 }} fit="cover" />
                    ) : (
                      <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
                    )}
                    <T size={12} color={colors.muted} style={{ marginTop: 6 }}>
                      {picked ? 'Tap to change image' : preview ? 'Tap to replace image' : 'Tap to add image'}
                    </T>
                  </Pressable>
                </View>
              );
            }
            default:
              return (
                <Input
                  key={f.name}
                  label={f.label}
                  required={f.required}
                  value={String(values[f.name] ?? '')}
                  onChangeText={(t) => onChange(f.name, t)}
                  error={err}
                  hint={f.help || undefined}
                  multiline={f.kind === 'textarea'}
                  keyboardType={f.kind === 'number' ? 'decimal-pad' : f.kind === 'email' ? 'email-address' : 'default'}
                  autoCapitalize={f.kind === 'email' || f.kind === 'password' ? 'none' : 'sentences'}
                  secure={f.kind === 'password'}
                  placeholder={f.kind === 'datetime' ? 'YYYY-MM-DDTHH:MM' : f.kind === 'date' ? 'YYYY-MM-DD' : undefined}
                />
              );
          }
        })}
    </View>
  );
}

export const adminStyles = StyleSheet.create({
  statCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
});

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.white },
  menuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -4, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.white },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  upload: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: radius.lg, padding: 16, alignItems: 'center', backgroundColor: '#FAFAFC' },
});
