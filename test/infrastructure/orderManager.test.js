import test from 'node:test';
import assert from 'node:assert/strict';

import { OrderManager } from '../../src/infrastructure/orders/OrderManager.js';
import { LIFECYCLE_STATES } from '../../src/domain/orderLifecycle.js';

// ─── Track orders ──────────────────────────────────────────────────

test('trackOrder: adds order with pending status', () => {
  const om = new OrderManager();
  om.trackOrder('order_1', {
    tokenID: 'tok_abc',
    side: 'BUY',
    price: 0.04,
    size: 100,
  });

  const orders = om.getPendingOrders();
  assert.equal(orders.length, 1);
  assert.equal(orders[0].orderId, 'order_1');
  assert.equal(orders[0].status, 'pending');
  assert.equal(orders[0].tokenID, 'tok_abc');
  assert.equal(orders[0].side, 'BUY');
  assert.equal(orders[0].price, 0.04);
  assert.equal(orders[0].size, 100);
});

test('trackOrder: ignores empty orderId', () => {
  const om = new OrderManager();
  om.trackOrder('', { tokenID: 'tok', side: 'BUY', price: 0.04, size: 100 });
  om.trackOrder(null, { tokenID: 'tok', side: 'BUY', price: 0.04, size: 100 });

  assert.equal(om.getPendingOrders().length, 0);
});

test('trackOrder: stores extra metadata', () => {
  const om = new OrderManager();
  om.trackOrder('order_2', {
    tokenID: 'tok_def',
    side: 'SELL',
    price: 0.95,
    size: 50,
    extra: { marketSlug: 'btc-up-or-down', reason: 'Take Profit' },
  });

  const order = om.getPendingOrders()[0];
  assert.equal(order.metadata.marketSlug, 'btc-up-or-down');
  assert.equal(order.metadata.reason, 'Take Profit');
});

// ─── Get orders ────────────────────────────────────────────────────

test('getPendingOrders: filters by status', () => {
  const om = new OrderManager();
  om.trackOrder('o1', { tokenID: 't', side: 'BUY', price: 0.05, size: 10 });
  om.trackOrder('o2', { tokenID: 't', side: 'BUY', price: 0.05, size: 10 });

  // Transition o1 to FILLED via lifecycle state machine (SUBMITTED → PENDING → FILLED)
  om.transitionOrder('o1', LIFECYCLE_STATES.PENDING);
  om.transitionOrder('o1', LIFECYCLE_STATES.FILLED);

  const pending = om.getPendingOrders({ status: 'pending' });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].orderId, 'o2');

  const filled = om.getPendingOrders({ status: 'filled' });
  assert.equal(filled.length, 1);
  assert.equal(filled[0].orderId, 'o1');
});

test('getPendingOrders: returns all when no filter', () => {
  const om = new OrderManager();
  om.trackOrder('o1', { tokenID: 't', side: 'BUY', price: 0.05, size: 10 });
  om.trackOrder('o2', { tokenID: 't', side: 'SELL', price: 0.95, size: 10 });

  const all = om.getPendingOrders();
  assert.equal(all.length, 2);
});

// ─── Snapshot ──────────────────────────────────────────────────────

test('getSnapshot: empty state', () => {
  const om = new OrderManager();
  const snap = om.getSnapshot();

  assert.equal(snap.total, 0);
  assert.equal(snap.pending, 0);
  assert.equal(snap.open, 0);
  assert.equal(snap.filled, 0);
  assert.equal(snap.cancelled, 0);
  assert.deepEqual(snap.orders, []);
});

test('getSnapshot: counts by status', () => {
  const om = new OrderManager();
  om.trackOrder('o1', { tokenID: 't', side: 'BUY', price: 0.05, size: 10 });
  om.trackOrder('o2', { tokenID: 't', side: 'BUY', price: 0.05, size: 10 });
  om.trackOrder('o3', { tokenID: 't', side: 'SELL', price: 0.95, size: 10 });

  // o1: SUBMITTED → PENDING → FILLED  (legacy status: 'filled')
  om.transitionOrder('o1', LIFECYCLE_STATES.PENDING);
  om.transitionOrder('o1', LIFECYCLE_STATES.FILLED);

  // o3: SUBMITTED → CANCELLED  (legacy status: 'cancelled')
  om.transitionOrder('o3', LIFECYCLE_STATES.CANCELLED);

  const snap = om.getSnapshot();
  assert.equal(snap.total, 3);
  assert.equal(snap.pending, 1); // o2
  assert.equal(snap.filled, 1);  // o1
  assert.equal(snap.cancelled, 1); // o3
});

// ─── Cancel (without client) ───────────────────────────────────────

test('cancelOrder: returns error without client', async () => {
  const om = new OrderManager();
  om._getClient = () => null; // Force no client for this test
  om.trackOrder('o1', { tokenID: 't', side: 'BUY', price: 0.05, size: 10 });

  const result = await om.cancelOrder('o1');
  assert.equal(result.cancelled, false);
  assert.ok(result.error);
});

test('cancelAllOrders: returns error without client', async () => {
  const om = new OrderManager();
  om._getClient = () => null; // Force no client for this test
  const result = await om.cancelAllOrders();
  assert.equal(result.cancelled, false);
  assert.ok(result.error);
});

// ─── Prune ─────────────────────────────────────────────────────────

test('pruneOldOrders: removes old terminal orders', () => {
  const om = new OrderManager();
  om.trackOrder('o1', { tokenID: 't', side: 'BUY', price: 0.05, size: 10 });
  om.trackOrder('o2', { tokenID: 't', side: 'BUY', price: 0.05, size: 10 });
  om.trackOrder('o3', { tokenID: 't', side: 'BUY', price: 0.05, size: 10 });

  // o1 = EXITED (terminal), old SUBMITTED timestamp
  om.transitionOrder('o1', LIFECYCLE_STATES.PENDING);
  om.transitionOrder('o1', LIFECYCLE_STATES.FILLED);
  om.transitionOrder('o1', LIFECYCLE_STATES.MONITORING);
  om.transitionOrder('o1', LIFECYCLE_STATES.EXITED);
  om._orders.get('o1').timestamps[LIFECYCLE_STATES.SUBMITTED] = Date.now() - 60 * 60_000; // 1 hour ago

  // o2 = CANCELLED (terminal), old SUBMITTED timestamp
  om.transitionOrder('o2', LIFECYCLE_STATES.CANCELLED);
  om._orders.get('o2').timestamps[LIFECYCLE_STATES.SUBMITTED] = Date.now() - 60 * 60_000;

  // o3 = SUBMITTED (not terminal, should not be pruned)

  om.pruneOldOrders(30 * 60_000); // 30 min cutoff

  assert.equal(om._orders.size, 1);
  assert.ok(om._orders.has('o3'));
});

test('pruneOldOrders: keeps recent terminal orders', () => {
  const om = new OrderManager();
  om.trackOrder('o1', { tokenID: 't', side: 'BUY', price: 0.05, size: 10 });

  // Transition to terminal state (EXITED)
  om.transitionOrder('o1', LIFECYCLE_STATES.PENDING);
  om.transitionOrder('o1', LIFECYCLE_STATES.FILLED);
  om.transitionOrder('o1', LIFECYCLE_STATES.MONITORING);
  om.transitionOrder('o1', LIFECYCLE_STATES.EXITED);
  // SUBMITTED timestamp is recent (just created), so should not be pruned

  om.pruneOldOrders(30 * 60_000);
  assert.equal(om._orders.size, 1); // Still there
});
