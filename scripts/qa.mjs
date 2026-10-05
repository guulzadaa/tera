// Run with: node scripts/qa.mjs. Uses isolated in-memory storage, never browser data.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const cache = new Map();
function load(relative) {
  const file = path.resolve(relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', 'module', code)(id => load(path.resolve(path.dirname(file), `${id}.ts`)), module.exports, module);
  return module.exports;
}
const { posOrders, posMenu } = load('src/data/mock.ts');
const { initialPayments } = load('src/data/paymentMock.ts');
const { initialInventory } = load('src/data/inventoryMock.ts');
const { splitPayment } = load('src/data/paymentModel.ts');
const { buildAnalytics, dayOffset } = load('src/data/analyticsModel.ts');
const { createAnalyticsHistory } = load('src/data/analyticsMock.ts');
const { calculateForecast } = load('src/utils/forecasting.ts');
let raw = null;
globalThis.localStorage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
const storageCases = [
  [load('src/data/orderStorage.ts'), 'loadOrders', 'persistOrders', { orders: posOrders, drafts: {} }],
  [load('src/data/menuStorage.ts'), 'loadMenu', 'persistMenu', posMenu.map(item => ({ ...item, available: true }))],
  [load('src/data/inventoryStorage.ts'), 'loadInventory', 'persistInventory', initialInventory],
  [load('src/data/paymentStorage.ts'), 'loadPayments', 'persistPayments', initialPayments],
];
for (const [module, read, write, valid] of storageCases) {
  for (const malformed of [null, '{', 'null', '42', '"invalid"', '{}', '[null]']) { raw = malformed; assert.equal(module[read](), null, `${read}: ${malformed}`); }
  assert.equal(module[write](valid), true); assert.deepEqual(module[read](), valid);
  globalThis.localStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  assert.equal(module[read](), null); assert.equal(module[write](valid), false);
  globalThis.localStorage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
}
for (const total of [0, 1, 27830, 39050]) for (const count of [1, 2, 3, 4]) {
  const shares = splitPayment(total, count); assert.equal(shares.reduce((sum, value) => sum + value, 0), total); assert.ok(Math.max(...shares) - Math.min(...shares) <= 1);
}
const today = '2026-10-04';
const history = createAnalyticsHistory(today);
const payments = initialPayments.map((payment, i) => ({ ...payment, paidAt: `${today}T12:00:00Z`, status: i ? 'Refunded' : 'Paid' }));
const orders = posOrders.map(order => ({ ...order, createdAt: `${today}T11:00:00Z` }));
const live = buildAnalytics(1, history, orders, payments, today);
assert.equal(live.totals.revenue, payments[0].total);
assert.equal(live.totals.average, payments[0].total);
assert.equal(live.categories.reduce((sum, category) => sum + category.revenue, 0), payments[0].subtotal);
assert.equal(live.methods.reduce((sum, method) => sum + method.revenue, 0), live.totals.revenue);
assert.equal(live.hours.reduce((sum, hour) => sum + hour.orders, 0), live.totals.orders);
assert.equal(buildAnalytics(1, history, [], [], today).totals.average, 0);
assert.equal(dayOffset('2026-01-01', -1), '2025-12-31');
const before = JSON.stringify({ history, inventory: initialInventory.items });
const forecasts = [7, 14, 30].map(horizon => calculateForecast(history, initialInventory.items, today, horizon));
assert.ok(forecasts[1].predictedOrders > forecasts[0].predictedOrders && forecasts[2].predictedOrders > forecasts[1].predictedOrders);
for (const forecast of forecasts) {
  assert.equal(forecast.predictedOrders, forecast.days.reduce((sum, day) => sum + day.orders, 0));
  assert.equal(forecast.revenue, forecast.days.reduce((sum, day) => sum + day.revenue, 0));
  assert.ok(forecast.days.every(day => day.date > today && day.lower <= day.orders && day.upper >= day.orders));
}
const stocked = calculateForecast(history, initialInventory.items.map(item => ({ ...item, currentStock: 99999 })), today, 7);
assert.ok(stocked.recommendations.every(item => item.action === 'Stock sufficient' && item.purchase === 0));
assert.deepEqual(stocked.days, forecasts[0].days);
assert.equal(JSON.stringify({ history, inventory: initialInventory.items }), before);
console.log('PASS: storage fallbacks/round trips, split rounding, refund-aware analytics, date boundaries, forecast horizons, live-stock recommendations, input preservation.');
