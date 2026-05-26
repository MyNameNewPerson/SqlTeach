import { schemaSummary } from '../data/erpSchema'

export { schemaSummary }

export const seedSql = `
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS integration_logs;
DROP TABLE IF EXISTS shipments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS warehouses;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  city TEXT,
  active INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  status TEXT NOT NULL,
  total_amount REAL NOT NULL,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  active INTEGER NOT NULL
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL
);

CREATE TABLE warehouses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE inventory (
  id INTEGER PRIMARY KEY,
  product_id INTEGER,
  warehouse_id INTEGER,
  quantity_available INTEGER NOT NULL,
  quantity_reserved INTEGER NOT NULL
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER,
  status TEXT NOT NULL,
  amount REAL NOT NULL,
  provider TEXT NOT NULL,
  transaction_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  order_id INTEGER,
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE shipments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER,
  status TEXT NOT NULL,
  tracking_number TEXT,
  shipped_at TEXT
);

CREATE TABLE integration_logs (
  id INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  system_name TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT INTO customers VALUES
  (1, 'Northwind Retail', 'ops@northwind.md', 'Chisinau', 1, '2026-01-03'),
  (2, 'Aster Foods', 'finance@aster.md', 'Balti', 1, '2026-01-05'),
  (3, 'Solo Buyer', 'solo@example.md', 'Orhei', 1, '2026-01-07'),
  (4, 'Dormant Partner', 'old@example.md', NULL, 0, '2025-12-20'),
  (5, 'Delta Shop', 'ops@delta.md', 'Comrat', 1, '2026-01-11'),
  (6, 'Delta Market', 'ops@delta.md', 'Comrat', 1, '2026-01-12'),
  (7, 'No Orders LLC', 'noorders@example.md', 'Chisinau', 1, '2026-02-01'),
  (8, 'API Buyer', 'api@example.md', NULL, 1, '2026-02-05');

INSERT INTO orders VALUES
  (1001, 1, 'paid', 990, '2026-02-01', 'website'),
  (1002, 2, 'new', 1200, '2026-02-03', 'marketplace'),
  (1003, 1, 'shipped', 246, '2026-02-04', 'website'),
  (1004, 5, 'payment_pending', 780, '2026-02-10', 'api'),
  (1005, NULL, 'new', 450, '2026-02-10', 'manual'),
  (1006, 999, 'paid', 210, '2026-02-11', 'api'),
  (1007, 5, 'paid', 780, '2026-02-12', 'website'),
  (1008, 2, 'paid', 1200, '2026-02-13', 'marketplace'),
  (1009, 8, 'new', 18, '2026-02-14', 'api'),
  (1010, 3, 'paid', 210, '2026-02-15', 'manual');

INSERT INTO products VALUES
  (1, 'SCAN-01', 'Barcode Scanner', 'hardware', 1),
  (2, 'POS-01', 'POS Terminal', 'hardware', 1),
  (3, 'SRV-SETUP', 'Implementation Service', 'service', 1),
  (4, 'CONN-LEGACY', 'Legacy Connector', 'integration', 0),
  (5, 'LABEL-ROLL', 'Label Roll', 'consumable', 1),
  (6, 'FISCAL-01', 'Fiscal Printer', 'hardware', 1),
  (7, 'CABLE-USB', 'Unsold USB Cable', 'accessory', 1);

INSERT INTO order_items VALUES
  (9001, 1001, 1, 1, 210),
  (9002, 1001, 2, 1, 780),
  (9003, 1002, 3, 1, 1200),
  (9004, 1003, 5, 2, 18),
  (9005, 1003, 1, 1, 210),
  (9006, 1004, 2, 1, 780),
  (9007, 1005, 4, 1, 450),
  (9008, 1006, 1, 1, 210),
  (9009, 1007, 2, 1, 780),
  (9010, 1007, 6, 1, 0),
  (9011, 1008, 3, 1, 1200),
  (9012, 1009, 5, 1, 18),
  (9013, 1010, 1, 1, 210);

INSERT INTO warehouses VALUES
  (1, 'Main Warehouse', 'Chisinau'),
  (2, 'North Hub', 'Balti');

INSERT INTO inventory VALUES
  (1, 1, 1, 8, 2),
  (2, 2, 1, 0, 1),
  (3, 3, 2, 999, 0),
  (4, 5, 1, 120, 40),
  (5, 6, 1, 3, 7),
  (6, 999, 1, 4, 0);

INSERT INTO payments VALUES
  (501, 1001, 'captured', 990, 'stripe', 'tx-1001', '2026-02-01 10:15:00'),
  (502, 1003, 'captured', 246, 'stripe', 'tx-1003', '2026-02-04 12:20:00'),
  (503, 1004, 'failed', 780, 'stripe', 'tx-1004-fail', '2026-02-10 09:12:00'),
  (504, 1007, 'failed', 780, 'stripe', 'tx-1007-a', '2026-02-12 15:01:00'),
  (505, 1007, 'captured', 780, 'stripe', 'tx-1007-b', '2026-02-12 15:04:00'),
  (506, 1008, 'captured', 1200, 'paypal', 'tx-dup-1', '2026-02-13 11:00:00'),
  (507, 1010, 'captured', 210, 'paypal', 'tx-dup-1', '2026-02-15 13:00:00'),
  (508, 1011, 'captured', 300, 'stripe', 'tx-orphan', '2026-02-16 09:00:00');

INSERT INTO invoices VALUES
  (701, 1001, 'INV-1001', 'issued', 990, '2026-02-01'),
  (702, 1003, 'INV-1003', 'issued', 246, '2026-02-04'),
  (703, 1007, 'INV-1007', 'issued', 700, '2026-02-12'),
  (704, 1010, 'INV-1010', 'draft', 210, '2026-02-15');

INSERT INTO shipments VALUES
  (801, 1001, 'shipped', 'TRK1001', '2026-02-02'),
  (802, 1003, 'delivered', 'TRK1003', '2026-02-05'),
  (803, 1010, 'pending', NULL, NULL);

INSERT INTO integration_logs VALUES
  (3001, 'order', 1009, 'api', 'error', 'Order stuck in new status', '2026-05-26 09:00:00'),
  (3002, 'shipment', 1007, 'warehouse', 'error', 'Reserved stock exceeds available', '2026-05-26 10:20:00'),
  (3003, 'payment', 1004, 'stripe', 'error', 'Card declined', '2026-02-10 09:13:00'),
  (3004, 'invoice', 1008, 'billing', 'error', NULL, '2026-05-25 18:40:00'),
  (3005, 'order', 1001, 'website', 'success', 'Order imported', '2026-02-01 10:00:00');

INSERT INTO users VALUES
  (1, 'ERP Admin', 'admin'),
  (2, 'Support Engineer', 'support'),
  (3, 'Integration Bot', 'service');

INSERT INTO audit_log VALUES
  (4001, 3, 'order', 1007, 'payment_status_synced', '2026-02-12 15:05:00'),
  (4002, 2, 'shipment', 803, 'shipment_checked', '2026-02-15 13:30:00'),
  (4003, 1, 'integration_log', 3001, 'marked_for_retry', '2026-05-26 09:30:00');
`
