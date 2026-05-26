// =========================================================
//  APP STATE
// =========================================================
let appData = {
  logs: [],
  schedules: {},
  ideas: [],
  memos: [],
  reflections: {},
  timerState: 'idle',
  timerStartTime: null,
  timerSessionStart: null,
  timerElapsedMs: 0,
  timerCategory: null,
  timerDescription: ''
};

let calendarYear, calendarMonth;
let currentSelectedDate = '';
let reflectionDate = '';

// Layout state
let isFolded = true;
let activePanel = null; // null | 'calendar' | 'notes'
let wasFoldedBeforeLog = false;
let isMaximized = false;

// Notes panel
let activeTab = 'ideas';

// Analytics
let analyticsRange = 'week';
let analyticsCustomStart = '';
let analyticsCustomEnd = '';

let currentMood = 'idle';
let selectedCategory = 'learning';
let timerIntervalId = null;

// Map log category -> pet mood
function categoryToMood(category) {
  const map = { learning:'study', work:'working', entertainment:'sleepy', life:'energy' };
  return map[category] || 'idle';
}

function syncPetMood(category) {
  const mood = categoryToMood(category);
  if (window.api && window.api.sendPetMood) window.api.sendPetMood(mood);
}

// =========================================================
//  DOM REFERENCES
// =========================================================
const alwaysOnTopBtn   = document.getElementById('always-on-top-btn');
const foldWidgetBtn    = document.getElementById('fold-widget-btn');
const toggleCalendarBtn= document.getElementById('toggle-calendar-btn');
const toggleNotesBtn   = document.getElementById('toggle-notes-btn');
const minimizeBtn      = document.getElementById('minimize-btn');
const maximizeBtn      = document.getElementById('maximize-btn');
const maximizeIcon     = document.getElementById('maximize-icon');
const closeBtn         = document.getElementById('close-btn');

// Zoom controls
const zoomOutBtn       = document.getElementById('zoom-out-btn');
const zoomInBtn        = document.getElementById('zoom-in-btn');
const zoomResetBtn     = document.getElementById('zoom-reset-btn');

const calendarDrawer   = document.getElementById('calendar-drawer');
const notesPanel       = document.getElementById('notes-panel');
const closeCalendarBtn = document.getElementById('close-calendar-btn');
const closeNotesBtn    = document.getElementById('close-notes-btn');
const trackerWidget    = document.getElementById('tracker-widget');
const foldIcon         = document.getElementById('fold-icon');

// Tracker
const timerDisplay      = document.getElementById('timer-display');
const timerIntervalRange= document.getElementById('timer-interval-range');
const timerLabel        = document.getElementById('timer-label');
const currentTimeDisplay= document.getElementById('current-time-display');
const timerStartBtn     = document.getElementById('timer-start-btn');
const timerPauseBtn     = document.getElementById('timer-pause-btn');
const timerResumeBtn    = document.getElementById('timer-resume-btn');
const timerStopBtn      = document.getElementById('timer-stop-btn');
const timerCategoryOverlay = document.getElementById('timer-category-overlay');

const logOverlay        = document.getElementById('log-overlay');
const logDescriptionInput= document.getElementById('log-description');
const cancelLogBtn      = document.getElementById('cancel-log-btn');
const closeLogBtn       = document.getElementById('close-log-btn');
const saveLogBtn        = document.getElementById('save-log-btn');
const logErrorMsg       = document.getElementById('log-error-msg');

const totalTrackedTime      = document.getElementById('total-tracked-time');
const learningProgress      = document.getElementById('learning-progress');
const learningTimeText      = document.getElementById('learning-time-text');
const workProgress          = document.getElementById('work-progress');
const workTimeText          = document.getElementById('work-time-text');
const entertainmentProgress = document.getElementById('entertainment-progress');
const entertainmentTimeText = document.getElementById('entertainment-time-text');
const lifeProgress          = document.getElementById('life-progress');
const lifeTimeText          = document.getElementById('life-time-text');
const todayLogsList         = document.getElementById('today-logs-list');

// Calendar
const prevMonthBtn      = document.getElementById('prev-month-btn');
const nextMonthBtn      = document.getElementById('next-month-btn');
const calendarMonthYear = document.getElementById('calendar-month-year');
const calendarDaysGrid  = document.getElementById('calendar-days-grid');
const selectedDateTitle = document.getElementById('selected-date-title');
const scheduleList      = document.getElementById('schedule-list');
const addScheduleForm   = document.getElementById('add-schedule-form');
const schedStartTime    = document.getElementById('sched-start-time');
const schedEndTime      = document.getElementById('sched-end-time');
const schedTitle        = document.getElementById('sched-title');
const schedErrorMsg     = document.getElementById('sched-error-msg');
const dayCharts         = document.getElementById('day-charts');
const dayActivityTimeline= document.getElementById('day-activity-timeline');

// Notes – Ideas
const ideaInput     = document.getElementById('idea-input');
const ideaSubmitBtn = document.getElementById('idea-submit-btn');
const ideasList     = document.getElementById('ideas-list');

// Notes – Memos
const memoInput         = document.getElementById('memo-input');
const memoSubmitBtn     = document.getElementById('memo-submit-btn');
const memosList         = document.getElementById('memos-list');
const memoCountText     = document.getElementById('memo-count-text');
const clearDoneMemosBtn = document.getElementById('clear-done-memos-btn');

// Notes – Reflection
const reflPrevDay       = document.getElementById('refl-prev-day');
const reflNextDay       = document.getElementById('refl-next-day');
const reflDateLabel     = document.getElementById('refl-date-label');
const reflectionTextarea= document.getElementById('reflection-textarea');
const saveReflectionBtn = document.getElementById('save-reflection-btn');
const reflectionCharCount= document.getElementById('reflection-char-count');
const reflSummaryBars   = document.getElementById('refl-summary-bars');

// Notes – Analytics
const rangeButtons      = document.querySelectorAll('.range-btn');
const customRangeRow    = document.getElementById('custom-range-row');
const analyticsStartDate= document.getElementById('analytics-start-date');
const analyticsEndDate  = document.getElementById('analytics-end-date');
const analyticsApplyBtn = document.getElementById('analytics-apply-btn');
const analyticsOutput   = document.getElementById('analytics-output');

// =========================================================
//  HELPERS
// =========================================================
function toDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function toTimeStr(date) {
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}
function toTimestampStr(date) {
  return `${toDateStr(date)} ${toTimeStr(date)}`;
}
function fmtDur(min) {
  if (min < 60) return `${min}分钟`;
  const h = Math.floor(min/60), m = min%60;
  return m ? `${h}小时${m}分钟` : `${h}小时`;
}
function fmtDurAbbr(min) {
  return `${Math.floor(min/60)}h ${min%60}m`;
}

// =========================================================
//  WINDOW LAYOUT
// =========================================================
function setWindowLayout() {
  // CSS classes
  trackerWidget.classList.toggle('folded', isFolded);
  calendarDrawer.classList.toggle('collapsed', activePanel !== 'calendar');
  notesPanel.classList.toggle('collapsed', activePanel !== 'notes');

  toggleCalendarBtn.classList.toggle('active', activePanel === 'calendar');
  toggleNotesBtn.classList.toggle('active', activePanel === 'notes');

  foldIcon.innerHTML = isFolded
    ? '<polyline points="6 9 12 15 18 9"/>'
    : '<polyline points="18 15 12 9 6 15"/>';
  foldWidgetBtn.title = isFolded ? '展开记录面板' : '折叠记录面板';

  // Size — only auto-resize when toggling panel (base width changes)
  syncWindowSize();

  if (activePanel === 'calendar') { renderCalendar(); updateDayDetails(); }
  if (activePanel === 'notes') { renderNotesTab(); }
}

// =========================================================
//  TITLEBAR BUTTON BINDINGS
// =========================================================
alwaysOnTopBtn.addEventListener('click', async () => {
  const on = await window.api.toggleAlwaysOnTop();
  alwaysOnTopBtn.classList.toggle('active', on);
});
minimizeBtn.addEventListener('click', () => window.api.minimize());
closeBtn.addEventListener('click', () => window.api.close());

// Maximize / Restore
maximizeBtn.addEventListener('click', () => {
  if (isMaximized) {
    window.api.unmaximize();
    maximizeBtn.title = '最大化';
    maximizeIcon.innerHTML = '<rect x="4" y="4" width="16" height="16" rx="2"/>';
  } else {
    window.api.maximize();
    maximizeBtn.title = '还原';
    maximizeIcon.innerHTML = '<rect x="5" y="9" width="14" height="10" rx="2"/><rect x="9" y="5" width="14" height="10" rx="2"/>';
  }
});

window.api.onMaximizeChange((isMax) => {
  isMaximized = isMax;
  if (isMax) {
    maximizeBtn.title = '还原';
    maximizeIcon.innerHTML = '<rect x="5" y="9" width="14" height="10" rx="2"/><rect x="9" y="5" width="14" height="10" rx="2"/>';
  } else {
    maximizeBtn.title = '最大化';
    maximizeIcon.innerHTML = '<rect x="4" y="4" width="16" height="16" rx="2"/>';
    setWindowLayout();
  }
});

// Zoom controls
let zoomLevel = 1;
let resizingFromCode = false;
let resizeDebounce = null;

function applyZoom(factor) {
  zoomLevel = Math.round(factor * 100) / 100;
  zoomLevel = Math.max(0.5, Math.min(3.0, zoomLevel));
  window.api.setZoom(zoomLevel);
  appData.zoomLevel = zoomLevel;
  saveData();
  syncWindowSize();
}

function syncWindowSize() {
  if (isMaximized) return;
  resizingFromCode = true;
  const baseW = activePanel ? 840 : 340;
  const baseH = (!isFolded || activePanel) ? 620 : 140;
  const w = Math.round(baseW * zoomLevel);
  const h = Math.round(baseH * zoomLevel);
  window.api.setWindowSize(w, h);
  setTimeout(() => { resizingFromCode = false; }, 200);
}

window.addEventListener('resize', () => {
  if (resizingFromCode || isMaximized) return;
  clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(() => {
    const baseW = activePanel ? 840 : 340;
    const newZoom = Math.round(window.outerWidth / baseW * 100) / 100;
    const clamped = Math.max(0.5, Math.min(3.0, newZoom));
    if (Math.abs(clamped - zoomLevel) > 0.02) {
      zoomLevel = clamped;
      window.api.setZoom(zoomLevel);
      appData.zoomLevel = zoomLevel;
      saveData();
    }
  }, 150);
});

zoomInBtn.addEventListener('click', () => {
  applyZoom(zoomLevel + 0.15);
});
zoomOutBtn.addEventListener('click', () => {
  applyZoom(Math.max(0.5, zoomLevel - 0.15));
});
zoomResetBtn.addEventListener('click', () => {
  applyZoom(1);
});

foldWidgetBtn.addEventListener('click', () => {
  isFolded = !isFolded;
  if (isFolded) activePanel = null;
  setWindowLayout();
  if (!isFolded) updateTrackerView();
});

toggleCalendarBtn.addEventListener('click', () => {
  activePanel = activePanel === 'calendar' ? null : 'calendar';
  if (activePanel) isFolded = false;
  setWindowLayout();
});
closeCalendarBtn.addEventListener('click', () => {
  activePanel = null; setWindowLayout();
});

toggleNotesBtn.addEventListener('click', () => {
  activePanel = activePanel === 'notes' ? null : 'notes';
  if (activePanel) isFolded = false;
  setWindowLayout();
});
closeNotesBtn.addEventListener('click', () => {
  activePanel = null; setWindowLayout();
});

// =========================================================
//  TAB SWITCHING
// =========================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    document.getElementById(`tab-${activeTab}`).classList.add('active');
    renderNotesTab();
  });
});

function renderNotesTab() {
  if (activeTab === 'ideas') renderIdeas();
  else if (activeTab === 'memos') renderMemos();
  else if (activeTab === 'reflection') renderReflection();
  else if (activeTab === 'analytics') renderAnalytics();
}

// =========================================================
//  TIMER STATE MACHINE
// =========================================================
function renderTimerButtons() {
  const s = appData.timerState;
  timerStartBtn.classList.toggle('hidden', s !== 'idle');
  timerPauseBtn.classList.toggle('hidden', s !== 'running');
  timerResumeBtn.classList.toggle('hidden', s !== 'paused');
  timerStopBtn.classList.toggle('hidden', s === 'idle');

  if (s === 'idle') {
    timerLabel.textContent = '计时就绪';
  } else if (s === 'running') {
    timerLabel.textContent = appData.timerCategory
      ? `当前任务：${catName(appData.timerCategory)}`
      : '计时中';
  } else {
    timerLabel.textContent = '已暂停';
  }
}

function catName(cat) {
  const map = { learning: '📚 学习', work: '💼 工作', entertainment: '🎮 娱乐', life: '🌱 生活' };
  return map[cat] || '';
}

function getRunningMs() {
  if (appData.timerState !== 'running' || !appData.timerStartTime) return appData.timerElapsedMs;
  const startMs = new Date(appData.timerStartTime).getTime();
  return appData.timerElapsedMs + Math.max(0, Date.now() - startMs);
}

function startTimerClock() {
  if (timerIntervalId) clearInterval(timerIntervalId);
  const tick = () => {
    const totalMs = getRunningMs();
    const s = Math.floor(totalMs / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    timerDisplay.textContent = `${hh}:${mm}:${ss}`;

    if (appData.timerSessionStart) {
      timerIntervalRange.textContent = `自 ${toTimeStr(new Date(appData.timerSessionStart))} 起`;
    } else if (appData.timerState !== 'idle' && appData.timerStartTime) {
      timerIntervalRange.textContent = `自 ${toTimeStr(new Date(appData.timerStartTime))} 起`;
    } else if (appData.timerState === 'paused') {
      timerIntervalRange.textContent = '计时已暂停';
    } else {
      timerIntervalRange.textContent = '点击下方开始计时';
    }

    currentTimeDisplay.textContent = new Date().toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' });
  };
  tick();
  timerIntervalId = setInterval(tick, 1000);
}

// ── Start timer (with category popup) ──────────────────────
timerStartBtn.addEventListener('click', () => {
  wasFoldedBeforeLog = isFolded;
  if (isFolded) { isFolded = false; setWindowLayout(); }
  requestAnimationFrame(() => {
    timerCategoryOverlay.classList.remove('hidden');
    void timerCategoryOverlay.offsetHeight;
  });
});

// ── Category chip clicks in quick selector ─────────────────
document.querySelectorAll('.timer-cat-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const cat = chip.dataset.category;
    appData.timerCategory = cat;
    appData.timerDescription = document.getElementById('timer-preset-desc').value.trim();
    timerCategoryOverlay.classList.add('hidden');
    startTimerActual();
  });
});

// ── Skip category selection ────────────────────────────────
document.getElementById('timer-category-skip-btn').addEventListener('click', () => {
  appData.timerCategory = null;
  appData.timerDescription = document.getElementById('timer-preset-desc').value.trim();
  timerCategoryOverlay.classList.add('hidden');
  startTimerActual();
});

// ── Actual timer start ─────────────────────────────────────
function startTimerActual() {
  appData.timerState = 'running';
  appData.timerStartTime = new Date().toISOString();
  appData.timerSessionStart = appData.timerStartTime;
  appData.timerElapsedMs = 0;
  saveData();
  renderTimerButtons();
  startTimerClock();
  if (appData.timerCategory) syncPetMood(appData.timerCategory);
}

// ── Pause ──────────────────────────────────────────────────
timerPauseBtn.addEventListener('click', () => {
  if (appData.timerState !== 'running') return;
  const totalMs = getRunningMs();
  appData.timerElapsedMs = totalMs;
  appData.timerState = 'paused';
  saveData();
  renderTimerButtons();
  startTimerClock();
});

// ── Resume ─────────────────────────────────────────────────
timerResumeBtn.addEventListener('click', () => {
  if (appData.timerState !== 'paused') return;
  appData.timerState = 'running';
  appData.timerStartTime = new Date().toISOString();
  saveData();
  renderTimerButtons();
  startTimerClock();
});

// ── Stop → show log form ───────────────────────────────────
timerStopBtn.addEventListener('click', () => {
  if (appData.timerState === 'idle') return;
  const totalMs = getRunningMs();
  const durMin = Math.max(1, Math.round(totalMs / 60000));

  // Compute absolute start/end times for editable fields
  const now = new Date();
  const startDate = appData.timerSessionStart
    ? new Date(appData.timerSessionStart)
    : new Date(now.getTime() - totalMs);

  document.getElementById('log-start-time').value = toTimeStr(startDate);
  document.getElementById('log-end-time').value = toTimeStr(now);
  updateLogDuration();

  logDescriptionInput.value = appData.timerDescription || '';
  logErrorMsg.classList.add('hidden');

  // Pre-select category if chosen at start
  const catChips = document.querySelectorAll('#log-category-selector .category-chip');
  catChips.forEach(c => c.classList.remove('active'));
  if (appData.timerCategory) {
    const preChip = document.querySelector(`#log-category-selector .category-chip[data-category="${appData.timerCategory}"]`);
    if (preChip) preChip.classList.add('active');
  }
  selectedCategory = appData.timerCategory || 'learning';

  logOverlay.classList.remove('hidden');
  void logOverlay.offsetHeight;
  setTimeout(() => logDescriptionInput.focus(), 50);
});

// ── Update duration display when times change ──────────────
function updateLogDuration() {
  const st = document.getElementById('log-start-time').value;
  const et = document.getElementById('log-end-time').value;
  if (!st || !et) { document.getElementById('log-duration-display').textContent = '--'; return; }
  const [sh, sm] = st.split(':').map(Number);
  const [eh, em] = et.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  document.getElementById('log-duration-display').textContent = fmtDur(diff);
}

document.getElementById('log-start-time').addEventListener('input', updateLogDuration);
document.getElementById('log-end-time').addEventListener('input', updateLogDuration);

// =========================================================
//  DATA LOAD / SAVE
// =========================================================
async function loadData() {
  const d = await window.api.loadData();
  appData = Object.assign({
    logs:[], schedules:{}, ideas:[], memos:[], reflections:{},
    timerState:'idle', timerStartTime:null, timerSessionStart:null, timerElapsedMs:0, timerCategory:null, timerDescription:''
  }, d || {});
  if (!appData.ideas) appData.ideas = [];
  if (!appData.memos) appData.memos = [];
  if (!appData.reflections) appData.reflections = {};

  // Migrate old currentIntervalStart → new timerState
  if (d && d.currentIntervalStart && !d.timerState) {
    appData.timerState = 'running';
    appData.timerStartTime = d.currentIntervalStart;
    appData.timerSessionStart = d.currentIntervalStart;
    appData.timerElapsedMs = 0;
    appData.timerCategory = null;
    appData.timerDescription = '';
    delete appData.currentIntervalStart;
    await saveData();
  }

  // Auto-resume if timer was running (cross-session continuity)
  if (appData.timerState === 'running' && appData.timerStartTime) {
    const startMs = new Date(appData.timerStartTime).getTime();
    if (!isNaN(startMs)) {
      appData.timerElapsedMs = (appData.timerElapsedMs || 0) + Math.max(0, Date.now() - startMs);
      appData.timerStartTime = new Date().toISOString();
      await saveData();
    }
  }

  zoomLevel = appData.zoomLevel || 1;
  if (zoomLevel !== 1) window.api.setZoom(zoomLevel);

  const today = new Date();
  calendarYear = today.getFullYear();
  calendarMonth = today.getMonth();
  currentSelectedDate = toDateStr();
  reflectionDate = toDateStr();

  renderTimerButtons();
  startTimerClock();
  updateTrackerView();
  setWindowLayout();

  // Sync always-on-top initial state
  const isAot = await window.api.isAlwaysOnTop?.();
  if (isAot !== undefined) alwaysOnTopBtn.classList.toggle('active', isAot);
}

async function saveData() {
  await window.api.saveData(appData);
}

// =========================================================
//  LOGGING FORM (save / cancel / close)
// =========================================================
logDescriptionInput.addEventListener('input', () => logErrorMsg.classList.add('hidden'));
logDescriptionInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveLogBtn.click(); } });

function closeLog() {
  logOverlay.classList.add('hidden');
  logErrorMsg.classList.add('hidden');
  if (wasFoldedBeforeLog) { isFolded = true; setWindowLayout(); }
}
cancelLogBtn.addEventListener('click', closeLog);
closeLogBtn.addEventListener('click', closeLog);

// Category chip clicks in log form
document.querySelectorAll('#log-category-selector .category-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#log-category-selector .category-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedCategory = chip.dataset.category;
  });
});

saveLogBtn.addEventListener('click', async () => {
  const desc = logDescriptionInput.value.trim();
  if (!desc) {
    logErrorMsg.textContent = '⚠️ 请输入做了什么！';
    logErrorMsg.classList.remove('hidden');
    logDescriptionInput.focus();
    return;
  }

  saveLogBtn.disabled = true;
  saveLogBtn.textContent = '保存中...';

  const stVal = document.getElementById('log-start-time').value;
  const etVal = document.getElementById('log-end-time').value;
  const startTime = stVal || toTimeStr(new Date());
  const endTime = etVal || toTimeStr(new Date());

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let dur = (eh * 60 + em) - (sh * 60 + sm);
  if (dur < 0) dur += 24 * 60;
  dur = Math.max(1, dur);

  const now = new Date();
  const dateStr = toDateStr(now);

  appData.logs.push({
    id: Date.now().toString(),
    date: dateStr,
    startTime: startTime,
    endTime: endTime,
    description: desc,
    category: selectedCategory,
    durationMinutes: dur
  });

    // Reset timer state
    appData.timerState = 'idle';
    appData.timerStartTime = null;
    appData.timerSessionStart = null;
    appData.timerElapsedMs = 0;
    appData.timerCategory = null;
    appData.timerDescription = '';

  try {
    await saveData();
  } catch(err) {
    logErrorMsg.textContent = '⚠️ 保存失败，请重试';
    logErrorMsg.classList.remove('hidden');
    saveLogBtn.disabled = false;
    saveLogBtn.textContent = '保存';
    return;
  }

  saveLogBtn.disabled = false;
  saveLogBtn.textContent = '保存';
  logOverlay.classList.add('hidden');
  logErrorMsg.classList.add('hidden');

  syncPetMood(selectedCategory);

  renderTimerButtons();
  updateTrackerView();
  if (wasFoldedBeforeLog) { isFolded = true; setWindowLayout(); }
  startTimerClock();
  if (activePanel === 'calendar') { renderCalendar(); updateDayDetails(); }
  if (activePanel === 'notes' && activeTab === 'analytics') renderAnalytics();
  if (activePanel === 'notes' && activeTab === 'reflection') renderReflectionSummary();
});

// =========================================================
//  TRACKER VIEW
// =========================================================
function updateTrackerView() {
  const today = toDateStr();
  const logs = appData.logs.filter(l => l.date === today);

  // Logs list
  todayLogsList.innerHTML = '';
  if (!logs.length) {
    todayLogsList.innerHTML = `<div class="empty-state">今天还没有记录，点击上方按钮开始记录吧！</div>`;
  } else {
    [...logs].sort((a,b)=>a.startTime.localeCompare(b.startTime)).forEach(log => {
      const icons = {learning:'📚',work:'💼',entertainment:'🎮',life:'🌱'};
      const colors = {learning:'--c-learn',work:'--c-work',entertainment:'--c-fun',life:'--c-life'};
      const card = document.createElement('div');
      card.className = 'log-item-card';
      card.innerHTML = `
        <div class="log-item-content">
          <div class="log-category-indicator" style="background:var(${colors[log.category]||'--c-learn'});"></div>
          <div class="log-item-text">
            <span class="log-item-desc">${icons[log.category]||'📚'} ${log.description}</span>
            <span class="log-item-time">${log.startTime} - ${log.endTime} (${fmtDur(log.durationMinutes)})</span>
          </div>
        </div>
        <button class="delete-log-btn" data-id="${log.id}">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>`;
      card.querySelector('.delete-log-btn').addEventListener('click', async e => {
        appData.logs = appData.logs.filter(l => l.id !== e.currentTarget.dataset.id);
        await saveData();
        updateTrackerView();
        if (activePanel === 'calendar') { renderCalendar(); updateDayDetails(); }
      });
      todayLogsList.appendChild(card);
    });
  }

  // Stats
  let total = 0;
  const cat = {learning:0,work:0,entertainment:0,life:0};
  logs.forEach(l => { total += l.durationMinutes; if (cat[l.category]!==undefined) cat[l.category]+=l.durationMinutes; });
  totalTrackedTime.textContent = fmtDurAbbr(total);
  const setBar = (bar, txt, min) => {
    const pct = total > 0 ? Math.round(min/total*100) : 0;
    bar.style.width = pct+'%';
    txt.textContent = `${min}m (${pct}%)`;
  };
  setBar(learningProgress, learningTimeText, cat.learning);
  setBar(workProgress, workTimeText, cat.work);
  setBar(entertainmentProgress, entertainmentTimeText, cat.entertainment);
  setBar(lifeProgress, lifeTimeText, cat.life);
}

// =========================================================
//  CALENDAR
// =========================================================
prevMonthBtn.addEventListener('click', () => { calendarMonth--; if(calendarMonth<0){calendarMonth=11;calendarYear--;} renderCalendar(); });
nextMonthBtn.addEventListener('click', () => { calendarMonth++; if(calendarMonth>11){calendarMonth=0;calendarYear++;} renderCalendar(); });

function renderCalendar() {
  calendarMonthYear.textContent = `${calendarYear}年${calendarMonth+1}月`;
  calendarDaysGrid.innerHTML = '';

  const firstDay = new Date(calendarYear, calendarMonth, 1);
  let startIdx = firstDay.getDay() - 1;
  if (startIdx < 0) startIdx = 6;
  const totalDays = new Date(calendarYear, calendarMonth+1, 0).getDate();
  const prevLast = new Date(calendarYear, calendarMonth, 0).getDate();
  const today = toDateStr();

  for (let i=startIdx;i>0;i--) { const c=document.createElement('div'); c.className='calendar-day-cell other-month'; c.textContent=prevLast-i+1; calendarDaysGrid.appendChild(c); }

  for (let d=1;d<=totalDays;d++) {
    const ds = `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    cell.textContent = d;
    if (ds===today) cell.classList.add('today');
    if (ds===currentSelectedDate) cell.classList.add('selected');

    const logs = appData.logs.filter(l=>l.date===ds);
    const scheds = appData.schedules[ds]||[];
    const dots = document.createElement('div');
    dots.className = 'day-indicators';
    const cats = [...new Set(logs.map(l=>l.category))];
    const cmap = {learning:'#10b981',work:'#3b82f6',entertainment:'#f59e0b',life:'#ec4899'};
    cats.forEach(c => { const dot=document.createElement('div'); dot.className='indicator-dot'; dot.style.backgroundColor=cmap[c]||'#6366f1'; dots.appendChild(dot); });
    if (scheds.length && !cats.length) { const dot=document.createElement('div'); dot.className='indicator-dot'; dot.style.backgroundColor='#6366f1'; dots.appendChild(dot); }
    cell.appendChild(dots);

    cell.addEventListener('click', () => {
      document.querySelectorAll('.calendar-day-cell').forEach(c=>c.classList.remove('selected'));
      cell.classList.add('selected');
      currentSelectedDate = ds;
      updateDayDetails();
    });
    calendarDaysGrid.appendChild(cell);
  }
}

function updateDayDetails() {
  if (!currentSelectedDate) { selectedDateTitle.textContent='选择日期进行规划'; return; }
  const [y,m,d] = currentSelectedDate.split('-');
  selectedDateTitle.textContent = `📅 ${y}年${parseInt(m)}月${parseInt(d)}日`;

  const scheds = (appData.schedules[currentSelectedDate]||[]).sort((a,b)=>a.startTime.localeCompare(b.startTime));
  scheduleList.innerHTML = '';
  if (!scheds.length) { scheduleList.innerHTML='<div class="empty-state">该日还没有规划任务</div>'; }
  else scheds.forEach(s => {
    const item = document.createElement('div');
    item.className = 'sched-item';
    item.innerHTML = `
      <div class="sched-left">
        <div class="sched-checkbox ${s.completed?'checked':''}" data-id="${s.id}">${s.completed?'✓':''}</div>
        <div class="sched-item-text"><span class="sched-title-span">${s.title}</span><span class="sched-time-span">${s.startTime} - ${s.endTime}</span></div>
      </div>
      <button class="delete-sched-btn" data-id="${s.id}"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>`;
    item.querySelector('.sched-checkbox').addEventListener('click', async e => {
      const sc = (appData.schedules[currentSelectedDate]||[]).find(x=>x.id===e.currentTarget.dataset.id);
      if(sc){sc.completed=!sc.completed;await saveData();updateDayDetails();}
    });
    item.querySelector('.delete-sched-btn').addEventListener('click', async e => {
      appData.schedules[currentSelectedDate]=(appData.schedules[currentSelectedDate]||[]).filter(x=>x.id!==e.currentTarget.dataset.id);
      await saveData();updateDayDetails();renderCalendar();
    });
    scheduleList.appendChild(item);
  });

  const logs = appData.logs.filter(l=>l.date===currentSelectedDate).sort((a,b)=>a.startTime.localeCompare(b.startTime));
  dayActivityTimeline.innerHTML = '';
  if (!logs.length) dayActivityTimeline.innerHTML='<div class="empty-state">该日无时间记录</div>';
  else {
    const cmap={learning:'#10b981',work:'#3b82f6',entertainment:'#f59e0b',life:'#ec4899'};
    const imap={learning:'📚',work:'💼',entertainment:'🎮',life:'🌱'};
    logs.forEach(l => {
      const item=document.createElement('div'); item.className='day-timeline-item';
      item.innerHTML=`<div class="timeline-tag" style="background:${cmap[l.category]||'#6366f1'};"></div><div class="timeline-details"><span class="timeline-desc">${imap[l.category]||''} ${l.description}</span><span class="timeline-time">${l.startTime} - ${l.endTime} (${fmtDur(l.durationMinutes)})</span></div>`;
      dayActivityTimeline.appendChild(item);
    });
  }

  let total=0; const cat={learning:0,work:0,entertainment:0,life:0};
  logs.forEach(l=>{total+=l.durationMinutes;if(cat[l.category]!==undefined)cat[l.category]+=l.durationMinutes;});
  dayCharts.innerHTML='';
  if (!total) { dayCharts.innerHTML='<div class="empty-state">无数据</div>'; return; }
  [{key:'learning',name:'📚 学习',color:'#10b981'},{key:'work',name:'💼 工作',color:'#3b82f6'},{key:'entertainment',name:'🎮 娱乐',color:'#f59e0b'},{key:'life',name:'🌱 生活',color:'#ec4899'}].forEach(c=>{
    const pct=Math.round(cat[c.key]/total*100);
    const row=document.createElement('div'); row.className='chart-bar-row';
    row.innerHTML=`<span class="chart-bar-label">${c.name}</span><div class="chart-bar-wrapper"><div class="chart-bar-fill" style="width:${pct}%;background:${c.color};"></div></div><span class="chart-bar-value">${cat[c.key]}m (${pct}%)</span>`;
    dayCharts.appendChild(row);
  });
}

addScheduleForm.addEventListener('submit', async e => {
  e.preventDefault();
  const start=schedStartTime.value, end=schedEndTime.value, title=schedTitle.value.trim();
  if (!start||!end||!title) return;
  if (start>=end) { schedErrorMsg.textContent='⚠️ 开始时间必须早于结束时间！'; schedErrorMsg.classList.remove('hidden'); return; }
  schedErrorMsg.classList.add('hidden');
  if (!appData.schedules[currentSelectedDate]) appData.schedules[currentSelectedDate]=[];
  appData.schedules[currentSelectedDate].push({id:Date.now().toString(),startTime:start,endTime:end,title,completed:false});
  await saveData();
  schedTitle.value='';
  updateDayDetails(); renderCalendar();
});
schedTitle.addEventListener('input', ()=>schedErrorMsg.classList.add('hidden'));

// =========================================================
//  IDEAS
// =========================================================
function renderIdeas() {
  ideasList.innerHTML = '';
  if (!appData.ideas.length) { ideasList.innerHTML='<div class="empty-state">还没有记录想法，灵感闪现时快来记录吧 ✨</div>'; return; }
  [...appData.ideas].reverse().forEach(idea => {
    const card = document.createElement('div');
    card.className = `idea-card${idea.starred?' starred':''}`;
    card.innerHTML = `
      <div class="idea-body">
        <div class="idea-text">${escapeHtml(idea.text)}</div>
        <div class="idea-time">${idea.timestamp}</div>
      </div>
      <div class="idea-actions">
        <button class="star-btn${idea.starred?' starred':''}" data-id="${idea.id}" title="收藏">
          ${idea.starred ? '★' : '☆'}
        </button>
        <button class="delete-log-btn" data-id="${idea.id}" title="删除">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        </button>
      </div>`;
    card.querySelector('.star-btn').addEventListener('click', async e => {
      const id = e.currentTarget.dataset.id;
      const item = appData.ideas.find(x=>x.id===id);
      if (item) { item.starred=!item.starred; await saveData(); renderIdeas(); }
    });
    card.querySelector('.delete-log-btn').addEventListener('click', async e => {
      appData.ideas = appData.ideas.filter(x=>x.id!==e.currentTarget.dataset.id);
      await saveData(); renderIdeas();
    });
    ideasList.appendChild(card);
  });
}

async function addIdea() {
  const text = ideaInput.value.trim();
  if (!text) return;
  appData.ideas.push({ id:Date.now().toString(), text, timestamp:toTimestampStr(new Date()), starred:false });
  await saveData();
  ideaInput.value = '';
  renderIdeas();
}
ideaSubmitBtn.addEventListener('click', addIdea);
ideaInput.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();addIdea();} });

// =========================================================
//  MEMOS
// =========================================================
function renderMemos() {
  memosList.innerHTML = '';
  const active = appData.memos.filter(m=>!m.done);
  const done = appData.memos.filter(m=>m.done);
  const all = [...active, ...done];
  memoCountText.textContent = `共 ${appData.memos.length} 项，${done.length} 已完成`;

  if (!all.length) { memosList.innerHTML='<div class="empty-state">备忘清单空空如也，快添加第一条吧 📋</div>'; return; }

  all.forEach(memo => {
    const item = document.createElement('div');
    item.className = `memo-item${memo.done?' done':''}`;
    item.innerHTML = `
      <div class="memo-check${memo.done?' done':''}" data-id="${memo.id}">${memo.done?'✓':''}</div>
      <span class="memo-text${memo.done?' done':''}">${escapeHtml(memo.text)}</span>
      <span class="memo-time">${memo.createdAt}</span>
      <button class="delete-log-btn" data-id="${memo.id}">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
      </button>`;
    item.querySelector('.memo-check').addEventListener('click', async e => {
      const m = appData.memos.find(x=>x.id===e.currentTarget.dataset.id);
      if (m) { m.done=!m.done; m.doneAt=m.done?toTimestampStr(new Date()):null; await saveData(); renderMemos(); }
    });
    item.querySelector('.delete-log-btn').addEventListener('click', async e => {
      appData.memos = appData.memos.filter(x=>x.id!==e.currentTarget.dataset.id);
      await saveData(); renderMemos();
    });
    memosList.appendChild(item);
  });
}

async function addMemo() {
  const text = memoInput.value.trim();
  if (!text) return;
  appData.memos.push({ id:Date.now().toString(), text, done:false, createdAt:toTimeStr(new Date()), doneAt:null });
  await saveData();
  memoInput.value = '';
  renderMemos();
}
memoSubmitBtn.addEventListener('click', addMemo);
memoInput.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();addMemo();} });
clearDoneMemosBtn.addEventListener('click', async () => {
  appData.memos = appData.memos.filter(m=>!m.done);
  await saveData(); renderMemos();
});

// =========================================================
//  REFLECTION
// =========================================================
function renderReflection() {
  updateReflectionDateLabel();
  renderReflectionSummary();

  const saved = appData.reflections[reflectionDate] || '';
  reflectionTextarea.value = saved;
  reflectionCharCount.textContent = `${saved.length} 字`;

  const today = toDateStr();
  reflNextDay.disabled = reflectionDate >= today;
  reflNextDay.style.opacity = reflectionDate >= today ? '0.3' : '1';
}

function updateReflectionDateLabel() {
  const today = toDateStr();
  if (reflectionDate === today) reflDateLabel.textContent = '今天';
  else {
    const [y,m,d] = reflectionDate.split('-');
    reflDateLabel.textContent = `${parseInt(m)}月${parseInt(d)}日`;
  }
}

function renderReflectionSummary() {
  const logs = appData.logs.filter(l=>l.date===reflectionDate);
  let total=0; const cat={learning:0,work:0,entertainment:0,life:0};
  logs.forEach(l=>{total+=l.durationMinutes;if(cat[l.category]!==undefined)cat[l.category]+=l.durationMinutes;});
  reflSummaryBars.innerHTML='';
  [{key:'learning',name:'📚 学习',color:'#10b981'},{key:'work',name:'💼 工作',color:'#3b82f6'},{key:'entertainment',name:'🎮 娱乐',color:'#f59e0b'},{key:'life',name:'🌱 生活',color:'#ec4899'}].forEach(c=>{
    const pct=total>0?Math.round(cat[c.key]/total*100):0;
    const row=document.createElement('div'); row.className='refl-bar-row';
    row.innerHTML=`<span class="refl-bar-label">${c.name}</span><div class="refl-bar-track"><div class="refl-bar-fill" style="width:${pct}%;background:${c.color};"></div></div><span class="refl-bar-value">${cat[c.key]}m</span>`;
    reflSummaryBars.appendChild(row);
  });
}

reflPrevDay.addEventListener('click', () => {
  const d = new Date(reflectionDate);
  d.setDate(d.getDate()-1);
  reflectionDate = toDateStr(d);
  renderReflection();
});
reflNextDay.addEventListener('click', () => {
  const d = new Date(reflectionDate);
  d.setDate(d.getDate()+1);
  const next = toDateStr(d);
  if (next <= toDateStr()) { reflectionDate = next; renderReflection(); }
});

reflectionTextarea.addEventListener('input', () => {
  reflectionCharCount.textContent = `${reflectionTextarea.value.length} 字`;
});

saveReflectionBtn.addEventListener('click', async () => {
  appData.reflections[reflectionDate] = reflectionTextarea.value;
  await saveData();
  saveReflectionBtn.textContent = '已保存 ✓';
  setTimeout(()=>saveReflectionBtn.textContent='保存', 1500);
});

// =========================================================
//  ANALYTICS
// =========================================================
rangeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    rangeButtons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    analyticsRange = btn.dataset.range;
    customRangeRow.classList.toggle('hidden', analyticsRange !== 'custom');
    if (analyticsRange !== 'custom') renderAnalytics();
  });
});

analyticsApplyBtn.addEventListener('click', () => {
  analyticsCustomStart = analyticsStartDate.value;
  analyticsCustomEnd = analyticsEndDate.value;
  if (analyticsCustomStart && analyticsCustomEnd) renderAnalytics();
});

function getAnalyticsDateRange() {
  const today = new Date();
  const todayStr = toDateStr();
  if (analyticsRange === 'week') {
    const day = today.getDay() || 7; // Mon=1..Sun=7
    const monday = new Date(today);
    monday.setDate(today.getDate() - day + 1);
    return { start: toDateStr(monday), end: todayStr };
  }
  if (analyticsRange === 'month') {
    return { start:`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`, end: todayStr };
  }
  return { start: analyticsCustomStart, end: analyticsCustomEnd };
}

function renderAnalytics() {
  const { start, end } = getAnalyticsDateRange();
  if (!start || !end) { analyticsOutput.innerHTML='<div class="empty-state">请选择有效的日期范围</div>'; return; }

  const filtered = appData.logs.filter(l => l.date >= start && l.date <= end);
  if (!filtered.length) { analyticsOutput.innerHTML='<div class="empty-state">该时间段内没有任何记录</div>'; return; }

  // Totals
  let total = 0;
  const cat = {learning:0, work:0, entertainment:0, life:0};
  filtered.forEach(l=>{ total+=l.durationMinutes; if(cat[l.category]!==undefined)cat[l.category]+=l.durationMinutes; });

  // Daily breakdown
  const dayMap = {};
  let cursor = new Date(start);
  const endD = new Date(end);
  while (cursor <= endD) {
    dayMap[toDateStr(cursor)] = 0;
    cursor.setDate(cursor.getDate()+1);
  }
  filtered.forEach(l=>{ if(dayMap[l.date]!==undefined) dayMap[l.date]+=l.durationMinutes; });
  const days = Object.entries(dayMap);
  const maxDay = Math.max(...days.map(([,v])=>v), 1);

  // Top activities
  const descMap = {};
  filtered.forEach(l=>{ if(!descMap[l.description]) descMap[l.description]=0; descMap[l.description]+=l.durationMinutes; });
  const topActs = Object.entries(descMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Render
  analyticsOutput.innerHTML = '';

  // Card 1: Category Summary
  const card1 = document.createElement('div');
  card1.className = 'analytics-card';
  card1.innerHTML = `
    <div class="analytics-headline">
      <span class="analytics-total-label">总追踪时间</span>
      <span class="analytics-total-value">${fmtDurAbbr(total)}</span>
    </div>`;
  [{key:'learning',name:'📚 学习',color:'#10b981'},{key:'work',name:'💼 工作',color:'#3b82f6'},{key:'entertainment',name:'🎮 娱乐',color:'#f59e0b'},{key:'life',name:'🌱 生活',color:'#ec4899'}].forEach(c=>{
    const pct=total>0?Math.round(cat[c.key]/total*100):0;
    const row=document.createElement('div'); row.className='analytics-cat-row';
    row.innerHTML=`<div class="analytics-cat-meta"><span>${c.name}</span><span>${fmtDurAbbr(cat[c.key])} (${pct}%)</span></div><div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%;background:${c.color};"></div></div>`;
    card1.appendChild(row);
  });
  analyticsOutput.appendChild(card1);

  // Card 2: Daily bar chart
  if (days.length > 1) {
    const card2 = document.createElement('div');
    card2.className = 'analytics-card';
    card2.innerHTML = `<div class="daily-breakdown-title">每日分布</div>`;
    const barsWrap = document.createElement('div');
    barsWrap.className = 'daily-breakdown';
    days.forEach(([ds, mins]) => {
      const heightPct = Math.round(mins/maxDay*100);
      const [,m,d] = ds.split('-');
      const col = document.createElement('div');
      col.className = 'daily-col';
      col.innerHTML = `<div class="daily-bar-wrap"><div class="daily-bar" style="height:${heightPct}%;"></div></div><div class="daily-label">${parseInt(m)}/${parseInt(d)}</div>`;
      barsWrap.appendChild(col);
    });
    card2.appendChild(barsWrap);
    analyticsOutput.appendChild(card2);
  }

  // Card 3: Top Activities
  if (topActs.length) {
    const card3 = document.createElement('div');
    card3.className = 'analytics-card';
    card3.innerHTML = `<div class="daily-breakdown-title">Top 活动（按时间）</div>`;
    const list = document.createElement('div');
    list.className = 'top-activities-list';
    topActs.forEach(([desc, mins], i) => {
      const item = document.createElement('div');
      item.className = 'top-act-item';
      item.innerHTML = `<div class="top-act-rank">${i+1}</div><div class="top-act-text">${escapeHtml(desc)}</div><div class="top-act-time">${fmtDurAbbr(mins)}</div>`;
      list.appendChild(item);
    });
    card3.appendChild(list);
    analyticsOutput.appendChild(card3);
  }
}

// =========================================================
//  UTILS
// =========================================================
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// =========================================================
//  WINDOW DRAG (JS-based, reliable for frameless windows)
// =========================================================
let isDraggingMain = false;
let dragOffX = 0, dragOffY = 0;
let pendingDragX = 0, pendingDragY = 0;
let dragRafId = null;

function flushDrag() {
  if (isDraggingMain) {
    window.api.moveMainWindow(pendingDragX, pendingDragY);
    dragRafId = requestAnimationFrame(flushDrag);
  }
}

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || isMaximized) return;
  const dragEl = e.target.closest('.drag-region');
  if (!dragEl) return;
  if (e.target.closest('.no-drag')) return;
  isDraggingMain = true;
  dragOffX = e.screenX - window.screenX;
  dragOffY = e.screenY - window.screenY;
  pendingDragX = e.screenX - dragOffX;
  pendingDragY = e.screenY - dragOffY;
  dragRafId = requestAnimationFrame(flushDrag);
  e.preventDefault();
}, true);

document.addEventListener('mousemove', (e) => {
  if (!isDraggingMain) return;
  pendingDragX = Math.round(e.screenX - dragOffX);
  pendingDragY = Math.round(e.screenY - dragOffY);
});

document.addEventListener('mouseup', () => {
  isDraggingMain = false;
  if (dragRafId) cancelAnimationFrame(dragRafId);
  dragRafId = null;
});

// =========================================================
//  BOOT
// =========================================================
document.addEventListener('DOMContentLoaded', loadData);
