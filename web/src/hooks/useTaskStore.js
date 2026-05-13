import { useState, useCallback } from 'react'
import { generateTasksForDate } from '../data/tasks'

const STORAGE_KEY = 'unrivaled_tasks_v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function ensureDate(store, date) {
  const key = dateKey(date)
  if (!store[key]) {
    store[key] = generateTasksForDate(date)
  }
  return store
}

export function useTaskStore() {
  const [tasksByDate, setTasksByDate] = useState(() => {
    const stored = load()
    // Seed current week
    const today = new Date()
    const monday = getMonday(today)
    const seeded = { ...stored }
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const k = dateKey(d)
      if (!seeded[k]) seeded[k] = generateTasksForDate(d)
    }
    save(seeded)
    return seeded
  })

  const update = useCallback((updater) => {
    setTasksByDate(prev => {
      const next = updater({ ...prev })
      save(next)
      return next
    })
  }, [])

  const tasksFor = useCallback((date) => {
    const key = dateKey(date)
    return (tasksByDate[key] || []).slice().sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
  }, [tasksByDate])

  const ensureTasksFor = useCallback((date) => {
    update(prev => ensureDate(prev, date))
  }, [update])

  const toggleTask = useCallback((taskId, date) => {
    const key = dateKey(date)
    update(prev => {
      const tasks = (prev[key] || []).map(t =>
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
      )
      return { ...prev, [key]: tasks }
    })
  }, [update])

  const clearCompleted = useCallback((date) => {
    const key = dateKey(date)
    const cleared = (tasksByDate[key] || []).filter(t => t.isCompleted)
    update(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(t => t.isCompleted === false),
    }))
    return cleared
  }, [update, tasksByDate])

  const restoreTasks = useCallback((date, tasks) => {
    const key = dateKey(date)
    update(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), ...tasks],
    }))
  }, [update])

  const moveUncompleted = useCallback((fromDate, toDate) => {
    const fromKey = dateKey(fromDate)
    const toKey = dateKey(toDate)
    update(prev => {
      const fromTasks = prev[fromKey] || []
      const toTasks = prev[toKey] || generateTasksForDate(toDate)
      const incomplete = fromTasks.filter(t => !t.isCompleted)
      const completed = fromTasks.filter(t => t.isCompleted)

      const deferred = incomplete.map(t => ({
        ...t,
        id: `${toKey}-deferred-${t.id}`,
        assignedDate: toKey,
        isDeferred: true,
        originalDate: t.originalDate || fromKey,
        isCompleted: false,
      }))

      return {
        ...prev,
        [fromKey]: completed,
        [toKey]: [...toTasks, ...deferred],
      }
    })
    return tasksByDate[fromKey]?.filter(t => !t.isCompleted).length || 0
  }, [update, tasksByDate])

  const stats = useCallback((date) => {
    const all = tasksFor(date)
    return { completed: all.filter(t => t.isCompleted).length, total: all.length }
  }, [tasksFor])

  return { tasksFor, ensureTasksFor, toggleTask, clearCompleted, restoreTasks, moveUncompleted, stats }
}

export function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function dateKey(date) {
  return date.toISOString().slice(0, 10)
}

export function nextWeekday(date) {
  const d = new Date(date)
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  return d
}

export function formatShort(dateStr) {
  const [y, m, day] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatLong(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function isToday(date) {
  const today = new Date()
  return date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)
}
