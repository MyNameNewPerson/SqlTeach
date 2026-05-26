export type ConceptTable = {
  title: string
  columns: string[]
  rows: Array<Array<string | number>>
}

export type ConceptExplanation = {
  id: string
  title: string
  short: string
  analogy: string
  tables?: ConceptTable[]
  arrows?: string[]
  sql?: string
  breakdown: Array<{
    part: string
    meaning: string
  }>
  erpExample: string
  commonMistake: string
  remember: string
}

export const moduleConcepts: Record<string, string[]> = {
  'module-0': ['table-basics', 'data-types', 'primary-key', 'foreign-key'],
  'module-1': ['select-from-where', 'where-filters', 'like-patterns', 'alias-as'],
  'module-2': ['foreign-key', 'join-on', 'left-vs-inner-join'],
  'module-3': ['aggregates-group-by', 'having'],
  'module-4': ['null-coalesce', 'distinct'],
  'module-5': ['exists-not-exists'],
  'module-6': ['dml-transactions', 'on-delete'],
  'module-7': ['erp-debug-flow', 'bad-links'],
  'module-8': ['interview-answer-flow', 'erp-debug-flow'],
}

export const conceptExplanations: Record<string, ConceptExplanation> = {
  'table-basics': {
    id: 'table-basics',
    title: 'Таблица, строка, колонка, ячейка',
    short: 'Таблица - это список однотипных данных. Строка - одна запись. Колонка - свойство. Ячейка - конкретное значение.',
    analogy: 'Представь Excel: отдельный лист “Клиенты”, отдельный лист “Заказы”, отдельный лист “Оплаты”. SQL задаёт вопросы этим листам.',
    tables: [
      {
        title: 'customers',
        columns: ['id', 'name', 'city'],
        rows: [
          [1, 'Ivan', 'Chisinau'],
          [2, 'Anna', 'Balti'],
        ],
      },
      {
        title: 'orders',
        columns: ['id', 'customer_id', 'sum'],
        rows: [
          [101, 1, 500],
          [102, 2, 900],
        ],
      },
    ],
    breakdown: [
      { part: 'customers', meaning: 'таблица клиентов: каждая строка - один клиент' },
      { part: 'id', meaning: 'колонка с уникальным номером строки' },
      { part: 'name', meaning: 'колонка с именем клиента' },
      { part: 'orders.customer_id', meaning: 'колонка в заказах, которая показывает, чей это заказ' },
    ],
    erpExample: 'Если клиент говорит “мой заказ пропал”, ты обычно смотришь не одну таблицу, а customers + orders + payments.',
    commonMistake: 'Думать, что вся информация должна лежать в одной таблице. В ERP данные разделяют, чтобы не было дублей и хаоса.',
    remember: 'Таблица = лист. Строка = одна запись. Колонка = свойство. Ячейка = одно значение.',
  },
  'data-types': {
    id: 'data-types',
    title: 'Три вида данных, которые ты встретишь в каждой таблице',
    short: 'Текст пишется в кавычках, числа без кавычек, даты как текст в формате ГГГГ-ММ-ДД.',
    analogy: 'Как в анкете: имя - текст, номер заказа - число, дата заказа - календарная дата. Для базы это разные типы данных.',
    tables: [
      {
        title: 'orders',
        columns: ['колонка', 'тип', 'пример'],
        rows: [
          ['status', 'текст', "'paid'"],
          ['id', 'число', 1004],
          ['order_date', 'дата', "'2026-02-01'"],
        ],
      },
    ],
    sql: `SELECT id, status, order_date
FROM orders
WHERE status = 'paid'
  AND id = 1004
  AND order_date = '2026-02-01';`,
    breakdown: [
      { part: "WHERE status = 'paid'", meaning: 'Текст пишется в кавычках: paid, Chisinau, Delta Shop.' },
      { part: 'WHERE id = 1004', meaning: 'Число пишется без кавычек: 1004, 990, 5.' },
      { part: "WHERE order_date = '2026-02-01'", meaning: 'Дата пишется в кавычках в формате ГГГГ-ММ-ДД.' },
    ],
    erpExample: "Если нужно найти заказ 1004 со статусом paid за 1 февраля 2026, ты фильтруешь число, текст и дату разными правилами.",
    commonMistake: "Частая ошибка новичка - написать WHERE id = '1004'. Для числа кавычки не нужны, иначе база воспринимает его как текст и может не найти совпадение.",
    remember: 'Текст и даты в кавычках. Числа без кавычек.',
  },
  'primary-key': {
    id: 'primary-key',
    title: 'PRIMARY KEY',
    short: 'PRIMARY KEY - главный уникальный номер строки. Никакие две строки не могут иметь один и тот же id.',
    analogy: 'Как номер паспорта для человека: имя можно поменять, но уникальный номер остаётся стабильной ссылкой.',
    tables: [
      {
        title: 'customers',
        columns: ['id', 'name'],
        rows: [
          [5, 'Delta Shop'],
          [6, 'North Market'],
        ],
      },
    ],
    sql: `CREATE TABLE clients (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);`,
    breakdown: [
      { part: 'id INT', meaning: 'создаём колонку id с числом' },
      { part: 'PRIMARY KEY', meaning: 'говорим базе: id уникален и главный для этой таблицы' },
    ],
    erpExample: "Если компания Delta Shop переименовалась в Delta Market, поиск по имени может сломаться. WHERE customer_id = 5 найдёт того же клиента всегда.",
    commonMistake: 'Строить связь по имени клиента. Имена повторяются и меняются, поэтому ERP связывает таблицы по id.',
    remember: 'PRIMARY KEY = стабильный уникальный id строки.',
  },
  'foreign-key': {
    id: 'foreign-key',
    title: 'FOREIGN KEY',
    short: 'FOREIGN KEY - колонка в одной таблице, которая содержит id из другой таблицы.',
    analogy: 'Как номер клиента в заказе: заказ не хранит всю карточку клиента, он хранит ссылку на неё.',
    tables: [
      {
        title: 'customers',
        columns: ['id', 'name'],
        rows: [
          [5, 'Delta Shop'],
          [6, 'North Market'],
        ],
      },
      {
        title: 'orders',
        columns: ['id', 'customer_id', 'sum'],
        rows: [
          [1004, 5, 780],
          [1005, 999, 120],
        ],
      },
    ],
    arrows: ['orders.customer_id -> customers.id'],
    sql: `CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT,
  total DECIMAL(10,2),

  FOREIGN KEY (customer_id)
    REFERENCES customers(id)
);`,
    breakdown: [
      { part: 'customer_id INT', meaning: 'в заказе есть колонка с номером клиента' },
      { part: 'FOREIGN KEY (customer_id)', meaning: 'говорим: customer_id - внешний ключ в таблице orders' },
      { part: 'REFERENCES customers(id)', meaning: 'значение customer_id должно существовать в customers.id' },
      { part: 'orders.customer_id -> customers.id', meaning: 'каждый заказ указывает на клиента по id' },
    ],
    erpExample: 'В orders.customer_id значение 5 означает: этот заказ принадлежит клиенту с id = 5 из customers.',
    commonMistake: 'Если в orders.customer_id написано 999, а клиента 999 в customers нет, получается orphan record: запись указывает в никуда.',
    remember: 'PRIMARY KEY = кто я. FOREIGN KEY = на чей id я ссылаюсь.',
  },
  'select-from-where': {
    id: 'select-from-where',
    title: 'SELECT, FROM, WHERE',
    short: 'SELECT выбирает колонки, FROM выбирает таблицу, WHERE оставляет нужные строки.',
    analogy: 'Как в Excel: выбрать столбцы, открыть нужный лист, поставить фильтр.',
    tables: [
      {
        title: 'orders',
        columns: ['id', 'status', 'sum'],
        rows: [
          [1001, 'paid', 990],
          [1004, 'pending', 780],
        ],
      },
    ],
    sql: `SELECT id, status, sum
FROM orders
WHERE id = 1004;`,
    breakdown: [
      { part: 'SELECT id, status, sum', meaning: 'покажи номер заказа, статус и сумму' },
      { part: 'FROM orders', meaning: 'бери данные из таблицы заказов' },
      { part: 'WHERE id = 1004', meaning: 'оставь только заказ с номером 1004' },
    ],
    erpExample: 'Первый шаг расследования почти всегда такой: найти конкретный заказ, клиента, товар или оплату.',
    commonMistake: 'Писать SELECT * без фильтра и получать слишком много шума.',
    remember: 'SELECT = что показать. FROM = откуда. WHERE = какие строки оставить.',
  },
  'where-filters': {
    id: 'where-filters',
    title: 'Фильтры WHERE: AND, OR, IN, BETWEEN',
    short: 'Фильтры помогают не смотреть всю базу, а найти нужные строки.',
    analogy: 'Как фильтры в интернет-магазине: город, статус, дата, цена.',
    sql: `SELECT id, status, order_date
FROM orders
WHERE status IN ('new', 'payment_pending')
  AND order_date BETWEEN '2026-02-01' AND '2026-02-28';`,
    breakdown: [
      { part: "status IN (...)", meaning: 'статус должен быть одним из списка' },
      { part: 'AND', meaning: 'оба условия должны быть правдой' },
      { part: 'BETWEEN ... AND ...', meaning: 'дата должна попасть в диапазон' },
    ],
    erpExample: 'Найти все новые или ожидающие оплату заказы за февраль.',
    commonMistake: 'Смешивать AND и OR без скобок и случайно получать лишние строки.',
    remember: 'WHERE - это сито: через него проходят только нужные строки.',
  },
  'like-patterns': {
    id: 'like-patterns',
    title: 'LIKE и шаблоны',
    short: 'LIKE ищет текст по шаблону. Символ % означает “любые символы”.',
    analogy: 'Как поиск в телефоне: написал customer - нашлись сообщения, где это слово встречается.',
    sql: `SELECT id, source_system, message
FROM integration_logs
WHERE message LIKE '%customer%';`,
    breakdown: [
      { part: 'LIKE', meaning: 'похоже на шаблон' },
      { part: "'%customer%'", meaning: 'до customer может быть любой текст и после тоже любой текст' },
      { part: 'message LIKE ...', meaning: 'ищем слово customer внутри сообщения лога' },
    ],
    erpExample: 'В логах интеграции можно искать customer, payment, product, error, order_id.',
    commonMistake: "Писать LIKE 'customer' и ожидать поиск внутри строки. Без % это почти точное сравнение.",
    remember: '%customer% = что угодно + customer + что угодно.',
  },
  'alias-as': {
    id: 'alias-as',
    title: 'AS и понятные имена колонок',
    short: 'AS переименовывает колонку в результате запроса.',
    analogy: 'Как подпись на отчёте: вместо двух одинаковых “status” пишем “order_status” и “payment_status”.',
    sql: `SELECT
  o.status AS order_status,
  p.status AS payment_status
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id;`,
    breakdown: [
      { part: 'o.status', meaning: 'статус из таблицы orders' },
      { part: 'p.status', meaning: 'статус из таблицы payments' },
      { part: 'AS payment_status', meaning: 'переименуй колонку, чтобы было понятно, что это статус оплаты' },
      { part: 'orders o', meaning: 'o - короткое имя таблицы orders' },
    ],
    erpExample: 'В заказе и оплате есть колонка status. Без AS человек увидит status/status и запутается.',
    commonMistake: 'Думать, что AS меняет название колонки в базе. Нет, он меняет только название в результате запроса.',
    remember: 'AS = подпиши колонку понятнее.',
  },
  'join-on': {
    id: 'join-on',
    title: 'JOIN и ON',
    short: 'JOIN подключает вторую таблицу. ON говорит, по какому правилу строки связаны.',
    analogy: 'Как склеить две Excel-таблицы по общему номеру.',
    arrows: ['orders.customer_id -> customers.id'],
    sql: `SELECT o.id, c.name, o.total_amount
FROM orders o
JOIN customers c
  ON o.customer_id = c.id;`,
    breakdown: [
      { part: 'JOIN customers c', meaning: 'подключи таблицу клиентов' },
      { part: 'ON o.customer_id = c.id', meaning: 'заказ связан с клиентом, если customer_id равен id клиента' },
      { part: 'c.name', meaning: 'после JOIN можно показать имя клиента из второй таблицы' },
    ],
    erpExample: 'Чтобы увидеть заказ вместе с именем клиента, нужны orders + customers.',
    commonMistake: 'Писать JOIN без правильного ON и получать дубли или неправильные связи.',
    remember: 'JOIN = подключи таблицу. ON = объясни связь.',
  },
  'left-vs-inner-join': {
    id: 'left-vs-inner-join',
    title: 'INNER JOIN vs LEFT JOIN',
    short: 'INNER JOIN показывает только найденные связи. LEFT JOIN оставляет левую таблицу даже без найденной связи.',
    analogy: 'INNER JOIN - только пары, где оба человека пришли. LEFT JOIN - список всех слева, даже если пары справа нет.',
    sql: `SELECT o.id, o.customer_id, c.name
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;`,
    breakdown: [
      { part: 'LEFT JOIN customers', meaning: 'оставь все заказы, даже если клиент не найден' },
      { part: 'WHERE c.id IS NULL', meaning: 'покажи только те заказы, где клиент справа не нашёлся' },
    ],
    erpExample: 'Так ищут заказ с client_id = 999, когда клиента 999 нет в customers.',
    commonMistake: 'Использовать INNER JOIN для поиска отсутствующих связей. INNER JOIN их просто скрывает.',
    remember: 'Для отчёта часто INNER JOIN. Для диагностики плохих данных часто LEFT JOIN.',
  },
  'aggregates-group-by': {
    id: 'aggregates-group-by',
    title: 'COUNT, SUM и GROUP BY',
    short: 'Агрегаты считают строки. GROUP BY собирает строки в группы.',
    analogy: 'Как сводная таблица в Excel: продажи по статусам, клиентам, товарам.',
    sql: `SELECT status, COUNT(*) AS orders_count, SUM(total_amount) AS total
FROM orders
GROUP BY status;`,
    breakdown: [
      { part: 'COUNT(*)', meaning: 'сколько заказов в группе' },
      { part: 'SUM(total_amount)', meaning: 'сумма заказов в группе' },
      { part: 'GROUP BY status', meaning: 'собери заказы по статусам' },
    ],
    erpExample: 'Сколько заказов paid, new, shipped и на какую сумму.',
    commonMistake: 'Вывести status и SUM без GROUP BY и не понимать, к какой группе относится строка.',
    remember: 'GROUP BY отвечает на вопрос “по чему группируем?”.',
  },
  having: {
    id: 'having',
    title: 'HAVING',
    short: 'HAVING фильтрует уже посчитанные группы.',
    analogy: 'Сначала делаешь сводную таблицу, потом оставляешь только строки, где сумма больше 500.',
    sql: `SELECT customer_id, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id
HAVING COUNT(*) >= 2;`,
    breakdown: [
      { part: 'GROUP BY customer_id', meaning: 'собери заказы по клиентам' },
      { part: 'HAVING COUNT(*) >= 2', meaning: 'оставь только клиентов, у которых два заказа или больше' },
    ],
    erpExample: 'Найти клиентов с несколькими заказами.',
    commonMistake: 'Писать COUNT(*) >= 2 в WHERE. WHERE работает до группировки, HAVING после.',
    remember: 'WHERE фильтрует строки. HAVING фильтрует группы.',
  },
  'null-coalesce': {
    id: 'null-coalesce',
    title: 'NULL и COALESCE',
    short: 'NULL означает “значение неизвестно или не заполнено”. COALESCE показывает запасное значение вместо NULL.',
    analogy: 'Пустая клетка в анкете: это не ноль и не слово “нет”, это просто нет данных.',
    sql: `SELECT name, COALESCE(city, 'city_missing') AS city_label
FROM customers;`,
    breakdown: [
      { part: 'city', meaning: 'берём город клиента' },
      { part: "'city_missing'", meaning: 'текст, который покажем, если city пустой' },
      { part: 'COALESCE(city, ...)', meaning: 'возьми city, а если там NULL - возьми запасной текст' },
    ],
    erpExample: 'В отчёте лучше увидеть city_missing, чем пустую ячейку без объяснения.',
    commonMistake: 'Проверять NULL через = NULL. Правильно: IS NULL.',
    remember: 'NULL - неизвестно. COALESCE - что показать вместо неизвестно.',
  },
  distinct: {
    id: 'distinct',
    title: 'DISTINCT',
    short: 'DISTINCT убирает повторы в результате.',
    analogy: 'Как получить список уникальных городов из длинного списка клиентов.',
    sql: `SELECT DISTINCT status
FROM orders
ORDER BY status;`,
    breakdown: [
      { part: 'DISTINCT status', meaning: 'покажи каждый статус один раз' },
      { part: 'ORDER BY status', meaning: 'отсортируй список статусов' },
    ],
    erpExample: 'Быстро увидеть, какие статусы вообще есть в orders.',
    commonMistake: 'Использовать DISTINCT, чтобы “спрятать” дубли, не поняв их причину.',
    remember: 'DISTINCT = уникальный список, не диагностика причины дублей.',
  },
  'exists-not-exists': {
    id: 'exists-not-exists',
    title: 'EXISTS и NOT EXISTS',
    short: 'EXISTS проверяет, существует ли связанная строка. NOT EXISTS ищет, где связанной строки нет.',
    analogy: 'Вопрос да/нет: есть ли успешная оплата по этому заказу?',
    sql: `SELECT o.id, o.status
FROM orders o
WHERE NOT EXISTS (
  SELECT 1
  FROM payments p
  WHERE p.order_id = o.id
    AND p.status = 'captured'
);`,
    breakdown: [
      { part: 'NOT EXISTS (...)', meaning: 'оставь заказ, если внутри не нашлось строк' },
      { part: 'SELECT 1', meaning: 'нам не важны колонки, важен факт существования строки' },
      { part: 'p.order_id = o.id', meaning: 'проверяем платежи именно текущего заказа' },
      { part: "p.status = 'captured'", meaning: 'ищем успешную оплату, а не любую оплату' },
    ],
    erpExample: 'Найти заказы без успешной оплаты.',
    commonMistake: 'Считать SELECT 1 странным. В EXISTS важен не вывод, а факт строки.',
    remember: 'EXISTS = есть ли? NOT EXISTS = где нет?',
  },
  'dml-transactions': {
    id: 'dml-transactions',
    title: 'INSERT, UPDATE, DELETE и транзакции',
    short: 'DML меняет данные. Транзакция позволяет проверить изменение и откатить, если что-то не так.',
    analogy: 'Как черновик перед отправкой: сначала проверил, потом подтвердил или отменил.',
    sql: `BEGIN;
UPDATE orders
SET status = 'paid'
WHERE id = 1004;
SELECT id, status FROM orders WHERE id = 1004;
ROLLBACK;`,
    breakdown: [
      { part: 'BEGIN', meaning: 'начинаю транзакцию' },
      { part: "UPDATE orders SET status = 'paid'", meaning: 'меняю статус заказа' },
      { part: 'WHERE id = 1004', meaning: 'меняю только один заказ, не всю таблицу' },
      { part: 'ROLLBACK', meaning: 'откатываю изменение' },
    ],
    erpExample: 'Перед исправлением статуса заказа сначала SELECT, потом транзакция, потом проверка.',
    commonMistake: 'UPDATE без WHERE. Это может изменить все заказы.',
    remember: 'Перед изменением: SELECT -> BEGIN -> UPDATE -> проверка -> COMMIT/ROLLBACK.',
  },
  'on-delete': {
    id: 'on-delete',
    title: 'ON DELETE',
    short: 'ON DELETE говорит, что делать с дочерними строками, если удалить родительскую.',
    analogy: 'Если удалить клиента, что делать с его заказами: запретить, удалить тоже или оставить без клиента?',
    sql: `FOREIGN KEY (client_id)
REFERENCES clients(id)
ON DELETE RESTRICT;`,
    breakdown: [
      { part: 'ON DELETE RESTRICT', meaning: 'запретить удалить клиента, если у него есть заказы' },
      { part: 'ON DELETE CASCADE', meaning: 'удалить клиента и автоматически удалить связанные строки' },
      { part: 'ON DELETE SET NULL', meaning: 'удалить клиента, а client_id сделать NULL' },
    ],
    erpExample: 'В ERP обычно опасно удалять клиента вместе с заказами, поэтому часто используют запрет или архивирование.',
    commonMistake: 'Ставить CASCADE, не понимая, что он может удалить много связанных данных.',
    remember: 'ON DELETE = политика поведения при удалении родителя.',
  },
  'erp-debug-flow': {
    id: 'erp-debug-flow',
    title: 'ERP-диагностика: от жалобы к таблицам',
    short: 'ERP-инженер переводит жалобу пользователя в проверку таблиц и связей.',
    analogy: 'Как врач: симптом -> гипотеза -> анализы -> вывод.',
    sql: `SELECT o.id, o.status AS order_status,
       p.status AS payment_status,
       l.message
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
LEFT JOIN integration_logs l ON l.entity_type = 'order' AND l.entity_id = o.id
WHERE o.id = 1004;`,
    breakdown: [
      { part: 'orders', meaning: 'проверяю статус заказа' },
      { part: 'payments', meaning: 'проверяю, прошла ли оплата' },
      { part: 'integration_logs', meaning: 'проверяю, не упала ли интеграция' },
      { part: 'LEFT JOIN', meaning: 'не теряю заказ, даже если оплаты или лога нет' },
    ],
    erpExample: '“Оплата есть, статус не изменился” = проверить payments, orders, integration_logs.',
    commonMistake: 'Сразу менять статус заказа, не проверив оплату и логи.',
    remember: 'Симптом -> таблицы -> связи -> запрос -> вывод -> осторожное действие.',
  },
  'bad-links': {
    id: 'bad-links',
    title: 'Плохие связи и orphan records',
    short: 'Плохая связь - строка ссылается на id, которого нет в родительской таблице.',
    analogy: 'В заказе написано “клиент 999”, но в списке клиентов номера 999 нет.',
    sql: `SELECT o.id, o.customer_id
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;`,
    breakdown: [
      { part: 'LEFT JOIN customers', meaning: 'пытаюсь найти клиента для каждого заказа' },
      { part: 'WHERE c.id IS NULL', meaning: 'оставляю только заказы, где клиент не найден' },
    ],
    erpExample: 'Отчёт может терять такие заказы, если использует INNER JOIN.',
    commonMistake: 'Искать только customer_id IS NULL и пропустить customer_id = 999.',
    remember: 'Orphan record = ребёнок есть, родителя нет.',
  },
  'interview-answer-flow': {
    id: 'interview-answer-flow',
    title: 'Как отвечать на ERP-собеседовании',
    short: 'Сильный ответ показывает ход мысли, а не только SQL-команду.',
    analogy: 'Не “я сделал JOIN”, а “я проверил заказ, оплату, связь и лог, потому что симптом такой”.',
    breakdown: [
      { part: '1. Симптом', meaning: 'что говорит пользователь или бизнес' },
      { part: '2. Таблицы', meaning: 'где могут лежать факты' },
      { part: '3. Запрос', meaning: 'как я проверю гипотезу' },
      { part: '4. Вывод', meaning: 'что означает результат' },
      { part: '5. Безопасность', meaning: 'не меняю данные без проверки и транзакции' },
    ],
    erpExample: '“Оплата есть, статус старый” -> orders + payments + integration_logs -> LEFT JOIN -> вывод.',
    commonMistake: 'Отвечать учебниково: “JOIN соединяет таблицы”, без бизнес-смысла.',
    remember: 'На интервью продаёт не синтаксис, а спокойная диагностика.',
  },
}
