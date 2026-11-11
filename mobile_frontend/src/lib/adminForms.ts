// The existing Django administration endpoint sends a rendered form together
// with its concurrency version. Preserve hidden/unedited values on native edits.
const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const attr = (s: string, k: string) =>
  decode(new RegExp(`\\b${k}=["']([^"']*)["']`, 'i').exec(s)?.[1] || '');
export function formValues(html: string): Record<string, any> {
  const values: Record<string, any> = {};
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    const name = attr(m[0], 'name'),
      type = attr(m[0], 'type');
    if (!name || type === 'file') continue;
    values[name] = type === 'checkbox' ? /\bchecked(?:\s|>|=)/i.test(m[0]) : attr(m[0], 'value');
  }
  for (const m of html.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi)) {
    const name = attr(m[1], 'name');
    if (name) values[name] = decode(m[2]);
  }
  for (const m of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const name = attr(m[1], 'name');
    if (!name) continue;
    const options = Array.from(m[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi));
    const selected = options
      .filter((o) => /\bselected(?:\s|$|=)/i.test(o[1]))
      .map((o) => attr(o[1], 'value'));
    values[name] = /\bmultiple(?:\s|$|=)/i.test(m[1])
      ? selected
      : (selected[0] ?? (options[0] ? attr(options[0][1], 'value') : ''));
  }
  return values;
}
export function relationId(html: string, field: string, label: string): string {
  const select = Array.from(html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)).find(
    (m) => attr(m[1], 'name') === field,
  );
  const options = select
    ? Array.from(select[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi))
    : [];
  const normalize = (value: string) =>
    decode(value.replace(/<[^>]*>/g, ''))
      .trim()
      .toLowerCase();
  const exact = options.find((m) => normalize(m[2]) === normalize(label));
  const suffix = options.filter(
    (m) => normalize(m[2]).split('→').pop()?.trim() === normalize(label),
  );
  const found =
    exact ||
    suffix.find((m) => /\bselected(?:\s|$|=)/i.test(m[1])) ||
    (suffix.length === 1 ? suffix[0] : undefined);
  if (!found)
    throw new Error(
      `The ${field} “${label}” was not uniquely found on the server. Choose an existing category or brand in Django admin.`,
    );
  return attr(found[1], 'value');
}
