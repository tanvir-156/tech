/**
 * The TechNest console API returns each editable record's form as Django
 * `as_div()` HTML. This parser turns that HTML into a field list the app
 * can render natively, so every resource stays editable with the exact
 * choices, requirements and permissions the server enforces.
 */
export type FormOption = { value: string; label: string; selected: boolean };

export type FormField = {
  name: string;
  label: string;
  help: string;
  kind: 'text' | 'textarea' | 'number' | 'email' | 'password' | 'checkbox' | 'select' | 'multiselect' | 'datetime' | 'date' | 'file' | 'hidden';
  required: boolean;
  value: string;
  checked: boolean;
  options: FormOption[];
  multiline?: boolean;
  step?: string;
  current?: string; // existing file url
};

const entities: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
};

export const decode = (s: string) =>
  s.replace(/&(amp|lt|gt|quot|nbsp|#x27|#39);/g, (m) => entities[m] ?? m).replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));

const strip = (s: string) => decode(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

function attrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const key = m[1].toLowerCase();
    const val = m[2] ?? m[3] ?? m[4];
    out[key] = val === undefined ? '' : decode(val);
  }
  return out;
}

const hasFlag = (raw: string, name: string) => new RegExp(`(^|\\s)${name}(\\s|=|$)`, 'i').test(raw);

export function parseForm(html: string): FormField[] {
  const fields: FormField[] = [];
  if (!html) return fields;

  const re =
    /<label\b[^>]*>([\s\S]*?)<\/label>|<div\b[^>]*class="[^"]*helptext[^"]*"[^>]*>([\s\S]*?)<\/div>|<select\b([^>]*)>([\s\S]*?)<\/select>|<textarea\b([^>]*)>([\s\S]*?)<\/textarea>|<input\b([^>]*?)\/?>/gi;

  let label = '';
  let help = '';
  let m: RegExpExecArray | null;
  let lastIndex = 0;

  while ((m = re.exec(html)) !== null) {
    lastIndex = re.lastIndex;
    if (m[1] !== undefined) {
      const text = strip(m[1]).replace(/:$/, '');
      // Django's clearable file input adds a "Clear" checkbox + label.
      if (text.toLowerCase() !== 'clear') label = text;
      continue;
    }
    if (m[2] !== undefined) {
      help = strip(m[2]);
      continue;
    }

    if (m[3] !== undefined) {
      const a = attrs(m[3]);
      const multiple = hasFlag(m[3], 'multiple');
      const options: FormOption[] = [];
      const optRe = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
      let o: RegExpExecArray | null;
      while ((o = optRe.exec(m[4])) !== null) {
        const oa = attrs(o[1]);
        options.push({
          value: oa.value ?? '',
          label: strip(o[2]) || oa.value || '',
          selected: hasFlag(o[1], 'selected'),
        });
      }
      const selected = options.filter((x) => x.selected).map((x) => x.value);
      fields.push({
        name: a.name ?? '',
        label: label || a.name || '',
        help,
        kind: multiple ? 'multiselect' : 'select',
        required: hasFlag(m[3], 'required'),
        value: multiple ? selected.join(',') : (selected[0] ?? ''),
        checked: false,
        options,
      });
      label = '';
      help = '';
      continue;
    }

    if (m[5] !== undefined) {
      const a = attrs(m[5]);
      fields.push({
        name: a.name ?? '',
        label: label || a.name || '',
        help,
        kind: 'textarea',
        required: hasFlag(m[5], 'required'),
        value: decode(m[6]).replace(/^\r?\n/, ''),
        checked: false,
        options: [],
        multiline: true,
      });
      label = '';
      help = '';
      continue;
    }

    if (m[7] !== undefined) {
      const a = attrs(m[7]);
      const type = (a.type || 'text').toLowerCase();
      if (!a.name || a.name.endsWith('-clear')) continue;
      if (type === 'hidden') {
        if (a.name === 'csrfmiddlewaretoken') continue;
        fields.push({ name: a.name, label: '', help: '', kind: 'hidden', required: false, value: a.value ?? '', checked: false, options: [] });
        continue;
      }
      if (type === 'radio' || type === 'submit' || type === 'button') continue;
      let kind: FormField['kind'] = 'text';
      if (type === 'checkbox') kind = 'checkbox';
      else if (type === 'number') kind = 'number';
      else if (type === 'email') kind = 'email';
      else if (type === 'password') kind = 'password';
      else if (type === 'datetime-local') kind = 'datetime';
      else if (type === 'date') kind = 'date';
      else if (type === 'file') kind = 'file';
      else if (type === 'url' || type === 'tel') kind = 'text';

      fields.push({
        name: a.name,
        label: label || a.name,
        help,
        kind,
        required: hasFlag(m[7], 'required'),
        value: a.value ?? '',
        checked: hasFlag(m[7], 'checked'),
        options: [],
        step: a.step,
      });
      label = '';
      help = '';
    }
  }

  // Current file links ("Currently: <a href=...>") live between controls.
  void lastIndex;
  const cur = /Currently:\s*<a[^>]*href="([^"]+)"/i.exec(html);
  if (cur) {
    const file = fields.find((f) => f.kind === 'file');
    if (file) file.current = decode(cur[1]);
  }
  return fields.filter((f) => f.name);
}

export type FormValues = Record<string, string | boolean | string[]>;

export function initialValues(fields: FormField[]): FormValues {
  const v: FormValues = {};
  for (const f of fields) {
    if (f.kind === 'checkbox') v[f.name] = f.checked;
    else if (f.kind === 'multiselect') v[f.name] = f.value ? f.value.split(',').filter(Boolean) : [];
    else if (f.kind === 'file') v[f.name] = '';
    else v[f.name] = f.value;
  }
  return v;
}

export type PickedFile = { uri: string; name: string; type: string };

/** Builds multipart form data the way a browser would submit the form. */
export function toFormData(
  fields: FormField[],
  values: FormValues,
  files: Record<string, PickedFile | undefined> = {},
): FormData {
  const fd = new FormData();
  for (const f of fields) {
    const val = values[f.name];
    if (f.kind === 'checkbox') {
      if (val) fd.append(f.name, 'on');
    } else if (f.kind === 'multiselect') {
      for (const item of (val as string[]) ?? []) fd.append(f.name, item);
    } else if (f.kind === 'file') {
      const file = files[f.name];
      if (file) {
        fd.append(f.name, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
      }
    } else {
      fd.append(f.name, String(val ?? ''));
    }
  }
  return fd;
}
