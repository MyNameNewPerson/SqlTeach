import type { CourseModule, PracticeTask, QuizQuestion } from '../types'

const q = (
  question: string,
  options: string[],
  answer: number,
  explanation: string,
): QuizQuestion => ({ question, options, answer, explanation })

const task = (
  title: string,
  prompt: string,
  starterSql: string,
  expectedHint: string,
): PracticeTask => ({ title, prompt, starterSql, expectedHint })

export const modules: CourseModule[] = [
  {
    id: 'module-0',
    number: 0,
    title: 'Диагностика и база',
    goal: 'Понять базовые сущности БД и увидеть, почему ERP раскладывает данные по связанным таблицам.',
    level: 'Старт',
    topics: ['база данных', 'таблица', 'строка', 'колонка', 'id', 'PRIMARY KEY', 'FOREIGN KEY'],
    erpContext:
      'Заказ не хранит всё в одной строке: customers, orders, order_items, products, payments, inventory и integration_logs отвечают за разные части процесса.',
    lessons: [
      {
        title: 'Как думать о таблицах в ERP',
        minutes: 12,
        content: [
          'Таблица похожа на журнал событий или справочник: customers хранит клиентов, products хранит товары, orders хранит шапку заказа.',
          'Строка - один конкретный объект или факт. Колонка - свойство этого объекта: имя, город, сумма, статус.',
          'id нужен как стабильная ссылка. Имя клиента может измениться, а customer_id в заказе должен продолжать указывать на того же клиента.',
        ],
        sql: `SELECT id, name, city
FROM customers;`,
        engineerNote:
          'На собеседовании важно говорить не только определения, а зачем это нужно: id защищает связи от переименований и дублей.',
      },
      {
        title: 'Ключи и связи',
        minutes: 10,
        content: [
          'PRIMARY KEY уникально идентифицирует строку в своей таблице.',
          'FOREIGN KEY хранит ссылку на строку из другой таблицы. Например, orders.customer_id ссылается на customers.id.',
          'Плохие данные часто видны именно на связях: заказ без клиента, оплата без заказа, остаток по неизвестному товару.',
        ],
        sql: `SELECT orders.id, orders.status, customers.name
FROM orders
LEFT JOIN customers ON customers.id = orders.customer_id;`,
        engineerNote:
          'LEFT JOIN - первый инструмент диагностики отсутствующих связей: он показывает и нормальные, и проблемные строки.',
      },
    ],
    quiz: [
      q('Что такое таблица?', ['Набор связанных строк и колонок', 'Один SQL-запрос', 'Пароль к базе'], 0, 'Таблица хранит однотипные данные.'),
      q('Что такое строка?', ['Один объект или факт в таблице', 'Название колонки', 'Схема всей ERP'], 0, 'Например, один клиент или один заказ.'),
      q('Почему id лучше имени клиента?', ['id стабилен и уникален', 'id красивее выглядит', 'id всегда равен сумме заказа'], 0, 'Имена могут повторяться или меняться.'),
      q('Что такое PRIMARY KEY?', ['Главный уникальный идентификатор строки', 'Любой текстовый столбец', 'Команда удаления'], 0, 'PK помогает ссылаться на строку без двусмысленности.'),
      q('Что такое FOREIGN KEY?', ['Ссылка на ключ другой таблицы', 'Индекс скорости', 'Файл с экспортом'], 0, 'FK связывает таблицы между собой.'),
    ],
    task: task(
      'Оплата есть, статус не изменился',
      'Клиент говорит: я оплатил заказ, но статус не изменился. Какие таблицы проверишь и почему?',
      `SELECT o.id, o.status, p.status AS payment_status, p.amount
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
WHERE o.id = 1004;`,
      'Проверь orders, payments и integration_logs: статус заказа, статус оплаты и ошибки интеграции.',
    ),
  },
  {
    id: 'module-1',
    number: 1,
    title: 'SELECT и фильтрация',
    goal: 'Научиться доставать нужные строки и колонки без лишнего шума.',
    level: 'База',
    topics: ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'IN', 'BETWEEN', 'LIKE', 'ORDER BY', 'LIMIT'],
    erpContext: 'ERP-инженер постоянно ищет конкретные заказы, клиентов, ошибки импорта и товары по условиям.',
    lessons: [
      {
        title: 'SELECT как инженерный фонарь',
        minutes: 15,
        content: [
          'SELECT выбирает колонки, FROM задаёт таблицу, WHERE оставляет только нужные строки.',
          'AND сужает условие, OR расширяет. IN удобен для нескольких статусов, BETWEEN - для диапазона дат или сумм.',
          'ORDER BY помогает увидеть свежие или самые дорогие записи первыми, LIMIT ограничивает вывод.',
        ],
        sql: `SELECT id, name, city
FROM customers
WHERE city IN ('Chisinau', 'Balti')
ORDER BY name
LIMIT 10;`,
        engineerNote:
          'На проде сначала ограничивай выборку и выбирай нужные поля. SELECT * без фильтра часто шумит и тормозит.',
      },
      {
        title: 'LIKE и шаблоны',
        minutes: 8,
        content: [
          'LIKE ищет текст по шаблону: % означает любую последовательность символов.',
          'Для артикула, имени клиента или сообщения ошибки это быстрый способ найти подозрительные записи.',
        ],
        sql: `SELECT id, source_system, message
FROM integration_logs
WHERE message LIKE '%customer%';`,
        engineerNote:
          'LIKE удобен для диагностики, но на больших таблицах его нужно использовать осторожно и понимать индексы.',
      },
    ],
    quiz: [
      q('Что делает WHERE?', ['Фильтрует строки', 'Создаёт таблицу', 'Сортирует колонки'], 0, 'WHERE оставляет строки, которые удовлетворяют условию.'),
      q('Когда уместен IN?', ['Когда нужно проверить несколько значений', 'Когда нужно посчитать сумму', 'Когда нужна транзакция'], 0, 'IN компактнее цепочки OR.'),
      q('Что делает ORDER BY order_date DESC?', ['Сортирует от новых дат к старым', 'Удаляет старые даты', 'Группирует даты'], 0, 'DESC означает убывание.'),
    ],
    task: task(
      'Найти свежие проблемные заказы',
      'Выведи новые или ожидающие оплату заказы за февраль 2026 года, отсортированные от новых к старым.',
      `SELECT id, customer_id, status, order_date, total_amount
FROM orders
WHERE status IN ('new', 'payment_pending')
  AND order_date BETWEEN '2026-02-01' AND '2026-02-28'
ORDER BY order_date DESC;`,
      'Используй IN, BETWEEN и ORDER BY DESC.',
    ),
  },
  {
    id: 'module-2',
    number: 2,
    title: 'Ключи и JOIN',
    goal: 'Связывать таблицы и объяснять разницу между INNER JOIN и LEFT JOIN.',
    level: 'Практика',
    topics: ['PRIMARY KEY', 'FOREIGN KEY', 'INNER JOIN', 'LEFT JOIN', 'алиасы'],
    erpContext: 'Заказ без клиента, позиция без товара и оплата без заказа - типовые точки расследования.',
    lessons: [
      {
        title: 'INNER JOIN для подтверждённых связей',
        minutes: 14,
        content: [
          'INNER JOIN возвращает только строки, где связь нашлась с обеих сторон.',
          'Он хорош для отчётов по корректным данным: заказы с существующими клиентами, позиции с существующими товарами.',
        ],
        sql: `SELECT o.id, c.name, o.status, o.total_amount
FROM orders o
INNER JOIN customers c ON c.id = o.customer_id;`,
        engineerNote:
          'Если строка пропала после INNER JOIN, это может быть не ошибка запроса, а симптом отсутствующей связи.',
      },
      {
        title: 'LEFT JOIN для диагностики',
        minutes: 16,
        content: [
          'LEFT JOIN сохраняет все строки слева и подставляет NULL справа, если связь не найдена.',
          'Именно так ищут заказы с customer_id, которого нет в customers, или платежи без заказа.',
        ],
        sql: `SELECT o.id, o.customer_id
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;`,
        engineerNote:
          'Фраза для интервью: LEFT JOIN помогает не потерять проблемную строку во время расследования.',
      },
    ],
    quiz: [
      q('Что вернёт INNER JOIN?', ['Только строки с найденной связью', 'Все строки левой таблицы', 'Только дубли'], 0, 'INNER JOIN требует совпадения.'),
      q('Для чего нужен LEFT JOIN?', ['Чтобы увидеть отсутствующие связи', 'Чтобы удалить NULL', 'Чтобы создать индекс'], 0, 'NULL справа показывает, где связь не нашлась.'),
      q('Что такое алиас `orders o`?', ['Короткое имя таблицы в запросе', 'Новая таблица', 'Тип индекса'], 0, 'Алиасы делают JOIN-запросы компактнее.'),
    ],
    task: task(
      'Заказы без клиента',
      'Найди заказы, у которых нет корректной строки клиента.',
      `SELECT o.id, o.customer_id, o.status
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;`,
      'LEFT JOIN + WHERE c.id IS NULL покажет отсутствующую связь.',
    ),
  },
  {
    id: 'module-3',
    number: 3,
    title: 'Агрегации и GROUP BY',
    goal: 'Считать количество, суммы, средние значения и фильтровать группы через HAVING.',
    level: 'Практика',
    topics: ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GROUP BY', 'HAVING'],
    erpContext: 'Отчёты по продажам, оплатам, складу и ошибкам строятся на агрегациях.',
    lessons: [
      {
        title: 'Метрики из строк',
        minutes: 12,
        content: [
          'COUNT считает строки, SUM суммирует числовые значения, AVG считает среднее.',
          'MIN и MAX помогают найти крайние даты, цены или суммы.',
        ],
        sql: `SELECT status, COUNT(*) AS orders_count, SUM(total_amount) AS revenue
FROM orders
GROUP BY status;`,
        engineerNote:
          'Всегда называй агрегаты понятными alias: revenue, orders_count, failed_payments.',
      },
      {
        title: 'HAVING после группировки',
        minutes: 10,
        content: [
          'WHERE фильтрует строки до группировки, HAVING фильтрует уже готовые группы.',
          'Если нужно найти клиентов с двумя и более заказами, условие по COUNT пишется в HAVING.',
        ],
        sql: `SELECT customer_id, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id
HAVING COUNT(*) >= 2;`,
        engineerNote:
          'На интервью часто спрашивают разницу WHERE и HAVING. Ответ: WHERE до GROUP BY, HAVING после.',
      },
    ],
    quiz: [
      q('Что делает COUNT(*)?', ['Считает строки', 'Склеивает текст', 'Меняет статус'], 0, 'COUNT(*) считает количество строк в группе или таблице.'),
      q('Где писать условие по SUM(total_amount)?', ['HAVING', 'FROM', 'LIMIT'], 0, 'Условия по агрегатам пишутся в HAVING.'),
      q('Что обязан содержать SELECT при GROUP BY?', ['Группируемые поля и агрегаты', 'Только PRIMARY KEY', 'Только текст'], 0, 'Обычные поля должны быть согласованы с GROUP BY.'),
    ],
    task: task(
      'Выручка по статусам',
      'Посчитай количество заказов и сумму total_amount по каждому статусу. Оставь группы с суммой больше 500.',
      `SELECT status, COUNT(*) AS orders_count, SUM(total_amount) AS total
FROM orders
GROUP BY status
HAVING SUM(total_amount) > 500;`,
      'GROUP BY status, затем HAVING по сумме.',
    ),
  },
  {
    id: 'module-4',
    number: 4,
    title: 'NULL, DISTINCT, COALESCE',
    goal: 'Корректно читать пустые значения, убирать дубли и подставлять безопасные значения.',
    level: 'Практика',
    topics: ['NULL', 'IS NULL', 'IS NOT NULL', 'COALESCE', 'DISTINCT'],
    erpContext: 'NULL встречается в неоплаченных платежах, неизвестных городах, незавершённых интеграциях.',
    lessons: [
      {
        title: 'NULL - это неизвестно, а не ноль',
        minutes: 11,
        content: [
          'NULL означает отсутствие значения. Его нельзя сравнивать через = NULL, нужно IS NULL.',
          'COALESCE возвращает первое не-NULL значение и полезен для отчётов.',
        ],
        sql: `SELECT name, COALESCE(city, 'city_missing') AS city_label
FROM customers;`,
        engineerNote:
          'Ошибка новичка: считать NULL нулём или пустой строкой. В данных ERP это разные состояния.',
      },
      {
        title: 'DISTINCT для уникальных значений',
        minutes: 7,
        content: [
          'DISTINCT показывает уникальные комбинации выбранных колонок.',
          'Он полезен для списка статусов, городов, источников интеграций.',
        ],
        sql: `SELECT DISTINCT status
FROM orders
ORDER BY status;`,
        engineerNote:
          'DISTINCT может скрыть причину дублей, поэтому для диагностики дублей лучше COUNT + GROUP BY.',
      },
    ],
    quiz: [
      q('Как проверить NULL?', ['IS NULL', '= NULL', 'LIKE NULL'], 0, 'Для NULL используется IS NULL.'),
      q('Что делает COALESCE(city, "unknown")?', ['Возвращает city или unknown, если city NULL', 'Удаляет город', 'Сортирует города'], 0, 'COALESCE идёт слева направо.'),
      q('Для чего DISTINCT?', ['Показать уникальные значения', 'Посчитать сумму', 'Создать внешний ключ'], 0, 'DISTINCT убирает повторяющиеся комбинации.'),
    ],
    task: task(
      'Клиенты без города',
      'Покажи клиентов и подставь `city_missing`, если город не заполнен.',
      `SELECT id, name, COALESCE(city, 'city_missing') AS city_label
FROM customers;`,
      'COALESCE удобен для отчёта, IS NULL - для поиска проблем.',
    ),
  },
  {
    id: 'module-5',
    number: 5,
    title: 'Подзапросы и EXISTS',
    goal: 'Использовать подзапросы для проверок наличия и отсутствия связанных данных.',
    level: 'Инженерный',
    topics: ['subquery', 'EXISTS', 'NOT EXISTS', 'IN subquery'],
    erpContext: 'Часто нужно найти клиентов без заказов, заказы без оплат, товары без остатков.',
    lessons: [
      {
        title: 'Подзапрос как уточняющий вопрос',
        minutes: 14,
        content: [
          'Подзапрос возвращает промежуточный набор данных, который внешний запрос использует как условие.',
          'IN с подзапросом удобен, когда внутренний запрос возвращает список id.',
        ],
        sql: `SELECT id, name
FROM customers
WHERE id IN (
  SELECT customer_id FROM orders WHERE status = 'paid'
);`,
        engineerNote:
          'Для больших данных EXISTS часто читается и оптимизируется лучше, чем IN, особенно при корреляции.',
      },
      {
        title: 'NOT EXISTS для отсутствующих фактов',
        minutes: 13,
        content: [
          'EXISTS отвечает на вопрос: существует ли хотя бы одна связанная строка.',
          'NOT EXISTS отлично выражает бизнес-проблему: заказ есть, а captured payment нет.',
        ],
        sql: `SELECT o.id, o.status
FROM orders o
WHERE NOT EXISTS (
  SELECT 1
  FROM payments p
  WHERE p.order_id = o.id AND p.status = 'captured'
);`,
        engineerNote:
          'Говори бизнес-языком: этот запрос ищет заказы без подтверждённой оплаты, а не просто демонстрирует синтаксис.',
      },
    ],
    quiz: [
      q('Что проверяет EXISTS?', ['Наличие хотя бы одной строки', 'Сумму строк', 'Порядок колонок'], 0, 'EXISTS истинно, если внутренний запрос что-то вернул.'),
      q('Когда полезен NOT EXISTS?', ['Когда ищем отсутствующий связанный факт', 'Когда нужна сортировка', 'Когда нужно переименовать колонку'], 0, 'Например, товары без остатков.'),
      q('Что обычно пишут внутри EXISTS SELECT?', ['SELECT 1', 'SELECT password', 'DELETE'], 0, 'Содержимое не важно, важен факт наличия строки.'),
    ],
    task: task(
      'Заказы без успешной оплаты',
      'Найди заказы, для которых нет платежа со статусом captured.',
      `SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE NOT EXISTS (
  SELECT 1
  FROM payments p
  WHERE p.order_id = o.id
    AND p.status = 'captured'
);`,
      'Используй NOT EXISTS и корреляцию p.order_id = o.id.',
    ),
  },
  {
    id: 'module-6',
    number: 6,
    title: 'Изменение данных и транзакции',
    goal: 'Понимать INSERT, UPDATE, DELETE и базовую идею транзакций без опасных привычек.',
    level: 'Инженерный',
    topics: ['INSERT', 'UPDATE', 'DELETE', 'BEGIN', 'COMMIT', 'ROLLBACK'],
    erpContext: 'ERP-инженер должен уметь объяснить, как безопасно исправлять данные и почему нужен rollback-план.',
    lessons: [
      {
        title: 'DML без героизма',
        minutes: 15,
        content: [
          'INSERT добавляет строки, UPDATE меняет существующие, DELETE удаляет.',
          'Перед UPDATE/DELETE сначала выполняют SELECT с тем же WHERE, чтобы увидеть затрагиваемые строки.',
        ],
        sql: `SELECT id, status
FROM orders
WHERE id = 1004;`,
        engineerNote:
          'В собеседовании сильный ответ: я не запускаю UPDATE вслепую, сначала проверяю выборку и делаю backup/transaction.',
      },
      {
        title: 'Транзакция как защитный контур',
        minutes: 12,
        content: [
          'Транзакция объединяет изменения в один блок: либо все применились, либо все откатились.',
          'ROLLBACK возвращает состояние до BEGIN, если проверка после изменения не прошла.',
        ],
        sql: `BEGIN;
UPDATE orders SET status = 'paid' WHERE id = 1004;
SELECT id, status FROM orders WHERE id = 1004;
ROLLBACK;`,
        engineerNote:
          'В песочнице можно экспериментировать, но в реальной ERP изменение данных требует согласования и аудита.',
      },
    ],
    quiz: [
      q('Что нужно сделать перед UPDATE?', ['Проверить SELECT с тем же WHERE', 'Убрать WHERE', 'Сразу COMMIT'], 0, 'Так ты понимаешь, какие строки меняешь.'),
      q('Что делает ROLLBACK?', ['Откатывает изменения транзакции', 'Сортирует таблицу', 'Создаёт колонку'], 0, 'ROLLBACK возвращает состояние до BEGIN.'),
      q('Почему DELETE опасен без WHERE?', ['Удалит все строки таблицы', 'Ничего не сделает', 'Переименует таблицу'], 0, 'DELETE FROM table без WHERE удаляет все строки.'),
    ],
    task: task(
      'Безопасная правка статуса',
      'Сымитируй исправление статуса заказа 1004 внутри транзакции и откати изменение.',
      `BEGIN;
UPDATE orders
SET status = 'paid'
WHERE id = 1004;

SELECT id, status
FROM orders
WHERE id = 1004;

ROLLBACK;`,
      'Проверь строку после UPDATE и заверши ROLLBACK, чтобы учебная база осталась чистой.',
    ),
  },
  {
    id: 'module-7',
    number: 7,
    title: 'ERP-диагностика данных',
    goal: 'Решать реальные задачи: оплаты, остатки, ошибки интеграции и плохие связи.',
    level: 'Инженерный',
    topics: ['data quality', 'orphan records', 'integration logs', 'stock checks'],
    erpContext: 'Главная ценность ERP Engineer - быстро превратить симптом пользователя в проверяемые SQL-гипотезы.',
    lessons: [
      {
        title: 'От симптома к таблицам',
        minutes: 16,
        content: [
          'Если пользователь говорит “оплатил, но заказ не обновился”, проверяем orders, payments и integration_logs.',
          'Если товар нельзя отгрузить, проверяем order_items, products и inventory.',
          'Если данные пришли из внешней системы, integration_logs часто объясняет, где сломалась цепочка.',
        ],
        sql: `SELECT l.source_system, l.entity_type, l.entity_id, l.status, l.message
FROM integration_logs l
WHERE l.status IN ('error', 'warning')
ORDER BY l.created_at DESC;`,
        engineerNote:
          'Сильный инженер формулирует гипотезы: “платёж captured?”, “статус заказа обновился?”, “лог интеграции есть?”.',
      },
      {
        title: 'Плохие связи как отдельный класс багов',
        minutes: 14,
        content: [
          'Orphan records - строки, которые ссылаются на несуществующую родительскую запись.',
          'В учебной базе специально есть заказ с customer_id 999, payment на order_id 1010 и inventory на product_id 999.',
        ],
        sql: `SELECT p.id, p.order_id, p.status
FROM payments p
LEFT JOIN orders o ON o.id = p.order_id
WHERE o.id IS NULL;`,
        engineerNote:
          'Не называй это “просто NULL”. Это нарушение целостности данных, которое влияет на бизнес-процесс.',
      },
    ],
    quiz: [
      q('Где искать ошибку импорта?', ['integration_logs', 'Только products', 'CSS-файл'], 0, 'Логи интеграций дают источник, сущность и сообщение.'),
      q('Что такое orphan record?', ['Строка со ссылкой на несуществующую запись', 'Самый новый заказ', 'Дубликат статуса'], 0, 'Например, payment.order_id без orders.id.'),
      q('Какие таблицы важны для проверки отгрузки?', ['orders, order_items, products, inventory', 'customers и только customers', 'payments и logs без товаров'], 0, 'Отгрузка зависит от заказа, позиций, товаров и остатков.'),
    ],
    task: task(
      'Платежи без заказа',
      'Найди платежи, которые ссылаются на несуществующий заказ.',
      `SELECT p.id, p.order_id, p.amount, p.status
FROM payments p
LEFT JOIN orders o ON o.id = p.order_id
WHERE o.id IS NULL;`,
      'Диагностический паттерн: LEFT JOIN к родительской таблице и WHERE parent.id IS NULL.',
    ),
  },
  {
    id: 'module-8',
    number: 8,
    title: 'Интервью и финальная сборка',
    goal: 'Собрать знания в уверенные ответы ERP Engineer: технически точно и бизнес-ориентированно.',
    level: 'Инженерный',
    topics: ['interview answers', 'debugging narrative', 'final exam', 'trade-offs'],
    erpContext: 'Собеседование проверяет не только синтаксис, но и то, как ты расследуешь проблему в ERP-процессе.',
    lessons: [
      {
        title: 'Ответ не книжный, а инженерный',
        minutes: 12,
        content: [
          'Плохой ответ: “JOIN соединяет таблицы”. Хороший ответ: “JOIN позволяет связать заказ с клиентом и платежом, чтобы проверить бизнес-состояние”.',
          'Структура ответа: симптом, гипотезы, таблицы, запрос, проверка результата, осторожность с изменениями.',
        ],
        sql: `SELECT o.id, c.name, o.status, p.status AS payment_status
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN payments p ON p.order_id = o.id
WHERE o.id = 1004;`,
        engineerNote:
          'Тренируй формулировки: “я сначала читаю данные”, “не теряю проблемные строки”, “проверяю связи и логи”.',
      },
      {
        title: 'Финальная стратегия',
        minutes: 15,
        content: [
          'Для SELECT-задач держи в голове порядок: SELECT, FROM, JOIN, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.',
          'Для расследований начинай с бизнес-сущности и двигайся по связям: заказ -> клиент -> позиции -> товары -> оплаты -> логи.',
        ],
        sql: `SELECT c.name, COUNT(o.id) AS orders_count, SUM(o.total_amount) AS total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY total DESC;`,
        engineerNote:
          'На финальном экзамене важна не магия SQL, а спокойная последовательность расследования.',
      },
    ],
    quiz: [
      q('Как лучше объяснить JOIN на интервью?', ['Через бизнес-связь таблиц и пример', 'Только как математическое слово', 'Сказать, что не нужен'], 0, 'Инженерный ответ связывает синтаксис с задачей.'),
      q('С чего начать расследование “заказ не отгрузился”?', ['С бизнес-сущности и связанных таблиц', 'С изменения данных', 'С удаления логов'], 0, 'Сначала читаем orders/order_items/products/inventory/logs.'),
      q('Что важно при исправлении данных?', ['Проверка SELECT, транзакция, rollback-план', 'Быстрее нажать UPDATE', 'Не смотреть WHERE'], 0, 'Безопасность изменений - зрелая инженерная привычка.'),
    ],
    task: task(
      'Финальный диагностический запрос',
      'Построй запрос по заказу 1004: клиент, статус заказа, статус оплаты и лог интеграции.',
      `SELECT o.id, c.name, o.status AS order_status,
       p.status AS payment_status, l.message
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN payments p ON p.order_id = o.id
LEFT JOIN integration_logs l ON l.entity_type = 'order' AND l.entity_id = o.id
WHERE o.id = 1004;`,
      'Собери цепочку через LEFT JOIN, чтобы не потерять строку при отсутствующей связи.',
    ),
  },
]

export const erpCases = [
  {
    title: 'Клиент оплатил, статус заказа не paid',
    tables: 'orders, payments, integration_logs',
    approach: 'Проверить captured payment, статус заказа и ошибки PAYMENT_GATEWAY по entity_id заказа.',
  },
  {
    title: 'Заказ не отгружается',
    tables: 'orders, order_items, products, inventory',
    approach: 'Сравнить позиции заказа с остатками, найти inactive products и нулевой stock.',
  },
  {
    title: 'В отчёте пропала продажа',
    tables: 'orders, customers, payments',
    approach: 'Проверить INNER JOIN: возможно, отчёт теряет заказ из-за отсутствующего customer_id.',
  },
  {
    title: 'Интеграция создала плохие остатки',
    tables: 'inventory, products, integration_logs',
    approach: 'Найти inventory.product_id без products.id и связать с логами WMS.',
  },
]

export const interviewPrompts = [
  {
    question: 'Чем INNER JOIN отличается от LEFT JOIN?',
    answer:
      'INNER JOIN показывает только найденные связи. LEFT JOIN сохраняет все строки слева, поэтому подходит для диагностики: например, найти заказы без клиента или платежи без заказа.',
  },
  {
    question: 'Как бы ты проверил проблему “оплата прошла, заказ не обновился”?',
    answer:
      'Я бы начал с orders по id заказа, затем LEFT JOIN к payments и integration_logs. Проверил бы payment status, order status, сумму и сообщения интеграции. Данные менять стал бы только после подтверждения причины.',
  },
  {
    question: 'WHERE и HAVING - в чём разница?',
    answer:
      'WHERE фильтрует строки до группировки, HAVING фильтрует группы после GROUP BY. Например, status = paid в WHERE, а COUNT(*) > 5 в HAVING.',
  },
  {
    question: 'Что такое foreign key с практической точки зрения?',
    answer:
      'Это ссылка на родительскую таблицу, которая помогает держать целостность. В ERP это значит: заказ связан с клиентом, позиция заказа с товаром, платёж с заказом.',
  },
]

export const sqlReference = [
  { command: 'SELECT', use: 'Выбрать данные из таблиц', example: 'SELECT id, name FROM customers;' },
  { command: 'WHERE', use: 'Отфильтровать строки', example: "WHERE status = 'paid'" },
  { command: 'JOIN', use: 'Связать таблицы по ключам', example: 'LEFT JOIN payments p ON p.order_id = o.id' },
  { command: 'GROUP BY', use: 'Собрать строки в группы', example: 'GROUP BY status' },
  { command: 'HAVING', use: 'Фильтровать агрегированные группы', example: 'HAVING COUNT(*) > 1' },
  { command: 'COALESCE', use: 'Подставить значение вместо NULL', example: "COALESCE(city, 'unknown')" },
  { command: 'EXISTS', use: 'Проверить наличие связанной строки', example: 'WHERE EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id)' },
  { command: 'BEGIN / ROLLBACK', use: 'Проверить изменения внутри транзакции', example: 'BEGIN; UPDATE ...; ROLLBACK;' },
]

export const finalExam = [
  'Найди заказы без корректного клиента.',
  'Покажи товары с нулевым или отсутствующим остатком.',
  'Посчитай сумму заказов по клиентам и оставь клиентов с total > 500.',
  'Найди платежи, которые не связаны с заказом.',
  'Объясни словами, как расследуешь ошибку “оплата есть, статус заказа старый”.',
]
