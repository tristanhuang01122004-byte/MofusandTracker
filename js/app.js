/* MofuTrack — calories, pas, poids, notes & chats à débloquer */
(() => {
  'use strict';

  const STORE_KEY = 'mofutrack_v1';
  const MEALS = [
    { id: 'pdj', label: 'Petit-déj', emoji: '🥐' },
    { id: 'dej', label: 'Déjeuner', emoji: '🍱' },
    { id: 'gouter', label: 'Snack', emoji: '🍪' },
    { id: 'diner', label: 'Dîner', emoji: '🍜' },
  ];

  // ---------- État ----------
  const defaultState = () => ({
    profile: { sex: 'h', age: null, height: null, weight: null, targetWeight: null, activity: 1.375, goal: -500, stepGoal: 8000, addSteps: false },
    days: {},
    weights: {},
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
  let foodCat = 'all';
  let weightRange = 30;
  let editingNoteId = null;

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

  // ---------- Dates ----------
  function keyOf(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function todayKey() { return keyOf(new Date()); }
  function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
  function fmtDay(k, opts) {
    return parseKey(k).toLocaleDateString('fr-FR', opts || { weekday: 'long', day: 'numeric', month: 'long' });
  }
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
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');
  const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
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

  // ---------- Calculs santé ----------
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
  function stepsKcal(steps, k) {
    const w = latestWeight(k) || 70;
    return Math.round((steps || 0) * 0.04 * (w / 70));
  }
  function activeKcal(k) {
    const d = peekDay(k);
    if (d.active) return d.active;
    return stepsKcal(d.steps, k);
  }
  function target(k) {
    const b = bmr(k);
    if (!b) return null;
    const p = state.profile;
    if (p.addSteps) return Math.round(b * 1.2 + Number(p.goal) + activeKcal(k));
    return Math.round(b * Number(p.activity) + Number(p.goal));
  }

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
        const t = target(k);
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
    renderTop();
    if (currentView === 'home') renderHome();
    if (currentView === 'food') renderFood();
    if (currentView === 'weight') renderWeight();
    if (currentView === 'notes') renderNotes();
    if (currentView === 'ranks') renderRanks();
    if (currentView === 'profile') renderProfile();
  }

  function renderTop() {
    const info = rankInfo();
    $('topCat').innerHTML = catImg(info.companion, 44);
    $('topRank').textContent = `Rang ${info.idx + 1} · ${info.rank.rank}`;
  }

  // ---------- Accueil ----------
  function renderHome() {
    const k = currentDay;
    const d = peekDay(k);
    $('dateLabel').textContent = dayLabel(k);
    $('nextDay').style.visibility = k >= todayKey() ? 'hidden' : 'visible';

    const e = eaten(k);
    const t = target(k);
    const b = bmr(k);
    $('kcalEaten').textContent = fmt(e);
    $('kcalTarget').textContent = t ? fmt(t) + ' kcal' : '—';
    $('kcalBmr').textContent = b ? fmt(b) + ' kcal' : '—';
    const left = t ? t - e : null;
    $('kcalLeft').textContent = left == null ? '—' : (left >= 0 ? fmt(left) + ' kcal' : '+' + fmt(-left) + ' kcal');
    $('kcalLeft').style.color = left != null && left < 0 ? 'var(--danger)' : '';
    $('profileHint').hidden = !!t;

    const C = 2 * Math.PI * 52;
    const ratio = t ? Math.min(e / t, 1) : 0;
    const ring = $('ringFg');
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C * (1 - ratio);
    ring.style.stroke = t && e > t * 1.05 ? 'var(--danger)' : t && e >= t * 0.9 ? 'var(--ok)' : 'var(--shark-2)';

    // Pas
    const goal = state.profile.stepGoal || 8000;
    $('stepsVal').textContent = fmt(d.steps || 0);
    $('stepsGoal').textContent = fmt(goal);
    $('stepsBar').style.width = Math.min(100, ((d.steps || 0) / goal) * 100) + '%';
    const ak = activeKcal(k);
    $('stepsKcal').textContent = d.steps || d.active
      ? `≈ ${fmt(ak)} kcal brûlées en activité${d.active ? ' (Santé)' : ' (estimation)'}${state.profile.addSteps ? ' · ajoutées à ton budget' : ''}`
      : 'Aucun pas importé pour ce jour.';

    // Poids
    const w = state.weights[k];
    $('homeWeight').value = w != null ? w : '';
    const prevKeys = Object.keys(state.weights).filter((x) => x < k).sort();
    if (w != null && prevKeys.length) {
      const diff = w - state.weights[prevKeys[prevKeys.length - 1]];
      $('weightDelta').innerHTML = `<span class="${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg</span> vs dernière pesée`;
    } else {
      $('weightDelta').textContent = w != null ? '✅ pesé(e)' : '';
    }

    // Journal
    const log = $('mealLog');
    if (!d.foods.length) {
      log.innerHTML = '<div class="empty">Rien de noté pour l\'instant 🐟<br>Touche « + Ajouter » pour chercher un aliment.</div>';
    } else {
      log.innerHTML = MEALS.map((m) => {
        const items = d.foods.filter((f) => f.meal === m.id);
        if (!items.length) return '';
        const sum = items.reduce((s, f) => s + f.kcal, 0);
        return `<div class="meal"><div class="meal-title"><span>${m.emoji} ${m.label}</span><span>${fmt(sum)} kcal</span></div>
          ${items.map((f) => `<div class="meal-item"><span class="name">${esc(f.name)} <span class="muted small">· ${esc(f.qty)}</span></span>
            <span class="kc">${fmt(f.kcal)}</span><button class="del" data-del-food="${f.id}" aria-label="Supprimer">×</button></div>`).join('')}
        </div>`;
      }).join('');
    }

    // Chat
    const info = rankInfo();
    $('homeCat').innerHTML = catImg(info.companion, 84);
    $('catBubble').textContent = catMessage(k, e, t, d, goal, info);

    renderWeekChart();
  }

  function catMessage(k, e, t, d, goal, info) {
    const isToday = k === todayKey();
    const h = new Date().getHours();
    if (!state.profile.age) return 'Coucou ! Commence par remplir ton profil ⚙️ pour que je calcule ton objectif 🦈';
    if (isToday && state.weights[k] == null && h < 12) return 'Bonjour ! N\'oublie pas ta pesée du matin, ça rapporte +10 XP ⚖️';
    if (!d.foods.length) return isToday ? 'Qu\'est-ce qu\'on mange aujourd\'hui ? Note ton premier repas 🍙' : 'Pas de repas noté ce jour-là.';
    if (t && e > t * 1.1) return `Oups, +${fmt(e - t)} kcal… pas grave, demain on marche un peu plus ! 🐾`;
    if (d.steps >= goal) return `${fmt(d.steps)} pas ! Tu es une vraie machine 🦈💨`;
    if (t && Math.abs(e - t) <= t * 0.1) return 'Pile dans ton objectif, bravo ! +15 XP 🎯';
    if (info.nextCat && parseKey(k).getDate() % 2) return `Encore ${fmt(info.nextCat.xp - info.best)} XP pour débloquer un nouveau mofusand 👀`;
    return info.companion.quote;
  }

  function renderWeekChart() {
    const keys = [];
    for (let i = 6; i >= 0; i--) keys.push(addDays(currentDay, -i));
    const vals = keys.map(eaten);
    const tgts = keys.map(target);
    const max = Math.max(1, ...vals, ...tgts.filter(Boolean)) * 1.15;
    const W = 320, H = 150, pb = 22, pt = 14, bw = 26;
    const x = (i) => 20 + i * ((W - 40) / 6);
    const y = (v) => H - pb - (v / max) * (H - pb - pt);
    let svg = '';
    keys.forEach((k, i) => {
      const v = vals[i], t = tgts[i];
      const over = t && v > t * 1.05;
      const col = !v ? '#e3eef7' : over ? '#f2a0ab' : '#8ec5ef';
      const top = v ? y(v) : H - pb - 3;
      svg += `<rect x="${x(i) - bw / 2}" y="${top}" width="${bw}" height="${H - pb - top}" rx="7" fill="${col}"/>`;
      if (t) svg += `<line x1="${x(i) - bw / 2 - 3}" x2="${x(i) + bw / 2 + 3}" y1="${y(t)}" y2="${y(t)}" stroke="#34597f" stroke-width="2" stroke-dasharray="3 2"/>`;
      if (v) svg += `<text class="val" x="${x(i)}" y="${top - 4}" text-anchor="middle">${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)}</text>`;
      const lbl = parseKey(k).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
      svg += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" ${k === currentDay ? 'class="val"' : ''}>${lbl}</text>`;
    });
    const avgVals = vals.filter(Boolean);
    const avg = avgVals.length ? avgVals.reduce((a, b) => a + b, 0) / avgVals.length : 0;
    $('weekChart').innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}">${svg}</svg>
      <p class="muted small">Moyenne : <b>${fmt(avg)} kcal/jour</b> ${tgts[6] ? '· pointillés = objectif' : ''}</p>`;
  }

  // ---------- Aliments ----------
  function allFoods() {
    const base = FOODS.map((f, i) => ({ id: 'b' + i, n: f[0], c: f[1], p: f[2], g: f[3], k: f[4] }));
    const cust = state.custom.map((f) => ({ ...f, c: 'perso' }));
    return cust.concat(base);
  }
  function foodById(id) { return allFoods().find((f) => f.id === id); }

  function renderFood() {
    const chips = [['all', '✨ Tout'], ['recent', '🕘 Récents'], ...Object.entries(FOOD_CATEGORIES).map(([id, c]) => [id, `${c.emoji} ${c.label}`])];
    $('catChips').innerHTML = chips.map(([id, l]) => `<button class="chip ${foodCat === id ? 'on' : ''}" data-cat="${id}">${l}</button>`).join('');
    $('foodDayInfo').textContent = `Ajout sur : ${dayLabel(currentDay)} · ${fmt(eaten(currentDay))} kcal notées`;
    renderFoodResults();
  }

  function renderFoodResults() {
    const q = norm($('foodSearch').value.trim());
    let list = allFoods();
    if (foodCat === 'recent' && !q) {
      list = state.recent.map(foodById).filter(Boolean);
    } else if (foodCat !== 'all' && foodCat !== 'recent') {
      list = list.filter((f) => f.c === foodCat);
    }
    if (q) {
      const words = q.split(/\s+/);
      list = list
        .map((f) => {
          const n = norm(f.n);
          const cat = norm(FOOD_CATEGORIES[f.c] ? FOOD_CATEGORIES[f.c].label : '');
          if (!words.every((w) => n.includes(w) || cat.includes(w))) return null;
          const score = (n.startsWith(q) ? 0 : n.includes(q) ? 1 : 2) + (state.recent.includes(f.id) ? -0.5 : 0);
          return { f, score };
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score)
        .map((x) => x.f);
    }
    const out = list.slice(0, 120);
    if (!out.length) {
      $('foodResults').innerHTML = `<li class="empty" style="justify-content:center;cursor:default">Aucun résultat 🐟 — crée-le avec « ⭐ Créer un aliment »</li>`;
      return;
    }
    $('foodResults').innerHTML = out.map((f) => {
      const cat = FOOD_CATEGORIES[f.c] || FOOD_CATEGORIES.perso;
      const per100 = f.g ? Math.round((f.k / f.g) * 100) : null;
      return `<li data-food="${f.id}">
        <div class="food-emoji">${cat.emoji}</div>
        <div class="food-info"><div class="food-name">${esc(f.n)}</div><div class="food-sub">${esc(f.p)}${f.g ? ` · ${f.g} ${f.c === 'boissons' ? 'ml' : 'g'}` : ''}</div></div>
        <div class="food-kcal">${fmt(f.k)} kcal${per100 != null && f.p !== '100 g' ? `<small>${per100}/100${f.c === 'boissons' ? 'ml' : 'g'}</small>` : ''}</div>
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
    const calc = () => {
      const q = num(qVal.value) || 0;
      return mode === 'portion' ? f.k * q : (f.k / f.g) * q;
    };
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
      const kcal = Math.round(calc());
      if (q <= 0) return toast('Quantité invalide');
      const qty = mode === 'portion' ? (q === 1 ? f.p : `${String(q).replace('.', ',')} × ${f.p}`) : `${q} ${unit}`;
      day(currentDay).foods.push({ id: uid(), name: f.n, kcal, qty, meal: pickedMeal(), ref: f.id });
      state.recent = [f.id, ...state.recent.filter((x) => x !== f.id)].slice(0, 30);
      save();
      closeSheet();
      toast(`✅ ${f.n} ajouté (${fmt(kcal)} kcal)`);
      render();
      checkUnlocks();
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
    $('qkKcal').focus();
    $('qkAdd').onclick = () => {
      const k = num($('qkKcal').value);
      if (!k || k <= 0) return toast('Entre un nombre de calories');
      day(currentDay).foods.push({ id: uid(), name: $('qkName').value.trim() || 'Ajout rapide', kcal: Math.round(k), qty: 'saisie', meal: pickedMeal() });
      save(); closeSheet(); toast('✅ Ajouté'); render(); checkUnlocks();
    };
  }

  function openCustomFood() {
    openSheet(`
      <h2>⭐ Créer un aliment</h2>
      <p class="muted small">Il sera enregistré dans « Mes aliments » et trouvable dans la recherche.</p>
      <div class="form-grid" style="margin-top:10px">
        <label class="full">Nom<input id="cfName" placeholder="ex : Bol riz poulet de maman"></label>
        <label>Portion<input id="cfPortion" placeholder="1 bol"></label>
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
      save(); closeSheet(); toast('⭐ Aliment créé'); foodCat = 'perso'; render();
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
    render();
    checkUnlocks();
    return true;
  }
  async function pasteSteps() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) throw new Error('no clipboard');
      const txt = await navigator.clipboard.readText();
      if (applyImport(parseImport(txt))) return;
    } catch (e) { /* on passe au collage manuel */ }
    openPasteSheet();
  }
  function openPasteSheet() {
    openSheet(`
      <h2>📋 Coller mes pas</h2>
      <p class="muted small">Maintiens le doigt dans la case → <b>Coller</b> le texte copié par ton raccourci (ex : <code>pas=10432;kcal=385</code>).</p>
      <textarea id="pasteBox" rows="3" style="margin-top:10px"></textarea>
      <button class="btn primary full" id="pasteOk">Importer</button>
    `);
    $('pasteOk').onclick = () => { if (applyImport(parseImport($('pasteBox').value))) closeSheet(); };
  }
  function openManualSteps() {
    const d = peekDay(currentDay);
    openSheet(`
      <h2>✏️ Pas du ${esc(dayLabel(currentDay).toLowerCase())}</h2>
      <div class="form-grid" style="margin-top:10px">
        <label class="full">Nombre de pas<input type="number" inputmode="numeric" id="msSteps" value="${d.steps || ''}"></label>
        <label class="full">Énergie active (kcal, optionnel)<input type="number" inputmode="numeric" id="msKcal" value="${d.active || ''}" placeholder="sinon estimée"></label>
      </div>
      <button class="btn primary full" id="msSave">Enregistrer</button>
    `);
    $('msSave').onclick = () => {
      const dd = day(currentDay);
      dd.steps = num($('msSteps').value);
      dd.active = num($('msKcal').value);
      save(); closeSheet(); toast('👣 Pas enregistrés'); render(); checkUnlocks();
    };
  }

  // ---------- Poids ----------
  function saveWeight(k, v) {
    const w = num(v);
    if (!w || w < 20 || w > 400) { toast('Poids invalide'); return; }
    state.weights[k] = Math.round(w * 10) / 10;
    if (!state.profile.weight) state.profile.weight = state.weights[k];
    save();
    toast(`⚖️ ${state.weights[k].toString().replace('.', ',')} kg enregistré`);
    render();
    checkUnlocks();
  }

  function renderWeight() {
    if (!$('wDate').value) $('wDate').value = todayKey();
    $('wDate').max = todayKey();
    const wk = $('wDate').value;
    $('wValue').value = state.weights[wk] != null ? state.weights[wk] : '';

    const keys = Object.keys(state.weights).sort();
    const p = state.profile;
    const start = p.weight || (keys.length ? state.weights[keys[0]] : null);
    const cur = keys.length ? state.weights[keys[keys.length - 1]] : null;
    const diff = start && cur ? cur - start : null;
    const bmi = cur && p.height ? cur / Math.pow(p.height / 100, 2) : null;
    const left = cur && p.targetWeight ? cur - p.targetWeight : null;
    const stat = (v, l, cls) => `<div class="stat"><b class="${cls || ''}">${v}</b><span>${l}</span></div>`;
    $('weightStats').innerHTML =
      stat(start ? start.toFixed(1) : '—', 'Départ (kg)') +
      stat(cur ? cur.toFixed(1) : '—', 'Actuel (kg)') +
      stat(diff != null ? (diff > 0 ? '+' : '') + diff.toFixed(1) : '—', 'Variation', diff > 0 ? 'up' : diff < 0 ? 'down' : '') +
      stat(bmi ? bmi.toFixed(1) : '—', 'IMC') +
      stat(p.targetWeight ? p.targetWeight.toFixed(1) : '—', 'Objectif (kg)') +
      stat(left != null ? (Math.abs(left) < 0.05 ? '🎉' : Math.abs(left).toFixed(1)) : '—', left != null && left < 0 ? 'kg au-dessus… à prendre' : 'kg restants');

    document.querySelectorAll('#wRange button').forEach((b) => b.classList.toggle('on', Number(b.dataset.r) === weightRange));
    renderWeightChart(keys);

    $('weightList').innerHTML = keys.length
      ? keys.slice().reverse().slice(0, 60).map((k, i, arr) => {
        const prev = arr[i + 1];
        const d = prev ? state.weights[k] - state.weights[prev] : null;
        return `<li><span>${esc(fmtDay(k, { weekday: 'short', day: 'numeric', month: 'short' }))}</span>
          <span><b>${state.weights[k].toFixed(1)} kg</b> ${d != null ? `<small class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d.toFixed(1)}</small>` : ''}</span>
          <button class="del" data-del-weight="${k}" aria-label="Supprimer">×</button></li>`;
      }).join('')
      : '<li class="empty" style="justify-content:center">Aucune pesée pour l\'instant</li>';
  }

  function renderWeightChart(allKeys) {
    let keys = allKeys;
    if (weightRange) {
      const from = addDays(todayKey(), -weightRange);
      keys = keys.filter((k) => k >= from);
    }
    if (keys.length < 2) {
      $('weightChart').innerHTML = '<div class="empty">Pèse-toi au moins 2 jours pour voir la courbe 📉</div>';
      return;
    }
    const W = 320, H = 170, pl = 30, pr = 10, pt = 12, pb = 22;
    const vals = keys.map((k) => state.weights[k]);
    const tw = state.profile.targetWeight;
    let min = Math.min(...vals), max = Math.max(...vals);
    if (tw && tw > min - 3 && tw < max + 3) { min = Math.min(min, tw); max = Math.max(max, tw); }
    const pad = Math.max(0.5, (max - min) * 0.15);
    min -= pad; max += pad;
    const t0 = parseKey(keys[0]).getTime(), t1 = parseKey(keys[keys.length - 1]).getTime();
    const x = (k) => pl + ((parseKey(k).getTime() - t0) / Math.max(1, t1 - t0)) * (W - pl - pr);
    const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
    let svg = '';
    for (let i = 0; i <= 3; i++) {
      const v = min + ((max - min) * i) / 3;
      svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#e3eef7"/><text x="${pl - 4}" y="${y(v) + 3}" text-anchor="end">${v.toFixed(1)}</text>`;
    }
    if (tw && tw >= min && tw <= max) {
      svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(tw)}" y2="${y(tw)}" stroke="#6cc59a" stroke-width="1.5" stroke-dasharray="4 3"/><text x="${W - pr}" y="${y(tw) - 3}" text-anchor="end" style="fill:#4a9f77">objectif</text>`;
    }
    const pts = keys.map((k) => `${x(k).toFixed(1)},${y(state.weights[k]).toFixed(1)}`);
    svg += `<polyline points="${pl},${H - pb} ${pts.join(' ')} ${x(keys[keys.length - 1]).toFixed(1)},${H - pb}" fill="rgba(142,197,239,.25)" stroke="none"/>`;
    svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="#6aaee3" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (keys.length <= 45) svg += keys.map((k) => `<circle cx="${x(k)}" cy="${y(state.weights[k])}" r="3" fill="#fff" stroke="#34597f" stroke-width="1.5"/>`).join('');
    const f = (k) => parseKey(k).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    svg += `<text x="${pl}" y="${H - 5}">${f(keys[0])}</text><text x="${W - pr}" y="${H - 5}" text-anchor="end">${f(keys[keys.length - 1])}</text>`;
    $('weightChart').innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}">${svg}</svg>`;
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
    } else {
      state.notes.push({ id: uid(), t: Date.now(), text });
    }
    editingNoteId = null;
    $('noteText').value = '';
    $('btnCancelNote').hidden = true;
    save(); toast('📝 Note enregistrée'); render(); checkUnlocks();
  }

  // ---------- Rangs ----------
  function renderRanks() {
    const info = rankInfo();
    const c = info.companion;
    $('rankCat').innerHTML = catImg(c, 170);
    $('rankName').textContent = `Rang ${info.idx + 1} · ${info.rank.rank}`;
    $('rankCatName').innerHTML = `${esc(c.name)} <span class="rarity-tag" style="background:${RARITIES[c.rarity].color}">${RARITIES[c.rarity].label}</span>`;
    const nextRank = RANKS[info.idx + 1];
    if (nextRank) {
      const pct = ((info.best - info.rank.xp) / (nextRank.xp - info.rank.xp)) * 100;
      $('xpBar').style.width = Math.min(100, pct) + '%';
      $('xpText').textContent = `${fmt(info.best)} XP · encore ${fmt(nextRank.xp - info.best)} XP pour « ${nextRank.rank} »` +
        (info.nextCat ? ` · prochain mofusand à ${fmt(info.nextCat.xp)} XP` : '');
    } else {
      $('xpBar').style.width = '100%';
      $('xpText').textContent = `${fmt(info.best)} XP · rang maximum atteint ! 👑`;
    }
    $('collectionCount').textContent = `${info.unlocked.length} / ${CATS.length}`;
    $('collection').innerHTML = CATS.map((cat) => {
      const unlocked = info.best >= cat.xp;
      const rar = RARITIES[cat.rarity];
      return `<div class="cat-card ${unlocked ? '' : 'locked'} ${cat.id === c.id ? 'current' : ''}" data-cat-idx="${cat.id}" style="border-color:${unlocked ? rar.color : 'transparent'}">
        ${catImg(cat, 76)}
        <div class="cn">${unlocked ? esc(cat.name) : '???'}</div>
        <div class="rar" style="color:${rar.color}">${unlocked ? rar.label : fmt(cat.xp) + ' XP'}</div>
      </div>`;
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
    $('pGoal').value = String(p.goal);
    $('pAddSteps').checked = !!p.addSteps;
    $('pActivity').disabled = !!p.addSteps;

    const b = bmr(todayKey());
    const w = latestWeight();
    if (!b) {
      $('bmrCard').innerHTML = '<h2>🔥 Mon métabolisme</h2><p class="muted">Remplis âge, taille et poids pour voir ton BMR.</p>';
    } else {
      const tdee = p.addSteps ? b * 1.2 : b * p.activity;
      const bmi = w / Math.pow(p.height / 100, 2);
      const bmiTxt = bmi < 18.5 ? 'maigreur' : bmi < 25 ? 'normal' : bmi < 30 ? 'surpoids' : 'obésité';
      $('bmrCard').innerHTML = `<h2>🔥 Mon métabolisme</h2>
        <div class="stats-grid">
          <div class="stat"><b>${fmt(b)}</b><span>BMR (kcal)</span></div>
          <div class="stat"><b>${fmt(tdee)}</b><span>Dépense ${p.addSteps ? 'de base' : 'totale'}</span></div>
          <div class="stat"><b>${fmt(target(todayKey()))}</b><span>Objectif / jour</span></div>
        </div>
        <p class="small muted" style="margin-bottom:0">BMR = calories brûlées au repos (formule Mifflin-St Jeor, avec ton poids le plus récent : ${w.toFixed(1)} kg). IMC ${bmi.toFixed(1)} (${bmiTxt}).
        ${p.addSteps ? 'Ton objectif de chaque jour augmente avec les calories de tes pas.' : ''}</p>`;
    }
    $('urlExample').textContent = `${location.origin}${location.pathname}?pas=VARIABLE&kcal=VARIABLE`;
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
    p.goal = Number($('pGoal').value);
    p.addSteps = $('pAddSteps').checked;
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
      const dw = ev.target.closest('[data-del-weight]');
      if (dw) {
        if (!confirm('Supprimer cette pesée ?')) return;
        delete state.weights[dw.dataset.delWeight];
        save(); render(); return;
      }
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
      const ch = ev.target.closest('[data-cat]');
      if (ch) { foodCat = ch.dataset.cat; renderFood(); return; }
      const cc = ev.target.closest('[data-cat-idx]');
      if (cc) { showCat(Number(cc.dataset.catIdx)); return; }
    });

    $('btnProfile').onclick = () => go('profile');
    $('prevDay').onclick = () => { currentDay = addDays(currentDay, -1); render(); };
    $('nextDay').onclick = () => { if (currentDay < todayKey()) { currentDay = addDays(currentDay, 1); render(); } };
    $('dateLabel').onclick = () => { currentDay = todayKey(); render(); };
    $('openGuide').onclick = () => { go('profile'); setTimeout(() => $('guide').scrollIntoView({ behavior: 'smooth' }), 50); };
    $('btnPasteSteps').onclick = pasteSteps;
    $('btnManualSteps').onclick = openManualSteps;
    $('btnHomeWeight').onclick = () => saveWeight(currentDay, $('homeWeight').value);

    $('foodSearch').addEventListener('input', renderFoodResults);
    $('btnQuickKcal').onclick = openQuickKcal;
    $('btnCustomFood').onclick = openCustomFood;

    $('wDate').onchange = renderWeight;
    $('btnSaveWeight').onclick = () => saveWeight($('wDate').value || todayKey(), $('wValue').value);
    $('wRange').onclick = (ev) => { const b = ev.target.closest('[data-r]'); if (b) { weightRange = Number(b.dataset.r); renderWeight(); } };

    $('btnSaveNote').onclick = saveNote;
    $('btnCancelNote').onclick = () => { editingNoteId = null; $('noteText').value = ''; $('btnCancelNote').hidden = true; };
    $('noteSearch').addEventListener('input', renderNotes);

    $('btnSaveProfile').onclick = saveProfile;
    $('pAddSteps').onchange = () => { $('pActivity').disabled = $('pAddSteps').checked; };
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

  // Import via lien : ?pas=1234&kcal=300 (&date=AAAA-MM-JJ) ou ?import=pas=1234;kcal=300
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
