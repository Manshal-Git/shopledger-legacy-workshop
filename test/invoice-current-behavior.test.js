var test = require('node:test');
var assert = require('node:assert/strict');
var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');

test('invoice uses the same HSN GST slab and total as order pricing', function () {
  var items = [{ id: 1, name: 'Rice', sku: 'RICE', hsn: '1006', price: 100, qty: 1 }];
  var billed = pricing.computeTotals(items, '');
  var invoiced = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.deepEqual(
    {
      subtotal: invoiced.subtotal,
      tax: invoiced.tax,
      cgst: invoiced.cgst,
      sgst: invoiced.sgst,
      total: invoiced.total,
      rowRate: invoiced.rows[0].gstPercent
    },
    { subtotal: billed.subtotal, tax: billed.tax, cgst: billed.cgst, sgst: billed.sgst, total: billed.total, rowRate: 5 }
  );
});

test('invoice and order pricing apply identical coupon and GST calculations', function () {
  var items = [{ id: 2, name: 'Tea', sku: 'TEA', hsn: '0902', price: 100, qty: 1 }];
  var billed = pricing.computeTotals(items, 'WELCOME');
  var invoiced = invoice.computeInvoiceFigures({ items: items, coupon: 'WELCOME' });

  assert.deepEqual(
    { discount: invoiced.discount, tax: invoiced.tax, total: invoiced.total },
    { discount: billed.discount, tax: billed.tax, total: billed.total }
  );
});

test('invoice for a billed HSN order matches its ledger total without a notice', function () {
  var html = invoice.render({
    id: 1002,
    date: '2022-01-05',
    customer: 'In-memory customer',
    items: [
      { id: 1, name: 'Rice', sku: 'RICE', hsn: '1006', price: 640, qty: 1 },
      { id: 2, name: 'Oil', sku: 'OIL', hsn: '1512', price: 190, qty: 2 }
    ],
    coupon: 'SAVE10',
    total: 963.9
  });

  assert.match(html, /Invoice Total<\/td><td class="r">₹963\.90/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});

test('invoice preserves the recorded discount for a coupon that later expires', function () {
  var figures = invoice.computeInvoiceFigures({
    items: [{ id: 4, name: 'Tea', sku: 'TEA', hsn: '0902', price: 100, qty: 1 }],
    coupon: 'DIWALI20',
    subtotal: 100,
    discount: 20,
    tax: 14.4,
    total: 94.4
  });

  assert.deepEqual(
    { discount: figures.discount, tax: figures.tax, total: figures.total },
    { discount: 20, tax: 14.4, total: 94.4 }
  );
});
