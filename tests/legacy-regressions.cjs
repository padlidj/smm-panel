// Run: node tests/legacy-regressions.cjs
// Legacy regressions - TDD cycle for three critical bugs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const tests = {};
function load(file, mocks = {}, cache = {}) {
  const full = path.resolve(root, file);
  if (cache[full]) return cache[full].exports;
  let source = fs.readFileSync(full, 'utf8');
  if (file.startsWith('cron/')) source = source.replace(/^main\(\)\.catch.*;$/m, 'export { main };');
  const module = { exports: {} }; cache[full] = module;
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('/prisma') || name === './prisma') throw Error('Unmocked DB');
    if (name.startsWith('@/') || name.startsWith('.')) {
      const target = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(full), name);
      return load(path.relative(root, target) + '.ts', mocks, cache);
    }
    if (['lodash.get', 'next/server', 'next-auth/providers/credentials', 'bcryptjs'].includes(name)) return require(name);
    throw Error('Unmocked import: ' + name);
  };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire, console: { log() {}, error() {} }, process: { env: {} }, fetch: mocks.fetch || (() => { throw Error('Network forbidden'); }), URL, URLSearchParams, Date, Request, Response }, { filename: full });
  return module.exports;
}
function dbMocks(db) {
  return { './prisma': { prisma: db }, '../lib/prisma': { prisma: db }, '@/lib/prisma': { prisma: db }, '../lib/notify': { notifyUser() {} }, '@/lib/notify': { notifyUser() {} } };
}

/* ===========================================================================
   REGRESSION 1: cron/refund.ts PARTIAL remains=0 bug
   Bug: amountRefund defaults to full price when remains=0, but 0 means fully consumed → refund 0
   Fix: initial value/logic so remains=0 → 0 refund, remains>0 && <=quantity → proportional, ERROR/invalid → full refund
   Test with mock prisma + creditGuard
   ========================================================================== */
tests.refundZeroRemains = async () => {
  // Test case: PARTIAL order with remains=0 should refund 0, not full price
  const orderPartialZeroRemains = { id: 1, user_id: 1, price: 5000, profit: 500, remains: 0, quantity: 10, status: 'PARTIAL', is_refund: false };
  
  let creditedAmount = null;
  let balanceLogs = [];
  let refundSet = false;
  
  const tx = {
    order: {
      updateMany: async ({ where }) => {
        if (!['ERROR', 'PARTIAL'].includes(orderPartialZeroRemains.status)) return { count: 0 };
        refundSet = true;
        return { count: 1 };
      },
      update: async () => {},
    },
    balanceLog: { create: async ({ data }) => { balanceLogs.push(data); } },
  };
  
  const db = {
    order: { 
      findFirst: async () => ({ id: 1 }),
      findMany: async () => [orderPartialZeroRemains] 
    },
    $disconnect: async () => {},
    $transaction: async (fn) => await fn(tx),
  };
  
  // Spy on creditGuard to capture the amount passed
  const mockCreditGuard = async (tx, userId, amount) => {
    creditedAmount = amount;
    return { balanceBefore: 10000, balanceAfter: 10000 + amount };
  };
  
  const { main } = load('cron/refund.ts', { ...dbMocks(db), '../lib/balance': { creditGuard: mockCreditGuard } });
  await main();
  
  assert.equal(creditedAmount, 0, 'remains=0 must refund 0, not full price');
  assert.equal(balanceLogs.length, 1, 'must create exactly one balance log');
  assert.equal(balanceLogs[0].amount, 0, 'balance log amount must be 0');
  assert.ok(refundSet, 'refund must be claimed');
};

/* ===========================================================================
   REGRESSION 2: cron/order-status.ts batch starvation
   Bug: take:150 oldest-first leaves newest unprocessed when backlog>150
   Fix: bounded keyset pagination by ascending id per run with fixed upper-id snapshot,
   advancing cursor even on provider failure/invalid row; isolate row failures so next rows proceed
   Test mock with >150 rows
   ========================================================================== */
tests.orderStatusBatchStarvation = async () => {
  // Create 250 orders: 200 eligible (non-MANUAL with provider_order_id), 50 MANUAL
  // With take:150, only 150 would be fetched → last 50 eligible starved
  // After fix using bounded snapshot pagination, all eligible should eventually be processed
  
  const orders = [];
  for (let i = 1; i <= 250; i++) {
    const isManual = i > 200; // last 50 are MANUAL
    orders.push({
      id: i,
      service_provider: { name: isManual ? 'MANUAL' : 'API_PROVIDER' },
      provider_order_id: isManual ? null : 'EXT-' + i,
      status: 'PENDING',
    });
  }
  
  let processedCount = 0;
  const processedIds = [];
  
  const mockCheckProviderStatus = async (provider, order) => {
    processedCount++;
    processedIds.push(order.id);
    return { status: 'SUCCESS', remains: 0, start_count: 0, raw: {} };
  };
  
  const db = {
    order: {
      findFirst: async (opts) => {
        // Return max eligible ID
        const eligible = orders.filter(o => 
          o.provider_order_id !== null && o.service_provider.name !== 'MANUAL'
        );
        const max = eligible.reduce((m, o) => o.id > m ? o.id : m, 0);
        return { id: max };
      },
      findMany: async (opts) => {
        const where = opts?.where || {};
        const idFilter = where.id || {};
        const gt = idFilter.gt || 0;
        const lte = idFilter.lte || Infinity;
        const filtered = orders.filter(o => 
          (where.status?.in || ['PENDING', 'PROCESSING']).includes(o.status) && 
          o.provider_order_id !== null &&
          o.service_provider.name !== 'MANUAL' &&
          o.id > gt && o.id <= lte
        );
        // Sort by id (asc or desc)
        const orderBy = opts?.orderBy?.id;
        const sorted = orderBy === 'desc' ? filtered.sort((a, b) => b.id - a.id) : filtered;
        const take = opts?.take;
        const result = take ? sorted.slice(0, take) : sorted;
        // Include service_provider if requested
        if (opts?.include?.service_provider) {
          return result.map(o => ({ ...o, service_provider: o.service_provider }));
        }
        return result;
      },
      update: async () => {},
    },
    $disconnect: async () => {},
  };
  
  const { main } = load('cron/order-status.ts', { ...dbMocks(db), '../lib/provider': { checkProviderStatus: mockCheckProviderStatus } });
  await main();
  
  // All 200 eligible orders (1-200) should be processed, not just first 150
  assert.equal(processedCount, 200, 'all 200 eligible orders must be processed (not limited to 150)');
  assert.ok(processedIds.includes(200), 'last eligible order must be processed, not starved');
};

/* ===========================================================================
   REGRESSION 3: app/api/reseller/refill/route.ts never dispatches to provider
   Bug: creates refill but doesn't auto-submit like dashboard route does
   Fix: add same provider dispatch logic - lookup provider, if non-MANUAL with refill_config endpoint, call executeProviderRefill
   Test route with mock prisma/provider and assert dispatch called for auto provider, skipped for MANUAL
   ========================================================================== */
tests.resellerRefillDispatch = async () => {
  let refillCreated = false;
  let dispatchCalled = false;
  
  const apiUser = { id: 9, status: 'ACTIVE', api_whitelist_ips: null };
  const originalOrder = { id: 1, user_id: 9, provider_id: 1, status: 'SUCCESS', target: 'https://example.com', quantity: 10, price: 1000, profit: 100 };
  const manualProvider = { id: 1, name: 'MANUAL', refill_config: null };
  const autoProvider = { id: 2, name: 'AUTO_API', provider_key: 'key', refill_config: { endpoint: 'http://api.example/refill' } };
  
  const orderWithManualProvider = { ...originalOrder, provider_id: 1 };
  const orderWithAutoProvider = { ...originalOrder, provider_id: 2 };
  
  const dbAuto = {
    order: { findFirst: async ({ where }) => where.id === 1 ? orderWithAutoProvider : null },
    orderRefill: { 
      create: async ({ data }) => { refillCreated = true; return { id: 999, ...data, order: orderWithAutoProvider }; },
      findUnique: async ({ where }) => where.id === 999 ? { id: 999, order: orderWithAutoProvider, target: 'https://example.com', quantity: 5 } : null,
    },
    serviceProvider: { findUnique: async ({ where }) => where.id === 2 ? autoProvider : null },
    balanceLog: { create: async () => {} },
    $transaction: async (fn) => await fn(dbAuto),
  };
  
  const dbManual = {
    order: { findFirst: async ({ where }) => where.id === 1 ? orderWithManualProvider : null },
    orderRefill: { 
      create: async ({ data }) => { refillCreated = true; return { id: 998, ...data, order: orderWithManualProvider }; },
      findUnique: async ({ where }) => where.id === 998 ? { id: 998, order: orderWithManualProvider, target: 'https://example.com', quantity: 5 } : null,
    },
    serviceProvider: { findUnique: async ({ where }) => where.id === 1 ? manualProvider : null },
    balanceLog: { create: async () => {} },
    $transaction: async (fn) => await fn(dbManual),
  };
  
  const mocksAuto = {
    ...dbMocks(dbAuto),
    '@/lib/auth': {},
    'next-auth': { getServerSession: async () => ({ user: { id: '9', role: 'user' } }) },
    '@/lib/reseller': { getApiUser: async () => apiUser, getApiParams: async () => ({ api_key: 'fake-reseller-key', order_id: 1, quantity: 5 }) },
    '@/lib/balance': { debitGuard: async () => ({ balanceBefore: 10000, balanceAfter: 9000 }) },
    '@/lib/provider': { executeProviderRefill: async (provider, refill) => { dispatchCalled = true; return { success: true }; } },
  };
  
  const mocksManual = {
    ...dbMocks(dbManual),
    '@/lib/auth': {},
    'next-auth': { getServerSession: async () => ({ user: { id: '9', role: 'user' } }) },
    '@/lib/reseller': { getApiUser: async () => apiUser, getApiParams: async () => ({ api_key: 'fake-reseller-key', order_id: 1, quantity: 5 }) },
    '@/lib/balance': { debitGuard: async () => ({ balanceBefore: 10000, balanceAfter: 9000 }) },
    '@/lib/provider': { executeProviderRefill: async (provider, refill) => { dispatchCalled = true; return { success: true }; } },
  };
  
  // Reset state
  refillCreated = false;
  dispatchCalled = false;
  
  const { POST: postAuto } = load('app/api/reseller/refill/route.ts', mocksAuto);
  const resAuto = await postAuto(new Request('http://test/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: 'fake-reseller-key', order_id: 1, quantity: 5 }),
  }));
  
  const resAutoJson = await resAuto.json();
  assert.equal(resAutoJson.status, true, 'auto provider refill must succeed');
  assert.ok(resAutoJson.data?.id, 'auto provider refill must return refill id');
  assert.ok(refillCreated, 'refill must be created for auto provider');
  assert.ok(dispatchCalled, 'dispatch must be called for auto provider');
  
  // Reset for manual test
  refillCreated = false;
  dispatchCalled = false;
  
  const { POST: postManual } = load('app/api/reseller/refill/route.ts', mocksManual);
  const resManual = await postManual(new Request('http://test/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: 'fake-reseller-key', order_id: 1, quantity: 5 }),
  }));
  
  const resManualJson = await resManual.json();
  assert.equal(resManualJson.status, true, 'manual provider refill must succeed');
  assert.ok(refillCreated, 'refill must be created for manual provider');
  assert.equal(dispatchCalled, false, 'dispatch must NOT be called for MANUAL provider');
};

// Run all regression tests
(async () => {
  try {
    await tests.refundZeroRemains();
    console.log('PASS refundZeroRemains');
    
    await tests.orderStatusBatchStarvation();
    console.log('PASS orderStatusBatchStarvation');
    
    await tests.resellerRefillDispatch();
    console.log('PASS resellerRefillDispatch');
    
    console.log('All 3 legacy regression tests passed');
    process.exitCode = 0;
  } catch (e) {
    console.error('FAIL:', e.message);
    console.error(e.stack);
    process.exitCode = 1;
  }
})();
