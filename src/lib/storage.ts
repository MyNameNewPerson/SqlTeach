import type { ProgressState } from '../types'

const STORAGE_KEY = 'sql-erp-engineer-course-progress'

export const defaultProgress: ProgressState = {
  completedModules: [],
  startedModules: [],
  quizScores: {},
  lastModuleId: 'module-0',
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaultProgress, ...JSON.parse(raw) } : defaultProgress
  } catch {
    return defaultProgress
  }
}

export function saveProgress(progress: ProgressState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function resetStoredProgress() {
  localStorage.removeItem(STORAGE_KEY)
}
