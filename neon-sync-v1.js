(() => {
  'use strict';

  const AUTH_URL = 'https://ep-shy-cell-af3t0l9d.neonauth.c-2.us-west-2.aws.neon.tech/neondb/auth';
  const DATA_API_URL = 'https://ep-shy-cell-af3t0l9d.apirest.c-2.us-west-2.aws.neon.tech/neondb/rest/v1';
  const SDK_URL = 'https://esm.sh/@neondatabase/neon-js@0.6.2-beta?bundle';
  const DB_NAME = 'kael-app-db';
  const STORE = 'kv';
  const META_PREFIX = 'kael-neon-sync:';
  const META_VERSION = META_PREFIX + 'version';
  const META_HASH = META_PREFIX + 'hash';
  const CHECK_MS = 3000;
  const POLL_MS = 12000;

  let client = null;
  let currentUser = null;
  let busy = false;
  let lastVersion = Number(localStorage.getItem(META_VERSION) || 0);
  let lastHash = localStorage.getItem(META_HASH) || '';
  let pushTimer = null;

  const isSyncMeta = key => key.startsWith(META_PREFIX);
  const isAppKey = key => key.startsWith('kael-') || key.startsWith('kael-app:');

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('no-indexeddb'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getIdbState() {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get('state');
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch (_) {
      try { return JSON.parse(localStorage.getItem('kael-app:state') || 'null'); } catch { return null; }
    }
  }

  async function setIdbState(value) {
    if (value == null) return;
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, 'state');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch (_) {
      localStorage.setItem('kael-app:state', JSON.stringify(value));
    }
  }

  async function snapshot() {
    const storage = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !isAppKey(key) || isSyncMeta(key)) continue;
      storage[key] = localStorage.getItem(key);
    }
    return { schema: 1, idbState: await getIdbState(), localStorage: storage };
  }

  function hash(value) {
    const text = JSON.stringify(value);
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `${text.length}:${(h >>> 0).toString(16)}`;
  }

  function setMeta(version, valueHash) {
    lastVersion = Number(version || 0);
    lastHash = valueHash || '';
    localStorage.setItem(META_VERSION, String(lastVersion));
    localStorage.setItem(META_HASH, lastHash);
  }

  function normalizeSession(result) {
    const data = result?.data ?? result ?? null;
    if (!data) return null;
    if (data.user) return data;
    if (data.session?.user) return data.session;
    return null;
  }

  async function remoteRow() {
    const { data, error } = await client.from('kael_app_state').select('user_id,payload,version,updated_at').limit(1);
    if (error) throw error;
    return Array.isArray(data) && data.length ? data[0] : null;
  }

  async function createRemote(payload) {
    const { data, error } = await client.from('kael_app_state').insert({ payload }).select('version,updated_at');
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function updateRemote(payload, baseVersion) {
    const nextVersion = Number(baseVersion || 0) + 1;
    const { data, error } = await client.from('kael_app_state')
      .update({ payload, version: nextVersion, updated_at: new Date().toISOString() })
      .eq('user_id', currentUser.id)
      .select('version,updated_at');
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function applyRemote(row) {
    if (!row?.payload) return;
    busy = true;
    try {
      const payload = row.payload;
      await setIdbState(payload.idbState);
      const remove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && isAppKey(key) && !isSyncMeta(key)) remove.push(key);
      }
      remove.forEach(key => localStorage.removeItem(key));
      Object.entries(payload.localStorage || {}).forEach(([key, value]) => {
        if (isAppKey(key) && !isSyncMeta(key) && value != null) localStorage.setItem(key, String(value));
      });
      setMeta(row.version, hash(payload));
      location.reload();
    } finally {
      busy = false;
    }
  }

  async function upload() {
    if (!currentUser || busy || !navigator.onLine) return;
    busy = true;
    try {
      setStatus('Salvando na nuvem…', 'sync');
      const local = await snapshot();
      const localHash = hash(local);
      let row = await remoteRow();
      let result;
      if (!row) result = await createRemote(local);
      else result = await updateRemote(local, Math.max(lastVersion, Number(row.version || 0)));
      setMeta(result?.version || (Number(row?.version || 0) + 1), localHash);
      setStatus('Sincronizado', 'ok');
    } catch (error) {
      console.error('[Kael Neon sync] upload', error);
      setStatus('Erro de sincronização', 'error');
    } finally {
      busy = false;
    }
  }

  async function initialSync() {
    if (!currentUser || busy) return;
    busy = true;
    try {
      setStatus('Conectando ao Neon…', 'sync');
      const local = await snapshot();
      const localHash = hash(local);
      const row = await remoteRow();

      if (!row) {
        const result = await createRemote(local);
        setMeta(result?.version || 1, localHash);
        setStatus('Nuvem criada', 'ok');
        return;
      }

      if (!lastVersion) {
        const useCloud = confirm('Já existem dados deste personagem no Neon.\n\nOK = usar os dados da nuvem neste dispositivo.\nCancelar = substituir a nuvem pelos dados deste dispositivo.');
        if (useCloud) {
          busy = false;
          await applyRemote(row);
          return;
        }
        const result = await updateRemote(local, row.version);
        setMeta(result?.version || Number(row.version) + 1, localHash);
        setStatus('Dados locais enviados', 'ok');
        return;
      }

      if (Number(row.version) > lastVersion && localHash === lastHash) {
        busy = false;
        await applyRemote(row);
        return;
      }

      if (localHash !== lastHash) {
        const result = await updateRemote(local, Math.max(lastVersion, Number(row.version)));
        setMeta(result?.version || Number(row.version) + 1, localHash);
      } else {
        setMeta(row.version, localHash);
      }
      setStatus('Sincronizado', 'ok');
    } catch (error) {
      console.error('[Kael Neon sync] initial', error);
      setStatus('Neon indisponível', 'error');
    } finally {
      busy = false;
    }
  }

  async function detectChanges() {
    if (!currentUser || busy || !navigator.onLine) return;
    const local = await snapshot();
    const localHash = hash(local);
    if (localHash === lastHash) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(upload, 800);
  }

  async function poll() {
    if (!currentUser || busy || !navigator.onLine) return;
    try {
      const row = await remoteRow();
      if (!row || Number(row.version) <= lastVersion) return;
      const local = await snapshot();
      if (hash(local) === lastHash) await applyRemote(row);
      else setStatus('Alterações em dois dispositivos', 'error');
    } catch (_) {}
  }

  function injectUI() {
    if (document.getElementById('neonCloudStatus')) return;
    const style = document.createElement('style');
    style.textContent = `
      .neon-cloud-chip{position:fixed;right:12px;bottom:12px;z-index:10020;border:1px solid rgba(217,237,245,.28);border-radius:999px;background:rgba(7,17,27,.94);color:#d7edf7;padding:9px 12px;font:700 .75rem/1 system-ui,sans-serif;box-shadow:0 8px 26px rgba(0,0,0,.34);cursor:pointer}.neon-cloud-chip[data-state=ok]{border-color:rgba(92,220,156,.5)}.neon-cloud-chip[data-state=sync]{border-color:rgba(193,154,91,.6);color:#e6c98e}.neon-cloud-chip[data-state=error]{border-color:rgba(255,105,105,.55);color:#ffaaaa}
      .neon-auth-modal{position:fixed;inset:0;z-index:10030;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.72)}.neon-auth-modal.open{display:flex}.neon-auth-box{width:min(420px,100%);padding:22px;border:1px solid rgba(217,237,245,.22);border-radius:16px;background:#0a1722;color:#eef6fa;box-shadow:0 24px 70px rgba(0,0,0,.55)}.neon-auth-box h3{margin:0 0 6px}.neon-auth-box p{color:#9db1be;font-size:.84rem}.neon-auth-box input{width:100%;height:44px;margin:6px 0;padding:0 11px;border:1px solid rgba(217,237,245,.2);border-radius:10px;background:#07111b;color:white}.neon-auth-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.neon-auth-actions button{height:40px;padding:0 13px;border-radius:9px;border:1px solid rgba(217,237,245,.24);background:#12283a;color:white;font-weight:700}.neon-auth-actions button.primary{background:#d7edf7;color:#07111b}.neon-auth-error{min-height:1.2em;color:#ffaaaa!important}.neon-user-line{font-size:.78rem;color:#9db1be;margin-top:10px}
    `;
    document.head.appendChild(style);

    const chip = document.createElement('button');
    chip.id = 'neonCloudStatus'; chip.className = 'neon-cloud-chip'; chip.type = 'button';
    chip.textContent = '☁ Entrar para sincronizar';
    chip.addEventListener('click', () => currentUser ? openAccount() : openAuth());
    document.body.appendChild(chip);

    const modal = document.createElement('div');
    modal.id = 'neonAuthModal'; modal.className = 'neon-auth-modal';
    modal.innerHTML = `<div class="neon-auth-box"><h3>Sincronização Neon</h3><p>Use a mesma conta no celular e no PC para manter ficha, mapas e anotações iguais.</p><input id="neonEmail" type="email" autocomplete="email" placeholder="E-mail"><input id="neonPassword" type="password" autocomplete="current-password" placeholder="Senha (mínimo 8 caracteres)"><p id="neonAuthError" class="neon-auth-error"></p><div class="neon-auth-actions"><button id="neonSignIn" class="primary" type="button">Entrar</button><button id="neonSignUp" type="button">Criar conta</button><button id="neonAuthClose" type="button">Cancelar</button></div><div id="neonUserLine" class="neon-user-line"></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeAuth(); });
    document.getElementById('neonAuthClose').onclick = closeAuth;
    document.getElementById('neonSignIn').onclick = () => authenticate('signin');
    document.getElementById('neonSignUp').onclick = () => authenticate('signup');
  }

  function setStatus(text, state = '') {
    const chip = document.getElementById('neonCloudStatus');
    if (!chip) return;
    chip.textContent = `☁ ${text}`;
    chip.dataset.state = state;
  }
  function openAuth() { document.getElementById('neonAuthModal')?.classList.add('open'); }
  function closeAuth() { document.getElementById('neonAuthModal')?.classList.remove('open'); }
  function authError(text) { const el = document.getElementById('neonAuthError'); if (el) el.textContent = text || ''; }

  async function authenticate(mode) {
    const email = document.getElementById('neonEmail')?.value.trim();
    const password = document.getElementById('neonPassword')?.value || '';
    if (!email || password.length < 8) return authError('Informe um e-mail válido e uma senha com pelo menos 8 caracteres.');
    authError('');
    try {
      let result;
      if (mode === 'signup') result = await client.auth.signUp.email({ email, password, name: email.split('@')[0] || 'Kael' });
      else result = await client.auth.signIn.email({ email, password });
      if (result?.error) throw result.error;
      const session = normalizeSession(await client.auth.getSession());
      if (!session?.user) {
        authError(mode === 'signup' ? 'Conta criada. Se a verificação de e-mail estiver ativa, confirme o e-mail e depois entre.' : 'Não foi possível iniciar a sessão.');
        return;
      }
      currentUser = session.user;
      closeAuth();
      setStatus('Conectado', 'ok');
      await initialSync();
    } catch (error) {
      console.error('[Kael Neon auth]', error);
      authError(error?.message || 'Falha na autenticação.');
    }
  }

  async function openAccount() {
    const choice = confirm(`Conectado como ${currentUser?.email || 'usuário'}.\n\nOK = sincronizar agora.\nCancelar = abrir opções de conta.`);
    if (choice) return initialSync();
    if (confirm('Deseja sair desta conta neste dispositivo?')) {
      await client.auth.signOut();
      currentUser = null;
      localStorage.removeItem(META_VERSION);
      localStorage.removeItem(META_HASH);
      lastVersion = 0; lastHash = '';
      setStatus('Entrar para sincronizar');
    }
  }

  async function boot() {
    injectUI();
    setStatus('Carregando Neon…', 'sync');
    try {
      const sdk = await import(SDK_URL);
      client = sdk.createClient({ auth: { url: AUTH_URL }, dataApi: { url: DATA_API_URL } });
      const session = normalizeSession(await client.auth.getSession());
      currentUser = session?.user || null;
      if (currentUser) await initialSync();
      else setStatus('Entrar para sincronizar');
      setInterval(detectChanges, CHECK_MS);
      setInterval(poll, POLL_MS);
      addEventListener('online', () => currentUser && initialSync());
    } catch (error) {
      console.error('[Kael Neon sync] SDK', error);
      setStatus('Neon offline', 'error');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
