import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTodoActions, useTodoView } from '../hooks/TodoContext';
import CompleteDateModal from './CompleteDateModal';
import ProgressManageBar from './ProgressManageBar';
import ProgressDefaultBar from './ProgressDefaultBar';
import ProgressModal from './ProgressModal';
import { getCycleStats, getCycleMarkerThisCycle, isMarkerKind } from '../utils/repeat';
import { showNativeDatePicker } from '../utils/datePicker';
import { highlightText } from '../utils/highlight';
import { formatCompactDateTime, isOverdue } from '../utils/dateParser';

const LONG_TEXT_WIDTH = 18;

function isLongProgressText(text) {
  const s = String(text);
  let w = 0;
  for (const ch of s) {
    w += ch.charCodeAt(0) > 0xff ? 2 : 1;
  }
  return w > LONG_TEXT_WIDTH;
}

function formatMD(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function archiveDateRange(p) {
  const recorded = formatMD(p.createdAt ?? p.time);
  const completed = formatMD(p.completedAt);
  if (recorded && completed && completed !== recorded) {
    return `${recorded} - ${completed}`;
  }
  return completed || recorded;
}

function isReminderDue(p) {
  if (!p.reminderTime) return false;
  const t = new Date(p.reminderTime).getTime();
  return !Number.isNaN(t) && t <= Date.now();
}

export default function ProgressLog({ progress, todoId, collapsed, checklistMode, repeatRule, repeatAnchor, dueDate, highlight }) {
  const { toggleProgressStatus, completeTodo, reopenCycle, deleteProgress, addProgress, updateProgress, setProgressUrgent, setProgressReminder, setProgressDue, promoteProgress, updateProgressCompletedAt, setFabHidden } = useTodoActions();
  const { batchMode } = useTodoView();
  
  // 状态定义
  const [progressModal, setProgressModal] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [selectedPIds, setSelectedPIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  // 数据预处理（所有变量定义必须在条件 return 之前）
  const items = Array.isArray(progress) ? progress : [];
  const cycleStats = getCycleStats({ repeatRule, repeatAnchor, progress: items, dueDate });
  const cycleMarker = getCycleMarkerThisCycle({ repeatRule, repeatAnchor, progress: items, dueDate });
  const progressCount = cycleStats.count;
  const inBatch = batchMode;

  // 事件处理函数（必须在条件 return 之前定义）
  const exitManage = useCallback(() => {
    setManageMode(false);
    setSelectedPIds(new Set());
    setConfirmDelete(false);
    setShowDateModal(false);
  }, []);

  const openAddModal = useCallback(() => {
    setFabHidden(true);
    setProgressModal({ mode: 'add', text: '', temporary: false, urgent: false, reminderTime: null, dueDate: null });
  }, [setFabHidden]);

  const handleOpenEdit = useCallback((p) => {
    setFabHidden(true);
    setProgressModal({
      mode: 'edit',
      progress: p,
      text: p.text ?? '',
      temporary: p.temporary === true,
      urgent: p.urgent === true,
      reminderTime: p.reminderTime || null,
      dueDate: p.dueDate || null,
    });
  }, [setFabHidden]);

  const handleModalCancel = useCallback(() => {
    setProgressModal(null);
    setFabHidden(false);
  }, [setFabHidden]);

  const handleModalChange = useCallback((patch) => {
    setProgressModal(prev => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const handleModalSetReminder = useCallback(() => {
    showNativeDatePicker({
      type: 'datetime-local',
      value: progressModal?.reminderTime ? progressModal.reminderTime.slice(0, 16) : '',
      onPick: (picked) => {
        if (picked) {
          setProgressModal(prev => (prev ? { ...prev, reminderTime: `${picked}:00` } : prev));
        }
      },
    });
  }, [progressModal]);

  const handleModalSetDue = useCallback(() => {
    showNativeDatePicker({
      type: 'datetime-local',
      value: progressModal?.dueDate ? progressModal.dueDate.slice(0, 16) : '',
      onPick: (picked) => {
        if (picked) {
          const iso = picked.length === 16 ? `${picked}:00` : `${picked}T23:59:59`;
          setProgressModal(prev => (prev ? { ...prev, dueDate: iso } : prev));
        }
      },
    });
  }, [progressModal]);

  const handlePromote = useCallback(() => {
    if (!progressModal || progressModal.mode !== 'edit') return;
    const p = progressModal.progress;
    if (!p || p.status !== 'active' || isMarkerKind(p.kind)) return;
    if (!window.confirm('把这条子项抽成独立待办？父清单会留下「已抽出」记录。')) return;
    promoteProgress(todoId, p.id, {
      text: progressModal.text.trim() || p.text,
      temporary: progressModal.temporary === true,
      urgent: progressModal.urgent === true,
      reminderTime: progressModal.reminderTime || null,
      dueDate: progressModal.dueDate || null,
    });
    setProgressModal(null);
    setFabHidden(false);
  }, [progressModal, todoId, promoteProgress, setFabHidden]);

  const handleSaveModal = useCallback(() => {
    if (!progressModal) return;
    const text = progressModal.text.trim();
    if (progressModal.mode === 'add') {
      if (!text) return;
      addProgress(todoId, text, progressModal.temporary, {
        urgent: progressModal.urgent === true,
        reminderTime: progressModal.reminderTime || null,
        dueDate: progressModal.dueDate || null,
      });
    } else {
      const p = progressModal.progress;
      if (text && text !== p.text) {
        updateProgress(todoId, p.id, text, progressModal.temporary);
      } else if (progressModal.temporary !== (p.temporary === true)) {
        updateProgress(todoId, p.id, p.text, progressModal.temporary);
      }
      if (progressModal.urgent !== (p.urgent === true)) {
        setProgressUrgent(todoId, p.id, progressModal.urgent === true);
      }
      if ((progressModal.reminderTime || null) !== (p.reminderTime || null)) {
        setProgressReminder(todoId, p.id, progressModal.reminderTime || null);
      }
      if ((progressModal.dueDate || null) !== (p.dueDate || null)) {
        setProgressDue(todoId, p.id, progressModal.dueDate || null);
      }
    }
    setProgressModal(null);
    setFabHidden(false);
  }, [progressModal, todoId, addProgress, updateProgress, setProgressUrgent, setProgressReminder, setProgressDue, setFabHidden]);

  const toggleSelect = useCallback((pid) => {
    setSelectedPIds(prev => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });
  }, []);

  const handleBatchDelete = useCallback(() => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    selectedPIds.forEach(pid => deleteProgress(todoId, pid));
    exitManage();
  }, [confirmDelete, selectedPIds, todoId, deleteProgress, exitManage]);

  const handleBatchComplete = useCallback(() => {
    selectedPIds.forEach(pid => toggleProgressStatus(todoId, pid, 'completed'));
    exitManage();
  }, [selectedPIds, todoId, toggleProgressStatus, exitManage]);

  const handleBatchCancel = useCallback(() => {
    selectedPIds.forEach(pid => toggleProgressStatus(todoId, pid, 'cancelled'));
    exitManage();
  }, [selectedPIds, todoId, toggleProgressStatus, exitManage]);

  const hasSelection = selectedPIds.size > 0;

  const { activeProgress, archivedProgress, cycleMarkerItem } = useMemo(() => {
    const active = [];
    const archived = [];
    let cycleMarkerItem = null;
    for (const p of items) {
      if (cycleMarker && p.id === cycleMarker.id) {
        cycleMarkerItem = p;
        continue;
      }
      (p.status === 'active' ? active : archived).push(p);
    }
    return { activeProgress: active, archivedProgress: archived, cycleMarkerItem };
  }, [items, cycleMarker]);

  const completedCount = cycleStats.completed;
  const allCompleted = cycleStats.allDone;
  const summaryPct = progressCount > 0 ? Math.round((completedCount / progressCount) * 100) : 0;
  const cycleDone = cycleStats.cycleDone;

  const progressModalNode = progressModal ? createPortal(
    <ProgressModal
      modal={progressModal}
      onChange={handleModalChange}
      onSave={handleSaveModal}
      onCancel={handleModalCancel}
      onSetReminder={handleModalSetReminder}
      onSetDue={handleModalSetDue}
      onPromote={handlePromote}
    />,
    document.body
  ) : null;

  const sortedArchived = useMemo(() => {
    const completed = [];
    const cancelled = [];
    for (const p of archivedProgress) {
      (p.status === 'completed' ? completed : cancelled).push(p);
    }
    const ts = p => new Date(p.completedAt ?? p.createdAt ?? p.time ?? 0).getTime();
    completed.sort((a, b) => ts(b) - ts(a));
    return [...completed, ...cancelled];
  }, [archivedProgress]);

  // 安全渲染：折叠时不渲染
  if (collapsed) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="progress-section">
        {!inBatch && (
          <div className="todo-progress-bar">
            <ProgressDefaultBar
              allCount={0}
              onShowInput={openAddModal}
              onManage={() => {}}
            />
          </div>
        )}
        {progressModalNode}
      </div>
    );
  }

  // 安全渲染：有进度时显示列表
  return (
    <div className="progress-section" onClick={inBatch ? e => e.stopPropagation() : undefined}>
      {!inBatch && checklistMode && progressCount > 0 && (
        <div className={`progress-summary ${allCompleted ? 'all-done' : ''}`}>
          <span className="progress-summary-text">已完成 {completedCount}/{progressCount}</span>
          <div className="progress-summary-bar">
            <div className="progress-summary-fill" style={{ width: `${summaryPct}%` }} />
          </div>
          {allCompleted && (cycleDone ? (
            <span className="progress-done-note">本期已完成 ✓</span>
          ) : (
            <button
              className="btn-mini btn-mini-save progress-finish-btn"
              onClick={(e) => { e.stopPropagation(); completeTodo(todoId); }}
              title="全部子项已完成，一键完成待办"
            >
              完成待办
            </button>
          ))}
        </div>
      )}

      {activeProgress.length > 0 && (
        <div className="progress-active-row">
          {activeProgress.map(p => (
            <div key={p.id}
              className={`progress-entry active progress-card ${isLongProgressText(p.text) ? 'progress-long' : 'progress-short'} ${manageMode ? 'progress-manage' : 'progress-clickable'} ${selectedPIds.has(p.id) ? 'progress-selected' : ''} ${p.urgent ? 'progress-urgent' : ''} ${isReminderDue(p) ? 'progress-reminder-due' : ''} ${isOverdue(p.dueDate) ? 'progress-overdue' : ''}`}
              onClick={manageMode ? () => toggleSelect(p.id) : () => handleOpenEdit(p)}>
              {!inBatch && !manageMode && (
                <span className="progress-actions">
                  <button className="p-action done" onClick={(e) => { e.stopPropagation(); toggleProgressStatus(todoId, p.id, 'completed'); }} title="完成">&#x2713;</button>
                </span>
              )}
              {manageMode && (
                <span className={`progress-check-circle ${selectedPIds.has(p.id) ? 'checked' : ''}`}>
                  {selectedPIds.has(p.id) ? '\u2713' : ''}
                </span>
              )}
              <span className="progress-date">{new Date(p.createdAt ?? p.time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
              {p.urgent && <span className="progress-urgent-tag">急</span>}
              {p.dueDate && <span className={`progress-due-tag ${isOverdue(p.dueDate) ? 'overdue' : ''}`}>截止 {formatCompactDateTime(p.dueDate)}</span>}
              {p.reminderTime && <span className="progress-reminder-tag">提醒 {formatCompactDateTime(p.reminderTime)}</span>}
              {p.temporary && <span className="progress-temp-tag">临时</span>}
              <span className="progress-text">{highlightText(String(p.text), highlight)}</span>
            </div>
          ))}
        </div>
      )}

      {!inBatch && (
        <div className="todo-progress-bar">
          {manageMode ? (
            <ProgressManageBar
              selectedCount={selectedPIds.size} confirmDelete={confirmDelete}
              onComplete={handleBatchComplete} onCancelItems={handleBatchCancel}
              onDelete={handleBatchDelete} onSetDate={() => setShowDateModal(true)}
              onExit={exitManage} onCancelConfirm={() => setConfirmDelete(false)}
              hasSelection={hasSelection}
            />
          ) : (
            <ProgressDefaultBar
              allCount={items.length}
              onShowInput={openAddModal}
              onManage={() => { setManageMode(true); setConfirmDelete(false); }}
            />
          )}
        </div>
      )}

      {cycleMarkerItem && (
        <div className="progress-cycle-marker">
          <div className={`progress-entry ${cycleMarkerItem.status}`}>
            {!inBatch && (
              <span className="progress-actions">
                <button
                  className="p-action undo"
                  onClick={(e) => { e.stopPropagation(); reopenCycle(todoId); }}
                  title="撤销本期"
                >
                  &#x21A9;
                </button>
              </span>
            )}
            <span className="progress-status-tag">{cycleMarkerItem.kind === 'cycle-done' ? '本期完成' : '本期作废'}</span>
            <span className="progress-date">{archiveDateRange(cycleMarkerItem)}</span>
            <span className="progress-text">{cycleMarkerItem.text}</span>
          </div>
        </div>
      )}

      {archivedProgress.length > 0 && (
        <div className="progress-archive">
          <div className="archive-toggle" onClick={() => setShowArchived(v => !v)}>
            <span className={`triangle ${showArchived ? 'open' : ''}`}>&#x25B6;</span>
            <span>已归档进度 ({archivedProgress.length})</span>
          </div>
          {showArchived && (
            <div className="progress-log archived">
              {sortedArchived.map(p => (
                <div key={p.id}
                  className={`progress-entry ${p.status} ${manageMode ? 'progress-manage' : 'progress-clickable'} ${selectedPIds.has(p.id) ? 'progress-selected' : ''}`}
                  onClick={manageMode ? () => toggleSelect(p.id) : () => handleOpenEdit(p)}>
                  {!inBatch && !manageMode && !isMarkerKind(p.kind) && (
                    <span className="progress-actions">
                      <button className="p-action undo" onClick={(e) => { e.stopPropagation(); toggleProgressStatus(todoId, p.id, p.status); }} title="恢复">&#x21A9;</button>
                    </span>
                  )}
                  {manageMode && (
                    <span className={`progress-check-circle ${selectedPIds.has(p.id) ? 'checked' : ''}`}>
                      {selectedPIds.has(p.id) ? '\u2713' : ''}
                    </span>
                  )}
                  <span className="progress-status-tag">{p.kind === 'promoted' ? '已抽出' : p.status === 'completed' ? '已完成' : '已作废'}</span>
                  <span className="progress-date">{archiveDateRange(p)}</span>
                  {p.temporary && <span className="progress-temp-tag">临时</span>}
                  {highlightText(String(p.text), highlight)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showDateModal && (
        <CompleteDateModal count={selectedPIds.size}
          onConfirm={(dateString) => { selectedPIds.forEach(pid => updateProgressCompletedAt(todoId, pid, dateString)); exitManage(); }}
          onCancel={() => setShowDateModal(false)} />
      )}

      {progressModalNode}
    </div>
  );
}
