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