export type SqlTaskValidation = {
  requiredKeywords?: string[]
  forbiddenKeywords?: string[]
  expectedRowIds?: number[]
  idColumn?: string
}

export type SqlTask = {
  id: string
  moduleId: string
  title: string
  description: string
  businessContext: string
  starterSql: string
  expectedSql: string
  hints: string[]
  explanation: string
  interviewAnswer: string
  commonMistake: string
  validation: SqlTaskValidation
}

export const sqlTasks: SqlTask[] = [
  {
    id: 'm1-find-order-by-id',
    moduleId: 'module-1',
    title: 'Найти заказ по id',
    description: 'Покажи заказ 1004 и основные поля для диагностики.',
    businessContext: 'Клиент написал в поддержку: "оплата не прошла, что с заказом?". Сначала нужно увидеть сам заказ.',
    starterSql: `SELECT id, customer_id, status, total_amount, created_at, source
FROM orders
WHERE id = 1004;`,
    expectedSql: `SELECT id, customer_id, status, total_amount, created_at, source
FROM orders
WHERE id = 1004;`,
    hints: ['Главная таблица - orders.', 'id числовой, поэтому 1004 пишется без кавычек.'],
    explanation: 'WHERE id = 1004 оставляет одну строку заказа. Так ты быстро понимаешь статус, сумму, источник и клиента.',
    interviewAnswer: 'Я начинаю с orders, потому что результат расследования - конкретный заказ. По id проверяю статус, сумму, клиента и источник.',
    commonMistake: 'Начать с payments без проверки orders: можно увидеть платеж, но не понять текущий статус заказа.',
    validation: { requiredKeywords: ['FROM ORDERS', 'WHERE', 'ID = 1004'], expectedRowIds: [1004], idColumn: 'id' },
  },
  {
    id: 'm1-integration-errors-today',
    moduleId: 'module-1',
    title: 'Ошибки интеграции за сегодня',
    description: 'Найди error-логи за 2026-05-26.',
    businessContext: 'Интеграция с API и складом сегодня падает. Нужно быстро вытащить свежие ошибки.',
    starterSql: `SELECT id, entity_type, entity_id, system_name, message, created_at
FROM integration_logs
WHERE status = 'error'
  AND created_at >= '2026-05-26'
ORDER BY created_at DESC;`,
    expectedSql: `SELECT id, entity_type, entity_id, system_name, message, created_at
FROM integration_logs
WHERE status = 'error'
  AND created_at >= '2026-05-26'
ORDER BY created_at DESC;`,
    hints: ['status - текст, поэтому error в кавычках.', 'created_at можно фильтровать строкой в формате YYYY-MM-DD.'],
    explanation: 'Фильтр по status оставляет только ошибки, дата оставляет сегодняшние записи, ORDER BY показывает последние события первыми.',
    interviewAnswer: 'Для интеграционных проблем я смотрю integration_logs, фильтрую error и свежую дату, чтобы не смешивать старые сбои с текущим инцидентом.',
    commonMistake: 'Делать SELECT * без даты: в реальной ERP логов много, старые ошибки будут мешать.',
    validation: { requiredKeywords: ['INTEGRATION_LOGS', "STATUS = 'ERROR'", 'ORDER BY'], expectedRowIds: [3002, 3001], idColumn: 'id' },
  },
  {
    id: 'm2-orders-with-customers',
    moduleId: 'module-2',
    title: 'Заказы с клиентами',
    description: 'Соедини orders и customers, чтобы увидеть имя клиента рядом с заказом.',
    businessContext: 'В отчёте поддержки нужен не только customer_id, но и понятное имя клиента.',
    starterSql: `SELECT o.id, o.status, c.name AS customer_name
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
ORDER BY o.id;`,
    expectedSql: `SELECT o.id, o.status, c.name AS customer_name
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
ORDER BY o.id;`,
    hints: ['orders - главная таблица.', 'LEFT JOIN сохранит заказ даже если клиента нет.'],
    explanation: 'LEFT JOIN показывает все заказы и подтягивает клиента, если связь c.id = o.customer_id найдена.',
    interviewAnswer: 'Я беру orders как главную таблицу и LEFT JOIN customers, чтобы не потерять заказы с битой или пустой ссылкой на клиента.',
    commonMistake: 'INNER JOIN скроет заказ с customer_id = 999 или NULL, а для диагностики такие строки важны.',
    validation: { requiredKeywords: ['LEFT JOIN CUSTOMERS', 'C.ID = O.CUSTOMER_ID'], expectedRowIds: [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010], idColumn: 'id' },
  },
  {
    id: 'm2-orphan-orders',
    moduleId: 'module-2',
    title: 'Заказы без клиента',
    description: 'Найди заказы, у которых нет строки клиента.',
    businessContext: 'ERP показывает заказ, но карточка клиента не открывается. Нужно найти битую связь.',
    starterSql: `SELECT o.id, o.customer_id, o.status
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;`,
    expectedSql: `SELECT o.id, o.customer_id, o.status
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;`,
    hints: ['Ищи отсутствие совпадения справа.', 'После LEFT JOIN отсутствующий клиент будет NULL.'],
    explanation: 'LEFT JOIN сохраняет заказ, а WHERE c.id IS NULL оставляет только те строки, где клиента справа не нашлось.',
    interviewAnswer: 'Для orphan records я использую LEFT JOIN к справочнику и IS NULL по правой таблице. Так видно ссылки в никуда.',
    commonMistake: 'Фильтровать o.customer_id IS NULL: так ты найдёшь только пустую ссылку, но пропустишь customer_id = 999.',
    validation: { requiredKeywords: ['LEFT JOIN CUSTOMERS', 'IS NULL'], expectedRowIds: [1005, 1006], idColumn: 'id' },
  },
  {
    id: 'm3-sales-by-customer',
    moduleId: 'module-3',
    title: 'Сумма продаж по клиенту',
    description: 'Посчитай сумму paid/shipped заказов по клиентам.',
    businessContext: 'Финансам нужен список клиентов и сумма подтверждённых заказов.',
    starterSql: `SELECT c.id, c.name, SUM(o.total_amount) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.status IN ('paid', 'shipped')
GROUP BY c.id, c.name
ORDER BY revenue DESC;`,
    expectedSql: `SELECT c.id, c.name, SUM(o.total_amount) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.status IN ('paid', 'shipped')
GROUP BY c.id, c.name
ORDER BY revenue DESC;`,
    hints: ['Сначала фильтр строк WHERE, потом группировка.', 'Все неагрегированные колонки должны быть в GROUP BY.'],
    explanation: 'SUM считает сумму внутри каждой группы клиента. WHERE до группировки убирает неподтверждённые заказы.',
    interviewAnswer: 'Я группирую по клиенту и считаю SUM по заказам, но сначала фильтрую бизнес-статусы, которые считаются продажей.',
    commonMistake: 'JOIN с order_items перед SUM(o.total_amount) размножит строки заказа и завысит сумму.',
    validation: { requiredKeywords: ['SUM', 'GROUP BY', "STATUS IN ('PAID', 'SHIPPED')"] },
  },
  {
    id: 'm4-customers-null-city',
    moduleId: 'module-4',
    title: 'Клиенты без города',
    description: 'Найди активных клиентов, у которых city не заполнен.',
    businessContext: 'Доставка и региональные отчёты ломаются, если город клиента пустой.',
    starterSql: `SELECT id, name, email, city
FROM customers
WHERE active = 1
  AND city IS NULL;`,
    expectedSql: `SELECT id, name, email, city
FROM customers
WHERE active = 1
  AND city IS NULL;`,
    hints: ['NULL нельзя искать через = NULL.', 'Нужен оператор IS NULL.'],
    explanation: 'NULL означает отсутствие значения. IS NULL находит именно такие строки.',
    interviewAnswer: 'Пустые значения я проверяю через IS NULL, потому что NULL не равен ни строке, ни нулю, ни самому себе.',
    commonMistake: "WHERE city = NULL ничего не найдёт, потому что сравнение с NULL работает не как обычное равенство.",
    validation: { requiredKeywords: ['IS NULL', 'ACTIVE = 1'], expectedRowIds: [8], idColumn: 'id' },
  },
  {
    id: 'm5-customers-without-orders',
    moduleId: 'module-5',
    title: 'Клиенты без заказов',
    description: 'Найди клиентов, у которых нет ни одного заказа.',
    businessContext: 'Маркетинг хочет понять, кто зарегистрировался, но ни разу не купил.',
    starterSql: `SELECT c.id, c.name
FROM customers c
WHERE NOT EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = c.id
);`,
    expectedSql: `SELECT c.id, c.name
FROM customers c
WHERE NOT EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = c.id
);`,
    hints: ['Внешний запрос идёт по customers.', 'Внутренний запрос ищет хотя бы один заказ этого клиента.'],
    explanation: 'NOT EXISTS оставляет клиента только если внутренний запрос не нашёл связанных заказов.',
    interviewAnswer: 'Главная таблица customers, потому что ответом должны быть клиенты. В NOT EXISTS я проверяю orders по customer_id и оставляю тех, для кого заказов не найдено.',
    commonMistake: 'INNER JOIN никогда не покажет клиентов без заказов, потому что совпадения нет.',
    validation: { requiredKeywords: ['NOT EXISTS', 'O.CUSTOMER_ID = C.ID'], expectedRowIds: [4, 6, 7], idColumn: 'id' },
  },
  {
    id: 'm5-orders-without-captured-payment',
    moduleId: 'module-5',
    title: 'Заказы без успешной оплаты',
    description: 'Найди заказы, для которых нет payments.status = captured.',
    businessContext: 'Поддержка видит заказы, где клиент говорит об оплате, но ERP не видит успешный платёж.',
    starterSql: `SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE NOT EXISTS (
  SELECT 1
  FROM payments p
  WHERE p.order_id = o.id
    AND p.status = 'captured'
);`,
    expectedSql: `SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE NOT EXISTS (
  SELECT 1
  FROM payments p
  WHERE p.order_id = o.id
    AND p.status = 'captured'
);`,
    hints: ['Не ищи p.status != captured через JOIN.', 'У одного заказа может быть failed и captured одновременно.'],
    explanation: 'Для каждого заказа внутренний запрос ищет успешный платеж. Если не нашёл, NOT EXISTS оставляет заказ в результате.',
    interviewAnswer: 'Я ищу заказы без успешной оплаты от orders. Внутри NOT EXISTS проверяю payments по order_id и status = captured. Это безопаснее, чем p.status != captured, потому что у заказа может быть несколько платежей.',
    commonMistake: "JOIN payments p WHERE p.status != 'captured' ошибочно вернёт заказ 1007 из-за failed попытки, хотя captured у него есть.",
    validation: { requiredKeywords: ['NOT EXISTS', 'P.ORDER_ID = O.ID', "P.STATUS = 'CAPTURED'"], forbiddenKeywords: ['P.STATUS !='], expectedRowIds: [1002, 1004, 1005, 1009], idColumn: 'id' },
  },
  {
    id: 'm5-paid-orders-without-invoice',
    moduleId: 'module-5',
    title: 'Paid orders без invoice',
    description: 'Найди оплаченные заказы, для которых нет инвойса.',
    businessContext: 'Финансовый отдел видит paid order, но документ не сформировался.',
    starterSql: `SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE o.status = 'paid'
  AND NOT EXISTS (
    SELECT 1
    FROM invoices i
    WHERE i.order_id = o.id
  );`,
    expectedSql: `SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE o.status = 'paid'
  AND NOT EXISTS (
    SELECT 1
    FROM invoices i
    WHERE i.order_id = o.id
  );`,
    hints: ['Сначала ограничься paid заказами.', 'Потом проверь отсутствие invoice.'],
    explanation: 'Внешний WHERE оставляет paid заказы, NOT EXISTS проверяет, что связанного invoice нет.',
    interviewAnswer: 'Я разделяю бизнес-фильтр и проверку связи: беру paid orders и через NOT EXISTS проверяю отсутствие invoices по order_id.',
    commonMistake: 'Искать i.status != issued через JOIN: заказ без invoice вообще не попадёт в INNER JOIN.',
    validation: { requiredKeywords: ["O.STATUS = 'PAID'", 'NOT EXISTS', 'INVOICES'], expectedRowIds: [1006, 1008], idColumn: 'id' },
  },
  {
    id: 'm5-paid-orders-without-shipment',
    moduleId: 'module-5',
    title: 'Paid orders без shipment',
    description: 'Найди оплаченные заказы, у которых нет строки отгрузки.',
    businessContext: 'Клиент оплатил, но товар не уехал. Нужно понять, создана ли отгрузка.',
    starterSql: `SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE o.status = 'paid'
  AND NOT EXISTS (
    SELECT 1
    FROM shipments s
    WHERE s.order_id = o.id
  );`,
    expectedSql: `SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE o.status = 'paid'
  AND NOT EXISTS (
    SELECT 1
    FROM shipments s
    WHERE s.order_id = o.id
  );`,
    hints: ['shipments связана с orders через order_id.', 'pending shipment - это строка есть, а "без shipment" - строки нет.'],
    explanation: 'Запрос ищет paid orders, для которых не существует связанной строки в shipments.',
    interviewAnswer: 'Если заказ оплачен, но не отгружен, я сначала проверяю факт shipment через NOT EXISTS, а потом отдельно смотрю статус существующих shipment.',
    commonMistake: "WHERE s.status != 'shipped' решает другую задачу: он ищет отгрузки не в shipped, но не строки без отгрузки.",
    validation: { requiredKeywords: ["O.STATUS = 'PAID'", 'NOT EXISTS', 'SHIPMENTS'], expectedRowIds: [1006, 1007, 1008], idColumn: 'id' },
  },
  {
    id: 'm5-products-without-inventory',
    moduleId: 'module-5',
    title: 'Товары без остатков',
    description: 'Найди активные товары, по которым нет записи inventory.',
    businessContext: 'Товар есть в каталоге, но склад его не видит.',
    starterSql: `SELECT p.id, p.sku, p.name
FROM products p
WHERE p.active = 1
  AND NOT EXISTS (
    SELECT 1
    FROM inventory i
    WHERE i.product_id = p.id
  );`,
    expectedSql: `SELECT p.id, p.sku, p.name
FROM products p
WHERE p.active = 1
  AND NOT EXISTS (
    SELECT 1
    FROM inventory i
    WHERE i.product_id = p.id
  );`,
    hints: ['Главная таблица - products.', 'inventory.product_id ссылается на products.id.'],
    explanation: 'NOT EXISTS показывает товары, которые активны в каталоге, но не имеют строки остатка.',
    interviewAnswer: 'Я проверяю справочник products против inventory, потому что отсутствие строки остатка - это проблема связи каталога и склада.',
    commonMistake: 'quantity_available = 0 не то же самое, что нет записи inventory.',
    validation: { requiredKeywords: ['NOT EXISTS', 'INVENTORY', 'I.PRODUCT_ID = P.ID'], expectedRowIds: [7], idColumn: 'id' },
  },
  {
    id: 'm5-products-never-sold',
    moduleId: 'module-5',
    title: 'Товары, которые никогда не продавались',
    description: 'Найди активные продукты, которых нет в order_items.',
    businessContext: 'Нужно понять, какие активные SKU висят в каталоге, но не встречаются в заказах.',
    starterSql: `SELECT p.id, p.sku, p.name
FROM products p
WHERE p.active = 1
  AND NOT EXISTS (
    SELECT 1
    FROM order_items oi
    WHERE oi.product_id = p.id
  );`,
    expectedSql: `SELECT p.id, p.sku, p.name
FROM products p
WHERE p.active = 1
  AND NOT EXISTS (
    SELECT 1
    FROM order_items oi
    WHERE oi.product_id = p.id
  );`,
    hints: ['Факт продажи товара живёт в order_items.', 'Не используй orders напрямую: там нет product_id.'],
    explanation: 'order_items хранит строки товаров в заказах. Если по продукту нет ни одной строки, товар не продавался.',
    interviewAnswer: 'Для вопроса "продавался ли товар" я смотрю не orders, а order_items, потому что именно там связь заказа и товара.',
    commonMistake: 'JOIN к orders без order_items не покажет товар, потому что orders хранит шапку заказа, а не SKU.',
    validation: { requiredKeywords: ['NOT EXISTS', 'ORDER_ITEMS', 'OI.PRODUCT_ID = P.ID'], expectedRowIds: [7], idColumn: 'id' },
  },
  {
    id: 'm5-orders-with-integration-error',
    moduleId: 'module-5',
    title: 'Заказы с ошибкой интеграции',
    description: 'Найди заказы, по которым есть error в integration_logs.',
    businessContext: 'Нужно отделить бизнес-заказы с технической ошибкой от обычных заказов.',
    starterSql: `SELECT o.id, o.status, o.source
FROM orders o
WHERE EXISTS (
  SELECT 1
  FROM integration_logs l
  WHERE l.entity_type = 'order'
    AND l.entity_id = o.id
    AND l.status = 'error'
);`,
    expectedSql: `SELECT o.id, o.status, o.source
FROM orders o
WHERE EXISTS (
  SELECT 1
  FROM integration_logs l
  WHERE l.entity_type = 'order'
    AND l.entity_id = o.id
    AND l.status = 'error'
);`,
    hints: ['EXISTS подходит, когда нужен факт ошибки.', 'Логи универсальные, поэтому проверь entity_type = order.'],
    explanation: 'EXISTS оставляет заказ, если для него есть хотя бы один error-log типа order.',
    interviewAnswer: 'Я связываю integration_logs не только по entity_id, но и по entity_type, чтобы случайно не смешать разные сущности с одинаковыми id.',
    commonMistake: 'Связать только l.entity_id = o.id и забыть entity_type: в универсальных логах id разных сущностей могут совпадать.',
    validation: { requiredKeywords: ['EXISTS', "L.ENTITY_TYPE = 'ORDER'", "L.STATUS = 'ERROR'"], expectedRowIds: [1009], idColumn: 'id' },
  },
  {
    id: 'm6-safe-update-log',
    moduleId: 'module-6',
    title: 'Безопасно отметить лог как resolved',
    description: 'Сначала проверь строку, затем обнови внутри транзакции.',
    businessContext: 'Инженер исправил интеграционную ошибку и хочет отметить лог как resolved без риска обновить всё.',
    starterSql: `SELECT id, status, message
FROM integration_logs
WHERE id = 3001;

BEGIN;
UPDATE integration_logs
SET status = 'resolved'
WHERE id = 3001;
SELECT id, status, message
FROM integration_logs
WHERE id = 3001;
ROLLBACK;`,
    expectedSql: `BEGIN;
UPDATE integration_logs
SET status = 'resolved'
WHERE id = 3001;
ROLLBACK;`,
    hints: ['Перед UPDATE делай SELECT-проверку.', 'WHERE защищает от изменения всей таблицы.'],
    explanation: 'Транзакция позволяет проверить изменение и откатить его, если результат не тот.',
    interviewAnswer: 'Перед UPDATE я делаю SELECT с тем же WHERE, затем BEGIN, UPDATE, проверку и только потом COMMIT. Если что-то не так - ROLLBACK.',
    commonMistake: "UPDATE integration_logs SET status = 'resolved' без WHERE изменит все строки.",
    validation: { requiredKeywords: ['BEGIN', 'UPDATE INTEGRATION_LOGS', 'WHERE ID = 3001', 'ROLLBACK'] },
  },
  {
    id: 'm7-paid-without-captured',
    moduleId: 'module-7',
    title: 'Paid order без captured payment',
    description: 'Найди заказы со статусом paid, но без успешного платежа.',
    businessContext: 'ERP считает заказ оплаченным, но в платежах нет captured. Это риск для финансов.',
    starterSql: `SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE o.status = 'paid'
  AND NOT EXISTS (
    SELECT 1
    FROM payments p
    WHERE p.order_id = o.id
      AND p.status = 'captured'
  );`,
    expectedSql: `SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE o.status = 'paid'
  AND NOT EXISTS (
    SELECT 1
    FROM payments p
    WHERE p.order_id = o.id
      AND p.status = 'captured'
  );`,
    hints: ['Это не все заказы без оплаты, а именно paid без captured.', 'Добавь o.status = paid во внешний запрос.'],
    explanation: 'Запрос ловит противоречие: order.status говорит paid, а подтверждённого платежа нет.',
    interviewAnswer: 'Я ищу расхождение между статусом заказа и платежными фактами: paid в orders должен подтверждаться captured в payments.',
    commonMistake: 'Проверять только payments.status: без фильтра paid ты смешаешь обычные новые заказы и настоящую аномалию.',
    validation: { requiredKeywords: ["O.STATUS = 'PAID'", 'NOT EXISTS', "P.STATUS = 'CAPTURED'"], expectedRowIds: [1006], idColumn: 'id' },
  },
  {
    id: 'm7-captured-but-order-not-paid',
    moduleId: 'module-7',
    title: 'Captured payment, но order не paid',
    description: 'Найди успешные платежи, где статус заказа не paid/shipped.',
    businessContext: 'Платеж прошёл, а заказ завис в старом статусе. Клиент может не получить товар.',
    starterSql: `SELECT o.id, o.status, p.id AS payment_id, p.amount
FROM payments p
JOIN orders o ON o.id = p.order_id
WHERE p.status = 'captured'
  AND o.status NOT IN ('paid', 'shipped');`,
    expectedSql: `SELECT o.id, o.status, p.id AS payment_id, p.amount
FROM payments p
JOIN orders o ON o.id = p.order_id
WHERE p.status = 'captured'
  AND o.status NOT IN ('paid', 'shipped');`,
    hints: ['Главный факт - captured payment.', 'Потом проверь статус связанного заказа.'],
    explanation: 'Запрос показывает платежи, которые подтверждены, но заказ не перешёл в ожидаемый бизнес-статус.',
    interviewAnswer: 'Я иду от payments, потому что факт успешной оплаты главный, и сравниваю его со статусом orders.',
    commonMistake: 'Искать только orders.status = payment_pending: можно пропустить другие неправильные статусы.',
    validation: { requiredKeywords: ["P.STATUS = 'CAPTURED'", "NOT IN ('PAID', 'SHIPPED')"], expectedRowIds: [] },
  },
  {
    id: 'm7-invoice-mismatch',
    moduleId: 'module-7',
    title: 'Invoice amount не равен order total',
    description: 'Найди инвойсы, где сумма документа отличается от суммы заказа.',
    businessContext: 'Клиент оплатил одну сумму, invoice выставлен на другую. Это финансовая ошибка.',
    starterSql: `SELECT o.id, o.total_amount, i.invoice_number, i.amount AS invoice_amount
FROM orders o
JOIN invoices i ON i.order_id = o.id
WHERE i.amount <> o.total_amount;`,
    expectedSql: `SELECT o.id, o.total_amount, i.invoice_number, i.amount AS invoice_amount
FROM orders o
JOIN invoices i ON i.order_id = o.id
WHERE i.amount <> o.total_amount;`,
    hints: ['Нужны orders и invoices.', '<> означает "не равно".'],
    explanation: 'JOIN связывает заказ и документ, WHERE оставляет только несовпадающие суммы.',
    interviewAnswer: 'Я сравниваю финансовый факт в orders с суммой invoice. Несовпадение суммы - повод проверить генерацию документа или ручные правки.',
    commonMistake: 'Сравнивать payment.amount с invoice.amount без orders: можно не увидеть, где именно источник расхождения.',
    validation: { requiredKeywords: ['JOIN INVOICES', 'I.AMOUNT <> O.TOTAL_AMOUNT'], expectedRowIds: [1007], idColumn: 'id' },
  },
  {
    id: 'm7-reserved-greater-than-available',
    moduleId: 'module-7',
    title: 'Reserved больше available',
    description: 'Найди остатки, где зарезервировано больше, чем доступно.',
    businessContext: 'Склад не может отгрузить заказ, потому что система зарезервировала больше товара, чем есть.',
    starterSql: `SELECT p.id, p.sku, p.name, i.quantity_available, i.quantity_reserved
FROM inventory i
JOIN products p ON p.id = i.product_id
WHERE i.quantity_reserved > i.quantity_available;`,
    expectedSql: `SELECT p.id, p.sku, p.name, i.quantity_available, i.quantity_reserved
FROM inventory i
JOIN products p ON p.id = i.product_id
WHERE i.quantity_reserved > i.quantity_available;`,
    hints: ['Сравни две числовые колонки в inventory.', 'JOIN products нужен, чтобы увидеть SKU и название.'],
    explanation: 'Условие quantity_reserved > quantity_available ловит невозможную складскую ситуацию.',
    interviewAnswer: 'Для проблемы отгрузки я проверяю inventory: если reserved больше available, заказ может зависнуть даже при paid статусе.',
    commonMistake: 'Искать только quantity_available = 0: это пропустит случаи, где available есть, но reserved всё равно больше.',
    validation: { requiredKeywords: ['QUANTITY_RESERVED > QUANTITY_AVAILABLE', 'JOIN PRODUCTS'], expectedRowIds: [6], idColumn: 'id' },
  },
  {
    id: 'm7-duplicate-emails',
    moduleId: 'module-7',
    title: 'Дубли клиентов по email',
    description: 'Найди email, который встречается у нескольких клиентов.',
    businessContext: 'В CRM две карточки клиента, из-за этого заказы и коммуникации расходятся.',
    starterSql: `SELECT email, COUNT(*) AS customers_count
FROM customers
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;`,
    expectedSql: `SELECT email, COUNT(*) AS customers_count
FROM customers
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;`,
    hints: ['Дубли ищутся через GROUP BY + COUNT.', 'HAVING фильтрует уже посчитанные группы.'],
    explanation: 'GROUP BY собирает строки с одинаковым email, HAVING COUNT(*) > 1 оставляет только дубли.',
    interviewAnswer: 'Для поиска дублей я группирую по бизнес-ключу и фильтрую группы через HAVING COUNT больше одного.',
    commonMistake: 'DISTINCT скроет повторяющиеся email в выводе, но не покажет, что дубль существует.',
    validation: { requiredKeywords: ['GROUP BY EMAIL', 'HAVING COUNT(*) > 1'] },
  },
  {
    id: 'm7-duplicate-transaction',
    moduleId: 'module-7',
    title: 'Один transaction_id несколько раз',
    description: 'Найди внешние transaction_id, которые встречаются больше одного раза.',
    businessContext: 'Платёжный провайдер прислал один и тот же transaction_id дважды. Это риск двойной обработки.',
    starterSql: `SELECT transaction_id, COUNT(*) AS payments_count
FROM payments
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id
HAVING COUNT(*) > 1;`,
    expectedSql: `SELECT transaction_id, COUNT(*) AS payments_count
FROM payments
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id
HAVING COUNT(*) > 1;`,
    hints: ['transaction_id - внешний бизнес-ключ платежа.', 'NULL лучше исключить до группировки.'],
    explanation: 'Запрос показывает внешние id, которые используются несколькими строками payments.',
    interviewAnswer: 'Я проверяю уникальность внешнего transaction_id через GROUP BY + HAVING, потому что дубли могут означать повторную обработку вебхука.',
    commonMistake: 'Считать дубли по payments.id: id всегда уникален и проблему не покажет.',
    validation: { requiredKeywords: ['GROUP BY TRANSACTION_ID', 'HAVING COUNT(*) > 1'] },
  },
  {
    id: 'm8-final-paid-not-shipped',
    moduleId: 'module-8',
    title: 'Финальный кейс: оплатил, но не отгрузили',
    description: 'Найди возможные причины для paid заказа без shipment.',
    businessContext: 'Клиент оплатил заказ, но товар не отгрузился. Нужно проверить заказ, платеж, invoice, shipment, inventory, integration_logs и audit_log.',
    starterSql: `SELECT o.id, o.status, o.total_amount, p.status AS payment_status, i.amount AS invoice_amount, s.status AS shipment_status
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'captured'
LEFT JOIN invoices i ON i.order_id = o.id
LEFT JOIN shipments s ON s.order_id = o.id
WHERE o.status = 'paid'
  AND s.id IS NULL;`,
    expectedSql: `SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE o.status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM shipments s WHERE s.order_id = o.id
  );`,
    hints: ['Сначала найди paid orders без shipment.', 'Потом отдельно проверяй payments, invoices, inventory и logs.'],
    explanation: 'Финальный кейс начинается с главной аномалии: заказ paid, но строки shipment нет. Дальше причины ищутся в оплатах, остатках, инвойсах и логах.',
    interviewAnswer: 'Я начинаю с orders, нахожу paid заказы без shipment, затем проверяю captured payment, invoice, остатки по order_items и ошибки интеграции. Так я отделяю симптом от причины.',
    commonMistake: 'Пытаться одним огромным запросом сразу доказать всё: на интервью лучше идти шагами и объяснять каждую проверку.',
    validation: { requiredKeywords: ["O.STATUS = 'PAID'"], expectedRowIds: [1006, 1007, 1008], idColumn: 'id' },
  },
]
