/* MofuTrack — calories, poids & pas par semaine, notes, IA & mofusand à débloquer */
(() => {
  'use strict';

  const STORE_KEY = 'mofutrack_v1';
  const KEY_STORE = 'mofutrack_ai_key';
  const MEALS = [
    { id: 'pdj', label: 'Petit-déj', emoji: '🥐' },
    { id: 'dej', label: 'Déjeuner', emoji: '🍱' },
    { id: 'gouter', label: 'Snack', emoji: '🍪' },
    { id: 'diner', label: 'Dîner', emoji: '🍜' },
  ];
  const SERIES = {
    weight: { label: 'Poids', color: '#e0607e' },
    kcal: { label: 'Calories', color: '#f0a33b' },
    steps: { label: 'Pas', color: '#2fae86' },
  };

  // Thèmes pastel : un différent chaque semaine (ou fixe si choisi dans ⚙️)
  const THEMES = [
    { id: 'sakura', name: 'Sakura 🌸', bg: '#fdf1f5', bg2: '#fadde8', soft: '#f5a9c1', accent: '#e57a9d', ink: '#7a3552' },
    { id: 'matcha', name: 'Matcha 🍵', bg: '#f0f8ee', bg2: '#dcefd8', soft: '#a6d59c', accent: '#62ad5f', ink: '#2e5a33' },
    { id: 'lavande', name: 'Lavande 💜', bg: '#f5f1fd', bg2: '#e6dcf8', soft: '#c3aaee', accent: '#9a76db', ink: '#4a3878' },
    { id: 'peche', name: 'Pêche 🍑', bg: '#fef4ec', bg2: '#fce1cd', soft: '#f8bd8f', accent: '#ee9455', ink: '#7a4320' },
    { id: 'citron', name: 'Citron 🍋', bg: '#fdfaea', bg2: '#f8eec2', soft: '#f1d26a', accent: '#d9ad1f', ink: '#665011' },
    { id: 'menthe', name: 'Menthe 🌿', bg: '#edf9f6', bg2: '#d2f0ea', soft: '#8fd8cb', accent: '#3fb5a3', ink: '#1d5a52' },
    { id: 'corail', name: 'Corail 🪸', bg: '#fdf1ef', bg2: '#fbdcd8', soft: '#f5a69e', accent: '#e9756b', ink: '#7a2f29' },
  ];

  // ---------- État ----------
  const defaultState = () => ({
    profile: { sex: 'h', age: null, height: null, weight: null, targetWeight: null, activity: 1.375, stepGoal: 8000, theme: 'auto' },
    days: {},
    weights: {},
    weekGoals: {},
    notes: [],
    custom: [],
    recent: [],
    bestXp: 0,
    seenCats: 1,
    seenRank: 0,
    companion: null,
  });

  let state = load();
  let currentDay = todayKey();
  let currentView = 'home';
  let chartWeek = mondayOf(todayKey());
  let chartRange = 7;
  const seriesOn = { weight: true, kcal: true, steps: true };
  let editingNoteId = null;
  let aiItems = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const d = defaultState();
        return { ...d, ...s, profile: { ...d.profile, ...(s.profile || {}) } };
      }
    } catch (e) { /* stockage indisponible */ }
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast('⚠️ Impossible de sauvegarder'); }
  }
  function getApiKey() { try { return localStorage.getItem(KEY_STORE) || ''; } catch (e) { return ''; } }

  // ---------- Dates & semaines ----------
  function keyOf(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function todayKey() { return keyOf(new Date()); }
  function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
  function mondayOf(k) { const d = parseKey(k); return addDays(k, -((d.getDay() + 6) % 7)); }
  function weekDays(monday) { return Array.from({ length: 7 }, (_, i) => addDays(monday, i)); }
  function isoWeek(k) {
    const d = parseKey(k);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const w1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  }
  function fmtDay(k, opts) {
    return parseKey(k).toLocaleDateString('fr-FR', opts || { weekday: 'long', day: 'numeric', month: 'long' });
  }
  const short = (k) => parseKey(k).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const weekLabel = (monday) => `${short(monday)} → ${short(addDays(monday, 6))}`;
  function dayLabel(k) {
    const t = todayKey();
    if (k === t) return "Aujourd'hui";
    if (k === addDays(t, -1)) return 'Hier';
    const s = fmtDay(k);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---------- Utilitaires ----------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
  const fmt1 = (n) => n.toFixed(1).replace('.', ',');
  const kShort = (v) => (v >= 10000 ? Math.round(v / 1000) + 'k' : v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + 'k' : String(Math.round(v)));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };

  function day(k) {
    if (!state.days[k]) state.days[k] = { foods: [], steps: null, active: null };
    return state.days[k];
  }
  function peekDay(k) { return state.days[k] || { foods: [], steps: null, active: null }; }
  function eaten(k) { return peekDay(k).foods.reduce((s, f) => s + f.kcal, 0); }

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  // ---------- Thème ----------
  function weeklyTheme() { return THEMES[isoWeek(todayKey()) % THEMES.length]; }
  function currentTheme() {
    const p = state.profile.theme;
    if (p && p !== 'auto') return THEMES.find((t) => t.id === p) || weeklyTheme();
    return weeklyTheme();
  }
  function applyTheme() {
    const t = currentTheme();
    const r = document.documentElement.style;
    r.setProperty('--bg', t.bg); r.setProperty('--bg2', t.bg2);
    r.setProperty('--soft', t.soft); r.setProperty('--accent', t.accent); r.setProperty('--ink-strong', t.ink);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.bg2);
    $('themeLabel').textContent = `Semaine ${isoWeek(currentDay)} · ${t.name}`;
  }

  // ---------- Calculs ----------
  function weightOn(k) { return state.weights[k] != null ? state.weights[k] : null; }
  function latestWeight(upto) {
    const keys = Object.keys(state.weights).filter((k) => !upto || k <= upto).sort();
    if (keys.length) return state.weights[keys[keys.length - 1]];
    return state.profile.weight;
  }
  function bmr(k) {
    const p = state.profile;
    const w = latestWeight(k);
    if (!p.age || !p.height || !w) return null;
    return 10 * w + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
  }
  // Objectif de la semaine : celui fixé pour cette semaine, sinon le dernier fixé avant
  function weekGoal(k) {
    const m = mondayOf(k);
    if (state.weekGoals[m]) return state.weekGoals[m];
    const prev = Object.keys(state.weekGoals).filter((x) => x < m).sort();
    return prev.length ? state.weekGoals[prev[prev.length - 1]] : null;
  }
  function dailyTarget(k) { const g = weekGoal(k); return g ? g / 7 : null; }
  function stepsKcal(steps, k) { return Math.round((steps || 0) * 0.04 * ((latestWeight(k) || 70) / 70)); }

  // ---------- XP & rangs ----------
  function computeXp() {
    const noteDays = new Set(state.notes.map((n) => keyOf(new Date(n.t))));
    const keys = new Set([...Object.keys(state.days), ...Object.keys(state.weights), ...noteDays]);
    const goal = state.profile.stepGoal || 8000;
    let xp = 0;
    for (const k of keys) {
      const d = peekDay(k);
      if (d.foods.length) {
        xp += 10;
        if (new Set(d.foods.map((f) => f.meal)).size >= 2) xp += 5;
        const t = dailyTarget(k);
        if (t && Math.abs(eaten(k) - t) <= t * 0.1) xp += 15;
        let streak = true;
        for (let i = 1; i < 7; i++) if (!peekDay(addDays(k, -i)).foods.length) { streak = false; break; }
        if (streak) xp += 10;
      }
      if (d.steps >= goal) xp += 20;
      if (d.steps >= goal * 1.5) xp += 10;
      if (state.weights[k] != null) xp += 10;
      if (noteDays.has(k)) xp += 3;
    }
    return xp;
  }
  function currentStreak() {
    let n = 0;
    let k = todayKey();
    if (!peekDay(k).foods.length) k = addDays(k, -1);
    while (peekDay(k).foods.length) { n++; k = addDays(k, -1); }
    return n;
  }
  function rankInfo() {
    const xp = computeXp();
    if (xp > state.bestXp) state.bestXp = xp;
    const best = state.bestXp;
    let idx = 0;
    RANKS.forEach((r, i) => { if (best >= r.xp) idx = i; });
    const unlocked = CATS.filter((c) => best >= c.xp);
    const nextCat = CATS.find((c) => best < c.xp);
    const companion = unlocked.find((c) => c.id === state.companion) || unlocked[unlocked.length - 1];
    return { xp, best, idx, rank: RANKS[idx], unlocked, nextCat, companion };
  }
  function checkUnlocks() {
    const info = rankInfo();
    const n = info.unlocked.length;
    if (n > state.seenCats) {
      const newCount = n - state.seenCats;
      const rankUp = info.idx > state.seenRank ? info.rank.rank : null;
      state.seenCats = n;
      state.seenRank = info.idx;
      save();
      showUnlock(info.unlocked[n - 1], newCount, rankUp);
    }
  }

  // ---------- Navigation ----------
  function go(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + view));
    document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.goto === view));
    window.scrollTo(0, 0);
    render();
  }
  function render() {
    applyTheme();
    renderTop();
    if (currentView === 'home') renderHome();
    if (currentView === 'food') renderFood();
    if (currentView === 'charts') renderCharts();
    if (currentView === 'notes') renderNotes();
    if (currentView === 'ranks') renderRanks();
    if (currentView === 'profile') renderProfile();
  }
  function renderTop() {
    const info = rankInfo();
    $('topCat').innerHTML = catImg(info.companion, 44);
    $('topRank').textContent = `Rang ${info.idx + 1} · ${info.rank.rank}`;
  }

  // ---------- Petits graphiques de la semaine ----------
  const W = 320;
  function weekdayLbl(k) { return parseKey(k).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''); }

  function barChart(keys, vals, opts) {
    const H = 150, pb = 22, pt = 16, bw = 26;
    const line = opts.line || null;
    const max = Math.max(1, ...vals, line || 0) * 1.15;
    const x = (i) => 20 + i * ((W - 40) / (keys.length - 1));
    const y = (v) => H - pb - (v / max) * (H - pb - pt);
    let svg = '';
    keys.forEach((k, i) => {
      const v = vals[i];
      const over = line && v > line * 1.05;
      const top = v ? y(v) : H - pb - 3;
      const fill = !v ? 'var(--bg2)' : over && opts.overIsBad ? '#f2a0ab' : opts.color || 'var(--soft)';
      svg += `<rect x="${x(i) - bw / 2}" y="${top}" width="${bw}" height="${H - pb - top}" rx="7" style="fill:${fill}"/>`;
      if (v) svg += `<text class="val" x="${x(i)}" y="${top - 4}" text-anchor="middle">${kShort(v)}</text>`;
      svg += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" ${k === currentDay ? 'class="val"' : ''}>${weekdayLbl(k)}</text>`;
    });
    if (line) svg += `<line x1="8" x2="${W - 8}" y1="${y(line)}" y2="${y(line)}" style="stroke:var(--ink-strong)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}">${svg}</svg>`;
  }

  function weightChart(keys) {
    const H = 150, pl = 34, pr = 14, pt = 20, pb = 22;
    const pts = keys.map((k, i) => ({ i, k, v: weightOn(k) })).filter((p) => p.v != null);
    if (!pts.length) return '<div class="empty">Pèse-toi pour voir ta courbe de la semaine ⚖️</div>';
    let min = Math.min(...pts.map((p) => p.v)), max = Math.max(...pts.map((p) => p.v));
    const pad = Math.max(0.4, (max - min) * 0.25);
    min -= pad; max += pad;
    const x = (i) => pl + i * ((W - pl - pr) / (keys.length - 1));
    const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
    let svg = '';
    for (let j = 0; j <= 2; j++) {
      const v = min + ((max - min) * j) / 2;
      svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--bg2)"/><text x="${pl - 4}" y="${y(v) + 3}" text-anchor="end">${fmt1(v)}</text>`;
    }
    if (pts.length > 1) svg += `<polyline points="${pts.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')}" fill="none" style="stroke:var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p) => {
      svg += `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="4" fill="#fff" style="stroke:var(--accent)" stroke-width="2.5"/><text class="val" x="${x(p.i)}" y="${y(p.v) - 8}" text-anchor="middle">${fmt1(p.v)}</text>`;
    });
    keys.forEach((k, i) => { svg += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" ${k === currentDay ? 'class="val"' : ''}>${weekdayLbl(k)}</text>`; });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}">${svg}</svg>`;
  }

  // ---------- Accueil ----------
  function renderHome() {
    const k = currentDay;
    const d = peekDay(k);
    const monday = mondayOf(k);
    const keys = weekDays(monday);
    $('dateLabel').textContent = dayLabel(k);
    $('nextDay').style.visibility = k >= todayKey() ? 'hidden' : 'visible';

    // 1. Calories : aujourd'hui + objectif de la semaine
    const today = eaten(k);
    const goal = weekGoal(k);
    const weekSum = keys.reduce((s, x) => s + eaten(x), 0);
    $('kcalToday').textContent = fmt(today);
    $('kcalTodayLbl').textContent = k === todayKey() ? "kcal aujourd'hui" : 'kcal ce jour';
    $('weekGoalVal').textContent = goal ? fmt(goal) + ' kcal' : '—';
    $('weekEaten').textContent = fmt(weekSum) + ' kcal';
    const left = goal ? goal - weekSum : null;
    $('weekLeft').textContent = left == null ? '—' : left >= 0 ? fmt(left) + ' kcal' : '+' + fmt(-left) + ' kcal';
    $('weekLeft').style.color = left != null && left < 0 ? 'var(--danger)' : '';
    // budget par jour restant, aujourd'hui inclus
    const idx = keys.indexOf(k);
    if (goal) {
      const before = keys.slice(0, idx).reduce((s, x) => s + eaten(x), 0);
      const perDay = (goal - before) / (7 - idx);
      $('perDayLeft').textContent = perDay > 0 ? `${fmt(perDay)} kcal` : '0 kcal';
    } else $('perDayLeft').textContent = '—';
    $('goalHint').hidden = !!goal;
    const C = 2 * Math.PI * 52;
    const ratio = goal ? Math.min(weekSum / goal, 1) : 0;
    const ring = $('ringFg');
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C * (1 - ratio);
    ring.style.stroke = goal && weekSum > goal ? 'var(--danger)' : 'var(--accent)';
    $('mealCount').textContent = d.foods.length ? `· ${d.foods.length} aliment${d.foods.length > 1 ? 's' : ''}` : '';
    $('mealLog').innerHTML = mealLogHtml(d);

    // 2. Pesée du jour + poids
    const w = weightOn(k);
    $('homeWeight').value = w != null ? w : '';
    const prevKeys = Object.keys(state.weights).filter((x) => x < k).sort();
    if (w != null && prevKeys.length) {
      const diff = w - state.weights[prevKeys[prevKeys.length - 1]];
      $('weightDelta').innerHTML = `<span class="${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '+' : ''}${fmt1(diff)} kg</span> vs dernière pesée`;
    } else $('weightDelta').textContent = w != null ? '✅ pesé(e)' : '';
    const cur = latestWeight(k);
    $('weightNow').textContent = cur ? fmt1(cur) + ' kg' : '—';
    const weekW = keys.filter((x) => x <= k).map(weightOn).filter((v) => v != null);
    const lastBefore = Object.keys(state.weights).filter((x) => x < monday).sort().pop();
    const weekStart = lastBefore ? state.weights[lastBefore] : weekW[0];
    const wd = weekW.length && weekStart != null ? weekW[weekW.length - 1] - weekStart : null;
    $('weightWeek').innerHTML = wd == null ? '—' : `<span class="${wd > 0 ? 'up' : 'down'}">${wd > 0 ? '+' : ''}${fmt1(wd)} kg</span>`;
    const allW = Object.keys(state.weights).sort();
    const start = state.profile.weight || (allW.length ? state.weights[allW[0]] : null);
    const td = cur && start ? cur - start : null;
    $('weightTotal').innerHTML = td == null ? '—' : `<span class="${td > 0 ? 'up' : 'down'}">${td > 0 ? '+' : ''}${fmt1(td)} kg</span>`;

    // 3. Poids de la semaine
    $('weekLabel1').textContent = weekLabel(monday);
    $('weekWeightChart').innerHTML = weightChart(keys);

    // 4. Calories de la semaine
    $('weekLabel2').textContent = weekLabel(monday);
    const vals = keys.map(eaten);
    const filled = vals.filter(Boolean);
    $('weekKcalChart').innerHTML = barChart(keys, vals, { line: dailyTarget(k), overIsBad: true }) +
      `<p class="muted small">Total <b>${fmt(weekSum)}</b>${goal ? ` / ${fmt(goal)} kcal` : ' kcal'} · moyenne <b>${fmt(filled.length ? weekSum / filled.length : 0)} kcal/jour</b>${goal ? ' · pointillés = objectif ÷ 7' : ''}</p>`;

    // 5. Pas
    const sg = state.profile.stepGoal || 8000;
    $('homeSteps').value = d.steps || '';
    $('homeSteps').placeholder = k === todayKey() ? "Nombre de pas aujourd'hui" : 'Nombre de pas ce jour';
    $('stepsBar').style.width = Math.min(100, ((d.steps || 0) / sg) * 100) + '%';
    $('stepsInfo').textContent = `${fmt(d.steps || 0)} / ${fmt(sg)} pas${d.steps ? ` · ≈ ${fmt(d.active || stepsKcal(d.steps, k))} kcal brûlées` : ''}`;
    const sv = keys.map((x) => peekDay(x).steps || 0);
    const sTot = sv.reduce((a, b) => a + b, 0);
    const sFill = sv.filter(Boolean).length;
    $('weekStepsChart').innerHTML = barChart(keys, sv, { line: sg, color: '#8fd3b9' }) +
      `<p class="muted small">Semaine : <b>${fmt(sTot)} pas</b> · moyenne <b>${fmt(sFill ? sTot / sFill : 0)}/jour</b> · pointillés = objectif</p>`;

    // Compagnon
    const info = rankInfo();
    $('homeCat').innerHTML = catImg(info.companion, 84);
    $('catBubble').textContent = catMessage(k, today, d, sg, info);
  }

  function mealLogHtml(d) {
    if (!d.foods.length) return '<div class="empty">Rien de noté pour l\'instant 🍙</div>';
    return MEALS.map((m) => {
      const items = d.foods.filter((f) => f.meal === m.id);
      if (!items.length) return '';
      const sum = items.reduce((s, f) => s + f.kcal, 0);
      return `<div class="meal"><div class="meal-title"><span>${m.emoji} ${m.label}</span><span>${fmt(sum)} kcal</span></div>
        ${items.map((f) => `<div class="meal-item"><span class="name">${esc(f.name)} <span class="muted small">· ${esc(f.qty)}</span></span>
          <span class="kc">${fmt(f.kcal)}</span><button class="del" data-del-food="${f.id}" aria-label="Supprimer">×</button></div>`).join('')}
      </div>`;
    }).join('');
  }

  function catMessage(k, e, d, sg, info) {
    const isToday = k === todayKey();
    const h = new Date().getHours();
    const t = dailyTarget(k);
    if (!weekGoal(k)) return 'Coucou ! Fixe ton objectif de calories de la semaine pour que je t\'aide 🦈';
    if (isToday && weightOn(k) == null && h < 12) return 'Bonjour ! N\'oublie pas ta pesée du matin, ça rapporte +10 XP ⚖️';
    if (!d.foods.length) return isToday ? 'Qu\'est-ce qu\'on mange aujourd\'hui ? Riz-poulet ? 🍚🍗' : 'Pas de repas noté ce jour-là.';
    if (t && e > t * 1.15) return 'Un peu au-dessus aujourd\'hui, pas grave : on équilibre sur la semaine 🐾';
    if (d.steps >= sg) return `${fmt(d.steps)} pas ! Tu es une vraie machine 🦈💨`;
    if (t && Math.abs(e - t) <= t * 0.1) return 'Pile dans ton objectif du jour, bravo ! +15 XP 🎯';
    if (info.nextCat && parseKey(k).getDate() % 2) return `Encore ${fmt(info.nextCat.xp - info.best)} XP pour débloquer un nouveau mofusand 👀`;
    return info.companion.quote;
  }

  function openWeekGoal() {
    const m = mondayOf(currentDay);
    const g = weekGoal(currentDay);
    const b = bmr(currentDay);
    const tdee = b ? b * state.profile.activity : null;
    openSheet(`
      <h2>🎯 Objectif de la semaine</h2>
      <p class="muted small">Semaine du ${esc(weekLabel(m))} : combien de calories veux-tu manger au total sur ces 7 jours ?</p>
      <div class="inline-form">
        <input type="number" inputmode="numeric" id="wgVal" value="${g || ''}" placeholder="ex : 14000">
        <span class="unit">kcal</span>
      </div>
      <p class="muted small" id="wgPerDay"></p>
      ${tdee ? `<p class="small hint">💡 Ta dépense estimée est d'environ <b>${fmt(tdee * 7)} kcal/semaine</b> (${fmt(tdee)}/jour). Pour perdre ~0,5 kg/sem : <b>${fmt((tdee - 500) * 7)}</b>.</p>` : ''}
      <button class="btn primary full" id="wgSave">Enregistrer</button>
    `);
    const upd = () => { const v = num($('wgVal').value); $('wgPerDay').textContent = v ? `≈ ${fmt(v / 7)} kcal par jour` : ''; };
    $('wgVal').oninput = upd; upd();
    $('wgSave').onclick = () => {
      const v = num($('wgVal').value);
      if (!v || v < 3000 || v > 60000) return toast('Entre un objectif entre 3 000 et 60 000 kcal');
      state.weekGoals[m] = Math.round(v);
      save(); closeSheet(); toast('🎯 Objectif de la semaine enregistré'); render(); checkUnlocks();
    };
  }

  // ---------- Aliments ----------
  const isRiceChicken = (f) => f.c === 'mealprep' || (/\b(riz|poulet)\b/.test(norm(f.n)) && ['feculents', 'viandes', 'charcut', 'plats'].includes(f.c));
  let foodCache = null, foodCacheKey = '';
  function allFoods() {
    const key = JSON.stringify(state.custom);
    if (foodCache && key === foodCacheKey) return foodCache;
    const base = FOODS.map((f, i) => ({ id: 'b' + i, n: f[0], c: f[1], p: f[2], g: f[3], k: f[4] }));
    const cust = state.custom.map((f) => ({ ...f, c: 'perso' }));
    foodCache = cust.concat(base); foodCacheKey = key;
    return foodCache;
  }
  function foodById(id) { return allFoods().find((f) => f.id === id); }

  function renderFood() {
    $('foodDayLabel').textContent = dayLabel(currentDay);
    $('foodDayTotal').textContent = `${fmt(eaten(currentDay))} kcal`;
    $('foodLog').innerHTML = mealLogHtml(peekDay(currentDay));
    $('aiMode').textContent = getApiKey() ? '⚡ Avec Claude (clé API enregistrée)' : '📚 Estimation avec la base d\'aliments · ajoute une clé Claude dans ⚙️ pour une IA plus précise';
    renderFoodResults();
  }

  function renderFoodResults() {
    const q = norm($('foodSearch').value.trim());
    const foods = allFoods();
    let list;
    if (!q) {
      $('foodListTitle').textContent = '🍗 Meal prep & favoris';
      const recent = state.recent.map(foodById).filter(Boolean);
      const seen = new Set(recent.map((f) => f.id));
      list = recent.concat(foods.filter((f) => !seen.has(f.id) && (f.c === 'perso' || isRiceChicken(f))));
    } else {
      $('foodListTitle').textContent = '🔍 Résultats';
      const words = q.split(/\s+/);
      list = foods
        .map((f) => {
          const n = norm(f.n);
          const cat = norm(FOOD_CATEGORIES[f.c] ? FOOD_CATEGORIES[f.c].label : '');
          if (!words.every((w) => n.includes(w) || cat.includes(w))) return null;
          let score = n.startsWith(q) ? 0 : n.includes(q) ? 1 : 2;
          if (state.recent.includes(f.id)) score -= 0.6;
          if (isRiceChicken(f)) score -= 0.3;
          return { f, score };
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score)
        .map((x) => x.f);
    }
    const out = list.slice(0, 80);
    if (!out.length) {
      $('foodResults').innerHTML = '<li class="empty" style="justify-content:center;cursor:default">Aucun résultat — essaie l\'IA au-dessus ou « ⭐ Créer un aliment »</li>';
      return;
    }
    $('foodResults').innerHTML = out.map((f) => {
      const cat = FOOD_CATEGORIES[f.c] || FOOD_CATEGORIES.perso;
      const per100 = f.g ? Math.round((f.k / f.g) * 100) : null;
      const ml = f.c === 'boissons';
      return `<li data-food="${f.id}">
        <div class="food-emoji">${cat.emoji}</div>
        <div class="food-info"><div class="food-name">${esc(f.n)}</div><div class="food-sub">${esc(f.p)}${f.g && !/\d\s*g\b/.test(f.p) ? ` · ${f.g} ${ml ? 'ml' : 'g'}` : ''}</div></div>
        <div class="food-kcal">${fmt(f.k)} kcal${per100 != null && f.g !== 100 ? `<small>${per100}/100${ml ? 'ml' : 'g'}</small>` : ''}</div>
      </li>`;
    }).join('');
  }

  function defaultMeal() {
    const h = new Date().getHours();
    if (currentDay !== todayKey()) return 'dej';
    return h < 11 ? 'pdj' : h < 15 ? 'dej' : h < 18 ? 'gouter' : 'diner';
  }
  function mealPicker(sel) {
    return `<div class="meal-pick" id="mealPick">${MEALS.map((m) => `<button data-meal="${m.id}" class="${m.id === sel ? 'on' : ''}">${m.emoji}<br>${m.label}</button>`).join('')}</div>`;
  }
  function bindMealPicker() {
    $('mealPick').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-meal]');
      if (!b) return;
      $('mealPick').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    });
  }
  const pickedMeal = () => $('mealPick').querySelector('.on').dataset.meal;
  function addFoods(entries) {
    const d = day(currentDay);
    entries.forEach((e) => d.foods.push({ id: uid(), ...e }));
    save();
  }
  function remember(id) { state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 30); }

  function openFoodSheet(f) {
    const unit = f.c === 'boissons' ? 'ml' : 'g';
    let mode = 'portion';
    openSheet(`
      <h2>${esc(f.n)}</h2>
      <p class="muted small">${esc(f.p)}${f.g ? ` (${f.g} ${unit})` : ''} = ${fmt(f.k)} kcal</p>
      ${f.g ? `<div class="seg" id="modeSeg" style="margin-top:10px"><button data-m="portion" class="on">Portions</button><button data-m="grams">En ${unit}</button></div>` : ''}
      <div class="stepper">
        <button id="qMinus">−</button>
        <input type="number" inputmode="decimal" step="0.5" id="qVal" value="1">
        <button id="qPlus">+</button>
      </div>
      <div class="kcal-preview"><span id="kPrev">${fmt(f.k)}</span> <small class="muted">kcal</small></div>
      ${mealPicker(defaultMeal())}
      <button class="btn primary full" id="btnAddFood">Ajouter à ${esc(dayLabel(currentDay).toLowerCase())}</button>
      ${f.c === 'perso' ? '<button class="btn danger full" id="btnDelCustom">Supprimer cet aliment perso</button>' : ''}
    `);
    const qVal = $('qVal');
    const calc = () => { const q = num(qVal.value) || 0; return mode === 'portion' ? f.k * q : (f.k / f.g) * q; };
    const upd = () => { $('kPrev').textContent = fmt(calc()); };
    const stepSize = () => (mode === 'portion' ? 0.5 : 10);
    $('qMinus').onclick = () => { qVal.value = Math.max(0, (num(qVal.value) || 0) - stepSize()); upd(); };
    $('qPlus').onclick = () => { qVal.value = (num(qVal.value) || 0) + stepSize(); upd(); };
    qVal.oninput = upd;
    if (f.g) {
      $('modeSeg').onclick = (ev) => {
        const b = ev.target.closest('[data-m]');
        if (!b) return;
        mode = b.dataset.m;
        $('modeSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        qVal.value = mode === 'portion' ? 1 : f.g;
        qVal.step = stepSize();
        upd();
      };
    }
    bindMealPicker();
    $('btnAddFood').onclick = () => {
      const q = num(qVal.value) || 0;
      if (q <= 0) return toast('Quantité invalide');
      const kcal = Math.round(calc());
      const qty = mode === 'portion' ? (q === 1 ? f.p : `${String(q).replace('.', ',')} × ${f.p}`) : `${q} ${unit}`;
      addFoods([{ name: f.n, kcal, qty, meal: pickedMeal(), ref: f.id }]);
      remember(f.id);
      save(); closeSheet();
      toast(`✅ ${f.n} ajouté (${fmt(kcal)} kcal)`);
      render(); checkUnlocks();
    };
    if (f.c === 'perso') {
      $('btnDelCustom').onclick = () => {
        if (!confirm('Supprimer cet aliment perso ?')) return;
        state.custom = state.custom.filter((x) => x.id !== f.id);
        save(); closeSheet(); render();
      };
    }
  }

  function openQuickKcal() {
    openSheet(`
      <h2>⚡ Ajout rapide</h2>
      <p class="muted small">Tu connais juste les calories ? Entre-les directement.</p>
      <div class="form-grid" style="margin-top:10px">
        <label class="full">Nom (optionnel)<input id="qkName" placeholder="ex : Resto midi"></label>
        <label class="full">Calories<input type="number" inputmode="numeric" id="qkKcal" placeholder="kcal"></label>
      </div>
      ${mealPicker(defaultMeal())}
      <button class="btn primary full" id="qkAdd">Ajouter</button>
    `);
    bindMealPicker();
    $('qkAdd').onclick = () => {
      const k = num($('qkKcal').value);
      if (!k || k <= 0) return toast('Entre un nombre de calories');
      addFoods([{ name: $('qkName').value.trim() || 'Ajout rapide', kcal: Math.round(k), qty: 'saisie', meal: pickedMeal() }]);
      closeSheet(); toast('✅ Ajouté'); render(); checkUnlocks();
    };
  }

  function openCustomFood() {
    openSheet(`
      <h2>⭐ Créer un aliment</h2>
      <p class="muted small">Pratique pour ta meal prep : il sera en haut de la liste et trouvable dans la recherche.</p>
      <div class="form-grid" style="margin-top:10px">
        <label class="full">Nom<input id="cfName" placeholder="ex : Ma boîte riz poulet"></label>
        <label>Portion<input id="cfPortion" placeholder="1 boîte"></label>
        <label>Grammes (optionnel)<input type="number" inputmode="decimal" id="cfGrams" placeholder="g"></label>
        <label class="full">Calories pour cette portion<input type="number" inputmode="numeric" id="cfKcal" placeholder="kcal"></label>
      </div>
      <button class="btn primary full" id="cfSave">Créer</button>
    `);
    $('cfSave').onclick = () => {
      const n = $('cfName').value.trim();
      const k = num($('cfKcal').value);
      if (!n || !k) return toast('Nom et calories requis');
      state.custom.unshift({ id: 'c' + uid(), n, p: $('cfPortion').value.trim() || '1 portion', g: num($('cfGrams').value), k: Math.round(k) });
      save(); closeSheet(); toast('⭐ Aliment créé'); render();
    };
  }

  // ---------- IA : estimation des calories ----------
  const NUMBER_WORDS = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12, demi: 0.5, demie: 0.5, moitie: 0.5 };
  const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'au', 'aux', 'a', 'en', 'mon', 'ma', 'mes', 'j', 'ai', 'mange', 'manger', 'pris', 'bu', 'bol', 'bols', 'assiette', 'assiettes', 'portion', 'portions', 'part', 'parts', 'tranche', 'tranches', 'verre', 'verres', 'morceau', 'morceaux', 'petit', 'petite', 'gros', 'grosse', 'peu', 'environ', 'aussi', 'ce', 'midi', 'soir', 'matin', 'piece', 'pieces', 'boite', 'canette', 'tasse', 'cuillere', 'sachet', 'paquet', 'pot']);
  const FILLER = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'au', 'aux', 'a', 'en', 'g', 'ou']);
  const stem = (w) => (w.length > 3 ? w.replace(/(s|x)$/, '') : w);
  const UNIT_MULT = { kg: 1000, l: 1000, cl: 10 };
  // Aliment choisi quand on tape juste un mot générique (« riz », « poulet »…)
  const DEFAULT_FOR = {
    riz: 'Riz blanc / jasmin cuit', poulet: 'Blanc de poulet grillé / cuit', pate: 'Pâtes cuites', frite: 'Frites (moyenne)',
    pizza: 'Pizza margherita (part)', pho: 'Pho bœuf (bol moyen)', ramen: 'Ramen shoyu', coca: 'Coca-Cola', oeuf: 'Œuf',
    pain: 'Baguette (1/4)', baguette: 'Baguette (1/4)', sushi: 'Sushi saumon', nem: 'Nem frit', kebab: 'Sandwich kebab complet',
    taco: 'Tacos 1 viande', burger: 'Burger maison (steak, cheddar)', steak: 'Steak haché 5%', saumon: 'Saumon cuit',
    yaourt: 'Yaourt nature', lait: 'Lait demi-écrémé', cafe: 'Café noir / espresso', biere: 'Bière', chorizo: 'Chorizo (5 tranches)',
    salade: 'Salade verte', fromage: 'Emmental', chip: 'Chips', cereale: 'Corn Flakes', thon: 'Thon au naturel (boîte)',
    jambon: 'Jambon blanc', boeuf: 'Bœuf émincé sauté', nouille: 'Nouilles sautées poulet', banane: 'Banane', pomme: 'Pomme',
  };
  const CONTAINERS = ['bol', 'assiette', 'part', 'tranche', 'canette', 'verre', 'boite', 'tasse', 'pot', 'sachet', 'paquet'];

  function estimateLocal(text) {
    const tokenized = allFoods().map((f) => ({ f, toks: norm(f.n).split(/[^a-z0-9]+/).filter(Boolean).map(stem) }));
    const chunks = norm(text).split(/,|;|\+|\n|\bet\b|\bavec\b|\bpuis\b|\bplus\b/).map((c) => c.trim()).filter(Boolean);
    const items = [], unknown = [];
    for (const chunk of chunks) {
      let c = chunk;
      let grams = null, count = 1;
      const gm = c.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|grammes?|ml|cl|l)\b/);
      if (gm) {
        grams = parseFloat(gm[1].replace(',', '.')) * (UNIT_MULT[gm[2]] || 1);
        c = c.replace(gm[0], ' ');
      } else {
        // un nombre compte comme quantité seulement s'il vient avant le nom de l'aliment (pas « pizza 4 fromages »)
        const nm = c.match(/(\d+(?:[.,]\d+)?)/);
        const before = nm ? c.slice(0, nm.index).split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w) && NUMBER_WORDS[w] == null) : [];
        if (nm && !before.length) { count = parseFloat(nm[1].replace(',', '.')); c = c.replace(nm[0], ' '); }
      }
      const words = c.split(/[^a-z0-9]+/).filter(Boolean);
      if (count === 1 && !gm) {
        for (const w of words) if (NUMBER_WORDS[w] != null) { count = NUMBER_WORDS[w]; break; }
      }
      const q = words.filter((w) => !STOP.has(w) && NUMBER_WORDS[w] == null).map(stem);
      if (!q.length) continue;
      const container = CONTAINERS.find((cw) => words.some((w) => stem(w) === cw));
      let best = null;
      if (q.length === 1 && DEFAULT_FOR[q[0]]) {
        const f = tokenized.find((t) => t.f.n === DEFAULT_FOR[q[0]]);
        if (f) best = { f: f.f, score: 9 };
      }
      if (!best) tokenized.forEach(({ f, toks }, idx) => {
        const ft = toks.filter((t) => !FILLER.has(t) && !/^\d+$/.test(t));
        let m = 0;
        q.forEach((w) => { if (ft.some((t) => t === w || (w.length >= 4 && t.startsWith(w)))) m++; });
        if (!m || m / q.length < 0.5) return;
        let score = m / q.length + (m / Math.max(1, ft.length)) * 0.5;
        if (state.recent.includes(f.id)) score += 0.15;
        if (isRiceChicken(f)) score += 0.1;
        if (f.c === 'mealprep') score += 0.15;
        if (container && norm(f.p).includes(container)) score += 0.3;
        if (/\bcru\b/.test(norm(f.p + ' ' + f.n)) && !q.includes('cru')) score -= 0.4;
        score -= idx * 0.00001;
        if (!best || score > best.score) best = { f, score };
      });
      if (!best) { unknown.push(chunk); continue; }
      const f = best.f;
      const unit = f.c === 'boissons' ? 'ml' : 'g';
      const kcal = grams && f.g ? (f.k / f.g) * grams : f.k * count;
      items.push({ name: f.n, qty: grams && f.g ? `${grams} ${unit}` : count === 1 ? f.p : `${String(count).replace('.', ',')} × ${f.p}`, kcal: Math.round(kcal), ref: f.id });
    }
    return { items, note: unknown.length ? `Pas trouvé : « ${unknown.join(' », « ')} ». Ajoute-le avec ⚡ Ajout rapide ou ⭐ Créer.` : '' };
  }

  async function runAi() {
    const text = $('aiText').value.trim();
    if (!text) return toast('Écris ce que tu as mangé 🙂');
    const btn = $('btnAi');
    const key = getApiKey();
    let res;
    if (key) {
      btn.disabled = true; btn.textContent = '⏳ Claude réfléchit…';
      try {
        const mod = await import(new URL('js/ai-claude.mjs', document.baseURI).href);
        try {
          res = await mod.estimateWithClaude(key, text);
        } catch (err) {
          res = estimateLocal(text);
          res.note = `⚠️ ${mod.describeError(err)} Estimation avec la base d'aliments à la place. ${res.note}`;
        }
      } catch (e) {
        res = estimateLocal(text);
        res.note = `⚠️ IA indisponible (hors ligne ?), estimation avec la base d'aliments. ${res.note}`;
      }
      btn.disabled = false; btn.textContent = '✨ Calculer les calories';
    } else {
      res = estimateLocal(text);
    }
    aiItems = res.items;
    renderAiResult(res.note);
  }

  function renderAiResult(note) {
    if (!aiItems.length) {
      $('aiResult').innerHTML = `<p class="hint">😿 Je n'ai rien reconnu. ${esc(note || '')}</p>`;
      return;
    }
    const total = aiItems.reduce((s, i) => s + i.kcal, 0);
    $('aiResult').innerHTML = `
      <div class="ai-items">
        ${aiItems.map((i, n) => `<div class="meal-item"><span class="name">${esc(i.name)} <span class="muted small">· ${esc(i.qty)}</span></span>
          <input class="ai-kcal" type="number" inputmode="numeric" data-ai-idx="${n}" value="${i.kcal}" aria-label="kcal"><button class="del" data-ai-del="${n}" aria-label="Retirer">×</button></div>`).join('')}
      </div>
      <div class="ai-total">Total : <b id="aiTotal">${fmt(total)}</b> kcal</div>
      ${note ? `<p class="muted small">${esc(note)}</p>` : ''}
      ${mealPicker(defaultMeal())}
      <button class="btn primary full" id="aiAdd">✅ Ajouter au journal</button>`;
    bindMealPicker();
    $('aiAdd').onclick = () => {
      const meal = pickedMeal();
      addFoods(aiItems.map((i) => ({ name: i.name, kcal: i.kcal, qty: i.qty, meal, ...(i.ref ? { ref: i.ref } : {}) })));
      aiItems.forEach((i) => { if (i.ref) remember(i.ref); });
      save();
      toast(`✅ ${fmt(aiItems.reduce((s, i) => s + i.kcal, 0))} kcal ajoutées`);
      aiItems = []; $('aiText').value = ''; $('aiResult').innerHTML = '';
      render(); checkUnlocks();
    };
  }

  // ---------- Pas ----------
  function parseNumber(s) {
    s = String(s).replace(/[\s  ]/g, '');
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return parseInt(s.replace(/[.,]/g, ''), 10);
    const n = parseFloat(s.replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function parseImport(txt) {
    const t = String(txt || '').replace(/[  ]/g, ' ');
    const grab = (re) => { const m = t.match(re); return m ? parseNumber(m[1]) : null; };
    let steps = grab(/(?:pas|steps?)\s*[:=]\s*([\d\s.,]+)/i);
    const kcal = grab(/(?:kcal|cal|energie|énergie)\s*[:=]\s*([\d\s.,]+)/i);
    const dm = t.match(/date\s*[:=]\s*(\d{4}-\d{2}-\d{2})/i);
    if (steps == null && kcal == null) {
      const m = t.match(/\d[\d\s.,]*/);
      if (m) steps = parseNumber(m[0].trim());
    }
    return { steps: steps != null ? Math.round(steps) : null, kcal: kcal != null ? Math.round(kcal) : null, date: dm ? dm[1] : null };
  }
  function applyImport(r) {
    if (r.steps == null && r.kcal == null) { toast('😿 Aucun nombre de pas trouvé'); return false; }
    const k = r.date || todayKey();
    const d = day(k);
    if (r.steps != null) d.steps = r.steps;
    if (r.kcal != null) d.active = r.kcal;
    save();
    currentDay = k;
    toast(`👣 ${r.steps != null ? fmt(r.steps) + ' pas' : ''}${r.kcal != null ? ' · 🔥 ' + fmt(r.kcal) + ' kcal' : ''} importés !`);
    render(); checkUnlocks();
    return true;
  }
  async function pasteSteps() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) throw new Error('no clipboard');
      const txt = await navigator.clipboard.readText();
      if (applyImport(parseImport(txt))) return;
    } catch (e) { /* collage manuel */ }
    openSheet(`
      <h2>📋 Coller mes pas</h2>
      <p class="muted small">Maintiens le doigt dans la case → <b>Coller</b> le texte copié par ton raccourci (ex : <code>pas=10432</code>).</p>
      <textarea id="pasteBox" rows="3" style="margin-top:10px"></textarea>
      <button class="btn primary full" id="pasteOk">Importer</button>
    `);
    $('pasteOk').onclick = () => { if (applyImport(parseImport($('pasteBox').value))) closeSheet(); };
  }
  function saveSteps() {
    const v = num($('homeSteps').value);
    if (v == null || v < 0 || v > 200000) return toast('Nombre de pas invalide');
    day(currentDay).steps = Math.round(v);
    save(); toast(`👣 ${fmt(v)} pas enregistrés`); render(); checkUnlocks();
  }

  // ---------- Poids ----------
  function saveWeight(k, v) {
    const w = num(v);
    if (!w || w < 20 || w > 400) { toast('Poids invalide'); return; }
    state.weights[k] = Math.round(w * 10) / 10;
    if (!state.profile.weight) state.profile.weight = state.weights[k];
    save();
    toast(`⚖️ ${fmt1(state.weights[k])} kg enregistré`);
    render(); checkUnlocks();
  }

  // ---------- Graphes superposés ----------
  function renderCharts() {
    const end = addDays(chartWeek, 6);
    const keys = chartRange === 7 ? weekDays(chartWeek) : Array.from({ length: 28 }, (_, i) => addDays(end, i - 27));
    $('chartWeekLabel').textContent = chartRange === 7 ? `Semaine du ${weekLabel(chartWeek)}` : `${short(keys[0])} → ${short(end)}`;
    $('nextWeek').style.visibility = chartWeek >= mondayOf(todayKey()) ? 'hidden' : 'visible';
    document.querySelectorAll('#chartRange button').forEach((b) => b.classList.toggle('on', Number(b.dataset.r) === chartRange));
    document.querySelectorAll('#seriesToggle button').forEach((b) => b.classList.toggle('on', seriesOn[b.dataset.s]));

    const data = {
      weight: keys.map(weightOn),
      kcal: keys.map((k) => eaten(k) || null),
      steps: keys.map((k) => peekDay(k).steps || null),
    };
    const H = 220, pl = 12, pr = 12, pt = 24, pb = 26;
    const x = (i) => pl + 10 + i * ((W - pl - pr - 20) / (keys.length - 1));
    const dense = keys.length > 7;
    let svg = '';
    for (let j = 0; j <= 4; j++) { const yy = pt + ((H - pt - pb) * j) / 4; svg += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" style="stroke:var(--bg2)"/>`; }
    Object.keys(SERIES).forEach((s) => {
      if (!seriesOn[s]) return;
      const present = data[s].map((v, i) => ({ v, i })).filter((p) => p.v != null);
      if (!present.length) return;
      let min = Math.min(...present.map((p) => p.v)), max = Math.max(...present.map((p) => p.v));
      if (s !== 'weight') min = 0;
      if (max - min < 1e-9) { min -= 1; max += 1; }
      const pad = (max - min) * 0.12;
      const y = (v) => pt + (1 - (v - min + pad) / (max - min + 2 * pad)) * (H - pt - pb);
      const col = SERIES[s].color;
      if (present.length > 1) svg += `<polyline points="${present.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${dense ? 2.2 : 3}" stroke-linejoin="round" stroke-linecap="round"/>`;
      present.forEach((p) => {
        svg += `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="${dense ? 2.4 : 4}" fill="#fff" stroke="${col}" stroke-width="2"/>`;
        if (!dense) svg += `<text x="${x(p.i)}" y="${s === 'kcal' ? y(p.v) + 15 : y(p.v) - 7}" text-anchor="middle" style="fill:${col};font-weight:700">${s === 'weight' ? fmt1(p.v) : kShort(p.v)}</text>`;
      });
    });
    keys.forEach((k, i) => {
      if (dense && i % 7 !== 0 && i !== keys.length - 1) return;
      svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${dense ? short(k) : weekdayLbl(k)}</text>`;
    });
    $('comboChart').innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}">${svg}</svg>`;

    const avg = (a) => { const v = a.filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
    const wv = data.weight.filter((v) => v != null);
    const wDiff = wv.length > 1 ? wv[wv.length - 1] - wv[0] : null;
    const kcalTot = data.kcal.reduce((s, v) => s + (v || 0), 0);
    const goal = chartRange === 7 ? weekGoal(chartWeek) : null;
    const stat = (v, l, color) => `<div class="stat"><b style="color:${color}">${v}</b><span>${l}</span></div>`;
    $('comboStats').innerHTML =
      stat(wv.length ? fmt1(wv[wv.length - 1]) + ' kg' : '—', 'Dernier poids', SERIES.weight.color) +
      stat(wDiff != null ? (wDiff > 0 ? '+' : '') + fmt1(wDiff) + ' kg' : '—', 'Variation', SERIES.weight.color) +
      stat(avg(data.weight) != null ? fmt1(avg(data.weight)) : '—', 'Poids moyen', SERIES.weight.color) +
      stat(fmt(kcalTot), goal ? `kcal / ${fmt(goal)}` : 'kcal au total', SERIES.kcal.color) +
      stat(avg(data.kcal) != null ? fmt(avg(data.kcal)) : '—', 'kcal / jour', SERIES.kcal.color) +
      stat(avg(data.steps) != null ? fmt(avg(data.steps)) : '—', 'pas / jour', SERIES.steps.color);

    $('comboTable').innerHTML = `<tr><th>Jour</th><th style="color:${SERIES.weight.color}">Poids</th><th style="color:${SERIES.kcal.color}">Kcal</th><th style="color:${SERIES.steps.color}">Pas</th></tr>` +
      keys.map((k, j) => ({ k, j })).reverse().map(({ k, j }) => `<tr class="${k === todayKey() ? 'today' : ''}"><td>${esc(fmtDay(k, { weekday: 'short', day: 'numeric', month: 'short' }))}</td>
          <td>${data.weight[j] != null ? fmt1(data.weight[j]) : '·'}</td><td>${data.kcal[j] != null ? fmt(data.kcal[j]) : '·'}</td><td>${data.steps[j] != null ? fmt(data.steps[j]) : '·'}</td></tr>`).join('');
  }

  // ---------- Notes ----------
  function renderNotes() {
    const q = norm($('noteSearch').value.trim());
    const list = state.notes.filter((n) => !q || norm(n.text).includes(q)).sort((a, b) => b.t - a.t);
    $('notesList').innerHTML = list.length
      ? list.map((n) => `<li class="note"><div class="note-head">
          <span class="note-date">${esc(new Date(n.t).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</span>
          <span class="note-actions"><button class="btn small" data-edit-note="${n.id}">✏️</button><button class="del" data-del-note="${n.id}" aria-label="Supprimer">×</button></span>
        </div><div class="note-text">${esc(n.text)}</div></li>`).join('')
      : `<li class="empty">${q ? 'Aucune note trouvée' : 'Pas encore de note 📝'}</li>`;
  }
  function saveNote() {
    const text = $('noteText').value.trim();
    if (!text) return toast('Écris quelque chose 🙂');
    if (editingNoteId) {
      const n = state.notes.find((x) => x.id === editingNoteId);
      if (n) n.text = text;
    } else state.notes.push({ id: uid(), t: Date.now(), text });
    editingNoteId = null;
    $('noteText').value = '';
    $('btnCancelNote').hidden = true;
    save(); toast('📝 Note enregistrée'); render(); checkUnlocks();
  }

  // ---------- Rangs ----------
  const RANK_EMOJI = ['🦠', '🦐', '🐠', '🪼', '🐢', '🐬', '🐙', '🌊', '🦈', '🦈', '🐋', '🦖', '👑'];
  function renderRanks() {
    const info = rankInfo();
    const c = info.companion;
    const rar = RARITIES[c.rarity];
    $('rankCat').innerHTML = catImg(c, 170);
    $('rankLevel').textContent = `${RANK_EMOJI[info.idx]} Rang ${info.idx + 1} / ${RANKS.length}`;
    $('rankName').textContent = info.rank.rank;
    $('rankCatName').innerHTML = `<span class="muted">${esc(c.name)}</span> <span class="rarity-tag" style="background:${rar.color}">${rar.label}</span>`;
    const nextRank = RANKS[info.idx + 1];
    if (nextRank) {
      const pct = ((info.best - info.rank.xp) / (nextRank.xp - info.rank.xp)) * 100;
      $('xpBar').style.width = Math.min(100, pct) + '%';
      $('xpText').textContent = `${fmt(info.best)} XP · encore ${fmt(nextRank.xp - info.best)} XP pour « ${nextRank.rank} »`;
    } else {
      $('xpBar').style.width = '100%';
      $('xpText').textContent = `${fmt(info.best)} XP · rang maximum atteint ! 👑`;
    }
    const tracked = new Set([...Object.keys(state.days).filter((k) => state.days[k].foods.length), ...Object.keys(state.weights)]).size;
    $('rankChips').innerHTML = `<span>🔥 ${currentStreak()} j de série</span><span>📅 ${tracked} jours suivis</span><span>🐾 ${info.unlocked.length}/${CATS.length}</span>`;

    // Prochain mofusand
    const nc = info.nextCat;
    if (nc) {
      const prev = CATS[nc.id - 1];
      const pct = ((info.best - prev.xp) / (nc.xp - prev.xp)) * 100;
      const nr = RARITIES[nc.rarity];
      $('nextCatCard').innerHTML = `<div class="next-art locked-art">${catImg(nc, 90)}<span class="q">?</span></div>
        <div class="next-info"><div class="muted small">Prochain mofusand</div><b>Mystère <span class="rarity-tag" style="background:${nr.color}">${nr.label}</span></b>
        <div class="bar"><div class="bar-fill" style="width:${Math.min(100, pct)}%"></div></div>
        <div class="muted small">${fmt(info.best)} / ${fmt(nc.xp)} XP · encore ${fmt(nc.xp - info.best)} XP</div></div>`;
    } else {
      $('nextCatCard').innerHTML = '<div class="next-info"><b>🎉 Collection complète !</b><div class="muted small">Tu as débloqué tous les mofusand.</div></div>';
    }

    // Échelle des rangs
    $('ladder').innerHTML = RANKS.map((r, i) => `<div class="rung ${i < info.idx ? 'done' : ''} ${i === info.idx ? 'now' : ''}">
      <span class="re">${RANK_EMOJI[i]}</span><span class="rn">${esc(r.rank)}</span><span class="rx">${i <= info.idx ? '✓' : fmt(r.xp) + ' XP'}</span></div>`).join('');
    const now = $('ladder').querySelector('.now');
    if (now) $('ladder').scrollLeft = now.offsetLeft - 40;

    // Collection par rareté
    $('collectionCount').textContent = `${info.unlocked.length} / ${CATS.length}`;
    $('collection').innerHTML = Object.entries(RARITIES).map(([rid, r]) => {
      const cats = CATS.filter((x) => x.rarity === rid);
      const got = cats.filter((x) => info.best >= x.xp).length;
      return `<div class="rarity-head" style="color:${r.color}"><span>✦ ${r.label}</span><span>${got}/${cats.length}</span></div>
        <div class="collection rar-${rid}">${cats.map((cat) => {
          const unlocked = info.best >= cat.xp;
          return `<div class="cat-card ${unlocked ? 'unlocked' : 'locked'} ${cat.id === c.id ? 'current' : ''}" data-cat-idx="${cat.id}" style="--rc:${r.color}">
            ${catImg(cat, 76)}
            <div class="cn">${unlocked ? esc(cat.name.replace(/^Mofu /, '')) : '???'}</div>
            ${unlocked ? '' : `<div class="rar">${fmt(cat.xp)} XP</div>`}
          </div>`;
        }).join('')}</div>`;
    }).join('');
  }
  function showCat(i) {
    const cat = CATS[i];
    const info = rankInfo();
    const unlocked = info.best >= cat.xp;
    const rar = RARITIES[cat.rarity];
    const isComp = info.companion.id === cat.id;
    openSheet(`<div class="unlock">
      <div class="${unlocked ? '' : 'locked-art'}">${catImg(cat, 190)}</div>
      <h2>${unlocked ? esc(cat.name) : 'Mofusand mystère'}</h2>
      <span class="rarity-tag" style="background:${rar.color}">${rar.label}</span>
      <p class="muted">${unlocked ? '« ' + esc(cat.quote) + ' »' : `Se débloque à ${fmt(cat.xp)} XP (encore ${fmt(cat.xp - info.best)} XP). Continue comme ça !`}</p>
      ${unlocked && !isComp ? '<button class="btn primary full" id="catPick">⭐ Choisir comme compagnon</button>' : ''}
      <button class="btn full" id="catOk">${isComp ? 'C\'est mon compagnon 💙' : 'Fermer'}</button>
    </div>`);
    $('catOk').onclick = closeSheet;
    if ($('catPick')) $('catPick').onclick = () => { state.companion = cat.id; save(); closeSheet(); render(); toast(`💙 ${cat.name} t'accompagne !`); };
  }
  function showUnlock(cat, count, rankUp) {
    const rar = RARITIES[cat.rarity];
    openSheet(`<div class="unlock">
      <p class="muted" style="margin:0">🎉 ${count > 1 ? count + ' nouveaux mofusand débloqués !' : 'Nouveau mofusand débloqué !'}</p>
      ${catImg(cat, 200, 'pop')}
      <h2>${esc(cat.name)}</h2>
      <span class="rarity-tag" style="background:${rar.color}">${rar.label}</span>
      ${rankUp ? `<p><b>Nouveau rang : ${esc(rankUp)}</b></p>` : ''}
      <p class="muted">« ${esc(cat.quote)} »</p>
      <button class="btn primary full" id="catOk">Yeaaah ! 🦈</button>
    </div>`);
    $('catOk').onclick = () => { closeSheet(); render(); };
  }

  // ---------- Profil ----------
  function renderProfile() {
    const p = state.profile;
    $('pSex').value = p.sex;
    $('pAge').value = p.age || '';
    $('pHeight').value = p.height || '';
    $('pWeight').value = p.weight || '';
    $('pTarget').value = p.targetWeight || '';
    $('pSteps').value = p.stepGoal || '';
    $('pActivity').value = String(p.activity);
    $('pTheme').innerHTML = `<option value="auto">🎨 Change chaque semaine (cette semaine : ${weeklyTheme().name})</option>` +
      THEMES.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
    $('pTheme').value = p.theme || 'auto';
    $('pApiKey').value = getApiKey();

    const b = bmr(todayKey());
    const w = latestWeight();
    if (!b) {
      $('bmrCard').innerHTML = '<h2>🔥 Mon métabolisme</h2><p class="muted">Remplis âge, taille et poids pour voir ton BMR.</p>';
    } else {
      const tdee = b * p.activity;
      const bmi = w / Math.pow(p.height / 100, 2);
      const bmiTxt = bmi < 18.5 ? 'maigreur' : bmi < 25 ? 'normal' : bmi < 30 ? 'surpoids' : 'obésité';
      const g = weekGoal(todayKey());
      $('bmrCard').innerHTML = `<h2>🔥 Mon métabolisme</h2>
        <div class="stats-grid">
          <div class="stat"><b>${fmt(b)}</b><span>BMR / jour</span></div>
          <div class="stat"><b>${fmt(tdee)}</b><span>Dépense / jour</span></div>
          <div class="stat"><b>${g ? fmt(g) : '—'}</b><span>Objectif semaine</span></div>
        </div>
        <p class="small muted" style="margin-bottom:0">BMR = calories brûlées au repos (Mifflin-St Jeor, poids le plus récent : ${fmt1(w)} kg). IMC ${fmt1(bmi)} (${bmiTxt}). Ton objectif de calories, c'est toi qui le fixes chaque semaine depuis l'accueil.</p>`;
    }
  }
  function saveProfile() {
    const p = state.profile;
    p.sex = $('pSex').value;
    p.age = num($('pAge').value);
    p.height = num($('pHeight').value);
    p.weight = num($('pWeight').value);
    p.targetWeight = num($('pTarget').value);
    p.stepGoal = num($('pSteps').value) || 8000;
    p.activity = Number($('pActivity').value);
    p.theme = $('pTheme').value;
    save(); toast('✅ Profil enregistré'); render(); checkUnlocks();
  }

  // ---------- Sauvegarde ----------
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mofutrack-${todayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importData(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!s || typeof s !== 'object' || !s.days) throw new Error('bad');
        if (!confirm('Remplacer toutes tes données actuelles par cette sauvegarde ?')) return;
        const d = defaultState();
        state = { ...d, ...s, profile: { ...d.profile, ...(s.profile || {}) } };
        save(); toast('✅ Sauvegarde restaurée'); render();
      } catch (e) { toast('😿 Fichier invalide'); }
    };
    r.readAsText(file);
  }

  // ---------- Sheet ----------
  function openSheet(html) {
    $('sheet').innerHTML = '<div class="grab"></div>' + html;
    $('sheetBackdrop').hidden = false;
  }
  function closeSheet() { $('sheetBackdrop').hidden = true; $('sheet').innerHTML = ''; }

  // ---------- Événements ----------
  function bind() {
    document.addEventListener('click', (ev) => {
      const g = ev.target.closest('[data-goto]');
      if (g) { go(g.dataset.goto); return; }
      const df = ev.target.closest('[data-del-food]');
      if (df) {
        const d = day(currentDay);
        d.foods = d.foods.filter((f) => f.id !== df.dataset.delFood);
        save(); render(); return;
      }
      const ad = ev.target.closest('[data-ai-del]');
      if (ad) { aiItems.splice(Number(ad.dataset.aiDel), 1); renderAiResult(''); return; }
      const dn = ev.target.closest('[data-del-note]');
      if (dn) {
        if (!confirm('Supprimer cette note ?')) return;
        state.notes = state.notes.filter((n) => n.id !== dn.dataset.delNote);
        save(); render(); return;
      }
      const en = ev.target.closest('[data-edit-note]');
      if (en) {
        const n = state.notes.find((x) => x.id === en.dataset.editNote);
        if (!n) return;
        editingNoteId = n.id;
        $('noteText').value = n.text;
        $('btnCancelNote').hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        $('noteText').focus();
        return;
      }
      const fc = ev.target.closest('[data-food]');
      if (fc) { const f = foodById(fc.dataset.food); if (f) openFoodSheet(f); return; }
      const cc = ev.target.closest('[data-cat-idx]');
      if (cc) { showCat(Number(cc.dataset.catIdx)); return; }
    });
    document.addEventListener('input', (ev) => {
      if (ev.target.matches('[data-ai-idx]')) {
        aiItems[Number(ev.target.dataset.aiIdx)].kcal = Math.max(0, Math.round(num(ev.target.value) || 0));
        $('aiTotal').textContent = fmt(aiItems.reduce((s, i) => s + i.kcal, 0));
      }
    });

    $('btnProfile').onclick = () => go('profile');
    $('prevDay').onclick = () => { currentDay = addDays(currentDay, -1); render(); };
    $('nextDay').onclick = () => { if (currentDay < todayKey()) { currentDay = addDays(currentDay, 1); render(); } };
    $('dateLabel').onclick = () => { currentDay = todayKey(); render(); };
    $('btnWeekGoal').onclick = openWeekGoal;
    $('btnHomeWeight').onclick = () => saveWeight(currentDay, $('homeWeight').value);
    $('btnHomeSteps').onclick = saveSteps;
    $('btnPasteSteps').onclick = pasteSteps;

    $('btnAi').onclick = runAi;
    $('foodSearch').addEventListener('input', renderFoodResults);
    $('btnQuickKcal').onclick = openQuickKcal;
    $('btnCustomFood').onclick = openCustomFood;

    $('prevWeek').onclick = () => { chartWeek = addDays(chartWeek, -7); renderCharts(); };
    $('nextWeek').onclick = () => { if (chartWeek < mondayOf(todayKey())) { chartWeek = addDays(chartWeek, 7); renderCharts(); } };
    $('chartRange').onclick = (ev) => { const b = ev.target.closest('[data-r]'); if (b) { chartRange = Number(b.dataset.r); renderCharts(); } };
    $('seriesToggle').onclick = (ev) => {
      const b = ev.target.closest('[data-s]');
      if (!b) return;
      seriesOn[b.dataset.s] = !seriesOn[b.dataset.s];
      if (!Object.values(seriesOn).some(Boolean)) seriesOn[b.dataset.s] = true;
      renderCharts();
    };

    $('btnSaveNote').onclick = saveNote;
    $('btnCancelNote').onclick = () => { editingNoteId = null; $('noteText').value = ''; $('btnCancelNote').hidden = true; };
    $('noteSearch').addEventListener('input', renderNotes);

    $('btnSaveProfile').onclick = saveProfile;
    $('pTheme').onchange = () => { state.profile.theme = $('pTheme').value; save(); applyTheme(); };
    $('btnSaveKey').onclick = () => {
      const k = $('pApiKey').value.trim();
      try { if (k) localStorage.setItem(KEY_STORE, k); else localStorage.removeItem(KEY_STORE); } catch (e) { /* stockage indisponible */ }
      toast(k ? '🤖 Clé Claude enregistrée sur ce téléphone' : 'Clé supprimée');
    };
    $('btnExport').onclick = exportData;
    $('fileImport').onchange = (ev) => { if (ev.target.files[0]) importData(ev.target.files[0]); ev.target.value = ''; };
    $('btnReset').onclick = () => {
      if (!confirm('Effacer TOUTES tes données (repas, poids, notes, rangs) ?')) return;
      if (!confirm('Vraiment sûr(e) ? Pense à exporter avant.')) return;
      state = defaultState(); save(); currentDay = todayKey(); go('home');
    };

    $('sheetBackdrop').addEventListener('click', (ev) => { if (ev.target === $('sheetBackdrop')) closeSheet(); });

    // Changement de jour quand l'app revient au premier plan
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const t = todayKey();
        if (currentDay > t || (lastSeenToday !== t && currentDay === lastSeenToday)) currentDay = t;
        lastSeenToday = t;
        render();
      }
    });
  }
  let lastSeenToday = todayKey();

  // Import via lien : ?pas=1234&kcal=300 (&date=AAAA-MM-JJ)
  function handleUrlImport() {
    const params = new URLSearchParams(location.search);
    let txt = params.get('import') || '';
    ['pas', 'steps', 'kcal', 'date'].forEach((key) => { if (params.has(key)) txt += `;${key}=${params.get(key)}`; });
    if (txt) {
      applyImport(parseImport(txt));
      history.replaceState(null, '', location.pathname);
    }
  }

  // ---------- Démarrage ----------
  bind();
  render();
  handleUrlImport();
  checkUnlocks();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
