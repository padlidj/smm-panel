// Runnable check for account settings parity logic:
// 1) notification merge is opt-in + preserves unknown keys (Laravel setNotification)
// 2) whitelist IP validation rejects bad input (Laravel postSettingsWhitelistIP)
const assert = require('assert');

// --- mirrors app/api/account/settings/route.ts ---
const mergeNotif = (cur, incoming) => {
  const merged = { ...(cur || {}) };
  for (const k of ['order', 'deposit', 'ticket']) {
    if (incoming[k] === undefined) continue;
    merged[k] = incoming[k] === '1' ? '1' : '0';
  }
  return merged;
};
const isIp = (s) => /^(\d{1,3}\.){3}\d{1,3}$/.test(s) ? s.split('.').every(o => Number(o) <= 255) : /^[0-9a-f:]+$/i.test(s) && s.includes(':');
const parseWhitelist = (raw) => {
  const items = String(raw).trim().split(',').map(s => s.trim()).filter(Boolean);
  return items.find(s => !isIp(s));
};

// merge: unknown key survives, toggles whitelisted to '0'/'1'
assert.deepStrictEqual(mergeNotif({ order: '1', deposit: '1', ticket: '1' }, { ticket: '0' }),
  { order: '1', deposit: '1', ticket: '0' });
assert.deepStrictEqual(mergeNotif({ order: '1', custom: 'x' }, { deposit: '1' }),
  { order: '1', custom: 'x', deposit: '1' });
// opt-in semantics: legacy object missing a key must NOT read as enabled
assert.strictEqual((mergeNotif({ order: '1' }, {})).ticket, undefined);
// non-'1' values normalize to '0' (Laravel in_array ['0','1'])
assert.strictEqual(mergeNotif({}, { order: 'yes' }).order, '0');

// whitelist validation
assert.strictEqual(parseWhitelist('43.129.57.93, 192.168.1.1'), undefined);
assert.strictEqual(parseWhitelist(''), undefined);
assert.strictEqual(parseWhitelist('43.129.57.93'), undefined);
assert.strictEqual(parseWhitelist('999.1.1.1'), '999.1.1.1');   // out-of-range octet
assert.strictEqual(parseWhitelist('not-an-ip'), 'not-an-ip');
assert.strictEqual(parseWhitelist('10.0.0.1, garbage'), 'garbage');

console.log('account-settings parity OK');
