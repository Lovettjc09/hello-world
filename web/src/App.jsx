import React, { useState, useEffect } from 'react'
import { useTaskStore, getMonday, dateKey, isToday, formatLong, nextWeekday } from './hooks/useTaskStore'
import TaskRow from './components/TaskRow'
import DeferModal from './components/DeferModal'

export default function App() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    // If weekend, jump to next Monday
    if (day === 0) { today.setDate(today.getDate() + 1) }
    if (day === 6) { today.setDate(today.getDate() + 2) }
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [weekStart, setWeekStart] = useState(() => getMonday(selectedDate))
  const [showDefer, setShowDefer] = useState(false)
  const [toast, setToast] = useState(null)
  const [clearedTasks, setClearedTasks] = useState(null)

  const store = useTaskStore()

  useEffect(() => {
    store.ensureTasksFor(selectedDate)
  }, [selectedDate])

  const tasks = store.tasksFor(selectedDate)
  const { completed, total } = store.stats(selectedDate)
  const incomplete = total - completed
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  function selectDay(d) {
    const clean = new Date(d)
    clean.setHours(0, 0, 0, 0)
    setSelectedDate(clean)
    store.ensureTasksFor(clean)
  }

  function goToPrevWeek() {
    const prev = new Date(weekStart)
    prev.setDate(prev.getDate() - 7)
    setWeekStart(prev)
    selectDay(prev)
  }

  function goToNextWeek() {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + 7)
    setWeekStart(next)
    selectDay(next)
  }

  function goToToday() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setWeekStart(getMonday(today))
    selectDay(today)
  }

  function handleDefer(targetDate) {
    const count = store.moveUncompleted(selectedDate, targetDate)
    const label = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    showToast(`${count} task${count !== 1 ? 's' : ''} moved to ${label}`)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const progressColor = progress === 100 ? '#16a34a' : progress >= 50 ? '#2563eb' : '#f97316'
  const todayKey = new Date().toISOString().slice(0, 10)

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-title">
            <span className="header-icon">🏋️</span>
            <div>
              <h1>Unrivaled Fitness</h1>
              <p>Daily Task Tracker</p>
            </div>
          </div>
          <button className="today-btn" onClick={goToToday}>Today</button>
        </div>
      </header>

      {/* Week strip */}
      <nav className="week-strip">
        <button className="week-nav" onClick={goToPrevWeek} aria-label="Previous week">‹</button>
        <div className="week-days">
          {weekDays.map(d => {
            const key = dateKey(d)
            const sel = key === dateKey(selectedDate)
            const today = key === todayKey
            const { completed: c, total: t } = store.stats(d)
            const ratio = t === 0 ? 0 : c / t
            return (
              <button
                key={key}
                className={`day-chip ${sel ? 'selected' : ''} ${today ? 'today' : ''}`}
                onClick={() => selectDay(d)}
              >
                <span className="chip-weekday">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="chip-num">{d.getDate()}</span>
                <span
                  className="chip-dot"
                  style={{ background: ratio === 1 ? '#16a34a' : ratio > 0 ? '#f97316' : '#d1d5db' }}
                />
              </button>
            )
          })}
        </div>
        <button className="week-nav" onClick={goToNextWeek} aria-label="Next week">›</button>
      </nav>

      {/* Day heading */}
      <div className="day-heading">
        <div>
          <h2>{formatLong(selectedDate)}</h2>
          <p className="day-sub">{completed} of {total} tasks completed</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {completed > 0 && (
            <button className="clear-btn" onClick={() => {
              const cleared = store.clearCompleted(selectedDate)
              if (cleared.length > 0) setClearedTasks({ date: selectedDate, tasks: cleared })
            }}>
              Clear done
            </button>
          )}
          {clearedTasks && dateKey(clearedTasks.date) === dateKey(selectedDate) && (
            <button className="unclear-btn" onClick={() => {
              store.restoreTasks(clearedTasks.date, clearedTasks.tasks)
              setClearedTasks(null)
            }}>
              Unclear
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${progress}%`, background: progressColor }}
        />
      </div>

      {/* Task list */}
      <main className="task-list">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✅</span>
            <p>{isToday(selectedDate) ? 'All done for today!' : 'No tasks scheduled.'}</p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => store.toggleTask(task.id, selectedDate)}
            />
          ))
        )}
      </main>

      {/* Defer button */}
      {incomplete > 0 && (
        <div className="defer-bar">
          <button className="defer-btn" onClick={() => setShowDefer(true)}>
            <span>↪</span> Move {incomplete} uncompleted task{incomplete !== 1 ? 's' : ''} to later
          </button>
        </div>
      )}

      {/* Defer modal */}
      {showDefer && (
        <DeferModal
          sourceDate={selectedDate}
          incompleteCount={incomplete}
          onDefer={handleDefer}
          onClose={() => setShowDefer(false)}
        />
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
