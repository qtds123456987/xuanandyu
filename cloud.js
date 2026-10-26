/* Supabase Auth / PostgREST / private Storage; no build step or CDN dependency. */
'use strict';
window.Cloud = (() => {
  const cfg = window.LOVE_CONFIG || {};
  const base = String(cfg.supabaseUrl || '').replace(/\/$/, '');
  const key = String(cfg.publishableKey || '').trim();
  let configError = '';
  try {
    if (!base || !key) throw Error('请先填写 config.js 中的项目地址和公开密钥。');
    const url = new URL(base);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) throw Error('项目地址应为完整的 HTTPS 项目地址，不包含 /rest/v1 等路径。');
    if (key.startsWith('sb_secret_')) throw Error('不能使用 secret key，请改用 publishable key。');
    if (key.split('.').length === 3) {
      const claim = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (claim.role !== 'anon') throw Error('旧版密钥只能使用 anon public key。');
    } else if (!key.startsWith('sb_publishable_')) throw Error('请填写 publishable key 或 anon public key。');
  } catch (error) { configError = error.message; }
  const sessionKey = 'love-cloud-session:' + base;
  let session = null;
  try { session = JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch {}
  let refreshing = null;
  const signed = new Map();
  function remember(value) {
    session = value;
    try { value ? localStorage.setItem(sessionKey, JSON.stringify(value)) : localStorage.removeItem(sessionKey); } catch {}
  }
  function forget() { remember(null); signed.clear(); }
  function expired() {
    forget();
    window.dispatchEvent(new Event('love-session-expired'));
    return Error('登录已过期，请重新登录。未提交的内容请先复制保存。');
  }
  async function request(path, { method = 'GET', body, token, headers = {} } = {}) {
    if (configError) throw Error(configError);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(base + path, {
        method, signal: controller.signal, cache: 'no-store',
        headers: { apikey: key, ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(body !== undefined && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: body === undefined ? undefined : body instanceof Blob ? body : JSON.stringify(body)
      });
      const raw = await response.text();
      let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
      if (!response.ok) {
        const error = Error(response.status === 401 ? '登录无效或项目密钥不正确，请重新登录并检查配置。' :
          response.status === 403 ? '没有访问权限，请检查双人账号和数据库权限配置。' :
          data?.message || data?.error_description || data?.msg || '云端请求失败（' + response.status + '）');
        error.status = response.status; throw error;
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw Error('连接失败或超时。内容尚未确认保存，请保留输入，恢复网络后重试。');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function token() {
    if (!session?.access_token) throw expired();
    if (Number(session.expires_at) > Date.now() / 1000 + 60) return session.access_token;
    if (!refreshing) refreshing = (async () => {
      try {
        const value = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } });
        remember({ ...value, expires_at: Math.floor(Date.now() / 1000) + value.expires_in });
        return session.access_token;
      } catch (error) { if ([400, 401].includes(error.status)) throw expired(); throw error; }
      finally { refreshing = null; }
    })();
    return refreshing;
  }
  async function api(path, options = {}) {
    try { return await request(path, { ...options, token: await token() }); }
    catch (error) { if (error.status === 401) throw expired(); throw error; }
  }
  return {
    configError, get user() { return session?.user; },
    get hasSession() { return !!session?.access_token; },
    async login(email, password) {
      const value = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
      remember({ ...value, expires_at: Math.floor(Date.now() / 1000) + value.expires_in });
    },
    async logout() { try { if (session) await api('/auth/v1/logout?scope=local', { method: 'POST' }); } finally { forget(); } },
    async password(password) { await api('/auth/v1/user', { method: 'PUT', body: { password } }); },
    async load() {
      const rows = await api('/rest/v1/love_documents?id=eq.shared&select=payload,version,updated_at');
      if (!rows?.length) throw Error('尚未获得双人访问权限，或数据库未初始化。请按部署指南运行 SQL 并添加两个用户 UUID。');
      return rows[0];
    },
    async save(payload, version) {
      const rows = await api('/rest/v1/love_documents?id=eq.shared&version=eq.' + Number(version) + '&select=payload,version,updated_at', {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { payload }
      });
      if (!rows?.length) { const e = Error('对方刚更新了内容，本次没有覆盖云端。请复制当前输入，取消编辑并立即同步，再重新编辑。'); e.conflict = true; throw e; }
      return rows[0];
    },
    async upload(file) {
      const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
      if (!types[file.type]) throw Error('请选择 JPG、PNG、WebP 或 GIF 照片。');
      if (file.size > 8 * 1024 * 1024) throw Error('单张照片请控制在 8 MB 以内。');
      const path = session.user.id + '/' + crypto.randomUUID() + '.' + types[file.type];
      await api('/storage/v1/object/love-photos/' + path, { method: 'POST', body: file, headers: { 'Content-Type': file.type, 'x-upsert': 'false' } });
      return path;
    },
    async photoUrl(path) {
      if (!path) return '';
      if (!/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|gif)$/.test(path)) throw Error('照片路径无效');
      if (signed.get(path)?.until > Date.now()) return signed.get(path).url;
      const value = await api('/storage/v1/object/sign/love-photos/' + path, { method: 'POST', body: { expiresIn: 1800 } });
      const relative = value.signedURL || value.signedUrl;
      if (typeof relative !== 'string' || !relative.startsWith('/object/sign/')) throw Error('无法读取照片签名');
      const url = base + '/storage/v1' + relative;
      signed.set(path, { url, until: Date.now() + 1500000 }); return url;
    },
    async photoBlob(path) { return fetch(await this.photoUrl(path)).then(r => { if (!r.ok) throw Error('照片备份下载失败'); return r.blob(); }); }
  };
})();
