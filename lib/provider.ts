import { prisma } from './prisma';
import get from 'lodash.get';

// ponytail: flat replacement only, no nested template recursion. Add when providers need merge logic.
export async function executeProviderOrder(provider: any, order: any, extra: any) {
  try {
    const config = provider.order_config || {};
    const endpoint = config.endpoint || provider.endpoint?.order;
    const bodyTemplate = config.body || {};

    // Replace placeholders in body template
    const replace = (v: any): any => {
      if (typeof v === 'string') {
        return v
          .replace(/{service_id}/g, extra.service?.provider_service_id || '')
          .replace(/{target}/g, order.target)
          .replace(/{quantity}/g, String(order.quantity))
          .replace(/{custom_comments}/g, order.custom_comments || '')
          .replace(/{username}/g, order.username || '')
          .replace(/{order_id}/g, String(order.id));
      }
      if (Array.isArray(v)) return v.map(replace);
      if (v && typeof v === 'object') {
        const o: any = {};
        for (const [k, val] of Object.entries(v)) o[k] = replace(val);
        return o;
      }
      return v;
    };

    const body = replace(bodyTemplate);

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
      headers[k] = String(v)
        .replace(/{api_key}/g, provider.provider_key)
        .replace(/{api_secret}/g, provider.provider_secret || '');
    }

    const res = await fetch(endpoint, { method: 'POST', headers, body: reqBody });
    const data = await res.json();

    // Extract provider_order_id from response using dot-path
    const orderPath = config.response?.order?.order_id || 'order_id';
    const providerOrderId = get(data, orderPath) || null;
    const providerLog = JSON.stringify(data);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        provider_order_id: providerOrderId ? String(providerOrderId) : null,
        provider_order_log: providerLog,
        status: 'PROCESSING',
      },
    });

    return { success: true, provider_order_id: providerOrderId, response: data };
  } catch (e: any) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'ERROR', provider_order_log: e.message },
    });
    return { success: false, error: e.message };
  }
}

// ponytail: flat placeholder replacement, mirrors executeProviderOrder. Add nested recursion when providers need it.
export async function checkProviderStatus(provider: any, order: any) {
  try {
    const config = provider.status_config || {};
    const endpoint = config.endpoint || provider.endpoint?.status;
    if (!endpoint || !order.provider_order_id) return null;

    const replace = (v: any): any => {
      if (typeof v === 'string') {
        return v
          .replace(/{order_id}/g, order.provider_order_id)
          .replace(/{provider_id}/g, provider.provider_id || '')
          .replace(/{api_key}/g, provider.provider_key || '')
          .replace(/{api_secret}/g, provider.provider_secret || '')
          .replace(/{key}/g, provider.provider_key || '');
      }
      if (Array.isArray(v)) return v.map(replace);
      if (v && typeof v === 'object') {
        const o: any = {};
        for (const [k, val] of Object.entries(v)) o[k] = replace(val);
        return o;
      }
      return v;
    };

    const bodyTemplate = config.body || config.request || {};
    const body = replace(bodyTemplate);
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
      headers[k] = String(v)
        .replace(/{api_key}/g, provider.provider_key)
        .replace(/{api_secret}/g, provider.provider_secret || '');
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

// ponytail: price stored as-is (provider per-1000 rate, no margin). Add margin config when resellers need markup.
export async function syncProviderServices(provider: any) {
  try {
    const config = provider.service_config || {};
    const endpoint = config.endpoint || provider.endpoint?.services;
    if (!endpoint) return null;

    const replace = (v: any): any => {
      if (typeof v === 'string') {
        return v
          .replace(/{provider_id}/g, provider.provider_id || '')
          .replace(/{api_key}/g, provider.provider_key || '')
          .replace(/{api_secret}/g, provider.provider_secret || '');
      }
      if (Array.isArray(v)) return v.map(replace);
      if (v && typeof v === 'object') {
        const o: any = {};
        for (const [k, val] of Object.entries(v)) o[k] = replace(val);
        return o;
      }
      return v;
    };

    const bodyTemplate = config.body || config.request || {};
    const body = replace(bodyTemplate);
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
      headers[k] = String(v)
        .replace(/{api_key}/g, provider.provider_key)
        .replace(/{api_secret}/g, provider.provider_secret || '');
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