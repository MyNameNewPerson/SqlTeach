export type VisualTable = {
  name: string
  title: string
  humanName: string
  purpose: string
  description: string
  columns: Array<{
    name: string
    meaning: string
    kind?: 'primary' | 'foreign' | 'normal'
  }>
  rows: Array<Record<string, string | number | null>>
  accent: string
}

export const schemaSummary = [
  'customers(id, name, email, city, active, created_at)',
  'orders(id, customer_id, status, total_amount, created_at, source)',
  'order_items(id, order_id, product_id, quantity, price)',
  'products(id, sku, name, category, active)',
  'inventory(id, product_id, warehouse_id, quantity_available, quantity_reserved)',
  'warehouses(id, name, city)',
  'payments(id, order_id, status, amount, provider, transaction_id, created_at)',
  'invoices(id, order_id, invoice_number, status, amount, created_at)',
  'shipments(id, order_id, status, tracking_number, shipped_at)',
  'integration_logs(id, entity_type, entity_id, system_name, status, message, created_at)',
  'audit_log(id, user_id, entity_type, entity_id, action, created_at)',
  'users(id, name, role)',
]

export const visualTables: VisualTable[] = [
  {
    name: 'customers',
    title: 'Клиенты',
    description: 'Кто покупает: компания, email, город, активность. Здесь есть клиент без заказов, дубль email и NULL в city.',
    humanName: 'Клиенты',
    purpose: 'Кто покупает: компания, email, город и активность клиента.',
    columns: [
      { name: 'id', meaning: 'уникальный номер клиента', kind: 'primary' },
      { name: 'name', meaning: 'название клиента' },
      { name: 'email', meaning: 'контактный email, может использоваться для поиска дублей' },
      { name: 'city', meaning: 'город клиента, иногда NULL' },
      { name: 'active', meaning: 'активен ли клиент' },
    ],
    accent: 'from-cyan-500/20 to-blue-500/10',
    rows: [
      { id: 1, name: 'Northwind Retail', email: 'ops@northwind.md', city: 'Chisinau', active: 1 },
      { id: 2, name: 'Aster Foods', email: 'finance@aster.md', city: 'Balti', active: 1 },
      { id: 5, name: 'Delta Shop', email: 'ops@delta.md', city: 'Comrat', active: 1 },
      { id: 6, name: 'Delta Market', email: 'ops@delta.md', city: 'Comrat', active: 1 },
      { id: 7, name: 'No Orders LLC', email: 'noorders@example.md', city: 'Chisinau', active: 1 },
      { id: 8, name: 'API Buyer', email: 'api@example.md', city: null, active: 1 },
    ],
  },
  {
    name: 'orders',
    title: 'Заказы',
    description: 'Главная таблица расследований. Заказ связывается с клиентом, платежами, инвойсами, отгрузками и товарами.',
    humanName: 'Заказы',
    purpose: 'Главная сущность продажи: клиент, статус, сумма, дата и источник.',
    columns: [
      { name: 'id', meaning: 'уникальный номер заказа', kind: 'primary' },
      { name: 'customer_id', meaning: 'ссылка на customers.id', kind: 'foreign' },
      { name: 'status', meaning: 'бизнес-статус заказа' },
      { name: 'total_amount', meaning: 'итоговая сумма заказа' },
      { name: 'created_at', meaning: 'дата создания заказа' },
      { name: 'source', meaning: 'канал: website, marketplace, manual или api' },
    ],
    accent: 'from-emerald-500/20 to-teal-500/10',
    rows: [
      { id: 1001, customer_id: 1, status: 'paid', total_amount: 990, created_at: '2026-02-01', source: 'website' },
      { id: 1002, customer_id: 2, status: 'new', total_amount: 1200, created_at: '2026-02-03', source: 'marketplace' },
      { id: 1004, customer_id: 5, status: 'payment_pending', total_amount: 780, created_at: '2026-02-10', source: 'api' },
      { id: 1006, customer_id: 999, status: 'paid', total_amount: 210, created_at: '2026-02-11', source: 'api' },
      { id: 1007, customer_id: 5, status: 'paid', total_amount: 780, created_at: '2026-02-12', source: 'website' },
      { id: 1009, customer_id: 8, status: 'new', total_amount: 18, created_at: '2026-02-14', source: 'api' },
    ],
  },
  {
    name: 'payments',
    title: 'Платежи',
    description: 'Факты оплат. У заказа может быть несколько попыток оплаты: failed, pending, captured.',
    humanName: 'Платежи',
    purpose: 'Попытки оплаты по заказам: failed, pending, captured.',
    columns: [
      { name: 'id', meaning: 'уникальный номер платежа', kind: 'primary' },
      { name: 'order_id', meaning: 'ссылка на orders.id', kind: 'foreign' },
      { name: 'status', meaning: 'статус попытки оплаты' },
      { name: 'amount', meaning: 'сумма платежа' },
      { name: 'provider', meaning: 'платёжный провайдер' },
      { name: 'transaction_id', meaning: 'внешний id транзакции' },
    ],
    accent: 'from-amber-500/20 to-yellow-500/10',
    rows: [
      { id: 501, order_id: 1001, status: 'captured', amount: 990, provider: 'stripe', transaction_id: 'tx-1001' },
      { id: 503, order_id: 1004, status: 'failed', amount: 780, provider: 'stripe', transaction_id: 'tx-1004-fail' },
      { id: 504, order_id: 1007, status: 'failed', amount: 780, provider: 'stripe', transaction_id: 'tx-1007-a' },
      { id: 505, order_id: 1007, status: 'captured', amount: 780, provider: 'stripe', transaction_id: 'tx-1007-b' },
      { id: 506, order_id: 1008, status: 'captured', amount: 1200, provider: 'paypal', transaction_id: 'tx-dup-1' },
      { id: 507, order_id: 1010, status: 'captured', amount: 210, provider: 'paypal', transaction_id: 'tx-dup-1' },
    ],
  },
  {
    name: 'order_items',
    title: 'Позиции заказа',
    description: 'One-to-many связь: один заказ может иметь несколько строк товаров, поэтому JOIN может размножить сумму заказа.',
    humanName: 'Позиции заказа',
    purpose: 'Какие товары входят в заказ. Это one-to-many связь с orders.',
    columns: [
      { name: 'id', meaning: 'уникальный номер строки заказа', kind: 'primary' },
      { name: 'order_id', meaning: 'ссылка на orders.id', kind: 'foreign' },
      { name: 'product_id', meaning: 'ссылка на products.id', kind: 'foreign' },
      { name: 'quantity', meaning: 'количество товара' },
      { name: 'price', meaning: 'цена в строке заказа' },
    ],
    accent: 'from-violet-500/20 to-fuchsia-500/10',
    rows: [
      { id: 9001, order_id: 1001, product_id: 1, quantity: 1, price: 210 },
      { id: 9002, order_id: 1001, product_id: 2, quantity: 1, price: 780 },
      { id: 9006, order_id: 1007, product_id: 2, quantity: 1, price: 780 },
      { id: 9007, order_id: 1007, product_id: 6, quantity: 1, price: 0 },
    ],
  },
  {
    name: 'inventory',
    title: 'Остатки',
    description: 'Сколько доступно и сколько зарезервировано. Здесь есть товар без остатка и reserved больше available.',
    humanName: 'Остатки',
    purpose: 'Сколько товара доступно и сколько уже зарезервировано на складах.',
    columns: [
      { name: 'id', meaning: 'уникальный номер строки остатка', kind: 'primary' },
      { name: 'product_id', meaning: 'ссылка на products.id', kind: 'foreign' },
      { name: 'warehouse_id', meaning: 'ссылка на warehouses.id', kind: 'foreign' },
      { name: 'quantity_available', meaning: 'доступное количество' },
      { name: 'quantity_reserved', meaning: 'зарезервированное количество' },
    ],
    accent: 'from-lime-500/20 to-green-500/10',
    rows: [
      { id: 1, product_id: 1, warehouse_id: 1, quantity_available: 8, quantity_reserved: 2 },
      { id: 2, product_id: 2, warehouse_id: 1, quantity_available: 0, quantity_reserved: 1 },
      { id: 5, product_id: 6, warehouse_id: 1, quantity_available: 3, quantity_reserved: 7 },
    ],
  },
  {
    name: 'integration_logs',
    title: 'Логи интеграций',
    description: 'Следы обмена с внешними системами: маркетплейс, API, платежный провайдер, склад.',
    humanName: 'Логи интеграций',
    purpose: 'Что внешние системы сообщили ERP: успех, ошибка, текст сообщения и время.',
    columns: [
      { name: 'id', meaning: 'уникальный номер лога', kind: 'primary' },
      { name: 'entity_type', meaning: 'тип сущности: order, payment, shipment' },
      { name: 'entity_id', meaning: 'id сущности внутри своего типа' },
      { name: 'system_name', meaning: 'какая система отправила событие' },
      { name: 'status', meaning: 'success или error' },
      { name: 'message', meaning: 'сообщение интеграции, иногда NULL' },
    ],
    accent: 'from-rose-500/20 to-red-500/10',
    rows: [
      { id: 3001, entity_type: 'order', entity_id: 1009, system_name: 'api', status: 'error', message: 'Order stuck in new status' },
      { id: 3002, entity_type: 'shipment', entity_id: 1007, system_name: 'warehouse', status: 'error', message: 'Reserved stock exceeds available' },
      { id: 3003, entity_type: 'payment', entity_id: 1004, system_name: 'stripe', status: 'error', message: 'Card declined' },
    ],
  },
]

export const tableRelations = [
  'orders.customer_id -> customers.id',
  'order_items.order_id -> orders.id',
  'order_items.product_id -> products.id',
  'payments.order_id -> orders.id',
  'invoices.order_id -> orders.id',
  'shipments.order_id -> orders.id',
  'inventory.product_id -> products.id',
  'inventory.warehouse_id -> warehouses.id',
  'audit_log.user_id -> users.id',
]
