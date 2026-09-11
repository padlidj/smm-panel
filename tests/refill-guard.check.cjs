// Runnable check for lib/refill.ts refillGuard branches (stub prisma, no DB)
const assert = require('assert');

function stubPrisma({ order, refills = [] }) {
  return {
    order: { findUnique: async () => order },
    orderRefill: { findFirst: async ({ where }) => refills.find(r => r.order_id === where.order_id && r.status === where.status) || null },
  };
}
const DAY = 86400_000;
const mkOrder = (over = {}) => ({
  id: 1, user_id: 7, status: 'SUCCESS', created_at: new Date(Date.now() - 5 * DAY),
  service: { is_refill_support: true }, service_provider: { name: 'MP', is_refill_support: true }, ...over,
});

(async () => {
  const g = require('./build-refill-guard.cjs'); // compiled from lib/refill.ts
  // --- branches (mirror of lib/refill.ts logic under test via same source) ---
  let r = await g.refillGuard(stubPrisma({ order: mkOrder() }), 1, 7);
  assert.equal(r.ok, true);

  r = await g.refillGuard(stubPrisma({ order: null }), 1, 7);
  assert.equal(r.message, 'Pesanan tidak ditemukan.');
  r = await g.refillGuard(stubPrisma({ order: mkOrder() }), 1, 999);
  assert.equal(r.message, 'Pesanan tidak ditemukan.');

  r = await g.refillGuard(stubPrisma({ order: mkOrder({ service: { is_refill_support: false } }) }), 1, 7);
  assert.equal(r.ok, false);
  r = await g.refillGuard(stubPrisma({ order: mkOrder({ service_provider: { name: 'MP', is_refill_support: false } }) }), 1, 7);
  assert.equal(r.ok, false);
  r = await g.refillGuard(stubPrisma({ order: mkOrder({ status: 'PENDING' }) }), 1, 7);
  assert.equal(r.ok, false);
  r = await g.refillGuard(stubPrisma({ order: mkOrder({ created_at: new Date(Date.now() - 31 * DAY) }) }), 1, 7);
  assert.match(r.message, /30 hari/);
  r = await g.refillGuard(stubPrisma({ order: mkOrder(), refills: [{ order_id: 1, status: 'PENDING' }] }), 1, 7);
  assert.match(r.message, /Pending/);
  console.log('refillGuard OK');
})().catch(e => { console.error(e.message); process.exit(1); });
