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
    ],
    rows: [
      { id: 1, name: 'Northwind Retail', city: 'Chisinau', segment: 'B2B' },
      { id: 2, name: 'Aster Foods', city: 'Balti', segment: 'B2B' },
      { id: 5, name: 'Delta Shop', city: 'Comrat', segment: 'B2B' },
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
      { name: 'total_amount', meaning: 'сумма заказа' },
    ],
    rows: [
      { id: 1001, customer_id: 1, status: 'paid', total_amount: 990 },
      { id: 1004, customer_id: 5, status: 'payment_pending', total_amount: 780 },
      { id: 1006, customer_id: 999, status: 'paid', total_amount: 210 },
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
    ],
    rows: [
      { id: 501, order_id: 1001, amount: 990, status: 'captured' },
      { id: 503, order_id: 1004, amount: 780, status: 'failed' },
      { id: 504, order_id: 1010, amount: 300, status: 'captured' },
    ],
  },
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
