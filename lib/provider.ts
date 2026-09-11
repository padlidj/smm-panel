import { prisma } from './prisma';
import get from 'lodash.get';
import { orderTarget, positiveInt } from './order-input';

export const DISPATCH_READY = 'DISPATCH_READY';
const DISPATCH_STARTED = 'DISPATCH_STARTED: manual reconciliation required';
function responseId(value: unknown) {
  return (typeof value === 'string' && value.trim()) ||
    (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) ? String(value).trim() : null;
}
function explicitlyRejected(data: any) {
  return data?.status === false || data?.success === false ||
    (typeof data?.error === 'string' && data.error.trim().length > 0);
}

// Build request body from mapping. Laravel semantics (ref User/OrderController):
// panel field name is the KEY, provider param name is the VALUE: post[<value>] = values[<key>].
// 'action' value stays literal. '-' = send provider_id literal; '' = skip.
// Legacy template format (config.body with {placeholders}): isTemplate from caller.
function buildRequest(mapping: Record<string, string>, values: Record<string, any>, isTemplate: boolean): Record<string, any> {
  if (isTemplate) {
    // Legacy template substitution
    const sub = (val: any): any => {
      if (typeof val === 'string') {
        return val.replace(/\{(\w+)\}/g, (_, k) => 
          Object.prototype.hasOwnProperty.call(values, k) && values[k] !== undefined && values[k] !== null ? String(values[k]) : `{${k}}`);
      }
      if (Array.isArray(val)) return val.map(sub);
      if (val && typeof val === 'object') {
        const nested: Record<string, any> = {};
        for (const [nk, nv] of Object.entries(val)) nested[nk] = sub(nv);
        return nested;
      }
      return val;
    };
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(mapping)) out[key] = sub(val);
    return out;
  }

  // Mapping format
  const out: Record<string, any> = {};
  for (const [panelField, providerParamRaw] of Object.entries(mapping)) {
    const providerParam = String(providerParamRaw ?? '').trim();
    if (panelField === 'action') {
      if (providerParam) out.action = providerParam; // literal value, '-' tolerated as literal
      continue;
    }
    if (!providerParam) continue; // empty = field unused
    if (providerParam === '-') { out[panelField] = String(values[panelField] ?? ''); continue; } // send panel value under panel name
    const v = values[panelField];
    out[providerParam] = v !== undefined && v !== null ? String(v) : '';
  }
  return out;
}

// Build headers: mapping format { headerName: 'sourceKey' } -> values[sourceKey];
// legacy template format substitutes {api_key}/{api_secret} placeholders (single pass,
// provider_key may contain {api_secret} as literal).
function buildHeaders(headerMap: Record<string, string>, values: Record<string, any>, isTemplate: boolean): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, val] of Object.entries(headerMap)) {
    if (isTemplate && typeof val === 'string') {
      out[name] = val.replace(/\{(api_key|api_secret)\}/g, (_, k) =>
        values[k] !== undefined && values[k] !== null ? String(values[k]) : `{${k}}`);
    } else {
      const v = values[val];
      out[name] = v !== undefined && v !== null ? String(v) : '';
    }
  }
  return out;
}

// Common values map for all operations
function commonValues(provider: any, extra: Record<string, any> = {}): Record<string, any> {
  return {
    provider_id: provider.provider_id || '',
    provider_key: provider.provider_key || '',
    provider_secret: provider.provider_secret || '',
    api_key: provider.provider_key || '',
    api_secret: provider.provider_secret || '',
    key: provider.provider_key || '',
    ...extra,
  };
}

// Legacy template values (matches original template substitution)
function templateValues(provider: any, extra: Record<string, any> = {}): Record<string, any> {
  return {
    provider_id: provider.provider_id || '',
    provider_key: provider.provider_key || '',
    provider_secret: provider.provider_secret || '',
    api_key: provider.provider_key || '',
    api_secret: provider.provider_secret || '',
    ...extra,
  };
}

export async function executeProviderOrder(provider: any, order: any, extra: any) {
  try {
    if (!orderTarget(order.target) || !positiveInt(order.quantity)) return { success: false, error: 'Invalid order target or quantity' };
    if (provider.id !== order.provider_id || (extra.service && extra.service.provider_id !== order.provider_id))
      return { success: false, error: 'Provider snapshot mismatch' };
    const config = provider.order_config || {};
    const endpoint = config.endpoint || provider.endpoint?.order;
    if (!endpoint) return { success: false, error: 'No order endpoint' };

    const mapping = config.request || config.body || { action: 'add', provider_key: 'key', service: 'service' };
    const isTemplate = !config.request && config.body;
    const values = isTemplate
      ? {
          provider_id: provider.provider_id || '',
          provider_key: provider.provider_key || '',
          provider_secret: provider.provider_secret || '',
          api_key: provider.provider_key || '',
          api_secret: provider.provider_secret || '',
          service_id: extra.service?.provider_service_id || '',
          target: order.target,
          quantity: String(order.quantity),
          custom_comments: order.custom_comments || '',
          username: order.username || '',
          answer_number: order.answer_number ?? '',
          order_id: String(order.id),
        }
      : commonValues(provider, {
          service_id: extra.service?.provider_service_id || '',
          refill_service_id: extra.service?.refill_provider_service_id || '',
          target: order.target,
          quantity: String(order.quantity),
          custom_comments: order.custom_comments || '',
          username: order.username || '',
          answer_number: order.answer_number ?? '',
          order_id: String(order.id),
          service: extra.service?.provider_service_id || '',
        });

    const body = buildRequest(mapping, values, isTemplate);
    const isFormData = config.content_type === 'application/x-www-form-urlencoded';
    const contentType = isFormData ? 'application/x-www-form-urlencoded' : 'application/json';
    const reqBody = isFormData
      ? new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString()
      : JSON.stringify(body);

    const headers = { 'Content-Type': contentType, ...buildHeaders(config.headers || {}, values, isTemplate) };

    const claimed = await prisma.order.updateMany({
      where: { id: order.id, provider_id: provider.id, status: 'PENDING', is_refund: false,
        provider_order_id: null, provider_order_log: DISPATCH_READY },
      data: { provider_order_log: DISPATCH_STARTED },
    });
    if (claimed.count === 0) return { success: false, error: 'Order already dispatched or requires review' };
    const res = await fetch(endpoint, { method: 'POST', headers, body: reqBody });
    const data = await res.json();

    const orderPath = toPath(config.response?.order?.order_id || config.response?.order_id) || 'order_id';
    const providerOrderId = responseId(get(data, orderPath));
    const providerLog = JSON.stringify(data);

    if (!providerOrderId) {
      const rejected = res.ok && explicitlyRejected(data);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: rejected ? 'ERROR' : 'PENDING', provider_order_log: providerLog },
      });
      return { success: false, error: rejected ? 'Provider rejected order' : 'Unknown provider outcome; manual review required', response: data };
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        provider_order_id: String(providerOrderId),
        provider_order_log: providerLog,
        status: 'PROCESSING',
      },
    });

    return { success: true, provider_order_id: providerOrderId, response: data };
  } catch (e: any) {
    console.error(`Order #${order.id}: provider outcome requires review`);
    return { success: false, error: 'Unknown provider outcome; manual review required' };
  }
}

export async function checkProviderStatus(provider: any, order: any) {
  try {
    const config = provider.status_config || {};
    const endpoint = config.endpoint || provider.endpoint?.status;
    if (!endpoint || !order.provider_order_id) return null;

    const mapping = config.request || config.body || { action: 'status', provider_key: 'key', order_id: 'id' };
    const isTemplate = !!config.body && !config.request;
    const values = isTemplate
      ? {
          provider_id: provider.provider_id || '',
          provider_key: provider.provider_key || '',
          provider_secret: provider.provider_secret || '',
          api_key: provider.provider_key || '',
          api_secret: provider.provider_secret || '',
          key: provider.provider_key || '',
          order_id: order.provider_order_id,
        }
      : commonValues(provider, {
          order_id: order.provider_order_id,
          service_id: order.service?.provider_service_id || '',
          service: order.service?.provider_service_id || '',
        });

    const body = buildRequest(mapping, values, isTemplate);
    const isFormData = config.content_type === 'application/x-www-form-urlencoded' || !config.content_type;
    const contentType = isFormData ? 'application/x-www-form-urlencoded' : 'application/json';
    const reqBody = isFormData
      ? new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString()
      : JSON.stringify(body);

    const headers = { 'Content-Type': contentType, ...buildHeaders(config.headers || {}, values, isTemplate) };

    const res = await fetch(endpoint, { method: 'POST', headers, body: reqBody });
    const data = await res.json();
    if (!res.ok) return null;

    const resp = config.response || {};
    const statusValue = get(data, toPath(resp.status) || 'status') ?? null;
    const startCount = get(data, toPath(resp.start_count) || 'start_count') ?? null;
    const remains = get(data, toPath(resp.remains) || 'remains') ?? null;

    let mappedStatus: string | null = null;
    if (statusValue !== null) {
      const sv = String(statusValue).toLowerCase();
      for (const [status, vals] of Object.entries(config.status_value || {})) {
        // admin types "Pending, Proccess" — split comma lists (Laravel stores list arrays)
        const list = Array.isArray(vals) ? vals : String(vals).split(',');
        if (list.some((v) => String(v).trim().toLowerCase() === sv)) {
          mappedStatus = status.toUpperCase();
          break;
        }
      }
    }

    return {
      status: mappedStatus,
      start_count: startCount !== null ? Number(startCount) : null,
      remains: remains !== null ? Number(remains) : null,
      raw: data,
    };
  } catch {
    return null;
  }
}

export async function executeProviderRefill(provider: any, refill: any) {
  try {
    if (!orderTarget(refill.target) || !positiveInt(refill.quantity)) return { success: false, error: 'Invalid refill target or quantity' };
    if (provider.id !== refill.order?.provider_id) return { success: false, error: 'Provider snapshot mismatch' };
    const config = provider.refill_config || {};
    const endpoint = config.endpoint || provider.endpoint?.refill;
    if (!endpoint) return { success: false, error: 'No refill endpoint' };

    const mapping = config.request || config.body || { action: 'refill', provider_key: 'key', service: 'refill_service_id' };
    const isTemplate = !!config.body && !config.request;
    const values = isTemplate
      ? {
          provider_id: provider.provider_id || '',
          provider_key: provider.provider_key || '',
          provider_secret: provider.provider_secret || '',
          api_key: provider.provider_key || '',
          api_secret: provider.provider_secret || '',
          service_id: refill.order?.service?.provider_service_id || '',
          refill_service_id: refill.order?.service?.refill_provider_service_id || refill.order?.service?.provider_service_id || '',
          target: refill.target,
          quantity: String(refill.quantity),
          order_id: refill.order?.provider_order_id || '',
          refill_id: String(refill.id),
        }
      : commonValues(provider, {
          service_id: refill.order?.service?.provider_service_id || '',
          refill_service_id: refill.order?.service?.refill_provider_service_id || refill.order?.service?.provider_service_id || '',
          target: refill.target,
          quantity: String(refill.quantity),
          order_id: refill.order?.provider_order_id || '',
          refill_id: String(refill.id),
          service: refill.order?.service?.provider_service_id || '',
        });

    const body = buildRequest(mapping, values, isTemplate);
    const isFormData = config.content_type === 'application/x-www-form-urlencoded';
    const contentType = isFormData ? 'application/x-www-form-urlencoded' : 'application/json';
    const reqBody = isFormData
      ? new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString()
      : JSON.stringify(body);

    const headers = { 'Content-Type': contentType, ...buildHeaders(config.headers || {}, values, isTemplate) };

    const claimed = await prisma.orderRefill.updateMany({
      where: { id: refill.id, status: 'PENDING', provider_refill_id: null },
      data: { status: 'PROCESSING' },
    });
    if (claimed.count === 0) return { success: false, error: 'Refill already dispatched or requires review' };
    const res = await fetch(endpoint, { method: 'POST', headers, body: reqBody });
    const data = await res.json();

    const refillPath = toPath(config.response?.refill?.refill_id || config.response?.refill_id) || 'refill_id';
    const providerRefillId = responseId(get(data, refillPath));
    if (!providerRefillId) {
      const rejected = res.ok && explicitlyRejected(data);
      if (rejected) await prisma.orderRefill.update({ where: { id: refill.id }, data: { status: 'ERROR' } });
      return { success: false, error: rejected ? 'Provider rejected refill' : 'Unknown refill outcome; manual review required', response: data };
    }
    await prisma.orderRefill.update({
      where: { id: refill.id },
      data: {
        provider_refill_id: String(providerRefillId),
        status: 'PROCESSING',
      },
    });
    return { success: true, provider_refill_id: providerRefillId, response: data };
  } catch (e: any) {
    console.error(`Refill #${refill.id}: provider outcome requires review`);
    return { success: false, error: 'Unknown refill outcome; manual review required' };
  }
}

export async function checkRefillStatus(provider: any, refill: any) {
  try {
    const config = provider.refill_status_config || provider.status_config || {};
    const endpoint = config.endpoint || provider.endpoint?.refill_status || provider.endpoint?.status;
    if (!endpoint || !refill.provider_refill_id) return null;

    const mapping = config.request || config.body || { action: 'refill_status', provider_key: 'key', refill_id: 'refill_id' };
    const isTemplate = !!config.body && !config.request;
    const values = isTemplate
      ? {
          provider_id: provider.provider_id || '',
          provider_key: provider.provider_key || '',
          provider_secret: provider.provider_secret || '',
          api_key: provider.provider_key || '',
          api_secret: provider.provider_secret || '',
          key: provider.provider_key || '',
          refill_id: refill.provider_refill_id,
          order_id: refill.order?.provider_order_id || '',
        }
      : commonValues(provider, {
          refill_id: refill.provider_refill_id,
          order_id: refill.order?.provider_order_id || '',
          service_id: refill.order?.service?.provider_service_id || '',
          service: refill.order?.service?.provider_service_id || '',
        });

    const body = buildRequest(mapping, values, isTemplate);
    const isFormData = config.content_type === 'application/x-www-form-urlencoded' || !config.content_type;
    const contentType = isFormData ? 'application/x-www-form-urlencoded' : 'application/json';
    const reqBody = isFormData
      ? new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString()
      : JSON.stringify(body);

    const headers = { 'Content-Type': contentType, ...buildHeaders(config.headers || {}, values, isTemplate) };

    const res = await fetch(endpoint, { method: 'POST', headers, body: reqBody });
    const data = await res.json();
    if (!res.ok) return null;

    const resp = config.response || {};
    const statusValue = get(data, toPath(resp.status) || 'status') ?? null;

    let mappedStatus: string | null = null;
    if (statusValue !== null) {
      const sv = String(statusValue).toLowerCase();
      for (const [status, vals] of Object.entries(config.status_value || {})) {
        const list = Array.isArray(vals) ? vals : String(vals).split(',');
        if (list.some((v) => String(v).trim().toLowerCase() === sv)) {
          mappedStatus = status.toUpperCase();
          break;
        }
      }
    }
    return { status: mappedStatus, raw: data };
  } catch { return null; }
}

// service_config schema (mapping-driven, parity with Laravel panel):
// { endpoint, method?, headers?, content_type?, request: {adminField: outField},
//   looping: 'data', response: {id,name,category,price,min,max,type,refill,description} field paths,
//   currency: 'IDR'|'USD', price_setting:{operator:'*|/|+|-',value}, profit_setting:{operator:'*|+|-|%',value},
//   other_value:{custom_comments,comment_likes,is_refill_support},
//   settings: {name,min_max,price_profit,profit,description,custom_comments,refill_support,status} update flags }
export type SyncReport = { added: number; updated: number; disabled: number; details: string[] };

// price = price_setting(providerPrice); profit = profit_setting(price); final price = price + profit.
function applySetting(value: number, setting: any): number {
  if (!setting || !setting.operator) return value;
  const v = Number(setting.value);
  if (!Number.isFinite(v)) return value;
  switch (setting.operator) {
    case '*': return Math.ceil(value * v);
    case '/': return v !== 0 ? Math.ceil(value / v) : value;
    case '+': return Math.ceil(value + v);
    case '-': return Math.ceil(value - v);
    case '%': return Math.ceil(value * (v / 100));
    default: return value;
  }
}

const usdRateCache = { rate: 0, at: 0 };
// ponytail: 1h cache, refresh-per-process if FX matters more
async function usdToIdrRate(): Promise<number> {
  if (usdRateCache.rate && Date.now() - usdRateCache.at < 3600_000) return usdRateCache.rate;
  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  const data = await res.json();
  const rate = Number(data?.rates?.IDR);
  if (!rate) throw new Error('FX rate unavailable');
  usdRateCache.rate = rate; usdRateCache.at = Date.now();
  return rate;
}

async function categoryByName(name: string, cache: Map<string, number>): Promise<number> {
  const key = name.trim() || 'Provider';
  if (cache.has(key)) return cache.get(key)!;
  let cat = await prisma.serviceCategory.findFirst({ where: { name: key } });
  if (!cat) cat = await prisma.serviceCategory.create({ data: { name: key } });
  cache.set(key, cat.id);
  return cat.id;
}

// Fetch raw provider service list payload (service_config driven). Returns parsed JSON or null.
export async function fetchProviderServices(provider: any): Promise<any | null> {
  try {
    const config = provider.service_config || {};
    const endpoint = config.endpoint || provider.endpoint?.services || provider.endpoint?.service;
    if (!endpoint) return null;

    const mapping = config.request || config.body || { action: 'services', provider_key: 'key' };
    const isTemplate = !!config.body && !config.request;
    const values = isTemplate
      ? {
          provider_id: provider.provider_id || '',
          provider_key: provider.provider_key || '',
          provider_secret: provider.provider_secret || '',
          api_key: provider.provider_key || '',
          api_secret: provider.provider_secret || '',
        }
      : commonValues(provider, {});

    const body = buildRequest(mapping, values, isTemplate);
    const isFormData = config.content_type === 'application/x-www-form-urlencoded' || !config.content_type;
    const contentType = isFormData ? 'application/x-www-form-urlencoded' : 'application/json';
    const reqBody = isFormData
      ? new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString()
      : JSON.stringify(body);

    const headers = { 'Content-Type': contentType, ...buildHeaders(config.headers || {}, values, isTemplate) };

    const res = await fetch(endpoint, { method: config.method || 'POST', headers, body: reqBody });
    const data = await res.json();
    return res.ok ? data : null;
  } catch {
    return null;
  }
}

// Pull services from provider and upsert. Honors response mapping, price/profit settings,
// per-item category, USD conversion, other_value type/refill detection, update flags,
// disables vanished provider services. Idempotent: unchanged rows are not touched.
export async function syncProviderServices(provider: any): Promise<SyncReport | null> {
  const data = await fetchProviderServices(provider);
  if (!data) return null;
  const rows = await computeServiceRows(provider, data);
  if (!rows) return null;
  return await syncServiceRows(provider, rows);
}

// Laravel-style paths: "['data']['list']" or "[data]" or "data.sub" → lodash.get path
function toPath(p: unknown): string {
  if (typeof p !== 'string') return '';
  return p.replace(/\]\[\x27/g, '.').replace(/^\[\x27/, '').replace(/\x27\]$/, '').replace(/^\[(.+)\]$/, '$1').replace(/['"]/g, '');
}

// Pure computation pass: raw provider payload -> normalized rows (no DB writes).
// Shared by sync (persist) and admin import preview (shows final price/category before commit).
export async function computeServiceRows(provider: any, data: any) {
  const config = provider.service_config || {};
  const resp = config.response || {};
  const looping = toPath(config.looping) || toPath(resp.list) || 'data';
  const rawList = get(data, looping);
  if (!Array.isArray(rawList)) return null;

  const path = (key: string) => toPath(resp[key]) || key;
  const field = (item: any, key: string) => get(item, path(key));
  const usd = String(provider.currency || config.currency || 'IDR').toUpperCase() === 'USD';
  const fx = usd ? await usdToIdrRate() : 1;
  const ov = config.other_value || {};

  const rows = [];
  for (const item of rawList) {
    const pid = String(field(item, 'id') ?? '').trim();
    const name = String(field(item, 'name') ?? '').replace(' ??', '').trim();
    if (!pid || !name) continue;
    const basePrice = applySetting(Math.ceil(Number(field(item, 'price') ?? 0) * fx), config.price_setting);
    const profit = applySetting(basePrice, config.profit_setting);
    const rawType = String(field(item, 'type') ?? '');
    let type = 'DEFAULT';
    if (ov.custom_comments && rawType === String(ov.custom_comments)) type = 'CUSTOM_COMMENTS';
    else if (ov.comment_likes && rawType === String(ov.comment_likes)) type = 'COMMENT_LIKES';
    else if (['COMMENT_LIKES', 'CUSTOM_COMMENTS', 'SUBSCRIPTIONS', 'POLL'].includes(rawType.toUpperCase())) type = rawType.toUpperCase();
    const refillValue = field(item, 'refill');
    const refillId = ['', 'false', '0'].includes(String(refillValue ?? ''))
      ? null : (String(refillValue) === 'true' ? pid : String(refillValue));
    rows.push({
      name,
      provider_service_id: pid,
      price: basePrice + profit, profit,
      min: Number(field(item, 'min') ?? 0) || 0,
      max: Number(field(item, 'max') ?? 0) || 0,
      description: String(field(item, 'description') ?? '') || '-',
      type,
      category_name: String(field(item, 'category') ?? '').trim() || 'Provider',
      refill_provider_service_id: String(ov.is_refill_support) === 'true' ? refillId : null,
    });
  }
  return rows;
}

const DEFAULT_SERVICE_SETTINGS = { update_service: '1', name: '1', min_max: '1', price_profit: '1', profit: '1', description: '1', custom_comments: '1', refill_support: '1', status: '1' };

// Persist computed rows: per-item category find-or-create, idempotent upsert (only flagged
// fields, only real changes), disable vanished. PITFALL parity: string-cast seen ids,
// manual services (null provider_service_id) excluded from disable.
export async function syncServiceRows(provider: any, rows: Awaited<ReturnType<typeof computeServiceRows>>, options?: { disableMissing?: boolean }) {
  const config = provider.service_config || {};
  const provFlags = config.settings || {};
  // Laravel cron parity: service.settings present + update_service!=1 -> row frozen (skip).
  // Settings present -> field flags strict '1'. Legacy rows (no settings) -> provider flags, on-by-default.
  const flagsFor = (existing: any) => {
    const s = existing?.settings as any;
    if (!s || typeof s !== 'object') return provFlags;
    if (String(s.update_service) !== '1') return null;
    return s;
  };
  const flagOn = (flags: any, k: string) => !flags || String(flags[k]) === '1' || (flags === provFlags && flags[k] === undefined);
  const catCache = new Map<string, number>();
  const report: SyncReport = { added: 0, updated: 0, disabled: 0, details: [] };
  const seen = new Set<string>();

  for (const row of rows || []) {
    seen.add(row.provider_service_id);
    const category = await categoryByName(row.category_name, catCache);
    const existing = await prisma.service.findFirst({ where: { provider_id: provider.id, provider_service_id: row.provider_service_id } });
    if (!existing) {
      await prisma.service.create({ data: { provider_id: provider.id, category_id: category, ...row, category_name: undefined, status: true, is_refill_support: !!row.refill_provider_service_id, settings: DEFAULT_SERVICE_SETTINGS } as any });
      report.added++;
      report.details.push(`+ ${row.provider_service_id} ${row.name}`);
      continue;
    }
    const patch: any = {};
    const flags = flagsFor(existing);
    if (!flags) continue; // frozen by per-service settings (Laravel update_service=0)
    if (flagOn(flags, 'name') && existing.name !== row.name) patch.name = row.name;
    if (flagOn(flags, 'min_max') && (existing.min !== row.min || existing.max !== row.max)) { patch.min = row.min; patch.max = row.max; }
    if (flagOn(flags, 'price_profit') && (existing.price !== row.price || existing.profit !== row.profit)) { patch.price = row.price; patch.profit = row.profit; }
    if (flagOn(flags, 'description') && existing.description !== row.description) patch.description = row.description;
    if (flagOn(flags, 'custom_comments') && existing.type !== row.type) patch.type = row.type as any;
    if (flagOn(flags, 'refill_support') && existing.refill_provider_service_id !== row.refill_provider_service_id) {
      patch.refill_provider_service_id = row.refill_provider_service_id;
      patch.is_refill_support = !!row.refill_provider_service_id;
    }
    if (flagOn(flags, 'category') && existing.category_id !== category) patch.category_id = category;
    if (flagOn(flags, 'status') && !existing.status) patch.status = true;
    if (Object.keys(patch).length) {
      await prisma.service.update({ where: { id: existing.id }, data: patch });
      report.updated++;
      if (report.details.length < 500) report.details.push(`~ ${row.provider_service_id} ${row.name}`);
    }
  }

  // Disable vanished only on FULL lists — selective import must never mass-disable siblings.
  if (options?.disableMissing !== false && seen.size > 0) {
    const vanished = await prisma.service.findMany({
      where: { provider_id: provider.id, status: true, provider_service_id: { not: null, notIn: [...seen] } },
      select: { id: true },
    });
    if (vanished.length) {
      await prisma.service.updateMany({ where: { id: { in: vanished.map((s) => s.id) } }, data: { status: false } });
      report.disabled = vanished.length;
    }
  }
  return report;
}

export async function checkBalance(provider: any) {
  try {
    const config = provider.profile_config || {};
    const endpoint = config.endpoint;
    if (!endpoint) return null;

    const mapping = config.request || config.body || { action: 'balance', provider_key: 'key' };
    const isTemplate = !!config.body && !config.request;
    const values = isTemplate
      ? {
          provider_id: provider.provider_id || '',
          provider_key: provider.provider_key || '',
          provider_secret: provider.provider_secret || '',
          api_key: provider.provider_key || '',
          api_secret: provider.provider_secret || '',
          key: provider.provider_key || '',
        }
      : commonValues(provider, {});

    const body = buildRequest(mapping, values, isTemplate);
    const isFormData = config.content_type === 'application/x-www-form-urlencoded' || !config.content_type;
    const contentType = isFormData ? 'application/x-www-form-urlencoded' : 'application/json';
    const reqBody = isFormData
      ? new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString()
      : JSON.stringify(body);

    const headers = { 'Content-Type': contentType, ...buildHeaders(config.headers || {}, values, isTemplate) };

    const res = await fetch(endpoint, { method: config.method || 'POST', headers, body: reqBody });
    const data = await res.json();
    if (!res.ok) return null;

    const resp = config.response || {};
    const balance = get(data, toPath(resp.balance) || 'balance', null);
    const currency = get(data, toPath(resp.currency) || 'currency', provider.currency);
    return {
      balance: balance !== null ? Number(balance) : null,
      currency,
      raw: data,
    };
  } catch {
    return null;
  }
}