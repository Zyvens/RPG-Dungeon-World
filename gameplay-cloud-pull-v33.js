(() => {
  'use strict';
  const AUTH_URL='https://ep-shy-cell-af3t0l9d.neonauth.c-2.us-west-2.aws.neon.tech/neondb/auth';
  const DATA_API_URL='https://ep-shy-cell-af3t0l9d.apirest.c-2.us-west-2.aws.neon.tech/neondb/rest/v1';
  const SDK_URL='https://esm.sh/@neondatabase/neon-js@0.6.2-beta?bundle';
  const VER='kael-neon-sync:version';
  const RESTORE='kael-neon-restore-view';
  const KEYS=['kael-gameplay-maps-v1','kael-gameplay-active-v1','kael-turn-order-v1'];

  function sessionOf(r){const d=r?.data??r??null;return d?.user?d:(d?.session?.user?d.session:null)}
  function remember(){
    const tab=document.querySelector('.tab-btn.active')?.dataset.tab||'';
    sessionStorage.setItem(RESTORE,JSON.stringify({tab,x:scrollX,y:scrollY}));
  }
  async function boot(){
    if(!navigator.onLine)return;
    try{
      const sdk=await import(SDK_URL);
      const client=sdk.createClient({auth:{url:AUTH_URL},dataApi:{url:DATA_API_URL}});
      const s=sessionOf(await client.auth.getSession());
      if(!s?.user)return;
      const {data,error}=await client.from('kael_app_state').select('payload,version,updated_at').limit(1);
      if(error)throw error;
      const row=Array.isArray(data)&&data.length?data[0]:null;
      if(!row?.payload?.localStorage)return;
      const localVersion=Number(localStorage.getItem(VER)||0);
      if(Number(row.version||0)<=localVersion)return;

      let changed=false;
      for(const key of KEYS){
        const remoteValue=row.payload.localStorage[key];
        if(remoteValue==null)continue;
        if(localStorage.getItem(key)!==String(remoteValue)){
          localStorage.setItem(key,String(remoteValue));
          changed=true;
        }
      }
      localStorage.setItem(VER,String(Number(row.version||0)));
      if(changed){
        remember();
        location.reload();
      }
    }catch(e){console.warn('[Kael gameplay cloud pull]',e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
})();
