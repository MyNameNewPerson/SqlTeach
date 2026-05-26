import type { LucideIcon } from 'lucide-react'

export type ViewId =
  | 'dashboard'
  | 'tables'
  | 'sprint'
  | 'map'
  | 'modules'
  | 'sandbox'
  | 'tests'
  | 'practice'
  | 'cases'
  | 'interview'
  | 'exam'
  | 'reference'

export type QuizQuestion = {
  question: string
  options: string[]
  answer: number
  explanation: string
}

export type PracticeTask = {
  title: string
  prompt: string
  starterSql: string
  expectedHint: string
}

export type Lesson = {
  title: string
  minutes: number
  content: string[]
  sql?: string
  engineerNote: string
}

export type CourseModule = {
  id: string
  number: number
  title: string
  goal: string
  level: 'Старт' | 'База' | 'Практика' | 'Инженерный'
  topics: string[]
  erpContext: string
  lessons: Lesson[]
  quiz: QuizQuestion[]
  task: PracticeTask
}

export type NavItem = {
  id: ViewId
  label: string
  icon: LucideIcon
}

export type ProgressState = {
  completedModules: string[]
  startedModules: string[]
  quizScores: Record<string, number>
  lastModuleId: string
}
