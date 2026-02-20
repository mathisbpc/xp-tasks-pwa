/* =========================================================
   XP Tasks PWA - app.js
   Version: 6.2 (fix images + cache bust)
   ========================================================= */

/** ✅ Tâches */
const DEFAULT_TASKS = [
  { id: "sleep_good",    icon: "😴",   title: "Dormir > 7h30",        desc: "", xp: +40 },
  { id: "make_bed",      icon: "🛏️",  title: "Faire son lit",         desc: "", xp: +10 },
  { id: "fruit",         icon: "🍎",   title: "Fruit",                desc: "", xp: +10 },
  { id: "sport",         icon: "🏃‍♂️", title: "Sport",               desc: "", xp: +50 },
  { id: "work_perf",     icon: "💻",   title: "Perf au taff",         desc: "", xp: +30 },
  { id: "balanced_rest", icon: "🐟🥗", title: "Repos équilibré",      desc: "", xp: +30 },
  { id: "piano_10",      icon: "🎹",   title: "+10 min de piano",     desc: "", xp: +25 },
  { id: "combat",        icon: "🥊",   title: "Combat",               desc: "", xp: +60 },
  { id: "protein_snack", icon: "🥚",   title: "Collation prot’",      desc: "", xp: +10 },
  { id: "stretch",       icon: "🧘‍♂️", title: "Étirements",         desc: "", xp: +15 },
  { id: "skincare",      icon: "🧴",   title: "Skin care",            desc: "", xp: +10 },
  { id: "meditation",    icon: "🙏",   title: "Méditation",           desc: "", xp: +15 },
  { id: "reading",       icon: "📚",   title: "Lecture",              desc: "", xp: +20 },
  { id: "social_time",   icon: "🧑‍🤝‍🧑", title: "Social Time",     desc: "", xp: +10 },

  // malus
  { id: "sleep_bad",     icon: "🥱",   title: "Dormir < 6h",           desc: "", xp: -40 },
  { id: "junk_food",     icon: "🍔🍟", title: "Junk food",            desc: "", xp: -30 },
  { id: "alcohol_1",     icon: "🍷",   title: "Alcool (< 1 verre)",   desc: "", xp: -10 },
  { id: "alcohol_2",     icon: "🍷🍺", title: "Alcool (< 2 verres)",  desc: "", xp: -20 },
  { id: "alcohol_3",     icon: "🍾🥂", title: "Alcool (< 3 verres)",  desc: "", xp: -70 },
];

/** ✅ Niveaux + images */
const LEVELS = [
  { key: "lvl1", label: "Larve 🐛",                 minXp: 0,   image: "assets/lvl1_larve.png" },
  { key: "lvl2", label: "Larve disciplinée 🐜",     minXp: 20,  image: "assets/lvl2_larve_disciplinee.png" },
  { key: "lvl3", label: "Soldat ⚔️",                minXp: 40,  image: "assets/lvl3_soldat.png" },
  { key: "lvl4", label: "Slayer 🗡️",               minXp: 60,  image: "assets/lvl4_slayer.png" },
  { key: "lvl5", label: "Pirate des océans 🏴‍☠️",   minXp: 80,  image: "assets/lvl5_pirate.png" },
  { key: "lvl6", label: "Apothicaire 🧪",           minXp: 100, image: "assets/lvl6_apothicaaire.png" }, // <- double "a"
  { key: "lvl7", label: "Samuraï ⛩️🥷",             minXp: 120, image: "assets/lvl7_samurai.png" },
  { key: "lvl8", label: "Réussite ✅",              minXp: 140, image: "assets/lvl8_reussite.png" },
  { key: "lvl9", label: "Dieu RPG 👑",              minXp: 160, image: "assets/lvl9_dieu.png" },
];

/** Storage keys (bump version if you want reset storage) */
const LS_KEYS = {
  tasks: "xpTasks.tasks.v1",
  today: "xpTasks.today.v1",
  history: "xpTasks.history.v1",
};

let chart = null;

// ---------- Utils ----------
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatDateFR(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

function loadTasks() {
  const saved = localStorage.getItem(LS_KEYS.tasks);
  return saved ? safeParse(saved, DEFAULT_TASKS) : DEFAULT_TASKS;
}
function saveTasks(tasks) {
  localStorage.setItem(LS_KEYS.tasks, JSON.stringify(tasks));
}

function loadTodayState() {
  const saved = localStorage.getItem(LS_KEYS.today);
  const fallback = { date: todayISO(), checked: {} };
  const state = saved ? safeParse(saved, fallback) : fallback;

  // reset auto si jour change
  if (state.date !== todayISO()) return { date: todayISO(), checked: {} };
  return state;
}
function saveTodayState(state) {
  localStorage.setItem(LS_KEYS.today, JSON.stringify(state));
}

function loadHistory() {
  const saved = localStorage.getItem(LS_KEYS.history);
  return saved ? safeParse(saved, []) : [];
}
function saveHistory(history) {
  localStorage.setItem(LS_KEYS.history, JSON.stringify(history));
}

function calcXp(tasks, todayState) {
  let total = 0;
  for (const t of tasks) {
    if (todayState.checked[t.id]) total += t.xp;
  }
  return total;
}

function getLevelForXp(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
  }
  return current;
}

function hasAtLeastOneChecked(todayState) {
  return Object.values(todayState.checked || {}).some(Boolean);
}

// ---------- UI refs ----------
const $ = (sel) => document.querySelector(sel);
const tasksListEl = $("#tasksList");
const xpValueEl = $("#xpValue");
const levelLabelEl = $("#levelLabel");
const levelImgEl = $("#levelImg");
const closeDayBtn = $("#closeDayBtn");
const resetTodayBtn = $("#resetTodayBtn");
const clearHistoryBtn = $("#clearHistoryBtn");
const todayDatePill = $("#todayDatePill");
const historyListEl = $("#historyList");
const chartCanvas = $("#xpChart");

// ---------- Render ----------
function renderTasks(tasks, todayState) {
  tasksListEl.innerHTML = "";

  for (const t of tasks) {
    const wrapper = document.createElement("label");
    wrapper.className = "task";
    wrapper.setAttribute("for", `task_${t.id}`);

    const left = document.createElement("div");
    left.className = "task__left";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `task_${t.id}`;
    cb.checked = !!todayState.checked[t.id];

    cb.addEventListener("change", () => {
      todayState.checked[t.id] = cb.checked;
      saveTodayState(todayState);
      updateXpAndLevel(tasks, todayState, true);
    });

    const text = document.createElement("div");

    const title = document.createElement("div");
    title.className = "task__title";
    const icon = t.icon ? `${t.icon} ` : "";
    title.textContent = `${icon}${t.title}`;

    const meta = document.createElement("div");
    meta.className = "task__meta";
    meta.textContent = t.desc || "";

    text.appendChild(title);
    text.appendChild(meta);

    left.appendChild(cb);
    left.appendChild(text);

    const badge = document.createElement("div");
    badge.className = "badge " + (t.xp >= 0 ? "pos" : "neg");
    badge.textContent = (t.xp >= 0 ? `+${t.xp}` : `${t.xp}`) + " XP";

    wrapper.appendChild(left);
    wrapper.appendChild(badge);

    tasksListEl.appendChild(wrapper);
  }
}

function bumpXp() {
  xpValueEl.classList.remove("bump");
  void xpValueEl.offsetWidth;
  xpValueEl.classList.add("bump");
}

function updateXpAndLevel(tasks, todayState, animate = false) {
  const xp = calcXp(tasks, todayState);
  const level = getLevelForXp(xp);

  xpValueEl.textContent = String(xp);
  levelLabelEl.textContent = level.label;

  levelImgEl.onerror = () => { levelImgEl.src = "assets/lvl1_larve.png"; };
  levelImgEl.src = level.image;

  if (animate) bumpXp();
}

function upsertHistory(history, entry) {
  const idx = history.findIndex(h => h.date === entry.date);
  if (idx >= 0) history[idx] = entry;
  else history.push(entry);

  history.sort((a, b) => a.date.localeCompare(b.date));
  return history;
}

function renderHistoryList(history) {
  historyListEl.innerHTML = "";
  const last = [...history].slice(-7).reverse();

  for (const h of last) {
    const div = document.createElement("div");
    div.className = "historyItem";
    div.innerHTML = `
      <div>${formatDateFR(h.date)} • <strong>${h.xp} XP</strong></div>
      <div>${h.levelLabel}</div>
    `;
    historyListEl.appendChild(div);
  }

  if (history.length === 0) {
    const div = document.createElement("div");
    div.className = "historyItem";
    div.textContent = "Aucun historique pour l’instant. Clôture une journée 🙂";
    historyListEl.appendChild(div);
  }
}

function renderChart(history) {
  const labels = history.map(h => formatDateFR(h.date));
  const data = history.map(h => h.xp);

  if (chart) chart.destroy();

  chart = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "XP", data }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.65)" },
          grid: { color: "rgba(255,255,255,0.08)" }
        },
        y: {
          ticks: { color: "rgba(255,255,255,0.65)" },
          grid: { color: "rgba(255,255,255,0.08)" }
        }
      }
    }
  });
}

// ---------- Actions ----------
function resetToday(tasks, todayState) {
  todayState.checked = {};
  saveTodayState(todayState);
  renderTasks(tasks, todayState);
  updateXpAndLevel(tasks, todayState, true);
}

function closeDay(tasks, todayState) {
  // ✅ n’enregistre que si au moins une tâche cochée
  if (!hasAtLeastOneChecked(todayState)) {
    closeDayBtn.textContent = "Rien à enregistrer ❌";
    setTimeout(() => (closeDayBtn.textContent = "Clôturer la journée"), 900);
    return;
  }

  const date = todayState.date;
  const xp = calcXp(tasks, todayState);
  const level = getLevelForXp(xp);

  const entry = {
    date,
    xp,
    levelKey: level.key,
    levelLabel: level.label,
  };

  let history = loadHistory();
  history = upsertHistory(history, entry);
  saveHistory(history);

  renderHistoryList(history);
  renderChart(history);

  resetToday(tasks, todayState);

  closeDayBtn.textContent = "Journée enregistrée ✅";
  setTimeout(() => (closeDayBtn.textContent = "Clôturer la journée"), 900);
}

// ---------- PWA SW ----------
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (e) {
    console.log("SW registration failed:", e);
  }
}

// ---------- Init ----------
function init() {
  const tasks = loadTasks();
  saveTasks(tasks);

  const todayState = loadTodayState();
  saveTodayState(todayState);

  todayDatePill.textContent = `Aujourd’hui: ${formatDateFR(todayState.date)}`;

  renderTasks(tasks, todayState);
  updateXpAndLevel(tasks, todayState, false);

  const history = loadHistory();
  renderHistoryList(history);
  renderChart(history);

  closeDayBtn.addEventListener("click", () => closeDay(tasks, todayState));
  resetTodayBtn.addEventListener("click", () => resetToday(tasks, todayState));

  clearHistoryBtn.addEventListener("click", () => {
    saveHistory([]);
    renderHistoryList([]);
    renderChart([]);
  });

  registerSW();
}

document.addEventListener("DOMContentLoaded", init);