import { useEffect, useMemo, useState } from 'react'
import initSqlJs, { type Database } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  Map,
  Play,
  RotateCcw,
  SearchCheck,
  TerminalSquare,
  Trophy,
} from 'lucide-react'
import { erpCases, finalExam, interviewPrompts, modules, sqlReference } from './data/course'
import { schemaSummary, seedSql } from './lib/sqlSeed'
import { defaultProgress, loadProgress, resetStoredProgress, saveProgress } from './lib/storage'
import { cn } from './lib/utils'
import type { CourseModule, NavItem, ProgressState, ViewId } from './types'
import { Badge, Button, Card, Progress, SqlCode } from './components/ui'

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
  { id: 'sprint', label: 'План на 3 дня', icon: CalendarDays },
  { id: 'map', label: 'Карта курса', icon: Map },
  { id: 'modules', label: 'Модули', icon: BookOpen },
  { id: 'sandbox', label: 'SQL-песочница', icon: TerminalSquare },
  { id: 'tests', label: 'Тесты', icon: ClipboardCheck },
  { id: 'practice', label: 'Практика', icon: SearchCheck },
  { id: 'cases', label: 'ERP-кейсы', icon: DatabaseZap },
  { id: 'interview', label: 'Собеседование', icon: FileQuestion },
  { id: 'exam', label: 'Финальный экзамен', icon: Trophy },
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

function App() {
  const [activeView, setActiveView] = useState<ViewId>('dashboard')
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())
  const [activeModuleId, setActiveModuleId] = useState(() => loadProgress().lastModuleId)
  const [sandboxSql, setSandboxSql] = useState(modules[1].task.starterSql)

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="sticky top-0 hidden md:block h-[60px] md:h-screen w-full md:w-64 lg:w-72 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/95 p-2 md:p-4">
          <div className="mb-4 md:mb-6 rounded-lg border border-slate-800 bg-slate-900/60 p-3 md:p-4">
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
                    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white',
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

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 px-2 md:px-4 py-3 md:py-4 backdrop-blur xl:px-8">
            <div className="flex flex-col gap-3 md:gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-teal-300">local interactive course</p>
                <h1 className="mt-1 text-xl md:text-2xl font-semibold text-white md:text-3xl">SQL ERP Engineer Course</h1>
              </div>
              <div className="grid gap-2 md:gap-3 sm:grid-cols-3">
                <Metric label="Прогресс" value={`${completedPercent}%`} />
                <Metric label="Тесты" value={`${averageQuiz}%`} />
                <Metric label="Модулей" value={`${progress.completedModules.length}/${modules.length}`} />
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto md:overflow-visible lg:hidden pb-2">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeView === item.id ? 'primary' : 'secondary'}
                  className="shrink-0"
                  onClick={() => setActiveView(item.id)}
                >
                  <item.icon size={16} />
                  {item.label}
                </Button>
              ))}
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-2 md:px-4 py-4 md:py-6 xl:px-8">
            {activeView === 'dashboard' && (
              <Dashboard
                completedPercent={completedPercent}
                progress={progress}
                onOpenSprint={() => setActiveView('sprint')}
                onOpenModules={() => setActiveView('modules')}
                onOpenSandbox={() => setActiveView('sandbox')}
                onReset={resetProgress}
              />
            )}
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
    <div className="min-w-28 rounded-md border border-slate-800 bg-slate-900/70 px-4 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
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
  onOpenSprint,
  onOpenModules,
  onOpenSandbox,
  onReset,
}: {
  completedPercent: number
  progress: ProgressState
  onOpenSprint: () => void
  onOpenModules: () => void
  onOpenSandbox: () => void
  onReset: () => void
}) {
  const nextModule = modules.find((module) => !progress.completedModules.includes(module.id)) ?? modules[modules.length - 1]

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="grid gap-4 md:gap-6 md:grid-cols-1 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden p-4 md:p-6 md:p-8">
          <div className="mb-6 md:mb-8 max-w-3xl">
            <Badge tone="teal">3-day ERP interview sprint</Badge>
            <h2 className="mt-4 text-2xl md:text-4xl font-semibold leading-tight text-white md:text-5xl">SQL для ERP Engineer за 3 дня: понятно, по шагам, с практикой</h2>
            <p className="mt-3 md:mt-4 max-w-2xl text-base md:text-lg text-slate-300">
              Не зубрим команды отдельно. Учимся думать как ERP-инженер: понять проблему, выбрать таблицы, написать запрос, объяснить вывод на собеседовании.
            </p>
          </div>
          <div className="grid gap-3 md:gap-4 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm text-slate-400">Следующий модуль</p>
              <p className="mt-2 font-semibold text-white">{nextModule.number}. {nextModule.title}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-slate-400">Фокус курса</p>
              <p className="mt-2 font-semibold text-white">JOIN, агрегации, плохие данные</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-slate-400">Формат</p>
              <p className="mt-2 font-semibold text-white">Локально, без сервера</p>
            </Card>
          </div>
          <div className="mt-4 md:mt-6 flex flex-wrap gap-2 md:gap-3">
            <Button onClick={onOpenSprint}><CalendarDays size={17} />Открыть план на 3 дня</Button>
            <Button variant="secondary" onClick={onOpenModules}><Play size={17} />Начать модуль</Button>
            <Button variant="secondary" onClick={onOpenSandbox}><TerminalSquare size={17} />SQL-песочница</Button>
            <Button variant="danger" onClick={onReset}><RotateCcw size={17} />Сбросить прогресс</Button>
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="text-xl font-semibold text-white">Состояние обучения</h3>
          <div className="mt-4 md:mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-300">Общий прогресс</span>
              <span className="font-semibold text-teal-200">{completedPercent}%</span>
            </div>
            <Progress value={completedPercent} />
          </div>
          <div className="mt-4 md:mt-6 space-y-2 md:space-y-3">
            {modules.slice(0, 5).map((module) => {
              const status = moduleStatus(module, progress)
              return (
                <div key={module.id} className="flex items-center justify-between gap-2 md:gap-3 rounded-md border border-slate-800 bg-slate-900/50 p-2 md:p-3">
                  <span className="text-sm text-slate-200">{module.number}. {module.title}</span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
              )
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-3 md:gap-4 md:grid-cols-1 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-4 md:p-6">
          <h3 className="text-xl font-semibold text-white">Супер-метод для новичка</h3>
          <p className="mt-2 text-sm text-slate-400">Один цикл на каждую тему. Так знания быстрее превращаются в навык и в нормальный ответ на интервью.</p>
          <div className="mt-4 md:mt-5 grid gap-2 md:gap-3 sm:grid-cols-2">
            {learningLoop.map((item) => (
              <div key={item.step} className="rounded-md border border-slate-800 bg-slate-900/50 p-4">
                <p className="font-semibold text-teal-200">{item.step}</p>
                <p className="mt-2 text-sm text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="text-xl font-semibold text-white">Как решать любую SQL-задачу на ERP-собеседовании</h3>
          <div className="mt-4 md:mt-5 space-y-2 md:space-y-3">
            {sqlThinkingSteps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-md border border-slate-800 bg-slate-900/50 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-teal-400 text-sm font-bold text-slate-950">{index + 1}</span>
                <p className="text-sm text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-2 md:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {['ERP-схема', 'SELECT и фильтры', 'JOIN-диагностика', 'Интервью-ответы'].map((item) => (
          <Card key={item} className="p-3 md:p-5">
            <CheckCircle2 className="mb-4 text-teal-300" size={22} />
            <h3 className="font-semibold text-white">{item}</h3>
            <p className="mt-2 text-sm text-slate-400">От синтаксиса к реальным проверкам заказов, оплат и интеграций.</p>
          </Card>
        ))}
      </section>
    </div>
  )
}

function SprintView({ onOpenModules, onOpenSandbox }: { onOpenModules: () => void; onOpenSandbox: () => void }) {
  return (
    <div className="space-y-4 md:space-y-6">
      <section className="grid gap-4 md:gap-6 md:grid-cols-1 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-4 md:p-6 md:p-8">
          <Badge tone="teal">интенсив на 3 дня</Badge>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-white md:text-4xl">Метод подготовки: минимум теории, максимум узнаваемых ERP-ситуаций</h2>
          <p className="mt-4 max-w-3xl text-slate-300">
            Цель не стать DBA за 3 дня. Цель - уверенно пройти собеседование ERP Engineer: читать схему, писать базовые запросы, находить плохие данные и объяснять ход мыслей.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={onOpenModules}><BookOpen size={17} />Учить модули</Button>
            <Button variant="secondary" onClick={onOpenSandbox}><TerminalSquare size={17} />Тренироваться в SQL</Button>
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="text-xl font-semibold text-white">Формула ответа на интервью</h3>
          <div className="mt-4 space-y-2">
            {interviewFormula.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-md bg-slate-900/60 p-3">
                <span className="font-mono text-sm text-teal-300">{index + 1}</span>
                <p className="text-sm text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-2 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {threeDayPlan.map((day) => (
          <Card key={day.day} className="p-3 md:p-6">
            <Badge tone="blue">{day.day}</Badge>
            <h3 className="mt-3 text-xl font-semibold text-white">{day.title}</h3>
            <p className="mt-2 text-sm text-teal-100">{day.focus}</p>
            <div className="mt-5 space-y-3">
              {day.schedule.map((item) => (
                <div key={item} className="rounded-md border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-300">{item}</div>
              ))}
            </div>
            <div className="mt-5 rounded-md border border-teal-400/20 bg-teal-400/10 p-4 text-sm text-teal-100">
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
  const status = moduleStatus(activeModule, progress)

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Card className="h-fit p-3">
        {modules.map((module) => {
          const itemStatus = moduleStatus(module, progress)
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => onSelect(module.id)}
              className={cn(
                'mb-2 w-full rounded-md border border-transparent p-3 text-left transition hover:border-slate-700 hover:bg-slate-900',
                activeModule.id === module.id && 'border-teal-400/40 bg-teal-400/10',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">{module.number}. {module.title}</span>
                <Badge tone={itemStatus.tone}>{itemStatus.label}</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-400">{module.level}</p>
            </button>
          )
        })}
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge tone={status.tone}>{status.label}</Badge>
              <h2 className="mt-3 text-3xl font-semibold text-white">Модуль {activeModule.number}. {activeModule.title}</h2>
              <p className="mt-3 text-slate-300">{activeModule.goal}</p>
            </div>
            <Button onClick={() => onComplete(activeModule.id)}><CheckCircle2 size={17} />Завершить модуль</Button>
          </div>
          <div className="mt-5 rounded-md border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm font-semibold text-teal-200">ERP-контекст</p>
            <p className="mt-2 text-sm text-slate-300">{activeModule.erpContext}</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-slate-800 bg-slate-900/45 p-4">
              <p className="text-sm font-semibold text-white">Как проходить</p>
              <p className="mt-2 text-sm text-slate-400">Прочитай пример, выполни SQL в песочнице, поменяй одно условие.</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/45 p-4">
              <p className="text-sm font-semibold text-white">Что запомнить</p>
              <p className="mt-2 text-sm text-slate-400">Не команду отдельно, а какую ERP-проблему она помогает проверить.</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/45 p-4">
              <p className="text-sm font-semibold text-white">Как отвечать</p>
              <p className="mt-2 text-sm text-slate-400">“Я проверю таблицы, связи и логи, потом объясню вывод”.</p>
            </div>
          </div>
        </Card>

        {activeModule.lessons.map((lesson) => (
          <Card key={lesson.title} className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold text-white">{lesson.title}</h3>
              <Badge>{lesson.minutes} мин</Badge>
            </div>
            <div className="mt-4 space-y-3 text-slate-300">
              {lesson.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            {lesson.sql && <div className="mt-5"><SqlCode>{lesson.sql}</SqlCode></div>}
            <div className="mt-5 rounded-md border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">{lesson.engineerNote}</div>
          </Card>
        ))}

        <QuizCard key={activeModule.id} module={activeModule} savedScore={progress.quizScores[activeModule.id]} onScore={onQuizScore} />

        <Card className="p-6">
          <h3 className="text-xl font-semibold text-white">Мини-задание: {activeModule.task.title}</h3>
          <p className="mt-3 text-slate-300">{activeModule.task.prompt}</p>
          <div className="mt-5"><SqlCode>{activeModule.task.starterSql}</SqlCode></div>
          <p className="mt-4 text-sm text-slate-400">{activeModule.task.expectedHint}</p>
        </Card>
      </div>
    </div>
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
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <div className="space-y-6">
        <Card className="p-6">
          <SectionTitle title="SQL-песочница" subtitle="SQLite в браузере через sql.js. Интернет и сервер не нужны." compact />
          <div className="mt-5 space-y-2">
            {schemaSummary.map((table) => <div key={table} className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 font-mono text-xs text-slate-300">{table}</div>)}
          </div>
          <div className="mt-5 flex gap-3">
            <Button onClick={runQuery}><Play size={17} />Выполнить</Button>
            <Button variant="secondary" onClick={resetDb}><RotateCcw size={17} />Сбросить БД</Button>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-white">Быстрые запросы</h3>
          <div className="mt-4 grid gap-2">
            {modules.slice(1, 8).map((module) => (
              <button key={module.id} type="button" onClick={() => setSql(module.task.starterSql)} className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-sm text-slate-300 hover:border-teal-400/40 hover:text-white">
                {module.task.title}
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
            spellCheck={false}
            className="min-h-72 w-full resize-y rounded-md border border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-teal-400"
          />
          <p className={cn('mt-3 text-sm', message.toLowerCase().includes('error') || message.toLowerCase().includes('syntax') ? 'text-rose-200' : 'text-slate-300')}>{message}</p>
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
          <Card key={module.id} className="p-5">
            <Badge tone="blue">Модуль {module.number}</Badge>
            <h3 className="mt-3 text-lg font-semibold text-white">{module.task.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{module.task.prompt}</p>
            <div className="mt-4"><SqlCode>{module.task.starterSql}</SqlCode></div>
            <p className="mt-3 text-sm text-slate-400">{module.task.expectedHint}</p>
            <Button className="mt-4" variant="secondary" onClick={() => onUseTask(module.id, module.task.starterSql)}>Открыть в песочнице</Button>
          </Card>
        ))}
      </div>
    </div>
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

function ExamView() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Финальный экзамен" subtitle="Проверь готовность: синтаксис, диагностика, объяснение решения." />
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
      <SectionTitle title="Справочник SQL-команд" subtitle="Короткие команды, смысл и пример для повторения перед интервью." />
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
