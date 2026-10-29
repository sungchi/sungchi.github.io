(() => {
  'use strict';

  const MAX_AGE_MS = 36 * 60 * 60 * 1000;
  const DAY_MS = 86400000;
  const PERIODS = new Set(['1', '7', '30']);
  const SORTS = new Set(['rate', 'amount']);
  const config = window.COUPANG_CONFIG || {};
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const results = $('#results');
  const dialog = $('#product-dialog');
  const nf = new Intl.NumberFormat('ko-KR');
  const shortTime = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const fullTime = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const state = { filters: readFilters(), data: null, items: [], controller: null, requestId: 0, lastFocus: null, selectedId: null, busy: false, expiryTimer: null };

  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }

  function svgNode(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
    return el;
  }

  function icon(kind, className = '') {
    const svg = svgNode('svg', { viewBox: '0 0 96 88', fill: 'none', 'aria-hidden': 'true' });
    if (className) svg.setAttribute('class', className);
    svg.append(svgNode('ellipse', { cx: 48, cy: 76, rx: 33, ry: 7, fill: '#edf2e6' }));
    if (kind === 'error') {
      svg.append(svgNode('rect', { x: 20, y: 13, width: 56, height: 57, rx: 12, fill: '#fcf3e5', stroke: '#e5cfb3' }));
      svg.append(svgNode('path', { d: 'M48 29v16m0 9v1', stroke: 'currentColor', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    } else {
      svg.append(svgNode('rect', { x: 21, y: 12, width: 53, height: 58, rx: 9, fill: '#f0f5e7', stroke: '#c3d4b1', transform: 'rotate(-8 47 41)' }));
      svg.append(svgNode('rect', { x: 23, y: 17, width: 53, height: 58, rx: 9, fill: '#fff', stroke: '#a5bd8f', transform: 'rotate(5 49 46)' }));
      svg.append(svgNode('path', { d: 'M36 17v10m26-8v10M33 36h32', stroke: '#99b087', 'stroke-width': 2, 'stroke-linecap': 'round' }));
      svg.append(svgNode('path', { d: kind === 'empty' ? 'M38 53h20' : 'M38 47h8v9h13m0 0-6-6m6 6-6 6', stroke: 'currentColor', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      svg.append(svgNode('path', { d: 'M79 16v8m-4-4h8M13 46v6m-3-3h6', stroke: '#b7ca9e', 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
    }
    return svg;
  }

  function readFilters() {
    const q = new URLSearchParams(location.search);
    const category = q.get('category') || 'all';
    return { period: PERIODS.has(q.get('period')) ? q.get('period') : '1', sort: SORTS.has(q.get('sort')) ? q.get('sort') : 'rate', category: /^[a-zA-Z0-9_-]{1,64}$/.test(category) ? category : 'all' };
  }

  function syncURL(replace = false) {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('period', state.filters.period);
    url.searchParams.set('sort', state.filters.sort);
    if (state.filters.category !== 'all') url.searchParams.set('category', state.filters.category);
    if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }

  function syncControls() {
    document.querySelectorAll('[data-period]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.period === state.filters.period)));
    document.querySelectorAll('[data-sort]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.sort === state.filters.sort)));
    $('#category-select').value = state.filters.category;
    $('#filter-description').textContent = `${state.filters.period}일 전 기록보다 가격이 내려간 상품을 ${state.filters.sort === 'rate' ? '할인율' : '할인 금액'}순으로 보여드려요.`;
  }

  function safeURL(raw, type) {
    if (typeof raw !== 'string' || raw.length > 8192) return null;
    try {
      const url = new URL(raw);
      if (url.username || url.password) return null;
      const host = url.hostname.toLowerCase();
      if (type === 'api') {
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(host);
        return url.protocol === 'https:' || (local && url.protocol === 'http:') ? url : null;
      }
      if (url.protocol !== 'https:' || (url.port && url.port !== '443')) return null;
      const coupang = host === 'coupang.com' || host.endsWith('.coupang.com');
      const allowed = type === 'image' ? coupang || host === 'coupangcdn.com' || host.endsWith('.coupangcdn.com') : coupang || host === 'coupa.ng';
      return allowed ? url : null;
    } catch { return null; }
  }

  function dateNumber(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
  }

  function dateLabel(value, year = false) {
    if (dateNumber(value) === null) return '날짜 확인 필요';
    const [y, m, d] = value.split('-').map(Number);
    return `${year ? `${y}년 ` : ''}${m}월 ${d}일`;
  }

  function timeLabel(value, full = false) {
    const time = typeof value === 'string' ? Date.parse(value) : NaN;
    return Number.isFinite(time) ? (full ? fullTime : shortTime).format(time) : '확인 시각 없음';
  }

  function positive(value) { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0; }
  function won(value) { return `${nf.format(Math.round(value))}원`; }
  function percent(value) { return value < 0.05 ? '0.1% 미만' : `${value.toLocaleString('ko-KR', { maximumFractionDigits: 1, minimumFractionDigits: 0 })}%`; }

  function normaliseItems(items) {
    const seen = new Set();
    const period = Number(state.filters.period);
    const now = Date.now();
    return items.flatMap(item => {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || seen.has(item.id)) return [];
      const d = dateNumber(item.currentDate);
      const b = dateNumber(item.baselineDate);
      const observed = typeof item.observedAt === 'string' ? Date.parse(item.observedAt) : NaN;
      const expires = typeof item.expiresAt === 'string' ? Date.parse(item.expiresAt) : NaN;
      if (Number.isFinite(observed) && new Date(observed + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) !== item.currentDate) return [];
      if (!positive(item.currentPrice) || !positive(item.baselinePrice) || d === null || b === null || d - b !== period * DAY_MS || !Number.isFinite(observed) || !Number.isFinite(expires) || expires < now || observed > now + 300000 || now - observed > MAX_AGE_MS) return [];
      const amount = item.baselinePrice - item.currentPrice;
      if (amount <= 0) return [];
      const categoryIds = Array.isArray(item.categoryIds) ? item.categoryIds.filter(id => typeof id === 'string') : [];
      if (state.filters.category !== 'all' && !categoryIds.includes(state.filters.category)) return [];
      seen.add(item.id);
      return [{ ...item, title: typeof item.title === 'string' && item.title.trim() ? item.title.slice(0, 500) : '상품명 확인 필요', categoryIds, dropAmount: amount, dropPercent: amount / item.baselinePrice * 100 }];
    // Preserve the server's canonical order, including exact rate tie-breaking.
    // Floating-point percentages are for display only.
    }).slice(0, 100);
  }

  function announce(message) { $('#results-announcement').textContent = message; }

  function updateCategories(categories) {
    const select = $('#category-select');
    const unique = new Map();
    categories.forEach(category => {
      if (category && typeof category.id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(category.id) && category.id !== 'all' && typeof category.name === 'string') unique.set(category.id, category.name.slice(0, 80));
    });
    select.replaceChildren(new Option('전체 카테고리', 'all'));
    unique.forEach((name, id) => select.add(new Option(name, id)));
    if (state.filters.category !== 'all' && !unique.has(state.filters.category)) {
      state.filters.category = 'all';
      syncURL(true);
      return false;
    }
    select.value = state.filters.category;
    return true;
  }

  function categoryName(item) {
    const categories = state.data?.categories || [];
    return categories.filter(c => item.categoryIds.includes(c.id)).map(c => c.name).slice(0, 2).join(' · ') || '가격 기록';
  }

  function imagePlaceholder() {
    const el = node('span', 'image-placeholder');
    const svg = svgNode('svg', { viewBox: '0 0 48 48', fill: 'none', 'aria-hidden': 'true' });
    svg.append(svgNode('rect', { x: 8, y: 8, width: 32, height: 32, rx: 7, stroke: 'currentColor', 'stroke-width': 1.3 }));
    svg.append(svgNode('path', { d: 'm9 33 10-10 7 7 5-5 8 8', stroke: 'currentColor', 'stroke-width': 1.3, 'stroke-linejoin': 'round' }));
    svg.append(svgNode('circle', { cx: 30, cy: 18, r: 3, stroke: 'currentColor', 'stroke-width': 1.3 }));
    el.append(svg, node('span', '', '상품 이미지'));
    return el;
  }

  function addImage(container, item, lazy = true) {
    const url = safeURL(item.imageUrl, 'image');
    if (!url) { container.append(imagePlaceholder()); return; }
    const img = document.createElement('img');
    img.src = url.href;
    img.alt = item.title;
    img.loading = lazy ? 'lazy' : 'eager';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => img.replaceWith(imagePlaceholder()), { once: true });
    container.append(img);
  }

  function productCard(item, rank) {
    const article = node('article', 'product-card');
    const imageButton = node('button', 'product-image-button');
    imageButton.type = 'button';
    imageButton.setAttribute('aria-label', `${item.title}, 가격 기록 보기`);
    imageButton.append(node('span', `product-rank${rank <= 3 ? ' top-rank' : ''}`, rank));
    addImage(imageButton, item);
    imageButton.addEventListener('click', () => openProduct(item));
    const info = node('div', 'product-info');
    info.append(node('p', 'product-category', categoryName(item)));
    const heading = node('h3', 'product-title');
    const titleButton = node('button', '', item.title);
    titleButton.type = 'button';
    titleButton.addEventListener('click', () => openProduct(item));
    heading.append(titleButton);
    const price = node('p', 'product-price', nf.format(Math.round(item.currentPrice)));
    price.setAttribute('aria-label', `최근 관측가 ${won(item.currentPrice)}`);
    price.append(node('small', '', '원'));
    const drop = node('p', 'drop-values');
    const main = state.filters.sort === 'rate' ? `${percent(item.dropPercent)} 하락` : `${won(item.dropAmount)} 낮음`;
    const secondary = state.filters.sort === 'rate' ? `${won(item.dropAmount)} 낮음` : `${percent(item.dropPercent)} 하락`;
    drop.append(node('strong', '', `↓ ${main}`), node('span', '', secondary));
    const period = node('p', 'compare-period', `${dateLabel(item.baselineDate)} → ${dateLabel(item.currentDate)}`);
    const bottom = node('div', 'product-date');
    const time = node('time', '', `${timeLabel(item.observedAt)} 확인`);
    time.dateTime = item.observedAt;
    const button = node('button', 'record-link', '가격 기록 ↗');
    button.type = 'button';
    button.setAttribute('aria-label', `${item.title} 가격 기록 보기`);
    button.addEventListener('click', () => openProduct(item));
    bottom.append(time, button);
    info.append(heading, price, drop, period, bottom);
    article.append(imageButton, info);
    return article;
  }

  function renderLoading() {
    clearTimeout(state.expiryTimer);
    state.expiryTimer = null;
    results.setAttribute('aria-busy', 'true');
    $('#refresh-button').disabled = true;
    const grid = node('div', 'skeleton-grid');
    grid.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) {
      const card = node('div', 'skeleton-card');
      card.append(node('div', 'skeleton-image'), node('div', 'skeleton-line'), node('div', 'skeleton-line'), node('div', 'skeleton-line short'));
      grid.append(card);
    }
    results.replaceChildren(grid);
    $('#result-count').textContent = '—';
    announce('선택한 조건의 가격 기록을 불러오고 있습니다.');
  }

  function renderEmpty() {
    const status = state.data?.status || {};
    const ready = status.state === 'ready';
    const collecting = status.state === 'collecting';
    const tracked = Number.isSafeInteger(status.trackedProducts) && status.trackedProducts > 0 ? status.trackedProducts : 0;
    const panel = node('div', 'state-panel');
    panel.append(icon(ready ? 'empty' : 'record', 'state-visual'), node('span', 'state-eyebrow', ready ? 'A QUIET MOMENT' : 'GOOD PRICES TAKE A LITTLE HISTORY'));
    panel.append(node('h3', '', ready ? '조건에 맞는 가격 하락이 없어요' : collecting && tracked ? '비교할 가격 기록을 모으고 있어요' : '가격 기록을 준비하고 있어요'));
    panel.append(node('p', '', ready ? `${state.filters.period}일 전 기록과 비교할 수 있고 가격이 내려간 상품이 아직 없어요. 다른 기간이나 카테고리도 살펴보세요.` : '같은 상품의 이전 기록이 쌓이면 가격이 내려간 상품을 여기서 만나볼 수 있어요. 실제로 확인한 가격만 보여드릴게요.'));
    if (tracked) {
      const meta = node('p', 'state-meta');
      meta.append(node('span', 'status-dot'), node('span', '', `${nf.format(tracked)}개 상품의 가격을 기록하고 있어요`));
      panel.append(meta);
    }
    const actions = node('div', 'state-actions');
    if (ready && (state.filters.period !== '1' || state.filters.category !== 'all')) {
      const reset = node('button', 'text-button', '전체 · 1일 전으로 보기');
      reset.type = 'button';
      reset.addEventListener('click', () => setFilters({ period: '1', category: 'all', sort: 'rate' }));
      actions.append(reset);
    }
    const help = node('a', 'text-button', '어떻게 비교하나요? ↗');
    help.href = '#how-it-works';
    actions.append(help);
    panel.append(actions);
    results.replaceChildren(panel);
  }

  function renderError() {
    $('#result-count').textContent = '—';
    $('#update-label').textContent = '가격 정보를 다시 확인해 주세요';
    const panel = node('div', 'state-panel error');
    panel.append(icon('error', 'state-visual'), node('span', 'state-eyebrow', 'PLEASE TRY AGAIN'), node('h3', '', '가격 정보를 불러오지 못했어요'), node('p', '', '잠시 연결이 원활하지 않아요. 선택한 조건은 그대로 두었으니, 조금 뒤에 다시 확인해 주세요.'));
    const actions = node('div', 'state-actions');
    const retry = node('button', 'text-button', '다시 불러오기 ↻');
    retry.type = 'button';
    retry.addEventListener('click', load);
    actions.append(retry);
    panel.append(actions);
    results.replaceChildren(panel);
    announce('가격 정보를 불러오지 못했습니다. 다시 불러오기 버튼으로 재시도할 수 있습니다.');
  }

  function scheduleExpiry() {
    clearTimeout(state.expiryTimer);
    state.expiryTimer = null;
    if (!state.items.length) return;
    const next = Math.min(...state.items.map(item => Math.min(Date.parse(item.expiresAt), Date.parse(item.observedAt) + MAX_AGE_MS)));
    state.expiryTimer = setTimeout(() => {
      state.expiryTimer = null;
      if (state.data && !state.busy) render();
    }, Math.max(1, next - Date.now() + 1));
  }

  function render() {
    state.items = normaliseItems(state.data.items);
    $('#result-count').textContent = nf.format(state.items.length);
    const last = state.data.status?.lastSuccessAt;
    $('#update-label').textContent = last && Number.isFinite(Date.parse(last)) ? `마지막 기록 ${timeLabel(last)} · 한국시간` : '비교를 위한 가격 기록 준비 중';
    if (state.items.length) {
      const grid = node('div', 'product-grid');
      state.items.forEach((item, index) => grid.append(productCard(item, index + 1)));
      results.replaceChildren(grid);
    } else renderEmpty();
    announce(`${state.filters.period}일 전 기록 대비 ${state.filters.sort === 'rate' ? '할인율' : '할인 금액'}순, ${state.items.length}개 상품을 표시합니다.`);
    if (dialog.open && !state.items.some(item => item.id === state.selectedId)) {
      dialog.close();
      announce('선택한 상품의 최근 가격 비교가 만료되었습니다. 현재 목록을 다시 확인해 주세요.');
    }
    scheduleExpiry();
  }

  async function load() {
    state.controller?.abort();
    const controller = new AbortController();
    state.controller = controller;
    const requestId = ++state.requestId;
    state.busy = true;
    syncControls();
    renderLoading();
    let timeout;
    try {
      const endpoint = safeURL(config.apiUrl, 'api');
      if (!endpoint) {
        state.data = { items: [], categories: [], status: { state: 'paused' } };
        render();
        return;
      }
      Object.entries(state.filters).forEach(([key, value]) => endpoint.searchParams.set(key, value));
      timeout = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(endpoint.href, { signal: controller.signal, mode: 'cors', credentials: 'omit', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('response-unavailable');
      const data = await response.json();
      if (requestId !== state.requestId) return;
      if (!data || !Array.isArray(data.items) || !Array.isArray(data.categories)) throw new Error('response-invalid');
      state.data = data;
      if (!updateCategories(data.categories)) { syncControls(); load(); return; }
      syncControls();
      render();
    } catch {
      if (requestId === state.requestId) {
        state.data = null;
        state.items = [];
        if (dialog.open) dialog.close();
        renderError();
      }
    } finally {
      clearTimeout(timeout);
      if (requestId === state.requestId) {
        state.busy = false;
        results.setAttribute('aria-busy', 'false');
        $('#refresh-button').disabled = false;
      }
    }
  }

  function setFilters(next) {
    if (dialog.open) dialog.close();
    state.filters = { ...state.filters, ...next };
    syncURL();
    load();
  }

  function historyRows(item) {
    if (!Array.isArray(item.history) || !item.history.length) return [];
    const end = dateNumber(item.currentDate);
    const start = end - 30 * DAY_MS;
    const records = new Map();
    item.history.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      const date = dateNumber(entry.date);
      if (date === null || date < start || date > end) return;
      const valid = positive(entry.priceKrw) && entry.status === 'valid';
      records.set(entry.date, { date: entry.date, price: valid ? entry.priceKrw : null, status: valid ? '기록 있음' : entry.status === 'missing' ? '관측 없음' : '비교 보류' });
    });
    if (!records.size) return [];
    const first = Math.min(...Array.from(records.keys()).map(dateNumber), dateNumber(item.baselineDate));
    const rows = [];
    for (let day = Math.max(start, first); day <= end; day += DAY_MS) {
      const date = new Date(day).toISOString().slice(0, 10);
      rows.push(records.get(date) || { date, price: null, status: '관측 없음' });
    }
    return rows;
  }

  function historyChart(rows) {
    const points = rows.filter(row => row.price !== null);
    if (!points.length) return node('p', 'history-empty', '아직 표시할 수 있는 가격 기록이 없어요.');
    const width = 660, height = 210, left = 68, right = 22, top = 20, bottom = 34;
    const prices = points.map(point => point.price);
    const minimum = Math.min(...prices), maximum = Math.max(...prices);
    const padding = Math.max((maximum - minimum) * .2, maximum * .025, 1);
    const low = Math.max(0, minimum - padding), high = maximum + padding;
    const x = index => left + index / Math.max(1, rows.length - 1) * (width - left - right);
    const y = price => top + (high - price) / (high - low) * (height - top - bottom);
    const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': '날짜별 마지막 관측 가격. 자세한 날짜와 가격은 아래 가격 기록 표에서 확인할 수 있습니다.', class: 'history-chart' });
    [0, .5, 1].forEach(fraction => {
      const price = low + (high - low) * fraction;
      const py = y(price);
      svg.append(svgNode('line', { x1: left, y1: py, x2: width - right, y2: py, stroke: '#e8ede2', 'stroke-dasharray': '3 4' }));
      const label = svgNode('text', { x: left - 10, y: py + 4, fill: '#64745a', 'font-size': 11, 'text-anchor': 'end' });
      label.textContent = nf.format(Math.round(price));
      svg.append(label);
    });
    let previous = null;
    rows.forEach((row, index) => {
      if (row.price === null) { previous = null; return; }
      const point = { x: x(index), y: y(row.price) };
      if (previous) svg.append(svgNode('line', { x1: previous.x, y1: previous.y, x2: point.x, y2: point.y, stroke: '#52794c', 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
      const circle = svgNode('circle', { cx: point.x, cy: point.y, r: 3.8, fill: '#fff', stroke: '#52794c', 'stroke-width': 2 });
      const title = svgNode('title');
      title.textContent = `${dateLabel(row.date)} ${won(row.price)}`;
      circle.append(title);
      svg.append(circle);
      previous = point;
    });
    const indices = rows.length < 3 ? [0, rows.length - 1] : [0, Math.floor((rows.length - 1) / 2), rows.length - 1];
    [...new Set(indices)].forEach(index => {
      const label = svgNode('text', { x: x(index), y: height - 7, fill: '#64745a', 'font-size': 11, 'text-anchor': index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle' });
      label.textContent = dateLabel(rows[index].date);
      svg.append(label);
    });
    return svg;
  }

  function openProduct(item) {
    if (!normaliseItems([item]).length) {
      if (state.data) render();
      announce('이 상품의 최근 가격 비교가 만료되었습니다. 목록을 새로고침해 주세요.');
      return;
    }
    state.lastFocus = document.activeElement;
    state.selectedId = item.id;
    const content = $('#dialog-content');
    const top = node('div', 'detail-top');
    const imageBox = node('div', 'detail-image');
    addImage(imageBox, item, false);
    const copy = node('div');
    const title = node('h2', 'detail-title', item.title);
    title.id = 'dialog-title';
    copy.append(node('p', 'detail-category', categoryName(item)), title, node('p', 'detail-dates', `${dateLabel(item.baselineDate, true)} → ${dateLabel(item.currentDate, true)}`));
    top.append(imageBox, copy);
    const comparison = node('div', 'comparison-box');
    const before = node('div');
    before.append(node('small', '', `${state.filters.period}일 전 기록 가격`), node('b', '', won(item.baselinePrice)), node('span', '', dateLabel(item.baselineDate)));
    const after = node('div');
    after.append(node('small', '', '최근 관측가'), node('b', '', won(item.currentPrice)), node('span', '', dateLabel(item.currentDate)));
    const arrow = node('span', 'comparison-arrow', '→');
    arrow.setAttribute('aria-hidden', 'true');
    comparison.append(before, arrow, after);
    const savings = node('p', 'detail-savings', `${state.filters.period}일 전 기록보다 ${won(item.dropAmount)} 낮음 · ${percent(item.dropPercent)} 하락`);
    const observed = node('p', 'detail-observed', `마지막 확인 ${timeLabel(item.observedAt, true)} · 한국시간`);
    const heading = node('div', 'chart-heading');
    heading.append(node('h3', '', '날짜별 가격 기록'), node('span', '', '단위: 원 · 하루 마지막 관측가'));
    const rows = historyRows(item);
    const chart = rows.length ? historyChart(rows) : node('p', 'history-empty', '상세 가격 기록을 준비하고 있어요. 위에서 비교한 두 날짜의 가격을 확인해 주세요.');
    const caption = node('p', 'chart-caption', '기록이 없는 날짜는 선으로 잇지 않습니다. 이 기록은 그날 하루 종일 유지된 가격이나 기간 최저가를 뜻하지 않습니다.');
    content.replaceChildren(top, comparison, savings, observed, heading, chart, caption);
    if (rows.length) {
      const details = node('details', 'history-table-details');
      details.append(node('summary', '', '날짜별 가격 기록을 표로 보기'));
      const tableWrap = node('div', 'history-table-wrap');
      tableWrap.tabIndex = 0;
      tableWrap.setAttribute('aria-label', '날짜별 가격 기록 표, 스크롤 가능');
      const table = node('table', 'history-table');
      const tableCaption = node('caption', 'sr-only', `${item.title} 날짜별 가격 기록`);
      const thead = node('thead');
      const header = node('tr');
      ['날짜 (한국시간)', '관측가', '상태'].forEach(text => { const th = node('th', '', text); th.scope = 'col'; header.append(th); });
      thead.append(header);
      const tbody = node('tbody');
      rows.slice().reverse().forEach(row => { const tr = node('tr'); tr.append(node('td', '', dateLabel(row.date)), node('td', '', row.price === null ? '—' : won(row.price)), node('td', '', row.status)); tbody.append(tr); });
      table.append(tableCaption, thead, tbody);
      tableWrap.append(table);
      details.append(tableWrap);
      content.append(details);
    }
    const footer = node('div', 'detail-footer');
    const link = item.linkVerified === true ? safeURL(item.affiliateUrl, 'affiliate') : null;
    if (link) {
      const buy = node('a', 'buy-link', '쿠팡에서 상품 확인 ↗');
      buy.href = link.href;
      buy.target = '_blank';
      buy.rel = 'noopener noreferrer sponsored';
      buy.setAttribute('aria-label', '쿠팡에서 상품 확인, 새 창으로 열림');
      buy.addEventListener('click', event => {
        if (normaliseItems([item]).length) return;
        event.preventDefault();
        if (state.data) render();
        announce('이 상품의 최근 가격 비교가 만료되었습니다. 목록을 새로고침해 주세요.');
      });
      footer.append(buy, node('p', 'affiliate-disclosure', '이 링크는 쿠팡 파트너스 활동의 일환으로, 구매 시 일정액의 수수료를 제공받을 수 있습니다. 구매 전 옵션과 최종 결제 금액을 확인해 주세요.'));
    } else footer.append(node('p', 'link-unavailable', '상품 이동 링크를 확인하고 있어요.'));
    content.append(footer);
    dialog.showModal();
    document.body.classList.add('dialog-open');
    $('#close-dialog').focus();
  }

  document.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => { if (button.dataset.period !== state.filters.period) setFilters({ period: button.dataset.period }); }));
  document.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => { if (button.dataset.sort !== state.filters.sort) setFilters({ sort: button.dataset.sort }); }));
  $('#category-select').addEventListener('change', event => setFilters({ category: event.target.value }));
  $('#refresh-button').addEventListener('click', load);
  $('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    state.selectedId = null;
    if (state.lastFocus?.isConnected) state.lastFocus.focus({ preventScroll: true });
    else $('#refresh-button').focus({ preventScroll: true });
  });
  window.addEventListener('popstate', () => { if (dialog.open) dialog.close(); state.filters = readFilters(); load(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.data && !state.busy) render();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && state.data && !state.busy) render();
  });
  $('#footer-year').textContent = String(new Date().getFullYear());
  syncURL(true);
  syncControls();
  load();
})();
