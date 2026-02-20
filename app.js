/* =========================================================
   XP Tasks PWA - app.js (FULL)
   - Tâches journalières (XP + / -)
   - XP total du jour calculé automatiquement
   - Niveau + image selon seuils XP
   - Clôturer la journée => sauvegarde historique + reset
   - Historique local + bar chart Chart.js
   ========================================================= */

/* =========================
   1) CONFIG : TÂCHES
   =========================
   ✅ Modifie ici tes tâches facilement :
   - id unique
   - icon emoji
   - title texte
   - xp positif ou négatif
*/
const DEFAULT_TASKS = [
  { id: "sleep_good",    icon: "😴",   title: "Dormir > 7h30",           desc: "", xp: +40 },
  { id: "make_bed",      icon: "🛏️",  title: "Faire son lit",            desc: "", xp: +10 },
  { id: "fruit",         icon: "🍎",   title: "Fruit",                   desc: "", xp: +10 },
  { id: "sport",         icon: "🏃‍♂️", title: "Sport",                   desc: "", xp: +50 },
  { id: "work_perf",     icon: "💻",   title: "Perf au taff",            desc: "", xp: +30 },
  { id: "balanced_rest", icon: "🐟🥗", title: "Repos équilibré",          desc: "", xp: +30 },
  { id: "piano_10",      icon: "🎹",   title: "+10 min de piano",        desc: "", xp: +25 },
  { id: "combat",        icon: "🥊",   title: "Combat",                  desc: "", xp: +60 },
  { id: "protein_snack", icon: "🥚",   title: "Collation prot’",         desc: "", xp: +10 },
  { id: "stretch",       icon: "🧘‍♂️", title: "Étirements",              desc: "", xp: +15 },
  { id: "skincare",      icon: "🧴",   title: "Skin care",               desc: "", xp: +10 },
  { id: "meditation",    icon: "🙏",   title: "Méditation",              desc: "", xp: +15 },
  { id: "reading",       icon: "📚",   title: "Lecture",                 desc: "", xp: +20 },
  { id: "social_time",   icon: "🧑‍🤝‍🧑", title: "Social Time",          desc: "", xp: +10 },

  // négatifs
  { id: "sleep_bad",     icon: "🥱",   title: "Dormir < 6h",              desc: "", xp: -40 },
  { id: "junk_food",     icon: "🍔🍟", title: "Junk food",                desc: "", xp: -30 },
  { id: "alcohol_1",     icon: "🍷",   title: "Alcool (< 1 verre)",       desc: "", xp: -10 },
  { id: "alcohol_2",     icon: "🍷🍺", title: "Alcool (< 2 verres)",      desc: "", xp: -20 },
  { id: "alcohol_3",     icon: "🍾🥂", title: "Alcool (< 3 verres)",      desc: "", xp: -70 },
];

/* =========================
   2) CONFIG : NIVEAUX (TES IMAGES)
   =========================
   ✅ Tes fichiers /assets (d'après ta capture) :
   - lvl1_larve.png
   - lvl2_larve_disciplinee.png
   - lvl3_soldat.png
   - lvl4_slayer.png
   - lvl5_pirate.png
   - lvl6_apothicaaire.png  (orthographe = ton nom de fichier)
   - lvl7_samurai.png
   - lvl8_reussite.png
   - lvl9_dieu.png
*/
const LEVELS = [
  { key: "lvl1", label: "Larve 🐛",                minXp: 0,   image: "assets/lvl1_larve.png" },
  { key: "lvl2", label: "Larve disciplinée 🐜",    minXp: 20,  image: "assets/lvl2_larve_disciplinee.png" },
  { key: "lvl3", label: "Soldat 🪖",               minXp: 40,  image: "assets/lvl3_soldat.png" },
  { key: "lvl4", label: "Slayer ⚔️",               minXp: 60,  image: "assets/lvl4_slayer.png" },
  { key: "lvl5", label: "Pirate des océans 🏴‍☠️",  minXp: 80,  image: "assets/lvl5_pirate.png" },
  { key: "lvl6", label: "Apothicaire 🧪",          minXp: 100, image: "assets/lvl6_apothicaaire.png" },
  { key: "lvl7", label: "Samuraï ⛩️🥷",           minXp: 120, image: "assets/lvl7_samurai.png" },
  { key: "lvl8", label: "Réussite 🌟",             minXp: 140, image: "assets/lvl8_reussite.png" },
  { key: "lvl9", label: "Dieu 👑",                 minXp: 160, image: "assets/lvl9_dieu.png" },
];

/* =========================
   3) LOCAL STORAGE KEYS
   ========================= */
const LS_KEYS = {
  tasks: "xpTasks.tasks.v1",
  today: "xpTasks.today.v1",
  history: "xpTasks.history.v1",
};

let chart = null;

/* =========================
   4) UTILITAIRES
   ========================= */
const $ = (sel) => document.querySelector(sel);

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

/* =========================
   5) CHARGER / SAUVER
   ========================= */
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

  // si date différente => reset auto
  if (state.date !== todayISO()) {
    return { date: todayISO(), checked: {} };
  }
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

/* =========================
   6) CALCUL XP + NIVEAU
   ========================= */
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

/* =========================
   7) UI REFS (doivent exister dans index.html)
   ========================= */
const tasksListEl   = $("#tasksList");
const xpValueEl     = $("#xpValue");
const levelLabelEl  = $("#levelLabel");
const levelImgEl    = $("#levelImg");
const closeDayBtn   = $("#closeDayBtn");
const resetTodayBtn = $("#resetTodayBtn");
const clearHistoryBtn = $("#clearHistoryBtn");
const todayDatePill = $("#todayDatePill");
const historyListEl = $("#historyList");
const chartCanvas   = $("#xpChart");

/* =========================
   8) RENDER TÂCHES
   ========================= */
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

/* =========================
   9) XP bump animation
   ========================= */
function bumpXp() {
  xpValueEl.classList.remove("bump");
  void xpValueEl.offsetWidth; // force reflow
  xpValueEl.classList.add("bump");
}

/* =========================
   10) UPDATE XP + NIVEAU + IMAGE
   ========================= */
function updateXpAndLevel(tasks, todayState, animate = false) {
  const xp = calcXp(tasks, todayState);
  const level = getLevelForXp(xp);

  xpValueEl.textContent = String(xp);
  levelLabelEl.textContent = level.label;

  // fallback si image manquante
  levelImgEl.onerror = () => { levelImgEl.src = "assets/placeholder.png"; };
  levelImgEl.src = level.image;

  if (animate) bumpXp();
}

/* =========================
   11) HISTORIQUE
   ========================= */
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

/* =========================
   12) CHART.JS
   ========================= */
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

/* =========================
   13) ACTIONS : RESET / CLOTURE
   ========================= */
function resetToday(tasks, todayState) {
  todayState.checked = {};
  saveTodayState(todayState);
  renderTasks(tasks, todayState);
  updateXpAndLevel(tasks, todayState, true);
}

function closeDay(tasks, todayState) {
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

  // reset pour lendemain
  resetToday(tasks, todayState);

  closeDayBtn.textContent = "Journée enregistrée ✅";
  setTimeout(() => (closeDayBtn.textContent = "Clôturer la journée"), 900);
}

/* =========================
   14) PWA : SERVICE WORKER
   ========================= */
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (e) {
    console.log("SW registration failed:", e);
  }
}

/* =========================
   15) INIT
   ========================= */
function init() {
  // Tâches (persistantes)
  const tasks = loadTasks();
  saveTasks(tasks);

  // Etat du jour
  const todayState = loadTodayState();
  saveTodayState(todayState);

  // UI date
  todayDatePill.textContent = `Aujourd’hui: ${formatDateFR(todayState.date)}`;

  // Render initial
  renderTasks(tasks, todayState);
  updateXpAndLevel(tasks, todayState, false);

  // Historique + chart
  const history = loadHistory();
  renderHistoryList(history);
  renderChart(history);

  // Events
  closeDayBtn.addEventListener("click", () => closeDay(tasks, todayState));
  resetTodayBtn.addEventListener("click", () => resetToday(tasks, todayState));

  clearHistoryBtn.addEventListener("click", () => {
    saveHistory([]);
    renderHistoryList([]);
    renderChart([]);
  });

  // PWA
  registerSW();
}

document.addEventListener("DOMContentLoaded", init);
.top { position: sticky; top: 0; z-index: 5; background: rgba(11,15,26,0.9); backdrop-filter: blur(10px); padding: 14px 14px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.top__row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pill { padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); font-size: 13px; }
.tabs { display: flex; gap: 8px; }
.tab { border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); padding: 8px 10px; border-radius: 10px; font-size: 13px; }
.tab.active { background: rgba(99,102,241,0.35); border-color: rgba(99,102,241,0.6); }

.dashboard { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px; }
.card--avatar { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; }
.card__label { font-size: 12px; color: rgba(255,255,255,0.7); }
.card__value { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.95); margin-top: 2px; }
.card__hint { margin-top: 6px; font-size: 11px; color: rgba(255,255,255,0.55); }

.avatar { width: 54px; height: 54px; border-radius: 14px; object-fit: cover; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.2); }

.bar { height: 10px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; margin-top: 8px; }
.bar__fill { height: 100%; width: 0%; border-radius: 999px; background: rgba(34,197,94,0.9); transition: width 250ms ease; }
#xpBar { background: rgba(99,102,241,0.95); }

.main { padding: 14px; }
.sectionTitle { margin: 12px 0 10px; font-weight: 700; color: rgba(255,255,255,0.9); }
.hidden { display: none; }

.chartWrap { height: 260px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 10px; }

.actions { display: flex; gap: 10px; margin-top: 12px; }
.btn { flex: 1; padding: 12px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.95); font-weight: 700; }
.btn.primary { background: rgba(99,102,241,0.5); border-color: rgba(99,102,241,0.8); }
.btn.danger { background: rgba(239,68,68,0.25); border-color: rgba(239,68,68,0.55); }
