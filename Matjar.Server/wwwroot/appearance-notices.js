
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

const defaultAppearance={storeName:'التسوق',subtitle:'كل ما تحب، أقرب إليك',primary:'#087e66',background:'#f7f7f2',ink:'#18332e',font:'Tahoma',logo:'',announcement:'',announcementActive:false};
const storeFonts={Tahoma:'Tahoma,Arial,sans-serif',Arial:'Arial,Tahoma,sans-serif',System:'system-ui,Tahoma,sans-serif',Serif:'Georgia,"Times New Roman",serif'};
let storeAppearance={...defaultAppearance},draftLogo='',imageLoading=false,noticeCache=[],storeBanners=[],storeStaff=[];
function paintAppearance(){
 const a=storeAppearance;const r=document.documentElement;if(a.primary)r.style.setProperty('--green',a.primary);
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
}
let paintQueued=false;new MutationObserver(()=>{if(paintQueued)return;paintQueued=true;setTimeout(()=>{paintQueued=false;paintAppearance();},0);}).observe(document.getElementById('app'),{childList:true,subtree:true});
async function refreshAppearance(){try{storeAppearance={...defaultAppearance,...await request('/appearance')};paintAppearance();}catch{}}
async function refreshBanners(){try{storeBanners=await request('/banners');}catch{}}
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
  isLiveSyncBusy = true;
  try {
    await updateNotices();
    // إذا كان في لوحة التحكم أو الطلبات، تحديث الطلبات والمستخدمين فوراً
    if (typeof refresh === 'function' && ['home', 'orders', 'courier', 'history', 'users', 'staff'].includes(page)) {
      await refresh();
    }
  } catch(e) {
  } finally {
    isLiveSyncBusy = false;
  }
}

// تحديث فوري وتلقائي كل 3 ثوانٍ
setInterval(executeInstantLiveSync, 15000);

// تحديث فوري فائق السرعة بمجرد الرجوع أو فتح الشاشة
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && user) {
    executeInstantLiveSync();
  }
});
window.addEventListener('focus', () => {
  if (user) executeInstantLiveSync();
});


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
 const all = await request('/banners/all');
 modal('لوحة إدارة وتخصيص إعلانات وبانرات المتجر', `<div class="stack">
 <div style="background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.35);padding:14px;border-radius:14px;font-size:12.5px;line-height:1.8;color:#fef08a">
  <strong>لوحة التحكم الشاملة في الإعلانات والبانرات:</strong><br>
  أضف إعلانات مصورة، خصص طريقة الحركة (انزلاق، تلاشي، تكبير)، وحدد مكان الظهور في <b>صفحة الدخول</b> أو <b>الصفحة الرئيسية للمتجر</b>.
 </div>
 
 <div class="inline" style="justify-content:space-between">
  <button class="btn small" type="button" data-action="new-banner">+ إضافة إعلان وبانر جديد</button>
 </div>
 
 <div style="display:grid;gap:12px;max-height:52vh;overflow-y:auto;padding-left:4px">
  ${all.map(b=>`
  <article class="ticket-card" style="border:1px solid rgba(212,175,55,0.25);border-right:6px solid ${b.active?'#22c55e':'#ef4444'};background:rgba(4,25,19,0.85);border-radius:14px;padding:14px">
   <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
    ${b.image?`<img src="${esc(b.image)}" style="width:90px;height:65px;object-fit:cover;border-radius:10px;border:1px solid rgba(212,175,55,0.3)" alt="إعلان">`:''}
    <div style="flex:1;min-width:200px">
     <div style="display:flex;gap:8px;align-items:center">
      <strong style="color:#ffffff;font-size:14.5px">${esc(b.title)}</strong>
      <span class="badge" style="background:var(--vip-gold-gradient);color:#031711;font-size:10px;font-weight:bold">${esc(b.badge||'★ عرض خاص')}</span>
     </div>
     <small style="display:block;color:#cbd5e1;margin-top:4px">${esc(b.subtitle)}</small>
     <div style="display:flex;gap:10px;font-size:11px;color:#94a3b8;margin-top:6px;flex-wrap:wrap">
      <span>الظهور: <b style="color:#fef08a">${b.placement==='Login'?'صفحة الدخول فقط':b.placement==='Home'?'الرئيسية فقط':'الدخول والرئيسية معا'}</b></span>
      <span>·</span>
      <span>الحركة: <b style="color:#fef08a">${b.animation==='fade'?'تلاشي ناعم':b.animation==='zoom'?'تكبير سينمائي':'انزلاق سلس'}</b></span>
      <span>·</span>
      <span>الحالة: <b style="color:${b.active?'#22c55e':'#ef4444'}">${b.active?'نشط ومفعل':'معطل مؤقتا'}</b></span>
     </div>
    </div>
    <div class="inline" style="gap:6px">
     <button class="btn small secondary" type="button" data-action="edit-banner" data-id="${esc(b.id)}">تعديل الإعلان</button>
     <button class="btn small danger" type="button" data-action="delete-banner" data-id="${esc(b.id)}">حذف</button>
    </div>
   </div>
  </article>`).join('')||'<p class="hint">لا توجد إعلانات بعد. اضغط «إضافة إعلان وبانر جديد» للبدء.</p>'}
 </div>
 
 <button class="btn full secondary" type="button" data-action="close">إغلاق</button>
 </div>`);
}

function bannerEditor(id){
 const b = storeBanners.find(x=>x.id===id) || {
  title:'', subtitle:'', image:'', linkUrl:'', buttonText:'اكتشف العرض الآن',
  bgColor:'#087e66', textColor:'#ffffff', placement:'Both', animation:'slide',
  badge:'★ عرض خاص وحصري', active:true, sortOrder:0
 };
 
 modal(id?'تعديل الإعلان والبانر':'إضافة إعلان وبانر جديد', `<form class="form" data-form="banner" data-id="${esc(id||'')}">
 <label>عنوان الإعلان الرئيسي
  <input name="title" value="${esc(b.title)}" required minlength="2" maxlength="100" placeholder="مثال: عروض وتخفيضات موسم الشتاء الحصرية">
 </label>
 <label>العنوان الفرعي أو الوصف الترويجي
  <input name="subtitle" value="${esc(b.subtitle)}" maxlength="200" placeholder="مثال: خصم فوري يصل إلى 40% وتوصيل مجاني سريع لجميع الطلبات">
 </label>
 
 <div class="row">
  <label>شارة الإعلان البارزة (Badge)
   <input name="badge" value="${esc(b.badge||'★ عرض خاص وحصري')}" maxlength="40" placeholder="مثال: 🔥 خصم 40% أو ★ تشكيلة الموسم">
  </label>
  <label>مكان ظهور الإعلان في المتجر
   <select name="placement">
    <option value="Both" ${b.placement==='Both'?'selected':''}>⭐ يظهر في صفحة الدخول والصفحة الرئيسية معاً</option>
    <option value="Login" ${b.placement==='Login'?'selected':''}>🔐 صفحة الدخول الرئيسية فقط</option>
    <option value="Home" ${b.placement==='Home'?'selected':''}>🛍️ الصفحة الرئيسية لكتالوج المتجر فقط</option>
   </select>
  </label>
 </div>

 <div class="row">
  <label>طريقة وحركة العرض (Animation / Motion)
   <select name="animation">
    <option value="slide" ${b.animation==='slide'?'selected':''}>↔️ انزلاق تلقائي سلس (Smooth Slide)</option>
    <option value="fade" ${b.animation==='fade'?'selected':''}>✨ تلاشي وتداخل ناعم (Soft Fade)</option>
    <option value="zoom" ${b.animation==='zoom'?'selected':''}>🔍 تكبير سينمائي بطيء (Ken Burns Zoom)</option>
   </select>
  </label>
  <label>ترتيب الأسبقية في العرض
   <input type="number" name="sortOrder" value="${b.sortOrder||0}" min="0">
  </label>
 </div>

 <label>صورة الإعلان أو البانر (PNG / JPEG / WebP)
  <input type="file" id="banner-image" accept="image/png,image/jpeg,image/webp">
 </label>
 <label>أو ضع رابط صورة عالي الدقة مباشرة
  <input name="imageUrl" id="banner-img-url" value="${esc(b.image)}" placeholder="https://images.unsplash.com/photo-...">
 </label>
 <input type="hidden" name="image" id="banner-image-data" value="${esc(b.image)}">
 
 <div id="banner-preview-box">
  ${b.image?`<img src="${esc(b.image)}" style="width:100%;max-height:160px;object-fit:cover;border-radius:12px;margin:8px 0;border:1px solid rgba(212,175,55,0.3)" alt="معاينة الإعلان">`:''}
 </div>

 <div class="row">
  <label>لون خلفية الإعلان<input type="color" name="bgColor" value="${b.bgColor||'#087e66'}"></label>
  <label>لون نصوص الإعلان<input type="color" name="textColor" value="${b.textColor||'#ffffff'}"></label>
 </div>

 <div class="row">
  <label>نص زر الشراء أو الاكتشاف<input name="buttonText" value="${esc(b.buttonText||'اكتشف العرض الآن')}" maxlength="40"></label>
  <label>الرابط أو القسم الموجه إليه<input name="linkUrl" value="${esc(b.linkUrl||'الكل')}" placeholder="الكل أو أزياء أو إلكترونيات..."></label>
 </div>

 <label class="check">
  <input type="checkbox" name="active" ${b.active?'checked':''}> <strong>تفعيل الإعلان فوراً وعرضه للمستخدمين</strong>
 </label>

 <button class="btn full" type="submit">حفظ الإعلان وتطبيقه فوراً</button>
 <div class="form-error" hidden></div>
 </form>`);

 const fileInput = document.getElementById('banner-image');
 if(fileInput){
  fileInput.onchange = async () => {
   const file = fileInput.files?.[0];
   if(!file) return;
   const reader = new FileReader();
   reader.onload = e => {
    const dataUrl = e.target?.result;
    document.getElementById('banner-image-data').value = dataUrl;
    document.getElementById('banner-preview-box').innerHTML = `<img src="${dataUrl}" style="width:100%;max-height:160px;object-fit:cover;border-radius:12px;margin:8px 0;border:1px solid rgba(212,175,55,0.3)" alt="معاينة الصورة">`;
   };
   reader.readAsDataURL(file);
  };
 }
 const urlInput = document.getElementById('banner-img-url');
 if(urlInput){
  urlInput.oninput = () => {
   const url = urlInput.value.trim();
   if(url){
    document.getElementById('banner-image-data').value = url;
    document.getElementById('banner-preview-box').innerHTML = `<img src="${url}" style="width:100%;max-height:160px;object-fit:cover;border-radius:12px;margin:8px 0;border:1px solid rgba(212,175,55,0.3)" alt="معاينة الصورة">`;
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

async function noticesCenter(){await updateNotices();modal('إشعاراتي',`<div class="stack"><p class="hint">الإشعارات مفعلة وتصلك مباشرة على شاشة هاتفك وقفل الشاشة عند وصول أي طلب أو رسالة جديدة.</p>${noticeCache.map(n=>`<article class="ticket-message ${n.read?'':'notice-unread'}"><h3>${esc(n.title)}</h3><p>${esc(n.message)}</p><small>${new Date(n.at).toLocaleString('ar-SA')}</small>${n.read?'<small> · مقروء</small>':`<button class="btn small secondary" data-action="read-notice" data-id="${esc(n.id)}">تحديد كمقروء</button>`}</article>`).join('')||'<p class="hint">لا توجد إشعارات لك بعد.</p>'}<div class="inline"><button class="btn small" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold" data-action="test-phone-notification">📲 تجربة إشعار على شاشة الجوال الآن</button><button class="btn small secondary" data-action="notices">تحديث القائمة</button></div></div>`);}
async function composeNotice(){const sent=await request('/notifications/sent');modal('إرسال إشعارات العملاء والمناديب',`<div class="stack"><form class="form" data-form="compose-notice"><label>المستلمون<select name="audience"><option value="Customer">جميع العملاء</option><option value="Courier">جميع مندوبي التوصيل</option><option value="Merchant">جميع التجار</option><option value="All">جميع الحسابات الفعالة</option>${dashboard.users?.length?'<option value="User">حساب محدد</option>':''}</select></label>${dashboard.users?.length?`<label>الحساب عند اختيار «حساب محدد»<select name="userId">${dashboard.users.filter(u=>u.active).map(u=>`<option value="${esc(u.id)}">${esc(u.name)} · ${roles[u.role]}</option>`).join('')}</select></label>`:''}<label>عنوان الإشعار<input name="title" required minlength="2" maxlength="100"></label><label>الرسالة<textarea name="message" required minlength="2" maxlength="1000"></textarea></label><p class="hint">يُرسل فورًا إلى صندوق الإشعارات داخل الحسابات المختارة. لا يتضمن إرسال SMS أو بريد أو تنبيه والهاتف مغلق.</p><button class="btn" type="submit">إرسال الإشعار الآن</button><div class="form-error" hidden></div></form><h3>سجل الإرسال</h3>${sent.map(n=>`<article class="ticket-message"><strong>${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${({Customer:'العملاء',Courier:'المناديب',Merchant:'التجار',All:'الجميع',User:'حساب محدد'})[n.audience]} · ${n.sentCount} مستلم · ${n.readCount} قراءة · ${new Date(n.at).toLocaleString('ar-SA')}</small></article>`).join('')||'<p class="hint">لم ترسل رسائل بعد.</p>'}</div>`);}

async function appearanceAction(name,id){
 if(name==='appearance'){appearanceEditor();return true;}
 if(name==='remove-store-image'){draftLogo='';appearancePreview();return true;}
 if(name==='reset-appearance'){const f=$('[data-form="appearance"]');for(const key of ['primary','background','ink','font','storeName','subtitle','announcement'])if(f.elements[key])f.elements[key].value=defaultAppearance[key]||'';draftLogo='';appearancePreview();return true;}
 if(name==='banners-manager'){await bannersManager();return true;}
 if(name==='new-banner'){bannerEditor();return true;}
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
 if(name==='read-notice'){await request('/notifications/'+id+'/read','PUT');await noticesCenter();return true;}
 return false;
}

async function appearanceForm(kind,id,f,form){
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
 if(kind==='appearance'){
  if(imageLoading)throw new Error('انتظر اكتمال تجهيز الصورة');
  storeAppearance=await request('/appearance','PUT',{storeName:f.storeName,subtitle:f.subtitle,loadingTitle:f.loadingTitle||f.storeName||'التسوق',loadingSubtitle:f.loadingSubtitle||'نجهّز لك تجربة أجمل…',primary:f.primary,background:f.background,ink:f.ink,font:f.font,logo:draftLogo,announcement:f.announcement||'',announcementActive:f.announcementActive==='on'});
  try {
   localStorage.setItem('ts-loading-title', f.loadingTitle||f.storeName||'التسوق');
   localStorage.setItem('ts-loading-sub', f.loadingSubtitle||'نجهّز لك تجربة أجمل…');
  } catch(e){}
  closeModal();paintAppearance();toast('تم تطبيق شكل وهوية المتجر والأيقونة الجديدة بنجاح');return true;
 }
 if(kind==='banner'){
  await request('/banners'+(id?'/'+id:''),id?'PUT':'POST',{...f,sortOrder:Number(f.sortOrder||0),active:f.active==='on'});
  await refreshBanners();closeModal();await bannersManager();toast('تم حفظ الإعلان بنجاح');return true;
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
