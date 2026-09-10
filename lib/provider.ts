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

// Build request body from mapping: { adminField: 'outputField' } + values map
// Special: key 'action' value is literal (output['action'] = 'add').
// Other keys: value names output field, runtime value comes from values map.
// Legacy template format (body config with {placeholders}): isTemplate from caller.
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
  for (const [key, val] of Object.entries(mapping)) {
    if (key === 'action') {
      out[key] = val;
    } else {
      const v = values[val];
      out[val] = v !== undefined && v !== null ? String(v) : '';
    }
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

    const mapping = config.request || config.body || { action: 'add', key: 'provider_key', service: 'service_id' };
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
          order_id: String(order.id),
        }
      : commonValues(provider, {
          service_id: extra.service?.provider_service_id || '',
          refill_service_id: extra.service?.refill_provider_service_id || '',
          target: order.target,
          quantity: String(order.quantity),
          custom_comments: order.custom_comments || '',
          username: order.username || '',
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

    const orderPath = config.response?.order?.order_id || 'order_id';
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

    const mapping = config.request || config.body || { action: 'status', key: 'provider_key', id: 'order_id' };
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
    const statusValue = get(data, resp.status || 'status') ?? null;
    const startCount = get(data, resp.start_count || 'start_count') ?? null;
    const remains = get(data, resp.remains || 'remains') ?? null;

    let mappedStatus: string | null = null;
    if (statusValue !== null) {
      const sv = String(statusValue).toLowerCase();
      for (const [status, vals] of Object.entries(config.status_value || {})) {
        const list = Array.isArray(vals) ? vals : [vals];
        if (list.some((v) => String(v).toLowerCase() === sv)) {
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

    const mapping = config.request || config.body || { action: 'refill', key: 'provider_key', service: 'refill_service_id' };
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

    const refillPath = config.response?.refill?.refill_id || config.response?.refill_id || 'refill_id';
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

    const mapping = config.request || config.body || { action: 'refill_status', key: 'provider_key', id: 'refill_id' };
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
    const statusValue = get(data, resp.status || 'status') ?? null;

    let mappedStatus: string | null = null;
    if (statusValue !== null) {
      const sv = String(statusValue).toLowerCase();
      for (const [status, vals] of Object.entries(config.status_value || {})) {
        const list = Array.isArray(vals) ? vals : [vals];
        if (list.some((v) => String(v).toLowerCase() === sv)) {
          mappedStatus = status.toUpperCase();
          break;
        }
      }
    }
    return { status: mappedStatus, raw: data };
  } catch { return null; }
}

export async function syncProviderServices(provider: any) {
  try {
    const config = provider.service_config || {};
    const endpoint = config.endpoint || provider.endpoint?.services;
    if (!endpoint) return null;

    const mapping = config.request || config.body || { action: 'services', key: 'provider_key' };
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

    const res = await fetch(endpoint, { method: 'POST', headers, body: reqBody });
    const data = await res.json();
    if (!res.ok) return null;

    const resp = config.response || {};
    const listPath = resp.list || 'data';
    const list = Array.isArray(get(data, listPath)) ? get(data, listPath) : null;
    if (!list) return null;

    const f = resp.fields || {};
    const getField = (item: any, key: string, fallback: string) => {
      const p = f[key] || fallback;
      return get(item, p);
    };

    let category = await prisma.serviceCategory.findFirst({ where: { name: resp.category_name || 'Provider' } });
    if (!category) {
      category = await prisma.serviceCategory.create({ data: { name: resp.category_name || 'Provider' } });
    }

    let count = 0;
    for (const item of list) {
      const name = String(getField(item, 'name', 'name') ?? '');
      const providerServiceId = String(getField(item, 'id', 'id') ?? '');
      const price = Number(getField(item, 'price', 'price') ?? 0);
      if (!name || !price) continue;

      const min = Number(getField(item, 'min', 'min') ?? 0) || 0;
      const max = Number(getField(item, 'max', 'max') ?? 0) || 0;
      const type = String(getField(item, 'type', 'type') ?? 'DEFAULT').toUpperCase();
      const typeValid = ['DEFAULT', 'COMMENT_LIKES', 'CUSTOM_COMMENTS', 'SUBSCRIPTIONS'].includes(type) ? type : 'DEFAULT';

      const existing = await prisma.service.findFirst({
        where: { provider_id: provider.id, provider_service_id: providerServiceId },
      });
      const serviceData = {
        name,
        provider_service_id: providerServiceId,
        price,
        profit: price,
        min,
        max,
        type: typeValid as any,
        status: true,
      };
      if (existing) {
        await prisma.service.update({ where: { id: existing.id }, data: serviceData });
      } else {
        await prisma.service.create({ data: { category_id: category.id, provider_id: provider.id, ...serviceData } });
      }
      count++;
    }

    return { count, category: category.name };
  } catch {
    return null;
  }
}

export async function checkBalance(provider: any) {
  try {
    const config = provider.profile_config || {};
    const endpoint = config.endpoint;
    if (!endpoint) return null;

    const mapping = config.request || config.body || { action: 'balance', key: 'provider_key' };
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
    const balance = get(data, resp.balance || 'balance', null);
    const currency = get(data, resp.currency || 'currency', provider.currency);
    return {
      balance: balance !== null ? Number(balance) : null,
      currency,
      raw: data,
    };
  } catch {
    return null;
  }
}