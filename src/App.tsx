import { useEffect, useMemo, useState } from 'react'
import initSqlJs, { type Database } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  DatabaseZap,
  Table2,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  Play,
  RotateCcw,
  TerminalSquare,
} from 'lucide-react'
import { conceptExplanations, moduleConcepts } from './data/concepts'
import type { ConceptExplanation, ConceptTable } from './data/concepts'
import { erpCases, finalExam, interviewPrompts, modules, sqlReference } from './data/course'
import { firstSqlStory, relationshipSteps, tableAnatomy, tableRelations, visualTables } from './data/foundation'
import { beginnerGlossary, interviewCoverage, memoryMethod, recallCards, sourceTakeaways, syntaxDictionary, workedExamples } from './data/learning'
import type { VisualTable } from './data/foundation'
import type { WorkedExample } from './data/learning'
import { schemaSummary, seedSql } from './lib/sqlSeed'
import { defaultProgress, loadProgress, resetStoredProgress, saveProgress } from './lib/storage'
import { cn } from './lib/utils'
import type { CourseModule, NavItem, ProgressState, ViewId } from './types'
import { Badge, Button, Card, Progress, SqlCode } from './components/ui'

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
  { id: 'modules', label: 'Модули', icon: BookOpen },
  { id: 'tables', label: 'ERP-таблицы', icon: Table2 },
  { id: 'sandbox', label: 'SQL-песочница', icon: TerminalSquare },
  { id: 'cases', label: 'ERP-кейсы', icon: DatabaseZap },
  { id: 'interview', label: 'Собеседование', icon: FileQuestion },
  { id: 'reference', label: 'Справочник', icon: GraduationCap },
]

const threeDayPlan = [
  {
    day: 'День 1',
    title: 'Понять базу и перестать бояться SQL',
    focus: 'Модули 0-2: таблицы, id, SELECT, WHERE, JOIN.',
    schedule: ['Утро: пройти Модуль 0 и нарисовать связи customers -> orders -> payments.', 'День: 20 запросов SELECT/WHERE в песочнице.', 'Вечер: 10 раз вслух объяснить INNER JOIN и LEFT JOIN на примере заказа.'],
    result: 'Ты можешь найти заказ, клиента, оплату и объяснить, почему данные лежат в разных таблицах.',
  },
  {
    day: 'День 2',
    title: 'Научиться расследовать данные',
    focus: 'Модули 3-6: GROUP BY, HAVING, NULL, COALESCE, EXISTS, транзакции.',
    schedule: ['Утро: агрегаты и отчёты по заказам.', 'День: найти плохие связи через LEFT JOIN и NOT EXISTS.', 'Вечер: проговорить безопасный UPDATE: SELECT -> BEGIN -> UPDATE -> проверка -> COMMIT/ROLLBACK.'],
    result: 'Ты умеешь считать метрики, находить отсутствующие связи и говорить про изменения данных безопасно.',
  },
  {
    day: 'День 3',
    title: 'Собрать всё в интервью ERP Engineer',
    focus: 'Модули 7-8, ERP-кейсы, финальный экзамен.',
    schedule: ['Утро: решить 4 ERP-кейса: оплата, отгрузка, интеграция, отчёт.', 'День: пройти все тесты и финальный экзамен.', 'Вечер: тренировка ответов по шаблону “симптом -> таблицы -> запрос -> вывод -> осторожность”.'],
    result: 'Ты отвечаешь не книжно, а как инженер: понимаешь процесс, данные, риски и следующий шаг.',
  },
]

const learningLoop = [
  { step: '1. Смотри', text: 'Прочитай короткое объяснение и пример SQL. Не пытайся запомнить всё сразу.' },
  { step: '2. Повтори', text: 'Скопируй запрос в песочницу, выполни, поменяй одно условие и снова выполни.' },
  { step: '3. Объясни', text: 'Скажи вслух простыми словами: “этот запрос ищет заказы без клиента, потому что...”' },
  { step: '4. Реши кейс', text: 'Привяжи SQL к ERP-ситуации: оплата не прошла, заказ не отгрузился, импорт дал ошибку.' },
]

const sqlThinkingSteps = [
  'Какая бизнес-проблема? Например: заказ оплачен, но статус старый.',
  'Какая главная таблица? Обычно orders.',
  'Какие связанные таблицы нужны? customers, payments, order_items, products, inventory, integration_logs.',
  'Какой JOIN не потеряет проблему? Для диагностики чаще LEFT JOIN.',
  'Какой фильтр сузит поиск? id заказа, статус, дата, source_system.',
  'Что сказать по результату? Нашёл причину, проверил связь, менять данные пока рано или безопасно через транзакцию.',
]

const interviewFormula = [
  'Симптом: что видит пользователь или бизнес.',
  'Гипотезы: где может быть сбой.',
  'Таблицы: какие данные проверяю.',
  'SQL: какой запрос напишу.',
  'Вывод: что означает результат.',
  'Осторожность: перед UPDATE делаю SELECT, транзакцию и rollback-план.',
]

const conceptDeepDives: Record<string, {
  why: string
  readOrder: string[]
  examples: Array<{ title: string; sql: string; explanation: string }>
  interview: string
  memory: string
}> = {
  'table-basics': {
    why: 'Эта подтема нужна, чтобы ученик не думал о базе как о чёрном ящике. На собеседовании важно спокойно сказать, где лежит клиент, где заказ, где оплата и почему это разные таблицы.',
    readOrder: [
      'Сначала назови таблицу: customers, orders или payments.',
      'Потом найди строку: один клиент, один заказ или один платёж.',
      'Потом смотри колонки: id, status, amount, order_date.',
      'Ячейка - это конкретное значение, например status = payment_pending.',
    ],
    examples: [
      {
        title: 'Посмотреть клиентов',
        sql: `SELECT id, name, city
FROM customers;`,
        explanation: 'SELECT выбирает три колонки, FROM говорит, что берём их из таблицы customers.',
      },
      {
        title: 'Посмотреть заказы',
        sql: `SELECT id, customer_id, status, total_amount
FROM orders;`,
        explanation: 'customer_id показывает связь заказа с клиентом, но сам клиент хранится в другой таблице.',
      },
    ],
    interview: 'Я сначала определяю главную таблицу процесса: для заказа это orders, для оплаты payments, для ошибок интеграции integration_logs.',
    memory: 'Таблица - лист. Строка - запись. Колонка - свойство. Ячейка - значение.',
  },
  'data-types': {
    why: 'Типы данных нужны, чтобы фильтры работали предсказуемо. Новичок часто ставит кавычки везде и потом не понимает, почему база не нашла строку.',
    readOrder: [
      'Текст сравнивай в кавычках: status = \'paid\'.',
      'Числа сравнивай без кавычек: id = 1004.',
      'Даты пиши в кавычках в формате YYYY-MM-DD.',
      'Сначала проверь тип колонки, потом пиши WHERE.',
    ],
    examples: [
      {
        title: 'Числовой id',
        sql: `SELECT id, status
FROM orders
WHERE id = 1004;`,
        explanation: 'id - число, поэтому 1004 пишется без кавычек.',
      },
      {
        title: 'Текстовый статус и дата',
        sql: `SELECT id, status, order_date
FROM orders
WHERE status = 'paid'
  AND order_date = '2026-02-13';`,
        explanation: 'status и order_date записаны в кавычках, потому что это текстовое значение и дата.',
      },
    ],
    interview: 'Я смотрю на тип поля: id и amount фильтрую как числа, status и date пишу в кавычках.',
    memory: 'Кавычки: текст и дата. Без кавычек: число.',
  },
  'primary-key': {
    why: 'PRIMARY KEY объясняет, почему ERP связывает данные по id, а не по имени. Это основа почти всех JOIN-запросов.',
    readOrder: [
      'Найди колонку id в родительской таблице.',
      'Проверь, что каждое значение id уникально.',
      'Используй id как стабильный адрес строки.',
      'Не строй связи по имени клиента или названию товара.',
    ],
    examples: [
      {
        title: 'Найти клиента по id',
        sql: `SELECT id, name, city
FROM customers
WHERE id = 5;`,
        explanation: 'Даже если название клиента изменится, id = 5 останется той же записью.',
      },
      {
        title: 'Увидеть id товаров',
        sql: `SELECT id, name, price
FROM products
ORDER BY id;`,
        explanation: 'id товара нужен, чтобы order_items мог ссылаться на product_id.',
      },
    ],
    interview: 'PRIMARY KEY - это уникальный id строки. Он защищает связи от дублей, переименований и путаницы.',
    memory: 'PRIMARY KEY = постоянный адрес записи.',
  },
  'foreign-key': {
    why: 'FOREIGN KEY показывает, как таблицы разговаривают друг с другом. Без него ученик не поймёт, почему заказ хранит customer_id, а не имя клиента.',
    readOrder: [
      'Найди дочернюю таблицу: orders, payments, order_items.',
      'Найди колонку-ссылку: customer_id, order_id, product_id.',
      'Найди родительскую таблицу: customers, orders, products.',
      'Прочитай связь как стрелку: orders.customer_id -> customers.id.',
    ],
    examples: [
      {
        title: 'Заказы клиента 5',
        sql: `SELECT id, customer_id, status
FROM orders
WHERE customer_id = 5;`,
        explanation: 'customer_id = 5 означает, что эти заказы принадлежат клиенту с customers.id = 5.',
      },
      {
        title: 'Платежи заказа 1004',
        sql: `SELECT id, order_id, amount, status
FROM payments
WHERE order_id = 1004;`,
        explanation: 'order_id связывает оплату с заказом из таблицы orders.',
      },
    ],
    interview: 'FOREIGN KEY - это ссылка из одной таблицы на id другой таблицы. Так ERP понимает, какой клиент сделал заказ и какой платёж относится к заказу.',
    memory: 'FOREIGN KEY = стрелка на чужой id.',
  },
  'select-from-where': {
    why: 'Это первая рабочая форма SQL. С неё начинается почти любое расследование: выбрать нужные колонки, выбрать таблицу, оставить нужные строки.',
    readOrder: [
      'FROM: сначала мысленно выбери главную таблицу, хотя в SQL она стоит второй строкой.',
      'WHERE: затем сузь строки до нужного заказа, клиента, периода или статуса.',
      'SELECT: в конце реши, какие колонки нужны человеку для вывода.',
      'На собеседовании объясняй запрос именно в таком порядке: откуда, какие строки, что показать.',
    ],
    examples: [
      {
        title: 'Найти заказ 1004',
        sql: `SELECT id, customer_id, status, total_amount
FROM orders
WHERE id = 1004;`,
        explanation: 'Главная таблица orders, фильтр по одному заказу, выводим поля для диагностики.',
      },
      {
        title: 'Найти активных клиентов',
        sql: `SELECT id, name, city
FROM customers
WHERE active = 1;`,
        explanation: 'active = 1 оставляет только клиентов, которые сейчас используются в ERP.',
      },
    ],
    interview: 'Я начинаю с главной таблицы, ставлю WHERE, чтобы не читать всю базу, и выбираю только поля, которые нужны для вывода.',
    memory: 'Читать: FROM -> WHERE -> SELECT. Писать: SELECT -> FROM -> WHERE.',
  },
  'where-filters': {
    why: 'Фильтры превращают базу из огромной простыни в короткий список строк. Для ERP-собеса это навык быстро найти нужные заказы, оплаты и ошибки.',
    readOrder: [
      'WHERE вводит фильтр.',
      'AND значит, что должны совпасть все условия.',
      'OR значит, что достаточно одного условия.',
      'IN заменяет несколько OR по одной колонке.',
      'BETWEEN включает обе границы диапазона.',
    ],
    examples: [
      {
        title: 'Заказы в проблемных статусах',
        sql: `SELECT id, status, order_date
FROM orders
WHERE status IN ('new', 'payment_pending');`,
        explanation: 'IN короче, чем status = \'new\' OR status = \'payment_pending\'.',
      },
      {
        title: 'Заказы за февраль',
        sql: `SELECT id, status, order_date
FROM orders
WHERE order_date BETWEEN '2026-02-01' AND '2026-02-28';`,
        explanation: 'BETWEEN берёт даты включительно: и 1 февраля, и 28 февраля попадают в результат.',
      },
    ],
    interview: 'WHERE сужает расследование. Я комбинирую status, date и id, чтобы проверить ровно нужный кусок ERP-процесса.',
    memory: 'WHERE - сито. AND - оба. OR - любой. IN - список. BETWEEN - коридор.',
  },
  'like-patterns': {
    why: 'LIKE нужен, когда точного значения нет, но есть кусок текста: слово в логе, часть артикула, часть имени клиента.',
    readOrder: [
      'Выбери текстовую колонку: message, name, sku.',
      'Поставь LIKE вместо =.',
      'Добавь % слева и справа, если ищешь слово внутри строки.',
      'Помни: без % это почти точное сравнение.',
    ],
    examples: [
      {
        title: 'Найти ошибки про клиента',
        sql: `SELECT id, source_system, message
FROM integration_logs
WHERE message LIKE '%customer%';`,
        explanation: '%customer% ищет слово customer в любом месте сообщения.',
      },
      {
        title: 'Найти товары по артикулу',
        sql: `SELECT id, sku, name
FROM products
WHERE sku LIKE 'ERP-%';`,
        explanation: 'ERP-% означает: строка начинается с ERP-, дальше может быть любой текст.',
      },
    ],
    interview: 'LIKE использую для разведки по тексту, особенно в integration_logs, когда знаю часть сообщения ошибки.',
    memory: '% = любой хвост текста.',
  },
  'alias-as': {
    why: 'Алиасы нужны, чтобы запрос с несколькими таблицами читался коротко, а одинаковые колонки не путались между собой.',
    readOrder: [
      'orders o: o теперь короткое имя таблицы orders.',
      'payments p: p теперь короткое имя таблицы payments.',
      'o.status - статус заказа.',
      'p.status - статус платежа.',
      'AS payment_status меняет подпись колонки в результате, не меняя базу.',
    ],
    examples: [
      {
        title: 'Два статуса без путаницы',
        sql: `SELECT o.status AS order_status,
       p.status AS payment_status
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id;`,
        explanation: 'AS делает результат понятным: видно, где статус заказа, а где статус оплаты.',
      },
      {
        title: 'Короткие имена таблиц',
        sql: `SELECT o.id, o.total_amount
FROM orders o
WHERE o.id = 1004;`,
        explanation: 'o - алиас orders. В простом запросе он не обязателен, но готовит к JOIN.',
      },
    ],
    interview: 'Алиас - это короткое имя таблицы или понятное имя колонки в результате. Он не меняет структуру базы.',
    memory: 'Алиас таблицы = короткое имя. AS = подпись в отчёте.',
  },
  'join-on': {
    why: 'JOIN нужен, когда ответа нет в одной таблице. Заказ лежит в orders, имя клиента в customers, оплата в payments, поэтому данные приходится соединять по id.',
    readOrder: [
      'Левая таблица - та, которая стоит после FROM. В FROM orders o левой базовой таблицей будет orders.',
      'JOIN customers c подключает правую таблицу customers.',
      'ON c.id = o.customer_id объясняет правило связи.',
      'После JOIN можно выбрать колонки из обеих таблиц: o.id и c.name.',
    ],
    examples: [
      {
        title: 'Заказ + клиент',
        sql: `SELECT o.id, c.name, o.status
FROM orders o
JOIN customers c ON c.id = o.customer_id;`,
        explanation: 'ON связывает customer_id из заказа с id клиента.',
      },
      {
        title: 'Позиции заказа + товары',
        sql: `SELECT oi.order_id, p.name, oi.quantity
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = 1004;`,
        explanation: 'order_items хранит product_id, а название товара берётся из products.',
      },
    ],
    interview: 'JOIN соединяет таблицы по ключам. Я всегда объясняю ON: какая колонка из одной таблицы равна какой колонке из другой.',
    memory: 'JOIN = подключи таблицу. ON = правило склейки.',
  },
  'left-vs-inner-join': {
    why: 'Разница INNER и LEFT нужна для диагностики. INNER JOIN может спрятать проблему, а LEFT JOIN оставляет строки слева и показывает NULL справа.',
    readOrder: [
      'Левая таблица - таблица после FROM. В FROM orders o это orders.',
      'LEFT JOIN сохраняет все строки из orders.',
      'Если клиента справа нет, колонки customers будут NULL.',
      'WHERE c.id IS NULL оставляет только строки, где связь не нашлась.',
    ],
    examples: [
      {
        title: 'Найти заказы без клиента',
        sql: `SELECT o.id, o.customer_id
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;`,
        explanation: 'orders - левая таблица. Заказ не исчезает, даже если клиента справа нет.',
      },
      {
        title: 'Платежи без заказа',
        sql: `SELECT p.id, p.order_id, p.amount
FROM payments p
LEFT JOIN orders o ON o.id = p.order_id
WHERE o.id IS NULL;`,
        explanation: 'payments теперь левая таблица. Так ищем оплату, которая указывает на несуществующий заказ.',
      },
    ],
    interview: 'INNER JOIN беру для отчётов по корректным связям. LEFT JOIN беру для диагностики, чтобы не потерять проблемную строку.',
    memory: 'LEFT = все слева остаются. IS NULL = справа не нашлось.',
  },
  'aggregates-group-by': {
    why: 'Агрегации нужны для отчётов: не отдельные строки, а итоги по статусам, клиентам, товарам.',
    readOrder: [
      'FROM выбирает таблицу с исходными строками.',
      'GROUP BY решает, по чему собрать группы.',
      'COUNT считает строки внутри группы.',
      'SUM складывает суммы внутри группы.',
      'SELECT показывает название группы и расчёты.',
    ],
    examples: [
      {
        title: 'Сколько заказов в каждом статусе',
        sql: `SELECT status, COUNT(*) AS orders_count
FROM orders
GROUP BY status;`,
        explanation: 'Каждый статус становится отдельной группой.',
      },
      {
        title: 'Сумма заказов по клиентам',
        sql: `SELECT customer_id, SUM(total_amount) AS total
FROM orders
GROUP BY customer_id;`,
        explanation: 'GROUP BY customer_id собирает все заказы одного клиента в одну группу.',
      },
    ],
    interview: 'GROUP BY использую, когда вопрос звучит “сколько”, “на какую сумму”, “по каждому статусу или клиенту”.',
    memory: 'GROUP BY = по чему раскладываем кучки.',
  },
  having: {
    why: 'HAVING нужен, когда фильтр применяется не к отдельным строкам, а к уже посчитанным группам.',
    readOrder: [
      'WHERE фильтрует строки до группировки.',
      'GROUP BY собирает группы.',
      'COUNT или SUM считает результат в группе.',
      'HAVING оставляет только группы, которые прошли условие.',
    ],
    examples: [
      {
        title: 'Клиенты с двумя заказами и больше',
        sql: `SELECT customer_id, COUNT(*) AS orders_count
FROM orders
GROUP BY customer_id
HAVING COUNT(*) >= 2;`,
        explanation: 'COUNT(*) появляется после группировки, поэтому условие пишется в HAVING.',
      },
      {
        title: 'Статусы с суммой больше 1000',
        sql: `SELECT status, SUM(total_amount) AS total
FROM orders
GROUP BY status
HAVING SUM(total_amount) > 1000;`,
        explanation: 'WHERE здесь не подойдёт, потому что SUM считается уже после GROUP BY.',
      },
    ],
    interview: 'WHERE фильтрует сырьё, HAVING фильтрует итоговые группы.',
    memory: 'WHERE до групп. HAVING после групп.',
  },
  'null-coalesce': {
    why: 'NULL часто встречается в ERP: нет города, нет даты оплаты, нет связанной строки после LEFT JOIN. Его нельзя проверять обычным равенством.',
    readOrder: [
      'NULL означает: значения нет или оно неизвестно.',
      'IS NULL ищет пустые значения.',
      'IS NOT NULL ищет заполненные значения.',
      'COALESCE показывает запасной текст вместо NULL.',
    ],
    examples: [
      {
        title: 'Клиенты без города',
        sql: `SELECT id, name, city
FROM customers
WHERE city IS NULL;`,
        explanation: 'Для NULL нужен IS NULL, а не city = NULL.',
      },
      {
        title: 'Подставить подпись вместо NULL',
        sql: `SELECT id, name, COALESCE(city, 'city_missing') AS city_label
FROM customers;`,
        explanation: 'COALESCE не меняет базу, он только делает вывод понятнее.',
      },
    ],
    interview: 'NULL - это не ноль и не пустая строка. Я проверяю его через IS NULL и показываю понятный вывод через COALESCE.',
    memory: 'NULL не равен ничему. Поэтому IS NULL.',
  },
  distinct: {
    why: 'DISTINCT полезен для разведки: быстро понять, какие статусы, города или источники вообще есть в данных.',
    readOrder: [
      'Выбери одну или несколько колонок.',
      'DISTINCT уберёт повторяющиеся комбинации этих колонок.',
      'ORDER BY сделает список читаемым.',
      'Не используй DISTINCT, чтобы скрыть проблему дублей.',
    ],
    examples: [
      {
        title: 'Какие статусы есть у заказов',
        sql: `SELECT DISTINCT status
FROM orders
ORDER BY status;`,
        explanation: 'Каждый статус появится один раз.',
      },
      {
        title: 'Какие системы пишут логи',
        sql: `SELECT DISTINCT source_system
FROM integration_logs
ORDER BY source_system;`,
        explanation: 'Так можно понять, откуда вообще приходят интеграционные события.',
      },
    ],
    interview: 'DISTINCT помогает быстро увидеть уникальные значения, но если есть дубли, я отдельно ищу их причину.',
    memory: 'DISTINCT = список без повторов.',
  },
  'exists-not-exists': {
    why: 'EXISTS проверяет наличие связанной строки без размножения результата. Это удобно, когда нужно спросить: есть ли успешная оплата по каждому заказу.',
    readOrder: [
      'Внешний запрос идёт по orders o: берём один заказ за другим.',
      'Для каждого заказа внутренний запрос смотрит payments p.',
      'p.order_id = o.id связывает внутренний платёж с текущим заказом.',
      'p.status = \'captured\' уточняет, что нужна именно успешная оплата.',
      'SELECT 1 значит: колонки не важны, важен факт найденной строки.',
      'NOT EXISTS оставляет заказы, для которых такая строка не найдена.',
    ],
    examples: [
      {
        title: 'Заказы без успешной оплаты',
        sql: `SELECT o.id, o.status
FROM orders o
WHERE NOT EXISTS (
  SELECT 1
  FROM payments p
  WHERE p.order_id = o.id
    AND p.status = 'captured'
);`,
        explanation: 'Для каждого заказа спрашиваем: существует ли captured-платёж. Если нет - заказ остаётся в результате.',
      },
      {
        title: 'Клиенты, у которых есть заказы',
        sql: `SELECT c.id, c.name
FROM customers c
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = c.id
);`,
        explanation: 'EXISTS оставляет клиента, если нашёлся хотя бы один заказ с customer_id этого клиента.',
      },
    ],
    interview: 'EXISTS я использую как проверку “есть ли связанная строка”. SELECT 1 не выводит данные, а говорит базе: мне важен сам факт существования.',
    memory: 'EXISTS = есть? NOT EXISTS = нет?',
  },
  'dml-transactions': {
    why: 'На ERP-собеседовании важно показать осторожность. Читать данные можно смело, менять данные нужно только через проверку и транзакцию.',
    readOrder: [
      'Сначала SELECT с тем же WHERE, чтобы увидеть строки.',
      'BEGIN открывает транзакцию.',
      'UPDATE меняет только строки из WHERE.',
      'SELECT после UPDATE проверяет результат.',
      'ROLLBACK отменяет учебное изменение, COMMIT подтверждает реальное.',
    ],
    examples: [
      {
        title: 'Безопасная проверка UPDATE',
        sql: `SELECT id, status
FROM orders
WHERE id = 1004;`,
        explanation: 'Перед UPDATE сначала проверяем, что WHERE находит ровно нужный заказ.',
      },
      {
        title: 'Изменение с откатом',
        sql: `BEGIN;
UPDATE orders
SET status = 'paid'
WHERE id = 1004;
SELECT id, status FROM orders WHERE id = 1004;
ROLLBACK;`,
        explanation: 'ROLLBACK возвращает учебную базу в исходное состояние.',
      },
    ],
    interview: 'Перед изменением данных я делаю SELECT, затем транзакцию, проверку результата и только потом COMMIT или ROLLBACK.',
    memory: 'SELECT -> BEGIN -> UPDATE -> CHECK -> COMMIT/ROLLBACK.',
  },
  'on-delete': {
    why: 'ON DELETE показывает, что будет с дочерними строками, если удалить родительскую запись. В ERP это риск потери заказов, платежей или истории.',
    readOrder: [
      'Родительская таблица: customers, orders, products.',
      'Дочерняя таблица: orders, payments, order_items.',
      'RESTRICT запрещает удаление, если есть дочерние строки.',
      'CASCADE удаляет дочерние строки вместе с родителем.',
      'SET NULL оставляет дочернюю строку, но очищает ссылку.',
    ],
    examples: [
      {
        title: 'Запретить удалить клиента с заказами',
        sql: `FOREIGN KEY (customer_id)
REFERENCES customers(id)
ON DELETE RESTRICT;`,
        explanation: 'RESTRICT защищает историю заказов от случайного удаления клиента.',
      },
      {
        title: 'Опасный вариант',
        sql: `FOREIGN KEY (order_id)
REFERENCES orders(id)
ON DELETE CASCADE;`,
        explanation: 'CASCADE может удалить платежи вместе с заказом, поэтому в ERP его используют осторожно.',
      },
    ],
    interview: 'ON DELETE - это политика поведения связей при удалении родителя. В ERP я не ставлю CASCADE без понимания бизнес-риска.',
    memory: 'RESTRICT - стоп. CASCADE - удалить цепочкой. SET NULL - отвязать.',
  },
  'erp-debug-flow': {
    why: 'ERP Engineer нужен не для красивого SQL, а для расследования симптома: пользователь видит проблему, инженер переводит её в проверяемые таблицы и запросы.',
    readOrder: [
      'Сначала формулируем симптом: что сломалось для пользователя.',
      'Потом выбираем главную сущность: заказ, платёж, товар, лог.',
      'Потом добавляем связанные таблицы.',
      'Потом пишем SELECT, который проверяет гипотезу.',
      'После результата делаем вывод, но не меняем данные без проверки.',
    ],
    examples: [
      {
        title: 'Оплата есть, статус старый',
        sql: `SELECT o.id, o.status AS order_status,
       p.status AS payment_status,
       l.message
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
LEFT JOIN integration_logs l ON l.entity_type = 'order' AND l.entity_id = o.id
WHERE o.id = 1004;`,
        explanation: 'Проверяем заказ, оплату и логи одной диагностической цепочкой.',
      },
      {
        title: 'Ошибки интеграции по заказам',
        sql: `SELECT source_system, entity_id, status, message
FROM integration_logs
WHERE entity_type = 'order'
  AND status IN ('error', 'warning');`,
        explanation: 'Логи часто объясняют, почему внешний процесс не обновил ERP.',
      },
    ],
    interview: 'Я иду от симптома к таблицам: orders, payments, integration_logs. Потом проверяю связи и объясняю, что означает результат.',
    memory: 'Симптом -> таблицы -> связи -> SELECT -> вывод -> осторожное действие.',
  },
  'bad-links': {
    why: 'Плохие связи ломают отчёты и процессы: запись есть, но она указывает на несуществующего родителя. Такие строки надо уметь находить быстро.',
    readOrder: [
      'Выбери дочернюю таблицу слева: orders, payments или inventory.',
      'LEFT JOIN подключает родительскую таблицу справа.',
      'ON связывает FK с PK.',
      'WHERE parent.id IS NULL оставляет строки, где родитель не найден.',
    ],
    examples: [
      {
        title: 'Заказы без клиента',
        sql: `SELECT o.id, o.customer_id
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;`,
        explanation: 'customer_id заполнен, но клиента справа нет. Это orphan record.',
      },
      {
        title: 'Остатки без товара',
        sql: `SELECT i.id, i.product_id, i.qty
FROM inventory i
LEFT JOIN products p ON p.id = i.product_id
WHERE p.id IS NULL;`,
        explanation: 'Складская запись указывает на товар, которого нет в products.',
      },
    ],
    interview: 'Orphan record ищу через LEFT JOIN к родительской таблице и WHERE parent.id IS NULL.',
    memory: 'Дочерняя слева, родитель справа, NULL справа = связь сломана.',
  },
  'interview-answer-flow': {
    why: 'Собеседование проверяет не зубрёжку, а ход мысли. Нужно показать, как ты превращаешь проблему ERP в проверку данных.',
    readOrder: [
      'Назови симптом.',
      'Назови гипотезы.',
      'Назови таблицы.',
      'Покажи SELECT-запрос.',
      'Объясни возможный вывод.',
      'Скажи, что изменения делаешь только после проверки.',
    ],
    examples: [
      {
        title: 'Ответ по оплате',
        sql: `SELECT o.id, o.status AS order_status,
       p.status AS payment_status
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
WHERE o.id = 1004;`,
        explanation: 'Запрос показывает, прошла ли оплата и обновился ли статус заказа.',
      },
      {
        title: 'Ответ по потерянному заказу в отчёте',
        sql: `SELECT o.id, o.customer_id, c.name
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;`,
        explanation: 'Если INNER JOIN теряет заказ, LEFT JOIN покажет отсутствующую связь.',
      },
    ],
    interview: 'Я бы начал с симптома, проверил главные таблицы через SELECT, не потерял проблемные строки через LEFT JOIN и менял бы данные только после подтверждения причины.',
    memory: 'Симптом, гипотеза, таблицы, запрос, вывод, безопасность.',
  },
}

function App() {
  const [activeView, setActiveView] = useState<ViewId>('dashboard')
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())
  const [activeModuleId, setActiveModuleId] = useState(() => loadProgress().lastModuleId)
  const [sandboxSql, setSandboxSql] = useState(modules[1].task.starterSql)
  const [isHeaderCompact, setIsHeaderCompact] = useState(() => window.innerWidth < 1280)

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const activeModule = modules.find((module) => module.id === activeModuleId) ?? modules[0]
  const completedPercent = Math.round((progress.completedModules.length / modules.length) * 100)
  const averageQuiz = useMemo(() => {
    const scores = Object.values(progress.quizScores)
    return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
  }, [progress.quizScores])

  const setModule = (moduleId: string) => {
    setActiveModuleId(moduleId)
    setProgress((current) => ({
      ...current,
      lastModuleId: moduleId,
      startedModules: Array.from(new Set([...current.startedModules, moduleId])),
    }))
  }

  const completeModule = (moduleId: string) => {
    setProgress((current) => ({
      ...current,
      completedModules: Array.from(new Set([...current.completedModules, moduleId])),
      startedModules: Array.from(new Set([...current.startedModules, moduleId])),
    }))
  }

  const resetProgress = () => {
    resetStoredProgress()
    setProgress(defaultProgress)
    setActiveModuleId('module-0')
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="flex min-h-screen min-w-0">
        {/* Боковая панель оставлена только для desktop, чтобы планшеты не зажимали контент. */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-800 bg-slate-950/95 p-4 xl:block">
          <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-teal-400 text-slate-950">
                <DatabaseZap size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">SQL ERP</p>
                <p className="text-xs text-slate-400">Engineer Course</p>
              </div>
            </div>
            <Progress value={completedPercent} />
            <p className="mt-2 text-xs text-slate-400">{completedPercent}% курса завершено</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={cn(
                    'pointer-events-auto flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white active:bg-teal-400/20',
                    activeView === item.id && 'bg-slate-800 text-white',
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="w-full min-w-0 flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur-sm xl:px-8">
            {isHeaderCompact ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">SQL ERP Engineer Course</p>
                  <p className="text-xs text-slate-400">{completedPercent}% курса</p>
                </div>
                <Button variant="secondary" onClick={() => setIsHeaderCompact(false)}>
                  <ChevronDown size={16} />
                  Показать меню
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-teal-300">local interactive course</p>
                    <h1 className="mt-1 text-2xl font-semibold text-white lg:text-3xl">SQL ERP Engineer Course</h1>
                  </div>
                  <div className="grid grid-cols-3 gap-2 lg:gap-3">
                    <Metric label="Прогресс" value={`${completedPercent}%`} />
                    <Metric label="Тесты" value={`${averageQuiz}%`} />
                    <Metric label="Модулей" value={`${progress.completedModules.length}/${modules.length}`} />
                  </div>
                </div>
                <div className="mt-3 flex justify-end xl:hidden">
                  <Button variant="ghost" onClick={() => setIsHeaderCompact(true)}>
                    <ChevronUp size={16} />
                    Скрыть верхнюю панель
                  </Button>
                </div>
                <MobileNav
                  activeView={activeView}
                  onChange={(view) => {
                    setActiveView(view)
                    setIsHeaderCompact(window.innerWidth < 1280)
                  }}
                />
              </>
            )}
          </header>

          <div className="mx-auto w-full max-w-7xl px-4 py-6 xl:px-8">
            {activeView === 'dashboard' && (
              <Dashboard
                completedPercent={completedPercent}
                progress={progress}
                onOpenTables={() => setActiveView('tables')}
                onOpenSprint={() => setActiveView('sprint')}
                onOpenModules={() => setActiveView('modules')}
                onOpenSandbox={() => setActiveView('sandbox')}
                onReset={resetProgress}
              />
            )}
            {activeView === 'tables' && <TablesView />}
            {activeView === 'sprint' && <SprintView onOpenModules={() => setActiveView('modules')} onOpenSandbox={() => setActiveView('sandbox')} />}
            {activeView === 'map' && <CourseMap progress={progress} onSelect={setModule} onOpenModules={() => setActiveView('modules')} />}
            {activeView === 'modules' && (
              <ModulesView
                activeModule={activeModule}
                progress={progress}
                onSelect={setModule}
                onComplete={completeModule}
                onQuizScore={(moduleId, score) =>
                  setProgress((current) => ({
                    ...current,
                    quizScores: { ...current.quizScores, [moduleId]: score },
                  }))
                }
              />
            )}
            {activeView === 'sandbox' && <SqlSandbox initialSql={sandboxSql} />}
            {activeView === 'tests' && (
              <TestsView
                progress={progress}
                onQuizScore={(moduleId, score) =>
                  setProgress((current) => ({
                    ...current,
                    quizScores: { ...current.quizScores, [moduleId]: score },
                  }))
                }
              />
            )}
            {activeView === 'practice' && (
              <PracticeView
                onUseTask={(moduleId, starterSql) => {
                  setModule(moduleId)
                  setSandboxSql(starterSql)
                  setActiveView('sandbox')
                }}
              />
            )}
            {activeView === 'cases' && <CasesView />}
            {activeView === 'interview' && <InterviewView />}
            {activeView === 'exam' && <ExamView />}
            {activeView === 'reference' && <ReferenceView />}
          </div>
        </main>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="pointer-events-auto min-w-0 rounded-md border border-slate-800 bg-slate-900/70 px-2 py-2 sm:px-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-base font-semibold text-white lg:text-lg">{value}</p>
    </div>
  )
}

function MobileNav({ activeView, onChange }: { activeView: ViewId; onChange: (view: ViewId) => void }) {
  return (
    <div className="mt-4 xl:hidden">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                'flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition active:scale-[0.99]',
                activeView === item.id
                  ? 'border-teal-400 bg-teal-400 text-slate-950'
                  : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700 hover:bg-slate-800',
              )}
            >
              <Icon size={17} />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function moduleStatus(module: CourseModule, progress: ProgressState) {
  if (progress.completedModules.includes(module.id)) return { label: 'завершено', tone: 'teal' as const }
  if (progress.startedModules.includes(module.id)) return { label: 'в процессе', tone: 'amber' as const }
  return { label: 'не начато', tone: 'slate' as const }
}

function Dashboard({
  completedPercent,
  progress,
  onOpenTables,
  onOpenSprint,
  onOpenModules,
  onOpenSandbox,
  onReset,
}: {
  completedPercent: number
  progress: ProgressState
  onOpenTables: () => void
  onOpenSprint: () => void
  onOpenModules: () => void
  onOpenSandbox: () => void
  onReset: () => void
}) {
  const nextModule = modules.find((module) => !progress.completedModules.includes(module.id)) ?? modules[modules.length - 1]
  const lastModule = modules.find((module) => module.id === progress.lastModuleId) ?? modules[0]

  return (
    <div className="space-y-4 md:space-y-6">
      <SqlConfidenceIntro />
      <FoundationPrimer onOpenTables={onOpenTables} />
      <MemoryMethodSection />

      <section className="grid gap-4 md:gap-6 md:grid-cols-1 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden p-4 md:p-6 md:p-8">
          <div className="mb-6 md:mb-8 max-w-3xl">
            <Badge tone="teal">3-day ERP interview sprint</Badge>
            <h2 className="mt-4 text-2xl md:text-4xl font-semibold leading-tight text-white md:text-5xl">SQL для ERP Engineer за 3 дня: понятно, по шагам, с практикой</h2>
            <p className="mt-3 md:mt-4 max-w-2xl text-base md:text-lg text-slate-300">
              Не зубрим команды отдельно. Учимся думать как ERP-инженер: понять проблему, выбрать таблицы, написать запрос, объяснить вывод на собеседовании.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
            <Card className="pointer-events-auto p-3 lg:p-4">
              <p className="text-xs lg:text-sm text-slate-400">Где остановился</p>
              <p className="mt-2 text-sm lg:text-base font-semibold text-white">{lastModule.number}. {lastModule.title}</p>
            </Card>
            <Card className="pointer-events-auto p-3 lg:p-4">
              <p className="text-xs lg:text-sm text-slate-400">Следующий модуль</p>
              <p className="mt-2 text-sm lg:text-base font-semibold text-white">{nextModule.number}. {nextModule.title}</p>
            </Card>
            <Card className="pointer-events-auto p-3 lg:p-4">
              <p className="text-xs lg:text-sm text-slate-400">Фокус курса</p>
              <p className="mt-2 text-sm lg:text-base font-semibold text-white">JOIN, агрегации, плохие данные</p>
            </Card>
            <Card className="pointer-events-auto p-3 lg:p-4">
              <p className="text-xs lg:text-sm text-slate-400">Формат</p>
              <p className="mt-2 text-sm lg:text-base font-semibold text-white">Локально, без сервера</p>
            </Card>
          </div>
          <div className="mt-4 lg:mt-6 flex flex-wrap gap-2 lg:gap-3">
            <Button onClick={onOpenSprint} className="pointer-events-auto text-sm lg:text-base"><BookOpen size={16} />План на 3 дня</Button>
            <Button variant="secondary" onClick={onOpenModules} className="pointer-events-auto text-sm lg:text-base"><Play size={16} />Продолжить урок</Button>
            <Button variant="secondary" onClick={onOpenSandbox} className="pointer-events-auto text-sm lg:text-base"><TerminalSquare size={16} />Песочница</Button>
            <Button variant="danger" onClick={onReset} className="pointer-events-auto text-sm lg:text-base"><RotateCcw size={16} />Сброс</Button>
          </div>
        </Card>

        <Card className="pointer-events-auto p-3 lg:p-6">
          <h3 className="text-lg lg:text-xl font-semibold text-white">Состояние обучения</h3>
          <div className="mt-3 lg:mt-6">
            <div className="mb-2 flex items-center justify-between text-xs lg:text-sm">
              <span className="text-slate-300">Общий прогресс</span>
              <span className="font-semibold text-teal-200">{completedPercent}%</span>
            </div>
            <Progress value={completedPercent} />
          </div>
          <div className="mt-3 lg:mt-6 space-y-2 lg:space-y-3">
            {modules.slice(0, 5).map((module) => {
              const status = moduleStatus(module, progress)
              return (
                <div key={module.id} className="pointer-events-auto flex items-center justify-between gap-2 lg:gap-3 rounded-md border border-slate-800 bg-slate-900/50 p-2 lg:p-3">
                  <span className="text-xs lg:text-sm text-slate-200">{module.number}. {module.title}</span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
              )
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-3 lg:gap-4 grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="pointer-events-auto p-3 lg:p-6">
          <h3 className="text-lg lg:text-xl font-semibold text-white">Супер-метод для новичка</h3>
          <p className="mt-2 text-xs lg:text-sm text-slate-400">Один цикл на каждую тему. Так знания быстрее превращаются в навык и в нормальный ответ на интервью.</p>
          <div className="mt-3 lg:mt-5 grid gap-2 lg:gap-3 sm:grid-cols-2">
            {learningLoop.map((item) => (
              <div key={item.step} className="pointer-events-auto rounded-md border border-slate-800 bg-slate-900/50 p-2 lg:p-4">
                <p className="text-xs lg:text-sm font-semibold text-teal-200">{item.step}</p>
                <p className="mt-1 lg:mt-2 text-xs lg:text-sm text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="pointer-events-auto p-3 lg:p-6">
          <h3 className="text-lg lg:text-xl font-semibold text-white">Как решать любую SQL-задачу на ERP-собеседовании</h3>
          <div className="mt-3 lg:mt-5 space-y-2 lg:space-y-3">
            {sqlThinkingSteps.map((step, index) => (
              <div key={step} className="pointer-events-auto flex gap-2 lg:gap-3 rounded-md border border-slate-800 bg-slate-900/50 p-2 lg:p-3">
                <span className="grid size-6 lg:size-7 shrink-0 place-items-center rounded-md bg-teal-400 text-xs lg:text-sm font-bold text-slate-950">{index + 1}</span>
                <p className="text-xs lg:text-sm text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-2 lg:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {['ERP-схема', 'SELECT и фильтры', 'JOIN-диагностика', 'Интервью-ответы'].map((item) => (
          <Card key={item} className="pointer-events-auto p-3 lg:p-5">
            <CheckCircle2 className="mb-2 lg:mb-4 text-teal-300" size={20} />
            <h3 className="text-sm lg:text-base font-semibold text-white">{item}</h3>
            <p className="mt-1 lg:mt-2 text-xs lg:text-sm text-slate-400">От синтаксиса к реальным проверкам заказов, оплат и интеграций.</p>
          </Card>
        ))}
      </section>
    </div>
  )
}

function SqlConfidenceIntro() {
  return (
    <Card className="p-4 md:p-6">
      <Badge tone="teal">старт без страха</Badge>
      <h2 className="mt-3 text-2xl font-semibold text-white md:text-3xl">Почему SQL - это не страшно и не долго</h2>
      <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-300 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <p>SQL - это не язык программирования в обычном смысле. Это способ задать вопрос базе данных. Похоже на поиск, где ты пишешь “заказ 1004 статус”, только форма записи чуть строже.</p>
          <p>В ERP всё хранится в таблицах, почти как в Excel. SQL нужен, чтобы спросить: “покажи мне заказы за февраль, у которых оплата не прошла”. Такой запрос обычно занимает 4-5 строк.</p>
          <p>За 3 дня ты научишься находить, фильтровать и связывать данные. Этого достаточно для большинства задач ERP-инженера и для спокойного ответа на собеседовании.</p>
        </div>
        <div className="rounded-md border border-sky-400/20 bg-sky-400/10 p-4 text-sky-100">
          <p className="font-semibold text-white">Пример из жизни</p>
          <p className="mt-2">Представь, что ты идёшь к врачу и называешь симптом. Врач не лечит вслепую, а смотрит анализы. SQL - это способ смотреть анализы в ERP.</p>
        </div>
      </div>
    </Card>
  )
}

function FoundationPrimer({ onOpenTables }: { onOpenTables?: () => void }) {
  return (
    <section className="min-w-0 space-y-4 md:space-y-6">
      <Card className="p-4 md:p-6">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 2xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
          <div className="min-w-0">
            <Badge tone="teal">старт с нуля</Badge>
            <h3 className="mt-3 text-2xl font-semibold text-white md:text-3xl">Сначала видим таблицы, потом пишем SQL</h3>
            <p className="mt-3 text-slate-300">
              База данных в ERP похожа на книгу Excel, где каждый лист отвечает за одну тему: клиенты, заказы, оплаты, товары, склад.
              SQL нужен, чтобы задавать этим листам точные вопросы.
            </p>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
              {tableAnatomy.slice(0, 4).map((item) => (
                <div key={item.title} className="rounded-md border border-slate-800 bg-slate-900/55 p-3">
                  <p className="font-semibold text-teal-200">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <VisualDataTable table={visualTables[0]} focus="customers" onOpenTables={onOpenTables} />
            {onOpenTables && (
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 2xl:grid-cols-2">
                <VisualDataTable table={visualTables[1]} focus="orders" onOpenTables={onOpenTables} />
                <VisualDataTable table={visualTables[2]} focus="payments" onOpenTables={onOpenTables} />
              </div>
            )}
          </div>
        </div>
      </Card>

      <WhySplitTablesCard />
      <DataTypesCard />
      <KeyBasicsCard />

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="p-4 md:p-6">
          <h3 className="text-xl font-semibold text-white">Как таблицы разговаривают друг с другом</h3>
          <p className="mt-2 text-sm text-slate-400">Связь строится не по имени клиента, а по числовым id. Так ERP не путается, если название клиента изменится.</p>
          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
            <RelationNode title="customers" main="id = 5" detail="Delta Shop" tone="teal" />
            <RelationArrow label="customer_id" />
            <RelationNode title="orders" main="id = 1004" detail="customer_id = 5" tone="blue" />
            <RelationArrow label="order_id" />
            <RelationNode title="payments" main="id = 503" detail="order_id = 1004" tone="amber" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {relationshipSteps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-md border border-slate-800 bg-slate-900/55 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-teal-400 text-sm font-bold text-slate-950">{index + 1}</span>
                <p className="text-sm text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="text-xl font-semibold text-white">Первый SQL как обычная фраза</h3>
          <div className="mt-4"><SqlCode>{`SELECT id, status, total_amount
FROM orders
WHERE id = 1004;`}</SqlCode></div>
          <div className="mt-4 space-y-3">
            {firstSqlStory.map((item) => (
              <div key={item.sql} className="rounded-md border border-slate-800 bg-slate-900/55 p-3">
                <p className="font-mono text-sm font-semibold text-teal-200">{item.sql}</p>
                <p className="mt-2 text-sm text-slate-300">{item.explanation}</p>
                <p className="mt-1 text-xs text-slate-500">По-человечески: {item.plain}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}

function WhySplitTablesCard() {
  const allInOneRows = [
    ['1001', 'Delta Shop', 'Comrat', 'POS terminal', '780', 'paid'],
    ['1002', 'Delta Shop', 'Comrat', 'POS terminal', '780', 'new'],
    ['1003', 'Delta Shop', 'Comrat', 'Scanner', '210', 'shipped'],
  ]
  const normalizedTables = [
    { title: 'customers', columns: ['id', 'name', 'city'], rows: [['5', 'Delta Shop', 'Comrat']] },
    { title: 'products', columns: ['id', 'name', 'price'], rows: [['8', 'POS terminal', '780'], ['9', 'Scanner', '210']] },
    { title: 'orders', columns: ['id', 'customer_id', 'status'], rows: [['1001', '5', 'paid'], ['1002', '5', 'new']] },
  ]

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-xl font-semibold text-white">Зачем разделять данные на несколько таблиц?</h3>
      <p className="mt-2 text-sm text-slate-400">Сначала посмотрим на плохой вариант: всё сложили в одну большую таблицу.</p>
      <div className="mt-4 overflow-x-auto rounded-md border border-slate-800">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>{['order_id', 'customer_name', 'customer_city', 'product_name', 'product_price', 'status'].map((column) => <th key={column} className="px-3 py-2 font-mono text-xs">{column}</th>)}</tr>
          </thead>
          <tbody>
            {allInOneRows.map((row) => (
              <tr key={row.join('-')} className="odd:bg-slate-950 even:bg-slate-900/45">
                {row.map((cell) => <td key={cell + row[0]} className="border-t border-slate-800 px-3 py-2 text-slate-300">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <InfoBox title="1. Дублирование" text="Delta Shop, Comrat, POS terminal и 780 повторяются в каждой строке. Если у Delta Shop изменится город, нужно обновить сотни строк." tone="amber" />
        <InfoBox title="2. Ошибки" text="В одной строке написали Comrat, в другой comrat. Для системы это уже разные значения." tone="amber" />
        <InfoBox title="3. Размер" text="Большая таблица быстро растёт и становится медленнее, потому что в ней повторяется слишком много фактов." tone="amber" />
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {normalizedTables.map((table) => (
          <div key={table.title} className="overflow-hidden rounded-md border border-slate-800 bg-slate-950">
            <p className="border-b border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm font-semibold text-teal-200">{table.title}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[260px] text-left text-xs">
                <thead><tr>{table.columns.map((column) => <th key={column} className="border-b border-slate-800 px-3 py-2 font-mono text-slate-400">{column}</th>)}</tr></thead>
                <tbody>{table.rows.map((row) => <tr key={row.join('-')}>{row.map((cell) => <td key={cell + row[0]} className="border-b border-slate-800 px-3 py-2 text-slate-300">{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-300">ERP разделяет данные, чтобы каждый факт хранился ровно один раз. Связи по id позволяют собрать нужную картину одним запросом.</p>
    </Card>
  )
}

function DataTypesCard() {
  const cards = [
    { title: 'Текст (строка)', text: "Пишется в кавычках: 'paid', 'Chisinau', 'Delta Shop'.", sql: "WHERE status = 'paid'" },
    { title: 'Число', text: 'Пишется без кавычек: 1004, 990, 5.', sql: 'WHERE id = 1004' },
    { title: 'Дата', text: "Пишется как текст с кавычками в формате 'ГГГГ-ММ-ДД': '2026-02-01'.", sql: "WHERE order_date = '2026-02-01'" },
  ]

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-xl font-semibold text-white">Три вида данных, которые ты встретишь в каждой таблице</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-md border border-slate-800 bg-slate-900/55 p-4">
            <p className="font-semibold text-teal-200">{card.title}</p>
            <p className="mt-2 text-sm text-slate-300">{card.text}</p>
            <div className="mt-3"><SqlCode>{card.sql}</SqlCode></div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
        Частая ошибка новичка - написать WHERE id = '1004' с кавычками. Для числа кавычки не нужны, иначе база воспринимает его как текст и может не найти совпадение.
      </div>
    </Card>
  )
}

function KeyBasicsCard() {
  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-xl font-semibold text-white">PRIMARY KEY и FOREIGN KEY без тумана</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-teal-400/20 bg-teal-400/10 p-4">
          <p className="font-semibold text-white">PRIMARY KEY</p>
          <div className="mt-2 space-y-2 text-sm text-teal-100">
            <p>PRIMARY KEY - это главный уникальный номер строки. В customers каждый клиент получает свой id: 1, 2, 3, 4, 5.</p>
            <p>Зачем это нужно: имя клиента может измениться, город может измениться, но id = 5 всегда будет означать именно этого клиента.</p>
            <p>Пример: если Delta Shop переименовалась в Delta Market, поиск по имени может сломаться. WHERE customer_id = 5 найдёт этого клиента всегда.</p>
          </div>
        </div>
        <div className="rounded-md border border-sky-400/20 bg-sky-400/10 p-4">
          <p className="font-semibold text-white">FOREIGN KEY</p>
          <div className="mt-2 space-y-2 text-sm text-sky-100">
            <p>FOREIGN KEY - это колонка в одной таблице, которая содержит id из другой таблицы.</p>
            <p>В orders колонка customer_id со значением 5 означает: заказ принадлежит клиенту с id = 5 из customers.</p>
            <p>Частая ошибка: если в orders.customer_id написано 999, а клиента 999 нет, это orphan record - запись указывает в никуда.</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function VisualDataTable({ table, focus, onOpenTables }: { table: VisualTable; focus: string; onOpenTables?: () => void }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-teal-200">{table.name}</p>
            <p className="text-xs text-slate-400">{table.humanName}: {table.purpose}</p>
          </div>
          {onOpenTables ? (
            <button
              type="button"
              onClick={onOpenTables}
              className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-200 transition hover:bg-sky-400/20"
            >
              открыть все таблицы
            </button>
          ) : (
            <Badge tone="blue">реальная таблица</Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 p-3 md:hidden">
        {table.rows.map((row, rowIndex) => (
          <div key={`${focus}-mobile-${rowIndex}`} className="rounded-md border border-slate-800 bg-slate-900/55 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Строка {rowIndex + 1}</p>
              <Badge tone="slate">{table.name}</Badge>
            </div>
            <div className="grid gap-2">
              {table.columns.map((column, columnIndex) => (
                <div
                  key={`${focus}-${rowIndex}-${column.name}`}
                  className={cn(
                    'grid grid-cols-1 gap-1 rounded bg-slate-950/70 p-2 text-sm sm:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] sm:gap-3',
                    rowIndex === 1 && columnIndex === 0 && 'ring-1 ring-teal-400/40',
                    rowIndex === 1 && columnIndex === 2 && 'ring-1 ring-amber-400/30',
                  )}
                >
                  <div className="min-w-0">
                    <p className="break-words font-mono text-xs text-teal-200">{column.name}</p>
                    {column.kind && <p className="mt-1 text-[10px] uppercase text-slate-500">{column.kind}</p>}
                  </div>
                  <p className="min-w-0 break-words text-slate-200">{String(row[column.name])}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.name}
                  className={cn(
                    'border-b border-slate-800 px-3 py-3 font-mono text-xs uppercase text-slate-300',
                    column.kind === 'primary' && 'bg-teal-400/10 text-teal-200',
                    column.kind === 'foreign' && 'bg-sky-400/10 text-sky-200',
                  )}
                >
                  {column.name}
                  {column.kind === 'primary' && <span className="ml-2 rounded bg-teal-400/20 px-1.5 py-0.5 text-[10px]">PK</span>}
                  {column.kind === 'foreign' && <span className="ml-2 rounded bg-sky-400/20 px-1.5 py-0.5 text-[10px]">FK</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${focus}-${rowIndex}`} className={cn('odd:bg-slate-950 even:bg-slate-900/45', rowIndex === 1 && 'outline outline-1 outline-teal-400/40')}>
                {table.columns.map((column, columnIndex) => (
                  <td
                    key={column.name}
                    className={cn(
                      'border-b border-slate-800 px-3 py-3 text-slate-300',
                      rowIndex === 1 && columnIndex === 0 && 'bg-teal-400/10 font-semibold text-teal-100',
                      rowIndex === 1 && columnIndex === 2 && 'bg-amber-400/10 text-amber-100',
                    )}
                  >
                    {String(row[column.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 border-t border-slate-800 p-3 text-xs text-slate-400 sm:grid-cols-3">
        <p><span className="text-teal-200">PK</span> - главный id строки.</p>
        <p><span className="text-sky-200">FK</span> - ссылка на другую таблицу.</p>
        <p><span className="text-amber-200">Подсветка</span> - пример ячейки.</p>
      </div>
    </div>
  )
}

function FullDataTable({ table }: { table: VisualTable }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 p-3 md:hidden">
        {table.rows.map((row, rowIndex) => (
          <div key={`${table.name}-mobile-${rowIndex}`} className="rounded-md border border-slate-800 bg-slate-900/55 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Строка {rowIndex + 1}</p>
              <Badge tone="slate">{table.name}</Badge>
            </div>
            <div className="grid gap-2">
              {table.columns.map((column) => (
                <div key={`${table.name}-${rowIndex}-${column.name}`} className="grid grid-cols-1 gap-1 rounded bg-slate-950/70 p-2 text-sm sm:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] sm:gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-mono text-xs text-teal-200">{column.name}</p>
                    {column.kind && <p className="mt-1 text-[10px] uppercase text-slate-500">{column.kind}</p>}
                  </div>
                  <p className={cn('min-w-0 break-words text-slate-200', String(row[column.name]) === 'NULL' && 'font-mono text-amber-200')}>
                    {String(row[column.name])}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-900 text-slate-300">
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.name}
                  className={cn(
                    'border-b border-slate-800 px-4 py-3 font-mono text-xs uppercase',
                    column.kind === 'primary' && 'bg-teal-400/10 text-teal-200',
                    column.kind === 'foreign' && 'bg-sky-400/10 text-sky-200',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.name}</span>
                    {column.kind === 'primary' && <span className="rounded bg-teal-400/20 px-1.5 py-0.5 text-[10px]">PK</span>}
                    {column.kind === 'foreign' && <span className="rounded bg-sky-400/20 px-1.5 py-0.5 text-[10px]">FK</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${table.name}-full-${rowIndex}`} className="odd:bg-slate-950 even:bg-slate-900/45">
                {table.columns.map((column) => (
                  <td
                    key={`${table.name}-${rowIndex}-${column.name}`}
                    className={cn(
                      'border-b border-slate-800 px-4 py-3 text-slate-300',
                      String(row[column.name]) === 'NULL' && 'font-mono text-amber-200',
                    )}
                  >
                    {String(row[column.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RelationNode({ title, main, detail, tone }: { title: string; main: string; detail: string; tone: 'teal' | 'blue' | 'amber' }) {
  const tones = {
    teal: 'border-teal-400/30 bg-teal-400/10 text-teal-100',
    blue: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  }

  return (
    <div className={cn('rounded-lg border p-4', tones[tone])}>
      <p className="font-mono text-sm font-semibold">{title}</p>
      <p className="mt-2 text-lg font-semibold text-white">{main}</p>
      <p className="mt-1 text-sm">{detail}</p>
    </div>
  )
}

function RelationArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center text-xs text-slate-400 lg:flex-col">
      <span className="hidden h-px w-10 bg-slate-700 lg:block" />
      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 font-mono">{label}</span>
      <span className="hidden h-px w-10 bg-slate-700 lg:block" />
    </div>
  )
}

function MemoryMethodSection() {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="p-4 md:p-6">
        <Badge tone="amber">метод запоминания</Badge>
        <h3 className="mt-3 text-2xl font-semibold text-white">Как работать с каждым модулем - конкретная инструкция</h3>
        <p className="mt-3 text-sm text-slate-400">
          Один цикл на каждую тему: прочитать, запустить, объяснить и решить кейс.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {memoryMethod.map((item) => (
            <div key={item.title} className="rounded-md border border-slate-800 bg-slate-900/55 p-3">
              <p className="font-semibold text-teal-200">{item.title}</p>
              <p className="mt-2 text-sm text-slate-300">{item.text}</p>
            </div>
          ))}
        </div>
      </Card>
      <MemoryTrainer />
    </section>
  )
}

function MemoryTrainer() {
  const [openCard, setOpenCard] = useState(0)

  return (
    <Card className="p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge tone="teal">active recall</Badge>
          <h3 className="mt-3 text-2xl font-semibold text-white">Тренажёр памяти</h3>
          <p className="mt-2 text-sm text-slate-400">Сначала ответь сам, потом открой карточку. Так материал остаётся в голове.</p>
        </div>
        <Badge tone="blue">{openCard + 1}/{recallCards.length}</Badge>
      </div>
      <div className="mt-5 rounded-lg border border-slate-800 bg-slate-900/55 p-4">
        <p className="text-sm text-slate-400">Вопрос</p>
        <p className="mt-2 text-lg font-semibold text-white">{recallCards[openCard].question}</p>
        <details className="mt-4 rounded-md border border-slate-800 bg-slate-950/70 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-teal-200">Показать ответ после попытки</summary>
          <p className="mt-3 text-sm text-slate-300">{recallCards[openCard].answer}</p>
        </details>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {recallCards.map((card, index) => (
          <button
            key={card.question}
            type="button"
            onClick={() => setOpenCard(index)}
            className={cn(
              'rounded-md border px-3 py-2 text-sm font-semibold transition',
              openCard === index ? 'border-teal-400 bg-teal-400 text-slate-950' : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800',
            )}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </Card>
  )
}

function CoverageMatrix() {
  return (
    <Card className="p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge tone="blue">покрытие собеседования</Badge>
          <h3 className="mt-3 text-2xl font-semibold text-white">Что должно быть в голове к концу 3-го дня</h3>
          <p className="mt-2 text-sm text-slate-400">Это не список “почитать”. Это проверка: можешь ли ты объяснить и применить навык на ERP-кейсе.</p>
        </div>
        <Badge tone="teal">{interviewCoverage.length} навыков</Badge>
      </div>
      <div className="mt-5 overflow-hidden rounded-lg border border-slate-800">
        <div className="hidden grid-cols-[0.9fr_0.45fr_1.2fr] bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 md:grid">
          <div className="border-r border-slate-800 px-4 py-3">Навык</div>
          <div className="border-r border-slate-800 px-4 py-3">Где учить</div>
          <div className="px-4 py-3">Как понять, что умею</div>
        </div>
        {interviewCoverage.map((item) => (
          <div key={item.skill} className="grid gap-2 border-t border-slate-800 p-4 md:grid-cols-[0.9fr_0.45fr_1.2fr] md:gap-0 md:p-0">
            <div className="font-semibold text-white md:border-r md:border-slate-800 md:px-4 md:py-3">{item.skill}</div>
            <div className="text-sm text-teal-200 md:border-r md:border-slate-800 md:px-4 md:py-3">{item.module}</div>
            <div className="text-sm text-slate-300 md:px-4 md:py-3">{item.proof}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SprintView({ onOpenModules, onOpenSandbox }: { onOpenModules: () => void; onOpenSandbox: () => void }) {
  return (
    <div className="space-y-4 lg:space-y-6">
      <section className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="pointer-events-auto p-3 lg:p-6 lg:p-8">
          <Badge tone="teal">интенсив на 3 дня</Badge>
          <h2 className="mt-3 lg:mt-4 text-2xl lg:text-3xl font-semibold leading-tight text-white lg:text-4xl">Метод подготовки: минимум теории, максимум узнаваемых ERP-ситуаций</h2>
          <p className="mt-3 lg:mt-4 max-w-3xl text-sm lg:text-base text-slate-300">
            Цель не стать DBA за 3 дня. Цель - уверенно пройти собеседование ERP Engineer: читать схему, писать базовые запросы, находить плохие данные и объяснять ход мыслей.
          </p>
          <div className="mt-4 lg:mt-6 flex flex-wrap gap-2 lg:gap-3">
            <Button onClick={onOpenModules} className="pointer-events-auto text-sm lg:text-base"><BookOpen size={16} />Модули</Button>
            <Button variant="secondary" onClick={onOpenSandbox} className="pointer-events-auto text-sm lg:text-base"><TerminalSquare size={16} />SQL</Button>
          </div>
        </Card>

        <Card className="pointer-events-auto p-3 lg:p-6">
          <h3 className="text-lg lg:text-xl font-semibold text-white">Формула ответа на интервью</h3>
          <div className="mt-3 lg:mt-4 space-y-2 lg:space-y-3">
            {interviewFormula.map((item, index) => (
              <div key={item} className="pointer-events-auto flex gap-2 lg:gap-3 rounded-md bg-slate-900/60 p-2 lg:p-3">
                <span className="font-mono text-xs lg:text-sm text-teal-300">{index + 1}</span>
                <p className="text-xs lg:text-sm text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sourceTakeaways.map((item) => (
          <Card key={item.title} className="p-4">
            <h3 className="font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{item.text}</p>
          </Card>
        ))}
      </section>

      <CoverageMatrix />

      <section className="grid gap-2 lg:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {threeDayPlan.map((day) => (
          <Card key={day.day} className="pointer-events-auto p-3 lg:p-6">
            <Badge tone="blue">{day.day}</Badge>
            <h3 className="mt-2 lg:mt-3 text-lg lg:text-xl font-semibold text-white">{day.title}</h3>
            <p className="mt-2 text-xs lg:text-sm text-teal-100">{day.focus}</p>
            <div className="mt-3 lg:mt-5 space-y-2 lg:space-y-3">
              {day.schedule.map((item) => (
                <div key={item} className="pointer-events-auto rounded-md border border-slate-800 bg-slate-900/50 p-2 lg:p-3 text-xs lg:text-sm text-slate-300">{item}</div>
              ))}
            </div>
            <div className="mt-3 lg:mt-5 rounded-md border border-teal-400/20 bg-teal-400/10 p-2 lg:p-4 text-xs lg:text-sm text-teal-100">
              <strong>Итог дня:</strong> {day.result}
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-white">Что надо уметь к концу 3-го дня</h3>
          <div className="mt-4 space-y-3">
            {[
              'SELECT с WHERE, IN, BETWEEN, LIKE, ORDER BY, LIMIT.',
              'INNER JOIN для нормальных связей и LEFT JOIN для поиска проблем.',
              'COUNT, SUM, AVG, GROUP BY, HAVING для отчётов.',
              'NULL, COALESCE, DISTINCT без типичных ошибок новичка.',
              'EXISTS / NOT EXISTS для “есть связь” и “нет связи”.',
              'Безопасно объяснить INSERT, UPDATE, DELETE и транзакции.',
            ].map((item) => (
              <div key={item} className="flex gap-3 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 shrink-0 text-teal-300" size={17} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-semibold text-white">Мини-шаблон расследования ERP-проблемы</h3>
          <SqlCode>{`-- 1. Беру заказ как главную сущность
SELECT o.id, o.status, o.total_amount
FROM orders o
WHERE o.id = 1004;

-- 2. Добавляю связи и не теряю проблемные строки
SELECT o.id, c.name, p.status AS payment_status, l.message
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN payments p ON p.order_id = o.id
LEFT JOIN integration_logs l ON l.entity_type = 'order'
  AND l.entity_id = o.id
WHERE o.id = 1004;`}</SqlCode>
          <div className="mt-5 grid gap-3">
            {[
              {
                code: 'SELECT o.id, o.status, o.total_amount',
                text: 'Говорю базе: покажи номер заказа, его статус и сумму. Буква o - короткое имя таблицы orders, чтобы дальше не писать orders целиком.',
              },
              {
                code: 'FROM orders o',
                text: 'Начинаю с таблицы заказов, потому что проблема звучит про заказ. orders o значит: таблицу orders дальше называю коротко o.',
              },
              {
                code: 'WHERE o.id = 1004',
                text: 'Оставляю только один нужный заказ. Без WHERE я получил бы все заказы и быстро утонул бы в строках.',
              },
              {
                code: 'LEFT JOIN customers c ON c.id = o.customer_id',
                text: 'Добавляю клиента. c.id - id клиента в справочнике, o.customer_id - ссылка на клиента в заказе. LEFT JOIN нужен, чтобы заказ не пропал, даже если клиент не найден.',
              },
              {
                code: 'LEFT JOIN payments p ON p.order_id = o.id',
                text: 'Добавляю оплату. p.order_id показывает, к какому заказу относится платёж. Так проверяю: есть ли оплата и какой у неё статус.',
              },
              {
                code: "LEFT JOIN integration_logs l ON l.entity_type = 'order' AND l.entity_id = o.id",
                text: 'Добавляю лог интеграции. Беру только логи по заказам и только по текущему id заказа. Так можно увидеть ошибку внешней системы.',
              },
              {
                code: 'AS payment_status',
                text: 'AS даёт колонке понятное имя в результате. Без этого было бы просто status, и можно перепутать статус заказа со статусом оплаты.',
              },
            ].map((item, index) => (
              <div key={item.code} className="rounded-md border border-slate-800 bg-slate-900/55 p-3">
                <p className="font-mono text-sm text-teal-200">{index + 1}. {item.code}</p>
                <p className="mt-2 text-sm text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Такой шаблон легко объяснить: сначала нахожу заказ, потом смотрю клиента, оплату и лог интеграции.
          </p>
        </Card>
      </section>
    </div>
  )
}

function CourseMap({ progress, onSelect, onOpenModules }: { progress: ProgressState; onSelect: (id: string) => void; onOpenModules: () => void }) {
  return (
    <div className="space-y-6">
      <SectionTitle title="Карта курса" subtitle="9 модулей: от диагностики базы до финального ERP-интервью." />
      <div className="grid gap-4 lg:grid-cols-3">
        {modules.map((module) => {
          const status = moduleStatus(module, progress)
          return (
            <Card key={module.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge tone="blue">Модуль {module.number}</Badge>
                  <h3 className="mt-3 text-lg font-semibold text-white">{module.title}</h3>
                </div>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-400">{module.goal}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {module.topics.slice(0, 4).map((topic) => <Badge key={topic}>{topic}</Badge>)}
              </div>
              <Button className="mt-5 w-full" variant="secondary" onClick={() => { onSelect(module.id); onOpenModules() }}>
                Открыть модуль
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function TablesView() {
  const [activeTableName, setActiveTableName] = useState(visualTables[0].name)
  const [tableMode, setTableMode] = useState<'all' | 'single' | 'relations'>('all')
  const activeTable = visualTables.find((table) => table.name === activeTableName) ?? visualTables[0]

  return (
    <div className="space-y-6">
      <Card className="p-5 md:p-6">
        <Badge tone="teal">ERP data map</Badge>
        <h2 className="mt-3 text-3xl font-semibold text-white">ERP-таблицы: что входит в нашу учебную БД</h2>
        <p className="mt-3 max-w-3xl text-slate-300">
          Здесь видно всю структуру базы: какие есть таблицы, какие в них столбцы, какие строки уже лежат внутри и как таблицы связаны между собой.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { id: 'all' as const, label: 'Все таблицы', description: 'полный обзор БД' },
            { id: 'single' as const, label: 'Одна таблица', description: 'изучить подробно' },
            { id: 'relations' as const, label: 'Связи', description: 'PK/FK стрелки' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setTableMode(mode.id)}
              className={cn(
                'rounded-md border p-3 text-left transition',
                tableMode === mode.id
                  ? 'border-teal-400 bg-teal-400 text-slate-950'
                  : 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800',
              )}
            >
              <p className="font-semibold">{mode.label}</p>
              <p className={cn('mt-1 text-xs', tableMode === mode.id ? 'text-slate-800' : 'text-slate-400')}>{mode.description}</p>
            </button>
          ))}
        </div>
      </Card>

      {tableMode === 'all' && <AllTablesOverview onSelectTable={(name) => { setActiveTableName(name); setTableMode('single') }} />}

      {tableMode === 'single' && (
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="h-fit p-3 xl:sticky xl:top-28">
            <p className="px-2 pb-3 text-sm font-semibold text-white">Таблицы базы</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {visualTables.map((table) => (
                <button
                  key={table.name}
                  type="button"
                  onClick={() => setActiveTableName(table.name)}
                  className={cn(
                    'rounded-md border p-3 text-left transition',
                    activeTable.name === table.name
                      ? 'border-teal-400/50 bg-teal-400/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800',
                  )}
                >
                  <p className="font-mono text-sm font-semibold text-white">{table.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{table.humanName}</p>
                  <p className="mt-2 text-xs text-teal-200">{table.rows.length} строк · {table.columns.length} колонок</p>
                </button>
              ))}
            </div>
          </Card>

          <div className="min-w-0 space-y-6">
            <Card className="p-4 md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <Badge tone="teal">полная таблица</Badge>
                  <h3 className="mt-3 font-mono text-2xl font-semibold text-white">{activeTable.name}</h3>
                  <p className="mt-2 text-slate-300">{activeTable.purpose}</p>
                </div>
                <Badge tone="blue">{activeTable.rows.length} строк</Badge>
              </div>
              <div className="mt-5">
                <FullDataTable table={activeTable} />
              </div>
            </Card>

            <TableDetailsGrid table={activeTable} />
          </div>
        </div>
      )}

      {tableMode === 'relations' && <RelationsView />}
    </div>
  )
}

function AllTablesOverview({ onSelectTable }: { onSelectTable: (name: string) => void }) {
  const totalRows = visualTables.reduce((sum, table) => sum + table.rows.length, 0)
  const totalColumns = visualTables.reduce((sum, table) => sum + table.columns.length, 0)

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-5">
        <h3 className="text-xl font-semibold text-white">Состав базы данных</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Metric label="Таблиц" value={String(visualTables.length)} />
          <Metric label="Строк" value={String(totalRows)} />
          <Metric label="Столбцов" value={String(totalColumns)} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {visualTables.map((table) => (
            <button
              key={table.name}
              type="button"
              onClick={() => onSelectTable(table.name)}
              className="rounded-md border border-slate-800 bg-slate-900/55 p-4 text-left transition hover:border-teal-400/40 hover:bg-slate-800"
            >
              <p className="font-mono text-sm font-semibold text-teal-200">{table.name}</p>
              <p className="mt-1 text-sm font-semibold text-white">{table.humanName}</p>
              <p className="mt-2 text-sm text-slate-400">{table.purpose}</p>
              <p className="mt-3 text-xs text-slate-500">{table.rows.length} строк · {table.columns.length} столбцов</p>
            </button>
          ))}
        </div>
      </Card>

      {visualTables.map((table) => (
        <Card key={table.name} className="p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="font-mono text-2xl font-semibold text-white">{table.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{table.humanName}: {table.purpose}</p>
            </div>
            <Button variant="secondary" onClick={() => onSelectTable(table.name)}>Открыть подробно</Button>
          </div>
          <FullDataTable table={table} />
        </Card>
      ))}
    </div>
  )
}

function TableDetailsGrid({ table }: { table: VisualTable }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="p-4 md:p-5">
        <h4 className="text-lg font-semibold text-white">Колонки таблицы</h4>
        <div className="mt-4 grid gap-3">
          {table.columns.map((column) => (
            <div key={column.name} className="rounded-md border border-slate-800 bg-slate-900/55 p-3">
              <p className="font-mono text-sm text-teal-200">
                {column.name}
                {column.kind === 'primary' && ' · PRIMARY KEY'}
                {column.kind === 'foreign' && ' · FOREIGN KEY'}
              </p>
              <p className="mt-1 text-sm text-slate-300">{column.meaning}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-4 md:p-5">
          <h4 className="text-lg font-semibold text-white">Связи этой учебной ERP-базы</h4>
          <div className="mt-4 space-y-2">
            {tableRelations.map((relation) => (
              <div
                key={relation}
                className={cn(
                  'rounded-md border px-3 py-2 font-mono text-sm',
                  relation.startsWith(table.name) || relation.includes(`-> ${table.name}.`)
                    ? 'border-teal-400/30 bg-teal-400/10 text-teal-100'
                    : 'border-slate-800 bg-slate-900/55 text-slate-400',
                )}
              >
                {relation}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <h4 className="text-lg font-semibold text-white">Открыть эту таблицу через SQL</h4>
          <div className="mt-4"><SqlCode>{`SELECT *
FROM ${table.name};`}</SqlCode></div>
        </Card>
      </div>
    </div>
  )
}

function RelationsView() {
  return (
    <div className="space-y-6">
      <Card className="p-5 md:p-6">
        <h3 className="text-xl font-semibold text-white">Главная цепочка ERP</h3>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
          <RelationNode title="customers" main="id" detail="кто покупает" tone="teal" />
          <RelationArrow label="orders.customer_id" />
          <RelationNode title="orders" main="id" detail="заказ и статус" tone="blue" />
          <RelationArrow label="payments.order_id" />
          <RelationNode title="payments" main="id" detail="оплата заказа" tone="amber" />
        </div>
      </Card>
      <Card className="p-5 md:p-6">
        <h3 className="text-xl font-semibold text-white">Все связи</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tableRelations.map((relation) => (
            <div key={relation} className="rounded-md border border-slate-800 bg-slate-900/55 p-4 font-mono text-sm text-teal-200">
              {relation}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ModulesView({
  activeModule,
  progress,
  onSelect,
  onComplete,
  onQuizScore,
}: {
  activeModule: CourseModule
  progress: ProgressState
  onSelect: (id: string) => void
  onComplete: (id: string) => void
  onQuizScore: (moduleId: string, score: number) => void
}) {
  const concepts = (moduleConcepts[activeModule.id] ?? []).map((id) => conceptExplanations[id]).filter(Boolean)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="p-3 xl:hidden">
        <label htmlFor="mobile-module-select" className="text-sm font-semibold text-white">Выбор модуля</label>
        <select
          id="mobile-module-select"
          value={activeModule.id}
          onChange={(event) => onSelect(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-semibold text-white outline-none focus:border-teal-300"
        >
          {modules.map((module) => {
            const itemStatus = moduleStatus(module, progress)
            return (
              <option key={module.id} value={module.id}>
                {module.number}. {module.title} - {itemStatus.label}
              </option>
            )
          })}
        </select>
        <p className="mt-2 text-xs text-slate-400">Переключай уроки здесь, а ниже сразу идёт материал выбранного модуля.</p>
      </Card>

      <Card className="hidden h-fit p-3 xl:sticky xl:top-28 xl:block">
        {modules.map((module) => {
          const itemStatus = moduleStatus(module, progress)
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => onSelect(module.id)}
              className={cn(
                'w-full rounded-md border border-transparent p-3 text-left transition hover:border-slate-700 hover:bg-slate-900 xl:mb-2',
                activeModule.id === module.id && 'border-teal-400/40 bg-teal-400/10',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm font-semibold text-white">{module.number}. {module.title}</span>
                <span className={cn(
                  'size-2.5 shrink-0 rounded-full',
                  itemStatus.tone === 'teal' && 'bg-teal-300',
                  itemStatus.tone === 'amber' && 'bg-amber-300',
                  itemStatus.tone === 'slate' && 'bg-slate-600',
                )} />
              </div>
              <p className="mt-2 text-xs text-slate-400">{module.level} · {itemStatus.label}</p>
            </button>
          )
        })}
      </Card>

      <div className="w-full max-w-full min-w-0 space-y-6 xl:mx-auto xl:max-w-6xl">
        <Card className="p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold leading-tight text-white md:text-3xl">Модуль {activeModule.number}. {activeModule.title}</h2>
              <p className="mt-3 text-slate-300">{activeModule.goal}</p>
            </div>
            <Button className="w-full md:w-auto" onClick={() => onComplete(activeModule.id)}><CheckCircle2 size={17} />Завершить модуль</Button>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[1.25fr_0.9fr_0.85fr]">
            <div className="rounded-md border border-teal-400/30 bg-teal-400/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-100">
                <DatabaseZap size={17} />
                ERP-контекст
              </div>
              <p className="mt-2 text-sm text-slate-200">{activeModule.erpContext}</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/45 p-4">
              <p className="text-sm font-semibold text-white">Как работать с модулем</p>
              <p className="mt-2 text-sm text-slate-400">Прочитай пример, запусти SQL в песочнице, поменяй одно условие и запомни, какую ERP-проблему он проверяет.</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/45 p-4">
              <p className="text-sm font-semibold text-white">Фраза для собеседования</p>
              <p className="mt-2 text-sm text-slate-400">“Я проверю таблицы, связи и логи, потом объясню вывод”.</p>
            </div>
          </div>
        </Card>

        {activeModule.number === 0 && <FoundationPrimer />}

        <ConceptExplanationSection concepts={concepts} />

        <WorkedExampleCard example={workedExamples[activeModule.id]} />

        {activeModule.lessons.map((lesson) => (
          <Card key={lesson.title} className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold text-white">{lesson.title}</h3>
              <Badge>{lesson.minutes} мин</Badge>
            </div>
            <div className="mt-4 space-y-3 text-slate-300">
              {lesson.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            {lesson.sql && (
              <div className="mt-5 space-y-4">
                <SqlCode>{lesson.sql}</SqlCode>
                <SyntaxExplainer sql={lesson.sql} />
              </div>
            )}
            <div className="mt-5 rounded-md border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">{lesson.engineerNote}</div>
          </Card>
        ))}

        <QuizCard key={activeModule.id} module={activeModule} savedScore={progress.quizScores[activeModule.id]} onScore={onQuizScore} />
        <TaskCard title={`Мини-задание: ${activeModule.task.title}`} prompt={activeModule.task.prompt} sql={activeModule.task.starterSql} hint={activeModule.task.expectedHint} />
        {activeModule.id === modules[modules.length - 1].id && <ExamView embedded />}
      </div>
    </div>
  )
}

function ConceptExplanationSection({ concepts }: { concepts: ConceptExplanation[] }) {
  if (!concepts.length) return null

  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge tone="teal">вход в подтему</Badge>
          <h3 className="mt-3 text-2xl font-semibold text-white">Зачем эта тема и как читать запрос</h3>
          <p className="mt-2 text-sm text-slate-400">
            В каждой подтеме сначала разбираем, зачем она нужна в ERP, потом читаем SQL по шагам, смотрим примеры и готовим фразу для собеседования.
          </p>
        </div>
        <Badge tone="blue">↓ {concepts.length} тем ниже</Badge>
      </div>
      <div className="mt-5 space-y-4">
        {concepts.map((concept, index) => (
          <ConceptExplanationCard key={concept.id} concept={concept} defaultOpen={index === 0} />
        ))}
      </div>
    </Card>
  )
}

function ConceptExplanationCard({ concept, defaultOpen }: { concept: ConceptExplanation; defaultOpen?: boolean }) {
  const deepDive = conceptDeepDives[concept.id]

  return (
    <details open={defaultOpen} className="rounded-lg border border-slate-800 bg-slate-900/45">
      <summary className="cursor-pointer p-4 marker:text-teal-300">
        <span className="ml-2 text-lg font-semibold text-white">{concept.title}</span>
        <span className="ml-3 text-sm text-slate-400">{concept.short}</span>
      </summary>
      <div className="border-t border-slate-800 p-4 md:p-5">
        <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <InfoStrip title="Простая аналогия" text={concept.analogy} tone="teal" />
            <InfoStrip title="ERP-пример" text={concept.erpExample} tone="blue" />
            <InfoStrip title="Частая ошибка" text={concept.commonMistake} tone="amber" />
            <InfoStrip title="Запомнить" text={concept.remember} tone="slate" />
            {deepDive && <InfoStrip title="Зачем это нужно" text={deepDive.why} tone="slate" />}
          </div>
          <div className="space-y-4">
            {concept.tables && (
              <div className="grid gap-3 xl:grid-cols-2">
                {concept.tables.map((table) => <ConceptMiniTable key={table.title} table={table} />)}
              </div>
            )}
            {concept.arrows && (
              <div className="rounded-md border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold text-white">Связь визуально</p>
                <div className="mt-3 space-y-2">
                  {concept.arrows.map((arrow) => (
                    <p key={arrow} className="font-mono text-sm text-teal-200">{arrow}</p>
                  ))}
                </div>
              </div>
            )}
            {concept.sql && <SqlCode>{concept.sql}</SqlCode>}
          </div>
        </div>

        {deepDive && (
          <div className="mt-5 grid gap-4 2xl:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-md border border-slate-800 bg-slate-950/65 p-4">
              <p className="text-sm font-semibold text-white">Как читать этот запрос</p>
              <div className="mt-3 space-y-2">
                {deepDive.readOrder.map((step, index) => (
                  <div key={step} className="flex gap-3 rounded-md border border-slate-800 bg-slate-900/55 p-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-teal-400 text-xs font-bold text-slate-950">{index + 1}</span>
                    <p className="text-sm text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-md border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-100">
                <p className="font-semibold text-white">Фраза для собеседования</p>
                <p className="mt-2">{deepDive.interview}</p>
              </div>
              <div className="mt-3 rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                <p className="font-semibold text-white">Метод запоминания</p>
                <p className="mt-2">{deepDive.memory}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Ещё рабочие примеры</p>
              {deepDive.examples.map((example) => (
                <div key={`${concept.id}-${example.title}`} className="rounded-md border border-slate-800 bg-slate-950/65 p-4">
                  <p className="font-semibold text-teal-200">{example.title}</p>
                  <div className="mt-3"><SqlCode>{example.sql}</SqlCode></div>
                  <p className="mt-3 text-sm text-slate-300">{example.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <p className="text-sm font-semibold text-white">Разбор синтаксиса по частям</p>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {concept.breakdown.map((item) => (
              <div key={`${concept.id}-${item.part}`} className="rounded-md border border-slate-800 bg-slate-950/65 p-3">
                <p className="font-mono text-sm text-teal-200">{item.part}</p>
                <p className="mt-2 text-sm text-slate-300">{item.meaning}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </details>
  )
}

function ConceptMiniTable({ table }: { table: ConceptTable }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900 px-3 py-2">
        <p className="font-mono text-sm font-semibold text-teal-200">{table.title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-xs">
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th key={column} className="border-b border-slate-800 px-3 py-2 font-mono uppercase text-slate-400">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${table.title}-${rowIndex}`} className="odd:bg-slate-950 even:bg-slate-900/45">
                {row.map((cell, cellIndex) => (
                  <td key={`${table.title}-${rowIndex}-${cellIndex}`} className="border-b border-slate-800 px-3 py-2 text-slate-300">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InfoStrip({ title, text, tone }: { title: string; text: string; tone: 'teal' | 'blue' | 'amber' | 'slate' }) {
  const tones = {
    teal: 'border-teal-400/20 bg-teal-400/10 text-teal-100',
    blue: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
    slate: 'border-slate-700 bg-slate-950/70 text-slate-300',
  }

  return (
    <div className={cn('rounded-md border p-3 text-sm', tones[tone])}>
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2">{text}</p>
    </div>
  )
}

function WorkedExampleCard({ example }: { example?: WorkedExample }) {
  if (!example) return null

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge tone="teal">разобранный пример</Badge>
          <h3 className="mt-3 text-2xl font-semibold text-white">{example.title}</h3>
          <p className="mt-2 text-slate-300">{example.scenario}</p>
        </div>
        <Badge tone="amber">сначала понять</Badge>
      </div>
      <div className="mt-5"><SqlCode>{example.sql}</SqlCode></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {example.lineByLine.map((line, index) => (
          <div key={line} className="flex gap-3 rounded-md border border-slate-800 bg-slate-900/55 p-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-slate-800 text-xs font-bold text-teal-200">{index + 1}</span>
            <p className="text-sm text-slate-300">{line}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoBox title="Почему так" text={example.whyThisWay} tone="teal" />
        <InfoBox title="Частая ошибка" text={example.commonMistake} tone="amber" />
        <InfoBox title="Попробуй сам" text={example.tryNext} tone="blue" />
      </div>
    </Card>
  )
}

function InfoBox({ title, text, tone = 'teal' }: { title: string; text: string; tone?: 'teal' | 'amber' | 'blue' }) {
  const toneClasses = {
    teal: 'border-teal-400/20 bg-teal-400/10 text-teal-100',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
    blue: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
  }

  return (
    <div className={cn('rounded-md border p-4 text-sm', toneClasses[tone])}>
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2">{text}</p>
    </div>
  )
}

function SyntaxExplainer({ sql }: { sql: string }) {
  const upperSql = sql.toUpperCase()
  const notes = syntaxDictionary.filter((item) => upperSql.includes(item.token))

  if (!notes.length) return null

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/55 p-4">
      <p className="text-sm font-semibold text-white">Что означает синтаксис и почему пишем именно так</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {notes.slice(0, 4).map((item) => (
          <div key={item.title} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
            <p className="font-mono text-sm font-semibold text-teal-200">{item.title}</p>
            <p className="mt-2 text-sm text-slate-300">{item.meaning}</p>
            <p className="mt-2 text-sm text-slate-400">{item.why}</p>
            <p className="mt-2 text-xs text-amber-200">Ошибка новичка: {item.mistake}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskCard({ title, prompt, sql, hint }: { title: string; prompt: string; sql: string; hint: string }) {
  const [showHint, setShowHint] = useState(false)

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge tone="amber">сначала попробуй сам</Badge>
          <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-3 text-slate-300">{prompt}</p>
        </div>
        <Button variant="secondary" onClick={() => setShowHint((value) => !value)}>
          {showHint ? 'Скрыть подсказку' : 'Показать подсказку'}
        </Button>
      </div>
      <div className="mt-5"><SqlCode>{sql}</SqlCode></div>
      <p className="mt-3 text-sm text-slate-500">Сначала выполни запрос в песочнице и попробуй объяснить результат своими словами.</p>
      {showHint && (
        <div className="mt-4 rounded-md border border-teal-400/20 bg-teal-400/10 p-4 text-sm text-teal-100">
          {hint}
        </div>
      )}
    </Card>
  )
}

function QuizCard({ module, savedScore, onScore }: { module: CourseModule; savedScore?: number; onScore: (moduleId: string, score: number) => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState(false)
  const score = Math.round((module.quiz.filter((item, index) => answers[index] === item.answer).length / module.quiz.length) * 100)

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Мини-тест</h3>
          {savedScore !== undefined && <p className="mt-1 text-sm text-slate-400">Последний результат: {savedScore}%</p>}
        </div>
        <Button onClick={() => { setChecked(true); onScore(module.id, score) }}>Проверить тест</Button>
      </div>
      <div className="mt-5 space-y-5">
        {module.quiz.map((item, index) => (
          <div key={item.question} className="rounded-md border border-slate-800 bg-slate-900/45 p-4">
            <p className="font-medium text-white">{index + 1}. {item.question}</p>
            <div className="mt-3 grid gap-2">
              {item.options.map((option, optionIndex) => (
                <label key={option} className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200">
                  <input
                    type="radio"
                    name={`${module.id}-${index}`}
                    checked={answers[index] === optionIndex}
                    onChange={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                    className="accent-teal-400"
                  />
                  {option}
                </label>
              ))}
            </div>
            {checked && (
              <p className={cn('mt-3 text-sm', answers[index] === item.answer ? 'text-teal-200' : 'text-amber-200')}>
                {answers[index] === item.answer ? 'Верно. ' : 'Проверь ещё раз. '}
                {item.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function SqlSandbox({ initialSql }: { initialSql: string }) {
  const [db, setDb] = useState<Database | null>(null)
  const [sql, setSql] = useState(initialSql)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [message, setMessage] = useState('База готовится...')

  const resetDb = async () => {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl })
    const nextDb = new SQL.Database()
    nextDb.run(seedSql)
    setDb(nextDb)
    setRows([])
    setColumns([])
    setMessage('Учебная ERP SQLite-база загружена.')
  }

  useEffect(() => {
    let cancelled = false

    initSqlJs({ locateFile: () => wasmUrl }).then((SQL) => {
      if (cancelled) return
      const nextDb = new SQL.Database()
      nextDb.run(seedSql)
      setDb(nextDb)
      setRows([])
      setColumns([])
      setMessage('Учебная ERP SQLite-база загружена.')
    })

    return () => {
      cancelled = true
    }
  }, [])

  const runQuery = () => {
    if (!db) return
    try {
      const result = db.exec(sql)
      if (!result.length) {
        setColumns([])
        setRows([])
        setMessage('Запрос выполнен. Для SELECT-результатов таблица появится здесь.')
        return
      }
      const first = result[0]
      setColumns(first.columns)
      setRows(first.values.map((valueRow) => Object.fromEntries(first.columns.map((column, index) => [column, valueRow[index]]))))
      setMessage(`Готово: ${first.values.length} строк.`)
    } catch (error) {
      setRows([])
      setColumns([])
      setMessage(error instanceof Error ? error.message : 'SQL error')
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
      <div className="space-y-6">
        <Card className="p-6">
          <SectionTitle title="SQL-песочница" subtitle="SQLite работает прямо в браузере через sql.js. На Vercel внешняя БД не нужна: учебная база создаётся локально при открытии страницы." compact />
          <div className="mt-5 space-y-2">
            {schemaSummary.map((table) => <div key={table} className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 font-mono text-xs text-slate-300">{table}</div>)}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={runQuery}><Play size={17} />Выполнить</Button>
            <Button variant="secondary" onClick={resetDb}><RotateCcw size={17} />Сбросить БД</Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Подсказка: на клавиатуре можно нажать Ctrl + Enter.</p>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-white">Быстрые запросы</h3>
          <p className="mt-2 text-sm text-slate-400">Выбирай заготовку, запускай, потом меняй одно условие и смотри, как меняется результат.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {modules.map((module) => (
              <button key={module.id} type="button" onClick={() => setSql(module.task.starterSql)} className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-sm text-slate-300 hover:border-teal-400/40 hover:text-white">
                <span className="text-teal-200">М{module.number}</span> {module.task.title}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-4">
          <textarea
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault()
                runQuery()
              }
            }}
            spellCheck={false}
            className="min-h-72 w-full resize-y rounded-md border border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-teal-400"
          />
          <p className={cn('mt-3 text-sm', message.toLowerCase().includes('error') || message.toLowerCase().includes('syntax') ? 'text-rose-200' : 'text-slate-300')}>{message}</p>
          <div className="mt-4"><SyntaxExplainer sql={sql} /></div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-800 p-4">
            <h3 className="font-semibold text-white">Результат</h3>
          </div>
          <div className="overflow-auto">
            {columns.length ? (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-900 text-slate-300">
                  <tr>{columns.map((column) => <th key={column} className="border-b border-slate-800 px-4 py-3 font-semibold">{column}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="odd:bg-slate-950 even:bg-slate-900/45">
                      {columns.map((column) => <td key={column} className="border-b border-slate-800 px-4 py-3 text-slate-300">{String(row[column] ?? 'NULL')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500">Здесь появится таблица результата.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function TestsView({ progress, onQuizScore }: { progress: ProgressState; onQuizScore: (moduleId: string, score: number) => void }) {
  const [moduleId, setModuleId] = useState(modules[0].id)
  const module = modules.find((item) => item.id === moduleId) ?? modules[0]
  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      <Card className="h-fit p-3">
        {modules.map((item) => (
          <button key={item.id} type="button" onClick={() => setModuleId(item.id)} className={cn('mb-2 w-full rounded-md p-3 text-left text-sm text-slate-300 hover:bg-slate-900', item.id === moduleId && 'bg-slate-800 text-white')}>
            {item.number}. {item.title}
          </button>
        ))}
      </Card>
      <QuizCard key={module.id} module={module} savedScore={progress.quizScores[module.id]} onScore={onQuizScore} />
    </div>
  )
}

function PracticeView({ onUseTask }: { onUseTask: (moduleId: string, starterSql: string) => void }) {
  return (
    <div className="space-y-6">
      <SectionTitle title="Практические задания" subtitle="Каждое задание можно перенести в SQL-песочницу и выполнить на учебной ERP-базе." />
      <div className="grid gap-4 lg:grid-cols-2">
        {modules.map((module) => (
          <PracticeTaskCard key={module.id} module={module} onUseTask={onUseTask} />
        ))}
      </div>
    </div>
  )
}

function PracticeTaskCard({ module, onUseTask }: { module: CourseModule; onUseTask: (moduleId: string, starterSql: string) => void }) {
  const [showHint, setShowHint] = useState(false)

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <Badge tone="blue">Модуль {module.number}</Badge>
        <Badge tone={showHint ? 'teal' : 'amber'}>{showHint ? 'разбор открыт' : 'сначала попытка'}</Badge>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-white">{module.task.title}</h3>
      <p className="mt-2 text-sm text-slate-300">{module.task.prompt}</p>
      <div className="mt-4"><SqlCode>{module.task.starterSql}</SqlCode></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => onUseTask(module.id, module.task.starterSql)}>Открыть в песочнице</Button>
        <Button variant="ghost" onClick={() => setShowHint((value) => !value)}>{showHint ? 'Скрыть разбор' : 'Показать разбор'}</Button>
      </div>
      {showHint && (
        <div className="mt-4 rounded-md border border-teal-400/20 bg-teal-400/10 p-4 text-sm text-teal-100">
          {module.task.expectedHint}
        </div>
      )}
    </Card>
  )
}

function CasesView() {
  return (
    <div className="space-y-6">
      <SectionTitle title="ERP-кейсы" subtitle="Типовые ситуации из поддержки и внедрения ERP." />
      <div className="grid gap-4 lg:grid-cols-2">
        {erpCases.map((item) => (
          <Card key={item.title} className="p-6">
            <h3 className="text-xl font-semibold text-white">{item.title}</h3>
            <p className="mt-3 text-sm text-slate-400">Таблицы: {item.tables}</p>
            <p className="mt-4 text-slate-300">{item.approach}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function InterviewView() {
  const [open, setOpen] = useState(0)
  return (
    <div className="space-y-6">
      <SectionTitle title="Собеседование" subtitle="Ответы в стиле инженера: через данные, связи и бизнес-процесс." />
      <div className="space-y-3">
        {interviewPrompts.map((item, index) => (
          <Card key={item.question} className="overflow-hidden">
            <button type="button" onClick={() => setOpen(open === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
              <span className="font-semibold text-white">{item.question}</span>
              <Badge tone={open === index ? 'teal' : 'slate'}>{open === index ? 'открыто' : 'ответ'}</Badge>
            </button>
            {open === index && <div className="border-t border-slate-800 p-5 text-slate-300">{item.answer}</div>}
          </Card>
        ))}
      </div>
    </div>
  )
}

function ExamView({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="space-y-6">
      {!embedded && <SectionTitle title="Финальный экзамен" subtitle="Проверь готовность: синтаксис, диагностика, объяснение решения." />}
      {embedded && <SectionTitle title="Финальный экзамен внутри модулей" subtitle="Финальная проверка открывается после последнего модуля." compact />}
      <Card className="p-6">
        <div className="space-y-4">
          {finalExam.map((item, index) => (
            <label key={item} className="flex items-start gap-3 rounded-md border border-slate-800 bg-slate-900/50 p-4 text-slate-200">
              <input type="checkbox" className="mt-1 accent-teal-400" />
              <span><strong className="text-white">Задание {index + 1}.</strong> {item}</span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ReferenceView() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Справочник SQL-команд" subtitle="Не просто команды, а слова и идеи, которыми нужно уверенно говорить на интервью." />

      <Card className="p-6">
        <h3 className="text-xl font-semibold text-white">Словарь новичка: простыми словами</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {beginnerGlossary.map((item) => (
            <div key={item.term} className="rounded-md border border-slate-800 bg-slate-900/55 p-4">
              <p className="font-semibold text-teal-200">{item.term}</p>
              <p className="mt-2 text-sm text-slate-300">{item.simple}</p>
              <p className="mt-2 text-sm text-slate-400">ERP-пример: {item.erp}</p>
              <p className="mt-2 text-xs text-sky-200">Как сказать на интервью: {item.interview}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-semibold text-white">Разбор синтаксиса: что означает и где ошибаются</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {syntaxDictionary.map((item) => (
            <div key={item.title} className="rounded-md border border-slate-800 bg-slate-900/55 p-4">
              <p className="font-mono font-semibold text-teal-200">{item.title}</p>
              <p className="mt-2 text-sm text-slate-300">{item.meaning}</p>
              <p className="mt-2 text-sm text-slate-400">{item.why}</p>
              <p className="mt-2 text-xs text-amber-200">Ошибка новичка: {item.mistake}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {sqlReference.map((item) => (
          <Card key={item.command} className="p-5">
            <Badge tone="teal">{item.command}</Badge>
            <p className="mt-3 text-slate-300">{item.use}</p>
            <div className="mt-4"><SqlCode>{item.example}</SqlCode></div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ title, subtitle, compact = false }: { title: string; subtitle: string; compact?: boolean }) {
  return (
    <div>
      <h2 className={cn('font-semibold text-white', compact ? 'text-2xl' : 'text-3xl')}>{title}</h2>
      <p className="mt-2 text-slate-400">{subtitle}</p>
    </div>
  )
}

export default App
