export type VisualTable = {
  name: string
  humanName: string
  purpose: string
  columns: Array<{
    name: string
    meaning: string
    kind?: 'primary' | 'foreign' | 'normal'
  }>
  rows: Array<Record<string, string | number>>
}

export const visualTables: VisualTable[] = [
  {
    name: 'customers',
    humanName: 'Клиенты',
    purpose: 'Кто покупает или заказывает. Это справочник клиентов.',
    columns: [
      { name: 'id', meaning: 'уникальный номер клиента', kind: 'primary' },
      { name: 'name', meaning: 'название клиента' },
      { name: 'city', meaning: 'город клиента' },
      { name: 'segment', meaning: 'тип клиента' },
      { name: 'active', meaning: 'активен ли клиент' },
    ],
    rows: [
      { id: 1, name: 'Northwind Retail', city: 'Chisinau', segment: 'B2B', active: 1 },
      { id: 2, name: 'Aster Foods', city: 'Balti', segment: 'B2B', active: 1 },
      { id: 3, name: 'Solo Buyer', city: 'Orhei', segment: 'B2C', active: 1 },
      { id: 4, name: 'Dormant Partner', city: 'NULL', segment: 'B2B', active: 0 },
      { id: 5, name: 'Delta Shop', city: 'Comrat', segment: 'B2B', active: 1 },
    ],
  },
  {
    name: 'products',
    humanName: 'Товары',
    purpose: 'Что продаём или используем в заказах.',
    columns: [
      { name: 'id', meaning: 'уникальный номер товара', kind: 'primary' },
      { name: 'sku', meaning: 'артикул товара' },
      { name: 'name', meaning: 'название товара' },
      { name: 'category', meaning: 'категория' },
      { name: 'price', meaning: 'цена' },
      { name: 'active', meaning: 'активен ли товар' },
    ],
    rows: [
      { id: 1, sku: 'ERP-100', name: 'Barcode scanner', category: 'Hardware', price: 210, active: 1 },
      { id: 2, sku: 'ERP-200', name: 'POS terminal', category: 'Hardware', price: 780, active: 1 },
      { id: 3, sku: 'ERP-300', name: 'Implementation package', category: 'Service', price: 1200, active: 1 },
      { id: 4, sku: 'ERP-400', name: 'Legacy connector', category: 'Integration', price: 450, active: 0 },
      { id: 5, sku: 'ERP-500', name: 'Warehouse label roll', category: 'Consumable', price: 18, active: 1 },
    ],
  },
  {
    name: 'orders',
    humanName: 'Заказы',
    purpose: 'Факт заказа: кто заказал, когда, на какую сумму и в каком статусе.',
    columns: [
      { name: 'id', meaning: 'уникальный номер заказа', kind: 'primary' },
      { name: 'customer_id', meaning: 'какой клиент сделал заказ', kind: 'foreign' },
      { name: 'status', meaning: 'состояние заказа' },
      { name: 'order_date', meaning: 'дата заказа' },
      { name: 'total_amount', meaning: 'сумма заказа' },
    ],
    rows: [
      { id: 1001, customer_id: 1, status: 'paid', order_date: '2026-01-10', total_amount: 990 },
      { id: 1002, customer_id: 2, status: 'new', order_date: '2026-01-14', total_amount: 1200 },
      { id: 1003, customer_id: 1, status: 'shipped', order_date: '2026-02-02', total_amount: 246 },
      { id: 1004, customer_id: 5, status: 'payment_pending', order_date: '2026-02-10', total_amount: 780 },
      { id: 1005, customer_id: 'NULL', status: 'new', order_date: '2026-02-11', total_amount: 450 },
      { id: 1006, customer_id: 999, status: 'paid', order_date: '2026-02-13', total_amount: 210 },
    ],
  },
  {
    name: 'order_items',
    humanName: 'Строки заказа',
    purpose: 'Какие товары входят в заказ и в каком количестве.',
    columns: [
      { name: 'id', meaning: 'уникальный номер строки заказа', kind: 'primary' },
      { name: 'order_id', meaning: 'к какому заказу относится строка', kind: 'foreign' },
      { name: 'product_id', meaning: 'какой товар в строке', kind: 'foreign' },
      { name: 'quantity', meaning: 'количество' },
      { name: 'unit_price', meaning: 'цена за единицу' },
    ],
    rows: [
      { id: 1, order_id: 1001, product_id: 1, quantity: 1, unit_price: 210 },
      { id: 2, order_id: 1001, product_id: 2, quantity: 1, unit_price: 780 },
      { id: 3, order_id: 1002, product_id: 3, quantity: 1, unit_price: 1200 },
      { id: 4, order_id: 1003, product_id: 5, quantity: 2, unit_price: 18 },
      { id: 5, order_id: 1003, product_id: 1, quantity: 1, unit_price: 210 },
      { id: 6, order_id: 1004, product_id: 2, quantity: 1, unit_price: 780 },
      { id: 7, order_id: 1005, product_id: 4, quantity: 1, unit_price: 450 },
      { id: 8, order_id: 1006, product_id: 1, quantity: 1, unit_price: 210 },
    ],
  },
  {
    name: 'payments',
    humanName: 'Оплаты',
    purpose: 'Деньги по заказу: сумма, статус оплаты и дата.',
    columns: [
      { name: 'id', meaning: 'уникальный номер оплаты', kind: 'primary' },
      { name: 'order_id', meaning: 'к какому заказу относится оплата', kind: 'foreign' },
      { name: 'amount', meaning: 'сумма оплаты' },
      { name: 'status', meaning: 'статус платежа' },
      { name: 'paid_at', meaning: 'дата успешной оплаты' },
    ],
    rows: [
      { id: 501, order_id: 1001, amount: 990, status: 'captured', paid_at: '2026-01-10' },
      { id: 502, order_id: 1003, amount: 246, status: 'captured', paid_at: '2026-02-02' },
      { id: 503, order_id: 1004, amount: 780, status: 'failed', paid_at: 'NULL' },
      { id: 504, order_id: 1010, amount: 300, status: 'captured', paid_at: '2026-02-12' },
    ],
  },
  {
    name: 'inventory',
    humanName: 'Остатки',
    purpose: 'Сколько товара есть на складе.',
    columns: [
      { name: 'id', meaning: 'уникальный номер записи остатка', kind: 'primary' },
      { name: 'product_id', meaning: 'какой товар лежит на складе', kind: 'foreign' },
      { name: 'warehouse', meaning: 'склад' },
      { name: 'quantity', meaning: 'количество на складе' },
    ],
    rows: [
      { id: 1, product_id: 1, warehouse: 'MAIN', quantity: 8 },
      { id: 2, product_id: 2, warehouse: 'MAIN', quantity: 0 },
      { id: 3, product_id: 3, warehouse: 'SERVICE', quantity: 999 },
      { id: 4, product_id: 5, warehouse: 'MAIN', quantity: 120 },
      { id: 5, product_id: 999, warehouse: 'MAIN', quantity: 4 },
    ],
  },
  {
    name: 'integration_logs',
    humanName: 'Логи интеграции',
    purpose: 'Сообщения от внешних систем: платежи, сайт, склад, CRM.',
    columns: [
      { name: 'id', meaning: 'уникальный номер лога', kind: 'primary' },
      { name: 'source_system', meaning: 'какая система прислала событие' },
      { name: 'entity_type', meaning: 'тип сущности: order, inventory, customer' },
      { name: 'entity_id', meaning: 'id сущности, о которой лог' },
      { name: 'status', meaning: 'статус события' },
      { name: 'message', meaning: 'текст сообщения' },
      { name: 'created_at', meaning: 'дата лога' },
    ],
    rows: [
      { id: 1, source_system: 'PAYMENT_GATEWAY', entity_type: 'order', entity_id: 1004, status: 'error', message: 'Payment failed but order still pending', created_at: '2026-02-10' },
      { id: 2, source_system: 'SHOP_FRONT', entity_type: 'order', entity_id: 1005, status: 'warning', message: 'Order imported without customer_id', created_at: '2026-02-11' },
      { id: 3, source_system: 'WMS', entity_type: 'inventory', entity_id: 999, status: 'error', message: 'Unknown product in stock feed', created_at: '2026-02-12' },
      { id: 4, source_system: 'CRM', entity_type: 'customer', entity_id: 4, status: 'success', message: 'Customer marked inactive', created_at: '2026-02-13' },
    ],
  },
]

export const tableRelations = [
  'orders.customer_id -> customers.id',
  'order_items.order_id -> orders.id',
  'order_items.product_id -> products.id',
  'payments.order_id -> orders.id',
  'inventory.product_id -> products.id',
  'integration_logs.entity_id -> orders.id / products.id / customers.id по entity_type',
]

export const tableAnatomy = [
  {
    title: 'Таблица',
    text: 'Как отдельный лист в Excel. На одном листе клиенты, на другом заказы, на третьем оплаты.',
  },
  {
    title: 'Колонка',
    text: 'Вертикальный столбец с одним типом смысла: имя, статус, сумма, дата.',
  },
  {
    title: 'Строка',
    text: 'Одна запись: один клиент, один заказ или одна оплата.',
  },
  {
    title: 'Ячейка',
    text: 'Одно конкретное значение на пересечении строки и колонки: например status = paid.',
  },
  {
    title: 'PRIMARY KEY',
    text: 'Главный id строки. Он как номер паспорта для записи: по нему её легко найти.',
  },
  {
    title: 'FOREIGN KEY',
    text: 'Ссылка на чужой id. Например orders.customer_id = 5 говорит: заказ сделал клиент с id 5.',
  },
]

export const relationshipSteps = [
  'В customers ищем клиента Delta Shop. Его id = 5.',
  'В orders видим customer_id = 5. Значит заказ 1004 относится к Delta Shop.',
  'В payments видим order_id = 1004. Значит платёж относится к заказу 1004.',
  'Если связи нет, ERP ведёт себя странно: заказ есть, а клиента или оплаты система не находит.',
]

export const firstSqlStory = [
  {
    sql: 'SELECT',
    explanation: 'покажи мне вот эти колонки',
    plain: 'как выбрать нужные столбцы в Excel, а не смотреть весь лист',
  },
  {
    sql: 'FROM orders',
    explanation: 'начни с таблицы заказов',
    plain: 'потому что вопрос сейчас про заказ',
  },
  {
    sql: 'WHERE id = 1004',
    explanation: 'оставь только заказ номер 1004',
    plain: 'как фильтр в Excel: показываем одну нужную строку',
  },
]
