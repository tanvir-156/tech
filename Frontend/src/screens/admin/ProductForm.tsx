import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Button, Card, Empty, Header, Img, Input, Loader, SelectField, StickyBar, T, Toggle } from '../../components/ui';
import { pickImages } from '../../components/AdminKit';
import { adminApi, DetailResponse } from '../../lib/adminApi';
import { api, endpoints, withQuery } from '../../lib/api';
import { clearCatalogCache } from '../../lib/catalog';
import { asList, errorMessage, money, num } from '../../lib/format';
import { FormField, parseForm, PickedFile } from '../../lib/formParser';
import { useToast } from '../../store/Toast';
import { useNav, useParams } from '../../navigation/hooks';
import type { Product, ProductImage } from '../../types';

type KV = { k: string; v: string; section?: boolean };

const toRows = (obj: unknown): KV[] =>
  obj && typeof obj === 'object' && !Array.isArray(obj)
    ? Object.entries(obj as Record<string, unknown>).map(([k, v]) => ({ k, v: String(v ?? ''), section: String(v) === k }))
    : [];

const fromRows = (rows: KV[]): Record<string, string> => {
  const out: Record<string, string> = {};
  rows.forEach((r) => {
    const k = r.k.trim();
    if (!k) return;
    out[k] = r.section ? k : r.v.trim();
  });
  return out;
};

const opt = (f?: FormField) => (f?.options ?? []).filter((o) => o.value !== '').map((o) => ({ value: o.value, label: o.label }));

export default function ProductForm() {
  const nav = useNav();
  const toast = useToast();
  const { id: routeId, slug } = useParams<{ id: number; slug: string }>();
  const [productId, setProductId] = useState<number | null>(routeId ?? null);
  const editing = productId !== null;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [variantFields, setVariantFields] = useState<FormField[]>([]);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [availability, setAvailability] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [features, setFeatures] = useState<KV[]>([]);
  const [specs, setSpecs] = useState<KV[]>([]);

  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [stock, setStock] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [color, setColor] = useState('');

  const [newImages, setNewImages] = useState<PickedFile[]>([]);
  const [existing, setExisting] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<Product['variants']>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [variantDone, setVariantDone] = useState(false);
  const [imagesUploaded, setImagesUploaded] = useState(0);

  const f = (n: string) => fields.find((x) => x.name === n);

  const load = useCallback(async () => {
    try {
      const path = routeId ? `resources/products/${routeId}/` : 'resources/products/new/';
      const detail = await adminApi<DetailResponse>(path);
      const parsed = parseForm(detail.form);
      setFields(parsed);
      setVersion(detail.version);
      if (routeId) {
        const d = detail.data;
        setName(String(d.name ?? ''));
        setDescription(String(d.description ?? ''));
        setActive(Boolean(d.is_active));
        setFeatured(Boolean(d.is_featured));
        setFeatures(toRows(d.key_feature));
        setSpecs(toRows(d.specification));
        const val = (n: string) => parsed.find((x) => x.name === n)?.value ?? '';
        setCategory(val('category'));
        setBrand(val('brand'));
        setAvailability(val('availability'));
        if (slug) {
          const full = await api<Product>(`${endpoints.products}${encodeURIComponent(slug)}/`, { auth: false }).catch(() => null);
          setVariants(full?.variants ?? []);
        }
        const imgs = await api<unknown>(withQuery(endpoints.images, { product: routeId }), { auth: false }).catch(() => []);
        setExisting(asList<ProductImage>(imgs));
      } else {
        setAvailability(parsed.find((x) => x.name === 'availability')?.value || 'in_stock');
        const vf = await adminApi<DetailResponse>('resources/variants/new/').catch(() => null);
        if (vf) setVariantFields(parseForm(vf.form));
      }
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [routeId, slug, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const validateBasic = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Product name is required';
    if (!category) e.category = 'Choose a category';
    if (!brand && f('brand')?.required) e.brand = 'Choose a brand';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateVariant = () => {
    if (editing) return true;
    const e: Record<string, string> = {};
    if (!(num(price) > 0)) e.price = 'Enter a price greater than 0';
    if (num(discount) < 0 || num(discount) > 100) e.discount = '0–100';
    if (stock === '' || num(stock) < 0) e.stock = 'Enter stock quantity';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 0 && !validateBasic()) return;
    if (step === 1 && !validateVariant()) return;
    setStep((s) => Math.min(s + 1, 2));
  };

  const pick = async () => {
    try {
      const files = await pickImages(true);
      if (files.length) setNewImages((p) => [...p, ...files].slice(0, 10));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const removeExisting = (img: ProductImage) =>
    Alert.alert('Delete image', 'Remove this image from the product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const d = await adminApi<DetailResponse>(`resources/images/${img.id}/`);
            await adminApi(`resources/images/${img.id}/`, {
              method: 'DELETE',
              headers: { 'X-Record-Version': d.version, 'X-Deletion-Token': d.deletion?.token ?? '' },
            });
            setExisting((p) => p.filter((x) => x.id !== img.id));
            clearCatalogCache();
          } catch (e) {
            toast(errorMessage(e), 'error');
          }
        },
      },
    ]);

  const save = async () => {
    if (!validateBasic()) {
      setStep(0);
      return;
    }
    if (!validateVariant()) {
      setStep(1);
      return;
    }
    setBusy(true);
    let id = productId;
    try {
      // 1. Product
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('category', category);
      if (brand) fd.append('brand', brand);
      fd.append('availability', availability || 'in_stock');
      fd.append('description', description);
      fd.append('key_feature', JSON.stringify(fromRows(features)));
      fd.append('specification', JSON.stringify(fromRows(specs)));
      if (active) fd.append('is_active', 'on');
      if (featured) fd.append('is_featured', 'on');
      if (editing && id !== null) {
        await adminApi(`resources/products/${id}/`, { method: 'POST', body: fd, headers: { 'X-Record-Version': version } });
      } else {
        const created = await adminApi<{ id: number }>('resources/products/new/', { method: 'POST', body: fd });
        id = created.id;
        setProductId(created.id);
      }
      if (id === null) throw new Error('Product was not created.');

      // 2. First variant (new products only)
      if (!routeId && !variantDone) {
        const vd = new FormData();
        vd.append('product', String(id));
        vd.append('price', price);
        vd.append('discount_percentage', discount || '0');
        vd.append('stock', stock);
        if (ram.trim()) vd.append('ram', ram.trim());
        if (storage.trim()) vd.append('storage', storage.trim());
        if (color) vd.append('color', color);
        vd.append('is_default', 'on');
        vd.append('is_active', 'on');
        await adminApi('resources/variants/new/', { method: 'POST', body: vd });
        setVariantDone(true);
      }

      // 3. Images
      for (let i = imagesUploaded; i < newImages.length; i++) {
        const file = newImages[i];
        const imgForm = new FormData();
        imgForm.append('product', String(id));
        imgForm.append('image', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
        imgForm.append('alt_text', name.trim().slice(0, 200));
        if (i === 0 && existing.length === 0) imgForm.append('is_primary', 'on');
        imgForm.append('display_order', String(existing.length + i));
        await adminApi('resources/images/new/', { method: 'POST', body: imgForm });
        setImagesUploaded(i + 1);
      }

      clearCatalogCache();
      toast(editing && routeId ? 'Product updated.' : 'Product created.', 'success');
      nav.goBack();
    } catch (e) {
      toast(`${errorMessage(e)}${id !== null && !routeId ? ' — your product was saved; tap Save again to retry the rest.' : ''}`, 'error');
      if (id !== null) {
        // Re-read the version so a retry doesn't hit a stale-record conflict.
        try {
          const d = await adminApi<DetailResponse>(`resources/products/${id}/`);
          setVersion(d.version);
        } catch {
          /* ignore */
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title={routeId ? 'Edit Product' : 'Add Product'} />
        <Loader />
      </View>
    );
  }

  const steps = ['Basic', 'Specs', 'Images'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={routeId ? 'Edit Product' : 'Add Product'} />
      <View style={styles.stepper}>
        {steps.map((s, i) => {
          const on = i <= step;
          return (
            <Pressable key={s} onPress={() => (i < step ? setStep(i) : undefined)} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                <View style={[styles.line, { opacity: i === 0 ? 0 : 1, backgroundColor: on ? colors.primary : colors.border }]} />
                <View style={[styles.num, on ? { backgroundColor: colors.primary } : { backgroundColor: colors.borderStrong }]}>
                  <T size={12} weight="bold" color={colors.white}>
                    {i + 1}
                  </T>
                </View>
                <View style={[styles.line, { opacity: i === steps.length - 1 ? 0 : 1, backgroundColor: i < step ? colors.primary : colors.border }]} />
              </View>
              <T size={11.5} weight={i === step ? 'bold' : 'medium'} color={i === step ? colors.primary : colors.muted} style={{ marginTop: 4 }}>
                {s}
              </T>
            </Pressable>
          );
        })}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <>
              <Input label="Product name" required value={name} onChangeText={setName} error={errors.name} placeholder="ASUS ROG Strix G16 (2026)" />
              <SelectField label="Category" required value={category} onChange={setCategory} options={opt(f('category'))} error={errors.category} searchable />
              <SelectField label="Brand" required={Boolean(f('brand')?.required)} value={brand} onChange={setBrand} options={opt(f('brand'))} error={errors.brand} searchable />
              <SelectField label="Availability" value={availability} onChange={setAvailability} options={opt(f('availability'))} />
              <Input label="Description" multiline value={description} onChangeText={setDescription} placeholder="Describe the product…" />
              <Toggle label="Visible in store" help="Hidden products can't be bought" value={active} onChange={setActive} />
              <Toggle label="Featured product" help="Shown in the Featured section" value={featured} onChange={setFeatured} />
            </>
          )}

          {step === 1 && (
            <>
              {!editing ? (
                <Card>
                  <T weight="bold" size={14} style={{ marginBottom: 10 }}>
                    Default variant
                  </T>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Input style={{ flex: 1 }} label="Price (৳)" required value={price} onChangeText={setPrice} keyboardType="decimal-pad" error={errors.price} placeholder="167500" />
                    <Input style={{ flex: 1 }} label="Discount %" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" error={errors.discount} />
                  </View>
                  <Input label="Stock" required value={stock} onChangeText={setStock} keyboardType="number-pad" error={errors.stock} placeholder="12" />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Input style={{ flex: 1 }} label="RAM" value={ram} onChangeText={setRam} placeholder="16GB" />
                    <Input style={{ flex: 1 }} label="Storage" value={storage} onChangeText={setStorage} placeholder="512GB" />
                  </View>
                  <SelectField
                    label="Color"
                    value={color}
                    onChange={setColor}
                    options={[{ value: '', label: 'No color' }, ...opt(variantFields.find((x) => x.name === 'color'))]}
                    style={{ marginBottom: 0 }}
                  />
                </Card>
              ) : (
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <T weight="bold" size={14}>
                      Variants ({variants?.length ?? 0})
                    </T>
                    {!!routeId && (
                      <Pressable onPress={() => nav.navigate('AdminRecord', { resource: 'variants', title: 'Add variant', initial: { product: String(routeId) } })} hitSlop={8}>
                        <T size={12.5} weight="bold" color={colors.primary}>
                          + Add variant
                        </T>
                      </Pressable>
                    )}
                  </View>
                  {(variants ?? []).length === 0 && <T size={12} color={colors.muted}>No variants yet.</T>}
                  {(variants ?? []).map((v) => (
                    <Pressable key={v.id} onPress={() => nav.navigate('AdminRecord', { resource: 'variants', id: v.id, title: 'Edit variant' })} style={styles.variantRow}>
                      <View style={{ flex: 1 }}>
                        <T size={12.5} weight="medium" numberOfLines={1}>
                          {[v.ram, v.storage, v.color?.name].filter(Boolean).join(' · ') || v.sku}
                        </T>
                        <T size={11.5} color={colors.muted}>
                          {money(num(v.discounted_price))} · Stock {v.stock}
                        </T>
                      </View>
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </Pressable>
                  ))}
                </Card>
              )}

              <KVEditor title="Key features" hint="Shown on the product overview (e.g. Processor → Core i7)" rows={features} onChange={setFeatures} />
              <KVEditor title="Specifications" hint="Use “+ Section” to group rows under a heading" rows={specs} onChange={setSpecs} sections />
            </>
          )}

          {step === 2 && (
            <>
              <Pressable onPress={pick} style={styles.upload}>
                <Ionicons name="images-outline" size={34} color={colors.primary} />
                <T weight="bold" size={14} style={{ marginTop: 8 }}>
                  Upload Product Images
                </T>
                <T size={12} color={colors.muted}>
                  Tap to add images (the first becomes the cover)
                </T>
              </Pressable>

              {existing.length > 0 && (
                <>
                  <T weight="bold" size={14} style={{ marginTop: 18, marginBottom: 8 }}>
                    Current images
                  </T>
                  <View style={styles.thumbs}>
                    {existing.map((img) => (
                      <View key={img.id} style={styles.thumb}>
                        <Img uri={img.image} fit="cover" style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                        <Pressable onPress={() => removeExisting(img)} style={styles.thumbX} hitSlop={6}>
                          <Ionicons name="trash" size={13} color={colors.white} />
                        </Pressable>
                        {img.is_primary && (
                          <View style={styles.cover}>
                            <T size={9} weight="bold" color={colors.white}>
                              COVER
                            </T>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </>
              )}

              {newImages.length > 0 && (
                <>
                  <T weight="bold" size={14} style={{ marginTop: 18, marginBottom: 8 }}>
                    New images ({newImages.length})
                  </T>
                  <View style={styles.thumbs}>
                    {newImages.map((img, i) => (
                      <View key={img.uri + i} style={styles.thumb}>
                        <Img uri={img.uri} fit="cover" style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                        <Pressable onPress={() => setNewImages((p) => p.filter((_, x) => x !== i))} style={styles.thumbX} hitSlop={6}>
                          <Ionicons name="close" size={14} color={colors.white} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {existing.length === 0 && newImages.length === 0 && <Empty icon="image-outline" title="No images yet" message="You can also add them later by editing the product." />}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <StickyBar>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step > 0 && (
            <View style={{ flex: 1 }}>
              <Button title="Back" variant="ghost" onPress={() => setStep(step - 1)} disabled={busy} />
            </View>
          )}
          <View style={{ flex: 2 }}>
            {step < 2 ? <Button title="Next" iconRight="arrow-forward" onPress={next} /> : <Button title={routeId ? 'Save changes' : 'Create product'} icon="checkmark" onPress={save} loading={busy} />}
          </View>
        </View>
        {step < 2 && !!routeId && (
          <Pressable onPress={save} style={{ alignItems: 'center', paddingTop: 10 }} disabled={busy}>
            <T size={12.5} weight="bold" color={colors.primary}>
              Save changes now
            </T>
          </Pressable>
        )}
      </StickyBar>
    </View>
  );
}

function KVEditor({ title, hint, rows, onChange, sections }: { title: string; hint?: string; rows: KV[]; onChange: (r: KV[]) => void; sections?: boolean }) {
  const set = (i: number, patch: Partial<KV>) => onChange(rows.map((r, x) => (x === i ? { ...r, ...patch } : r)));
  return (
    <Card style={{ marginTop: 14 }}>
      <T weight="bold" size={14}>
        {title}
      </T>
      {!!hint && (
        <T size={11} color={colors.muted} style={{ marginBottom: 10 }}>
          {hint}
        </T>
      )}
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          {r.section ? (
            <Input style={{ flex: 1, marginBottom: 0 }} value={r.k} onChangeText={(t) => set(i, { k: t })} placeholder="Section heading" inputStyle={{ fontFamily: 'Poppins-Bold' }} />
          ) : (
            <>
              <Input style={{ flex: 1, marginBottom: 0 }} value={r.k} onChangeText={(t) => set(i, { k: t })} placeholder="Name" />
              <Input style={{ flex: 1.3, marginBottom: 0 }} value={r.v} onChangeText={(t) => set(i, { v: t })} placeholder="Value" />
            </>
          )}
          <Pressable onPress={() => onChange(rows.filter((_, x) => x !== i))} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={colors.muted} />
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Pressable onPress={() => onChange([...rows, { k: '', v: '' }])} style={styles.addRow}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <T size={12} weight="bold" color={colors.primary}>
            Add row
          </T>
        </Pressable>
        {sections && (
          <Pressable onPress={() => onChange([...rows, { k: '', v: '', section: true }])} style={styles.addRow}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <T size={12} weight="bold" color={colors.primary}>
              Section
            </T>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', backgroundColor: colors.white, paddingHorizontal: 20, paddingBottom: 12, paddingTop: 2 },
  line: { flex: 1, height: 3, borderRadius: 2 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  upload: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.xl, padding: 28, alignItems: 'center', backgroundColor: colors.primarySofter },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: '30.5%', aspectRatio: 1, borderRadius: 12, backgroundColor: colors.white },
  thumbX: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(20,16,13,0.75)', alignItems: 'center', justifyContent: 'center' },
  cover: { position: 'absolute', left: 5, bottom: 5, backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft },
  variantRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
});
