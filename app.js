/* =========================================================
   XP Tasks PWA - app.js (V7.1)
   - Pages (Aujourd’hui / Stats / Réglages)
   - Menu ☰ + tabs
   - Santé <= 100 (départ 100, malus)
   - Auto-enregistrement à l’heure réglable (défaut 4h)
   - Niveaux recalibrés (175=8, 200=9, 245=10)
   ========================================================= */

const APP_VERSION = "7.1.0";

/** =========================
 *  1) TASKS
 *  - xp: points
 *  - health: malus santé (négatif). (Optionnel)
 * ========================= */
const DEFAULT_TASKS = [
  { id: "sleep_good",    icon: "😴", title: "Dormir > 7h30",       xp: +40, health: 0 },
  { id: "make_bed",      icon: "🛏️", title: "Faire son lit",        xp: +10, health: 0 },
  { id: "fruit",         icon: "🍎", title: "Fruit",               xp: +10, health: 0 },
  { id: "sport",         icon: "🏃‍♂️", title: "Sport",              xp: +50, health: 0 },
  { id: "work_perf",     icon: "💻", title: "Perf au taff",        xp: +30, health: 0 },
  { id: "balanced_rest", icon: "🐟🥗", title: "Repos équilibré",    xp: +30, health: 0 },
  { id: "piano_10",      icon: "🎹", title: "+10 min de piano",    xp: +25, health: 0 },
  { id: "combat",        icon: "🥊", title: "Combat",              xp: +60, health: 0 },
  { id: "protein_snack", icon: "🥚", title: "Collation prot’",     xp: +10, health: 0 },
  { id: "stretch",       icon: "🧘‍♂️", title: "Étirements",        xp: +15, health: 0 },
  { id: "skincare",      icon: "🧴", title: "Skin care",           xp: +10, health: 0 },
  { id: "meditation",    icon: "🙏", title: "Méditation",          xp: +15, health: 0 },
  { id: "reading",       icon: "📚", title: "Lecture",             xp: +20, health: 0 },
  { id: "social_time",   icon: "🧑‍🤝‍🧑", title: "Social Time",    xp: +10, health: 0 },

  // malus (XP - et santé -)
  { id: "sleep_bad",     icon: "🥱", title: "Dormir < 6h",          xp: -40, health: -25 },
  { id: "junk_food",     icon: "🍔🍟", title: "Junk food",          xp: -30, health: -15 },
  { id: "alcohol_1",     icon: "🍷", title: "Alcool (< 1 verre)",   xp: -10, health: -5  },
  { id: "alcohol_2",     icon: "🍷🍺", title: "Alcool (< 2 verres)",xp: -20, health: -10 },
  { id: "alcohol_3",     icon: "🍾🥂", title: "Alcool (< 3 verres)",xp: -70, health: -25 },
];

/** =========================
 *  2) LEVELS (images dans /assets)
 *  Objectif:
 *  - 175 XP => niveau 8
 *  - 200 XP => niveau 9
 *  - 245 XP => niveau 10
 * ========================= */
const LEVELS = [
  { key: "lvl1",  label: "Larve 🐛",                         minXp: 0,   img: "assets/lvl1_larve.png" },
  { key: "lvl2",  label: "Larve disciplinée 🐜",             minXp: 40,  img: "assets/lvl2_larve_disciplinee.png" },
  { key: "lvl3",  label: "Soldat ⚔️",                        minXp: 80,  img: "assets/lvl3_soldat.png" },
  { key: "lvl4",  label: "Slayer 🗡️ (correct)",              minXp: 110, img: "assets/lvl4_slayer.png" },
  { key: "lvl5",  label: "Pirate des océans 🏴‍☠️ (bien)",     minXp: 140, img: "assets/lvl5_pirate.png" },
  { key: "lvl6",  label: "Apothicaire 🧪 (très bien)",        minXp: 155, img: "assets/lvl6_apothicaaire.png" },
  { key: "lvl7",  label: "Samuraï ⛩️🥷 (parfait)",            minXp: 165, img: "assets/lvl7_samurai.png" },
  { key: "lvl8",  label: "Réussite ✅ (100%)",                minXp: 175, img: "assets/lvl8_reussite.png" },
  { key: "lvl9",  label: "Dieu 👑 (110%)",                    minXp: 200, img: "assets/lvl9_dieu.png" },
  { key: "lvl10", label: "Dieu suprême 🔥 (150%)",            minXp: 245, img: "assets/lvl9_dieu.png" }, // même image
];

/** =========================
 *  3) STORAGE KEYS
 * ========================= */
const LS_KEYS = {
  tasks: "xpTasks.tasks.v7",
  settings: "xpTasks.settings.v7",
  dayStates: "xpTasks.dayStates.v7",   // { [dateISO]: { checked: {id:true}, saved:boolean } }
  history: "xpTasks.history.v7",       // array [{date, xp, health, levelKey, levelLabel}]
};

/** =========================
 *  4) HELPERS
 * ========================= */
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function safeParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

function loadTasks() {
  const raw = localStorage.getItem(LS_KEYS.tasks);
  const tasks = raw ? safeParse(raw, DEFAULT_TASKS) : DEFAULT_TASKS;
  localStorage.setItem(LS_KEYS.tasks, JSON.stringify(tasks));
  return tasks;
}

function loadSettings() {
  const fallback = { dayChangeHour: 4, chartRange: 7 };
  const raw = localStorage.getItem(LS_KEYS.settings);
  const s = raw ? safeParse(raw, fallback) : fallback;
  localStorage.setItem(LS_KEYS.settings, JSON.stringify(s));
  return s;
}

function saveSettings(s) {
  localStorage.setItem(LS_KEYS.settings, JSON.stringify(s));
}

function loadDayStates() {
  const raw = localStorage.getItem(LS_KEYS.dayStates);
  const map = raw ? safeParse(raw, {}) : {};
  localStorage.setItem(LS_KEYS.dayStates, JSON.stringify(map));
  return map;
}

function saveDayStates(map) {
  localStorage.setItem(LS_KEYS.dayStates, JSON.stringify(map));
}

function loadHistory() {
  const raw = localStorage.getItem(LS_KEYS.history);
  const arr = raw ? safeParse(raw, []) : [];
  localStorage.setItem(LS_KEYS.history, JSON.stringify(arr));
  return arr;
}

function saveHistory(arr) {
  localStorage.setItem(LS_KEYS.history, JSON.stringify(arr));
}

function isoForNowWithDayChangeHour(dayChangeHour) {
  // Si heure actuelle < dayChangeHour => on considère qu’on est encore “sur la veille”
  const now = new Date();
  const d = new Date(now);
  if (now.getHours() < dayChangeHour) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateFR(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function addDaysISO(iso, delta) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function calcXp(tasks, checked) {
  let total = 0;
  for (const t of tasks) if (checked[t.id]) total += (t.xp || 0);
  return total;
}

function calcHealth(tasks, checked) {
  let h = 100;
  for (const t of tasks) if (checked[t.id]) h += (t.health || 0); // health est négatif pour malus
  return clamp(h, 0, 100); // strictement <=100
}

function getLevelForXp(xp) {
  let cur = LEVELS[0];
  for (const lvl of LEVELS) if (xp >= lvl.minXp) cur = lvl;
  return cur;
}

function anyTaskChecked(checked) {
  return Object.values(checked).some(Boolean);
}

/** =========================
 *  5) UI REFS
 * ========================= */
const burgerBtn = $("#burgerBtn");
const drawer = $("#drawer");
const drawerBackdrop = $("#drawerBackdrop");

const tabToday = $("#tabToday");
const tabStats = $("#tabStats");
const tabSettings = $("#tabSettings");

const pageToday = $("#pageToday");
const pageStats = $("#pageStats");
const pageSettings = $("#pageSettings");

const xpValueEl = $("#xpValue");
const healthValueEl = $("#healthValue");
const levelImgEl = $("#levelImg");
const levelLabelEl = $("#levelLabel");
const todayPill = $("#todayPill");
const editDatePill = $("#editDatePill");

const tasksListEl = $("#tasksList");
const resetTodayBtn = $("#resetTodayBtn");
const saveDayBtn = $("#saveDayBtn");
const prevDayBtn = $("#prevDayBtn");
const nextDayBtn = $("#nextDayBtn");

const dayChangeHourInput = $("#dayChangeHour");
const hardRefreshBtn = $("#hardRefreshBtn");
const versionInfo = $("#versionInfo");

const chartCanvas = $("#chartCanvas");
const historyListEl = $("#historyList");
const clearHistoryBtn = $("#clearHistoryBtn");
const rangeLabel = $("#rangeLabel");

let chart = null;

/** =========================
 *  6) NAV (fix menu + pages)
 * ========================= */
function openDrawer() {
  drawer.classList.remove("hidden");
  drawerBackdrop.classList.remove("hidden");
  drawer.setAttribute("aria-hidden", "false");
}
function closeDrawer() {
  drawer.classList.add("hidden");
  drawerBackdrop.classList.add("hidden");
  drawer.setAttribute("aria-hidden", "true");
}

function setActiveTab(go) {
  for (const btn of [tabToday, tabStats, tabSettings]) {
    btn.classList.toggle("active", btn.dataset.go === go);
  }
}

function showPage(go) {
  pageToday.classList.toggle("hidden", go !== "today");
  pageStats.classList.toggle("hidden", go !== "stats");
  pageSettings.classList.toggle("hidden", go !== "settings");
  setActiveTab(go);
  closeDrawer();
}

function wireNav() {
  // Burger
  burgerBtn?.addEventListener("click", () => {
    if (drawer.classList.contains("hidden")) openDrawer();
    else closeDrawer();
  });
  drawerBackdrop?.addEventListener("click", closeDrawer);

  // Drawer buttons
  drawer?.querySelectorAll("[data-go]")?.forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.dataset.go));
  });

  // Tabs
  [tabToday, tabStats, tabSettings].forEach(btn => {
    btn?.addEventListener("click", () => showPage(btn.dataset.go));
  });
}

/** =========================
 *  7) RENDER
 * ========================= */
function renderTasks(tasks, dayState, onChange) {
  tasksListEl.innerHTML = "";

  for (const t of tasks) {
    const row = document.createElement("label");
    row.className = "taskRow";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!dayState.checked[t.id];

    const left = document.createElement("div");
    left.className = "taskLeft";
    const title = document.createElement("div");
    title.className = "taskTitle";
    title.textContent = `${t.icon ? t.icon + " " : ""}${t.title}`;

    const right = document.createElement("div");
    right.className = "taskBadge " + ((t.xp || 0) >= 0 ? "pos" : "neg");
    right.textContent = ((t.xp || 0) >= 0 ? `+${t.xp}` : `${t.xp}`) + " XP";

    left.appendChild(cb);
    left.appendChild(title);
    row.appendChild(left);
    row.appendChild(right);

    cb.addEventListener("change", () => {
      dayState.checked[t.id] = cb.checked;
      onChange();
    });

    tasksListEl.appendChild(row);
  }
}

function updateHeader(tasks, dayState, dateISO) {
  const xp = calcXp(tasks, dayState.checked);
  const health = calcHealth(tasks, dayState.checked);
  const lvl = getLevelForXp(xp);

  xpValueEl.textContent = String(xp);
  healthValueEl.textContent = String(health);
  levelLabelEl.textContent = lvl.label;

  levelImgEl.onerror = () => { levelImgEl.src = "assets/lvl1_larve.png"; };
  levelImgEl.src = lvl.img;

  todayPill.textContent = `Jour: ${formatDateFR(dateISO)} (reset à ${getSettings().dayChangeHour}h)`;
  editDatePill.textContent = formatDateFR(dateISO);
}

function upsertHistoryEntry(history, entry) {
  const idx = history.findIndex(h => h.date === entry.date);
  if (idx >= 0) history[idx] = entry;
  else history.push(entry);
  history.sort((a, b) => a.date.localeCompare(b.date));
  return history;
}

function renderHistory(history) {
  historyListEl.innerHTML = "";
  if (history.length === 0) {
    const d = document.createElement("div");
    d.className = "muted";
    d.textContent = "Aucun historique pour l’instant.";
    historyListEl.appendChild(d);
    return;
  }

  const last = [...history].slice(-30).reverse();
  for (const h of last) {
    const div = document.createElement("div");
    div.className = "historyItem";
    div.innerHTML = `
      <div><strong>${formatDateFR(h.date)}</strong> • ${h.xp} XP • Santé ${h.health}/100</div>
      <div class="muted">${h.levelLabel}</div>
    `;
    historyListEl.appendChild(div);
  }
}

function renderChart(history, rangeDays) {
  const slice = [...history].slice(-rangeDays);
  const labels = slice.map(h => formatDateFR(h.date));
  const xp = slice.map(h => h.xp);
  const health = slice.map(h => h.health);

  if (chart) chart.destroy();

  chart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "XP", data: xp, yAxisID: "yXp" },
        { label: "Santé", data: health, yAxisID: "yHealth" },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        yXp: { position: "left" },
        yHealth: { position: "right", min: 0, max: 100 },
      }
    }
  });
}

/** =========================
 *  8) DAY SAVE / AUTO SAVE
 * ========================= */
let _settings = null;
function getSettings() {
  if (!_settings) _settings = loadSettings();
  return _settings;
}

function saveDayIfPossible(tasks, dateISO, dayStatesMap) {
  const dayState = dayStatesMap[dateISO] || { checked: {}, saved: false };
  if (!anyTaskChecked(dayState.checked)) return false;

  const xp = calcXp(tasks, dayState.checked);
  const health = calcHealth(tasks, dayState.checked);
  const lvl = getLevelForXp(xp);

  let history = loadHistory();
  history = upsertHistoryEntry(history, {
    date: dateISO,
    xp,
    health,
    levelKey: lvl.key,
    levelLabel: lvl.label,
  });
  saveHistory(history);

  dayState.saved = true;
  dayStatesMap[dateISO] = dayState;
  saveDayStates(dayStatesMap);

  return true;
}

function autoSaveTick(tasks, dayStatesMap) {
  const s = getSettings();
  const now = new Date();
  const minute = now.getMinutes();

  // On check souvent, mais on ne “trigger” qu’au moment où on passe l’heure cible (minute 0-2)
  if (now.getHours() === s.dayChangeHour && minute <= 2) {
    // date actuelle AVANT bascule => c’est la veille “logique”
    const dateISO = isoForNowWithDayChangeHour(s.dayChangeHour);
    // Sauvegarde uniquement si au moins 1 tâche cochée
    saveDayIfPossible(tasks, dateISO, dayStatesMap);
  }
}

/** =========================
 *  9) CACHE HARD REFRESH (SW)
 * ========================= */
async function hardRefresh() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } finally {
    location.reload(true);
  }
}

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (e) {
    console.log("SW registration failed:", e);
  }
}

/** =========================
 *  10) INIT
 * ========================= */
function init() {
  wireNav();
  showPage("today");

  const tasks = loadTasks();
  const settings = getSettings();

  versionInfo.textContent = `Version: ${APP_VERSION}`;
  dayChangeHourInput.value = String(settings.dayChangeHour);

  let dayStatesMap = loadDayStates();

  // date éditée (permet “ajouter à posteriori” en naviguant avec ◀ ▶)
  let currentDateISO = isoForNowWithDayChangeHour(settings.dayChangeHour);

  function getOrCreateDayState(dateISO) {
    if (!dayStatesMap[dateISO]) dayStatesMap[dateISO] = { checked: {}, saved: false };
    return dayStatesMap[dateISO];
  }

  function persistDayStates() {
    saveDayStates(dayStatesMap);
  }

  function rerenderToday() {
    const st = getOrCreateDayState(currentDateISO);
    renderTasks(tasks, st, () => {
      persistDayStates();
      updateHeader(tasks, st, currentDateISO);
    });
    updateHeader(tasks, st, currentDateISO);
  }

  // Buttons day change
  prevDayBtn.addEventListener("click", () => {
    currentDateISO = addDaysISO(currentDateISO, -1);
    rerenderToday();
  });
  nextDayBtn.addEventListener("click", () => {
    currentDateISO = addDaysISO(currentDateISO, +1);
    rerenderToday();
  });

  resetTodayBtn.addEventListener("click", () => {
    const st = getOrCreateDayState(currentDateISO);
    st.checked = {};
    st.saved = false;
    dayStatesMap[currentDateISO] = st;
    persistDayStates();
    rerenderToday();
  });

  saveDayBtn.addEventListener("click", () => {
    const ok = saveDayIfPossible(tasks, currentDateISO, dayStatesMap);
    // refresh stats
    const hist = loadHistory();
    renderHistory(hist);
    renderChart(hist, getSettings().chartRange);
    if (!ok) alert("Rien à enregistrer : coche au moins 1 tâche 🙂");
  });

  // Settings events
  dayChangeHourInput.addEventListener("change", () => {
    const v = clamp(parseInt(dayChangeHourInput.value || "4", 10), 0, 23);
    settings.dayChangeHour = v;
    _settings = settings;
    saveSettings(settings);
    rerenderToday();
  });

  hardRefreshBtn.addEventListener("click", hardRefresh);

  // Stats range buttons
  document.querySelectorAll("[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
      const r = parseInt(btn.dataset.range, 10);
      settings.chartRange = r;
      _settings = settings;
      saveSettings(settings);
      const hist = loadHistory();
      renderChart(hist, r);
      rangeLabel.textContent = `${r} jours`;
    });
  });

  clearHistoryBtn.addEventListener("click", () => {
    if (!confirm("Effacer tout l’historique ?")) return;
    saveHistory([]);
    renderHistory([]);
    renderChart([], getSettings().chartRange);
  });

  // First render
  rerenderToday();

  // Stats initial
  const history = loadHistory();
  renderHistory(history);
  renderChart(history, settings.chartRange);
  rangeLabel.textContent = `${settings.chartRange} jours`;

  // Auto save timer (sans backend, donc seulement quand la page est ouverte)
  setInterval(() => autoSaveTick(tasks, dayStatesMap), 30 * 1000);

  registerSW();
}

document.addEventListener("DOMContentLoaded", init);