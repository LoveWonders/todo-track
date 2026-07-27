import { useState, useRef, useCallback, useEffect } from 'react';
import { mergeAndArchive, loadArchive } from '../utils/autoArchive';

const TEST_DATA_TAG = '__perf_test__';

const MOCK_TAGS = ['紧急', '长期', '前端', '后端', '设计', '测试', '文档', '架构', '运维'];
const MOCK_PREFIXES = ['完成', '修复', '优化', '实现', '设计', '调研', '编写', '部署', '测试', '重构', '配置', '发布', '迁移', '升级', '调试', '集成', '拆分', '合并', '回滚', '补丁'];
const MOCK_MODULES = ['登录', '注册', '首页', '用户管理', '权限', '支付', '订单', '搜索', '通知', '统计', '报表', '设置', '文件上传', '消息推送', '数据导出', '日志', '缓存', '消息队列', '定时任务', 'API网关'];

function generateMockTodos(count, baseId) {
  const todos = [];
  for (let i = 0; i < count; i++) {
    const tagCount = 1 + Math.floor(Math.random() * 4);
    const shuffled = [...MOCK_TAGS].sort(() => Math.random() - 0.5);
    const tags = shuffled.slice(0, tagCount).filter(t => t !== '紧急');
    if (Math.random() < 0.15) tags.unshift('紧急');

    const dayOffset = Math.floor(Math.random() * 90) - 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dayOffset);
    const dueStr = dueDate.toISOString().split('T')[0] + 'T23:59:59';

    const startOffset = -(1 + Math.floor(Math.random() * 14));
    const startDate = new Date(dueDate);
    startDate.setDate(startDate.getDate() + startOffset);
    const startStr = startDate.toISOString().split('T')[0] + 'T23:59:59';

    const hasProgress = Math.random() < 0.25;
    const progressCount = hasProgress ? 1 + Math.floor(Math.random() * 3) : 0;
    const progress = [];
    for (let j = 0; j < progressCount; j++) {
      progress.push({
        id: baseId + i * 100 + j,
        text: `第${j + 1}步${MOCK_PREFIXES[(i + j) % MOCK_PREFIXES.length]}`,
        createdAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
        status: Math.random() < 0.5 ? 'completed' : 'active',
      });
    }

    const statusRoll = Math.random();
    const status = statusRoll < 0.08 ? 'completed' : statusRoll < 0.12 ? 'cancelled' : 'active';

    const daysAgo = status === 'completed' ? 30 + Math.floor(Math.random() * 60) : Math.floor(Math.random() * 7);
    const completedAt = status !== 'active'
      ? new Date(Date.now() - daysAgo * 86400000).toISOString()
      : null;

    todos.push({
      id: baseId + i,
      title: `${MOCK_PREFIXES[i % MOCK_PREFIXES.length]}${MOCK_MODULES[i % MOCK_MODULES.length]}`,
      startDate: startStr,
      dueDate: dueStr,
      tags: [...tags, TEST_DATA_TAG],
      status,
      createdAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
      completedAt,
      progress,
    });
  }
  return todos;
}

export default function PerformanceTester({ todos, importTodos, deleteTodo, visible }) {
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [archiveResult, setArchiveResult] = useState(null);
  const [testCount, setTestCount] = useState(1000);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const testIdBaseRef = useRef(900000);
  const panelRef = useRef(null);

  const testTodoCount = todos.filter(t => (t.tags || []).includes(TEST_DATA_TAG)).length;

  const handleCountChange = useCallback((e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      setTestCount(Math.min(val, 50000));
    } else if (e.target.value === '') {
      setTestCount(1);
    }
  }, []);

  const injectData = useCallback(async () => {
    setBusy(true);
    setArchiveResult(null);
    testIdBaseRef.current += 10000;
    await new Promise(r => setTimeout(r, 0));
    const mockData = generateMockTodos(testCount, testIdBaseRef.current);
    importTodos(mockData, 'skip');
    setBusy(false);
  }, [importTodos, testCount]);

  const clearData = useCallback(async () => {
    const ids = todos.filter(t => (t.tags || []).includes(TEST_DATA_TAG)).map(t => t.id);
    if (ids.length === 0) return;
    setBusy(true);
    setArchiveResult(null);
    await new Promise(r => setTimeout(r, 0));
    ids.forEach(id => deleteTodo(id));
    setBusy(false);
  }, [todos, deleteTodo]);

  const runArchiveCheck = useCallback(() => {
    const existingBefore = loadArchive().length;
    const totalBeforeArchive = todos.length;

    const { remaining, newlyArchived } = mergeAndArchive(todos);

    const activeRatio = 0.92;
    const expectedMax = Math.round(totalBeforeArchive * (activeRatio + 0.03));
    const pass = remaining.length <= expectedMax && newlyArchived.length > 0;

    setArchiveResult({
      totalBefore: totalBeforeArchive,
      totalAfter: remaining.length,
      archivedCount: newlyArchived.length,
      existingBefore,
      existingAfter: existingBefore + newlyArchived.length,
      expectedMax,
      pass,
    });
  }, [todos]);

  const onMouseDown = useCallback((e) => {
    if (e.target.tagName === 'BUTTON') return;
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      setPos({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!visible) return null;

  if (collapsed) {
    return (
      <div
        className="perf-tester-mini"
        style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
        onMouseDown={onMouseDown}
        onClick={() => setCollapsed(false)}
        title="展开性能测试"
      >
        &#x1F4CA;
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="perf-tester"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
    >
      <div className="perf-tester-bar" onMouseDown={onMouseDown}>
        <span className="perf-tester-label">性能测试</span>
        <button className="perf-tester-close" onClick={() => setCollapsed(true)} title="收起">&minus;</button>
      </div>
      <div className="perf-tester-body">
        <span className="perf-tester-count">总计 {todos.length} 条（测试 {testTodoCount} 条）</span>

        <div className="perf-tester-input-row">
          <label className="perf-input-label">注入条数</label>
          <input
            type="number"
            className="perf-input"
            value={testCount}
            onChange={handleCountChange}
            min={1}
            max={50000}
            step={100}
          />
        </div>

        <div className="perf-tester-btns">
          <button className="perf-btn perf-btn-inject" onClick={injectData} disabled={busy}>
            {busy ? '注入中...' : `注入 ${testCount} 条测试数据`}
          </button>
          <button className="perf-btn perf-btn-clear" onClick={clearData} disabled={busy || testTodoCount === 0}>
            清空测试数据 ({testTodoCount})
          </button>
          <button className="perf-btn perf-btn-archive" onClick={runArchiveCheck} disabled={busy}>
            运行归档验证
          </button>
        </div>

        {archiveResult && (
          <div className="perf-tester-archive-result">
            <div className="perf-archive-row">
              <span>归档前总数</span>
              <span>{archiveResult.totalBefore}</span>
            </div>
            <div className="perf-archive-row">
              <span>归档后剩余</span>
              <span>{archiveResult.totalAfter}</span>
            </div>
            <div className="perf-archive-row">
              <span>新归档数量</span>
              <span>{archiveResult.archivedCount}</span>
            </div>
            <div className="perf-archive-row">
              <span>归档存储总计</span>
              <span>{archiveResult.existingAfter}</span>
            </div>
            <div className={`perf-archive-assert ${archiveResult.pass ? 'pass' : 'fail'}`}>
              {archiveResult.pass
                ? `验证通过：主列表保留 ${archiveResult.totalAfter} 条（预期 <=${archiveResult.expectedMax}），归档 ${archiveResult.archivedCount} 条`
                : `验证失败：主列表剩余 ${archiveResult.totalAfter} 条（预期 <=${archiveResult.expectedMax}），归档 ${archiveResult.archivedCount} 条`
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
