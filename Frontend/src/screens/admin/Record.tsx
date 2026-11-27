import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { colors } from '../../theme';
import { Button, Card, ErrorState, Header, Loader, StickyBar, T } from '../../components/ui';
import { FormView } from '../../components/AdminKit';
import { adminApi, DetailResponse } from '../../lib/adminApi';
import { ApiError } from '../../lib/api';
import { clearCatalogCache } from '../../lib/catalog';
import { dateTime, errorMessage, titleCase, valueText } from '../../lib/format';
import { FormField, FormValues, initialValues, parseForm, PickedFile, toFormData } from '../../lib/formParser';
import { useToast } from '../../store/Toast';
import { useNav, useParams } from '../../navigation/hooks';

const isIso = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(s);

export default function RecordScreen() {
  const nav = useNav();
  const toast = useToast();
  const { resource = '', id, title, initial } = useParams<{ resource: string; id: number; title: string; initial: Record<string, string> }>();
  const creating = id === undefined;

  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<FormValues>({});
  const [files, setFiles] = useState<Record<string, PickedFile | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const base = `resources/${resource}/`;

  const load = useCallback(async () => {
    try {
      const d = await adminApi<DetailResponse>(creating ? `${base}new/` : `${base}${id}/`);
      const parsed = parseForm(d.form);
      const vals = initialValues(parsed);
      if (creating && initial) {
        for (const [k, v] of Object.entries(initial)) if (k in vals) vals[k] = v;
      }
      setDetail(d);
      setFields(parsed);
      setValues(vals);
      setErrors({});
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [base, creating, id, initial]);

  useEffect(() => {
    void load();
  }, [load]);

  const fieldNames = new Set(fields.map((f) => f.name));

  const save = async () => {
    if (!detail) return;
    const missing = fields.filter((f) => f.required && f.kind !== 'checkbox' && f.kind !== 'file' && !String(Array.isArray(values[f.name]) ? (values[f.name] as string[]).join('') : values[f.name] ?? '').trim());
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map((f) => [f.name, 'Required'])));
      toast(`Please fill in: ${missing.map((f) => f.label).join(', ')}`, 'error');
      return;
    }
    setBusy(true);
    try {
      await adminApi(creating ? `${base}new/` : `${base}${id}/`, {
        method: 'POST',
        body: toFormData(fields, values, files),
        headers: creating ? {} : { 'X-Record-Version': detail.version },
      });
      clearCatalogCache();
      toast(creating ? 'Created successfully.' : 'Changes saved.', 'success');
      nav.goBack();
    } catch (e) {
      if (e instanceof ApiError && e.fields && typeof e.fields === 'object') {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.fields)) {
          if (fieldNames.has(k)) mapped[k] = Array.isArray(v) ? v.join(' ') : String(v);
        }
        setErrors(mapped);
      }
      toast(errorMessage(e), 'error');
      if (e instanceof ApiError && e.status === 409) await load();
    } finally {
      setBusy(false);
    }
  };

  const runAction = (action: string) => {
    if (!detail) return;
    Alert.alert(titleCase(action), `Apply “${titleCase(action)}” to this record?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setBusy(true);
          try {
            await adminApi(`${base}${id}/action/`, { method: 'POST', body: { action }, headers: { 'X-Record-Version': detail.version } });
            toast(`${titleCase(action)} — done.`, 'success');
            await load();
          } catch (e) {
            toast(errorMessage(e), 'error');
            await load();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const remove = () => {
    if (!detail?.deletion) return;
    const { changes, blockers, token } = detail.deletion;
    if (blockers.length) {
      Alert.alert("Can't delete", blockers.join('\n'));
      return;
    }
    Alert.alert('Delete this record?', changes.length ? `This will also:\n• ${changes.join('\n• ')}` : 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await adminApi(`${base}${id}/`, { method: 'DELETE', headers: { 'X-Record-Version': detail.version, 'X-Deletion-Token': token } });
            clearCatalogCache();
            toast('Deleted.', 'success');
            nav.goBack();
          } catch (e) {
            toast(errorMessage(e), 'error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const heading = title ?? titleCase(resource);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title={heading} />
        <Loader />
      </View>
    );
  }
  if (error || !detail) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title={heading} />
        <ErrorState message={error || 'Record not found'} onRetry={load} />
      </View>
    );
  }

  const info = Object.entries(detail.data).filter(([k, v]) => k !== 'id' && !fieldNames.has(k) && v !== null && typeof v !== 'object' && String(v) !== '');
  const canSave = fields.some((f) => f.kind !== 'hidden');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={heading} subtitle={creating ? 'New record' : `#${id}`} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {info.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              {info.map(([k, v], i) => (
                <View key={k} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                  <T size={12} color={colors.muted} style={{ width: '38%' }}>
                    {titleCase(k)}
                  </T>
                  <T size={12.5} weight="medium" style={{ flex: 1 }}>
                    {isIso(v) ? dateTime(String(v)) : valueText(v)}
                  </T>
                </View>
              ))}
            </Card>
          )}

          {detail.items?.length > 0 && (
            <>
              <T weight="bold" size={15} style={{ marginBottom: 8 }}>
                Items ({detail.items.length})
              </T>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {detail.items.map((it, i) => (
                  <Card key={i}>
                    {Object.entries(it)
                      .filter(([k, v]) => k !== 'id' && v !== null && typeof v !== 'object' && String(v) !== '')
                      .map(([k, v]) => (
                        <T key={k} size={12} color={colors.text2}>
                          <T size={12} color={colors.muted}>{titleCase(k)}: </T>
                          {valueText(v)}
                        </T>
                      ))}
                  </Card>
                ))}
              </View>
            </>
          )}

          {detail.access && (
            <Card style={{ marginBottom: 16 }}>
              <T size={12} color={colors.muted}>
                Last login: {detail.access.last_login ? dateTime(detail.access.last_login) : 'Never'}
              </T>
              <T size={12} color={colors.muted}>
                Roles: {detail.access.groups.map((g) => g.name).join(', ') || 'None'} · {detail.access.effective_permissions.length} permissions
              </T>
            </Card>
          )}

          {detail.actions?.length > 0 && !creating && (
            <View style={{ gap: 10, marginBottom: 18 }}>
              <T weight="bold" size={15}>
                Actions
              </T>
              {detail.actions.map((a) => (
                <Button key={a} title={titleCase(a)} variant={/reject|cancel|fail|decline/i.test(a) ? 'outline' : 'soft'} onPress={() => runAction(a)} disabled={busy} small />
              ))}
            </View>
          )}

          {canSave && (
            <>
              <T weight="bold" size={15} style={{ marginBottom: 10 }}>
                {creating ? 'Details' : 'Edit details'}
              </T>
              <FormView
                fields={fields}
                values={values}
                errors={errors}
                files={files}
                onFile={(n, f) => setFiles((p) => ({ ...p, [n]: f }))}
                onChange={(n, v) => {
                  setValues((p) => ({ ...p, [n]: v }));
                  setErrors((p) => ({ ...p, [n]: '' }));
                }}
              />
            </>
          )}

          {!creating && detail.delete && (
            <View style={{ marginTop: 20 }}>
              <Button title="Delete record" variant="outline" icon="trash-outline" onPress={remove} disabled={busy} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {canSave && (
        <StickyBar>
          <Button title={creating ? 'Create' : 'Save changes'} icon="checkmark" onPress={save} loading={busy} />
        </StickyBar>
      )}
    </View>
  );
}
