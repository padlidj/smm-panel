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
// request mapping: action literal + admin field -> output field
const mapping = { action: 'add', api_key: 'provider_key', service: 'service_id' };
const statusMapping = { action: 'status', key: 'provider_key', id: 'order_id' };
const refillMapping = { action: 'refill', key: 'provider_key', service: 'refill_service_id' };
const refillStatusMapping = { action: 'refill_status', key: 'provider_key', id: 'refill_id' };
const balanceMapping = { action: 'balance', key: 'provider_key' };
const servicesMapping = { action: 'services', key: 'provider_key' };

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
    { action: 'add', provider_key: 'KEY', service_id: '123' });
  // 2. checkProviderStatus
  assert.deepEqual(await bodyOf('checkProviderStatus', [{ ...provider, status_config: { endpoint: 'http://mock/', request: statusMapping } }, order]),
    { action: 'status', provider_key: 'KEY', order_id: '42' });
  // 3. executeProviderRefill
  assert.deepEqual(await bodyOf('executeProviderRefill', [{ ...provider, refill_config: { endpoint: 'http://mock/', request: refillMapping } }, refill]),
    { action: 'refill', provider_key: 'KEY', refill_service_id: 'r123' });
  // 4. checkRefillStatus
  assert.deepEqual(await bodyOf('checkRefillStatus', [{ ...provider, refill_status_config: { endpoint: 'http://mock/', request: refillStatusMapping } }, refill]),
    { action: 'refill_status', provider_key: 'KEY', refill_id: 'R9' });
  // 5. syncProviderServices
  assert.deepEqual(await bodyOf('syncProviderServices', [{ ...provider, service_config: { endpoint: 'http://mock/', request: servicesMapping } }]),
    { action: 'services', provider_key: 'KEY' });
  // 6. checkBalance
  assert.deepEqual(await bodyOf('checkBalance', [{ ...provider, profile_config: { endpoint: 'http://mock/', request: balanceMapping } }]),
    { action: 'balance', provider_key: 'KEY' });

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

  // 9. every runtime value available in map (spot-check unknown source -> empty)
  const wide = { ...provider, profile_config: { endpoint: 'http://mock/', request: {
    a: 'service', b: 'target', c: 'quantity', d: 'provider_id', e: 'provider_key', f: 'provider_secret',
    g: 'custom_comments', h: 'username', i: 'service_id', j: 'refill_service_id', k: 'order_id',
    l: 'refill_id', m: 'key', n: 'start_count', o: 'remains', p: 'status', q: 'balance' } } };
  const got = await bodyOf('checkBalance', [wide, {}]);
  assert.equal(got.provider_key, 'KEY');
  assert.equal(got.provider_secret, 'SEC');
  assert.equal(got.provider_id, 'P1');
  assert.equal(got.key, 'KEY');
  for (const k of ['service', 'target', 'quantity', 'custom_comments', 'username', 'service_id', 'refill_service_id', 'order_id', 'refill_id', 'start_count', 'remains', 'status', 'balance']) assert.equal(got[k], '', `source ${k} unmapped -> ''`);

  // 10. order defaults: executeProviderOrder without config.request -> sensible default mapping
  const bare = { ...provider, order_config: { endpoint: 'http://mock/' } };
  const r = await api.executeProviderOrder(bare, order, { service });
  assert.equal(r.success, true);
  const b = await bodyOf('executeProviderOrder', [bare, order, { service }]);
  assert.equal(b.action, 'add');
  assert.ok('provider_key' in b || 'key' in b, 'default auth field present');

  console.log('PASS provider-mapping');
})().catch(e => { console.error(e); process.exitCode = 1; });
