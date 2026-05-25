export const schemaSummary = [
  'customers(id, name, city, segment, active)',
  'orders(id, customer_id, status, order_date, total_amount)',
  'order_items(id, order_id, product_id, quantity, unit_price)',
  'products(id, sku, name, category, price, active)',
  'payments(id, order_id, amount, status, paid_at)',
  'inventory(id, product_id, warehouse, quantity)',
  'integration_logs(id, source_system, entity_type, entity_id, status, message, created_at)',
]

export const seedSql = `
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  segment TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  status TEXT NOT NULL,
  order_date TEXT NOT NULL,
  total_amount REAL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  paid_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE inventory (
  id INTEGER PRIMARY KEY,
  product_id INTEGER,
  warehouse TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE integration_logs (
  id INTEGER PRIMARY KEY,
  source_system TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO customers VALUES
  (1, 'Northwind Retail', 'Chisinau', 'B2B', 1),
  (2, 'Aster Foods', 'Balti', 'B2B', 1),
  (3, 'Solo Buyer', 'Orhei', 'B2C', 1),
  (4, 'Dormant Partner', NULL, 'B2B', 0),
  (5, 'Delta Shop', 'Comrat', 'B2B', 1);

INSERT INTO products VALUES
  (1, 'ERP-100', 'Barcode scanner', 'Hardware', 210, 1),
  (2, 'ERP-200', 'POS terminal', 'Hardware', 780, 1),
  (3, 'ERP-300', 'Implementation package', 'Service', 1200, 1),
  (4, 'ERP-400', 'Legacy connector', 'Integration', 450, 0),
  (5, 'ERP-500', 'Warehouse label roll', 'Consumable', 18, 1);

INSERT INTO orders VALUES
  (1001, 1, 'paid', '2026-01-10', 990),
  (1002, 2, 'new', '2026-01-14', 1200),
  (1003, 1, 'shipped', '2026-02-02', 246),
  (1004, 5, 'payment_pending', '2026-02-10', 780),
  (1005, NULL, 'new', '2026-02-11', 450),
  (1006, 999, 'paid', '2026-02-13', 210);

INSERT INTO order_items VALUES
  (1, 1001, 1, 1, 210),
  (2, 1001, 2, 1, 780),
  (3, 1002, 3, 1, 1200),
  (4, 1003, 5, 2, 18),
  (5, 1003, 1, 1, 210),
  (6, 1004, 2, 1, 780),
  (7, 1005, 4, 1, 450),
  (8, 1006, 1, 1, 210);

INSERT INTO payments VALUES
  (501, 1001, 990, 'captured', '2026-01-10'),
  (502, 1003, 246, 'captured', '2026-02-02'),
  (503, 1004, 780, 'failed', NULL),
  (504, 1010, 300, 'captured', '2026-02-12');

INSERT INTO inventory VALUES
  (1, 1, 'MAIN', 8),
  (2, 2, 'MAIN', 0),
  (3, 3, 'SERVICE', 999),
  (4, 5, 'MAIN', 120),
  (5, 999, 'MAIN', 4);

INSERT INTO integration_logs VALUES
  (1, 'PAYMENT_GATEWAY', 'order', 1004, 'error', 'Payment failed but order still pending', '2026-02-10'),
  (2, 'SHOP_FRONT', 'order', 1005, 'warning', 'Order imported without customer_id', '2026-02-11'),
  (3, 'WMS', 'inventory', 999, 'error', 'Unknown product in stock feed', '2026-02-12'),
  (4, 'CRM', 'customer', 4, 'success', 'Customer marked inactive', '2026-02-13');
`
