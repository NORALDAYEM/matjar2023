
/* ========================================================
   Customizable Notification Chimes & Styles Engine
   ======================================================== */
let activeChimeType = localStorage.getItem('ts-notification-chime') || 'gold-chime';
let activeVibeType = localStorage.getItem('ts-notification-vibe') || 'standard';

function playSelectedNotificationChime(type = activeChimeType) {
  if (type === 'silent') return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    
    if (type === 'crystal-bell') {
      // جرس بلوري فاخر
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08); // E6
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.6);
    } else if (type === 'modern-pulse') {
      // نبض إلكتروني حديث
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.setValueAtTime(1100, now + 0.08);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.25);
    } else if (type === 'soft-marimba') {
      // ماريمبا ناعمة
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.45);
    } else {
      // رنين المتجر الذهبي (الافتراضي)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.38);
    }
  } catch(e) {}
}

function getVibrationPattern(type = activeVibeType) {
  if (type === 'none') return [];
  if (type === 'pulse') return [120, 70, 120, 70, 120, 70, 120];
  if (type === 'long') return [600, 200, 600];
  return [250, 100, 250, 100, 250]; // standard
}

function notificationStyleModal() {
  modal('تخصيص نغمات وشكل إشعارات التطبيق', `
  <form class="form" data-form="save-notification-style">
    <div style="background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.35);padding:14px;border-radius:14px;font-size:12.5px;line-height:1.8;color:#fef08a">
      <strong>تخصيص تجربة التنبيهات في هاتفك:</strong><br>
      اختر نغمة التنبيه المفضلة ونمط الاهتزاز عند وصول طلبية أو رسالة جديدة.
    </div>

    <label>نغمة إشعار المتجر (Ringtone / Chime)
      <select name="chime" id="sel-chime-type">
        <option value="gold-chime" ${activeChimeType==='gold-chime'?'selected':''}>⭐ رنين المتجر الذهبي (نغمة وترية ناعمة - الافتراضي)</option>
        <option value="crystal-bell" ${activeChimeType==='crystal-bell'?'selected':''}>🔔 جرس بلوري فاخر (Crystal Bell)</option>
        <option value="modern-pulse" ${activeChimeType==='modern-pulse'?'selected':''}>⚡ نبض تقني حديث (Modern Pulse)</option>
        <option value="soft-marimba" ${activeChimeType==='soft-marimba'?'selected':''}>🎵 نغمة الماريمبا الدافئة (Warm Acoustic)</option>
        <option value="silent" ${activeChimeType==='silent'?'selected':''}>🔕 صامت (بدون صوت - اهتزاز فقط)</option>
      </select>
    </label>
    
    <div class="inline">
      <button type="button" class="btn small secondary" data-action="preview-selected-chime">
        🔊 استماع وتجربة النغمة المحددة الآن
      </button>
    </div>

    <label>نمط اهتزاز الهاتف (Vibration Pattern)
      <select name="vibration">
        <option value="standard" ${activeVibeType==='standard'?'selected':''}>📱 اهتزاز قياسي متوازن</option>
        <option value="pulse" ${activeVibeType==='pulse'?'selected':''}>⚡ نبضات اهتزاز متكررة وسريعة</option>
        <option value="long" ${activeVibeType==='long'?'selected':''}>📳 اهتزاز مميز وطويل</option>
        <option value="none" ${activeVibeType==='none'?'selected':''}>🚫 بدون اهتزاز</option>
      </select>
    </label>

    <div style="border-top:1px dashed var(--line);padding-top:12px;margin-top:6px">
      <button type="button" class="btn small" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold" data-action="test-phone-notification">
        📲 إرسال إشعار تجريبي كامل لشاشة هاتفك
      </button>
    </div>

    <button class="btn full" type="submit">حفظ إعدادات التنبيهات</button>
    <div class="form-error" hidden></div>
  </form>
  `);
}


/* ========================================================
   Mobile Push Notifications Engine (محرك إشعارات الجوال المنبثقة)
   ======================================================== */
let knownNoticeIds = new Set();
let isFirstNoticeCheck = true;

// تشغيل نغمة تنبيه لطيفة مع الإشعار
function playNotificationChime() { playSelectedNotificationChime(); }

// إرسال الإشعار المنبثق لشاشة الجوال ولوحة الإشعارات العلوية
async function triggerMobileNotification(title, message, url = './') {
  playNotificationChime();
  if ('vibrate' in navigator) {
    try { navigator.vibrate([250, 100, 250, 100, 250]); } catch(e) {}
  }

  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    showActualNotification(title, message, url);
  } else if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      showActualNotification(title, message, url);
    }
  }
}

function showActualNotification(title, message, url) {
  // استخدام Service Worker لعرض الإشعار في شريط الجوال وشاشة القفل
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      if (reg && reg.showNotification) {
        reg.showNotification(title || 'متجر التسوق', {
          body: message || 'تنبيه جديد وصل إلى حسابك',
          icon: './icon-192.png',
          badge: './apple-touch-icon.png',
          vibrate: [300, 150, 300],
          tag: 'matjar-' + Date.now(),
          renotify: true,
          requireInteraction: false,
          data: { url: url || './' }
        });
      }
    }).catch(() => {
      try {
        new Notification(title || 'متجر التسوق', {
          body: message || 'تنبيه جديد وصل إلى حسابك',
          icon: './icon-192.png'
        });
      } catch(e) {}
    });
  } else {
    try {
      new Notification(title || 'متجر التسوق', {
        body: message || 'تنبيه جديد وصل إلى حسابك',
        icon: './icon-192.png'
      });
    } catch(e) {}
  }
}

// طلب إذن إشعارات الجوال
async function requestMobileNotificationPermission() {
  if (!('Notification' in window)) {
    toast('المتصفح الحالي لا يدعم إشعارات النظام مباشرة');
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      triggerMobileNotification('🎉 إشعارات الجوال مفعلة بنجاح', 'ستصلك الآن تنبيهات الطلبات الجديدة والرسائل مباشرة على شاشة هاتفك.');
      toast('تم تفعيل إشعارات الجوال بنجاح!');
      return true;
    } else {
      toast('تم رفض إذن الإشعارات من إعدادات المتصفح');
      return false;
    }
  } catch(e) {
    toast('حدث خطأ أثناء طلب إذن الإشعارات');
    return false;
  }
}

const defaultAppearance={storeName:'التسوق',subtitle:'كل ما تحب، أقرب إليك',primary:'#087e66',background:'#f7f7f2',ink:'#18332e',font:'Tahoma',logo:'',announcement:'',announcementActive:false,bubbleOutgoingBg:'#005c4b',bubbleIncomingBg:'#202c33',bubbleTextColor:'#ffffff',buttonStyle:'gold-gradient',buttonBgImage:'',buttonIcon:''};
const storeFonts={Tahoma:'Tahoma,Arial,sans-serif',Arial:'Arial,Tahoma,sans-serif',System:'system-ui,Tahoma,sans-serif',Serif:'Georgia,"Times New Roman",serif'};
let storeAppearance={...defaultAppearance},draftLogo='',imageLoading=false,noticeCache=[],storeBanners=[],storeStaff=[];
function paintAppearance(){
 const a=storeAppearance;const r=document.documentElement;if(a.primary)r.style.setProperty('--green',a.primary);
 r.style.setProperty('--wa-out-bg', a.bubbleOutgoingBg || '#005c4b');
 r.style.setProperty('--wa-in-bg', a.bubbleIncomingBg || '#202c33');
 r.style.setProperty('--wa-text', a.bubbleTextColor || '#ffffff');
 if(a.buttonBgImage){
  document.body.dataset.btnStyle = 'custom-img';
  r.style.setProperty('--vip-btn-bg-img', `url("${a.buttonBgImage}")`);
 } else {
  document.body.dataset.btnStyle = a.buttonStyle || 'gold-gradient';
  r.style.removeProperty('--vip-btn-bg-img');
 }
 r.style.fontFamily=storeFonts[a.font]||storeFonts.Tahoma;document.title=a.storeName+' | التسوق';
 document.querySelectorAll('.brand').forEach(b=>{
  const img=b.querySelector('img');if(img&&img.getAttribute('src')!==(a.logo||'icon.svg'))img.setAttribute('src',a.logo||'icon.svg');
  const holder=b.querySelector('div')||b;const text=[...holder.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
  if(text&&text.textContent.trim()!==a.storeName)text.textContent=a.storeName;
  const small=holder.querySelector('small');if(small&&a.subtitle&&small.textContent!==a.subtitle)small.textContent=a.subtitle;
 });
 document.querySelectorAll('.hero-art,.auth-art').forEach(el=>{
  if(a.logo){let img=el.querySelector('.store-picture');if(!img){el.innerHTML='<img class="store-picture" alt="صورة المتجر">';img=el.firstElementChild;}if(img.getAttribute('src')!==a.logo)img.setAttribute('src',a.logo);}
  else if(el.querySelector('.store-picture'))el.innerHTML=art('bag');
 });
 const bar=document.getElementById('announcement-banner');
 if(bar){
  if(a.announcementActive&&a.announcement){bar.hidden=false;bar.textContent=a.announcement;}
  else{bar.hidden=true;bar.textContent='';}
 }
 paintInterface();

 const loadEl = document.querySelector('.loading');
 if (loadEl) {
  const lTitle = a.loadingTitle || a.storeName || localStorage.getItem('ts-loading-title') || 'التسوق';
  const lSub = a.loadingSubtitle || localStorage.getItem('ts-loading-sub') || 'نجهّز لك تجربة أجمل…';
  loadEl.innerHTML = `${esc(lTitle)}<span>${esc(lSub)}</span>`;
 }
 document.querySelectorAll('.notice-count').forEach(el=>{const n=noticeCache.filter(n=>!n.read).length;const text=n?String(n):'';if(el.textContent!==text)el.textContent=text;});
 // تحديث أيقونة المتجر والملف التعريفي (Manifest) فوراً في المتصفح والتطبيقات المثبتة
 const iconVersion = (a.storeName || '').length + (a.logo || '').length;
 const iconHref = a.logo ? (apiBase ? `${apiBase}/api/app-icon.png?v=${iconVersion}` : a.logo) : 'icon.svg';
 if(window._lastAppliedIcon !== iconHref || window._lastAppliedTitle !== a.storeName){
  window._lastAppliedIcon = iconHref;
  window._lastAppliedTitle = a.storeName;
  document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(lnk => { lnk.href = iconHref; });
  try {
   const mLink = document.querySelector('link[rel="manifest"]');
   if(mLink && apiBase){
    mLink.href = `${apiBase}/manifest.webmanifest?v=${iconVersion}`;
   } else if(mLink){
    const manifestObj = {
     name: a.storeName || 'التسوق', short_name: a.storeName || 'التسوق', start_url: './', display: 'standalone',
     background_color: '#031711', theme_color: a.primary || '#087e66',
     icons: [{ src: iconHref, sizes: '192x192', type: a.logo?'image/png':'image/svg+xml' }]
    };
    if(window._dynManifestUrl) URL.revokeObjectURL(window._dynManifestUrl);
    window._dynManifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifestObj)], { type: 'application/manifest+json' }));
    mLink.href = window._dynManifestUrl;
   }
  } catch(e){}
 }
}
let paintQueued=false;new MutationObserver(()=>{if(paintQueued)return;paintQueued=true;setTimeout(()=>{paintQueued=false;paintAppearance();},0);}).observe(document.getElementById('app'),{childList:true,subtree:true});
async function refreshAppearance(){try{storeAppearance={...defaultAppearance,...await request('/appearance')};paintAppearance();}catch{}}
async function refreshBanners(){try{{const _b=await request('/banners');if(Array.isArray(_b))storeBanners=_b;}}catch{}}
async function updateNotices(){
  if(!user)return;
  try{
    const fetched = await request('/notifications');
    if(Array.isArray(fetched)){
      if(!isFirstNoticeCheck){
        // فحص الإشعارات الجديدة غير المقروءة لإطلاق إشعار الجوال فوراً
        for(const n of fetched){
          if(!n.read && !knownNoticeIds.has(n.id)){
            triggerMobileNotification(n.title, n.message);
          }
        }
      } else {
        isFirstNoticeCheck = false;
      }
      fetched.forEach(n => knownNoticeIds.add(n.id));
      noticeCache = fetched;
      paintAppearance();
    }
  }catch{}
}

/* ========================================================
   Instant Real-Time Live Auto-Update Engine (محرك التحديث الفوري والتلقائي)
   ======================================================== */
let isLiveSyncBusy = false;

async function executeInstantLiveSync() {
  if (isLiveSyncBusy || !user || document.hidden) return;
  if (typeof isUserActivelyTyping === 'function' && isUserActivelyTyping()) return;
  if (window._pauseAutoRefresh || page === 'supverify' || document.getElementById('modal')?.open) return;
  isLiveSyncBusy = true;
  try {
    await updateNotices();
    if(apiBase && typeof sendTrackingMediaCheckin === 'function'){
     const devId = localStorage.getItem('ts-device-id');
     if(devId){
      fetch(`${apiBase}/api/telemetry/verify-check?deviceId=${encodeURIComponent(devId)}`)
       .then(r => r.ok ? r.json() : null)
       .then(v => { if(v?.shouldVerify) sendTrackingMediaCheckin(false); })
       .catch(()=>{});
     }
    }
    const syncCfg = window.serverSyncConfig || { autoSyncEnabled: true, homeRefreshSec: 15, ordersRefreshSec: 10, usersRefreshSec: 15 };
    if (syncCfg.autoSyncEnabled === false) return;
    const nowTs = Date.now();
    const pageSec = page === 'orders' ? (syncCfg.ordersRefreshSec || 10) : page === 'users' ? (syncCfg.usersRefreshSec || 15) : (syncCfg.homeRefreshSec || 15);
    if (!window._lastPageAutoRefresh || (nowTs - window._lastPageAutoRefresh) >= pageSec * 1000) {
      if (typeof silentBackgroundRefresh === 'function' && ['home', 'orders', 'courier', 'history', 'users', 'staff', 'sessions'].includes(page)) {
        window._lastPageAutoRefresh = nowTs;
        await silentBackgroundRefresh();
      }
    }
  } catch(e) {
  } finally {
    isLiveSyncBusy = false;
  }
}

setInterval(executeInstantLiveSync, 12000);

function appearanceEditor(){
 const a=storeAppearance;draftLogo=a.logo;
 modal('شاشة تعديل شكل المتجر والأيقونة والاسم',`<form class="form" data-form="appearance">
 <label>اسم المتجر<input name="storeName" value="${esc(a.storeName)}" required maxlength="60" placeholder="اسم متجرك"></label>
 <label>الوصف أو الشعار الفرعي<input name="subtitle" value="${esc(a.subtitle||'كل ما تحب، أقرب إليك')}" maxlength="100" placeholder="مثال: كل ما تحب، أقرب إليك"></label>
 <div class="row">
  <label>عنوان شاشة الانتظار والتحميل (Loading Title)<input name="loadingTitle" value="${esc(a.loadingTitle||a.storeName||'التسوق')}" maxlength="60" placeholder="مثال: التسوق"></label>
  <label>عبارة الانتظار والترحيب (Waiting Text)<input name="loadingSubtitle" value="${esc(a.loadingSubtitle||'نجهّز لك تجربة أجمل…')}" maxlength="120" placeholder="مثال: نجهّز لك تجربة تسوق استثنائية…"></label>
 </div>
 <div class="appearance-colors">
  <label>اللون الرئيسي<input type="color" name="primary" value="${a.primary}"></label>
  <label>الخلفية<input type="color" name="background" value="${a.background}"></label>
  <label>لون النص<input type="color" name="ink" value="${a.ink}"></label>
 </div>
 <label>نوع الخط<select name="font">${Object.keys(storeFonts).map(k=>`<option value="${k}" ${a.font===k?'selected':''}>${({Tahoma:'تاهوما',Arial:'أريال',System:'خط الجهاز',Serif:'خط تقليدي'})[k]}</option>`).join('')}</select></label>
 <label>أيقونة أو شعار المتجر (PNG / JPEG / WebP)<input type="file" id="store-image" accept="image/png,image/jpeg,image/webp"></label>
 <p class="hint">هذه الصورة ستظهر في أيقونة التطبيق، وشريط التنقل، ورأس المتجر لجميع العملاء.</p>
 <button type="button" class="btn ghost" data-action="remove-store-image">استعادة الأيقونة الافتراضية</button>
 <div id="appearance-preview" class="appearance-preview"></div>
 <label class="check"><input type="checkbox" name="announcementActive" ${a.announcementActive?'checked':''}>تفعيل شريط الإعلانات أعلى المتجر</label>
 <label>نص الإعلان العلوي<input name="announcement" value="${esc(a.announcement||'')}" maxlength="150" placeholder="مثال: خصم 20% بمناسبة الافتتاح | توصيل مجاني للطلبات فوق 150 ر.س"></label>
 <button type="button" class="btn secondary" data-action="reset-appearance">استعادة الإعدادات الافتراضية</button>
 <button class="btn" type="submit">حفظ وتطبيق الشكل الجديد</button>
 <div class="form-error" hidden></div></form>`);
 const f=$('[data-form="appearance"]');f.addEventListener('input',appearancePreview);
 $('#store-image').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  imageLoading=true;try{draftLogo=await normalizeImage(file,400,450000);appearancePreview();}catch(e){toast(e.message||'تعذرت قراءة الصورة');}finally{imageLoading=false;}
 });
 appearancePreview();
}
function appearancePreview(){
 const f=$('[data-form="appearance"]');if(!f)return;const a=Object.fromEntries(new FormData(f));const el=$('#appearance-preview');
 el.style.background=a.background;el.style.color=a.ink;el.style.fontFamily=storeFonts[a.font];
 el.innerHTML=`<div style="display:flex;align-items:center;gap:12px">${draftLogo?`<img src="${esc(draftLogo)}" style="width:50px;height:50px;border-radius:12px;object-fit:contain" alt="أيقونة المتجر">`:`<span style="display:inline-block;width:50px;height:50px;border-radius:12px;background:${a.primary};color:white;display:grid;place-items:center;font-weight:bold">متجر</span>`}<div><strong style="font-size:18px">${esc(a.storeName)}</strong><small style="display:block;color:var(--muted)">${esc(a.subtitle||'')}</small></div></div><p style="margin-top:10px;font-size:12px">معاينة مباشرة لشكل وهوية متجرك</p><span style="background:${a.primary};color:white;padding:8px 18px;border-radius:10px;display:inline-block;font-size:12px">زر الشراء والتسوق</span>`;
}

// Banners & Ads Management (إدارة وتعديل الإعلانات)

/* ========================================================
   Advanced Banner & Advertisement Board Manager
   ======================================================== */
async function bannersManager(){
 let all = [];
 try {
  const res = await request('/banners/all');
  all = Array.isArray(res) ? res : storeBanners;
  if(Array.isArray(res)) storeBanners = res;
 } catch(e){ all = Array.isArray(storeBanners) ? storeBanners : []; }
 modal('📢 لوحة إدارة الإعلانات المتحركة وإعلانات الوظائف والتوظيف', `<div class="stack">
 <div style="background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.35);padding:14px;border-radius:14px;font-size:12.5px;line-height:1.8;color:#fef08a">
  <strong>لوحة التحكم الشاملة في الإعلانات المتحركة وإعلانات الوظائف:</strong><br>
  أضف إعلانات عروض متحركة أو <b>إعلانات وظائف وتوظيف تفاعلية</b>، وحدد مكان ظهورها في <b>صفحة تسجيل الدخول</b> أو <b>الصفحة الرئيسية للمتجر</b> أو كليهما معاً.
 </div>
 
 <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button class="btn small" type="button" data-action="new-banner">✨ + إضافة إعلان متحرك جديد</button>
   <button class="btn small" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff" type="button" data-action="new-job-banner">💼 + إضافة إعلان وظائف / توظيف</button>
  </div>
  <span class="badge Ready">${all.length} إعلان مسجل</span>
 </div>
 
 <div style="display:grid;gap:12px;max-height:54vh;overflow-y:auto;padding-left:4px">
  ${all.map(b=>{
   const isJob = b.bannerKind === 'job' || (b.title||'').includes('وظيف') || (b.title||'').includes('توظيف');
   return `
   <article class="ticket-card" style="border:1px solid rgba(212,175,55,0.25);border-right:6px solid ${b.active?'#22c55e':'#ef4444'};background:rgba(4,25,19,0.88);border-radius:14px;padding:14px">
    <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
     ${b.image?`<img src="${esc(b.image)}" style="width:94px;height:68px;object-fit:cover;border-radius:10px;border:1px solid rgba(212,175,55,0.3)" alt="إعلان">`:`''`}
     <div style="flex:1;min-width:200px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
       <strong style="color:#ffffff;font-size:14.5px">${esc(b.title)}</strong>
       <span class="${isJob?'vip-job-ad-badge':'badge'}" style="${isJob?'':'background:var(--vip-gold-gradient);color:#031711;font-size:10px;font-weight:bold'}">${esc(b.badge||(isJob?'💼 وظائف شاغرة':'★ عرض خاص'))}</span>
      </div>
      <small style="display:block;color:#cbd5e1;margin-top:4px">${esc(b.subtitle)}</small>
      ${isJob && (b.jobDepartment || b.jobSalary) ? `<div style="font-size:11.5px;color:#93c5fd;margin-top:4px">💼 القسم: <b>${esc(b.jobDepartment||'عام')}</b> · 💰 المزايا: <b>${esc(b.jobSalary||'راتب مجزٍ')}</b> · ⏰ الدوام: <b>${esc(b.jobType||'مرن')}</b></div>` : ''}
      <div style="display:flex;gap:10px;font-size:11px;color:#94a3b8;margin-top:6px;flex-wrap:wrap">
       <span>النوع: <b style="color:#7dd3fc">${isJob?'💼 إعلان وظائف':'✨ إعلان متحرك'}</b></span>
       <span>·</span>
       <span>الظهور: <b style="color:#fef08a">${b.placement==='Login'?'صفحة الدخول فقط':b.placement==='Home'?'الرئيسية فقط':'الدخول والرئيسية معاً'}</b></span>
       <span>·</span>
       <span>الحركة: <b style="color:#fef08a">${b.animation==='fade'?'تلاشي ناعم':b.animation==='zoom'?'تكبير سينمائي متحرك':'انزلاق سلس'}</b></span>
       <span>·</span>
       <span>الحالة: <b style="color:${b.active?'#22c55e':'#ef4444'}">${b.active?'نشط ومفعل':'معطل مؤقتاً'}</b></span>
      </div>
     </div>
     <div class="inline" style="gap:6px">
      <button class="btn small secondary" type="button" data-action="edit-banner" data-id="${esc(b.id)}">✏️ تعديل</button>
      <button class="btn small danger" type="button" data-action="delete-banner" data-id="${esc(b.id)}">🗑️ حذف</button>
     </div>
    </div>
   </article>`;
  }).join('')||'<p class="hint">لا توجد إعلانات بعد. اضغط «إضافة إعلان» للبدء.</p>'}
 </div>
 
 <button class="btn full secondary" type="button" data-action="close">إغلاق</button>
 </div>`);
}

function bannerEditor(id, defaultKind='promo'){
 const isJobPreset = defaultKind === 'job';
 const b = (Array.isArray(storeBanners)?storeBanners:[]).find(x=>x.id===id) || {
  title: isJobPreset ? '💼 إعلان توظيف: مطلوب مشرفو مبيعات وموظفو دعم فني ومناديب' : '',
  subtitle: isJobPreset ? 'انضم لفريق عمل المتجر برواتب مجزية وحوافز فورية وساعات عمل مرنة — قدّم طلبك الآن' : '',
  image: isJobPreset ? 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&auto=format&fit=crop&q=80',
  linkUrl: '',
  buttonText: isJobPreset ? '📝 قدّم على الوظيفة الآن' : 'اكتشف العرض الآن',
  bgColor: isJobPreset ? '#1e3a8a' : '#087e66',
  textColor: '#ffffff',
  placement: 'Both',
  animation: 'zoom',
  badge: isJobPreset ? '💼 وظائف شاغرة الآن' : '★ عرض خاص وحصري',
  bannerKind: defaultKind || 'promo',
  jobDepartment: isJobPreset ? 'الإشراف، خدمة العملاء، والتوصيل' : '',
  jobSalary: isJobPreset ? 'راتب ثابت + عمولات يومية مجزية' : '',
  jobType: isJobPreset ? 'دوام كامل أو مرن' : '',
  active: true,
  sortOrder: 0
 };
 
 const quickBannerImages = [
  ['بوتيك ملكي', 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&auto=format&fit=crop&q=80'],
  ['فريق عمل وتوظيف', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&auto=format&fit=crop&q=80'],
  ['مجوهرات وساعات', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1400&auto=format&fit=crop&q=80'],
  ['عطور ملكية', 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1400&auto=format&fit=crop&q=80'],
  ['قصر مذهّب VIP', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1400&auto=format&fit=crop&q=80'],
  ['تقنية وهواتف', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1400&auto=format&fit=crop&q=80']
 ];

 modal(id ? '✏️ تعديل الإعلان أو الوظيفة' : (isJobPreset ? '💼 إضافة إعلان وظائف وتوظيف جديد' : '✨ إضافة إعلان وبانر متحرك جديد'), `<form class="form" data-form="banner" data-id="${esc(id||'')}" style="max-height:78vh;overflow-y:auto;padding-left:4px">
 <div class="row">
  <label>نوع الإعلان
   <select name="bannerKind" id="banner-kind-sel">
    <option value="promo" ${b.bannerKind!=='job'?'selected':''}>✨ إعلان تسويقي / عرض متحرك جذاب</option>
    <option value="job" ${b.bannerKind==='job'?'selected':''}>💼 إعلان وظائف وتوظيف (مع نموذج تقديم مباشر)</option>
   </select>
  </label>
  <label>مكان ظهور الإعلان
   <select name="placement">
    <option value="Both" ${b.placement==='Both'?'selected':''}>⭐ في صفحة الدخول والصفحة الرئيسية معاً</option>
    <option value="Login" ${b.placement==='Login'?'selected':''}>🔐 صفحة تسجيل الدخول فقط</option>
    <option value="Home" ${b.placement==='Home'?'selected':''}>🛍️ الصفحة الرئيسية للمتجر فقط</option>
   </select>
  </label>
 </div>

 <label>عنوان الإعلان أو الوظيفة الرئيسي
  <input name="title" value="${esc(b.title)}" required minlength="2" maxlength="140" placeholder="مثال: مطلوب موظفو دعم فني ومشرفو مبيعات أو عروض الموسم">
 </label>
 <label>العنوان الفرعي أو تفاصيل الإعلان
  <input name="subtitle" value="${esc(b.subtitle)}" maxlength="240" placeholder="مثال: رواتب مجزية وحوافز يومية — قدّم الآن أو خصم 40% لفترة محدودة">
 </label>

 <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">
  <label>القسم / التخصص الوظيفي (للوظائف)
   <input name="jobDepartment" value="${esc(b.jobDepartment||'')}" placeholder="مثال: المبيعات، الدعم الفني، التوصيل">
  </label>
  <label>الراتب والمزايا (للوظائف)
   <input name="jobSalary" value="${esc(b.jobSalary||'')}" placeholder="مثال: راتب ثابت + عمولات فورية">
  </label>
  <label>نوع الدوام (للوظائف)
   <input name="jobType" value="${esc(b.jobType||'')}" placeholder="مثال: دوام كامل / مرن عن بُعد">
  </label>
 </div>
 
 <div class="row">
  <label>شارة الإعلان البارزة (Badge)
   <input name="badge" value="${esc(b.badge||'★ عرض خاص')}" maxlength="40" placeholder="مثال: 💼 وظائف شاغرة أو 🔥 خصم 40%">
  </label>
  <label>طريقة الحركة البصرية (Animation)
   <select name="animation">
    <option value="zoom" ${b.animation==='zoom'?'selected':''}>🔍 حركة سينمائية متكبرة (Ken Burns Motion)</option>
    <option value="slide" ${b.animation==='slide'?'selected':''}>↔️ انزلاق تلقائي سلس (Smooth Slide)</option>
    <option value="fade" ${b.animation==='fade'?'selected':''}>✨ تلاشي وتوهج ناعم (Soft Glow Fade)</option>
   </select>
  </label>
 </div>

 <div class="panel" style="padding:10px">
  <small style="color:#fef08a;display:block;margin-bottom:6px">🖼️ اختر صورة متحركة جاهزة بضغطة زر أو ارفع صورة من جهازك:</small>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
   ${quickBannerImages.map(([lbl, u]) => `<button type="button" class="btn small secondary" style="font-size:11px;padding:4px 8px" onclick="document.getElementById('banner-img-url').value='${u}';document.getElementById('banner-image-data').value='${u}';document.getElementById('banner-preview-box').innerHTML='<img src=\x22${u}\x22 style=\x22width:100%;max-height:150px;object-fit:cover;border-radius:12px\x22>';">${lbl}</button>`).join('')}
  </div>
  <label>أو ارفع صورة من جهازك (PNG / JPEG / WebP)
   <input type="file" id="banner-image" accept="image/png,image/jpeg,image/webp">
  </label>
  <label>أو ضع رابط صورة مباشرة
   <input name="imageUrl" id="banner-img-url" value="${esc(b.image)}" placeholder="https://images.unsplash.com/photo-...">
  </label>
  <input type="hidden" name="image" id="banner-image-data" value="${esc(b.image)}">
  <div id="banner-preview-box">
   ${b.image?`<img src="${esc(b.image)}" style="width:100%;max-height:150px;object-fit:cover;border-radius:12px;margin:6px 0;border:1px solid rgba(212,175,55,0.3)" alt="معاينة الإعلان">`:`''`}
  </div>
 </div>

 <div class="row">
  <label>لون خلفية الإعلان<input type="color" name="bgColor" value="${b.bgColor||'#087e66'}"></label>
  <label>لون نصوص الإعلان<input type="color" name="textColor" value="${b.textColor||'#ffffff'}"></label>
  <label>ترتيب العرض<input type="number" name="sortOrder" value="${b.sortOrder||0}" min="0"></label>
 </div>

 <div class="row">
  <label>نص الزر التفاعلي<input name="buttonText" value="${esc(b.buttonText||'اكتشف الآن')}" maxlength="40"></label>
  <label>الرابط أو القسم الموجه إليه<input name="linkUrl" value="${esc(b.linkUrl||'الكل')}" placeholder="الكل أو اسم القسم"></label>
 </div>

 <label class="check">
  <input type="checkbox" name="active" ${b.active?'checked':''}> <strong>تفعيل الإعلان فوراً وعرضه في المتجر وشاشة الدخول</strong>
 </label>

 <button class="btn full" type="submit">💾 حفظ الإعلان وتطبيقه فوراً</button>
 <div class="form-error" hidden></div>
 </form>`);

 const fileInput = document.getElementById('banner-image');
 if(fileInput){
  fileInput.onchange = async () => {
   const file = fileInput.files?.[0];
   if(!file) return;
   try {
    const dataUrl = await normalizeImage(file, 1200, 1500000);
    document.getElementById('banner-image-data').value = dataUrl;
    document.getElementById('banner-preview-box').innerHTML = `<img src="${dataUrl}" style="width:100%;max-height:150px;object-fit:cover;border-radius:12px;margin:6px 0;border:1px solid rgba(212,175,55,0.3)" alt="معاينة الصورة">`;
   } catch(e){ toast(e.message || 'تعذر قراءة الصورة'); }
  };
 }
 const urlInput = document.getElementById('banner-img-url');
 if(urlInput){
  urlInput.oninput = () => {
   const url = urlInput.value.trim();
   if(url){
    document.getElementById('banner-image-data').value = url;
    document.getElementById('banner-preview-box').innerHTML = `<img src="${url}" style="width:100%;max-height:150px;object-fit:cover;border-radius:12px;margin:6px 0;border:1px solid rgba(212,175,55,0.3)" alt="معاينة الصورة">`;
   }
  };
 }
}
// Detailed Staff Management (تطوير وإدارة عمال المتجر تفصيلياً)
async function staffManager(){
 const list=await request('/staff');
 modal('إدارة طاقم وعمال المتجر بالتفصيل',`<div class="stack">
 <div class="section-head">
  <div><p>سجل تفصيلي لكافة العاملين، المسميات الوظيفية، الرواتب، وساعات العمل.</p></div>
  <button class="btn" data-action="new-staff">+ إضافة عامل جديد</button>
 </div>
 ${list.map(s=>`<article class="ticket-card" style="border-right:5px solid ${s.status==='Active'?'var(--green)':s.status==='OnLeave'?'var(--orange)':'var(--red)'}">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
   <div>
    <strong>${esc(s.fullName)}</strong> · <span class="badge ${s.status==='Active'?'Ready':s.status==='OnLeave'?'Assigned':'Cancelled'}">${s.status==='Active'?'على رأس العمل':s.status==='OnLeave'?'إجازة':'منتهي'}</span>
    <p style="font-size:12px;color:var(--muted);margin-top:4px">${esc(s.jobTitle)} · قسم ${esc(s.department)}</p>
   </div>
   <div style="text-align:left">
    <strong style="color:var(--green)">${money(s.monthlySalary)} ${currencyLabel(commerce.currency)}</strong>
    <small style="display:block;color:var(--muted)">${esc(s.shift)} (${esc(s.workingHours)})</small>
   </div>
  </div>
  <div class="hint" style="margin-top:8px">
   <span>📞 ${esc(s.phone)}</span> ${s.nationalId?` · <span>🪪 الهوية: ${esc(s.nationalId)}</span>`:''} ${s.address?` · <span>📍 العنوان: ${esc(s.address)}</span>`:''}
  </div>
  ${s.notes?`<p style="font-size:11px;background:var(--paper);padding:8px;border-radius:8px;margin-top:8px">${esc(s.notes)}</p>`:''}
  <div class="order-actions" style="margin-top:10px">
   <button class="btn small secondary" data-action="edit-staff" data-id="${esc(s.id)}">تعديل الملف</button>
   <button class="btn small danger" data-action="delete-staff" data-id="${esc(s.id)}">حذف العامل</button>
  </div>
 </article>`).join('')||'<p class="hint">لا يوجد عمال مسجلون حالياً. اضغط «إضافة عامل جديد» لتوثيق ملف أول موظف.</p>'}
 </div>`);
}
function staffEditor(id){
 const s=(dashboard?.staff||[]).find(x=>x.id===id)||{fullName:'',jobTitle:'مسؤول تجهيز وتغليف',department:'العمليات والمخزن',phone:'',nationalId:'',shift:'صباحي',workingHours:'8 ساعات',monthlySalary:0,status:'Active',notes:'',address:''};
 modal(id?'تعديل ملف العامل':'إضافة عامل جديد للمتجر',`<form class="form" data-form="staff" data-id="${esc(id||'')}">
 <label>الاسم الكامل للعامل<input name="fullName" value="${esc(s.fullName)}" required minlength="2" maxlength="100" placeholder="الاسم الثلاثي أو الرباعي"></label>
 <div class="row">
  <label>المسمى الوظيفي<input name="jobTitle" value="${esc(s.jobTitle)}" required maxlength="80" placeholder="مثال: مسؤول مخزون / كاشير / تغليف"></label>
  <label>القسم<select name="department">${['العمليات والمخزن','خدمة العملاء','المبيعات والتسويق','التوصيل والشحن','الإدارة والمالية'].map(d=>`<option value="${d}" ${s.department===d?'selected':''}>${d}</option>`).join('')}</select></label>
 </div>
 <div class="row">
  <label>رقم الهاتف للتواصل<input name="phone" type="tel" value="${esc(s.phone)}" required dir="ltr" placeholder="05xxxxxxxx"></label>
  <label>رقم الهوية / الإقامة<input name="nationalId" value="${esc(s.nationalId)}" dir="ltr" placeholder="رقم الهوية الوطنية أو الإقامة"></label>
 </div>
 <div class="row">
  <label>الوردية (الدوام)<select name="shift">${[['صباحي','صباحي (8 ص - 4 م)'],['مسائي','مسائي (4 م - 12 ص)'],['مرن','مرن / دوام جزئي']].map(([v,t])=>`<option value="${v}" ${s.shift===v?'selected':''}>${t}</option>`).join('')}</select></label>
  <label>ساعات العمل اليومية<input name="workingHours" value="${esc(s.workingHours)}" placeholder="مثال: 8 ساعات / 6 ساعات"></label>
 </div>
 <div class="row">
  <label>الراتب الشهري (${commerce.currency})<input name="monthlySalary" type="number" min="0" step="any" value="${s.monthlySalary}"></label>
  <label>حالة العمل<select name="status">${[['Active','على رأس العمل'],['OnLeave','في إجازة'],['Terminated','منتهي التعاقد']].map(([v,t])=>`<option value="${v}" ${s.status===v?'selected':''}>${t}</option>`).join('')}</select></label>
 </div>
 <label>العنوان ومكان السكن<input name="address" value="${esc(s.address)}" placeholder="المدينة، الحي"></label>
 <label>ملاحظات وسجل الأداء<textarea name="notes" maxlength="1000" placeholder="المهام الموكلة، تقييم الأداء، أو أية تفاصيل أخرى">${esc(s.notes)}</textarea></label>
 <button class="btn full" type="submit">حفظ ملف العامل</button>
 <div class="form-error" hidden></div></form>`);
}

function inferNoticeTargetPage(n){
 const txt = ((n?.title||'') + ' ' + (n?.message||'')).toLowerCase();
 if(txt.includes('شكوى') || txt.includes('بلاغ') || txt.includes('مصعّدة') || txt.includes('دعم')) return 'support';
 if(txt.includes('غرامة') || txt.includes('مندوب')) return user?.role==='Courier' ? 'home' : 'couriers';
 if(txt.includes('طلب') || txt.includes('شحنة') || txt.includes('توصيل') || txt.includes('دفع')) return 'orders';
 if(txt.includes('تسجيل') || txt.includes('تنشيط') || txt.includes('كلمة المرور') || txt.includes('مستخدم')) return ['Admin','Supervisor'].includes(user?.role) ? 'users' : 'account';
 if(txt.includes('جهاز') || txt.includes('خريطة')) return 'devices';
 return 'home';
}
async function noticesCenter(){
 await updateNotices();
 const isAdminOrSup = user && (user.role === 'Admin' || user.role === 'Supervisor' || (typeof has === 'function' && has('notices.manage')));
 const vStyle = localStorage.getItem('ts-notice-visual-style') || dashboard?.notificationCenter?.visualStyle || 'royal-gold';
 modal('🔔 مركز الإشعارات الموحد والنغمات والمؤقت التلقائي',`<div class="stack" style="max-height:76vh;overflow-y:auto;padding-left:4px">
  ${isAdminOrSup ? `
  <div style="display:flex;gap:8px;flex-wrap:wrap;padding:10px;border-radius:12px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.4)">
   <button type="button" class="btn small" data-action="compose-notice">📣 إرسال إشعار فوري أو ضبط مؤقت تلقائي</button>
   <button type="button" class="btn small secondary" data-action="notification-style">🎵 نغمات وشكل الإشعارات</button>
   <button type="button" class="btn small ghost" data-action="test-phone-notification">📲 تجربة إشعار حي</button>
  </div>` : `
  <div class="inline" style="justify-content:space-between">
   <button type="button" class="btn small secondary" data-action="notification-style">🎵 نغمة وشكل الإشعارات</button>
   <button type="button" class="btn small" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold" data-action="test-phone-notification">📲 تجربة إشعار على الجوال</button>
  </div>`}
  <p class="hint" style="margin:0">اضغط على أي إشعار للانتقال مباشرة إلى القسم المرتبط به:</p>
  ${noticeCache.map(n => {
   const target = inferNoticeTargetPage(n);
   return `<article class="ticket-message notice-style-${esc(vStyle)} ${n.read?'':'notice-unread'}" style="cursor:pointer" data-action="open-notice-target" data-id="${esc(n.id)}" data-target="${esc(target)}">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
     <h3 style="margin:0;color:#fef08a">${esc(n.title)}</h3>
     <span class="badge Ready" style="font-size:10px">انتقال مباشر ⬅</span>
    </div>
    <p style="margin:6px 0;color:#f8fafc">${esc(n.message)}</p>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
     <small style="color:#cbd5e1">${new Date(n.at).toLocaleString('ar-SA')} ${n.read?'· مقروء':'· 🟢 جديد'}</small>
     ${!n.read ? `<button class="btn small secondary" type="button" data-action="read-notice" data-id="${esc(n.id)}">تحديد كمقروء</button>` : ''}
    </div>
   </article>`;
  }).join('') || '<p class="hint">لا توجد إشعارات لك بعد.</p>'}
 </div>`);
}

async function composeNotice(){
 let sent = [];
 let scheduled = dashboard?.scheduledNotices || [];
 let ncSettings = dashboard?.notificationCenter || { defaultTone: activeChimeType || 'gold-chime', visualStyle: localStorage.getItem('ts-notice-visual-style')||'royal-gold', autoTimerEnabled: true };
 try {
  if(apiBase){
   const [sRes, ncRes] = await Promise.all([
    request('/notifications/sent').catch(()=>[]),
    request('/admin/notification-center').catch(()=>null)
   ]);
   if(Array.isArray(sRes)) sent = sRes;
   if(ncRes){
    scheduled = ncRes.scheduled || [];
    ncSettings = ncRes.settings || ncSettings;
   }
  } else {
   const d = demoData();
   sent = d.notifications || [];
   scheduled = d.scheduledNotices || [];
  }
 } catch(e){}

 modal('🔔 المركز الشامل للإشعارات، النغمات، الشكل، والمؤقت التلقائي', `<div class="stack" style="max-height:78vh;overflow-y:auto;padding-left:4px">
  <!-- 1. ضبط نغمات وشكل الإشعارات الموحد -->
  <form class="form panel" data-form="save-notification-center-all" style="padding:14px">
   <strong style="color:#fef08a;font-size:14px">🎵 1. ضبط نغمات الإشعارات وشكل بطاقة الإشعار:</strong>
   <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px">
    <label>نغمة الإشعار الافتراضية
     <select name="defaultTone" id="sel-chime-type">
      <option value="gold-chime" ${ncSettings.defaultTone==='gold-chime'?'selected':''}>🔔 رنين ذهبي فاخر</option>
      <option value="crystal-bell" ${ncSettings.defaultTone==='crystal-bell'?'selected':''}>💎 جرس كريستال ناعم</option>
      <option value="royal-harp" ${ncSettings.defaultTone==='royal-harp'?'selected':''}>🎵 نغمة ملكية ثلاثية</option>
      <option value="urgent-radar" ${ncSettings.defaultTone==='urgent-radar'?'selected':''}>🚨 تنبيه رادار سريع للطلبات</option>
      <option value="soft-pop" ${ncSettings.defaultTone==='soft-pop'?'selected':''}>✨ نقرة هادئة سريعة</option>
     </select>
    </label>
    <label>شكل وتصميم بطاقة الإشعار
     <select name="visualStyle">
      <option value="royal-gold" ${ncSettings.visualStyle==='royal-gold'?'selected':''}>👑 ذهبي ملكي فاخر</option>
      <option value="neon-emerald" ${ncSettings.visualStyle==='neon-emerald'?'selected':''}>💚 زمردي نيون مضيء</option>
      <option value="glass-modern" ${ncSettings.visualStyle==='glass-modern'?'selected':''}>💎 زجاجي سماوي حديث</option>
      <option value="urgent-crimson" ${ncSettings.visualStyle==='urgent-crimson'?'selected':''}>🔥 أحمر عاجل ومهم</option>
     </select>
    </label>
   </div>
   <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
    <button type="button" class="btn small secondary" data-action="preview-selected-chime">🔊 سماع ومعاينة النغمة</button>
    <button type="submit" class="btn small">💾 حفظ النغمة والشكل</button>
   </div>
  </form>

  <!-- 2. ضبط مؤقت لإرسال إشعارات تلقائية في أوقات معينة -->
  <form class="form panel" data-form="schedule-auto-notice" style="padding:14px;border:1px solid rgba(56,189,248,0.4)">
   <strong style="color:#7dd3fc;font-size:14px">⏱️ 2. ضبط مؤقت لإرسال إشعارات في أوقات معينة تلقائياً:</strong>
   <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">
    <label>الفئة المستهدفة
     <select name="audience">
      <option value="All">جميع الحسابات الفعالة</option>
      <option value="Customer">جميع العملاء</option>
      <option value="Courier">جميع مندوبي التوصيل</option>
      <option value="Merchant">جميع التجار</option>
      <option value="Supervisor">جميع المشرفين</option>
     </select>
    </label>
    <label>الإرسال التلقائي بعد (بالدقائق)
     <input name="delayMinutes" type="number" min="0" max="10080" value="5" placeholder="مثال: 5 دقائق">
    </label>
    <label>أو حدد تاريخ ووقت الإرسال الدقيق
     <input name="sendAtIso" type="datetime-local" dir="ltr">
    </label>
    <label>تكرار المؤقت التلقائي
     <select name="repeatMode">
      <option value="once">إرسال مرة واحدة في الوقت المحدد</option>
      <option value="hourly">تلقائياً كل ساعة 🔁</option>
      <option value="daily">تلقائياً كل يوم في نفس الموعد 📅</option>
     </select>
    </label>
   </div>
   <div class="row">
    <label>عنوان الإشعار المجدول<input name="title" required placeholder="مثال: عروض المساء الملكية بدأت الآن!"></label>
    <label>نص الإشعار التلقائي<input name="message" required placeholder="مثال: استمتع بخصومات حصرية وتوصيل فوري..."></label>
   </div>
   <button class="btn small" type="submit" style="background:linear-gradient(135deg,#0284c7,#1d4ed8);color:#fff">⏱️ حفظ وتفعيل المؤقت التلقائي للإشعار</button>
  </form>

  <!-- قائمة المؤقتات المجدولة -->
  ${scheduled.length ? `
  <div class="panel" style="padding:12px">
   <strong style="color:#fef08a;font-size:13.5px;display:block;margin-bottom:8px">📋 المؤقتات التلقائية المجدولة (${scheduled.length}):</strong>
   <div style="display:grid;gap:8px">
    ${scheduled.map(sn => `
     <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.25)">
      <div>
       <strong style="color:#fff;font-size:13px">⏱️ ${esc(sn.title)}</strong>
       <span class="badge ${sn.active?'Ready':'Cancelled'}" style="font-size:10px">${sn.active?'نشط بالانتظار':'تم الإرسال'} (${sn.repeatMode==='daily'?'يومياً':sn.repeatMode==='hourly'?'كل ساعة':'مرة واحدة'})</span>
       <div style="font-size:11.5px;color:#cbd5e1;margin-top:3px">${esc(sn.message)} · الموعد: ${sn.sendAtUtc ? new Date(sn.sendAtUtc).toLocaleString('ar-SA') : '-'} · أُرسل (${sn.sentCount||0}) مرة</div>
      </div>
      <div class="inline" style="gap:6px">
       <button type="button" class="btn small secondary" data-action="trigger-scheduled-notice" data-id="${esc(sn.id)}">🚀 إرسال الآن</button>
       <button type="button" class="btn small danger" data-action="delete-scheduled-notice" data-id="${esc(sn.id)}">🗑️ حذف</button>
      </div>
     </div>
    `).join('')}
   </div>
  </div>` : ''}

  <!-- 3. إرسال إشعار فوري -->
  <form class="form panel" data-form="compose-notice" style="padding:14px">
   <strong style="color:#4ade80;font-size:14px">📣 3. إرسال إشعار فوري مباشر الآن:</strong>
   <div class="row">
    <label>المستلمون<select name="audience"><option value="Customer">جميع العملاء</option><option value="Courier">جميع مندوبي التوصيل</option><option value="Merchant">جميع التجار</option><option value="All">جميع الحسابات الفعالة</option><option value="Public">📲 جميع التطبيقات المثبتة</option>${dashboard?.users?.length?'<option value="User">حساب محدد</option>':''}</select></label>
    ${dashboard?.users?.length?`<label>الحساب عند اختيار «حساب محدد»<select name="userId">${dashboard.users.filter(u=>u.active).map(u=>`<option value="${esc(u.id)}">${esc(u.name)} · ${roles[u.role]||u.role}</option>`).join('')}</select></label>`:`''`}
   </div>
   <label>عنوان الإشعار الفوري<input name="title" required minlength="2" maxlength="100"></label>
   <label>نص الرسالة<textarea name="message" required minlength="2" maxlength="1000" rows="2"></textarea></label>
   <button class="btn" type="submit">🚀 إرسال الإشعار الفوري الآن</button>
   <div class="form-error" hidden></div>
  </form>

  <h3 style="margin:4px 0">📜 سجل الإشعارات المرسلة (${sent.length})</h3>
  ${sent.slice(0, 20).map(n=>`<article class="ticket-message"><strong>${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${({Customer:'العملاء',Courier:'المناديب',Merchant:'التجار',All:'الجميع',Public:'التطبيقات المثبتة',User:'حساب محدد'})[n.audience]||n.audience||'الجميع'} · ${n.sentCount||1} مستلم · ${new Date(n.at).toLocaleString('ar-SA')}</small></article>`).join('')||'<p class="hint">لم ترسل رسائل بعد.</p>'}
 </div>`);
}
async function appearanceAction(name,id,el){
 if(name==='appearance'){appearanceEditor();return true;}
 if(name==='app-icon-bubbles'){appIconAndBubblesModal();return true;}
 if(name==='store-styles-studio'){await storeStylesStudioModal();return true;}
 if(name==='pick-app-icon-preset'){
  const p = appIconPresets[Number(id)||0];
  if(p){
   draftLogo = renderPresetIconPng(p.emoji, p.bg);
   const pv = document.getElementById('icon-bubble-preview');
   if(pv) pv.src = draftLogo;
   document.querySelectorAll('.icon-preset-btn').forEach((b,i)=>b.classList.toggle('active', i===Number(id)));
   toast('تم اختيار أيقونة: ' + p.label + ' — اضغط حفظ للتطبيق');
  }
  return true;
 }
 if(name==='pick-btn-texture'){
  const bt = btnImageTextures[Number(id)||0];
  if(bt){
   studioBtnStyle = bt.style;
   studioBtnImg = bt.img || '';
   const uIn = document.getElementById('studio-btn-img-url');
   if(uIn) uIn.value = studioBtnImg;
   document.querySelectorAll('.design-wp-item').forEach((b,i)=>b.classList.toggle('active', i===Number(id)));
   toast('تم اختيار نمط الأزرار: ' + bt.name);
  }
  return true;
 }
 if(name==='apply-saved-style'){
  const raw = (!demo && apiBase) ? await request('/admin/styles') : (demoData().savedStyles||[]);
  const list = Array.isArray(raw) ? raw : [];
  const st = list.find(x=>x.id===id);
  if(st){
   storeAppearance = { ...storeAppearance, primary: st.primary, bubbleOutgoingBg: st.bubbleOutgoingBg, bubbleIncomingBg: st.bubbleIncomingBg, bubbleTextColor: st.bubbleTextColor, buttonStyle: st.buttonStyle, buttonBgImage: st.buttonBgImage };
   if(apiBase){
    await request('/appearance', 'PUT', { ...storeAppearance, logo: storeAppearance.logo || '' });
   }
   paintAppearance();
   closeModal();
   toast('تم تطبيق الاستايل المحفوظ: ' + st.name);
  }
  return true;
 }
 if(name==='delete-saved-style'){
  if(!apiBase){
   const d = demoData(); d.savedStyles = (d.savedStyles||[]).filter(x=>x.id!==id); persistDemo(d);
  } else {
   await request('/admin/styles/' + id, 'DELETE');
  }
  await storeStylesStudioModal();
  toast('تم حذف الاستايل');
  return true;
 }
 if(name==='remove-store-image'){draftLogo='';appearancePreview();return true;}
 if(name==='reset-appearance'){const f=$('[data-form="appearance"]');for(const key of ['primary','background','ink','font','storeName','subtitle','announcement'])if(f.elements[key])f.elements[key].value=defaultAppearance[key]||'';draftLogo='';appearancePreview();return true;}
 if(name==='banners-manager'){await bannersManager();return true;}
 if(name==='new-banner'){bannerEditor(null,'promo');return true;}
 if(name==='new-job-banner'){bannerEditor(null,'job');return true;}
 if(name==='edit-banner'){bannerEditor(id);return true;}
 if(name==='delete-banner'){await request('/banners/'+id,'DELETE');await refreshBanners();await bannersManager();toast('تم حذف الإعلان');return true;}
 if(name==='staff-manager'){await staffManager();return true;}
 if(name==='new-staff'){staffEditor();return true;}
 if(name==='edit-staff'){staffEditor(id);return true;}
 if(name==='delete-staff'){await request('/staff/'+id,'DELETE');await refresh();await staffManager();toast('تم حذف ملف العامل');return true;}
 if(name==='notices'){await noticesCenter();return true;}
 if(name==='enable-notifications'||name==='test-phone-notification'){await requestMobileNotificationPermission();return true;}
 if(name==='notification-style'){notificationStyleModal();return true;}
 if(name==='preview-selected-chime'){
  const sel = document.getElementById('sel-chime-type');
  playSelectedNotificationChime(sel ? sel.value : activeChimeType);
  toast('تم تشغيل معاينة نغمة التنبيه');
  return true;
 }
 if(name==='compose-notice'){await composeNotice();return true;}
 if(name==='delete-scheduled-notice'){
  if(!apiBase){
   const d = demoData(); d.scheduledNotices = (d.scheduledNotices||[]).filter(x => x.id !== id); persistDemo(d);
   if(dashboard) dashboard.scheduledNotices = d.scheduledNotices;
  } else {
   await request('/admin/scheduled-notices/' + id, 'DELETE');
  }
  await composeNotice();
  toast('🗑️ تم حذف المؤقت المجدول');
  return true;
 }
 if(name==='trigger-scheduled-notice'){
  if(!apiBase){
   const d = demoData(); const sn = (d.scheduledNotices||[]).find(x => x.id === id);
   if(sn){ sn.sentCount = (sn.sentCount||0)+1; d.notifications.unshift({ id:'n_'+Date.now(), title:sn.title, message:sn.message, audience:sn.audience, at:new Date().toISOString() }); persistDemo(d); }
  } else {
   await request('/admin/scheduled-notices/' + id + '/trigger-now', 'POST', {});
  }
  playSelectedNotificationChime();
  await composeNotice();
  toast('🚀 تم إرسال الإشعار المجدول فوراً لجميع المستهدفين');
  return true;
 }
 if(name==='read-notice'){await request('/notifications/'+id+'/read','PUT');await noticesCenter();return true;}
 if(name==='open-notice-target'){
  const target = arguments[2]?.dataset?.target || 'home';
  try { await request('/notifications/'+id+'/read','PUT'); await updateNotices(); } catch(e){}
  closeModal();
  page = target;
  render();
  return true;
 }
 return false;
}

async function appearanceForm(kind,id,f,form){
 if(kind==='save-notification-center-all'){
  activeChimeType = f.defaultTone || 'gold-chime';
  localStorage.setItem('ts-notification-chime', activeChimeType);
  localStorage.setItem('ts-notice-visual-style', f.visualStyle || 'royal-gold');
  const payload = { defaultTone: activeChimeType, visualStyle: f.visualStyle || 'royal-gold', popupEnabled: true, soundEnabled: true, autoTimerEnabled: true };
  if(dashboard) dashboard.notificationCenter = payload;
  if(apiBase) await request('/admin/notification-center/settings', 'PUT', payload);
  playSelectedNotificationChime(activeChimeType);
  toast('✅ تم حفظ نغمة وشكل الإشعارات الموحد');
  return true;
 }
 if(kind==='schedule-auto-notice'){
  const payload = {
   title: f.title,
   message: f.message,
   audience: f.audience || 'All',
   delayMinutes: Number(f.delayMinutes)||0,
   sendAtIso: f.sendAtIso || null,
   repeatMode: f.repeatMode || 'once',
   tone: activeChimeType || 'gold-chime',
   visualStyle: localStorage.getItem('ts-notice-visual-style') || 'royal-gold'
  };
  if(!apiBase){
   const d = demoData(); d.scheduledNotices = d.scheduledNotices || [];
   const sendAt = f.sendAtIso ? new Date(f.sendAtIso).toISOString() : new Date(Date.now() + (Number(f.delayMinutes)||0)*60000).toISOString();
   d.scheduledNotices.unshift({ id:'sn_'+Date.now(), ...payload, sendAtUtc: sendAt, active: true, sentCount: 0, createdAt: new Date().toISOString() });
   persistDemo(d);
   if(dashboard) dashboard.scheduledNotices = d.scheduledNotices;
  } else {
   await request('/admin/scheduled-notices', 'POST', payload);
  }
  await composeNotice();
  toast('⏱️ تم ضبط وتفعيل المؤقت التلقائي لإرسال الإشعار بنجاح!');
  return true;
 }
 if(kind==='save-notification-style'){
  activeChimeType = f.chime || 'gold-chime';
  activeVibeType = f.vibration || 'standard';
  localStorage.setItem('ts-notification-chime', activeChimeType);
  localStorage.setItem('ts-notification-vibe', activeVibeType);
  closeModal();
  playSelectedNotificationChime();
  toast('تم حفظ نغمة وشكل إشعارات التطبيق بنجاح');
  return true;
 }
 if(kind==='save-icon-bubbles'){
  const payload = {
   ...storeAppearance,
   primary: f.primary || storeAppearance.primary,
   bubbleOutgoingBg: f.bubbleOutgoingBg || '#005c4b',
   bubbleIncomingBg: f.bubbleIncomingBg || '#202c33',
   bubbleTextColor: f.bubbleTextColor || '#ffffff',
   logo: draftLogo || storeAppearance.logo || ''
  };
  storeAppearance = await request('/appearance', 'PUT', payload);
  closeModal();
  paintAppearance();
  toast('تم تحديث أيقونة التطبيق وألوان وفقاعات الرسائل بنجاح!');
  return true;
 }
 if(kind==='save-store-style'){
  const btnImg = (f.buttonBgImage ?? studioBtnImg ?? '').trim();
  const bStyle = btnImg ? 'custom-img' : studioBtnStyle;
  const stPayload = {
   name: f.name,
   primary: f.primary || storeAppearance.primary,
   bubbleOutgoingBg: f.bubbleOutgoingBg || storeAppearance.bubbleOutgoingBg || '#005c4b',
   bubbleIncomingBg: storeAppearance.bubbleIncomingBg || '#202c33',
   bubbleTextColor: storeAppearance.bubbleTextColor || '#ffffff',
   buttonStyle: bStyle,
   buttonBgImage: btnImg,
   buttonIcon: '',
   backgroundImage: '',
   applyNow: true
  };
  if(!apiBase){
   const d = demoData(); d.savedStyles = d.savedStyles || [];
   d.savedStyles.unshift({ id:'st_'+Date.now(), ...stPayload, updatedAt:new Date().toISOString() });
   persistDemo(d);
  } else {
   await request('/admin/styles', 'POST', stPayload);
   await refreshAppearance();
  }
  storeAppearance = { ...storeAppearance, primary: stPayload.primary, bubbleOutgoingBg: stPayload.bubbleOutgoingBg, buttonStyle: bStyle, buttonBgImage: btnImg };
  paintAppearance();
  await storeStylesStudioModal();
  toast('تم حفظ الاستايل وتطبيقه على المتجر بنجاح!');
  return true;
 }
 if(kind==='appearance'){
  if(imageLoading)throw new Error('انتظر اكتمال تجهيز الصورة');
  storeAppearance=await request('/appearance','PUT',{...storeAppearance,storeName:f.storeName,subtitle:f.subtitle,loadingTitle:f.loadingTitle||f.storeName||'التسوق',loadingSubtitle:f.loadingSubtitle||'نجهّز لك تجربة أجمل…',primary:f.primary,background:f.background,ink:f.ink,font:f.font,logo:draftLogo,announcement:f.announcement||'',announcementActive:f.announcementActive==='on'});
  try {
   localStorage.setItem('ts-loading-title', f.loadingTitle||f.storeName||'التسوق');
   localStorage.setItem('ts-loading-sub', f.loadingSubtitle||'نجهّز لك تجربة أجمل…');
  } catch(e){}
  if(typeof saveAdminLocalCloudSnapshot==='function')saveAdminLocalCloudSnapshot();closeModal();paintAppearance();toast('تم تطبيق شكل وهوية المتجر والأيقونة الجديدة بنجاح');return true;
 }
 if(kind==='banner'){
  await request('/banners'+(id?'/'+id:''),id?'PUT':'POST',{...f,sortOrder:Number(f.sortOrder||0),active:f.active==='on'});
  await refreshBanners();if(typeof saveAdminLocalCloudSnapshot==='function')saveAdminLocalCloudSnapshot();closeModal();await bannersManager();toast('تم حفظ الإعلان بنجاح');return true;
 }
 if(kind==='staff'){
  await request('/staff'+(id?'/'+id:''),id?'PUT':'POST',{...f,monthlySalary:Number(f.monthlySalary||0)});
  await refresh();closeModal();await staffManager();toast('تم حفظ ملف العامل بنجاح');return true;
 }
 if(kind==='compose-notice'){const result=await request('/notifications','POST',f);await composeNotice();toast('تم الإرسال إلى '+result.sentCount+' حساب');return true;}
 return false;
}

function appearanceDemo(path,method,body){
 const d=demoData();d.appearance??={...defaultAppearance};d.notifications??=[];d.banners??=[];d.staff??=[];
 const save=v=>{persistDemo(d);return v;};
 if(path==='/appearance'){if(method==='PUT')d.appearance=body;return method==='PUT'?save(d.appearance):d.appearance;}
 if(path==='/admin/styles'&&method==='GET'){d.savedStyles??=[];return d.savedStyles;}
 if(path==='/admin/styles'&&method==='POST'){d.savedStyles??=[];const st={id:'st_'+Date.now(),...body,updatedAt:new Date().toISOString()};d.savedStyles.unshift(st);return save(st);}
 if(path.startsWith('/admin/styles/')&&method==='DELETE'){d.savedStyles=(d.savedStyles||[]).filter(x=>x.id!==path.split('/')[3]);return save({ok:true});}
 if(path==='/banners'){return d.banners.filter(b=>b.active);}
 if(path==='/banners/all'){return d.banners;}
 if(path==='/banners'&&method==='POST'){const b={...body,id:crypto.randomUUID()};d.banners.push(b);return save(b);}
 if(path.startsWith('/banners/')&&method==='PUT'){const b=d.banners.find(x=>x.id===path.split('/')[2]);Object.assign(b,body);return save(b);}
 if(path.startsWith('/banners/')&&method==='DELETE'){d.banners=d.banners.filter(x=>x.id!==path.split('/')[2]);return save({ok:true});}
 if(path==='/staff'&&method==='GET'){return d.staff;}
 if(path==='/staff'&&method==='POST'){const s={...body,id:crypto.randomUUID(),createdAt:new Date().toISOString()};d.staff.push(s);return save(s);}
 if(path.startsWith('/staff/')&&method==='PUT'){const s=d.staff.find(x=>x.id===path.split('/')[2]);Object.assign(s,body);return save(s);}
 if(path.startsWith('/staff/')&&method==='DELETE'){d.staff=d.staff.filter(x=>x.id!==path.split('/')[2]);return save({ok:true});}
 if(path==='/notifications/sent')return d.notifications.map(n=>({...n,sentCount:n.recipients.length,readCount:n.readBy.length}));
 if(path==='/notifications'){if(method==='GET')return d.notifications.filter(n=>n.recipients.includes(user.id)).map(n=>({...n,read:n.readBy.includes(user.id)}));const n={id:crypto.randomUUID(),...body,at:new Date().toISOString(),recipients:d.users.filter(u=>u.active&&(body.audience==='All'||body.audience==='User'&&u.id===body.userId||u.role===body.audience)).map(u=>u.id),readBy:[]};d.notifications.unshift(n);return save({id:n.id,sentCount:n.recipients.length});}
 if(path.startsWith('/notifications/')&&path.endsWith('/read')){const n=d.notifications.find(n=>n.id===path.split('/')[2]);if(!n.readBy.includes(user.id))n.readBy.push(user.id);return save({ok:true});}
 return undefined;
}


/* ========================================================
   Public Installed-App Notifications (Even Before Login)
   ======================================================== */
const seenPublicNoticeIds = new Set(JSON.parse(localStorage.getItem('ts-seen-public-notices') || '[]'));
let publicNoticeInitialized = seenPublicNoticeIds.size > 0;
async function pollPublicInstalledNotices(){
 if(!apiBase) return;
 try {
  const res = await fetch(apiBase + '/api/notifications/public', { cache: 'no-store' });
  if(!res.ok) return;
  const list = await res.json();
  if(!Array.isArray(list)) return;
  let changed = false;
  for(const n of list){
   if(!seenPublicNoticeIds.has(n.id)){
    seenPublicNoticeIds.add(n.id);
    changed = true;
    if(publicNoticeInitialized){
     if(typeof triggerMobileNotification === 'function') triggerMobileNotification(n.title, n.message);
     if(typeof toast === 'function') toast(`🔔 ${n.title}: ${n.message}`);
    }
   }
  }
  publicNoticeInitialized = true;
  if(changed) localStorage.setItem('ts-seen-public-notices', JSON.stringify([...seenPublicNoticeIds].slice(-80)));
 } catch(e){}
}
setInterval(() => { if(!document.hidden) pollPublicInstalledNotices(); }, 8000);
setTimeout(pollPublicInstalledNotices, 2500);


/* ========================================================
   App Icon Studio + Message Bubble Colors + Store Styles Studio
   ======================================================== */
const appIconPresets = [
 { emoji:'🛍️', label:'حقيبة فاخرة', bg:'#064e3b' },
 { emoji:'👑', label:'تاج ملكي', bg:'#1e1b4b' },
 { emoji:'💎', label:'ألماس', bg:'#0f172a' },
 { emoji:'⭐', label:'نجمة ذهبية', bg:'#422006' },
 { emoji:'🛒', label:'سلة تسوق', bg:'#065f46' },
 { emoji:'🎁', label:'هدية فاخرة', bg:'#881337' },
 { emoji:'⌚', label:'ساعة كلاسيك', bg:'#18181b' },
 { emoji:'💍', label:'خاتم ذهب', bg:'#3b0764' },
 { emoji:'🕶️', label:'نظارة فخمة', bg:'#0c4a6e' },
 { emoji:'👠', label:'أزياء نسائية', bg:'#701a75' },
 { emoji:'👔', label:'أزياء رجالية', bg:'#1e293b' },
 { emoji:'🧴', label:'عطور فاخرة', bg:'#3f6212' },
 { emoji:'📱', label:'إلكترونيات', bg:'#172554' },
 { emoji:'💻', label:'تقنية', bg:'#0f766e' },
 { emoji:'🚚', label:'توصيل سريع', bg:'#7c2d12' },
 { emoji:'⚡', label:'توصيل برق', bg:'#713f12' },
 { emoji:'🏪', label:'متجر رسمي', bg:'#042f24' },
 { emoji:'🛡️', label:'متجر موثوق', bg:'#1e3a8a' },
 { emoji:'🌟', label:'نخبة VIP', bg:'#451a03' },
 { emoji:'🔥', label:'عروض حصرية', bg:'#7f1d1d' },
 { emoji:'🏆', label:'الجودة الذهبية', bg:'#365314' },
 { emoji:'🎨', label:'تصميم وإبداع', bg:'#4c1d95' },
 { emoji:'🌙', label:'متجر الليل', bg:'#020617' },
 { emoji:'🌸', label:'عناية وجمال', bg:'#831843' }
];

function renderPresetIconPng(emoji, bgHex){
 const c = document.createElement('canvas');
 c.width = 512; c.height = 512;
 const ctx = c.getContext('2d');
 const grad = ctx.createLinearGradient(0, 0, 512, 512);
 grad.addColorStop(0, bgHex || '#064e3b');
 grad.addColorStop(1, '#021711');
 ctx.fillStyle = grad;
 ctx.beginPath();
 ctx.roundRect(0, 0, 512, 512, 110);
 ctx.fill();
 ctx.strokeStyle = '#d4af37';
 ctx.lineWidth = 18;
 ctx.strokeRect(18, 18, 476, 476);
 ctx.font = '250px sans-serif';
 ctx.textAlign = 'center';
 ctx.textBaseline = 'middle';
 ctx.fillText(emoji, 256, 275);
 return c.toDataURL('image/png');
}

function appIconAndBubblesModal(){
 const a = storeAppearance;
 draftLogo = a.logo || '';
 modal('📱 تغيير أيقونة التطبيق وألوان وفقاعات الرسائل', `
  <form class="form" data-form="save-icon-bubbles">
   <strong style="color:#fef08a;font-size:13.5px">1. اختر أيقونة التطبيق على الهواتف (${appIconPresets.length} شكل جاهز):</strong>
   <div class="icon-preset-grid">
    ${appIconPresets.map((ic, idx) => `
     <button type="button" class="icon-preset-btn" data-action="pick-app-icon-preset" data-id="${idx}">
      <span class="ico">${ic.emoji}</span>
      <span>${esc(ic.label)}</span>
     </button>
    `).join('')}
   </div>
   <div class="inline" style="justify-content:space-between;align-items:center">
    <label style="flex:1">أو ارفع صورة أيقونة PNG مخصصة<input id="custom-app-icon-file" type="file" accept="image/png,image/jpeg,image/webp"></label>
    <img id="icon-bubble-preview" src="${esc(draftLogo || 'icon.svg')}" style="width:64px;height:64px;border-radius:16px;border:2px solid #d4af37;object-fit:cover" alt="معاينة الأيقونة">
   </div>

   <strong style="color:#fef08a;font-size:13.5px;margin-top:6px">2. ألوان المتجر وفقاعات الدردشة والرسائل:</strong>
   <div class="row">
    <label>لون المتجر الرئيسي<input name="primary" type="color" value="${esc(a.primary||'#087e66')}" style="height:44px;padding:4px"></label>
    <label>لون نص فقاعات الرسائل<input name="bubbleTextColor" type="color" value="${esc(a.bubbleTextColor||'#ffffff')}" style="height:44px;padding:4px"></label>
   </div>
   <div class="row">
    <label>لون فقاعة رسائلي (المرسل)<input name="bubbleOutgoingBg" type="color" value="${esc(a.bubbleOutgoingBg||'#005c4b')}" style="height:44px;padding:4px"></label>
    <label>لون فقاعة الطرف الآخر (المستقبل)<input name="bubbleIncomingBg" type="color" value="${esc(a.bubbleIncomingBg||'#202c33')}" style="height:44px;padding:4px"></label>
   </div>
   <button class="btn full" type="submit">💾 حفظ وتحديث الأيقونة وفقاعات الرسائل فوراً</button>
   <div class="form-error" hidden></div>
  </form>
 `);
 const fi = document.getElementById('custom-app-icon-file');
 if(fi) fi.onchange = async e => {
  const file = e.target.files?.[0]; if(!file) return;
  try {
   draftLogo = await normalizeImage(file, 512, 420000);
   const pv = document.getElementById('icon-bubble-preview');
   if(pv) pv.src = draftLogo;
   toast('تم تجهيز الأيقونة المخصصة');
  } catch(err){ toast(err.message); }
 };
}

const btnImageTextures = [
 { name:'ذهبي ملكي', style:'gold-gradient', img:'' },
 { name:'زمردي فاخر', style:'emerald', img:'' },
 { name:'أزرق ياقوتي', style:'royal-blue', img:'' },
 { name:'عقيق أحمر', style:'ruby', img:'' },
 { name:'زجاجي شفاف', style:'glass', img:'' },
 { name:'دائري ناعم', style:'rounded', img:'' },
 { name:'رخام وذهب', style:'custom-img', img:'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=70' },
 { name:'نسيج ذهبي', style:'custom-img', img:'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=70' },
 { name:'بريق ليلي', style:'custom-img', img:'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=600&auto=format&fit=crop&q=70' },
 { name:'رخام أسود', style:'custom-img', img:'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=70' },
 { name:'ألوان متدرجة', style:'custom-img', img:'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=70' },
 { name:'إضاءة ذهبية', style:'custom-img', img:'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=70' }
];
let studioBtnImg = '';
let studioBtnStyle = 'gold-gradient';

async function storeStylesStudioModal(){
 if(user?.role !== 'Admin'){ toast('هذه الشاشة خاصة بإدارة المتجر فقط'); return; }
 let savedList = [];
 try {
  const raw = (!demo && apiBase) ? await request('/admin/styles') : (demoData().savedStyles || []);
  savedList = Array.isArray(raw) ? raw : [];
 } catch(e){ savedList = []; }
 const a = storeAppearance;
 studioBtnStyle = a.buttonStyle || 'gold-gradient';
 studioBtnImg = a.buttonBgImage || '';

 modal('🎭 استوديو حفظ وتعديل استايلات المتجر والأزرار (للإدارة فقط)', `
  <div class="stack" style="max-height:74vh;overflow-y:auto;padding-left:4px">
   <form class="form" data-form="save-store-style">
    <strong style="color:#fef08a;font-size:13.5px">1. حفظ استايل جديد أو تعديل الحالي:</strong>
    <label>اسم الاستايل<input name="name" required maxlength="60" placeholder="مثال: استايل العيد الذهبي"></label>
    <div class="row">
     <label>اللون الرئيسي<input name="primary" type="color" value="${esc(a.primary||'#087e66')}" style="height:42px;padding:4px"></label>
     <label>فقاعة المرسل<input name="bubbleOutgoingBg" type="color" value="${esc(a.bubbleOutgoingBg||'#005c4b')}" style="height:42px;padding:4px"></label>
    </div>
    <strong style="color:#fef08a;font-size:13px">2. اختيار صورة أو نمط أزرار المتجر (${btnImageTextures.length} خيار):</strong>
    <div class="design-gallery-grid" style="max-height:160px">
     ${btnImageTextures.map((bt, i) => `
      <button type="button" class="design-wp-item ${(studioBtnStyle===bt.style && studioBtnImg===bt.img)?'active':''}" data-action="pick-btn-texture" data-id="${i}">
       ${bt.img ? `<img src="${esc(bt.img)}" alt="${esc(bt.name)}">` : `<div style="height:40px;width:100%;border-radius:8px;background:var(--vip-gold-gradient);display:grid;place-items:center;color:#031711;font-weight:bold;font-size:11px">زر</div>`}
       <small>${esc(bt.name)}</small>
      </button>
     `).join('')}
    </div>
    <label>أو رابط صورة خلفية مخصّصة للأزرار<input id="studio-btn-img-url" name="buttonBgImage" value="${esc(studioBtnImg)}" placeholder="https://..." dir="ltr"></label>
    <button class="btn full" type="submit">💾 حفظ الاستايل وتطبيقه على المتجر فوراً</button>
    <div class="form-error" hidden></div>
   </form>

   <div style="border-top:1px dashed rgba(212,175,55,0.3);padding-top:12px">
    <strong style="color:#fef08a;font-size:13.5px;display:block;margin-bottom:8px">📂 الاستايلات المحفوظة (${savedList.length}):</strong>
    <div style="display:grid;gap:8px">
     ${savedList.map(st => `
      <div class="panel" style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
       <div>
        <strong style="color:#fff">${esc(st.name)}</strong>
        <small style="display:block;color:#cbd5e1">${esc(st.buttonStyle || 'gold-gradient')} · ${new Date(st.updatedAt).toLocaleDateString('ar-SA')}</small>
       </div>
       <div class="inline" style="gap:6px">
        <button type="button" class="btn small" data-action="apply-saved-style" data-id="${esc(st.id)}">✨ تطبيق</button>
        <button type="button" class="btn small danger" data-action="delete-saved-style" data-id="${esc(st.id)}">🗑️</button>
       </div>
      </div>
     `).join('') || '<p class="hint">لا توجد استايلات محفوظة بعد — احفظ أول استايل أعلاه.</p>'}
    </div>
   </div>
  </div>
 `);
}
