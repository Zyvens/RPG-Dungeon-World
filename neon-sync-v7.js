(() => {
  'use strict';

  const AUTH_URL='https://ep-shy-cell-af3t0l9d.neonauth.c-2.us-west-2.aws.neon.tech/neondb/auth';
  const DATA_API_URL='https://ep-shy-cell-af3t0l9d.apirest.c-2.us-west-2.aws.neon.tech/neondb/rest/v1';
  const SDK_URL='https://esm.sh/@neondatabase/neon-js@0.7.0-beta?bundle';
  const DB_NAME='kael-app-db', STORE='kv';
  const META='kael-neon-sync:', VER=META+'version', HASH=META+'hash', RESTORE='kael-neon-restore-view', LAST_EMAIL=META+'email';
  const GAMEPLAY_KEYS=new Set(['kael-gameplay-maps-v1','kael-gameplay-active-v1','kael-turn-order-v1']);
  const GAMEPLAY_DELAY=8000;
  let client=null,user=null,busy=false,gameplayTimer=null,gameplayDirty=false;
  let lastVersion=Number(localStorage.getItem(VER)||0),lastHash=localStorage.getItem(HASH)||'';

  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const editing=()=>document.body.classList.contains('editing');
  const gameplayActive=()=>document.querySelector('.tab-btn[data-tab="gameplay"]')?.classList.contains('active');
  const isAppKey=k=>k&&(k.startsWith('kael-')||k.startsWith('kael-app:'))&&!k.startsWith(META);

  function sessionOf(r){
    const d=r?.data??r??null;
    if(d?.user)return d;
    if(d?.session?.user)return d.session;
    if(r?.session?.user)return r.session;
    return null;
  }
  async function getSession(retries=4){
    for(let i=0;i<retries;i++){
      try{
        const s=sessionOf(await client.auth.getSession());
        if(s?.user)return s;
      }catch(e){console.warn('[Kael Neon] getSession',e)}
      await wait(150*(i+1));
    }
    return null;
  }
  async function ensureSession(){
    const s=await getSession(5);
    if(!s?.user){
      user=null;
      status('Entrar para sincronizar','');
      throw new Error('A sessão deste app terminou. Entre novamente para sincronizar.');
    }
    user=s.user;
    return s;
  }
  const isAuthError=e=>/AuthRequired|Authentication required|valid token|401|JWT/i.test(String(e?.message||e||''));
  async function cloudCall(fn){
    await ensureSession();
    try{return await fn()}
    catch(e){
      if(!isAuthError(e))throw e;
      // Não inferimos expiração pela forma do objeto de sessão. O SDK Neon é a
      // fonte de verdade do JWT; forçamos nova leitura e repetimos a chamada.
      await wait(250);
      await ensureSession();
      return await fn();
    }
  }

  function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
  async function idbGet(){try{const db=await openDB();return await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('state');r.onsuccess=()=>res(r.result??null);r.onerror=()=>rej(r.error)})}catch{return JSON.parse(localStorage.getItem('kael-app:state')||'null')}}
  async function idbSet(v){if(v==null)return;try{const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(v,'state');tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}catch{localStorage.setItem('kael-app:state',JSON.stringify(v))}}
  async function snapshot(){const storage={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(isAppKey(k))storage[k]=localStorage.getItem(k)}return{schema:2,idbState:await idbGet(),localStorage:storage}}
  function hash(v){const t=JSON.stringify(v);let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return `${t.length}:${(h>>>0).toString(16)}`}
  function meta(v,h){lastVersion=Number(v||0);lastHash=h||'';localStorage.setItem(VER,String(lastVersion));localStorage.setItem(HASH,lastHash)}

  async function remote(){return cloudCall(async()=>{const {data,error}=await client.from('kael_app_state').select('user_id,payload,version,updated_at').limit(1);if(error)throw error;return Array.isArray(data)&&data.length?data[0]:null})}
  async function createRemote(payload){return cloudCall(async()=>{const {data,error}=await client.from('kael_app_state').insert({payload}).select('version,updated_at');if(error)throw error;return Array.isArray(data)?data[0]:data})}
  async function updateRemote(payload,base){return cloudCall(async()=>{const {data,error}=await client.from('kael_app_state').update({payload,version:Number(base||0)+1,updated_at:new Date().toISOString()}).eq('user_id',user.id).select('version,updated_at');if(error)throw error;return Array.isArray(data)?data[0]:data})}

  function rememberView(){const tab=document.querySelector('.tab-btn.active')?.dataset.tab||'';sessionStorage.setItem(RESTORE,JSON.stringify({tab,x:scrollX,y:scrollY}))}
  function restoreView(){let s;try{s=JSON.parse(sessionStorage.getItem(RESTORE)||'null')}catch{}if(!s)return;sessionStorage.removeItem(RESTORE);requestAnimationFrame(()=>{if(s.tab)document.querySelector(`.tab-btn[data-tab="${CSS.escape(s.tab)}"]`)?.click();requestAnimationFrame(()=>scrollTo(s.x||0,s.y||0))})}
  async function applyRemote(row){if(!row?.payload||editing())return;busy=true;try{rememberView();await idbSet(row.payload.idbState);const rm=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(isAppKey(k))rm.push(k)}rm.forEach(k=>localStorage.removeItem(k));Object.entries(row.payload.localStorage||{}).forEach(([k,v])=>{if(isAppKey(k)&&v!=null)localStorage.setItem(k,String(v))});meta(row.version,hash(row.payload));location.reload()}finally{busy=false}}

  async function uploadSnapshot({allowEditing=false,label='Sincronizado'}={}){
    if(!user||busy||!navigator.onLine)return false;if(editing()&&!allowEditing)return false;
    busy=true;try{status('Salvando na nuvem…','sync');const local=await snapshot(),h=hash(local),r=await remote();const out=r?await updateRemote(local,Math.max(lastVersion,Number(r.version||0))):await createRemote(local);meta(out?.version||Number(r?.version||0)+1,h);gameplayDirty=false;status(label,'ok');return true}catch(e){console.error('[Kael Neon upload]',e);status(isAuthError(e)?'Sessão precisa ser renovada':'Erro ao salvar na nuvem','error');return false}finally{busy=false}
  }
  async function uploadGameplay(){gameplayTimer=null;if(!gameplayDirty||!gameplayActive())return;if(busy){scheduleGameplaySync();return}const ok=await uploadSnapshot({allowEditing:true,label:'Gameplay sincronizado'});if(!ok&&gameplayDirty)scheduleGameplaySync()}
  function scheduleGameplaySync(){gameplayDirty=true;clearTimeout(gameplayTimer);gameplayTimer=setTimeout(uploadGameplay,GAMEPLAY_DELAY);if(user)status('Gameplay salvo localmente…','sync')}
  const nativeSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){const result=nativeSetItem.call(this,key,value);if(this===localStorage&&GAMEPLAY_KEYS.has(String(key)))scheduleGameplaySync();return result};

  function style(){if(document.getElementById('neon-v7-style'))return;const s=document.createElement('style');s.id='neon-v7-style';s.textContent=`.neon-cloud-chip{position:fixed;right:12px;bottom:12px;z-index:10020;border:1px solid rgba(217,237,245,.28);border-radius:999px;background:rgba(7,17,27,.94);color:#d7edf7;padding:9px 12px;font:700 .75rem/1 system-ui,sans-serif;box-shadow:0 8px 26px rgba(0,0,0,.34);cursor:pointer}.neon-cloud-chip[data-state=ok]{border-color:rgba(92,220,156,.5)}.neon-cloud-chip[data-state=sync]{border-color:rgba(193,154,91,.6);color:#e6c98e}.neon-cloud-chip[data-state=error]{border-color:rgba(255,105,105,.55);color:#ffaaaa}.neon-modal{position:fixed;inset:0;z-index:10030;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.74);overflow:auto}.neon-modal.open{display:flex}.neon-box{width:min(520px,100%);padding:22px;border:1px solid rgba(217,237,245,.22);border-radius:16px;background:#0a1722;color:#eef6fa;box-shadow:0 24px 70px rgba(0,0,0,.55)}.neon-box h3{margin:0 0 6px}.neon-box p{color:#a8bac5;line-height:1.45}.neon-box input{width:100%;height:44px;margin:6px 0;padding:0 11px;border:1px solid rgba(217,237,245,.2);border-radius:10px;background:#07111b;color:white}.neon-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.neon-actions button{min-height:42px;padding:0 14px;border-radius:10px;border:1px solid rgba(217,237,245,.24);background:#12283a;color:white;font-weight:700}.neon-actions .primary{background:#d7edf7;color:#07111b}.neon-actions .danger{color:#ffb0b0;border-color:rgba(255,110,110,.35)}.neon-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.neon-choice{padding:14px;border:1px solid rgba(217,237,245,.18);border-radius:12px;background:#0d1d2a}.neon-choice b{display:block;margin-bottom:5px}.neon-choice small{display:block;color:#9db1be;line-height:1.4}.neon-choice button{width:100%;margin-top:12px;min-height:42px;border-radius:9px;border:1px solid rgba(217,237,245,.25);font-weight:800}.neon-choice.in button{background:#d7edf7;color:#07111b}.neon-choice.out button{background:#1c3b50;color:#fff}.neon-warning{padding:10px 12px;border-radius:10px;background:rgba(193,154,91,.09);border:1px solid rgba(193,154,91,.25);color:#e1c58f!important}.neon-meta{font-size:.78rem;color:#8fa4b0!important}.neon-error{min-height:1.2em;color:#ffaaaa!important}@media(max-width:600px){.neon-choice-grid{grid-template-columns:1fr}}`;document.head.appendChild(s)}
  function status(t,state=''){const c=document.getElementById('neonCloudStatus');if(c){c.textContent='☁ '+t;c.dataset.state=state}}
  function close(id){document.getElementById(id)?.classList.remove('open')}
  function inject(){
    style();if(document.getElementById('neonCloudStatus'))return;
    const chip=document.createElement('button');chip.id='neonCloudStatus';chip.className='neon-cloud-chip';chip.type='button';chip.textContent='☁ Entrar para sincronizar';chip.onclick=()=>user?openSync():openAuth();document.body.appendChild(chip);
    const auth=document.createElement('div');auth.id='neonAuthModal';auth.className='neon-modal';auth.innerHTML=`<div class="neon-box"><h3>Conta de sincronização</h3><p>A sessão fica salva neste app até você tocar em “Sair da conta”.</p><input id="neonEmail" type="email" autocomplete="username" placeholder="E-mail"><input id="neonPassword" type="password" autocomplete="current-password" placeholder="Senha (mínimo 8 caracteres)"><p id="neonAuthError" class="neon-error"></p><div class="neon-actions"><button id="neonSignIn" class="primary">Entrar</button><button id="neonSignUp">Criar conta</button><button id="neonAuthClose">Fechar</button></div></div>`;document.body.appendChild(auth);
    auth.onclick=e=>{if(e.target===auth)close('neonAuthModal')};document.getElementById('neonAuthClose').onclick=()=>close('neonAuthModal');document.getElementById('neonSignIn').onclick=()=>authDo('in');document.getElementById('neonSignUp').onclick=()=>authDo('up');document.getElementById('neonEmail').value=localStorage.getItem(LAST_EMAIL)||'';
    const sync=document.createElement('div');sync.id='neonSyncModal';sync.className='neon-modal';sync.innerHTML=`<div class="neon-box"><h3>Sincronizar dados</h3><p>Escolha claramente qual conteúdo deve prevalecer.</p><p class="neon-warning"><b>Nenhuma substituição acontece automaticamente.</b> Trazer dados da nuvem continua sendo uma decisão manual.</p><div class="neon-choice-grid"><div class="neon-choice in"><b>↓ Trazer conteúdo externo</b><small>Neon → este dispositivo.</small><button id="neonPull">Trazer da nuvem</button></div><div class="neon-choice out"><b>↑ Exportar conteúdo atual</b><small>Este dispositivo → Neon.</small><button id="neonPush">Enviar para a nuvem</button></div></div><p id="neonRemoteMeta" class="neon-meta"></p><p id="neonSyncError" class="neon-error"></p><div class="neon-actions"><button id="neonSyncClose">Fechar sem alterar nada</button><button id="neonSignOut" class="danger">Sair da conta</button></div></div>`;document.body.appendChild(sync);
    sync.onclick=e=>{if(e.target===sync)close('neonSyncModal')};document.getElementById('neonSyncClose').onclick=()=>close('neonSyncModal');document.getElementById('neonPull').onclick=pullFlow;document.getElementById('neonPush').onclick=pushFlow;document.getElementById('neonSignOut').onclick=signOut;
  }
  function openAuth(){document.getElementById('neonAuthModal')?.classList.add('open')}
  async function openSync(){const err=document.getElementById('neonSyncError');err.textContent='';document.getElementById('neonSyncModal')?.classList.add('open');const m=document.getElementById('neonRemoteMeta');m.textContent='Consultando versão da nuvem…';try{const r=await remote();m.textContent=r?`Última versão na nuvem: ${new Date(r.updated_at).toLocaleString('pt-BR')}`:'Ainda não há conteúdo salvo na nuvem.'}catch(e){m.textContent='Não foi possível consultar a nuvem agora.';err.textContent=isAuthError(e)?'A autenticação com a nuvem precisa ser renovada. Toque em “Sair da conta” e entre novamente uma única vez.':(e?.message||'Falha ao consultar a nuvem.')}}
  async function authDo(mode){
    const email=document.getElementById('neonEmail').value.trim(),password=document.getElementById('neonPassword').value||'',err=document.getElementById('neonAuthError');if(!email||password.length<8){err.textContent='Informe um e-mail válido e uma senha com pelo menos 8 caracteres.';return}err.textContent='';status(mode==='up'?'Criando conta…':'Entrando…','sync');
    try{const r=mode==='up'?await client.auth.signUp.email({email,password,name:email.split('@')[0]||'Kael'}):await client.auth.signIn.email({email,password});if(r?.error)throw r.error;const s=sessionOf(r)||await getSession(6);if(!s?.user){throw new Error('O login foi aceito, mas a sessão não ficou disponível neste app. Tente entrar novamente.')}user=s.user;localStorage.setItem(LAST_EMAIL,email);close('neonAuthModal');status('Conectado — sessão mantida neste app','ok')}catch(e){console.error('[Kael Neon auth]',e);const msg=String(e?.message||'Falha na autenticação.');err.textContent=/invalid|credential|password/i.test(msg)?'E-mail ou senha inválidos.':msg;status('Falha no login','error')}
  }
  async function pullFlow(){if(busy||editing())return;const b=document.getElementById('neonPull'),err=document.getElementById('neonSyncError');if(b.dataset.confirm!=='1'){b.dataset.confirm='1';b.textContent='Confirmar: substituir este dispositivo';err.textContent='Esta ação trocará os dados locais pelos dados da nuvem. Clique novamente para confirmar.';return}b.dataset.confirm='';b.textContent='Trazer da nuvem';err.textContent='';busy=true;try{const r=await remote();if(!r){err.textContent='Não existe conteúdo na nuvem para trazer.';return}status('Trazendo da nuvem…','sync');close('neonSyncModal');busy=false;await applyRemote(r)}catch(e){err.textContent=isAuthError(e)?'A sessão precisa ser renovada. Saia da conta e entre novamente uma única vez.':(e?.message||'Falha ao trazer conteúdo.')}finally{busy=false}}
  async function pushFlow(){if(busy||editing())return;const b=document.getElementById('neonPush'),err=document.getElementById('neonSyncError');let r=null;try{r=await remote()}catch(e){err.textContent=isAuthError(e)?'A sessão precisa ser renovada. Saia da conta e entre novamente uma única vez.':(e?.message||'Falha ao consultar a nuvem.');return}if(r&&b.dataset.confirm!=='1'){b.dataset.confirm='1';b.textContent='Confirmar: substituir a nuvem';err.textContent='Já existe conteúdo na nuvem. Clique novamente para confirmar a substituição.';return}b.dataset.confirm='';b.textContent='Enviar para a nuvem';err.textContent='';const ok=await uploadSnapshot({allowEditing:false,label:'Conteúdo enviado para a nuvem'});if(ok)close('neonSyncModal')}
  async function signOut(){try{await client.auth.signOut()}catch(e){console.warn(e)}user=null;close('neonSyncModal');status('Entrar para sincronizar','');openAuth()}
  function bindSave(){const b=document.getElementById('saveBtn');if(!b||b.dataset.neonV7)return;b.dataset.neonV7='1';b.addEventListener('click',()=>{clearTimeout(gameplayTimer);gameplayTimer=null;status('Aguardando salvamento local…','sync');setTimeout(()=>uploadSnapshot({label:'Sincronizado ao salvar'}),600)})}
  async function boot(){inject();bindSave();restoreView();status('Carregando Neon…','sync');try{const sdk=await import(SDK_URL);client=sdk.createClient({auth:{url:AUTH_URL},dataApi:{url:DATA_API_URL}});const s=await getSession(6);user=s?.user||null;status(user?'Conectado — sessão mantida neste app':'Entrar para sincronizar',user?'ok':'');if(user&&gameplayDirty)scheduleGameplaySync()}catch(e){console.error('[Kael Neon boot]',e);status('Neon offline','error')}}
  window.addEventListener('online',()=>{if(gameplayDirty)scheduleGameplaySync()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&gameplayDirty&&user&&!busy)uploadSnapshot({allowEditing:true,label:'Gameplay sincronizado'})});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
