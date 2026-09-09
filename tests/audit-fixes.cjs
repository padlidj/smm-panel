// Run: node tests/audit-fixes.cjs [money|auth|roles|dispatch|inputs|templates|reseller|admin]
// Actual TS functions, isolated module loader: never loads Prisma, env, or network.
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
function dbMocks(db) { return { './prisma': { prisma: db }, '../lib/prisma': { prisma: db }, '@/lib/prisma': { prisma: db }, '../lib/notify': { notifyUser() {} }, '@/lib/notify': { notifyUser() {} } }; }
const tests = {};
tests.money = async () => {
  let balance = 100, refunded = false, logs = [], lock = Promise.resolve(), injectDebit = true;
  const order = { id: 1, user_id: 1, price: 20, profit: 5, remains: 0, quantity: 10, status: 'ERROR', is_refund: false };
  const tx = {
    user: {
      findUnique: async () => { const old = balance; if (injectDebit) { balance -= 10; injectDebit = false; } return { balance: old }; },
      update: async ({ data }) => { balance = data.balance; return { balance }; },
    },
    $executeRaw: async (sql, amount) => { balance += Number(amount); injectDebit = false; return 1; },
    balanceLog: { create: async ({ data }) => { logs.push(data); } },
    order: {
      update: async () => { refunded = true; },
      updateMany: async ({ where }) => { if (refunded || !['ERROR', 'PARTIAL'].includes(order.status)) return { count: 0 }; refunded = true; return { count: 1 }; },
    },
  };
  const db = { order: { findMany: async () => [order] }, $disconnect: async () => {}, $transaction: (fn) => {
    const result = lock.then(async () => { if (injectDebit) { balance -= 10; injectDebit = false; } return fn(tx); });
    lock = result.catch(() => {}); return result;
  } };
  const { main } = load('cron/refund.ts', dbMocks(db));
  await Promise.all([main(), main()]);
  assert.equal(balance, 110, 'duplicate refund must credit once without losing debit');
  assert.equal(logs.length, 1);
  assert.equal(logs[0].balance_before, 90);
  assert.equal(logs[0].balance_after, 110);
  const { debitGuard, creditBalance, creditGuard } = load('lib/balance.ts', dbMocks(db));
  for (const amount of [NaN, Infinity, -1]) {
    await assert.rejects(() => debitGuard(tx, 1, amount));
    await assert.rejects(() => creditBalance(1, amount, 'test'));
  }
  // creditGuard interleaving: a concurrent debit can race an unlocked pre-read
  // but must not overwrite the atomic credit's final balance.
  let balanceA = 50, preRead = true, afterCredit = false;
  const raceTx = {
    $executeRaw: async (sql, amount) => { balanceA += Number(amount); afterCredit = true; return 1; },
    user: {
      findUnique: async () => { const old = balanceA; if (preRead && !afterCredit) { balanceA -= 20; preRead = false; } return { balance: balanceA }; },
    },
  };
  const raceDb = { user: { findUnique: async () => ({ balance: 50 }) }, $transaction: (fn) => fn(raceTx) };
  const { creditGuard: raceCredit } = load('lib/balance.ts', dbMocks(raceDb));
  const { balanceBefore, balanceAfter } = await raceCredit(raceTx, 1, 30);
  // creditGuard reads AFTER the atomic update; balanceBefore derives from locked row, not a stale read.
  assert.equal(balanceBefore, 50);
  assert.equal(balanceAfter, 80);
  // assert that balanceLog values derive from the same atomic mutation, not a stale read
  // the above proved the guard computes after/before from the locked row; no separate pre-read.

  // Valid session happy paths: active user and valid admin session must pass.
  const userDb = { user: { findUnique: async () => ({ id: 1, status: 'ACTIVE', balance: 100 }) },
    admin: { findUnique: async () => ({ id: 1, status: true, level: 'ADMIN' }) } };
  const { authOptions: userAuth } = load('lib/auth.ts', dbMocks(userDb));
  const userToken = await userAuth.callbacks.jwt({ token: { id: '1', role: 'user', balance: 100 } });
  assert.equal(userToken.id, '1', 'active user token must carry id');
  assert.equal(userToken.balance, 100, 'active user token must carry balance');
  const adminToken = await userAuth.callbacks.jwt({ token: { id: '1', role: 'admin', level: 'SUPERADMIN' } });
  assert.equal(adminToken.level, 'ADMIN', 'valid admin token must carry level');

  const { getServerSession } = require('next-auth');
  const options = { ...userAuth, secret: 'isolated-test-only', logger: { error() {}, warn() {}, debug() {} }, jwt: {
    decode: async () => ({ id: '1', role: 'user', balance: 100 }), encode: async () => 'test-token',
  } };
  const session = await getServerSession({ headers: {}, cookies: { 'next-auth.session-token': 'fixture' } }, { getHeader() {}, setHeader() {} }, options);
  assert.ok(session && session.user, 'active user session must resolve');
  const adminOptions = { ...userAuth, secret: 'isolated-test-only', logger: { error() {}, warn() {}, debug() {} }, jwt: {
    decode: async () => ({ id: '1', role: 'admin', level: 'SUPERADMIN' }), encode: async () => 'test-token',
  } };
  const adminSession = await getServerSession({ headers: {}, cookies: { 'next-auth.session-token': 'fixture' } }, { getHeader() {}, setHeader() {} }, adminOptions);
  assert.ok(adminSession && adminSession.user, 'valid admin session must resolve');
};
tests.inputs = async () => {
  for (const route of ['order', 'order/bulk', 'reseller/order', 'order/refill', 'reseller/refill']) {
    for (const target of [undefined, null, {}, 123, '', '   ', [], '  valid-target  ']) {
      let debits = 0, created = [];
      const service = { id: 1, provider_id: 7, name: 'test', price: 1000, profit: 10, min: 1, max: 100, provider: { id: 7, name: 'MANUAL' } };
      const order = { id: 1, user_id: 1, provider_id: 7, status: 'SUCCESS', target, quantity: 10, price: 10, profit: 1 };
      const db = {
        service: { findFirst: async () => service }, customPrice: { findUnique: async () => null },
        serviceProvider: { findUnique: async () => service.provider },
        order: { findUnique: async () => order, findFirst: async () => order, create: async ({ data }) => { created.push(data); return { id: 2, ...data }; } },
        orderRefill: { create: async ({ data }) => { created.push(data); return { id: 2, ...data }; } },
        balanceLog: { create: async () => {} },
        $transaction: async (fn) => fn(db),
      };
      const mocks = { ...dbMocks(db), '@/lib/auth': {}, 'next-auth': { getServerSession: async () => ({ user: { id: '1', role: 'user' } }) },
        '@/lib/balance': { debitGuard: async () => { debits++; return { balanceBefore: 100, balanceAfter: 90 }; }, debitBalance: async () => { debits++; } },
        '@/lib/reseller': { getApiUser: async () => ({ id: 1 }), getApiParams: async req => req.json() },
      };
      const { POST } = load(`app/api/${route}/route.ts`, mocks);
      const response = await POST(new Request('http://test/', { method: 'POST', body: JSON.stringify({ service_id: 1, order_id: 1, quantity: 10, target, targets: [{ target, quantity: 10 }] }) }));
      const valid = target === '  valid-target  ';
      assert.equal(debits, valid ? 1 : 0, `${route}: invalid target must not debit: ${JSON.stringify(target)}`);
      if (valid) assert.equal(created[0].target, 'valid-target', `${route}: normalize target`);
      else assert.equal((await response.json()).status, false);
    }
  }
  // Refill: debit and create in same tx so failure rolls back the debit.
  for (const route of ['order/refill', 'reseller/refill']) {
    let debits = 0, created = [], txAborted = false;
    const order = { id: 1, user_id: 1, provider_id: 7, status: 'SUCCESS', target: 'valid', quantity: 10, price: 10, profit: 1 };
    const db = {
      order: { findUnique: async () => order, findFirst: async () => order },
      orderRefill: { create: async () => { throw Error('persist fail'); } },
      balanceLog: { create: async () => {} },
      $transaction: async (fn) => { try { return await fn(db); } catch (e) { txAborted = true; throw e; } },
    };
    const mocks = { ...dbMocks(db), '@/lib/auth': {}, 'next-auth': { getServerSession: async () => ({ user: { id: '1', role: 'user' } }) },
      '@/lib/balance': { debitGuard: async () => { debits++; return { balanceBefore: 100, balanceAfter: 90 }; } },
      '@/lib/reseller': { getApiUser: async () => ({ id: 1 }), getApiParams: async req => req.json() },
    };
    const { POST } = load(`app/api/${route}/route.ts`, mocks);
    const res = await POST(new Request('http://test/', { method: 'POST', body: JSON.stringify({ order_id: 1, quantity: 5 }) })).catch(e => ({ status: 500, json: async () => ({ status: false }) }));
    assert.equal(debits, 1, `${route}: debit attempted once`);
    assert.equal(txAborted, true, `${route}: tx aborted on create failure`);
    assert.equal(created.length, 0, `${route}: no refill created on failure`);
    assert.equal((await res.json()).status, false);
  }
};
tests.dispatch = async () => {
  const provider = { id: 7, name: 'fixture', provider_key: 'test-key', order_config: { endpoint: 'http://mock/', body: { key: '{api_key}', target: '{target}' } }, refill_config: { endpoint: 'http://mock/' } };
  for (const mode of ['concurrent', 'network', 'parse', 'missing', 'malformed', 'reject', 'persist', 'legacy', 'provider-mismatch']) {
    let calls = 0;
    const row = { id: 1, provider_id: 7, target: 'test', quantity: 10, status: 'PENDING', is_refund: false, provider_order_id: null, provider_order_log: mode === 'legacy' ? null : 'DISPATCH_READY' };
    const model = {
      updateMany: async ({ where, data }) => { if (Object.entries(where).some(([k, v]) => row[k] !== v)) return { count: 0 }; Object.assign(row, data); return { count: 1 }; },
      update: async ({ data }) => { if (mode === 'persist') throw Error('write failed'); Object.assign(row, data); },
    };
    const mocks = { ...dbMocks({ order: model }), fetch: async () => {
      calls++;
      if (mode === 'network') throw Error('accepted then disconnected');
      return { ok: true, json: async () => { if (mode === 'parse') throw Error('bad JSON'); return mode === 'missing' ? {} : mode === 'malformed' ? { order_id: {} } : mode === 'reject' ? { status: false, msg: 'Rejected' } : { order_id: 123 }; } };
    } };
    const { executeProviderOrder } = load('lib/provider.ts', mocks);
    const passedProvider = mode === 'provider-mismatch' ? { ...provider, id: 8 } : provider;
    const submit = () => executeProviderOrder(passedProvider, { ...row }, { service: { provider_id: 7 } });
    await Promise.all([submit(), submit()]);
    assert.equal(calls, ['legacy', 'provider-mismatch'].includes(mode) ? 0 : 1, mode + ': never send twice');
    if (['network', 'parse', 'missing', 'malformed', 'persist'].includes(mode)) {
      assert.equal(row.status, 'PENDING', mode + ': unknown outcome cannot refund');
      assert.notEqual(row.provider_order_log, null);
    }
    if (mode === 'reject') assert.equal(row.status, 'ERROR');
    if (mode === 'concurrent') assert.equal(row.provider_order_id, '123');
  }
  for (const mode of ['network', 'missing', 'reject', 'success']) {
    let calls = 0;
    const row = { id: 1, target: 'test', quantity: 10, status: 'PENDING', provider_refill_id: null, order: { provider_id: 7 } };
    const model = {
      updateMany: async ({ where, data }) => { if (Object.entries(where).some(([k, v]) => row[k] !== v)) return { count: 0 }; Object.assign(row, data); return { count: 1 }; },
      update: async ({ data }) => { Object.assign(row, data); },
    };
    const { executeProviderRefill } = load('lib/provider.ts', { ...dbMocks({ orderRefill: model }), fetch: async () => {
      calls++; if (mode === 'network') throw Error('timeout');
      return { ok: true, json: async () => mode === 'missing' ? {} : mode === 'reject' ? { error: 'Rejected' } : { refill_id: 123 } };
    } });
    await Promise.all([executeProviderRefill(provider, { ...row }), executeProviderRefill(provider, { ...row })]);
    assert.equal(calls, 1, 'refill claim');
    assert.equal(row.status, mode === 'reject' ? 'ERROR' : 'PROCESSING');
  }
  let submissions = 0;
  const { main } = load('cron/order-status.ts', { ...dbMocks({ order: { findMany: async () => [{ id: 1, service: { provider }, service_provider: provider }] }, $disconnect: async () => {} }),
    '../lib/provider': { executeProviderOrder: async () => { submissions++; }, checkProviderStatus: async () => null } });
  await main(); assert.equal(submissions, 0, 'cron must not replay ambiguous legacy orders');
};
tests.templates = async () => {
  const literal = "$&/$`/$'";
  const content = `{api_key}/{api_secret}/{provider_id}/{quantity}/{custom_comments}/{username}/${literal}`;
  const provider = { id: 7, provider_id: 'fake-provider', provider_key: `fake-key-{api_secret}-${literal}`, provider_secret: `fake-secret-${literal}` };
  const order = { id: 11, provider_id: 7, target: content, quantity: 10, custom_comments: `comments-${content}`, username: `user-${content}`, provider_order_id: `upstream-{api_key}-${literal}` };
  const service = { provider_id: 7, provider_service_id: 'service-{target}', refill_provider_service_id: 'refill-service-{api_key}' };
  const refill = { id: 12, target: content, quantity: 5, provider_refill_id: 'refill-{api_key}', order: { ...order, service } };
  const auth = { provider_id: provider.provider_id, api_key: provider.provider_key, api_secret: provider.provider_secret };
  const cases = [
    ['executeProviderOrder', 'order_config', [order, { service }], { service_id: service.provider_service_id, target: order.target, quantity: '10', custom_comments: order.custom_comments, username: order.username, order_id: '11', ...auth }],
    ['executeProviderRefill', 'refill_config', [refill], { service_id: service.provider_service_id, refill_service_id: service.refill_provider_service_id, target: refill.target, quantity: '5', order_id: order.provider_order_id, refill_id: '12', ...auth }],
    ['checkProviderStatus', 'status_config', [order], { order_id: order.provider_order_id, ...auth, key: provider.provider_key }],
    ['checkRefillStatus', 'refill_status_config', [refill], { refill_id: refill.provider_refill_id, order_id: order.provider_order_id, ...auth, key: provider.provider_key }],
    ['syncProviderServices', 'service_config', [], auth],
  ];
  const names = ['service_id', 'refill_service_id', 'target', 'quantity', 'custom_comments', 'username', 'order_id', 'refill_id', 'provider_id', 'api_key', 'api_secret', 'key', 'unknown', 'constructor'];
  const failures = [];
  for (const [fn, configName, args, values] of cases) {
    for (const contentType of ['application/json', 'application/x-www-form-urlencoded', undefined]) {
      const body = Object.fromEntries(names.map(name => [name, `{${name}}`]));
      const expected = Object.fromEntries(names.map(name => [name, Object.hasOwn(values, name) ? values[name] : `{${name}}`]));
      body.mixed = 'prefix {api_key} / {api_secret} / {api_key} suffix';
      expected.mixed = `prefix ${provider.provider_key} / ${provider.provider_secret} / ${provider.provider_key} suffix`;
      body.nested = [null, 0, false, { text: '{target}', comments: '{custom_comments}', username: '{username}' }];
      expected.nested = [null, 0, false, { text: values.target ?? '{target}', comments: values.custom_comments ?? '{custom_comments}', username: values.username ?? '{username}' }];
      const snapshot = JSON.stringify(body);
      const config = { endpoint: 'http://mock/', body, content_type: contentType, headers: { Authorization: '{api_key}/{api_secret}', 'X-Unknown': '{provider_id}/{key}/{target}' } };
      let request, calls = 0;
      const model = { updateMany: async () => ({ count: 1 }), update: async () => {} };
      const db = { order: model, orderRefill: model, serviceCategory: { findFirst: async () => ({ id: 1, name: 'fixture' }) } };
      const api = load('lib/provider.ts', { ...dbMocks(db), fetch: async (url, init) => {
        calls++; request = { url, ...init };
        return { ok: true, json: async () => ({ order_id: 123, refill_id: 456, status: 'Pending', data: [] }) };
      } });
      const result = await api[fn]({ ...provider, [configName]: config }, ...args);
      const label = `${fn} ${contentType || 'default'}`;
      try {
        assert.ok(result, label);
        if (fn.startsWith('execute')) assert.equal(result.success, true, label);
        assert.equal(calls, 1, label);
        assert.equal(request.url, 'http://mock/');
        assert.equal(request.method, 'POST');
        const form = contentType === 'application/x-www-form-urlencoded' || (!contentType && !fn.startsWith('execute'));
        assert.equal(request.headers['Content-Type'], form ? 'application/x-www-form-urlencoded' : 'application/json');
        const actual = form ? Object.fromEntries(new URLSearchParams(request.body)) : JSON.parse(request.body);
        const wanted = form ? Object.fromEntries(Object.entries(expected).map(([k, v]) => [k, String(v)])) : expected;
        assert.deepEqual(actual, wanted, `${label}: inserted values must stay literal`);
        assert.equal(request.headers.Authorization, `${provider.provider_key}/${provider.provider_secret}`, `${label}: auth headers must stay literal`);
        assert.equal(request.headers['X-Unknown'], '{provider_id}/{key}/{target}');
        assert.equal(JSON.stringify(body), snapshot, 'template must not mutate');
      } catch (error) { failures.push(error.message.split('\n')[0]); }
    }
  }
  assert.equal(failures.length, 0, failures.join('\n'));
};
tests.reseller = async () => {
  let queries = [];
  const db = { user: { findFirst: async ({ where }) => (where.api_key === 'fake-reseller-key' ? { id: 9, status: 'ACTIVE', api_whitelist_ips: null } : null) },
    orderRefill: { findFirst: async ({ where }) => { queries.push(where); return { id: where.id, status: 'PENDING' }; } } };
  const { POST } = load('app/api/reseller/refill_status/route.ts', dbMocks(db));
  const bodies = [
    ['json', { 'Content-Type': 'application/json' }, JSON.stringify({ api_key: 'fake-reseller-key', id: 456 })],
    ['form', { 'Content-Type': 'application/x-www-form-urlencoded' }, new URLSearchParams({ api_key: 'fake-reseller-key', id: '456' }).toString()],
  ];
  const results = [];
  for (const [label, headers, body] of bodies) {
    queries = [];
    const response = await POST(new Request('http://test/api/reseller/refill_status', { method: 'POST', headers, body }));
    results.push({ label, status: response.status, body: await response.json(), queries: JSON.parse(JSON.stringify(queries)) });
  }
  assert.deepEqual(results, bodies.map(([label]) => ({ label, status: 200, body: { status: true, data: { status: 'PENDING' } }, queries: [{ id: 456, user_id: 9 }] })), 'JSON and form must reuse parsed auth body for refill ID');
  const response = await POST(new Request('http://test/api/reseller/refill_status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: 'wrong-key', id: 456 }) }));
  assert.equal(response.status, 403, 'invalid body key must stay rejected');
};
tests.admin = async () => {
  let transactions = 0, events = [], logs = [], storedBalance = 25;
  const tx = {
    $queryRaw: async (sql, id) => { assert.match(sql.join('?'), /SELECT balance FROM users WHERE id = \? FOR UPDATE/); events.push('lock'); return [{ balance: storedBalance }]; },
    user: { update: async ({ where, data }) => { assert.equal(events[0], 'lock'); events.push('update'); storedBalance = data.balance; return { id: where.id, ...data }; } },
    balanceLog: { create: async ({ data }) => { events.push('log'); logs.push(data); } },
  };
  const db = { $transaction: async (fn) => { transactions++; return fn(tx); } };
  const { POST } = load('app/api/admin/user/route.ts', { ...dbMocks(db), '@/lib/auth': {}, 'next-auth': { getServerSession: async () => ({ user: { id: '9', role: 'admin' } }) } });
  const send = body => POST(new Request('http://test/api/admin/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  const failures = [];
  for (const field of ['id', 'balance']) {
    const invalid = [null, false, true, '', ' \t\n ', [], [0], [1], {}, undefined, 'abc', '1x', 'Infinity', -1, 1.5, Number.MAX_SAFE_INTEGER + 1, ...(field === 'id' ? [0, '0'] : [])];
    for (const value of invalid) {
      transactions = 0; events = [];
      const response = await send({ id: 1, balance: 0, [field]: value });
      if (response.status !== 400 || transactions !== 0) failures.push(`${field}=${JSON.stringify(value)}: HTTP ${response.status}, transactions=${transactions}`);
    }
  }
  assert.equal(failures.length, 0, 'invalid inputs must reject before transaction:\n' + failures.join('\n'));
  for (const [id, balance] of [[1, 0], ['1', '0'], [' 1 ', ' 0 '], [2, 50], [Number.MAX_SAFE_INTEGER, '25']]) {
    transactions = 0; events = []; logs = []; storedBalance = 25;
    const response = await send({ id, balance });
    assert.equal(response.status, 200, 'numeric strings/numbers including zero must succeed');
    assert.equal(transactions, 1);
    assert.equal((await response.json()).user.id, Number(id));
    assert.equal(storedBalance, Number(balance));
    const delta = Number(balance) - 25;
    assert.deepEqual(events, delta ? ['lock', 'update', 'log'] : ['lock', 'update']);
    assert.equal(logs.length, delta ? 1 : 0);
    if (delta) {
      const log = logs[0];
      assert.equal(log.user_id, Number(id));
      assert.equal(log.action, 'admin_adjust');
      assert.equal(log.type, delta > 0 ? 'PLUS' : 'MINUS');
      assert.equal(log.amount, Math.abs(delta));
      assert.equal(log.balance_before, 25);
      assert.equal(log.balance_after, Number(balance));
    }
  }
};
const userRoutes = ['order', 'order/bulk', 'order/refill', 'deposit', 'ticket', 'ticket/[id]/reply', 'account/password', 'account/profile', 'account/settings', 'service/favorite', 'balance'];
tests.roles = async () => {
  for (const route of userRoutes) {
    const mocks = { ...dbMocks({}), 'crypto': require('node:crypto'), '@/lib/auth': {}, '@/lib/provider': {}, '@/lib/midtrans': {},
      'next-auth': { getServerSession: async () => ({ user: { id: '1', role: 'admin', level: 'SUPERADMIN' } }) } };
    const handlers = load(`app/api/${route}/route.ts`, mocks);
    for (const [method, handler] of Object.entries(handlers)) {
      let response;
      try { response = await handler(new Request('http://test/', { method }), { params: { id: '1' } }); } catch {}
      assert.equal(response?.status, 401, `${method} ${route} must reject colliding admin ID before DB/body access`);
    }
  }
};
tests.auth = async () => {
  let account = { id: 1, status: 'ACTIVE', balance: 90 }, admin = { id: 1, status: true, level: 'ADMIN' };
  const db = { user: { findUnique: async () => account }, admin: { findUnique: async () => admin } };
  const { authOptions } = load('lib/auth.ts', dbMocks(db));
  const callbacks = authOptions.callbacks;
  let token = await callbacks.jwt({ token: { id: '1', role: 'admin', level: 'SUPERADMIN' } });
  assert.equal(token.level, 'ADMIN', 'demotion must refresh existing JWT');
  for (const status of ['BANNED', 'UNVERIFIED', null]) {
    account = status ? { id: 1, status } : null;
    token = await callbacks.jwt({ token: { id: '1', role: 'user', level: 'SUPERADMIN', balance: 100 } });
    for (const key of ['id', 'role', 'level', 'balance']) assert.equal(token[key], undefined);
    const session = await callbacks.session({ session: { user: { name: 'old' } }, token });
    assert.equal(Object.keys(session || {}).length, 0);
  }
  const { getServerSession } = require('next-auth');
  const options = { ...authOptions, secret: 'isolated-test-only', logger: { error() {}, warn() {}, debug() {} }, jwt: {
    decode: async () => ({ id: '1', role: 'admin', level: 'SUPERADMIN' }), encode: async () => 'test-token',
  } };
  for (const value of [null, { id: 1, status: false, level: 'SUPERADMIN' }]) {
    admin = value;
    const session = await getServerSession({ headers: {}, cookies: { 'next-auth.session-token': 'fixture' } }, { getHeader() {}, setHeader() {} }, options);
    assert.equal(session, null, 'installed NextAuth must reject revoked session');
  }
  db.admin.findUnique = async () => { throw Error('DB unavailable'); };
  token = await callbacks.jwt({ token: { id: '1', role: 'admin', level: 'SUPERADMIN' } });
  assert.equal(token.role, undefined, 'DB failure must fail closed');
};
(async () => {
  const selected = process.argv[2] ? [process.argv[2]] : Object.keys(tests);
  for (const name of selected) { await tests[name](); console.log('PASS ' + name); }
  console.log(`${selected.length} audit groups passed`);
})().catch(e => { console.error(e); process.exitCode = 1; });
