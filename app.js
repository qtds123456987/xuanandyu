'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = value => JSON.parse(JSON.stringify(value));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const uid = () => crypto.randomUUID();
const defaults = {
  brandIcon: '♥', brandName: '我们的恋爱日志', brandSubtitle: 'OUR LITTLE UNIVERSE',
  navHome: '故事首页', navTimeline: '恋爱时间线', navGallery: '照片回忆', navWishes: '我们的愿望', navAbout: '给未来的我们',
  footerTitle: '把平凡，写成我们的故事。', footerText: '每一份小小的幸福，都值得被记住。',
  heroEyebrow: 'OUR STORY, STILL WRITING', heroTitle: '和你一起，把日子过成诗。', heroSubtitle: '记录生活里闪闪发光的瞬间，也收藏每一个普通的今天。',
  daysLabel: '相爱的日子', memoryLabel: '珍藏的回忆', cityCount: '0', cityLabel: '一起去过的城市',
  recentTitle: '最近的故事', recentSubtitle: '时光有序，爱意常新', timelineTitle: '恋爱时间线', timelineSubtitle: '从新到旧，重温每一个值得记住的日子',
  galleryTitle: '照片回忆', gallerySubtitle: '把镜头里的我们，好好珍藏', wishesTitle: '我们的愿望', wishesSubtitle: '想和你一起，把这些小事一件件实现',
  anniversaryTitle: '下一次纪念日', countdownLabel: '距离我们的小小仪式，还有', anniversaryNote: '在一起的纪念日',
  memoryTitle: '今日回忆', memoryCaption: '下一次心动，就从今天开始记录。', memoryDate: '', memoryPhotoId: '',
  moodTitle: '今天的心情', moodNote: '也想知道，今天的你过得怎么样。',
  aboutTitle: '写给未来的我们', aboutText: '愿我们一直记得此刻的温柔。\n一起走过四季，也一起认真生活。',
  aboutList: '我们的约定｜有话好好说\n下一站｜一起决定', loveStart: '2026-08-20', anniversaryMonthDay: '06-06'
};
const labels = {
  brandIcon:'侧栏图标',brandName:'网站名称',brandSubtitle:'名称下方文字',navHome:'首页导航名称',navTimeline:'时间线导航名称',navGallery:'照片导航名称',navWishes:'愿望导航名称',navAbout:'关于页导航名称',
  footerTitle:'侧栏底部标题',footerText:'侧栏底部文字',heroEyebrow:'首页英文小标题',heroTitle:'首页标题',heroSubtitle:'首页介绍',daysLabel:'恋爱天数说明',memoryLabel:'日志数量说明',cityCount:'一起去过的城市数量',cityLabel:'城市数量说明',
  recentTitle:'首页日志标题',recentSubtitle:'首页日志说明',timelineTitle:'时间线标题',timelineSubtitle:'时间线说明',galleryTitle:'照片页标题',gallerySubtitle:'照片页说明',wishesTitle:'愿望页标题',wishesSubtitle:'愿望页说明',
  anniversaryTitle:'纪念日卡片标题',countdownLabel:'倒计时说明',anniversaryNote:'纪念日备注',memoryTitle:'今日回忆标题',memoryCaption:'今日回忆文字',memoryDate:'今日回忆日期 / 备注',memoryPhotoId:'今日回忆照片',
  moodTitle:'心情卡片标题',moodNote:'心情说明',aboutTitle:'关于页标题',aboutText:'给未来的我们（正文）',aboutList:'约定卡片（每行：标题｜内容）',loveStart:'恋爱开始日期',anniversaryMonthDay:'每年纪念日（月-日，例如 06-06）'
};
let state = null, version = null, busy = false, loading = false, editContext = null, pollTimer = null, generation = 0;
const search = { mode:'keyword', keyword:'', start:'', end:'' };
function normalize(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('备份内容格式不正确。');
  const text = (v, max = 20000) => String(v ?? '').slice(0, max);
  const list = key => { if (raw[key] !== undefined && !Array.isArray(raw[key])) throw Error(key + ' 必须是列表'); const arr = raw[key] || []; if (arr.length > 5000) throw Error('单类记录不能超过 5000 条'); return arr; };
  const date = value => validDate(value) ? value : today();
  const settings = { ...defaults };
  for (const name of Object.keys(defaults)) if (raw.settings && Object.hasOwn(raw.settings, name)) settings[name] = text(raw.settings[name]);
  // Apply the requested start date to existing cloud content once; later edits remain editable.
  if (raw.migrations?.loveStart20260820 !== true) settings.loveStart = defaults.loveStart;
  if (!validDate(settings.loveStart)) settings.loveStart = defaults.loveStart;
  if (!/^\d{2}-\d{2}$/.test(settings.anniversaryMonthDay) || !validDate('2024-' + settings.anniversaryMonthDay)) settings.anniversaryMonthDay = defaults.anniversaryMonthDay;
  const logs = list('logs').filter(x => x && !String(x.id).startsWith('default-')).map(x => ({ id:text(x.id || uid(),100), title:text(x.title,300), text:text(x.text), date:date(x.date), tags:Array.isArray(x.tags) ? x.tags.map(t => text(t,80)).slice(0,20) : [] }));
  const wishes = list('wishes').filter(Boolean).map(x => ({ id:text(x.id || uid(),100),title:text(x.title,300),note:text(x.note),done:!!x.done,progress:Math.min(100,Math.max(0,Number(x.progress)||0)) }));
  const photos = list('photos').filter(Boolean).map(x => ({ id:text(x.id || uid(),100),title:text(x.title,300),date:date(x.date),note:text(x.note),path:text(x.path,300), ...(typeof x.src === 'string' ? {src:x.src} : {}) }));
  for (const arr of [logs,wishes,photos]) { const ids = new Set(); for (const row of arr) { if (ids.has(row.id)) row.id = uid(); ids.add(row.id); } }
  return { schema:1, migrations:{loveStart20260820:true}, settings, logs, wishes, photos, mood: raw.mood && typeof raw.mood === 'object' ? { date:text(raw.mood.date,10), emoji:['😊','🥰','😌','🥺'].includes(raw.mood.emoji) ? raw.mood.emoji : '', by:text(raw.mood.by,200) } : {} };
}
function validDate(v) { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; const d = new Date(v+'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0,10) === v; }
function toast(text) { $('#toast').textContent=text; $('#toast').classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500); }
function status(text, error=false) { $('#syncStatus').textContent=text; $('#syncStatus').classList.toggle('error',error); }
function showSection(id) {
  $$('.section').forEach(x=>x.classList.toggle('visible',x.id===id));
  $$('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.section===id));
  const keys={home:'navHome',timeline:'navTimeline',gallery:'navGallery',wishes:'navWishes',about:'navAbout'};
  $('#crumbTitle').textContent=state?.settings[keys[id]] || '我们的故事';
}
function syncDate() {
  const s=state.settings, now=today();
  const start=validDate(s.loveStart) ? s.loveStart : defaults.loveStart;
  $('#daysCount').textContent=Math.max(0,Math.floor((Date.parse(now)-Date.parse(start))/86400000)).toLocaleString('zh-CN');
  let year=Number(now.slice(0,4)), target=`${year}-${s.anniversaryMonthDay}`;
  // 02-29 在平年按 02-28 纪念。
  const anniversary=y=>validDate(`${y}-${s.anniversaryMonthDay}`) ? `${y}-${s.anniversaryMonthDay}` : `${y}-02-28`;
  target=anniversary(year); if(target<now) target=anniversary(++year);
  $('#countdownDays').textContent=Math.max(0,Math.round((Date.parse(target)-Date.parse(now))/86400000));
  $('#anniversaryDate').textContent=`${target} · ${s.anniversaryNote}`;
  $('#todayDate').textContent=now.slice(5).replace('-','.');
}
function filteredLogs() {
  let rows=[...state.logs];
  if(search.mode==='keyword' && search.keyword.trim()) { const q=search.keyword.trim().toLocaleLowerCase(); rows=rows.filter(x=>[x.title,x.text,...x.tags].join(' ').toLocaleLowerCase().includes(q)); }
  if(search.mode==='date') rows=rows.filter(x=>(!search.start || x.date>=search.start)&&(!search.end || x.date<=search.end));
  return rows.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
}
function renderLogs() {
  const rows=filteredLogs();
  const html=rows.map(x=>`<article class="entry"><div class="entry-date"><b>${esc(x.date.slice(8))}</b>${esc(x.date.slice(0,7))}</div><div class="dot-col"><div class="dot"></div></div><div><div class="entry-tools"><button data-edit="log" data-id="${esc(x.id)}" aria-label="编辑日志">编辑</button><button data-delete="log" data-id="${esc(x.id)}" aria-label="删除日志">×</button></div><h3>${esc(x.title)}</h3><p class="preserve">${esc(x.text)}</p>${x.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></article>`).join('') || `<div class="empty-search"><strong>${state.logs.length?'没有找到相关记录':'故事，从这里开始'}</strong><span>${search.start && search.end && search.start>search.end?'开始日期不能晚于结束日期。':'写一篇日志，或试试其他关键词和时间范围。'}</span></div>`;
  $('#homeTimeline').innerHTML=html; $('#timelineList').innerHTML=html;
  $('#memoryCount').textContent=state.logs.length;
  $$('.search-count').forEach(x=>x.textContent=`${rows.length} / ${state.logs.length} 条`);
}
function initSearch() {
  $$('.search-panel').forEach((panel,i)=>{ panel.innerHTML=`<label>检索方式<select class="search-mode" aria-label="检索方式 ${i+1}"><option value="keyword">关键词</option><option value="date">时间范围</option></select></label><label class="keyword-field">标题 / 内容 / 标签<input class="search-keyword" type="search" placeholder="搜索我们的回忆" aria-label="关键词 ${i+1}"></label><div class="date-fields" hidden><label>开始日期<input class="search-start" type="date"></label><label>结束日期<input class="search-end" type="date"></label></div><button class="clear-search">重置</button><span class="search-count"></span>`; });
  for(const [selector,event,key] of [['.search-mode','change','mode'],['.search-keyword','input','keyword'],['.search-start','change','start'],['.search-end','change','end']]) $$(selector).forEach(el=>el.addEventListener(event,()=>{search[key]=el.value;syncSearch();renderLogs();}));
  $$('.clear-search').forEach(x=>x.addEventListener('click',()=>{Object.assign(search,{mode:'keyword',keyword:'',start:'',end:''});syncSearch();renderLogs();}));
}
function syncSearch() { for(const k of ['mode','keyword','start','end']) $$('.search-'+k).forEach(x=>x.value=search[k]); $$('.keyword-field').forEach(x=>x.hidden=search.mode!=='keyword'); $$('.date-fields').forEach(x=>x.hidden=search.mode!=='date'); }
function renderWishes() {
  $('#wishGrid').innerHTML=state.wishes.map(x=>`<article class="wish-card ${x.done?'done':''}"><button class="wish-check" data-toggle="${esc(x.id)}" aria-label="${x.done?'标记未完成':'标记完成'}">✓</button><div class="wish-body"><div class="entry-tools"><button data-edit="wish" data-id="${esc(x.id)}">编辑</button><button data-delete="wish" data-id="${esc(x.id)}" aria-label="删除愿望">×</button></div><strong>${esc(x.title)}</strong><small class="preserve">${esc(x.note)}</small><div class="progress"><i style="width:${x.done?100:x.progress}%"></i></div></div></article>`).join('') || '<div class="empty-search">写下第一个想一起完成的愿望吧。</div>';
}
async function fillImage(img,path) {
  try { const url=await Cloud.photoUrl(path); if(img.isConnected && !$('#app').hidden) { img.src=url; img.hidden=false; } }
  catch { if(img.isConnected) { img.hidden=true; img.parentElement?.setAttribute('data-photo-error','照片暂时无法读取，请检查网络与 Storage 权限'); } }
}
function renderPhotos() {
  $('#galleryGrid').innerHTML=[...state.photos].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<article class="gallery-item custom-photo"><img hidden alt="${esc(x.title)}" loading="lazy" data-path="${esc(x.path)}"><div class="photo-actions"><button data-edit="photo" data-id="${esc(x.id)}">编辑</button><button data-delete="photo" data-id="${esc(x.id)}">删除</button></div><div class="gallery-meta"><strong>${esc(x.title)}</strong><small>${esc(x.date)} ${esc(x.note)}</small></div></article>`).join('')+'<button class="gallery-add" data-add="photo"><span><b>＋</b>添加我们的照片</span></button>';
  $$('#galleryGrid img').forEach(img=>fillImage(img,img.dataset.path));
  const photo=state.photos.find(x=>x.id===state.settings.memoryPhotoId);
  $('#memoryImage').innerHTML=photo?`<img hidden alt="今日回忆照片">`:'';
  $('#memoryImage').classList.toggle('has-photo',!!photo);
  if(photo) fillImage($('#memoryImage img'),photo.path);
}
function renderMood() { $('#moodRow').innerHTML=['😊','🥰','😌','🥺'].map(x=>`<button class="mood ${state.mood.date===today()&&state.mood.emoji===x?'active':''}" data-mood="${x}" aria-label="今日心情 ${x}">${x}</button>`).join(''); }
function render() {
  for(const k of Object.keys(defaults)) if($('#'+k) && !['aboutList','memoryPhotoId'].includes(k)) $('#'+k).textContent=state.settings[k];
  document.title=state.settings.brandName;
  $('#aboutList').innerHTML=state.settings.aboutList.split('\n').filter(Boolean).map(line=>{const [title,...body]=line.split('｜');return `<div><b>${esc(title)}</b>${esc(body.join('｜'))}</div>`;}).join('');
  renderLogs();renderWishes();renderPhotos();renderMood();syncDate();
  showSection($('.section.visible')?.id || 'home');
}
async function refresh(force=false) {
  if(!Cloud.hasSession || busy || loading || $('#editor').open || (!force&&document.hidden)) return;
  loading=true; const current=generation;
  try { const row=await Cloud.load(); if(current!==generation) return; if(row.version!==version) {state=normalize(row.payload);version=row.version;render();} status('已同步 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})); }
  catch(e) {if(current===generation) {status('同步失败',true);if(force) throw e;}}
  finally{loading=false;}
}
async function commit(next, expected=version) {
  if(busy) throw Error('正在同步，请稍候。');
  if(new TextEncoder().encode(JSON.stringify(next)).length>3000000) throw Error('文字数据超过 3 MB，请减少单次导入数量。照片请通过上传功能保存。');
  busy=true;status('正在保存…'); const current=generation;
  try {
    const row=await Cloud.save(next,expected);
    if(current!==generation || !Cloud.hasSession) throw Error('登录状态已改变，请重新登录确认云端内容。');
    state=normalize(row.payload);version=row.version;render();status('已保存到云端');
  } catch(e){status(e.conflict?'内容有更新，请重新同步':'保存失败，请保留输入',true);throw e;}
  finally{busy=false;}
}
function field(name,label,value='',type='text',extra='') {
  const input=type==='textarea'?`<textarea name="${name}" ${extra}>${esc(value)}</textarea>`:type==='checkbox'?`<input name="${name}" type="checkbox" ${value?'checked':''}>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${extra}>`;
  return `<div class="field"><label>${esc(label)}${input}</label></div>`;
}
function settingField(k) {
  if(k==='memoryPhotoId') return `<div class="field"><label>${labels[k]}<select name="${k}"><option value="">使用插画</option><option value="__upload__">上传自己的照片…</option>${state.photos.map(x=>`<option value="${esc(x.id)}" ${state.settings[k]===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select></label></div><div class="field" id="memoryUploadField" hidden><label>选择自己的照片<input name="memoryFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled></label><p class="muted">支持 JPG、PNG、WebP、GIF，每张最多 8 MB。保存后也会加入照片回忆。</p></div>`;
  return field(k,labels[k],state.settings[k],k==='loveStart'?'date':['heroSubtitle','aboutText','aboutList','footerText','memoryCaption'].includes(k)?'textarea':'text',k==='loveStart'?'required':'maxlength="20000"');
}
function openEditor(kind,id=null) {
  if(!state || busy || loading) {toast('请稍候，正在连接云端。');return;}
  const collection={log:'logs',wish:'wishes',photo:'photos'}[kind];
  const record=id?state[collection]?.find(x=>x.id===id):null;
  if(id&&!record) return;
  let fields='',keys=[];
  if(collection) {
    fields=field('title',kind==='wish'?'愿望名称':'标题',record?.title||'','text','required maxlength="300"');
    if(kind==='log') fields+=field('date','发生日期',record?.date||today(),'date','required')+field('text','想记录的话',record?.text||'','textarea','required maxlength="20000"')+field('tags','标签（用逗号分隔）',record?.tags?.join('，')||'');
    if(kind==='wish') fields+=field('note','愿望备注',record?.note||'','textarea','maxlength="20000"')+field('progress','完成进度（0—100）',record?.progress||0,'number','min="0" max="100" required')+field('done','已经完成',record?.done,'checkbox');
    if(kind==='photo') fields+=field('date','拍摄日期',record?.date||today(),'date','required')+field('note','照片说明',record?.note||'','textarea','maxlength="20000"')+field('file',record?'替换照片（不选则保留）':'上传照片（每张最多 8 MB）','','file','accept="image/jpeg,image/png,image/webp,image/gif" '+(record?'':'required'));
  } else {
    const groups={anniversary:['loveStart','anniversaryMonthDay','anniversaryTitle','countdownLabel','anniversaryNote'],memory:['memoryTitle','memoryCaption','memoryDate','memoryPhotoId'],about:['aboutTitle','aboutText','aboutList']};
    keys=groups[kind]||Object.keys(defaults);fields=keys.map(settingField).join('');
  }
  editContext={kind,id,collection,version,base:clone(state),keys};
  $('#editorTitle').textContent=collection?(id?'编辑':'新增')+{log:'日志',wish:'愿望',photo:'照片'}[kind]:'编辑页面内容';
  $('#editorFields').innerHTML=fields;$('#editorError').textContent='';$('#editor').showModal();
}
function closeEditor() {if(busy){toast('正在保存，请稍候。');return;} $('#editor').close();editContext=null;refresh();}
$('#editorFields').addEventListener('change',event=>{
  if(event.target.name!=='memoryPhotoId')return;
  const upload=event.target.value==='__upload__',file=$('[name=memoryFile]');
  $('#memoryUploadField').hidden=!upload;file.disabled=!upload;file.required=upload;
});
$('#editorForm').addEventListener('submit',async event=>{
  event.preventDefault();if(!editContext||busy) return;
  const ctx=editContext,next=clone(ctx.base),form=new FormData(event.target);
  const val=k=>String(form.get(k)||'').trim();
  $('#editorError').textContent='';$('#saveEditor').disabled=true;
  try {
    if(ctx.collection) {
      const existing=ctx.id?next[ctx.collection].find(x=>x.id===ctx.id):null;
      const row={...(existing||{}),id:ctx.id||uid(),title:val('title')};
      if(!row.title) throw Error('请填写标题。');
      if(ctx.kind==='log'||ctx.kind==='photo') {row.date=val('date');if(!validDate(row.date)) throw Error('请选择有效日期。');}
      if(ctx.kind==='log') {row.text=val('text');if(!row.text) throw Error('请写下日志内容。');row.tags=val('tags').split(/[,，]/).map(x=>x.trim()).filter(Boolean).slice(0,20);}
      if(ctx.kind==='wish') {row.note=val('note');row.progress=Math.min(100,Math.max(0,Number(val('progress'))||0));row.done=form.has('done');}
      if(ctx.kind==='photo') {
        row.note=val('note');const file=form.get('file');
        if(file?.size) {busy=true;status('正在上传照片…');try{row.path=await Cloud.upload(file);}finally{busy=false;}}
        if(!row.path) throw Error('请选择照片。');
      }
      if(existing) next[ctx.collection]=next[ctx.collection].map(x=>x.id===ctx.id?row:x);else next[ctx.collection].push(row);
    } else {
      for(const key of ctx.keys) next.settings[key]=val(key);
      if(!validDate(next.settings.loveStart)) throw Error('请选择有效的恋爱开始日期。');
      if(!/^\d{2}-\d{2}$/.test(next.settings.anniversaryMonthDay)||!validDate('2024-'+next.settings.anniversaryMonthDay)) throw Error('纪念日请按 06-06 格式填写有效的月-日。');
      if(!next.settings.brandName) throw Error('网站名称不能为空。');
      if(ctx.keys.includes('memoryPhotoId') && next.settings.memoryPhotoId==='__upload__') {
        const file=$('[name=memoryFile]').files[0];
        if(!file?.size) throw Error('请选择要上传的照片。');
        // Reuse a confirmed upload when retrying a failed document save.
        if(ctx.memoryUpload?.file!==file) ctx.memoryUpload=null;
        if(!ctx.memoryUpload) {
          busy=true;status('正在上传今日回忆照片…');
          try {
            const path=await Cloud.upload(file);
            ctx.memoryUpload={file,photo:{id:uid(),title:next.settings.memoryCaption||file.name.replace(/\.[^.]+$/,''),date:today(),note:next.settings.memoryDate,path}};
          } finally {busy=false;}
        }
        next.photos.push(ctx.memoryUpload.photo);
        next.settings.memoryPhotoId=ctx.memoryUpload.photo.id;
      }
    }
    await commit(next,ctx.version);$('#editor').close();editContext=null;toast('已保存，双方都可以看到。');
  } catch(e) {$('#editorError').textContent=e.message;}
  finally{$('#saveEditor').disabled=false;}
});
$('#closeEditor').onclick=closeEditor;$('#cancelEditor').onclick=closeEditor;
$('#editor').addEventListener('cancel',e=>{e.preventDefault();closeEditor();});
document.addEventListener('click',async event=>{
  const el=event.target.closest('button');if(!el) return;
  if(el.dataset.section){showSection(el.dataset.section);return;}
  if(el.dataset.add){openEditor(el.dataset.add);return;}
  if(el.dataset.edit){openEditor(el.dataset.edit,el.dataset.id);return;}
  if(el.dataset.setting){openEditor(el.dataset.setting);return;}
  if(el.dataset.close){$('#'+el.dataset.close).close();return;}
  if((el.dataset.delete||el.dataset.toggle||el.dataset.mood)&&state){
    if(busy||loading){toast('请等待本次同步完成。');return;}
    const next=clone(state),expected=version;
    if(el.dataset.delete){if(!confirm('确定删除这条记录？删除会同步给对方。'))return;const key={log:'logs',wish:'wishes',photo:'photos'}[el.dataset.delete];next[key]=next[key].filter(x=>x.id!==el.dataset.id);if(key==='photos'&&next.settings.memoryPhotoId===el.dataset.id)next.settings.memoryPhotoId='';}
    if(el.dataset.toggle) next.wishes=next.wishes.map(x=>x.id===el.dataset.toggle?{...x,done:!x.done}:x);
    if(el.dataset.mood) next.mood={date:today(),emoji:el.dataset.mood,by:Cloud.user?.email||''};
    el.disabled=true;try{await commit(next,expected);toast('已同步到云端');}catch(e){toast(e.message);}finally{el.disabled=false;}
  }
});
$('#editPage').onclick=()=>openEditor('all');
$('#accountButton').onclick=()=>{$('#accountEmail').textContent=Cloud.user?.email||'';$('#accountDialog').showModal();};
$('#refreshButton').onclick=async()=>{try{await refresh(true);toast('已读取云端最新内容');}catch(e){toast(e.message);}};
function authScreen(message='') {
  generation++;clearInterval(pollTimer);pollTimer=null;state=null;version=null;
  $('#app').hidden=true;$('#authScreen').hidden=false;$('#authError').textContent=message;
  $$('#app .timeline, #galleryGrid, #wishGrid, #memoryImage').forEach(x=>x.replaceChildren());
  // Keep an unsaved editor visible after expiry so its text can be copied before logging in again.
  if($('#editor').open) $('#editorError').textContent=message;
  $('#accountDialog').close();
}
async function start() {
  const current=generation;const row=await Cloud.load();if(current!==generation)return;
  state=normalize(row.payload);version=row.version;
  $('#authScreen').hidden=true;$('#app').hidden=false;render();status('已连接云端');
  clearInterval(pollTimer);pollTimer=setInterval(refresh,Math.max(8000,Number(window.LOVE_CONFIG?.pollIntervalMs)||8000));
}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();$('#loginButton').disabled=true;$('#authError').textContent='';try{await Cloud.login($('#loginEmail').value.trim(),$('#loginPassword').value);await start();$('#loginPassword').value='';}catch(error){$('#authError').textContent=error.message;}finally{$('#loginButton').disabled=false;}});
$('#logoutButton').onclick=async()=>{if(busy||loading){toast('请等待同步完成。');return;}try{await Cloud.logout();}catch{}authScreen();};
window.addEventListener('love-session-expired',()=>authScreen('登录已过期，请重新登录。未提交的内容请先复制保存。'));
window.addEventListener('online',()=>refresh());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
$('#passwordButton').onclick=()=>{
  if(busy)return;$('#accountDialog').close();
  // Use a password field rather than a browser text prompt.
  $('#editorTitle').textContent='修改我的密码';$('#editorFields').innerHTML=field('newPassword','新密码（至少 8 位）','','password','required minlength="8" autocomplete="new-password"');
  $('#editorError').textContent='';editContext=null;$('#editor').showModal();
};
$('#editorForm').addEventListener('submit',async e=>{
  if(!e.target.elements.newPassword)return;
  e.preventDefault();if(busy)return;busy=true;$('#saveEditor').disabled=true;
  try{await Cloud.password(e.target.elements.newPassword.value);$('#editor').close();toast('密码已更新');}
  catch(error){$('#editorError').textContent=error.message;}
  finally{busy=false;$('#saveEditor').disabled=false;}
});
const blobData=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
$('#exportButton').onclick=async()=>{
  if(busy||loading||!state)return;busy=true;$('#exportButton').disabled=true;$('#importStatus').textContent='正在生成含照片的完整备份…';
  try{
    const data=clone(state);
    for(const p of data.photos){p.src=await blobData(await Cloud.photoBlob(p.path));delete p.path;}
    const blob=new Blob([JSON.stringify({format:'love-log-backup-v1',exportedAt:new Date().toISOString(),payload:data},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='我们的恋爱日志-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    $('#importStatus').textContent='备份已生成，包含正文与照片，请妥善保存。';
  }catch(e){$('#importStatus').textContent='备份失败：'+e.message;}finally{busy=false;$('#exportButton').disabled=false;}
};
async function importData(raw) {
  if(busy||loading||!state)throw Error('请等待同步完成。');
  const payload=raw?.format==='love-log-backup-v1'?raw.payload:raw;
  const source=normalize(Array.isArray(payload)?{logs:payload}:payload);
  if(!confirm(`准备合并导入 ${source.logs.length} 条日志、${source.wishes.length} 个愿望、${source.photos.length} 张照片。相同 ID 的记录保留云端版本。${payload?.settings?'页面文案将使用备份中的版本。':''}是否继续？`))return;
  const next=clone(state),expected=version;busy=true;
  try {
    for(const photo of source.photos){
      if(next.photos.some(x=>x.id===photo.id)) continue;
      if(photo.src) {
        if(!/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/.test(photo.src)||photo.src.length>12*1024*1024)throw Error('备份中存在无效或过大的照片。');
        $('#importStatus').textContent='正在上传备份照片…';
        const blob=await fetch(photo.src).then(r=>r.blob());photo.path=await Cloud.upload(blob);delete photo.src;
      } else if(!photo.path) throw Error('备份照片缺少图像文件。');
    }
    for(const key of ['logs','wishes','photos']) for(const row of source[key]) if(!next[key].some(x=>x.id===row.id))next[key].push(row);
    if(payload?.settings) next.settings=source.settings;
    if(payload?.mood) next.mood=source.mood;
  } finally{busy=false;}
  await commit(next,expected);$('#importStatus').textContent='已合并并保存到云端。';
}
$('#importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100*1024*1024)throw Error('备份超过 100 MB，请拆分导入。');await importData(JSON.parse(await file.text()));}catch(error){$('#importStatus').textContent='导入未完成：'+error.message;}finally{e.target.value='';}};
$('#migrateButton').onclick=async()=>{try{const read=(key)=>JSON.parse(localStorage.getItem(key)||'[]');await importData({logs:read('momo-love-logs-v1'),wishes:read('momo-love-wishes-v1'),photos:read('momo-love-photos-v1')});}catch(e){$('#importStatus').textContent='导入未完成：'+e.message;}};
initSearch();
if(Cloud.configError){$('#setupNotice').hidden=false;$('#setupNotice').textContent=Cloud.configError+' 请查看压缩包内的《部署指南》。';$('#loginButton').disabled=true;}
else if(Cloud.hasSession)start().catch(e=>authScreen(e.message));
