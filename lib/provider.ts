import { prisma } from './prisma';
import get from 'lodash.get';
import { orderTarget, positiveInt } from './order-input';

// Substitute only original template tokens; inserted values are literal, never templates.
function replaceTemplate(value: any, values: Record<string, any>): any {
  if (typeof value === 'string') return value.replace(/{(\w+)}/g, (token, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : token);
  if (Array.isArray(value)) return value.map((item) => replaceTemplate(item, values));
  if (value && typeof value === 'object') {
    const result: any = {};
    for (const [key, item] of Object.entries(value)) result[key] = replaceTemplate(item, values);
    return result;
  }
  return value;
}

// Fresh rows alone may be dispatched. Legacy null logs are ambiguous, not proof of no send.
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
// ponytail: no remote exactly-once guarantee. Unknown outcomes require operator reconciliation;
// attach the verified upstream ID for polling. Add automatic retries only with upstream idempotency.
export async function executeProviderOrder(provider: any, order: any, extra: any) {
  try {
    if (!orderTarget(order.target) || !positiveInt(order.quantity)) return { success: false, error: 'Invalid order target or quantity' };
    if (provider.id !== order.provider_id || (extra.service && extra.service.provider_id !== order.provider_id))
      return { success: false, error: 'Provider snapshot mismatch' };
    const config = provider.order_config || {};
    const endpoint = config.endpoint || provider.endpoint?.order;
    const bodyTemplate = config.body || {};

    // Replace placeholders in body template
    const values = {
      service_id: extra.service?.provider_service_id || '',
      target: order.target,
      quantity: String(order.quantity),
      custom_comments: order.custom_comments || '',
      username: order.username || '',
      order_id: String(order.id),
      provider_id: provider.provider_id || '',
      api_key: provider.provider_key || '',
      api_secret: provider.provider_secret || '',
    };

    const body = replaceTemplate(bodyTemplate, values);

    // POST form data or JSON
    const isFormData = config.content_type === 'application/x-www-form-urlencoded';
    let reqBody: string;
    let contentType: string;
    if (isFormData) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) params.set(k, String(v));
      reqBody = params.toString();
      contentType = 'application/x-www-form-urlencoded';
    } else {
      reqBody = JSON.stringify(body);
      contentType = 'application/json';
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ...(config.headers || {}),
    };
    // Replace auth placeholders in headers
    for (const [k, v] of Object.entries(headers)) {
      headers[k] = replaceTemplate(String(v), { api_key: provider.provider_key, api_secret: provider.provider_secret || '' });
    }

    const claimed = await prisma.order.updateMany({
      where: { id: order.id, provider_id: provider.id, status: 'PENDING', is_refund: false,
        provider_order_id: null, provider_order_log: DISPATCH_READY },
      data: { provider_order_log: DISPATCH_STARTED },
    });
    if (claimed.count === 0) return { success: false, error: 'Order already dispatched or requires review' };
    const res = await fetch(endpoint, { method: 'POST', headers, body: reqBody });
    const data = await res.json();

    // Extract provider_order_id from response using dot-path
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
    // The durable claim survives network, parse, and persistence failures. Never refund/replay it.
    console.error(`Order #${order.id}: provider outcome requires review`);
    return { success: false, error: 'Unknown provider outcome; manual review required' };
  }
}

export async function checkProviderStatus(provider: any, order: any) {
  try {
    const config = provider.status_config || {};
    const endpoint = config.endpoint || provider.endpoint?.status;
    if (!endpoint || !order.provider_order_id) return null;

    const values = {
      order_id: order.provider_order_id,
      provider_id: provider.provider_id || '',
      api_key: provider.provider_key || '',
      api_secret: provider.provider_secret || '',
      key: provider.provider_key || '',
    };

    const bodyTemplate = config.body || config.request || {};
    const body = replaceTemplate(bodyTemplate, values);
    const isFormData = config.content_type === 'application/x-www-form-urlencoded' || !config.content_type;
    let reqBody: string;
    let contentType: string;
    if (isFormData) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) params.set(k, String(v));
      reqBody = params.toString();
      contentType = 'application/x-www-form-urlencoded';
    } else {
      reqBody = JSON.stringify(body);
      contentType = 'application/json';
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ...(config.headers || {}),
    };
    for (const [k, v] of Object.entries(headers)) {
      headers[k] = replaceTemplate(String(v), { api_key: provider.provider_key, api_secret: provider.provider_secret || '' });
    }

    const res = await fetch(endpoint, { method: 'POST', headers, body: reqBody });
    const data = await res.json();
    if (!res.ok) return null;

    const resp = config.response || {};
    const statusValue = get(data, resp.status || 'status') ?? null;
    const startCount = get(data, resp.start_count || 'start_count') ?? null;
    const remains = get(data, resp.remains || 'remains') ?? null;

    // status_value: { 'SUCCESS': ['Completed', 'Success', ...], 'PROCESSING': ['Pending', ...], ... }
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

// ponytail: mirrors executeProviderOrder. Add when refill providers need merge logic.
export async function executeProviderRefill(provider: any, refill: any) {
  try {
    if (!orderTarget(refill.target) || !positiveInt(refill.quantity)) return { success: false, error: 'Invalid refill target or quantity' };
    if (provider.id !== refill.order?.provider_id) return { success: false, error: 'Provider snapshot mismatch' };
    const config = provider.refill_config || {};
    const endpoint = config.endpoint || provider.endpoint?.refill;
    if (!endpoint) return { success: false, error: 'No refill endpoint' };

    const values = {
      service_id: refill.order?.service?.provider_service_id || '',
      refill_service_id: refill.order?.service?.refill_provider_service_id || refill.order?.service?.provider_service_id || '',
      target: refill.target,
      quantity: String(refill.quantity),
      order_id: refill.order?.provider_order_id || '',
      refill_id: String(refill.id),
      provider_id: provider.provider_id || '',
      api_key: provider.provider_key || '',
      api_secret: provider.provider_secret || '',
    };

    const body = replaceTemplate(config.body || {}, values);
    const isFormData = config.content_type === 'application/x-www-form-urlencoded';
    let reqBody: string, contentType: string;
    if (isFormData) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) params.set(k, String(v));
      reqBody = params.toString();
      contentType = 'application/x-www-form-urlencoded';
    } else {
      reqBody = JSON.stringify(body);
      contentType = 'application/json';
    }
    const headers: Record<string, string> = { 'Content-Type': contentType, ...(config.headers || {}) };
    for (const [k, v] of Object.entries(headers)) {
      headers[k] = replaceTemplate(String(v), { api_key: provider.provider_key, api_secret: provider.provider_secret || '' });
    }

    // PROCESSING with no upstream ID is a durable in-flight/review claim, never retry automatically.
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

// ponytail: mirrors checkProviderStatus for orders. Add when refill providers need different response parsing.
export async function checkRefillStatus(provider: any, refill: any) {
  try {
    const config = provider.refill_status_config || provider.status_config || {};
    const endpoint = config.endpoint || provider.endpoint?.refill_status || provider.endpoint?.status;
    if (!endpoint || !refill.provider_refill_id) return null;

    const values = {
      refill_id: refill.provider_refill_id,
      order_id: refill.order?.provider_order_id || '',
      provider_id: provider.provider_id || '',
      api_key: provider.provider_key || '',
      api_secret: provider.provider_secret || '',
      key: provider.provider_key || '',
    };

    const bodyTemplate = config.body || config.request || {};
    const body = replaceTemplate(bodyTemplate, values);
    const isFormData = config.content_type === 'application/x-www-form-urlencoded' || !config.content_type;
    let reqBody: string, contentType: string;
    if (isFormData) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) params.set(k, String(v));
      reqBody = params.toString();
      contentType = 'application/x-www-form-urlencoded';
    } else {
      reqBody = JSON.stringify(body);
      contentType = 'application/json';
    }
    const headers: Record<string, string> = { 'Content-Type': contentType, ...(config.headers || {}) };
    for (const [k, v] of Object.entries(headers)) {
      headers[k] = replaceTemplate(String(v), { api_key: provider.provider_key, api_secret: provider.provider_secret || '' });
    }

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
        if (list.some((v) => String(v).toLowerCase() === sv)) { mappedStatus = status.toUpperCase(); break; }
      }
    }
    return { status: mappedStatus, raw: data };
  } catch { return null; }
}

// ponytail: price stored as-is (provider per-1000 rate, no margin). Add margin config when resellers need markup.
export async function syncProviderServices(provider: any) {
  try {
    const config = provider.service_config || {};
    const endpoint = config.endpoint || provider.endpoint?.services;
    if (!endpoint) return null;

    const values = {
      provider_id: provider.provider_id || '',
      api_key: provider.provider_key || '',
      api_secret: provider.provider_secret || '',
    };

    const bodyTemplate = config.body || config.request || {};
    const body = replaceTemplate(bodyTemplate, values);
    const isFormData = config.content_type === 'application/x-www-form-urlencoded' || !config.content_type;
    let reqBody: string;
    let contentType: string;
    if (isFormData) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) params.set(k, String(v));
      reqBody = params.toString();
      contentType = 'application/x-www-form-urlencoded';
    } else {
      reqBody = JSON.stringify(body);
      contentType = 'application/json';
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ...(config.headers || {}),
    };
    for (const [k, v] of Object.entries(headers)) {
      headers[k] = replaceTemplate(String(v), { api_key: provider.provider_key, api_secret: provider.provider_secret || '' });
    }

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