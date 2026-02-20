/* =========================================================
   XP Tasks PWA — app.js (V7+)
   - 3 pages (Aujourd’hui / Stats / Réglages)
   - XP + Santé (0..100)
   - Niveaux basés sur PROGRESSION des BONUS (pas sur XP brut)
   - Enregistrement:
       • manuel (bouton Enregistrer)
       • auto à l’heure de reset (ex: 4h) SI au moins 1 tâche cochée
   - Historique + graphique XP & Santé (double axe)
   ========================================================= */

"use strict";

/* =========================
   1) VERSION (cache bust)
   ========================= */
const APP_VERSION = "7.1.1"; // change ça si tu veux forcer une nouvelle version visible
const SW_CACHE_VERSION = "v7.1.1"; // affichage (le vrai cache est géré par sw.js)

/* =========================
   2) TASKS (XP + SANTÉ)
   - xp : points
   - hp : impact santé (négatif = baisse, positif = remonte, clamp 0..100)
   ========================= */
const DEFAULT_TASKS = [
  // bonus
  { id: "sleep_good",    icon: "😴", title: "Dormir > 7h30",        desc: "", xp: +40, hp: +0 },
  { id: "make_bed",      icon: "🛏️", title: "Faire son lit",         desc: "", xp: +10, hp: +0 },
  { id: "fruit",         icon: "🍎", title: "Fruit",                desc: "", xp: +10, hp: +0 },
  { id: "sport",         icon: "🏃‍♂️", title: "Sport",               desc: "", xp: +50, hp: +0 },
  { id: "work_perf",     icon: "💻", title: "Perf au taff",         desc: "", xp: +30, hp: +0 },
  { id: "balanced_rest", icon: "🐟🥗", title: "Repos équilibré",     desc: "", xp: +30, hp: +0 },
  { id: "piano_10",      icon: "🎹", title: "+10 min de piano",     desc: "", xp: +25, hp: +0 },
  { id: "combat",        icon: "🥊", title: "Combat",               desc: "", xp: +60, hp: +0 },
  { id: "protein_snack", icon: "🥚", title: "Collation prot’",      desc: "", xp: +10, hp: +0 },
  { id: "stretch",       icon: "🧘‍♂️", title: "Étirements",         desc: "", xp: +15, hp: +0 },
  { id: "skincare",      icon: "🧴", title: "Skin care",            desc: "", xp: +10, hp: +0 },
  { id: "meditation",    icon: "🙏", title: "Méditation",           desc: "", xp: +15, hp: +0 },
  { id: "reading",       icon: "📚", title: "Lecture",              desc: "", xp: +20, hp: +0 },
  { id: "social_time",   icon: "🧑‍🤝‍🧑", title: "Social Time",     desc: "", xp: +10, hp: +0 },

  // malus (XP négatif + baisse Santé)
  { id: "sleep_bad",     icon: "🥱", title: "Dormir < 6h",           desc: "", xp: -40, hp: -25 },
  { id: "junk_food",     icon: "🍔🍟", title: "Junk food",           desc: "", xp: -30, hp: -15 },
  { id: "alcohol_1",     icon: "🍷", title: "Alcool (< 1 verre)",    desc: "", xp: -10, hp: -10 },
  { id: "alcohol_2",     icon: "🍷🍺", title: "Alcool (< 2 verres)", desc: "", xp: -20, hp: -18 },
  { id: "alcohol_3",     icon: "🍾🥂", title: "Alcool (< 3 verres)", desc: "", xp: -70, hp: -35 },
];

/* =========================
   3) NIVEAUX (labels “100%/110%/150%” = style)
   IMPORTANT :
   - On calcule une progression p = (XP positif coché) / (XP positif max)  ∈ [0..1]
   - minP = seuil sur p
   - Les labels 100/110/150 ne sont PAS mathématiques : juste du texte.
   ========================= */
const LEVELS = [
  { key: "lvl1",  label: "Larve 🐛",                      minP: 0.00,  image: "assets/lvl1_larve.png" },
  { key: "lvl2",  label: "Larve disciplinée 🐜",          minP: 0.15,  image: "assets/lvl2_larve_disciplinee.png" },
  { key: "lvl3",  label: "Soldat 🪖",                     minP: 0.35,  image: "assets/lvl3_soldat.png" },
  { key: "lvl4",  label: "Slayer ⚔️ (correct)",           minP: 0.55,  image: "assets/lvl4_slayer.png" },
  { key: "lvl5",  label: "Pirate des océans 🏴‍☠️ (bien)",  minP: 0.70,  image: "assets/lvl5_pirate.png" },
  { key: "lvl6",  label: "Apothicaire 🧪 (très bien)",     minP: 0.80,  image: "assets/lvl6_apothicaaire.png" },
  { key: "lvl7",  label: "Samuraï ⛩️ (parfait)",           minP: 0.90,  image: "assets/lvl7_samurai.png" },
  { key: "lvl8",  label: "Réussite ✅ (100%)",             minP: 0.96,  image: "assets/lvl8_reussite.png" },
  { key: "lvl9",  label: "Dieu RPG 👑 (110%)",             minP: 0.985, image: "assets/lvl9_dieu.png" },
  { key: "lvl10", label: "Dieu suprême 🔥 (150%)",         minP: 0.995, image: "assets/lvl9_dieu.png" },
];

/* =========================
   4) LOCAL STORAGE KEYS
   ========================= */
const LS_KEYS = {
  tasks: "xpTasks.tasks.v7",
  settings: "xpTasks.settings.v7",
  // état “jour affiché” (peut être aujourd’hui ou une date passée si tu navigues)
  view: "xpTasks.view.v7",
  // map dayKey -> { checked: {id:bool}, saved:boolean, savedAt:number }
  days: "xpTasks.days.v7",
  // array historique
  history: "xpTasks.history.v7",
};

/* =========================
   5) HELPERS
   ========================= */
const $ = (sel) => document.querySelector(sel);

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function formatDateFRFromISO(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateLongFRFromISO(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return formatDateFRFromISO(iso);
  }
}

/**
 * DayKey = jour logique selon resetHour (ex: 4h)
 * Si on est à 03:00 et resetHour=4 -> on compte encore “hier”.
 */
function computeDayKey(now, resetHour) {
  const d = new Date(now);
  const h = d.getHours();
  if (h < resetHour) d.setDate(d.getDate() - 1);
  return isoDate(d);
}

/* =========================
   6) LOAD/SAVE
   ========================= */
function loadTasks() {
  const saved = localStorage.getItem(LS_KEYS.tasks);
  const tasks = saved ? safeParse(saved, DEFAULT_TASKS) : DEFAULT_TASKS;
  localStorage.setItem(LS_KEYS.tasks, JSON.stringify(tasks));
  return tasks;
}

function loadSettings() {
  const fallback = { resetHour: 4 };
  const saved = localStorage.getItem(LS_KEYS.settings);
  const s = saved ? safeParse(saved, fallback) : fallback;
  s.resetHour = clamp(Number(s.resetHour ?? 4), 0, 23);
  localStorage.setItem(LS_KEYS.settings, JSON.stringify(s));
  return s;
}

function saveSettings(s) {
  localStorage.setItem(LS_KEYS.settings, JSON.stringify(s));
}

function loadDaysMap() {
  const saved = localStorage.getItem(LS_KEYS.days);
  const map = saved ? safeParse(saved, {}) : {};
  localStorage.setItem(LS_KEYS.days, JSON.stringify(map));
  return map;
}

function saveDaysMap(map) {
  localStorage.setItem(LS_KEYS.days, JSON.stringify(map));
}

function loadHistory() {
  const saved = localStorage.getItem(LS_KEYS.history);
  const h = saved ? safeParse(saved, []) : [];
  localStorage.setItem(LS_KEYS.history, JSON.stringify(h));
  return h;
}

function saveHistory(h) {
  localStorage.setItem(LS_KEYS.history, JSON.stringify(h));
}

function loadView() {
  const saved = localStorage.getItem(LS_KEYS.view);
  const fallback = { dayKey: null }; // null => aujourd’hui logique
  const v = saved ? safeParse(saved, fallback) : fallback;
  localStorage.setItem(LS_KEYS.view, JSON.stringify(v));
  return v;
}

function saveView(v) {
  localStorage.setItem(LS_KEYS.view, JSON.stringify(v));
}

/* =========================
   7) CALCULS XP / SANTÉ / PROGRESSION / NIVEAU
   ========================= */
function anyChecked(checked) {
  return Object.values(checked || {}).some(Boolean);
}

function calcXp(tasks, checked) {
  let total = 0;
  for (const t of tasks) {
    if (checked?.[t.id]) total += Number(t.xp || 0);
  }
  return total;
}

function calcHealth(tasks, checked) {
  let health = 100;
  for (const t of tasks) {
    if (checked?.[t.id]) health += Number(t.hp || 0);
  }
  // strictement ≤ 100 + clamp 0..100
  return clamp(health, 0, 100);
}

function maxPositiveXp(tasks) {
  return tasks.reduce((s, t) => (Number(t.xp) > 0 ? s + Number(t.xp) : s), 0);
}

function checkedPositiveXp(tasks, checked) {
  return tasks.reduce((s, t) => {
    if (Number(t.xp) > 0 && checked?.[t.id]) return s + Number(t.xp);
    return s;
  }, 0);
}

/** progression p ∈ [0..1] */
function calcProgress(tasks, checked) {
  const maxPos = Math.max(1, maxPositiveXp(tasks));
  const done = checkedPositiveXp(tasks, checked);
  return clamp(done / maxPos, 0, 1);
}

function getLevelForProgress(p) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (p >= lvl.minP) current = lvl;
  }
  return current;
}

/* =========================
   8) UI REFS (optionnels)
   ========================= */
// Tabs / pages
const tabTodayBtn = $("#tabToday");
const tabStatsBtn = $("#tabStats");
const tabSettingsBtn = $("#tabSettings");

const pageToday = $("#pageToday");
const pageStats = $("#pageStats");
const pageSettings = $("#pageSettings");

// Today header
const xpValueEl = $("#xpValue");
const healthValueEl = $("#healthValue");
const levelLabelEl = $("#levelLabel");
const levelImgEl = $("#levelImg");
const dayKeyLabelEl = $("#dayKeyLabel"); // ex: “Jour: 20/02/2026 (reset à 4h)”
const infoToastEl = $("#infoToast"); // “Journée enregistrée ✅” (optionnel)

// Date picker
const dayPickerEl = $("#dayPicker"); // <input type="date"> (optionnel)

// List
const tasksListEl = $("#tasksList");

// Buttons
const resetTodayBtn = $("#resetTodayBtn");
const saveDayBtn = $("#saveDayBtn");

// Settings
const resetHourInput = $("#resetHourInput"); // input number
const hardRefreshBtn = $("#hardRefreshBtn"); // button

// Stats
const historyListEl = $("#historyList");
const chartCanvas = $("#xpHealthChart");
const range7Btn = $("#range7");
const range30Btn = $("#range30");
const range90Btn = $("#range90");

// Footer / debug
const versionEl = $("#versionLabel");
const cacheEl = $("#cacheLabel");

let chart = null;
let currentRangeDays = 30;

/* =========================
   9) PAGE / TAB NAV
   ========================= */
function showPage(which) {
  const pages = [
    { key: "today", el: pageToday, btn: tabTodayBtn },
    { key: "stats", el: pageStats, btn: tabStatsBtn },
    { key: "settings", el: pageSettings, btn: tabSettingsBtn },
  ];

  for (const p of pages) {
    if (!p.el) continue;
    const on = p.key === which;
    p.el.style.display = on ? "" : "none";
    if (p.btn) p.btn.classList.toggle("active", on);
  }
}

/* =========================
   10) RENDER TASKS
   ========================= */
function renderTasks(tasks, checked, onToggle) {
  if (!tasksListEl) return;
  tasksListEl.innerHTML = "";

  for (const t of tasks) {
    const row = document.createElement("label");
    row.className = "taskRow";
    row.setAttribute("for", `task_${t.id}`);

    const left = document.createElement("div");
    left.className = "taskLeft";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `task_${t.id}`;
    cb.checked = !!checked?.[t.id];

    cb.addEventListener("change", () => {
      onToggle(t.id, cb.checked);
    });

    const txt = document.createElement("div");
    txt.className = "taskText";

    const title = document.createElement("div");
    title.className = "taskTitle";
    title.textContent = `${t.icon ? t.icon + " " : ""}${t.title}`;

    const meta = document.createElement("div");
    meta.className = "taskMeta";
    meta.textContent = t.desc || "";

    txt.appendChild(title);
    if (t.desc) txt.appendChild(meta);

    left.appendChild(cb);
    left.appendChild(txt);

    const badge = document.createElement("div");
    const xp = Number(t.xp || 0);
    badge.className = "badge " + (xp >= 0 ? "pos" : "neg");
    badge.textContent = `${xp >= 0 ? "+" : ""}${xp} XP`;

    row.appendChild(left);
    row.appendChild(badge);

    tasksListEl.appendChild(row);
  }
}

/* =========================
   11) RENDER TOP (XP/HP/LEVEL)
   ========================= */
function setImageSafe(imgEl, src) {
  if (!imgEl) return;
  imgEl.onerror = () => { imgEl.src = "assets/placeholder.png"; };
  imgEl.src = src;
}

function renderHeader(tasks, settings, dayKey, checked) {
  const xp = calcXp(tasks, checked);
  const hp = calcHealth(tasks, checked);
  const p = calcProgress(tasks, checked);
  const level = getLevelForProgress(p);

  if (xpValueEl) xpValueEl.textContent = String(xp);
  if (healthValueEl) healthValueEl.textContent = String(hp);

  if (levelLabelEl) levelLabelEl.textContent = level.label;
  setImageSafe(levelImgEl, level.image);

  if (dayKeyLabelEl) {
    const fr = formatDateFRFromISO(dayKey);
    dayKeyLabelEl.textContent = `Jour: ${fr} (reset à ${settings.resetHour}h)`;
  }
}

/* =========================
   12) HISTORY UPSERT + RENDER
   ========================= */
function upsertHistory(history, entry) {
  const idx = history.findIndex((h) => h.dayKey === entry.dayKey);
  if (idx >= 0) history[idx] = entry;
  else history.push(entry);
  history.sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  return history;
}

function renderHistory(history) {
  if (!historyListEl) return;

  historyListEl.innerHTML = "";
  const last = [...history].slice(-30).reverse();

  for (const h of last) {
    const div = document.createElement("div");
    div.className = "historyItem";
    div.innerHTML = `
      <div><strong>${formatDateFRFromISO(h.dayKey)}</strong> • ${h.xp} XP • ${h.health}/100</div>
      <div>${h.levelLabel}</div>
    `;
    historyListEl.appendChild(div);
  }

  if (history.length === 0) {
    const div = document.createElement("div");
    div.className = "historyItem";
    div.textContent = "Aucun historique pour l’instant.";
    historyListEl.appendChild(div);
  }
}

function sliceHistory(history, daysCount) {
  const cut = history.slice(-daysCount);
  return cut;
}

function renderChart(history, daysCount) {
  if (!chartCanvas || typeof Chart === "undefined") return;

  const h = sliceHistory(history, daysCount);
  const labels = h.map((x) => formatDateFRFromISO(x.dayKey));
  const xpData = h.map((x) => x.xp);
  const hpData = h.map((x) => x.health);

  if (chart) chart.destroy();

  chart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "XP",
          data: xpData,
          yAxisID: "yXp",
          tension: 0.25,
        },
        {
          label: "Santé",
          data: hpData,
          yAxisID: "yHp",
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        yXp: {
          position: "left",
          ticks: { color: "rgba(255,255,255,0.65)" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        yHp: {
          position: "right",
          min: 0,
          max: 100,
          ticks: { color: "rgba(255,255,255,0.65)" },
          grid: { display: false },
        },
        x: {
          ticks: { color: "rgba(255,255,255,0.65)" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
    },
  });
}

/* =========================
   13) DAY STATE (view day)
   ========================= */
function ensureDay(daysMap, dayKey) {
  if (!daysMap[dayKey]) {
    daysMap[dayKey] = { checked: {}, saved: false, savedAt: 0 };
  }
  if (!daysMap[dayKey].checked) daysMap[dayKey].checked = {};
  return daysMap[dayKey];
}

function toast(msg) {
  if (!infoToastEl) return;
  infoToastEl.textContent = msg;
  infoToastEl.classList.add("show");
  setTimeout(() => infoToastEl.classList.remove("show"), 900);
}

/* =========================
   14) SAVE DAY (manual/auto)
   ========================= */
function saveDayToHistory(tasks, settings, history, daysMap, dayKey) {
  const day = ensureDay(daysMap, dayKey);
  const checked = day.checked || {};

  // règle: enregistrer seulement si au moins une tâche cochée
  if (!anyChecked(checked)) return { ok: false, reason: "empty" };

  const xp = calcXp(tasks, checked);
  const health = calcHealth(tasks, checked);
  const p = calcProgress(tasks, checked);
  const level = getLevelForProgress(p);

  const entry = {
    dayKey,
    xp,
    health,
    progress: p,
    levelKey: level.key,
    levelLabel: level.label,
    savedAt: Date.now(),
  };

  const updated = upsertHistory(history, entry);
  saveHistory(updated);

  day.saved = true;
  day.savedAt = Date.now();
  daysMap[dayKey] = day;
  saveDaysMap(daysMap);

  return { ok: true, history: updated };
}

/* =========================
   15) AUTO-RESET CHECK
   - si on passe à un nouveau dayKey (selon resetHour),
     on auto-enregistre l’ancien si nécessaire
   ========================= */
function autoResetIfNeeded(tasks, settings, history, daysMap, view) {
  const now = new Date();
  const logicalToday = computeDayKey(now, settings.resetHour);

  // si on n’a pas de view.dayKey -> on est en “aujourd’hui”
  const viewed = view.dayKey || logicalToday;

  // si on est sur aujourd’hui: si le dayKey logique a changé => rollover
  if ((view.dayKey === null || view.dayKey === undefined) && viewed !== logicalToday) {
    // (normalement viewed == logicalToday) ; sécurité
    view.dayKey = null;
    saveView(view);
    return;
  }

  // rollover quand le dernier “todayKey” stocké change.
  // on stocke un marqueur dans settings (lastLogicalDayKey)
  const lastKey = settings.lastLogicalDayKey || logicalToday;
  if (lastKey !== logicalToday) {
    // on tente d’enregistrer le lastKey
    const lastDay = ensureDay(daysMap, lastKey);
    if (!lastDay.saved) {
      saveDayToHistory(tasks, settings, history, daysMap, lastKey);
    }
    // update marker
    settings.lastLogicalDayKey = logicalToday;
    saveSettings(settings);

    // si on était sur “aujourd’hui” (view.dayKey null), on reste sur aujourd’hui (donc nouveau dayKey)
    // et on s’assure que la journée courante existe
    ensureDay(daysMap, logicalToday);
    saveDaysMap(daysMap);
  } else {
    // init marker
    settings.lastLogicalDayKey = logicalToday;
    saveSettings(settings);
  }
}

/* =========================
   16) SETTINGS UI
   ========================= */
function wireSettingsUI(settings) {
  if (resetHourInput) {
    resetHourInput.value = String(settings.resetHour);
    resetHourInput.addEventListener("change", () => {
      const v = clamp(Number(resetHourInput.value || 4), 0, 23);
      settings.resetHour = v;
      saveSettings(settings);
      toast(`Reset jour = ${v}h ✅`);
    });
  }

  if (hardRefreshBtn) {
    hardRefreshBtn.addEventListener("click", async () => {
      // “vider cache” côté app: unregister SW + caches.delete + reload
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) await r.unregister();
        }
        if (window.caches) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
      location.reload(true);
    });
  }

  if (versionEl) versionEl.textContent = `Version: ${APP_VERSION}`;
  if (cacheEl) cacheEl.textContent = `Cache SW: ${SW_CACHE_VERSION}`;
}

/* =========================
   17) NOTIFICATIONS (sans backend)
   - iOS Safari/Chrome: très limité
   - On laisse juste un “requestPermission” si dispo
   ========================= */
async function tryEnableNotifications() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  return p === "granted";
}

/* =========================
   18) INIT / MAIN LOOP
   ========================= */
function init() {
  const tasks = loadTasks();
  const settings = loadSettings();
  const daysMap = loadDaysMap();
  let history = loadHistory();
  let view = loadView();

  // auto reset (rollover)
  autoResetIfNeeded(tasks, settings, history, daysMap, view);

  // compute current logical dayKey
  const logicalToday = computeDayKey(new Date(), settings.resetHour);

  // if view.dayKey is null => today
  let currentDayKey = view.dayKey || logicalToday;
  ensureDay(daysMap, currentDayKey);
  saveDaysMap(daysMap);

  // Tabs click
  if (tabTodayBtn) tabTodayBtn.addEventListener("click", () => showPage("today"));
  if (tabStatsBtn) tabStatsBtn.addEventListener("click", () => showPage("stats"));
  if (tabSettingsBtn) tabSettingsBtn.addEventListener("click", () => showPage("settings"));

  // default page
  showPage("today");

  // date picker (optionnel)
  if (dayPickerEl) {
    dayPickerEl.value = currentDayKey;
    dayPickerEl.addEventListener("change", () => {
      const iso = String(dayPickerEl.value || "").trim();
      if (!iso) return;

      view.dayKey = iso === logicalToday ? null : iso;
      saveView(view);

      currentDayKey = view.dayKey || logicalToday;
      ensureDay(daysMap, currentDayKey);
      saveDaysMap(daysMap);

      refreshUI();
    });
  }

  function refreshUI() {
    const day = ensureDay(daysMap, currentDayKey);
    const checked = day.checked || {};

    // header
    renderHeader(tasks, settings, currentDayKey, checked);

    // tasks list
    renderTasks(tasks, checked, (taskId, isOn) => {
      day.checked[taskId] = isOn;
      daysMap[currentDayKey] = day;
      saveDaysMap(daysMap);

      renderHeader(tasks, settings, currentDayKey, day.checked);
    });

    // stats
    renderHistory(history);
    renderChart(history, currentRangeDays);

    // picker sync
    if (dayPickerEl) dayPickerEl.value = currentDayKey;
  }

  // Buttons
  if (resetTodayBtn) {
    resetTodayBtn.addEventListener("click", () => {
      const day = ensureDay(daysMap, currentDayKey);
      day.checked = {};
      day.saved = false;
      day.savedAt = 0;
      daysMap[currentDayKey] = day;
      saveDaysMap(daysMap);
      refreshUI();
      toast("Réinitialisé ✅");
    });
  }

  if (saveDayBtn) {
    saveDayBtn.addEventListener("click", () => {
      const res = saveDayToHistory(tasks, settings, history, daysMap, currentDayKey);
      if (!res.ok) {
        toast("Rien à enregistrer (0 tâche cochée)");
        return;
      }
      history = res.history;
      refreshUI();
      toast("Journée enregistrée ✅");
    });
  }

  // ranges
  function setRange(n) {
    currentRangeDays = n;
    renderChart(history, currentRangeDays);
    if (range7Btn) range7Btn.classList.toggle("active", n === 7);
    if (range30Btn) range30Btn.classList.toggle("active", n === 30);
    if (range90Btn) range90Btn.classList.toggle("active", n === 90);
  }
  if (range7Btn) range7Btn.addEventListener("click", () => setRange(7));
  if (range30Btn) range30Btn.addEventListener("click", () => setRange(30));
  if (range90Btn) range90Btn.addEventListener("click", () => setRange(90));
  setRange(30);

  // settings render
  wireSettingsUI(settings);

  // refresh first time
  refreshUI();

  // timer: check rollover every 30s
  setInterval(() => {
    const latestSettings = loadSettings();
    const latestDays = loadDaysMap();
    const latestHistory = loadHistory();
    const latestView = loadView();

    autoResetIfNeeded(tasks, latestSettings, latestHistory, latestDays, latestView);

    // update in-memory references
    settings.resetHour = latestSettings.resetHour;
    settings.lastLogicalDayKey = latestSettings.lastLogicalDayKey;

    history = latestHistory;

    const nowLogical = computeDayKey(new Date(), settings.resetHour);
    const newDayKey = latestView.dayKey || nowLogical;

    // si on est sur “aujourd’hui” et rollover => on switch automatiquement
    const wasTodayMode = (view.dayKey === null || view.dayKey === undefined);
    const nowTodayMode = (latestView.dayKey === null || latestView.dayKey === undefined);

    view = latestView;

    if (wasTodayMode && nowTodayMode) {
      currentDayKey = nowLogical;
      ensureDay(latestDays, currentDayKey);
      saveDaysMap(latestDays);
    } else {
      currentDayKey = newDayKey;
      ensureDay(latestDays, currentDayKey);
      saveDaysMap(latestDays);
    }

    // update local map ref
    Object.keys(daysMap).forEach((k) => delete daysMap[k]);
    Object.assign(daysMap, latestDays);

    refreshUI();
  }, 30000);
}

document.addEventListener("DOMContentLoaded", init);