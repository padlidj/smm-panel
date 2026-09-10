// Run: node tests/provider-mapping.cjs
// Laravel-style mapping: config.request maps admin field name -> output field name
// (or literal for 'action'). Values resolved from runtime values map.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(file, mocks = {}, cache = {}) {
  const full = path.resolve(root, file);
  if (cache[full]) return cache[full].exports;
  let source = fs.readFileSync(full, 'utf8');
  const module = { exports: {} }; cache[full] = module;
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('/prisma') || name === './prisma') throw Error('Unmocked DB');
    if (name.startsWith('@/') || name.startsWith('.')) {
      const target = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(full), name);
      return load(path.relative(root, target) + '.ts', mocks, cache);
    }
    if (['lodash.get', 'next/server'].includes(name)) return require(name);
    throw Error('Unmocked import: ' + name);
  };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire, console: { log() {}, error() {} }, process: { env: {} }, fetch: mocks.fetch || (() => { throw Error('Network forbidden'); }), URL, URLSearchParams, Date, Request, Response, NextResponse: require('next/server').NextResponse, getServerSession: mocks.getServerSession || (async () => ({ user: { role: 'admin' } })) }, { filename: full });
  return module.exports;
}

const provider = { id: 7, provider_id: 'P1', provider_key: 'KEY', provider_secret: 'SEC', currency: 'IDR', endpoint: { order: 'http://mock/' } };
// Laravel semantics: mapping key = panel field, value = provider param name ('-' = send as-is, '' = skip)
const mapping = { action: 'add', provider_key: 'key', service: 'service' };
const statusMapping = { action: 'status', provider_key: 'key', order_id: 'id' };
const refillMapping = { action: 'refill', provider_key: 'key', order_id: 'order' };
const refillStatusMapping = { action: 'refill_status', provider_key: 'key', refill_id: 'refill_id' };
const balanceMapping = { action: 'balance', provider_key: 'key' };
const servicesMapping = { action: 'services', provider_key: 'key' };

let request;
const model = { updateMany: async () => ({ count: 1 }), update: async () => {} };
const db = { order: model, orderRefill: model, serviceCategory: { findFirst: async () => ({ id: 1, name: 'fixture' }) } };
const api = load('lib/provider.ts', { ...{ './prisma': { prisma: db } }, fetch: async (url, init) => {
  request = { url, ...init };
  return { ok: true, json: async () => ({ order_id: 123, refill_id: 456, status: 'Success', balance: '9.5', currency: 'IDR', data: [] }) };
} });

async function bodyOf(fn, args) {
  await api[fn](...args);
  const ct = request.headers?.['Content-Type'] || request.headers?.['content-type'];
  if (ct?.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(request.body);
    const obj = {};
    for (const [k, v] of params) obj[k] = v;
    return obj;
  }
  return JSON.parse(request.body);
}

(async () => {
  const service = { provider_id: 7, provider_service_id: '123', refill_provider_service_id: 'r123' };
  const order = { id: 11, provider_id: 7, target: '@user', quantity: 100, custom_comments: '', username: '', provider_order_id: '42' };
  const refill = { id: 12, provider_id: 7, target: '@user', quantity: 100, provider_refill_id: 'R9', order: { ...order, service } };

  // 1. executeProviderOrder
  assert.deepEqual(await bodyOf('executeProviderOrder', [provider, order, { service }]),
    { action: 'add', key: 'KEY', service: '123' });
  // 2. checkProviderStatus
  assert.deepEqual(await bodyOf('checkProviderStatus', [{ ...provider, status_config: { endpoint: 'http://mock/', request: statusMapping } }, order]),
    { action: 'status', key: 'KEY', id: '42' });
  // 3. executeProviderRefill
  assert.deepEqual(await bodyOf('executeProviderRefill', [{ ...provider, refill_config: { endpoint: 'http://mock/', request: refillMapping } }, refill]),
    { action: 'refill', key: 'KEY', order: '42' });
  // 4. checkRefillStatus
  assert.deepEqual(await bodyOf('checkRefillStatus', [{ ...provider, refill_status_config: { endpoint: 'http://mock/', request: refillStatusMapping } }, refill]),
    { action: 'refill_status', key: 'KEY', refill_id: 'R9' });
  // 5. syncProviderServices
  assert.deepEqual(await bodyOf('syncProviderServices', [{ ...provider, service_config: { endpoint: 'http://mock/', request: servicesMapping } }]),
    { action: 'services', key: 'KEY' });
  // 6. checkBalance
  assert.deepEqual(await bodyOf('checkBalance', [{ ...provider, profile_config: { endpoint: 'http://mock/', request: balanceMapping } }]),
    { action: 'balance', key: 'KEY' });

  // 7. headers: output header name -> source key
  let h;
  const hProvider = { ...provider, profile_config: { endpoint: 'http://mock/', request: balanceMapping, headers: { Authorization: 'provider_key', 'X-Provider': 'provider_id' } } };
  await api.checkBalance(hProvider, {});
  h = request.headers;
  assert.equal(h.Authorization, 'KEY');
  assert.equal(h['X-Provider'], 'P1');
  assert.equal(h['Content-Type'], 'application/x-www-form-urlencoded', 'form default for balance');

  // 8. mapping format: only 'action' can be literal. Other keys map to runtime values.
  // Unknown runtime keys -> empty string. Brace tokens in output field names stay literal (no template).
  const litProvider = { ...provider, profile_config: { endpoint: 'http://mock/', request: { action: 'add', key: 'provider_key', note: 'literal {provider_key}' } } };
  assert.deepEqual(await bodyOf('checkBalance', [litProvider, {}]), { action: 'add', provider_key: 'KEY', 'literal {provider_key}': '' });

  // 9. '-' = value sent under panel field name; unknown panel fields -> empty string
  const wide = { ...provider, profile_config: { endpoint: 'http://mock/', request: {
    action: 'balance', provider_id: '-', provider_key: 'key', provider_secret: 'secret',
    service: 'svc', target: 'link', quantity: 'quantity' } } };
  const got = await bodyOf('checkBalance', [wide, {}]);
  assert.equal(got.action, 'balance');
  assert.equal(got.provider_id, 'P1', "'-' sends provider_id under its own name");
  assert.equal(got.key, 'KEY');
  assert.equal(got.secret, 'SEC');
  assert.equal(got.svc, '', 'checkBalance values has no service -> empty');
  assert.equal(got.link, ''); assert.equal(got.quantity, '');

  // 10. order defaults: executeProviderOrder without config.request -> sensible default mapping
  const bare = { ...provider, order_config: { endpoint: 'http://mock/' } };
  const r = await api.executeProviderOrder(bare, order, { service });
  assert.equal(r.success, true);
  const b = await bodyOf('executeProviderOrder', [bare, order, { service }]);
  assert.equal(b.action, 'add');
  assert.ok('provider_key' in b || 'key' in b, 'default auth field present');

  // 11. service sync: mapping paths, price/profit settings, categories, idempotent, disable vanished
  {
    const services = [{ sid: '7', service: 'Followers IG', cat: 'Instagram', rate: 10000, min: '10', max: '100', type: 'Default', refill: true, desc: null }];
    const rows = []; const cats = new Map(); const log = [];
    const syncDb = {
      serviceCategory: {
        findFirst: async ({ where }) => ({ id: cats.get(where.name) ?? (cats.set(where.name, cats.size + 1), cats.get(where.name)), name: where.name }),
        create: async ({ data }) => { cats.set(data.name, cats.size + 1); return { id: cats.get(data.name) }; },
      },
      service: {
        findFirst: async ({ where }) => rows.find(r => r.provider_id === where.provider_id && r.provider_service_id === where.provider_service_id),
        findMany: async () => rows.filter(r => r.status && !services.some(s => s.sid === r.provider_service_id)),
        create: async ({ data }) => { rows.push({ ...data, id: rows.length + 1 }); log.push('create'); return data; },
        update: async ({ where, data }) => { Object.assign(rows.find(r => r.id === where.id), data); log.push('update'); },
        updateMany: async () => ({ count: 1 }),
      },
    };
    const syncApi = load('lib/provider.ts', { './prisma': { prisma: syncDb }, fetch: async (url) =>
      url.includes('er-api') ? { ok: true, json: async () => ({ rates: { IDR: 15000 } }) } : { ok: true, json: async () => ({ data: { list: services } }) } });
    const cfgProvider = { id: 1, name: 'X', provider_id: 'P', provider_key: 'K', currency: 'IDR', service_config: {
      endpoint: 'http://mock/', request: { action: 'services', key: 'provider_key' }, looping: "['data']['list']",
      response: { id: "['sid']", name: "['service']", category: "['cat']", price: "['rate']", min: "['min']", max: "['max']", type: "['type']", refill: "['refill']", description: "['desc']" },
      price_setting: { operator: '*', value: '1.1' }, profit_setting: { operator: '%', value: '20' },
      other_value: { is_refill_support: 'true' }, settings: { name: '1', price_profit: '1', min_max: '0' } } };

    const rep1 = await syncApi.syncProviderServices(cfgProvider);
    assert.equal(JSON.stringify(rep1), JSON.stringify({ added: 1, updated: 0, disabled: 0, details: ['+ 7 Followers IG'] }), 'first sync adds');
    const svc = rows[0];
    // ceil(10000*1.1)=11000 base; profit=ceil(11000*.2)=2200; price=13200
    assert.equal(svc.price, 13200); assert.equal(svc.profit, 2200);
    assert.equal(svc.category_id, 1); assert.equal(svc.refill_provider_service_id, '7'); assert.equal(svc.description, '-');
    const rep2 = await syncApi.syncProviderServices(cfgProvider);
    assert.equal(rep2.updated, 0); assert.equal(rep2.added, 0); assert.equal(rep2.disabled, 0);
    // flag off min_max: change provider min -> must NOT update min
    services[0].min = '50';
    const rep3 = await syncApi.syncProviderServices(cfgProvider);
    assert.equal(rep3.updated, 0, 'min_max flag off blocks min-only change');
    // vanish -> disable (non-empty list; empty list must never mass-disable)
    const services2 = [services[0], { sid: '8', service: 'Likes', cat: 'Instagram', rate: 100, min: 1, max: 2, type: 'Default', refill: false, desc: '' }];
    services.length = 0; services.push(...services2);
    await syncApi.syncProviderServices(cfgProvider); // + sid 8
    services.splice(1, 1); // sid 8 gone from provider
    const rep4 = await syncApi.syncProviderServices(cfgProvider);
    assert.equal(rep4.disabled, 1);
    // empty provider list -> nothing touched
    services.length = 0;
    const rep5 = await syncApi.syncProviderServices(cfgProvider);
    assert.equal(rep5.disabled, 0, 'empty list must not mass-disable');
    // selective import never mass-disables
    assert.equal((await syncApi.syncServiceRows(cfgProvider, [], { disableMissing: false })).disabled, 0);
  }

  console.log('PASS provider-mapping');
})().catch(e => { console.error(e); process.exitCode = 1; });
