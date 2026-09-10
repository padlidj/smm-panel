// Runnable check for hof date-range parsing (mirrors app/admin/page/hof/page.tsx rangeFrom)
const assert = require('assert');
const rangeFrom = (s, e) => {
  const now = new Date();
  const d = (v, fallback, end = false) => {
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + (end ? 'T23:59:59' : 'T00:00:00'));
    return fallback;
  };
  const defStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start: d(s, defStart), end: d(e, defEnd, true) };
};

const a = rangeFrom('2026-01-05', '2026-02-09');
assert(a.start.getFullYear() === 2026 && a.start.getMonth() === 0 && a.start.getDate() === 5);
assert(a.end.getDate() === 9 && a.end.getHours() === 23);
const b = rangeFrom('garbage', '');
const now = new Date();
assert(b.start.getMonth() === new Date(now.getFullYear(), now.getMonth(), 1).getMonth()); // falls back to month start
assert(b.end.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()); // month end
assert(b.end.getHours() === 23);
console.log('hof rangeFrom OK');
