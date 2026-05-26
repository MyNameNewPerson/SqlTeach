import { useEffect, useMemo, useState } from 'react'
import initSqlJs, { type Database } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  Table2,
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
  { id: 'tables', label: 'ERP-таблицы', icon: Table2 },
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
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

        <main className="min-w-0 flex-1">
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

          <div className="mx-auto max-w-7xl px-4 py-6 xl:px-8">
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
            <Button onClick={onOpenSprint} className="pointer-events-auto text-sm lg:text-base"><CalendarDays size={16} />План на 3 дня</Button>
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

function FoundationPrimer({ onOpenTables }: { onOpenTables?: () => void }) {
  return (
    <section className="space-y-4 md:space-y-6">
      <Card className="p-4 md:p-6">
        <div className="grid gap-6 2xl:grid-cols-[0.72fr_1.28fr]">
          <div>
            <Badge tone="teal">старт с нуля</Badge>
            <h3 className="mt-3 text-2xl font-semibold text-white md:text-3xl">Сначала видим таблицы, потом пишем SQL</h3>
            <p className="mt-3 text-slate-300">
              База данных в ERP похожа на книгу Excel, где каждый лист отвечает за одну тему: клиенты, заказы, оплаты, товары, склад.
              SQL нужен, чтобы задавать этим листам точные вопросы.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {tableAnatomy.map((item) => (
                <div key={item.title} className="rounded-md border border-slate-800 bg-slate-900/55 p-3">
                  <p className="font-semibold text-teal-200">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <VisualDataTable table={visualTables[0]} focus="customers" onOpenTables={onOpenTables} />
            {onOpenTables && (
              <div className="grid gap-4 2xl:grid-cols-2">
                <VisualDataTable table={visualTables[1]} focus="orders" onOpenTables={onOpenTables} />
                <VisualDataTable table={visualTables[2]} focus="payments" onOpenTables={onOpenTables} />
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
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

function VisualDataTable({ table, focus, onOpenTables }: { table: VisualTable; focus: string; onOpenTables?: () => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
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
      <div className="overflow-x-auto">
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
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="overflow-x-auto">
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
        <h3 className="mt-3 text-2xl font-semibold text-white">Как запоминать SQL, а не просто читать</h3>
        <p className="mt-3 text-sm text-slate-400">
          Рабочая схема для 3 дней: визуально увидеть данные, сказать задачу своими словами, запустить запрос, вспомнить без подсказки и повторить позже.
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
  const activeTable = visualTables.find((table) => table.name === activeTableName) ?? visualTables[0]

  return (
    <div className="space-y-6">
      <Card className="p-5 md:p-6">
        <Badge tone="teal">ERP data map</Badge>
        <h2 className="mt-3 text-3xl font-semibold text-white">ERP-таблицы: посмотри данные глазами</h2>
        <p className="mt-3 max-w-3xl text-slate-300">
          Это учебная мини-база. Сначала изучи таблицы как обычные списки, потом переходи к SQL. Так проще понять, что именно делает запрос.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoStrip title="PK" text="PRIMARY KEY. Главный id строки внутри своей таблицы." tone="teal" />
          <InfoStrip title="FK" text="FOREIGN KEY. Колонка-ссылка на id другой таблицы." tone="blue" />
          <InfoStrip title="Связь" text="Например orders.customer_id указывает на customers.id." tone="amber" />
        </div>
      </Card>

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

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="p-4 md:p-5">
              <h4 className="text-lg font-semibold text-white">Колонки таблицы</h4>
              <div className="mt-4 grid gap-3">
                {activeTable.columns.map((column) => (
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

            <Card className="p-4 md:p-5">
              <h4 className="text-lg font-semibold text-white">Связи этой учебной ERP-базы</h4>
              <div className="mt-4 space-y-2">
                {tableRelations.map((relation) => (
                  <div
                    key={relation}
                    className={cn(
                      'rounded-md border px-3 py-2 font-mono text-sm',
                      relation.startsWith(activeTable.name) || relation.includes(`-> ${activeTable.name}.`)
                        ? 'border-teal-400/30 bg-teal-400/10 text-teal-100'
                        : 'border-slate-800 bg-slate-900/55 text-slate-400',
                    )}
                  >
                    {relation}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-4 md:p-5">
            <h4 className="text-lg font-semibold text-white">Открыть эту таблицу через SQL</h4>
            <div className="mt-4"><SqlCode>{`SELECT *
FROM ${activeTable.name};`}</SqlCode></div>
          </Card>
        </div>
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
  const concepts = (moduleConcepts[activeModule.id] ?? []).map((id) => conceptExplanations[id]).filter(Boolean)

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="grid h-fit gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:sticky xl:top-28 xl:block">
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

      <div className="mx-auto w-full max-w-6xl space-y-6">
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
          <Badge tone="teal">главное объяснение</Badge>
          <h3 className="mt-3 text-2xl font-semibold text-white">Понятно и по делу: что означает тема</h3>
          <p className="mt-2 text-sm text-slate-400">
            Формат как в хорошем ответе наставника: коротко, пример из жизни, мини-таблицы, SQL, разбор по кускам и типичная ошибка.
          </p>
        </div>
        <Badge tone="blue">{concepts.length} тем</Badge>
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

        <div className="mt-5">
          <p className="text-sm font-semibold text-white">Разбираем по частям</p>
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
