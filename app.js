/* =========================================================
   XP Tasks PWA - app.js (V7)
   - Pages (Today/Stats/Settings)
   - Santé (0..100) qui baisse via malus
   - Historique XP + Santé
   - Sélecteur de date (ajout/modif a posteriori)
   - Auto-rollover à 4h (sans clôturer)
   - Niveaux calculés automatiquement selon XP max possible
   ========================================================= */

const APP_VERSION = "7.0.0";

/** =========================
 * 1) TES TÂCHES
 * - xp : points XP (+ ou -)
 * - hp : impact Santé (0 ou négatif). Santé démarre à 100 et ne dépasse jamais 100.
 * ========================= */
const DEFAULT_TASKS = [
  { id: "sleep_good",    icon: "😴", title: "Dormir > 7h30",       desc: "", xp: +40, hp: 0 },
  { id: "make_bed",      icon: "🛏️", title: "Faire son lit",        desc: "", xp: +10, hp: 0 },
  { id: "fruit",         icon: "🍎", title: "Fruit",               desc: "", xp: +10, hp: 0 },
  { id: "sport",         icon: "🏃‍♂️", title: "Sport",              desc: "", xp: +50, hp: 0 },
  { id: "work_perf",     icon: "💻", title: "Perf au taff",        desc: "", xp: +30, hp: 0 },
  { id: "balanced_rest", icon: "🐟🥗", title: "Repos équilibré",    desc: "", xp: +30, hp: 0 },
  { id: "piano_10",      icon: "🎹", title: "+10 min de piano",    desc: "", xp: +25, hp: 0 },
  { id: "combat",        icon: "🥊", title: "Combat",              desc: "", xp: +60, hp: 0 },
  { id: "protein_snack", icon: "🥚", title: "Collation prot’",     desc: "", xp: +10, hp: 0 },
  { id: "stretch",       icon: "🧘‍♂️", title: "Étirements",        desc: "", xp: +15, hp: 0 },
  { id: "skincare",      icon: "🧴", title: "Skin care",           desc: "", xp: +10, hp: 0 },
  { id: "meditation",    icon: "🙏", title: "Méditation",          desc: "", xp: +15, hp: 0 },
  { id: "reading",       icon: "📚", title: "Lecture",             desc: "", xp: +20, hp: 0 },
  { id: "social_time",   icon: "🧑‍🤝‍🧑", title: "Social Time",    desc: "", xp: +10, hp: 0 },

  // Malus (XP négatif + Santé baisse)
  { id: "sleep_bad",     icon: "🥱", title: "Dormir < 6h",          desc: "", xp: -40, hp: -25 },
  { id: "junk_food",     icon: "🍔🍟", title: "Junk food",          desc: "", xp: -30, hp: -15 },
  { id: "alcohol_1",     icon: "🍷", title: "Alcool (< 1 verre)",   desc: "", xp: -10, hp: -10 },
  { id: "alcohol_2",     icon: "🍷🍺", title: "Alcool (< 2 verres)", desc: "", xp: -20, hp: -20 },
  { id: "alcohol_3",     icon: "🍾🥂", title: "Alcool (< 3 verres)", desc: "", xp: -70, hp: -35 }
];

/** =========================
 * 2) NIVEAUX (10 niveaux)
 * - Seuils basés sur XP max possible du jour (somme des xp positifs)
 * - Ratios inspirés de ce que tu as dit :
 *   Pirate = bien, Apothicaire = très bien, Samuraï = parfait,
 *   Réussite = 100%, Dieu RPG = 110%, Dieu Suprême = 150%
 * ========================= */
const LEVEL_DEFS = [
  { key: "lvl1",  label: "Larve 🐛",                 ratio: 0.00, img: "assets/lvl1_larve.png" },
  { key: "lvl2",  label: "Larve disciplinée 🐜",     ratio: 0.20, img: "assets/lvl2_larve_disciplinee.png" },
  { key: "lvl3",  label: "Soldat ⚔️",                ratio: 0.35, img: "assets/lvl3_soldat.png" },
  { key: "lvl4",  label: "Slayer 🗡️",                ratio: 0.60, img: "assets/lvl4_slayer.png" },
  { key: "lvl5",  label: "Pirate des océans 🏴‍☠️",   ratio: 0.80, img: "assets/lvl5_pirate.png" },
  { key: "lvl6",  label: "Apothicaire 🧪",           ratio: 0.90, img: "assets/lvl6_apothicaaire.png" },
  { key: "lvl7",  label: "Samuraï ⛩️🥷",             ratio: 1.00, img: "assets/lvl7_samurai.png" },
  { key: "lvl8",  label: "Réussite ✅ (100%)",       ratio: 1.00, img: "assets/lvl8_reussite.png" },
  { key: "lvl9",  label: "Dieu RPG 👑 (110%)",       ratio: 1.10, img: "assets/lvl9_dieu.png" },
  { key: "lvl10", label: "Dieu Suprême 🔱 (150%)",   ratio: 1.50, img: "assets/lvl9_dieu.png" }
];

/** =========================
 * 3) STORAGE
 * ========================= */
const LS = {
  tasks: "xptasks.tasks.v7",
  dayStates: "xptasks.dayStates.v7",  // map dateISO -> { checked: {id:bool} }
  history: "xptasks.history.v7",      // array {date,xp,health,levelKey,levelLabel}
  settings: "xptasks.settings.v7"     // { cutoffHour, rangeDays }
};

const $ = (s) => document.querySelector(s);

let chart = null;

/** =========================
 * 4) UTILITAIRES DATE
 * - journée “logique” selon cutoffHour (ex: 4h)
 * ========================= */
function pad2(n){ return String(n).padStart(2,"0"); }

function isoFromDate(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function formatFR(iso){
  const [y,m,d]=iso.split("-");
  return `${d}/${m}/${y}`;
}

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function loadJSON(key, fallback){
  try{
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  }catch{ return fallback; }
}
function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

/** Jour logique selon cutoff */
function dayKeyNow(cutoffHour){
  const now = new Date();
  const cut = Number(cutoffHour ?? 4);
  const d = new Date(now);
  if (now.getHours() < cut) d.setDate(d.getDate() - 1);
  return isoFromDate(d);
}

/** =========================
 * 5) DONNÉES
 * ========================= */
function loadTasks(){
  return loadJSON(LS.tasks, DEFAULT_TASKS);
}
function saveTasks(tasks){
  saveJSON(LS.tasks, tasks);
}

function loadSettings(){
  return loadJSON(LS.settings, { cutoffHour: 4, rangeDays: 30 });
}
function saveSettings(s){
  saveJSON(LS.settings, s);
}

function loadDayStates(){
  return loadJSON(LS.dayStates, {});
}
function saveDayStates(map){
  saveJSON(LS.dayStates, map);
}

function loadHistory(){
  return loadJSON(LS.history, []);
}
function saveHistory(hist){
  saveJSON(LS.history, hist);
}

/** =========================
 * 6) CALCULS XP / SANTÉ / NIVEAU
 * ========================= */
function getMaxPositiveXp(tasks){
  return tasks.reduce((sum,t)=> sum + (t.xp>0 ? t.xp : 0), 0);
}

function buildLevels(tasks){
  const maxPos = getMaxPositiveXp(tasks);
  return LEVEL_DEFS.map(def => ({
    ...def,
    minXp: Math.round(def.ratio * maxPos)
  })).sort((a,b)=>a.minXp-b.minXp);
}

function calcXp(tasks, checked){
  return tasks.reduce((sum,t)=> sum + (checked[t.id] ? t.xp : 0), 0);
}

function calcHealth(tasks, checked){
  const delta = tasks.reduce((sum,t)=> sum + (checked[t.id] ? (t.hp||0) : 0), 0);
  return clamp(100 + delta, 0, 100); // strictement <= 100
}

function getLevel(levels, xp){
  let current = levels[0];
  for (const L of levels){
    if (xp >= L.minXp) current = L;
  }
  return current;
}

/** =========================
 * 7) UI
 * ========================= */
const tabsEl = $("#tabs");
const pages = {
  today: $("#page-today"),
  stats: $("#page-stats"),
  settings: $("#page-settings")
};

const xpValueEl = $("#xpValue");
const healthValueEl = $("#healthValue");
const levelLabelEl = $("#levelLabel");
const levelImgEl = $("#levelImg");
const dayPillEl = $("#dayPill");
const tasksListEl = $("#tasksList");
const historyListEl = $("#historyList");

const datePickerEl = $("#datePicker");
const resetDayBtn = $("#resetDayBtn");
const saveDayBtn = $("#saveDayBtn");
const clearHistoryBtn = $("#clearHistoryBtn");

const statsChartEl = $("#statsChart");
const historyTableEl = $("#historyTable");

const cutoffHourEl = $("#cutoffHour");
const notifBtn = $("#notifBtn");
const hardRefreshBtn = $("#hardRefreshBtn");
const swVersionLabel = $("#swVersionLabel");

const toastEl = $("#toast");
const toastTextEl = $("#toastText");
const toastBtnEl = $("#toastBtn");

function toast(msg, btnText=null, btnCb=null){
  toastTextEl.textContent = msg;
  if (btnText){
    toastBtnEl.hidden = false;
    toastBtnEl.textContent = btnText;
    toastBtnEl.onclick = () => { btnCb?.(); hideToast(); };
  }else{
    toastBtnEl.hidden = true;
    toastBtnEl.onclick = null;
  }
  toastEl.hidden = false;
  setTimeout(hideToast, 4200);
}
function hideToast(){ toastEl.hidden = true; }

function setRoute(route){
  Object.keys(pages).forEach(r => pages[r].classList.toggle("isActive", r===route));
  tabsEl.querySelectorAll(".tab").forEach(b => b.classList.toggle("isActive", b.dataset.route===route));
}

function renderTasks(tasks, checked, onToggle){
  tasksListEl.innerHTML = "";
  for (const t of tasks){
    const row = document.createElement("label");
    row.className = "task";

    const left = document.createElement("div");
    left.className = "taskLeft";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!checked[t.id];
    cb.addEventListener("change", () => onToggle(t.id, cb.checked));

    const text = document.createElement("div");
    const title = document.createElement("div");
    title.className = "taskTitle";
    title.textContent = `${t.icon ? t.icon+" " : ""}${t.title}`;

    const meta = document.createElement("div");
    meta.className = "taskMeta";
    const hp = (t.hp||0);
    const hpTxt = hp < 0 ? ` • Santé ${hp}` : "";
    meta.textContent = `${t.desc||""}${hpTxt}`.trim();

    text.appendChild(title);
    if (meta.textContent) text.appendChild(meta);

    left.appendChild(cb);
    left.appendChild(text);

    const badge = document.createElement("div");
    badge.className = "badge " + (t.xp>=0 ? "pos" : "neg");
    badge.textContent = `${t.xp>=0?"+":""}${t.xp} XP`;

    row.appendChild(left);
    row.appendChild(badge);
    tasksListEl.appendChild(row);
  }
}

function renderTopKPIs(levels, tasks, checked, dateISO){
  const xp = calcXp(tasks, checked);
  const health = calcHealth(tasks, checked);
  const lvl = getLevel(levels, xp);

  xpValueEl.textContent = String(xp);
  healthValueEl.textContent = String(health);

  levelLabelEl.textContent = lvl.label;
  levelImgEl.onerror = () => { levelImgEl.src = "assets/icon-192.png"; };
  levelImgEl.src = lvl.img;

  dayPillEl.textContent = `Jour: ${formatFR(dateISO)} (reset à ${loadSettings().cutoffHour}h)`;
}

function upsertHistory(hist, entry){
  const idx = hist.findIndex(h => h.date === entry.date);
  if (idx>=0) hist[idx] = entry;
  else hist.push(entry);
  hist.sort((a,b)=> a.date.localeCompare(b.date));
  return hist;
}

function renderHistoryCards(hist){
  historyListEl.innerHTML = "";
  const last = [...hist].slice(-7).reverse();
  if (last.length === 0){
    historyListEl.innerHTML = `<div class="historyItem">Aucun historique pour l’instant.</div>`;
    return;
  }
  for (const h of last){
    const div = document.createElement("div");
    div.className = "historyItem";
    div.innerHTML = `
      <div class="historyTop">
        <div class="historyTitle">${formatFR(h.date)} • <strong>${h.xp} XP</strong></div>
        <div class="muted">Santé: <strong>${h.health}/100</strong></div>
      </div>
      <div class="historySub">${h.levelLabel}</div>
    `;
    historyListEl.appendChild(div);
  }
}

function renderHistoryTable(hist){
  historyTableEl.innerHTML = "";
  if (hist.length === 0){
    historyTableEl.innerHTML = `<div class="historyItem">Aucun historique.</div>`;
    return;
  }
  const last = [...hist].slice(-60).reverse();
  for (const h of last){
    const row = document.createElement("div");
    row.className = "historyRow";
    row.innerHTML = `
      <div>${formatFR(h.date)}</div>
      <div class="lvl">${h.levelLabel}</div>
      <div><strong>${h.xp}</strong> XP</div>
      <div><strong>${h.health}</strong>/100</div>
    `;
    historyTableEl.appendChild(row);
  }
}

function renderChart(hist, rangeDays){
  const cut = hist.slice(-rangeDays);
  const labels = cut.map(h => formatFR(h.date));
  const xp = cut.map(h => h.xp);
  const hp = cut.map(h => h.health);

  if (chart) chart.destroy();

  chart = new Chart(statsChartEl, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "XP",
          data: xp,
          borderColor: "rgba(119,226,255,0.95)",
          backgroundColor: "rgba(119,226,255,0.10)",
          tension: 0.35,
          yAxisID: "y1"
        },
        {
          label: "Santé",
          data: hp,
          borderColor: "rgba(72,255,181,0.95)",
          backgroundColor: "rgba(72,255,181,0.10)",
          tension: 0.35,
          yAxisID: "y2"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "rgba(255,255,255,0.75)" } } },
      scales: {
        x: { ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } },
        y1: {
          position: "left",
          ticks: { color: "rgba(255,255,255,0.65)" },
          grid: { color: "rgba(255,255,255,0.06)" }
        },
        y2: {
          position: "right",
          min: 0,
          max: 100,
          ticks: { color: "rgba(255,255,255,0.65)" },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

/** =========================
 * 8) LOGIQUE JOUR / ÉDITION A POSTERIORI
 * - dayStates[dateISO] = { checked: {id:bool} }
 * ========================= */
function getCheckedForDate(dayStates, dateISO){
  return dayStates[dateISO]?.checked || {};
}
function setCheckedForDate(dayStates, dateISO, checked){
  dayStates[dateISO] = { checked };
}

function hasAnyChecked(checked){
  return Object.values(checked).some(Boolean);
}

function saveDayToHistory(tasks, levels, hist, dateISO, checked){
  if (!hasAnyChecked(checked)) return hist; // ✅ “enregistrer seulement si ≥ 1 tâche cochée”
  const xp = calcXp(tasks, checked);
  const health = calcHealth(tasks, checked);
  const lvl = getLevel(levels, xp);
  const entry = { date: dateISO, xp, health, levelKey: lvl.key, levelLabel: lvl.label };
  return upsertHistory(hist, entry);
}

/** Auto-rollover à cutoff : si on change de jour logique, on save l'ancien */
function autoRollover(tasks, levels, dayStates, hist, settings){
  const currentDay = dayKeyNow(settings.cutoffHour);
  const meta = loadJSON("xptasks._meta.v7", { lastDay: currentDay });
  if (meta.lastDay !== currentDay){
    // on tente d'enregistrer l'ancien jour
    const oldChecked = getCheckedForDate(dayStates, meta.lastDay);
    hist = saveDayToHistory(tasks, levels, hist, meta.lastDay, oldChecked);
    saveHistory(hist);
    meta.lastDay = currentDay;
    saveJSON("xptasks._meta.v7", meta);
    toast("Nouveau jour ✅ (auto à 4h). Ancien jour enregistré si besoin.");
  }
  return hist;
}

/** =========================
 * 9) SERVICE WORKER / HARD REFRESH
 * ========================= */
async function registerSW(){
  if (!("serviceWorker" in navigator)) return;
  try{
    const reg = await navigator.serviceWorker.register("./sw.js");
    swVersionLabel.textContent = "v" + APP_VERSION;

    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller){
          toast("Mise à jour dispo ✅", "Recharger", () => location.reload());
        }
      });
    });
  }catch(e){
    console.log("SW registration failed", e);
  }
}

async function hardRefresh(){
  // Désenregistrer SW + vider caches, puis reload
  try{
    if ("serviceWorker" in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if (window.caches){
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  }catch{}
  location.reload(true);
}

/** =========================
 * 10) INIT
 * ========================= */
function init(){
  const tasks = loadTasks();
  saveTasks(tasks);

  const settings = loadSettings();
  cutoffHourEl.value = settings.cutoffHour;

  const levels = buildLevels(tasks);

  let dayStates = loadDayStates();
  let hist = loadHistory();

  // meta init
  const currentDay = dayKeyNow(settings.cutoffHour);
  const meta = loadJSON("xptasks._meta.v7", { lastDay: currentDay });
  if (!meta.lastDay) meta.lastDay = currentDay;
  saveJSON("xptasks._meta.v7", meta);

  // auto rollover au lancement
  hist = autoRollover(tasks, levels, dayStates, hist, settings);

  // date picker
  datePickerEl.value = currentDay;

  const renderForDate = (dateISO) => {
    const checked = getCheckedForDate(dayStates, dateISO);
    renderTopKPIs(levels, tasks, checked, dateISO);

    renderTasks(tasks, checked, (id, value) => {
      const newChecked = { ...getCheckedForDate(dayStates, dateISO), [id]: value };
      setCheckedForDate(dayStates, dateISO, newChecked);
      saveDayStates(dayStates);
      renderTopKPIs(levels, tasks, newChecked, dateISO);
    });
  };

  renderForDate(currentDay);
  renderHistoryCards(hist);

  // Save day button
  saveDayBtn.addEventListener("click", () => {
    const dateISO = datePickerEl.value;
    const checked = getCheckedForDate(dayStates, dateISO);
    const before = hist.length;
    hist = saveDayToHistory(tasks, levels, hist, dateISO, checked);
    saveHistory(hist);
    renderHistoryCards(hist);
    if (hist.length > before) toast("Journée enregistrée ✅");
    else toast("Rien à enregistrer (aucune tâche cochée).");
  });

  // Reset day
  resetDayBtn.addEventListener("click", () => {
    const dateISO = datePickerEl.value;
    setCheckedForDate(dayStates, dateISO, {});
    saveDayStates(dayStates);
    renderForDate(dateISO);
    toast("Journée réinitialisée.");
  });

  // Change date (edit past)
  datePickerEl.addEventListener("change", () => renderForDate(datePickerEl.value));

  // Clear history
  clearHistoryBtn.addEventListener("click", () => {
    if (!confirm("Effacer tout l’historique ?")) return;
    saveHistory([]);
    hist = [];
    renderHistoryCards(hist);
    renderHistoryTable(hist);
    if (chart) chart.destroy();
    toast("Historique effacé.");
  });

  // Tabs
  tabsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    const route = btn.dataset.route;
    setRoute(route);

    // refresh stats on open
    if (route === "stats"){
      const s = loadSettings();
      hist = loadHistory();
      renderChart(hist, s.rangeDays || 30);
      renderHistoryTable(hist);
    }
  });

  // Range buttons stats
  $("#page-stats").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-range]");
    if (!b) return;
    $("#page-stats").querySelectorAll("button[data-range]").forEach(x => x.classList.remove("isActive"));
    b.classList.add("isActive");
    const s = loadSettings();
    s.rangeDays = Number(b.dataset.range);
    saveSettings(s);
    hist = loadHistory();
    renderChart(hist, s.rangeDays);
  });

  // Settings: cutoff hour
  cutoffHourEl.addEventListener("change", () => {
    const s = loadSettings();
    s.cutoffHour = clamp(Number(cutoffHourEl.value), 0, 23);
    saveSettings(s);
    toast("Heure mise à jour. Recharge si besoin.");
  });

  // Notifications (sans backend)
  notifBtn.addEventListener("click", async () => {
    if (!("Notification" in window)){
      toast("Notifications non supportées ici.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") toast("OK ✅ (rappels possibles quand l’app est ouverte).");
    else toast("Refusé.");
  });

  hardRefreshBtn.addEventListener("click", () => hardRefresh());

  // Auto-rollover check toutes les 60s
  setInterval(() => {
    const tasks2 = loadTasks();
    const levels2 = buildLevels(tasks2);
    dayStates = loadDayStates();
    hist = loadHistory();
    const s = loadSettings();
    hist = autoRollover(tasks2, levels2, dayStates, hist, s);

    // si tu es sur la date “du jour logique”, refresh l’affichage
    const cur = dayKeyNow(s.cutoffHour);
    if (datePickerEl.value === cur) renderForDate(cur);
  }, 60000);

  registerSW();
}

document.addEventListener("DOMContentLoaded", init);