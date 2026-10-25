const STORE = { logs: 'momo-love-logs-v1', wishes: 'momo-love-wishes-v1', photos: 'momo-love-photos-v1' };
const LOVE_START = '2024-06-06';
const defaultLogs = [
  { id: 'default-1', date: '2026-02-14', title: '春天的第一束花', text: '下班回家的路上，你突然从身后拿出一束小雏菊，说“路过花店，觉得它很像你”。', tags: ['日常', '小惊喜'], photo: '那天的花，后来变成了干花', tone: '' },
  { id: 'default-2', date: '2026-01-28', title: '在海边看了一次日落', text: '风很大，沙子一直往鞋子里钻，但你牵着我的手，我们还是走到了最靠近海的地方。', tags: ['周末出逃'], photo: '海风、落日和你', tone: 'night' },
  { id: 'default-3', date: '2025-12-06', title: '我们一起过的第一个冬天', text: '没有特别盛大的安排，窝在家里煮火锅、看电影，也觉得这就是最好的节日。', tags: ['纪念日'], tone: 'cafe' }
];
const defaultWishes = [
  { id: 'wish-1', title: '在海边看一次日出', note: '想去一个安静的小岛', done: false, progress: 35 },
  { id: 'wish-2', title: '一起拍一组四季写真', note: '春夏秋冬，记录每一个我们', done: true, progress: 100 },
  { id: 'wish-3', title: '去东京看一场樱花', note: '希望明年春天可以实现', done: false, progress: 15 },
  { id: 'wish-4', title: '养一只属于我们的猫', note: '名字还没有想好', done: false, progress: 8 }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const read = (key, fallback) => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
let logs = read(STORE.logs, defaultLogs);
let wishes = read(STORE.wishes, defaultWishes);

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }
function dateParts(date) { const [year, month, day] = date.split('-'); return { year, month, day }; }
function renderEntry(log) {
  const { year, month, day } = dateParts(log.date);
  const tags = (log.tags || ['新记录']).map((tag, index) => `<span class="tag ${index % 3 === 1 ? 'lav' : index % 3 === 2 ? 'mint' : ''}">${escapeHtml(tag)}</span>`).join('');
  const photo = log.photo ? `<div class="entry-photo ${escapeHtml(log.tone || '')}"><span class="photo-label">${escapeHtml(log.photo)}</span></div>` : '';
  const canDelete = !String(log.id).startsWith('default-');
  return `<article class="entry"><div class="entry-date"><b>${escapeHtml(day)}</b>${escapeHtml(year)} · ${escapeHtml(month)}</div><div class="dot-col"><div class="dot"></div></div><div><div class="entry-tools">${canDelete ? `<button class="delete-log" data-id="${escapeHtml(log.id)}" title="删除">×</button>` : ''}</div><h3>${escapeHtml(log.title)}</h3><p>${escapeHtml(log.text)}</p>${tags}${photo}</div></article>`;
}
function renderLogs() {
  const ordered = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const html = ordered.map(renderEntry).join('');
  $('#homeTimeline').innerHTML = html;
  $('#timelineList').innerHTML = html;
  $('#memoryCount').textContent = String(26 + Math.max(0, logs.length - defaultLogs.length));
  $$('.delete-log').forEach(button => button.addEventListener('click', () => deleteLog(button.dataset.id)));
}
function renderWishes() {
  $('#wishGrid').innerHTML = wishes.map(wish => `<article class="wish-card ${wish.done ? 'done' : ''}" data-id="${escapeHtml(wish.id)}"><button class="wish-check" aria-label="${wish.done ? '标记未完成' : '标记完成'}">✓</button><div><strong>${escapeHtml(wish.title)}</strong><small>${escapeHtml(wish.note || '还没有备注')}</small><div class="progress"><i style="width:${Math.min(100, Math.max(0, Number(wish.done ? 100 : wish.progress || 0)))}%"></i></div></div></article>`).join('');
  $$('.wish-card').forEach(card => $('.wish-check', card).addEventListener('click', () => toggleWish(card.dataset.id)));
}
function deleteLog(id) {
  if (!confirm('确定要删除这条回忆吗？')) return;
  logs = logs.filter(log => log.id !== id); write(STORE.logs, logs); renderLogs(); toast('这条回忆已删除');
}
function toggleWish(id) {
  wishes = wishes.map(wish => wish.id === id ? { ...wish, done: !wish.done, progress: !wish.done ? 100 : Math.min(95, wish.progress || 35) } : wish);
  write(STORE.wishes, wishes); renderWishes(); toast('愿望清单已更新');
}
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => node.classList.remove('show'), 2200); }
function openModal(id) { $(id).classList.add('open'); }
function closeModals() { $$('.modal-wrap').forEach(modal => modal.classList.remove('open')); }
function showSection(sectionId) {
  const titleMap = { home: '故事首页', timeline: '恋爱时间线', gallery: '照片回忆', wishes: '我们的愿望', about: '给未来的我们' };
  $$('.section').forEach(section => section.classList.toggle('visible', section.id === sectionId));
  $$('.nav button').forEach(button => button.classList.toggle('active', button.dataset.section === sectionId));
  $('#crumbTitle').textContent = titleMap[sectionId] || titleMap.home;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function updateDays() {
  const start = new Date(`${LOVE_START}T00:00:00`); const today = new Date();
  const days = Math.max(0, Math.floor((today - start) / 86400000)); $('#daysCount').textContent = days.toLocaleString('zh-CN');
  const anniversary = new Date(`${today.getFullYear()}-06-06T00:00:00`); if (anniversary <= today) anniversary.setFullYear(today.getFullYear() + 1);
  $('#countdownDays').textContent = Math.ceil((anniversary - today) / 86400000);
  const year = anniversary.getFullYear(); $("#anniversaryDate").textContent = year + "年 06月 06日 · 在一起" + (year - 2024) + "周年";
}

$$('.nav button').forEach(button => button.addEventListener('click', () => showSection(button.dataset.section)));
$$('[data-section-jump]').forEach(button => button.addEventListener('click', () => showSection(button.dataset.sectionJump)));
$$('.js-open-log').forEach(button => button.addEventListener('click', () => { $('#logDate').value = new Date().toISOString().slice(0, 10); openModal('#logModal'); setTimeout(() => $('#logTitle').focus(), 50); }));
$$('.js-close-modal, .js-close-wish').forEach(button => button.addEventListener('click', closeModals));
$$('.modal-wrap').forEach(modal => modal.addEventListener('click', event => { if (event.target === modal) closeModals(); }));
$$('.mood').forEach(button => button.addEventListener('click', () => { $$('.mood').forEach(item => item.classList.remove('active')); button.classList.add('active'); toast('今天也要保持好心情'); }));
$('#notifyBtn').addEventListener('click', () => toast('今天也要记得写下想对她说的话 ♡'));
$('#saveLog').addEventListener('click', () => {
  const title = $('#logTitle').value.trim(); const text = $('#logText').value.trim(); const date = $('#logDate').value || new Date().toISOString().slice(0, 10);
  if (!title || !text) { toast('先写下标题和想说的话吧'); return; }
  logs.unshift({ id: `log-${Date.now()}`, date, title, text, tags: ['新记录'], tone: '' }); write(STORE.logs, logs); renderLogs(); closeModals(); $('#logTitle').value = ''; $('#logText').value = ''; toast('这份回忆已经保存');
});
$('#addWishBtn').addEventListener('click', () => openModal('#wishModal'));
$('#saveWish').addEventListener('click', () => {
  const title = $('#wishTitle').value.trim(); const note = $('#wishNote').value.trim();
  if (!title) { toast('写下一个想一起完成的愿望吧'); return; }
  wishes.push({ id: `wish-${Date.now()}`, title, note, done: false, progress: 0 }); write(STORE.wishes, wishes); renderWishes(); closeModals(); $('#wishTitle').value = ''; $('#wishNote').value = ''; toast('愿望已加入清单');
});
$('#photoInput').addEventListener('change', event => {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader(); reader.onload = () => {
    const customPhotos = read(STORE.photos, []); customPhotos.push({ src: reader.result, title: file.name.replace(/\.[^.]+$/, ''), date: new Date().toISOString().slice(0, 10) }); write(STORE.photos, customPhotos); renderPhotos(); toast('照片已添加到回忆里'); event.target.value = '';
  }; reader.readAsDataURL(file);
});
function renderPhotos() {
  const customPhotos = read(STORE.photos, []); const grid = $('#galleryGrid'); $$('.custom-photo', grid).forEach(item => item.remove());
  const add = $('.gallery-add', grid); customPhotos.forEach(photo => { const card = document.createElement('div'); card.className = 'gallery-item custom-photo'; card.style.backgroundImage = `linear-gradient(180deg, transparent 45%, rgba(30,20,20,.55)), url("${photo.src}")`; card.style.backgroundSize = 'cover'; card.style.backgroundPosition = 'center'; card.innerHTML = `<div class="gallery-meta"><strong>${escapeHtml(photo.title)}</strong><small>${escapeHtml(photo.date)}</small></div>`; grid.insertBefore(card, add); });
}
renderLogs(); renderWishes(); renderPhotos(); updateDays();

