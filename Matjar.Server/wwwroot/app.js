
async function adminTechSettingsModal(){
 let s = { host:'smtp.gmail.com', port:587, user:'', hasPass:false, mapApiKey:'', mapTileUrl:'' };
 try { if(apiBase) s = await request('/admin/settings'); } catch(e){}
 modal('مفتاح الخرائط وإعدادات البريد الإلكتروني (SMTP)', `
 <div class="stack">
  <form class="form" data-form="save-admin-tech-settings">
   <div style="background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.35);padding:12px 14px;border-radius:12px;font-size:12px;color:#fef08a;line-height:1.7">
    <strong>1. إعدادات إرسال كلمة المرور إلى إيميل المستخدم (Gmail SMTP):</strong><br>
    لإرسال كلمة السر تلقائياً عند نسيانها إلى إيميل المستخدم، أدخل إيميل المتجر وكلمة مرور التطبيقات (App Password).
   </div>
   <div class="row">
    <label>خادم البريد (SMTP Host)<input name="host" value="${esc(s.host||'smtp.gmail.com')}" dir="ltr" placeholder="smtp.gmail.com"></label>
    <label>المنفذ (Port)<input name="port" type="number" value="${s.port||587}" dir="ltr"></label>
   </div>
   <div class="row">
    <label>البريد الإلكتروني المرسل (مثل Gmail)<input name="user" type="email" value="${esc(s.user||'')}" dir="ltr" placeholder="noraldayem2012@gmail.com"></label>
    <label>كلمة مرور التطبيقات (App Password)<input name="pass" type="password" dir="ltr" placeholder="${s.hasPass?'•••••••• (محفوظة - اتركها فارغة للإبقاء)':'أدخل App Password'}"></label>
   </div>

   <div style="background:rgba(26,115,232,0.15);border:1px solid rgba(26,115,232,0.4);padding:12px 14px;border-radius:12px;font-size:12px;color:#bfdbfe;line-height:1.7;margin-top:6px">
    <strong>2. مفتاح خرائط جوجل (Google Maps API Key):</strong><br>
    اختياري لتحسين عرض طبقة خرائط Google المباشرة داخل شاشة التتبع والأجهزة.
   </div>
   <label>مفتاح خرائط جوجل (Google Maps API Key)<input name="mapApiKey" value="${esc(s.mapApiKey||'')}" dir="ltr" placeholder="AIzaSy..."></label>
   <label>رابط خرائط مخصص (اختياري Tile URL)<input name="mapTileUrl" value="${esc(s.mapTileUrl||'')}" dir="ltr" placeholder="https://tile.openstreetmap.org/{z}/{x}/{y}.png"></label>

   <button class="btn full" type="submit">💾 حفظ الإعدادات وتفعيلها فوراً</button>
   <div class="form-error" hidden></div>
  </form>

  <form class="form" data-form="test-smtp-email" style="border-top:1px dashed var(--line);padding-top:12px">
   <label>تجربة إرسال بريد إلكتروني الآن للتأكد
    <div class="inline" style="gap:8px;flex-wrap:nowrap">
     <input name="email" type="email" dir="ltr" placeholder="أدخل بريدك لتجربة الإرسال" value="${esc(s.user||'')}">
     <button class="btn small secondary" type="submit" style="white-space:nowrap">📧 إرسال تجربة</button>
    </div>
   </label>
  </form>
 </div>`);
}


/* ========================================================
   Strict Connected Username Validator (منع المسافات والرموز في اسم المستخدم)
   ======================================================== */
function sanitizeConnectedUsername(val) {
 // إزالة أي مسافات أو رموز والإبقاء فقط على الحروف العربية والإنجليزية والأرقام متصلة
 return String(val || '').replace(/[^\p{L}\p{N}]/gu, '');
}

function validateConnectedUsername(username) {
 const raw = String(username || '');
 if (!raw) throw new Error('يرجى إدخال اسم المستخدم');
 if (/\s/.test(raw)) throw new Error('اسم المستخدم يجب أن يكون متصلاً بدون أي مسافات (Space)');
 if (!/^[\p{L}\p{N}]+$/u.test(raw)) throw new Error('اسم المستخدم يجب أن يحتوي على حروف (عربية أو إنجليزية) وأرقام فقط بدون أي رموز');
 if (raw.length < 2 || raw.length > 50) throw new Error('اسم المستخدم يجب أن يكون متصلاً وبين حرفين و50 حرفاً');
 return raw;
}

// منع كتابة المسافة أو الرموز لحظياً في حقول اسم المستخدم
document.addEventListener('keydown', e => {
 const el = e.target;
 if (el && (el.dataset.usernameField === 'true' || el.name === 'name' && el.closest('form[data-form="register"], form[data-form="new-user"], form[data-form="update-profile"]'))) {
  if (e.key === ' ' || e.code === 'Space') {
   e.preventDefault();
   toast('اسم المستخدم يجب أن يكون متصلاً بدون مسافات');
  }
 }
});

document.addEventListener('input', e => {
 const el = e.target;
 if (el && (el.dataset.usernameField === 'true' || (el.name === 'name' && el.closest('form[data-form="register"], form[data-form="new-user"], form[data-form="update-profile"]')))) {
  const cleaned = sanitizeConnectedUsername(el.value);
  if (el.value !== cleaned) {
   el.value = cleaned;
   toast('يُسمح بالحروف والأرقام المتصلة فقط بدون مسافات أو رموز');
  }
 }
});


/* ========================================================
   Admin Device Analytics & Customer Location Map Screen
   ======================================================== */
let devicesMapInstance = null;
let devicesMarkers = [];
let lastDevicesList = [];

async function devicesView(){
 if(!['Admin','Supervisor'].includes(user.role) && !has('tracking.read') && !has('users.manage')) return empty('هذه الصفحة مخصصة لإدارة المتجر والمشرفين');
 
 let data = { totalInstalls: 5, activeDevices: 4, iosCount: 3, androidCount: 2, desktopCount: 0, devices: [] };
 try {
  if(apiBase){
   data = await request('/admin/device-installs');
  } else {
   data = {
    totalInstalls: 5, activeDevices: 4, iosCount: 3, androidCount: 2, desktopCount: 0,
    devices: [
     { id:'dev1', deviceModel:'Apple iPhone 15 Pro', platform:'iOS', browser:'Mobile Safari', ipAddress:'185.125.190.12', region:'منطقة الرياض', city:'الرياض، حي الملقا', latitude:24.7923, longitude:46.6214, userName:'نورة أحمد', userEmail:'noura@store.local', isOnline:true, lastActiveAt:new Date().toISOString() },
     { id:'dev2', deviceModel:'Samsung Galaxy S24 Ultra', platform:'Android', browser:'Chrome Mobile', ipAddress:'37.216.142.88', region:'منطقة مكة المكرمة', city:'جدة، حي الروضة', latitude:21.5433, longitude:39.1728, userName:'خالد عبدالله', userEmail:'khaled@store.local', isOnline:true, lastActiveAt:new Date(Date.now()-600000).toISOString() },
     { id:'dev3', deviceModel:'Apple iPhone 14', platform:'iOS', browser:'Mobile Safari', ipAddress:'176.44.89.105', region:'المنطقة الشرقية', city:'الدمام، حي الشاطئ', latitude:26.4207, longitude:50.0888, userName:'محمد فهد', userEmail:'mohammed@store.local', isOnline:false, lastActiveAt:new Date(Date.now()-3600000).toISOString() },
     { id:'dev4', deviceModel:'Xiaomi 14 Pro', platform:'Android', browser:'Chrome Mobile', ipAddress:'51.39.210.44', region:'منطقة مكة المكرمة', city:'مكة المكرمة، حي العزيزية', latitude:21.4225, longitude:39.8262, userName:'سارة القحطاني', userEmail:'sara@store.local', isOnline:true, lastActiveAt:new Date().toISOString() },
     { id:'dev5', deviceModel:'Apple iPhone 13 Pro', platform:'iOS', browser:'Mobile Safari', ipAddress:'46.153.77.19', region:'منطقة المدينة المنورة', city:'المدينة المنورة', latitude:24.4672, longitude:39.6111, userName:'سلطان العتيبي', userEmail:'sultan@store.local', isOnline:false, lastActiveAt:new Date(Date.now()-1800000).toISOString() }
    ]
   };
  }
 } catch(e){}

 lastDevicesList = data.devices || [];

 return `
 <div class="section-head">
  <div>
   <h1>الأجهزة والمثبتون والمواقع الجغرافية للعملاء</h1>
   <p>رصد حي وشامل لعدد من قاموا بتثبيت التطبيق، أنواع هواتفهم، ومواقعهم الجغرافية بدقة على الخريطة</p>
  </div>
  <div class="inline">
   <button class="btn secondary" data-action="instant-refresh">🔄 تحديث الخريطة والأجهزة</button>${user.role==='Admin'?`<button class="btn" data-action="admin-tech-settings">🔑 مفتاح الخرائط وإعدادات الإيميل</button>`:``}
  </div>
 </div>

 <div class="panel" style="margin:14px 0 18px;padding:16px;border:1px solid rgba(212,175,55,0.4);display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
  <div>
   <strong style="color:#fef08a;font-size:14px">⚙️ آلية تنشيط الحسابات المسجلة الجديدة:</strong>
   <p class="hint" style="margin:4px 0 0;color:#cbd5e1;font-size:12px">
    ${governance?.policies?.autoApproveCustomers
     ? '✅ الوضع الحالي: <b>التفعيل التلقائي المباشر</b> (يدخل المستخدم الجديد للمتجر فوراً دون انتظار).'
     : '🛡️ الوضع الحالي: <b>تفعيل بموافقة المشرفين والإدارة</b> (يتجمد الحساب الجديد لحين تنشيطه من هنا).'}
   </p>
  </div>
  <div class="inline" style="gap:8px">
   <button class="btn small ${governance?.policies?.autoApproveCustomers?'':'secondary'}" type="button" data-action="set-auto-approve" data-id="true">✅ تفعيل تلقائي</button>
   <button class="btn small ${!governance?.policies?.autoApproveCustomers?'':'secondary'}" type="button" data-action="set-auto-approve" data-id="false">🛡️ بموافقة المشرفين</button>
   ${user.role==='Admin'?`<button class="btn small ghost" type="button" data-action="admin-tech-settings">📧 إعدادات إيميل نسيان كلمة السر</button>`:''}
  </div>
 </div>
 <div class="stats" style="grid-template-columns:repeat(4,1fr);margin:16px 0 24px">
  <div class="stat featured">
   <div class="label">إجمالي من حمّل وثبّت التطبيق${icon('truck',18)}</div>
   <strong>${data.totalInstalls || 0}</strong>
   <small>هاتف ذكي وجهاز مثبت</small>
  </div>
  <div class="stat">
   <div class="label">هواتف آيفون (Apple iOS)${icon('check',18)}</div>
   <strong>${data.iosCount || 0}</strong>
   <small>أجهزة تعمل بنظام iOS</small>
  </div>
  <div class="stat">
   <div class="label">هواتف أندرويد (Android)${icon('users',18)}</div>
   <strong>${data.androidCount || 0}</strong>
   <small>أجهزة سامسونج وشاومي وغيرها</small>
  </div>
  <div class="stat">
   <div class="label">الأجهزة المتصلة الآن${icon('shield',18)}</div>
   <strong style="color:#22c55e">${data.activeDevices || 0}</strong>
   <small>نشطة وتتصفح المتجر</small>
  </div>
 </div>

 <!-- خريطة توزيع الأجهزة والعملاء الجغرافية -->
 <div class="panel" style="padding:0;overflow:hidden;border:1px solid rgba(212,175,55,0.3);border-radius:20px;margin-bottom:24px">
  <div style="background:linear-gradient(135deg, #064e3b 0%, #03251c 100%);padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:1px solid rgba(212,175,55,0.25)">
   <div style="display:flex;align-items:center;gap:10px">
    <span class="live-pulse" style="width:10px;height:10px"></span>
    <strong style="color:#ffffff;font-size:14.5px">🗺️ خريطة التتبع الجغرافي المباشر (الأدمن + هواتف المسجلين)</strong>
   </div>
   <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <small id="admin-gps-status" style="color:#fef08a">${window.adminLiveCoords ? `👑 موقع الأدمن: ${window.adminLiveCoords.lat.toFixed(4)}, ${window.adminLiveCoords.lng.toFixed(4)}` : '👑 جاري تحديد موقع الأدمن...'}</small>
    <button class="btn small secondary" type="button" data-action="refresh-admin-gps">🎯 تحديث موقع الأدمن</button>
   </div>
  </div>
  <div id="devices-live-map" style="height:380px;width:100%;z-index:1;direction:ltr"></div>
 </div>

 <!-- قائمة تفاصيل الأجهزة المسجلة -->
 <div class="section-head">
  <h2>سجل الهواتف والأجهزة الذكية المتصلة</h2>
  <span class="badge" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold">${(data.devices||[]).length} جهاز متصل</span>
 </div>

 <div style="display:grid;gap:14px">
  ${(data.devices || []).map(d => {
   const isIOS = d.platform === 'iOS';
   return `
   <article class="order" style="background:rgba(4,25,19,0.85);border:1px solid rgba(212,175,55,0.25);border-radius:18px;padding:18px">
    <div class="order-top" style="align-items:flex-start">
     <div style="display:flex;gap:14px;align-items:center">
      <div style="width:48px;height:48px;border-radius:14px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.35);display:grid;place-items:center;font-size:22px">
       ${isIOS ? '🍏' : '🤖'}
      </div>
      <div>
       <div style="display:flex;align-items:center;gap:8px">
        <h3 style="color:#ffffff;font-size:16px;margin:0">${esc(d.deviceModel)}</h3>
        <span class="badge ${d.isOnline?'Ready':'Cancelled'}" style="font-size:10px">${d.isOnline?'🟢 متصل الآن':'⚪ غير متصل'}</span>
       </div>
       <p style="color:#cbd5e1;font-size:12.5px;margin:4px 0 0">
        👤 الاسم المسجل: <b style="color:#fef08a">${esc(d.userName || 'زائر غير مسجل')}</b>${d.userEmail ? ` <span style="color:#94a3b8">(${esc(d.userEmail)})</span>` : ''}
       </p>
       <div style="display:flex;gap:12px;font-size:11.5px;color:#94a3b8;margin-top:6px;flex-wrap:wrap">
        <span>📱 نوع الهاتف: <b style="color:#ffffff">${esc(d.deviceModel || 'هاتف ذكي')} (${esc(d.platform || '-')})</b></span>
        <span>·</span>
        <span>🌐 IP الهاتف: <code style="color:#38bdf8;background:#031711;padding:2px 6px;border-radius:6px" dir="ltr">${esc(d.ipAddress || 'غير مسجل')}</code></span>
        <span>·</span>
        <span>📍 المنطقة: <b style="color:#ffffff">${esc(d.region || d.city || 'الرياض')}</b></span>
        <span>·</span>
        <span>الإحداثيات: <code style="color:#fde047" dir="ltr">${Number(d.latitude||0).toFixed(4)}, ${Number(d.longitude||0).toFixed(4)}</code></span>
       </div>
      </div>
     </div>
    </div>

    <div class="order-bottom" style="margin-top:14px;padding-top:12px;border-top:1px dashed rgba(212,175,55,0.2)">
     <div class="order-actions" style="gap:8px;width:100%;justify-content:flex-start;flex-wrap:wrap">
      <button class="btn small secondary" type="button" data-action="focus-device-map" data-lat="${d.latitude}" data-lng="${d.longitude}">
       📍 تحديد المكان في الخرائط
      </button>

      <button class="btn small" type="button" style="background:#1a73e8;color:#ffffff;font-weight:bold" data-action="open-gmaps" data-lat="${d.latitude}" data-lng="${d.longitude}">
       🚀 تتبع الهاتف في خرائط قوقل (الأدمن ← الهاتف)
      </button>
     </div>
    </div>
   </article>`;
  }).join('')}
 </div>`;
}

function initDevicesMap(devices){
 const container = document.getElementById('devices-live-map');
 if(!container || typeof L === 'undefined') return;
 
 if(devicesMapInstance){
  devicesMapInstance.remove();
  devicesMapInstance = null;
 }

 devicesMapInstance = L.map('devices-live-map', { zoomControl: true }).setView([24.7136, 46.6753], 6);
 L.tileLayer((typeof getActiveMapTileUrl==='function'?getActiveMapTileUrl():null) || config.mapTileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; Google Maps & OpenStreetMap'
 }).addTo(devicesMapInstance);

 devicesMarkers = [];
 devices.forEach(d => {
  if(!d.latitude || !d.longitude) return;
  const isIOS = d.platform === 'iOS';
  const color = isIOS ? '#f59e0b' : '#10b981';
  const iconSym = isIOS ? '🍏' : '🤖';
  
  const m = L.circleMarker([d.latitude, d.longitude], {
   radius: 12,
   color: '#ffffff',
   fillColor: color,
   fillOpacity: 0.95,
   weight: 2
  }).addTo(devicesMapInstance);

  m.bindPopup(`
   <div style="direction:rtl;text-align:right;font-family:Tahoma,sans-serif;font-size:12px;line-height:1.7;min-width:200px">
    <strong style="color:#031711;font-size:13px">👤 ${esc(d.userName || 'زائر غير مسجل')}</strong><br>
    <span style="color:#334155">${iconSym} الهاتف: <b>${esc(d.deviceModel)}</b></span><br>
    <span style="color:#0369a1">🌐 IP: <code dir="ltr">${esc(d.ipAddress || 'غير مسجل')}</code></span><br>
    <span style="color:#064e3b">📍 المنطقة: <b>${esc(d.region || d.city || 'الموقع محدد')}</b></span><br>
    <button style="margin-top:6px;background:#1a73e8;color:#fff;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;width:100%;font-weight:bold" data-action="open-gmaps" data-lat="${d.latitude}" data-lng="${d.longitude}">
     🚀 تتبع في خرائط قوقل (الأدمن ← الهاتف)
    </button>
   </div>
  `);

  devicesMarkers.push(m);
 });

 const plotAdminMarker = (coords) => {
  if(!devicesMapInstance || !coords || !coords.lat || !coords.lng) return;
  if(window.adminMapMarker) { try { devicesMapInstance.removeLayer(window.adminMapMarker); } catch(e){} }
  window.adminMapMarker = L.circleMarker([coords.lat, coords.lng], {
   radius: 11, color: '#ffffff', fillColor: '#f59e0b', fillOpacity: 1, weight: 3
  }).addTo(devicesMapInstance).bindPopup('<div style="direction:rtl;text-align:right;font-family:Tahoma,sans-serif"><b>👑 موقع الأدمن الحالي</b><br>نقطة الانطلاق للتتبع المباشر</div>');
  const st = document.getElementById('admin-gps-status');
  if(st) st.textContent = `👑 موقع الأدمن: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
 };
 if(window.adminLiveCoords) plotAdminMarker(window.adminLiveCoords);
 if(typeof refreshAdminLiveLocation === 'function') refreshAdminLiveLocation(plotAdminMarker);

 if(devicesMarkers.length > 0){
  devicesMapInstance.fitBounds(L.featureGroup(devicesMarkers).getBounds().pad(0.3));
 }
}

function focusDeviceOnMap(lat, lng, name){
 if(!devicesMapInstance) return;
 document.getElementById('devices-live-map')?.scrollIntoView({ behavior: 'smooth' });
 devicesMapInstance.setView([lat, lng], 14, { animate: true });
}


/* ========================================================
   Device Telemetry & Install Analytics Engine
   ======================================================== */
function detectDeviceTelemetry(){
 const ua = navigator.userAgent || '';
 const isIOS = /iPhone|iPad|iPod/i.test(ua);
 const isAndroid = /Android/i.test(ua);
 
 let platform = 'Desktop';
 let model = 'جهاز كمبيوتر';
 if(isIOS){
  platform = 'iOS';
  model = ua.includes('iPad') ? 'Apple iPad' : 'Apple iPhone';
 } else if(isAndroid){
  platform = 'Android';
  model = 'هاتف أندرويد ذكي';
  if(/SM-|Samsung/i.test(ua)) model = 'Samsung Galaxy';
  else if(/Pixel/i.test(ua)) model = 'Google Pixel';
  else if(/Xiaomi|Redmi/i.test(ua)) model = 'Xiaomi';
  else if(/HUAWEI|HONOR/i.test(ua)) model = 'Huawei / Honor';
 }
 
 const browser = /CriOS|Chrome/i.test(ua) ? 'Chrome Mobile' : /Safari/i.test(ua) ? 'Mobile Safari' : /Firefox/i.test(ua) ? 'Firefox' : 'متصفح الجوال';
 
 let devId = localStorage.getItem('ts-device-id');
 if(!devId){
  devId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  localStorage.setItem('ts-device-id', devId);
 }
 
 return { deviceId: devId, deviceModel: model, platform, browser };
}

async function reportDeviceInstallTelemetry(coords = null){
 try {
  const telemetry = detectDeviceTelemetry();
  
  // محاولة التقاط إحداثيات الموقع الدقيقة تلقائياً عند فتح أو تثبيت التطبيق
  if(!coords && 'geolocation' in navigator){
   try {
    const pos = await new Promise((res, rej) => {
     navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4500, enableHighAccuracy: true });
    });
    if(pos && pos.coords){
     coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    }
   } catch(e){}
  }

  if(coords){
   telemetry.latitude = coords.latitude;
   telemetry.longitude = coords.longitude;
   if(Math.abs(coords.latitude - 24.7) < 0.6) telemetry.city = 'الرياض، المملكة العربية السعودية';
   else if(Math.abs(coords.latitude - 21.5) < 0.6) telemetry.city = 'جدة، المملكة العربية السعودية';
   else if(Math.abs(coords.latitude - 21.4) < 0.6) telemetry.city = 'مكة المكرمة، السعودية';
   else if(Math.abs(coords.latitude - 24.4) < 0.6) telemetry.city = 'المدينة المنورة، السعودية';
   else if(Math.abs(coords.latitude - 26.4) < 0.6) telemetry.city = 'الدمام والمنطقة الشرقية';
   else telemetry.city = 'المملكة العربية السعودية';
  } else {
   const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
   if(tz.includes('riyadh')) { telemetry.city = 'الرياض، السعودية'; telemetry.latitude = 24.7136; telemetry.longitude = 46.6753; }
   else if(tz.includes('dubai')) { telemetry.city = 'دبي، الإمارات'; telemetry.latitude = 25.2048; telemetry.longitude = 55.2708; }
   else if(tz.includes('kuwait')) { telemetry.city = 'الكويت'; telemetry.latitude = 29.3759; telemetry.longitude = 47.9774; }
   else if(tz.includes('cairo')) { telemetry.city = 'القاهرة، مصر'; telemetry.latitude = 30.0444; telemetry.longitude = 31.2357; }
   else { telemetry.city = 'الرياض، السعودية'; telemetry.latitude = 24.7136; telemetry.longitude = 46.6753; }
  }

  telemetry.region = telemetry.city;
  if(apiBase){
   await request('/telemetry/install', 'POST', telemetry);
  }
 } catch(e){}
}


/* ========================================================
   Interactive Product Details & Multi-Image Gallery Viewer
   ======================================================== */
function viewProductModal(id){
 const p = products.find(x => x.id === id) || (dashboard?.products || []).find(x => x.id === id);
 if (!p) return;
 const mainImg = p.image || defaultRealImages[p.icon] || '';
 const gallery = [mainImg, ...(p.galleryImages || [])].filter(Boolean);
 
 modal(p.name, `
 <div class="stack" style="text-align:right">
  <div style="width:100%;height:260px;border-radius:18px;overflow:hidden;background:#031711;border:1px solid rgba(212,175,55,0.3);position:relative">
   ${mainImg ? `<img id="gallery-main-display" src="${esc(mainImg)}" style="width:100%;height:100%;object-fit:cover;transition:all .3s" alt="${esc(p.name)}">` : art(p.icon)}
   <span class="vip-product-badge" style="top:12px;right:12px">${p.stock ? '★ متوفر للتسليم' : 'نفد من المخزون'}</span>
  </div>

  ${gallery.length > 1 ? `
  <div style="display:flex;gap:10px;overflow-x:auto;padding:6px 0">
   ${gallery.map((img, idx) => `
    <div style="width:65px;height:65px;border-radius:12px;overflow:hidden;border:2px solid ${idx===0?'#fef08a':'rgba(212,175,55,0.3)'};cursor:pointer;flex-shrink:0" data-action="gallery-thumb" data-id="${esc(img)}">
     <img src="${esc(img)}" style="width:100%;height:100%;object-fit:cover" alt="زاوية إضافية">
    </div>`).join('')}
  </div>` : ''}

  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
   <span style="color:#fef08a;font-size:13px;font-weight:600">${esc(p.category)}</span>
   <span class="vip-price" style="font-size:22px">${money(p.price)} <small style="color:#94a3b8">${currencyLabel(commerce.currency)}</small></span>
  </div>

  <p style="font-size:13.5px;color:#e2e8f0;line-height:1.8;background:rgba(255,255,255,0.05);padding:14px;border-radius:14px;border:1px solid rgba(212,175,55,0.2)">
   ${esc(p.description || 'منتج فاخر عالي الجودة تم اختياره بعناية مع ضمان أصلي وتوصيل سريع.')}
  </p>

  <div class="inline" style="justify-content:space-between;gap:12px;margin-top:10px">
   <button class="btn full" style="background:var(--vip-gold-gradient);color:#031711;font-weight:800;font-size:15px" data-action="add" data-id="${esc(p.id)}">
    🛒 إضافة إلى حقيبة التسوق
   </button>
  </div>
 </div>`);
}


function adminEditPasswordModal(id){
 const u = (dashboard.users||[]).find(x=>x.id===id);
 if(!u) return;
 modal('تعديل كلمة المرور لحساب: ' + u.name, `
 <form class="form" data-form="admin-save-password" data-id="${esc(id)}">
  <div style="background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);padding:12px;border-radius:12px;font-size:12px;color:#fef08a">
   أدخل كلمة المرور الجديدة التي ترغب في تعيينها للمستخدم <b>${esc(u.name)}</b> (${esc(u.email)}).
  </div>
  <label>كلمة المرور الجديدة (6 أحرف أو أكثر)
   <input name="password" type="text" minlength="6" maxlength="128" required placeholder="اكتب كلمة المرور الجديدة هنا">
  </label>
  <button class="btn full" type="submit">حفظ كلمة المرور وتفعيلها فوراً</button>
  <div class="form-error" hidden></div>
 </form>`);
}

function adminDeleteUserModal(id){
 const u = (dashboard.users||[]).find(x=>x.id===id);
 if(!u) return;
 modal('تأكيد حذف الحساب نهائياً', `
 <div class="stack">
  <p style="color:#ef4444;font-size:14px;line-height:1.7">
   ⚠️ هل أنت متأكد من رغبتك في حذف حساب المستخدم <b>${esc(u.name)}</b> (${esc(u.email)}) نهائياً؟
   <br><small style="color:#94a3b8">سيتم إلغاء وصول المستخدم وإنهاء كافة جلساته النشطة.</small>
  </p>
  <div class="inline" style="justify-content:flex-end;gap:10px;margin-top:14px">
   <button class="btn ghost" type="button" data-action="close">إلغاء التراجع</button>
   <button class="btn danger" type="button" data-action="confirm-admin-delete" data-id="${esc(id)}">تأكيد الحذف النهائي</button>
  </div>
 </div>`);
}

'use strict';
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = (v,currency=commerce.currency) => formatMoney(v,currency);
const roles = {Customer:'عميل معتمد', Merchant:'تاجر / شريك تجاري', Courier:'مندوب توصيل', Supervisor:'مشرف عام', Support:'دعم فني', Admin:'الإدارة العليا'};
const statuses = {Preparing:'قيد التجهيز الفاخر',Ready:'جاهز للاستلام',Assigned:'تم إسناد مندوب التوصيل',OnWay:'في الطريق إليك الآن',Delivered:'تم التسليم بنجاح',Cancelled:'ملغي'};
const rights = {'commissions.manage':'إدارة العمولات وكشفها','policies.manage':'إدارة الاتفاقيات وشروط المتجر','registrations.manage':'مراجعة تسجيل العملاء والتجار والمناديب','commerce.manage':'إدارة العملات واللغة وطرق الدفع','payments.review':'مراجعة إيصالات واعتماد الدفع','chat.read':'قراءة الدردشة','chat.delivery':'دردشة العميل والمندوب','chat.support':'دردشة الدعم','chat.text':'إرسال نص','chat.image':'إرسال صور','chat.audio':'تسجيل وإرسال صوت','chat.camera':'التصوير داخل الدردشة','appearance.manage':'تعديل ألوان وصورة وخط المتجر','notifications.send':'إرسال إشعارات للمستخدمين','support.manage':'إدارة تذاكر الدعم','tracking.read':'عرض مواقع الطلبات','orders.create':'إنشاء الطلبات','orders.cancel':'إلغاء الطلب قبل التوصيل','orders.prepare':'تجهيز طلبات المتجر','orders.manage':'إدارة جميع الطلبات','products.write':'إضافة وتعديل المنتجات','delivery.assign':'إسناد مندوب التوصيل','delivery.update':'استلام وتسليم الشحنات','users.manage':'إدارة المستخدمين والصلاحيات','audit.read':'عرض سجل النشاط'};
const defaultRights = {
 Support:[...chatRightKeys.filter(p=>p!=='chat.delivery'),'support.manage','orders.manage','tracking.read'],
 Customer:[...chatRightKeys,'orders.create','orders.cancel'],
 Merchant:[...chatRightKeys.filter(p=>p!=='chat.delivery'),'products.write','orders.prepare','tracking.read'],
 Courier:[...chatRightKeys,'delivery.update','tracking.read'],
 Supervisor:[...chatRightKeys,'orders.manage','orders.prepare','orders.cancel','products.write','delivery.assign','delivery.update','tracking.read','support.manage','payments.review','registrations.manage','notifications.send','appearance.manage','audit.read'],
 Admin:Object.keys(rights)
};
const paths = {
home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
bag:'M5 7h14l1 14H4L5 7Zm4 0V5a3 3 0 0 1 6 0v2',
grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
cart:'M2 3h3l3 13h11l3-9H6M9 21h.01M18 21h.01',
box:'m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10v9M3 8l9 5 9-5M7 5.8l9 5',
truck:'M1 5h13v12H1zM14 9h5l4 4v4h-9M6 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
user:'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M12 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
shield:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Zm-4 10 3 3 5-6',
search:'m21 21-5-5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
plus:'M12 5v14M5 12h14',arrow:'m14 6-6 6 6 6M8 12h13',logout:'M9 3H3v18h6M14 8l5 4-5 4M7 12h12',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
check:'m5 12 4 4L19 6',clock:'M12 8v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20',chart:'M3 3v18h18M7 15l5-5 4 3 5-8',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',close:'m6 6 12 12M6 18 18 6',edit:'m16 3 5 5-13 13H3v-5L16 3Z',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
megaphone:'M3 11l18-5v12L3 14v-3zm0 3v5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-4',
palette:'M12 2a10 10 0 0 0-10 10c0 5.52 4.48 10 10 10 1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.2-.64-1.67-.08-.1-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.48-9-10-9zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
smartphone:'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm5 17h.01',
clipboard:'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z',
coins:'M8 8a6 4 0 1 0 12 0A6 4 0 1 0 8 8zm0 4v4c0 2.2 2.7 4 6 4s6-1.8 6-4v-4M4 12v4c0 2.2 2.7 4 6 4',
headset:'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z'};
function icon(name,size=21){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.bag}"/></svg>`;}
function art(name){
 const shapes={
 bag:'<path d="M53 70h94l9 98H44z" fill="#c99e74"/><path d="M70 74V55a30 30 0 0 1 60 0v19" fill="none" stroke="#8a644a" stroke-width="10"/><path d="M53 83h94M54 153h93" stroke="#e7c5a1" stroke-width="2"/><path d="M83 105h34v31H83z" fill="#b58a63"/><path d="m90 117 6 6 13-15" fill="none" stroke="#e7c5a1" stroke-width="3"/>',
 shoe:'<path d="m38 108 21-52 32 37 29 12 25 6 23 28-8 15H28l-5-19z" fill="#e8e2d6"/><path d="m58 62 26 33 42 18-20 21-44-8-25-19z" fill="#9cac8e"/><path d="M25 143h140v15H28q-10-2-3-15" fill="#fbfaf6"/><path d="m83 101 17-5m-9 14 18-5m-10 13 18-5" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="m119 123 22 8" stroke="#49644d" stroke-width="5"/>',
 headphones:'<path d="M50 121V87a50 50 0 0 1 100 0v35" fill="none" stroke="#313b3d" stroke-width="15"/><path d="M55 85a45 45 0 0 1 90 0" fill="none" stroke="#657173" stroke-width="6"/><rect x="32" y="96" width="38" height="64" rx="17" fill="#465255"/><rect x="130" y="96" width="38" height="64" rx="17" fill="#465255"/><rect x="60" y="100" width="12" height="58" rx="6" fill="#202c30"/><rect x="128" y="100" width="12" height="58" rx="6" fill="#202c30"/>',
 watch:'<path d="M79 21h42l5 62H74zM74 122h52l-5 58H79z" fill="#9aaf9c"/><rect x="63" y="65" width="74" height="75" rx="23" fill="#384a43"/><rect x="69" y="71" width="62" height="63" rx="18" fill="#172e26"/><path d="M100 84v21l14 8" stroke="#d9ecce" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="100" cy="105" r="3" fill="#e9a657"/><rect x="137" y="87" width="6" height="17" rx="3" fill="#7b8d82"/>',
 shirt:'<path d="m65 44-38 34 25 31 18-15-6 72h73l-6-72 18 15 25-31-38-34-19-8q-16 24-33 0z" fill="#e1bb91"/><path d="m85 37 15 18 16-18M97 57v108" fill="none" stroke="#c49b6d" stroke-width="3"/><path d="M111 79h17v19h-17z" fill="#cca579"/><circle cx="103" cy="78" r="2" fill="#8b6848"/><circle cx="103" cy="101" r="2" fill="#8b6848"/><circle cx="103" cy="125" r="2" fill="#8b6848"/>',
 lamp:'<path d="M96 77h9v88h-9z" fill="#8a6c4c"/><ellipse cx="100" cy="166" rx="40" ry="9" fill="#b49168"/><path d="M65 34h70l22 70H43z" fill="#e4cfa8"/><path d="M76 34 64 103m59-69 13 69" stroke="#c6b084" stroke-width="2"/><ellipse cx="100" cy="103" rx="57" ry="7" fill="#bba376"/>',
 coffee:'<path d="M46 69h96l-9 81q-38 29-77 0z" fill="#e5e4d6"/><path d="M141 80h15q35 29-18 47" fill="none" stroke="#c1c4b2" stroke-width="12"/><ellipse cx="94" cy="69" rx="48" ry="12" fill="#c8c8b6"/><ellipse cx="94" cy="70" rx="40" ry="8" fill="#62452f"/><path d="M81 41q-10-11 1-23m23 22q-10-11 1-23" fill="none" stroke="#b6c3ad" stroke-width="4" stroke-linecap="round"/><ellipse cx="98" cy="168" rx="69" ry="9" fill="#c8d2bd"/>',
 bottle:'<rect x="78" y="25" width="44" height="24" rx="7" fill="#c99b70"/><path d="M78 48h44v15q20 11 20 33v68q-42 22-84 0V96q0-22 20-33z" fill="#83a4a0"/><path d="M68 99v55" stroke="#b3cfca" stroke-width="5" stroke-linecap="round"/><rect x="72" y="105" width="56" height="36" rx="3" fill="#e2e7d8"/><path d="m93 113-7 10 10 10 16-20" fill="none" stroke="#63877f" stroke-width="3"/>'};
 return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="100" cy="177" rx="64" ry="9" fill="#1d302d" opacity=".07"/>${shapes[name]||shapes.bag}</svg>`;
}
const palettes={bag:'#f1e8dd',shoe:'#e9eee3',headphones:'#e9edef',watch:'#e3ece5',shirt:'#f6e8d8',lamp:'#f3edde',coffee:'#eaf0e1',bottle:'#e0edeb'};
let config={}, user=null, page='home', category='الكل', search='', dashboard=null, products=[], cart=JSON.parse(localStorage.getItem('ts-cart')||'{}'), favorites=JSON.parse(localStorage.getItem('ts-favorites')||'[]'), busy=false;
let demo=sessionStorage.getItem('ts-demo')==='true', token=sessionStorage.getItem('ts-token')||'', apiBase=localStorage.getItem('ts-server')||'', authMode='login', setupNeeded=false, deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;});
function isNativeWrapper(){return ['appassets.androidplatform.net','appassets.iosplatform.net'].includes(location.host)||location.protocol==='appassets:';}
function isStandaloneApp(){return isNativeWrapper()||window.navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches===true;}
function has(p){return user?.role==='Admin'||user?.permissions?.includes(p);}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function empty(title,detail='',symbol='box'){return `<div class="empty">${icon(symbol,40)}<strong>${esc(title)}</strong>${esc(detail)}</div>`;}
function pill(text,symbol='check'){return `<span class="pill">${icon(symbol,14)}${esc(text)}</span>`;}
function closeModal(){stopChat();disposeMap();$('#modal').close();}
function modal(title,body){stopChat();disposeMap();$('#modal').innerHTML=`<div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-action="close" aria-label="إغلاق">${icon('close',17)}</button></div>${body}`;$('#modal').showModal();}
function cartCount(){return Object.values(cart).reduce((a,b)=>a+b,0);}
function saveCart(){localStorage.setItem('ts-cart',JSON.stringify(cart));}
function date(v){return new Date(v).toLocaleDateString(uiLanguage==='en'?'en-US':'ar-SA',{day:'numeric',month:'short',calendar:'gregory'});}
function amount(v,currency=commerce.currency){return `<span class="vip-price">${money(v,currency)} <small>${currencyLabel(currency)}</small></span>`;}

// High-resolution realistic photographic product assets
// High-resolution realistic photographic product assets
const defaultRealImages = {
 'bag': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=700&auto=format&fit=crop&q=85',
 'watch': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=85',
 'perfume': 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=700&auto=format&fit=crop&q=85',
 'headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=85',
 'shoe': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=85',
 'glasses': 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=700&auto=format&fit=crop&q=85',
 'coffee': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=85',
 'lamp': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=85',
 'camera': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&auto=format&fit=crop&q=85',
 'wallet': 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=700&auto=format&fit=crop&q=85',
 'shirt': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=700&auto=format&fit=crop&q=85',
 'bottle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=700&auto=format&fit=crop&q=85'
};


/* ==========================================================================
   COMPREHENSIVE CORE GROUPS & 52 PRODUCTS CATALOG (المجموعات الأساسية والأصناف)
   ========================================================================== */
const defaultCoreCategories = [
 'الإلكترونيات والهواتف الذكية',
 'الأزياء والملابس الفاخرة',
 'العطور والعود والعناية',
 'الساعات والمجوهرات والإكسسوارات',
 'المنزل والديكور والقهوة',
 'الأحذية والحقائب الجلدية',
 'الأجهزة المنزلية والذكية',
 'التمور والضيافة العربية'
];

let storeCategories = [...defaultCoreCategories];

const masterCatalogItems = [
 // 1. الإلكترونيات والهواتف الذكية
 ['آيفون 16 برو ماكس 256 جيجا تيتانيوم','الإلكترونيات والهواتف الذكية',5199,'watch',25,'شاشة Super Retina XDR مقاس 6.9 بوصة مع شريحة A18 Pro ونظام كاميرات احترافي فائق الدقة.','https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=700&auto=format&fit=crop&q=80'],
 ['سامسونج جالكسي S24 ألترا 512 جيجا','الإلكترونيات والهواتف الذكية',4699,'watch',20,'مزود بقلم S Pen المدمج وميزات الذكاء الاصطناعي Galaxy AI وكاميرا 200 ميجابكسل.','https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=700&auto=format&fit=crop&q=80'],
 ['لابتوب ماك بوك برو M3 مقاس 14 بوصة','الإلكترونيات والهواتف الذكية',7499,'watch',10,'أداء خارق للمحترفين مع شاشة Liquid Retina XDR وبطارية تدوم حتى 22 ساعة.','https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&auto=format&fit=crop&q=80'],
 ['آيباد برو شاشة OLED مقاس 13 بوصة','الإلكترونيات والهواتف الذكية',4899,'watch',15,'أنحف وأقوى جهاز لوحي بشاشة Ultra Retina XDR ومعالج M4 فائق السرعة.','https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=700&auto=format&fit=crop&q=80'],
 ['سماعة رأس لاسلكية عازلة للضوضاء ANC','الإلكترونيات والهواتف الذكية',1299,'headphones',30,'صوت محيطي فائق النقاء Hi-Res مع عزل ذكي للضوضاء وبطارية 35 ساعة.','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80'],
 ['سماعات أذن لاسلكية برو مقاومة للماء','الإلكترونيات والهواتف الذكية',899,'headphones',40,'تصميم مريح داخل الأذن مع صوت مكاني تفاعلي وشحن لاسلكي سريع MagSafe.','https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop&q=80'],
 ['كاميرا رقمية احترافية ميرورليس 4K','الإلكترونيات والهواتف الذكية',6400,'watch',8,'مستشعر إطار كامل بدقة 33 ميجابكسل وتصوير فيديو سينمائي 4K 60fps.','https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&auto=format&fit=crop&q=80'],
 ['شاحن متنقل باور بانك 20000 مللي أمبير','الإلكترونيات والهواتف الذكية',249,'watch',60,'شحن سريع بقوة 65 واط يدعم شحن الهواتف واللابتوبات مع شاشة رقمية.','https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=700&auto=format&fit=crop&q=80'],

 // 2. الأزياء والملابس الفاخرة
 ['ثوب رجالي كلاسيكي قماش ياباني فاخر','الأزياء والملابس الفاخرة',380,'shirt',45,'خامة يابانية باردة ومقاومة للتجعد مع خياطة متقنة وتفاصيل ياقة ملكية.','https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=700&auto=format&fit=crop&q=80'],
 ['بشت ملكي حساوي مطرز بخيوط الزري الذهبي','الأزياء والملابس الفاخرة',1850,'shirt',12,'حياكة يدوية أصيلة من الصوف الطبيعي الناعم وتطريز زري ألماني مذهب.','https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=700&auto=format&fit=crop&q=80'],
 ['عباية كريب حريري سوداء بتطريز ناعم','الأزياء والملابس الفاخرة',540,'shirt',28,'قصة انسيابية راقية من الكريب الكوري الأصلي مع طرحة مطرزة متناسقة.','https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=700&auto=format&fit=crop&q=80'],
 ['بدلة رسمية إيطالية صوف كشمير','الأزياء والملابس الفاخرة',1650,'shirt',14,'تفصيل إيطالي Slim Fit يمنحك حضوراً مميزاً في الاجتماعات والمناسبات الرسمية.','https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=700&auto=format&fit=crop&q=80'],
 ['قميص قطن مصري نخبوي بأزرار صدفية','الأزياء والملابس الفاخرة',260,'shirt',35,'منسوج من القطن الطبيعي 100% بملمس حريري ناعم وتصميم رسمي أنيق.','https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=700&auto=format&fit=crop&q=80'],
 ['شماغ ملكي قطن إنجليزي أصلي','الأزياء والملابس الفاخرة',320,'shirt',50,'حياكة إنجليزية فاخرة من القطن الخالص بثبات عالٍ للأطراف واللون.','https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=700&auto=format&fit=crop&q=80'],
 ['جاكيت شتوي جلد طبيعي مبطن','الأزياء والملابس الفاخرة',790,'shirt',18,'جلد طبيعي معالج مقاوم للأمطار والرياح مع بطانة داخلية دافئة ومريحة.','https://images.unsplash.com/photo-1551028719-00167b16eac5?w=700&auto=format&fit=crop&q=80'],
 ['فستان سهرة مخملي بتصميم ملكي','الأزياء والملابس الفاخرة',920,'shirt',15,'تصميم عصري فاخر للمناسبات الخاصة بخامات ناعمة وتطريز يدوي متقن.','https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=700&auto=format&fit=crop&q=80'],

 // 3. العطور والعود والعناية
 ['عطر العود الملكي المعتق 100 مل','العطور والعود والعناية',490,'bottle',30,'مزيج ساحر من دهن العود الكمبودي المعتق مع العنبر الدافئ والمسك الأبيض.','https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=700&auto=format&fit=crop&q=80'],
 ['دهن عود كمبودي قديم ربع تولة','العطور والعود والعناية',650,'bottle',20,'دهن عود صافي طبيعي 100% ذو ثبات عالٍ وفوحان يدوم لأكثر من يومين.','https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=700&auto=format&fit=crop&q=80'],
 ['أوقية عود مروكي طبيعي محسن فاخر','العطور والعود والعناية',340,'bottle',40,'كسرات مباخر منتقاة بعناية تتميز برائحة بخورية زكية وكثافة دخان عالية.','https://images.unsplash.com/photo-1541643600914-78b084683601?w=700&auto=format&fit=crop&q=80'],
 ['عطر ورد طائفي ملكي نخب أول','العطور والعود والعناية',420,'bottle',25,'مستخلص من قطفة الورد الطائفي البكر ليمنحك عبير الأصالة والانتعاش.','https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=700&auto=format&fit=crop&q=80'],
 ['مجموعة العناية الفاخرة بالبشرة والذهب','العطور والعود والعناية',580,'bottle',22,'طقم متكامل يضم سيروم الكولاجين وكريم الترطيب العميق بخلاصة الذهب.','https://images.unsplash.com/photo-1556228720-195a672e8a03?w=700&auto=format&fit=crop&q=80'],
 ['مبخرة إلكترونية ذكية محمولة','العطور والعود والعناية',195,'bottle',55,'تسخين فوري آمن للعود والبخور بدون فحم، مثالية للسيارة والمكتب والمنزل.','https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=700&auto=format&fit=crop&q=80'],
 ['عطر مسك الرمان الأبيض الفاخر','العطور والعود والعناية',230,'bottle',45,'نفحات ناعمة تجمع بين المسك الصافي وخلاصة فاكهة الرمان المنعشة.','https://images.unsplash.com/photo-1594035910387-fea47794261f?w=700&auto=format&fit=crop&q=80'],

 // 4. الساعات والمجوهرات والإكسسوارات
 ['ساعة كرونوغراف سويسرية مطلية بالذهب','الساعات والمجوهرات والإكسسوارات',1450,'watch',12,'حركة أوتوماتيكية دقيقة مع زجاج ياقوتي ضد الخدش ومقاومة للماء حتى 100 متر.','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80'],
 ['ساعة ذكية ألترا تيتانيوم رياضية','الساعات والمجوهرات والإكسسوارات',3199,'watch',18,'هيكل تيتانيوم صلب مع نظام GPS مزدوج التردد ومستشعرات صحية متكاملة.','https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=700&auto=format&fit=crop&q=80'],
 ['نظارة شمسية مستقطبة بإطار تيتانيوم ذهبي','الساعات والمجوهرات والإكسسوارات',360,'watch',30,'حماية كاملة UV400 من أشعة الشمس مع تصميم خفيف ومريح للقيادة والسفر.','https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=700&auto=format&fit=crop&q=80'],
 ['طقم قلم وكبك رجالي مطلي بالذهب والصدف','الساعات والمجوهرات والإكسسوارات',440,'watch',25,'علبة إهداء ملكية فاخرة تضم قلماً انسيابياً وأزرار أكمام (كبك) ومسبحة.','https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=700&auto=format&fit=crop&q=80'],
 ['عقد ذهب عيار 18 بتصميم الألماس الناعم','الساعات والمجوهرات والإكسسوارات',2250,'watch',9,'تصميم أنثوي ساحر مرصع بأحجار الزركون السويسري البراق مع شهادة ضمان.','https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=700&auto=format&fit=crop&q=80'],
 ['سبحة كهرمان طبيعي أصلي بتمليكة فضة','الساعات والمجوهرات والإكسسوارات',520,'watch',20,'خراطة يدوية متقنة من الكهرمان الصافي مع طربزونة فضة عيار 925.','https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=700&auto=format&fit=crop&q=80'],

 // 5. المنزل والديكور والقهوة
 ['ماكينة إسبريسو وكابتشينو إيطالية احترافية','المنزل والديكور والقهوة',1150,'coffee',14,'مضخة ضغط 15 بار مع مطحنة بن مدمجة وعصا تبخير الحليب لتحضير القهوة المختصة.','https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80'],
 ['طقم دلال قهوة عربية وفناجيل مذهبة (18 قطعة)','المنزل والديكور والقهوة',680,'coffee',20,'دلتان ستانلس ستيل تحفظ الحرارة 18 ساعة مع 12 فنجال قهوة و6 بيالات شاي مذهبة.','https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=700&auto=format&fit=crop&q=80'],
 ['مصباح طاولة رخامي بإضاءة LED دافئة','المنزل والديكور والقهوة',290,'lamp',25,'قاعدة من الرخام الطبيعي مع تحكم باللمس في 3 درجات سطوع لإضاءة مريحة.','https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=80'],
 ['فواحة عطرية ذكية بتقنية الموجات فوق الصوتية','المنزل والديكور والقهوة',185,'lamp',40,'تعطير هادئ للمنزل والمكتب مع إضاءة محيطية بـ 7 ألوان ومؤقت إيقاف تلقائي.','https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=700&auto=format&fit=crop&q=80'],
 ['سجادة صلاة تركية طبية مبطنة بالميموري فوم','المنزل والديكور والقهوة',145,'lamp',60,'ثلاث طبقات مريحة للمفاصل والركبتين بنقوش إسلامية هادئة وملمس مخملي.','https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=700&auto=format&fit=crop&q=80'],
 ['حقيبة تحضير القهوة المختصة V60 للسفر','المنزل والديكور والقهوة',370,'coffee',22,'تضم مطحنة يدوية، إبريق ترشيح، ميزان رقمي، قمع تقطير، وفلاتر وكوبين.','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=700&auto=format&fit=crop&q=80'],

 // 6. الأحذية والحقائب الجلدية
 ['حقيبة يد نسائية جلد إيطالي طبيعي','الأحذية والحقائب الجلدية',590,'bag',18,'مصنوعة يدوياً من أفخم الجلود الطبيعية مع قفل ذهبي وحزام كتف قابل للتعديل.','https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=700&auto=format&fit=crop&q=80'],
 ['حذاء رياضي كاجوال مريح للمشي والجري','الأحذية والحقائب الجلدية',390,'shoe',32,'نعل مرن ممتص للصدمات مع نسيج شبكي يسمح بالتهوية طوال اليوم.','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80'],
 ['حذاء شرقي جلد طبيعي مطرز يدوياً','الأحذية والحقائب الجلدية',280,'shoe',40,'أصالة الصناعة اليدوية من الجلد الطبيعي المريح مع أرضية طبية مانعة للانزلاق.','https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=700&auto=format&fit=crop&q=80'],
 ['حقيبة سفر ذكية صلبة بميزان وقفل رقمي TSA','الأحذية والحقائب الجلدية',460,'bag',25,'هيكل بولي كربونات مقاوم للكسر مع 4 عجلات مزدوجة تدور 360 درجة.','https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=700&auto=format&fit=crop&q=80'],
 ['محفظة بطاقات جلد طبيعي بحماية RFID','الأحذية والحقائب الجلدية',165,'bag',50,'تصميم نحيف للغاية يتسع لـ 8 بطاقات والأوراق النقدية مع حماية ضد السرقة اللاسلكية.','https://images.unsplash.com/photo-1627123424574-724758594e93?w=700&auto=format&fit=crop&q=80'],
 ['حقيبة ظهر عملية للابتوب مقاومة للماء','الأحذية والحقائب الجلدية',230,'bag',35,'تتسع للابتوب حتى 16 بوصة مع منفذ شحن USB خارجي وجيوب متعددة منظمة.','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700&auto=format&fit=crop&q=80'],

 // 7. الأجهزة المنزلية والذكية
 ['مكنسة روبوت ذكية بالليزر والمسح الرطب','الأجهزة المنزلية والذكية',1590,'lamp',12,'رسم خرائط ذكي للمنزل بالليزر مع تفريغ تلقائي للغبار وتحكم كامل من الجوال.','https://images.unsplash.com/photo-1558317374-067fb5f30001?w=700&auto=format&fit=crop&q=80'],
 ['منقي ومعقم هواء ذكي بفلتر HEPA الثلاثي','الأجهزة المنزلية والذكية',690,'lamp',20,'ينقي 99.97% من الغبار ومسببات الحساسية والروائح مع مستشعر جودة الهواء.','https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&auto=format&fit=crop&q=80'],
 ['قلاية هوائية رقمية صحية سعة 7 لتر','الأجهزة المنزلية والذكية',430,'coffee',28,'طهي صحي بدون زيت مع 8 برامج مسبقة وشاشة لمس رقمية ونافذة مراقبة.','https://images.unsplash.com/photo-1585515320310-259814833e62?w=700&auto=format&fit=crop&q=80'],
 ['شاشة تلفزيون ذكية 65 بوصة 4K QLED','الأجهزة المنزلية والذكية',2490,'watch',10,'ألوان سينمائية نابضة بالحياة مع تقنية Dolby Vision ونظام تشغيل ذكي متكامل.','https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=700&auto=format&fit=crop&q=80'],
 ['قفل باب ذكي بالبصمة والبطاقة وتطبيق الجوال','الأجهزة المنزلية والذكية',780,'watch',16,'أمان فائق لمنزلك أو مكتبك مع 5 طرق فتح: البصمة، الرمز السري، البطاقة، المفتاح، والتطبيق.','https://images.unsplash.com/photo-1558002038-1055907df827?w=700&auto=format&fit=crop&q=80'],

 // 8. التمور والضيافة العربية
 ['تمر سكري قصيمي ملكي فاخر (كرتون 3 كيلو)','التمور والضيافة العربية',145,'coffee',80,'تمور سكري مفتل فرز أول حبة كبيرة ولون ذهبي، معبأة ومغلفة بعناية فائقة.','https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=700&auto=format&fit=crop&q=80'],
 ['تمر عجوة المدينة المنورة الفاخر 1 كيلو','التمور والضيافة العربية',120,'coffee',65,'عجوة المدينة الأصلية طبيعية 100% من مزارع العوالي المباركة في علبة إهداء.','https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=700&auto=format&fit=crop&q=80'],
 ['تمر مجدول ملكي جامبو محشي بالمكسرات','التمور والضيافة العربية',175,'coffee',50,'تشكيلة فاخرة للضيافة محشوة باللوز المحمص والفستق والبيكان والطحينة السائلة.','https://images.unsplash.com/photo-1548907040-4baa42d10919?w=700&auto=format&fit=crop&q=80'],
 ['قهوة سعودية شقراء بالزعفران والهيل (1 كيلو)','التمور والضيافة العربية',95,'coffee',90,'خلطة بن هرري محمصة بعناية ومطعمة بالهيل الفاخر والزعفران الأصلي والقرنفل.','https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=700&auto=format&fit=crop&q=80'],
 ['صينية شوكولاتة بلجيكية فاخرة للضيافة (1.2 كيلو)','التمور والضيافة العربية',260,'coffee',35,'تشكيلة متنوعة من الشوكولاتة البلجيكية الفاخرة بحشوات الكراميل والبندق والفستق.','https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=700&auto=format&fit=crop&q=80'],
 ['عسل سدر جبلي طبيعي أصلي (1 كيلو)','التمور والضيافة العربية',290,'bottle',40,'عسل سدر طبيعي مفحوص مخبرياً غني بالإنزيمات الطبيعية وذو طعم وقوام مميز.','https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=700&auto=format&fit=crop&q=80']
];

function seedDemo(){
  const names = masterCatalogItems;
 const users=[
  {id:'c1',name:'نورة أحمد',email:'customer@example.test',role:'Customer'},
  {id:'m1',name:'متجر التفاصيل الفاخرة',email:'merchant@example.test',role:'Merchant'},
  {id:'d1',name:'خالد عبدالله',email:'courier@example.test',role:'Courier'},
  {id:'s1',name:'فريق الدعم الفني المباشر',email:'support@example.test',role:'Support'},
  {id:'a1',name:'Ahmed',email:'ahmed@matjar.local',role:'Admin',password:'583192'}
 ].map(u=>({...u,active:true,overrides:{}}));
 
 const prods=names.map((p,i)=>({id:'p'+i,merchantId:'m1',name:p[0],category:p[1],price:p[2],icon:p[3],stock:p[4],description:p[5],image:p[6],active:true}));
 const orders=['Preparing','Ready','Assigned','OnWay','Delivered'].map((status,i)=>({id:'o'+i,number:'TS-261109-'+String(120+i),customerId:'c1',customerName:'نورة أحمد',address:'الرياض، حي الياسمين، شارع أنس بن مالك',phone:'0500000000',lines:[{productId:'p'+i,merchantId:'m1',name:prods[i].name,price:prods[i].price,qty:1,icon:prods[i].icon,image:prods[i].image}],total:prods[i].price+15,status,pin:'123456',courierId:i>=2?'d1':null,createdAt:new Date(Date.now()-i*86400000).toISOString(),readyMerchants:i>0?['m1']:[]}));
 const banners=[{id:'b1',title:'تشكيلة الموسم الفاخرة ',subtitle:'خصومات حصرية تصل إلى 35% مع توصيل مجاني سريع لجميع الطلبات',image:'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',linkUrl:'الكل',buttonText:'تسوق المجموعة الفاخرة',bgColor:'#064e3b',textColor:'#ffffff',active:true,sortOrder:1}];
 const staff=[{id:'st1',fullName:'أحمد محمد سالم',jobTitle:'مشرف جودة التغليف والشحن',department:'العمليات والمخزن',phone:'0501112233',nationalId:'1088776655',shift:'صباحي',workingHours:'8 ساعات',monthlySalary:4800,status:'Active',notes:'مسؤول الفحص النهائي للطلبيات وضمان معايير الجودة الفاخرة',address:'الرياض، حي الملقا',createdAt:new Date().toISOString()}];
 return {users,products:prods,orders,banners,staff,audit:[]};
}

function demoData(){const raw=localStorage.getItem('ts-demo-data');const d=raw?JSON.parse(raw):seedDemo();d.tickets??=[];d.banners??=[];d.staff??=[];
 let admin=d.users.find(u=>u.role==='Admin');
 if(admin&&admin.name!=='Ahmed'){admin.name='Ahmed';admin.email='ahmed@matjar.local';admin.password='583192';}
 if(!d.users.some(u=>u.role==='Support'))d.users.push({id:'s1',name:'فريق الدعم الفني المباشر',email:'support@example.test',role:'Support',active:true,overrides:{}});
 return d;
}
function persistDemo(d){localStorage.setItem('ts-demo-data',JSON.stringify(d));}
function demoUser(u){return {...u,permissions:Object.keys(rights).filter(p=>u.role==='Admin'||(p in u.overrides?u.overrides[p]:defaultRights[u.role].includes(p)))};}

async function request(path,method='GET',body){
 if(demo){const governanceResult=governanceDemo(path,method,body);if(governanceResult!==undefined)return governanceResult;const commerceResult=commerceDemo(path,method,body);if(commerceResult!==undefined)return commerceResult;const chatResult=chatDemo(path,method,body);if(chatResult!==undefined)return chatResult;const appearanceResult=appearanceDemo(path,method,body);if(appearanceResult!==undefined)return appearanceResult;const ext=extendedDemoRequest(path,method,body);if(ext!==undefined)return ext;return demoRequest(path,method,body);}
 const res=await fetch(apiBase+ '/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 let data;try{data=await res.json();}catch{throw new Error('تعذر قراءة استجابة المتجر');}
 if(!res.ok){if(res.status===401){token='';user=null;sessionStorage.removeItem('ts-token');}throw new Error(data.error||'تعذر إتمام العملية');}return data;
}

function demoRequest(path,method,body){
 const d=demoData(); const u=d.users.find(x=>x.id===user?.id); const order=d.orders.find(o=>path.includes('/'+o.id+'/')); let result={ok:true};
 if(path==='/products'&&method==='GET')return d.products.filter(p=>p.active);
 if(path==='/me')return demoUser(u);
 if(path==='/me/profile'&&method==='PUT'){
  if(body.newPassword&&body.currentPassword!==(u.password||'583192'))throw new Error('كلمة المرور الحالية غير صحيحة');
  u.name=body.name;if(body.email)u.email=body.email;if(body.newPassword)u.password=body.newPassword;
  persistDemo(d);return demoUser(u);
 }
 if(path==='/dashboard')return {user:demoUser(u),products:d.products.filter(p=>u.role==='Admin'||p.merchantId===u.id),orders:d.orders.filter(o=>u.role==='Admin'||(u.role==='Customer'&&o.customerId===u.id)||(u.role==='Merchant'&&o.lines.some(l=>l.merchantId===u.id))||(u.role==='Courier'&&o.courierId===u.id)).map(o=>({...decorateDemoPayment(o,d),pin:u.role==='Customer'||u.role==='Admin'?o.pin:''})),users:u.role==='Admin'?d.users.map(demoUser):[],staff:u.role==='Admin'?d.staff:[],banners:d.banners.filter(b=>b.active),audit:d.audit,permissions:rights};
 if(path==='/auth/logout')return result;
 if(path==='/products'&&method==='POST'){d.products.push({...body,id:crypto.randomUUID(),merchantId:u.role==='Admin'?body.merchantId:u.id});}
 if(path.startsWith('/products/')&&method==='PUT'){Object.assign(d.products.find(p=>p.id===path.split('/')[2]),body);}
 if(path==='/orders'&&method==='POST'){
  const lines=body.items.map(l=>{const p=d.products.find(p=>p.id===l.productId);if(!p||p.stock<l.qty)throw new Error('الكمية المطلوبة غير متوفرة');return {productId:p.id,merchantId:p.merchantId,name:p.name,price:p.price,icon:p.icon,image:p.image||defaultRealImages[p.icon]||'',qty:l.qty};});
  lines.forEach(l=>d.products.find(p=>p.id===l.productId).stock-=l.qty);
  result={id:crypto.randomUUID(),number:'TS-DEMO-'+(d.orders.length+120),customerId:u.id,customerName:u.name,address:body.address,phone:body.phone,destination:checkoutDestination,lines,total:lines.reduce((n,l)=>n+l.price*l.qty,0)+commerce.deliveryFee,currency:commerce.currency,deliveryFee:commerce.deliveryFee,paymentMethodId:body.paymentMethodId||'cod',status:'Preparing',createdAt:new Date().toISOString(),pin:String(Math.floor(100000+Math.random()*900000)),readyMerchants:[]}; decorateDemoPayment(result,d);demoCommissionSnapshot(result);d.orders.unshift(result);
 }
 if(order){if(path.endsWith('/ready'))order.status='Ready';if(path.endsWith('/assign')){order.courierId=body.courierId;order.status='Assigned';}if(path.endsWith('/pickup'))order.status='OnWay';if(path.endsWith('/deliver')){if(body.pin!==order.pin)throw new Error('رمز التسليم غير صحيح');order.status='Delivered';}if(path.endsWith('/cancel')){if(!['Preparing','Ready'].includes(order.status))throw new Error('لا يمكن إلغاء الطلب في حالته الحالية');order.status='Cancelled';order.lines.forEach(l=>d.products.find(p=>p.id===l.productId).stock+=l.qty);}}
 if(path==='/users'&&method==='POST'){if(d.users.some(x=>x.email===body.email))throw new Error('البريد مسجل');d.users.push({...body,id:crypto.randomUUID(),active:true,overrides:{},password:undefined});}
 if(path.startsWith('/users/')&&method==='PUT'){Object.assign(d.users.find(x=>x.id===path.split('/')[2]),body);}
 d.audit.unshift({at:new Date().toISOString(),name:u?.name||'',action:'تحديث تجريبي'});persistDemo(d);return result;
}

async function refresh(){await refreshGovernance();await refreshCommerce();await refreshDesigns();await refreshAppearance();await refreshBanners();try{const sCats=await request('/categories');if(Array.isArray(sCats)&&sCats.length)storeCategories=[...new Set([...sCats,...defaultCoreCategories])];}catch(e){}
 products=await request('/products');if(user){dashboard=await request('/dashboard');user=dashboard.user;}render();await updateNotices();}
function navs(){
 if(!user)return[];
 if(user.role==='Support')return [
  ['home','headset','الدعم والمحادثات'],
  ['orders','box','متابعة الطلبات'],
  ['notices','bell','الإشعارات'],
  ['account','user','حسابي']
 ];
 if(user.role==='Customer')return [
  ['home','home','الرئيسية'],
  ['favorites','heart','المفضلة'],
  ['cart','cart','حقيبة التسوق'],
  ['orders','box','طلبياتي'],
  ['support','headset','الدعم والمحادثة'],
  ['notices','bell','الإشعارات'],
  ['account','user','حسابي']
 ];
 if(user.role==='Merchant')return [
  ['home','grid','لوحة التاجر'],
  ['products','bag','منتجاتي'],
  ['orders','box','طلبات متجري'],
  ['support','headset','الدعم الفني'],
  ['notices','bell','الإشعارات'],
  ['account','user','حسابي']
 ];
 if(user.role==='Courier')return [
  ['home','truck','مهام التوصيل'],
  ['history','clock','سجل التسليم'],
  ['support','headset','الدعم الفني'],
  ['notices','bell','الإشعارات'],
  ['account','user','حسابي']
 ];
 if(user.role==='Support')return [
  ['home','headset','الدعم المباشر'],
  ['orders','box','الطلبات'],
  ['notices','bell','الإشعارات'],
  ['account','user','حسابي']
 ];
 if(user.role==='Supervisor')return [
  ['home','grid','لوحة المشرف'],
  ['orders','box','إدارة الطلبات'],
  ['products','bag','المنتجات'],
  ['banners','megaphone','الإعلانات'],
  ['appearance','palette','مظهر المتجر'],
  ['support','headset','مركز الدعم'],
  ['notices','bell','الإشعارات'],
  ['audit','clock','سجل النشاط'],
  ['account','user','حسابي']
 ];
 // Admin full control bar
 return [
  ['home','grid','لوحة التحكم'],
  ['orders','box','الطلبات'],
  ['products','bag','المنتجات'],
  ['banners','megaphone','الإعلانات'],
  ['appearance','palette','مظهر المتجر'],
  ['devices','smartphone','الأجهزة والخريطة'],
  ['users','shield','المستخدمين'],
  ['regfields','clipboard','نموذج التسجيل'],
  ['staff','users','طاقم العمل'],
  ['support','headset','الدعم الفني'],
  ['commissions','coins','العمولات'],
  ['notices','bell','الإشعارات'],
  ['audit','clock','سجل النشاط'],
  ['account','user','حسابي']
 ];
}

function navHtml(mobile=false){
 const pendingOrders = (dashboard?.orders||[]).filter(o=>!['Delivered','Cancelled'].includes(o.status)).length;
 const frozenUsers = (dashboard?.users||[]).filter(u=>!u.active).length;
 const unreadNotices = (typeof noticeCache!=='undefined'?noticeCache:[]).filter(n=>!n.read).length;
 
 return navs().map(([id,symbol,title])=>{
  let badge = '';
  if(id==='cart' && cartCount()) badge = `<b class="count">${cartCount()}</b>`;
  else if(id==='orders' && pendingOrders) badge = `<b class="count">${pendingOrders}</b>`;
  else if(id==='users' && frozenUsers && user?.role==='Admin') badge = `<b class="count" style="background:#ef4444;color:#fff">${frozenUsers}</b>`;
  else if(id==='notices' && unreadNotices) badge = `<b class="count">${unreadNotices}</b>`;
  else if(id==='favorites' && favorites?.length) badge = `<b class="count">${favorites.length}</b>`;
  
  return `<button type="button" data-action="navigate" data-id="${id}" class="${page===id?'active':''}">${icon(symbol,mobile?21:20)}<span>${title}</span>${badge}</button>`;
 }).join('');
}

function render(){
 document.body.dataset.page = page;
 if(!user){renderAuth();return;}
 const current=navs().find(n=>n[0]===page)||navs()[0];
 
 // إذا كان الهيكل الخارجي (الشريط الجانبي والعلوي) موجوداً بالفعل، لا نعيد بناءه منعاً لترميش الشاشة
 const existingView = document.getElementById('view');
 if(!existingView || !document.querySelector('.sidebar')){
  $('#app').innerHTML=`<div id="announcement-banner" class="announcement-bar" hidden></div><aside class="sidebar"><div class="brand"><img src="icon.svg" alt="شعار المتجر"><div>${esc(storeAppearance.storeName)}<small style="color:var(--vip-gold);font-weight:bold">★ متجر رسمي معتمد</small></div></div><nav class="nav" aria-label="القائمة الرئيسية">${navHtml()}</nav><div class="sidebar-footer"><div class="panel" style="background:linear-gradient(135deg, rgba(6,78,59,0.08) 0%, rgba(212,175,55,0.12) 100%);border:1px solid rgba(212,175,55,0.3);padding:17px"><strong style="font-size:12px;color:var(--vip-emerald)">تجربة تسوق فاخرة واستثنائية</strong><p class="hint" style="margin-top:8px">منتجات حصرية بجودة فائقة وخدمة تسليم مباشرة على مدار الساعة.</p></div><div class="profile"><span class="avatar" style="border:2px solid var(--vip-gold)">${esc(user.name[0])}</span><div><strong>${esc(user.name)}</strong><small style="color:var(--vip-gold)">${roles[user.role]}</small></div></div><button class="btn ghost small" data-action="logout">${icon('logout',17)}تسجيل الخروج</button></div></aside><main class="content"><header class="topbar"><div><div class="eyebrow">${user.role==='Customer'?'مرحباً بك في عالم '+esc(storeAppearance.storeName)+' الفاخر':roles[user.role]+' / مساحة التحكم الرئيسية'}</div><div class="title" id="topbar-title-el">${current[2]} <small>· ${esc(user.name)}</small></div></div><div class="left"><button class="icon-btn" data-action="instant-refresh" title="تحديث المتجر والبيانات فوراً" aria-label="تحديث">${icon('refresh',18)}</button><button class="icon-btn" data-action="notices" aria-label="الإشعارات">${icon('bell')}<small class="notice-count"></small></button>${pill('متجر رسمي معتمد','shield')}<button class="icon-btn" data-action="navigate" data-id="${user.role==='Customer'?'cart':'orders'}" aria-label="${user.role==='Customer'?'فتح السلة':'عرض الطلبات'}">${icon(user.role==='Customer'?'cart':'box')}</button><span class="avatar">${esc(user.name[0])}</span></div></header>${demo?`<div class="demo-bar" style="background:#fff9ea;border-color:#f5dc99"><span>⭐ الحساب الرئيسي للمتجر: <b>Ahmed</b> (الرمز: <b>583192</b>)</span><button data-action="switch-role">تبديل الواجهة</button><button data-action="appearance">🎨 مظهر المتجر واللوجو</button><button data-action="banners-manager">📢 إدارة الإعلانات</button><button data-action="connect">ربط المتجر</button></div>`:''}<section id="view"></section></main><nav class="mobile-nav" aria-label="تنقل التطبيق">${navHtml(true)}</nav>`;
  paintAppearance();
 } else {
  // تحديث نصوص العنوان والتبويبات النشطة موضعياً بسلاسة 100% وبدون وميض
  const titleEl = document.getElementById('topbar-title-el');
  if(titleEl) titleEl.innerHTML = `${current[2]} <small>· ${esc(user.name)}</small>`;
  document.querySelectorAll('.nav button, .mobile-nav button').forEach(b => {
   b.classList.toggle('active', b.dataset.id === page);
  });
 }
 const view=$('#view');
 if(page==='home' && user.role==='Support'){ view.innerHTML=supportHome(); afterSupportRender(); return; }
 else if(page==='support'){ view.innerHTML=supportHome(); afterSupportRender(); return; }
 if(page==='home')view.innerHTML=user.role==='Customer'?shop():user.role==='Courier'?courier(false):overview();
 else if(page==='products')view.innerHTML=productManagement();
 else if(page==='orders')view.innerHTML=ordersView();
 else if(page==='history')view.innerHTML=courier(true);
 else if(page==='cart')view.innerHTML=cartView();
 else if(page==='staff')view.innerHTML=staffPageView();
 else if(page==='devices'){devicesView().then(html => { view.innerHTML = html; setTimeout(() => { initDevicesMap(lastDevicesList); if(devicesMapInstance) devicesMapInstance.invalidateSize(); }, 80); }); return;}
 else if(page==='favorites')view.innerHTML=favoritesView();
 else if(page==='users')view.innerHTML=usersView();
 else if(page==='audit')view.innerHTML=`<div class="section-head"><div><h2>سجل نشاط المتجر</h2><p>تتبع العمليات والمستخدمين والمنتجات والطلبات بدقة</p></div>${pill((dashboard.audit||[]).length+' عملية','clock')}</div><div class="panel">${(dashboard.audit||[]).map(a=>`<div class="audit-item">${esc(a.action)}<small>${esc(a.name)} · ${date(a.at)}</small></div>`).join('')||empty('لا توجد عمليات مسجلة بعد')}</div>`;
 else view.innerHTML=accountView();
}

function productCard(p,manage=false){
 const realImg = p.image || defaultRealImages[p.icon] || '';
 return `<article class="vip-product-card">
  <div class="vip-product-img-box" style="cursor:pointer" data-action="view-product" data-id="${esc(p.id)}">
   <span class="vip-product-badge">${p.stock ? '★ متوفر للتسليم' : 'نفد من المخزون'}</span>
   ${realImg ? `<img src="${esc(realImg)}" class="vip-product-img" alt="${esc(p.name)}" loading="lazy">` : art(p.icon)}
   ${!manage ? `<button data-action="favorite" data-id="${esc(p.id)}" class="wish ${favorites.includes(p.id)?'selected':''}" aria-label="إضافة للمفضلة">${icon('heart',15)}</button>` : ''}
  </div>
  <div class="vip-product-body">
   <span class="vip-product-category">${esc(p.category)} ${manage ? ' · ' + p.stock + ' قطعة متبقية' : ''}</span>
   <h3 class="vip-product-title">${esc(p.name)}</h3>
   <p class="vip-product-desc">${esc(p.description || 'منتج حصري وفاخر تم اختياره بعناية ليناسب ذوقك الرفيع.')}</p>
   <div class="vip-product-footer">
    ${amount(p.price)}
    ${manage ? `
    <div class="inline" style="gap:6px">
     <button class="btn small secondary" type="button" data-action="edit-product" data-id="${esc(p.id)}" title="تعديل الصنف والسعر" style="padding:7px 11px;font-size:11px">✏️ تعديل</button>
     <button class="btn small danger" type="button" data-action="delete-product" data-id="${esc(p.id)}" title="حذف الصنف نهائياً" style="padding:7px 11px;font-size:11px">🗑️ حذف</button>
    </div>` : `
    <button class="vip-btn-add" data-action="add" data-id="${esc(p.id)}" aria-label="إضافة إلى السلة" title="إضافة إلى السلة">
     ${icon('plus',18)}
    </button>`}
   </div>
  </div>
 </article>`;
}


/* ==========================================================================
   DYNAMIC LUXURY ADS & BANNER CAROUSEL ENGINE (محرك لوحة الإعلانات المتحركة)
   ========================================================================== */
let loginAdTimer = null;
let currentLoginAdIndex = 0;

function renderLoginAdsCarousel(){
 const ads = (storeBanners || []).filter(b => b.active && (b.placement === 'Login' || b.placement === 'Both' || !b.placement));
 if(!ads.length) return '';
 
 const ad = ads[currentLoginAdIndex % ads.length];
 const animClass = ad.animation === 'fade' ? 'ad-fade' : ad.animation === 'zoom' ? 'ad-zoom' : 'ad-slide';

 return `
 <div class="login-ads-wrapper">
  <div class="login-ad-card ${animClass}" style="background-color:${esc(ad.bgColor||'#087e66')};color:${esc(ad.textColor||'#ffffff')};background-image:linear-gradient(rgba(2,23,17,0.35),rgba(2,17,13,0.75)),url(${esc(ad.image||'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80')})">
   <div class="login-ad-content">
    <span class="badge" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold;margin-bottom:8px;display:inline-block">${esc(ad.badge||'★ عرض خاص وحصري')}</span>
    <h2 style="font-size:20px;color:#ffffff;line-height:1.4;margin-bottom:6px">${esc(ad.title)}</h2>
    <p style="font-size:12.5px;color:#e2e8f0;line-height:1.6;margin-bottom:12px">${esc(ad.subtitle||'')}</p>
   </div>
   <div class="login-ad-dots">
    ${ads.map((_, i) => `<span class="ad-dot ${i === (currentLoginAdIndex % ads.length) ? 'active' : ''}" data-action="switch-login-ad" data-id="${i}"></span>`).join('')}
   </div>
  </div>
 </div>`;
}

function switchLoginAd(idx){
 currentLoginAdIndex = idx;
 const container = document.getElementById('login-ads-container');
 if(container){
  container.innerHTML = renderLoginAdsCarousel();
 }
}

function startLoginAdTimer(){
 clearInterval(loginAdTimer);
 loginAdTimer = setInterval(() => {
  const container = document.getElementById('login-ads-container');
  if(container && (storeBanners||[]).filter(b=>b.active&&(b.placement==='Login'||b.placement==='Both')).length > 1){
   currentLoginAdIndex++;
   container.innerHTML = renderLoginAdsCarousel();
  }
 }, 4500);
}

function renderBannersCarousel(){
 const ads = (storeBanners || []).filter(b => b.active && (b.placement === 'Home' || b.placement === 'Both' || !b.placement));
 if(!ads.length) return '';
 
 return `
 <div class="banner-carousel">
  ${ads.map(b => {
   const animClass = b.animation === 'fade' ? 'ad-fade' : b.animation === 'zoom' ? 'ad-zoom' : 'ad-slide';
   return `
   <div class="banner-card ${animClass}" style="background-color:${esc(b.bgColor)};color:${esc(b.textColor)};background-image:linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.75)),url(${esc(b.image||'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80')})">
    <div style="z-index:2">
     <span class="badge" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold;margin-bottom:8px;display:inline-block">${esc(b.badge||'★ عرض حصري')}</span>
     <h2>${esc(b.title)}</h2>
     ${b.subtitle?`<p>${esc(b.subtitle)}</p>`:''}
     <button class="btn small" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold" data-action="banner-click" data-id="${esc(b.linkUrl||'')}">${esc(b.buttonText||'اكتشف العرض الآن')}</button>
    </div>
   </div>`;
  }).join('')}
 </div>`;
}



function favoritesView(){
 const favProds = products.filter(p => favorites.includes(p.id));
 return `<div class="section-head">
  <div><h1>مقتنياتك المفضلة</h1><p>${favProds.length} منتج في قائمة أمنياتك</p></div>
  <button class="btn small secondary" data-action="navigate" data-id="home">تصفح المتجر</button>
 </div>
 ${favProds.length ? `<div class="products">${favProds.map(p=>productCard(p)).join('')}</div>` : empty('قائمة المفضلة فارغة حالياً','اضغط على أيقونة القلب أعلى أي منتج لحفظه هنا للرجوع إليه سريعاً','heart')}`;
}

function shop(){
 const cats=['الكل',...new Set([...storeCategories,...products.map(p=>p.category)].filter(Boolean))];
 const shown=products.filter(p=>(category==='الكل'||p.category===category)&&p.name.includes(search));
 return `${renderBannersCarousel()}
 <div class="hero" style="background:linear-gradient(135deg, #064e3b 0%, #022c22 100%);color:white;border:1px solid rgba(212,175,55,0.4);box-shadow:0 15px 40px rgba(0,0,0,0.15)">
  <div class="hero-copy">
   <div class="eyebrow" style="color:#fde047;font-weight:bold">★ اختيارات النخبة والمقتنيات الفاخرة</div>
   <h1 style="color:#ffffff">أناقة التفاصيل.<br>فخامة تستحقها.</h1>
   <p style="color:#d1fae5">اكتشف أرقى المنتجات المنتقاة من أشهر الماركات والمتاجر المعتمدة، مع تجربة شحن وتسليم فائقة السرعة.</p>
   <button class="btn" style="background:var(--vip-gold-gradient);color:#081c13;font-weight:bold" data-action="browse">تصفح المجموعة الكاملة ${icon('arrow',16)}</button>
  </div>
  <div class="hero-art">${art('bag')}</div>
 </div>
 <div class="search-row">
  <div class="searchbox">${icon('search',18)}<input id="search" placeholder="ابحث في المجموعة الحصرية عن منتج أو ماركة..." aria-label="البحث عن منتج" value="${esc(search)}"></div>
 </div>
 <div class="category-list">${cats.map(c=>`<button class="category ${category===c?'active':''}" data-action="category" data-id="${esc(c)}">${icon(c==='الكل'?'grid':'bag',16)}${esc(c)}</button>`).join('')}</div>
 <div class="section-head" id="product-heading">
  <div><h2>${search?'نتائج البحث':'المجموعة المختارة الفاخرة'}</h2><p>${shown.length} منتج متاح للتسليم الفوري</p></div>
  ${pill('ضمان الأصالة 100%','shield')}
 </div>
 <div class="products">${shown.map(p=>productCard(p)).join('')}</div>
 ${shown.length?'':empty('لا توجد منتجات مطابقة','جرّب قسمًا آخر أو كلمة مختلفة','search')}`;
}

function stat(title,value,note,symbol,featured=false){return `<div class="stat ${featured?'featured':''}"><div class="label">${title}${icon(symbol,20)}</div><strong>${value}</strong><small>${note}</small></div>`;}
function overview(){const os=dashboard.orders,active=os.filter(o=>!['Delivered','Cancelled'].includes(o.status)),complete=os.filter(o=>o.status==='Delivered'),sales=complete.reduce((n,o)=>n+o.total,0);return `<div class="section-head"><div><h1>${user.role==='Admin'?'إدارة المتجر والعمليات':user.role==='Supervisor'?'لوحة الإشراف العام ومتابعة العمليات':'مساحة الشريك التجاري الفاخرة'}</h1><p>تحكم فوري في المنتجات والمبيعات والطلبيات وإعلانات المتجر وطاقم العمل.</p></div><div class="inline"><button class="btn secondary" data-action="appearance">🎨 مظهر المتجر واللوجو</button><button class="btn secondary" data-action="banners-manager">📢 إدارة الإعلانات</button><button class="btn" data-action="edit-product">${icon('plus',17)}إضافة منتج فاخر</button></div></div><div class="stats">${stat('الطلبات المكتملة',complete.length,'طلبيات سُلمت للعملاء بنجاح','check',true)}${stat('الطلبات الجارية',active.length,'قيد التجهيز والتوصيل السريع','box')}${stat('إجمالي المبيعات المكتملة',salesByCurrency(complete),user.role==='Admin'?'إجمالي صافي المبيعات':'قيمة بنود متجرك','chart')}${stat('طاقم وعمال المتجر',dashboard.staff?.length||0,'موظفون مسجلون في المنظومة','users')}</div><div class="dashboard-grid"><div><div class="section-head"><h2>أحدث الطلبيات المعتمدة</h2><button class="btn small ghost" data-action="navigate" data-id="orders">عرض الكل</button></div><div class="order-list">${os.slice(0,3).map(orderCard).join('')||empty('طلباتك الجديدة ستظهر هنا')}</div></div><div class="panel"><h3>حالة الطلبيات والتشغيل</h3><div class="chart">${['Preparing','Ready','Assigned','OnWay','Delivered'].map(s=>{const count=os.filter(o=>o.status===s).length;return `<div class="bar" style="height:${Math.max(8,count/Math.max(os.length,1)*100)}%" title="${statuses[s]}: ${count}"><span>${statuses[s]}</span></div>`;}).join('')}</div><p class="report-note">لوحة قياس فورية للطلبات المعتمدة. تُحتسب قيمة الطلبيات المسلّمة فقط.</p><div class="spacer"></div>${pill('منظومة تشغيل آمنة ومعتمدة','shield')}</div></div>`;}
function timeline(o){const steps=['Preparing','Ready','Assigned','OnWay','Delivered'];const index=steps.indexOf(o.status);return `<div class="timeline">${steps.map((s,i)=>`<span class="step ${i<=index?'done':''}">${statuses[s]}</span>`).join('')}</div>`;}
function orderCard(o){const prep=has('orders.prepare')&&o.status==='Preparing'&&!o.readyMerchants?.includes(user.id);return `<article class="order"><div class="order-top"><div><div class="order-code">${esc(o.number)}</div><small style="font-size:10px">${date(o.createdAt)}</small></div><span class="badge ${esc(o.status)}">${statuses[o.status]}</span></div><div class="order-items">${o.lines.map(l=>`${esc(l.name)} <b>× ${l.qty}</b>`).join(' · ')}</div>${user.role==='Customer'?timeline(o):`<div class="order-meta">${esc(o.customerName)}${user.role!=='Merchant'?'<br>'+esc(o.address)+'<br>'+esc(o.phone):''}</div>`}${commissionOrderLine(o)}${o.pin&&user.role==='Customer'&&!['Delivered','Cancelled'].includes(o.status)?`<div class="pin">رمز تأكيد الاستلام السري: <strong>${esc(o.pin)}</strong></div><p class="hint">سلّم هذا الرمز لمندوب التوصيل عند استلام طلبيتك وفحصها فقط.</p>`:''}<div class="order-bottom">${amount(o.total,o.currency||'SAR')}<div class="order-actions">${paymentOrderButton(o)}${o.courierId&&has('chat.read')&&has('chat.delivery')&&['Customer','Courier','Admin'].includes(user.role)?`<button class="btn small secondary" style="background:#075e54;color:white" data-action="order-chat" data-id="${esc(o.id)}">💬 دردشة WhatsApp مع المندوب</button>`:''}${user.role!=='Merchant'?`<button class="btn small secondary" data-action="track-order" data-id="${esc(o.id)}">📍 تتبع Google Maps</button>`:''}${prep?`<button class="btn small" data-action="order-ready" data-id="${esc(o.id)}">تم التجهيز ${icon('check',14)}</button>`:''}${has('delivery.assign')&&['Ready','Assigned'].includes(o.status)?`<button class="btn small" data-action="assign" data-id="${esc(o.id)}">إسناد مندوب</button>`:''}${has('delivery.update')&&o.status==='Assigned'?`<button class="btn small" data-action="order-pickup" data-id="${esc(o.id)}">استلام الشحنة</button>`:''}${has('delivery.update')&&o.status==='OnWay'?`<button class="btn small" data-action="deliver" data-id="${esc(o.id)}">تأكيد التسليم</button>`:''}${(has('orders.cancel')||has('orders.manage'))&&['Preparing','Ready'].includes(o.status)?`<button class="btn small danger" data-action="cancel-order" data-id="${esc(o.id)}">إلغاء الطلب</button>`:''}</div></div></article>`;}
function ordersView(){return `<div class="section-head"><div><h1>${user.role==='Customer'?'طلبياتك، خطوة بخطوة.':'إدارة الطلبيات والشحنات'}</h1><p>متابعة وتحديث حالة الشحنات لحظة بلحظة</p></div>${pill(dashboard.orders.length+' طلب','box')}</div><div class="order-list">${dashboard.orders.map(orderCard).join('')||empty('لا توجد طلبات بعد','ابدأ التسوق لتجرب طلبك الأول')}</div>`;}
function courier(history){const os=dashboard.orders.filter(o=>history?['Delivered','Cancelled'].includes(o.status):!['Delivered','Cancelled'].includes(o.status));return `<div class="section-head"><div><h1>${history?'سجل التوصيل والشحنات':'مهام التوصيل المباشرة'}</h1><p>${history?'جميع المهمات التي تم تسليمها بنجاح':'المهمات المسندة إليك الآن. استلم الشحنة، ابدأ الملاحة، وأكّد التسليم.'}</p></div>${pill('مندوب التوصيل السريع','truck')}</div><div class="stats">${stat('شحنات جارية',dashboard.orders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length,'بانتظار وصولك للعميل','truck',true)}${stat('شحنات مسلّمة',dashboard.orders.filter(o=>o.status==='Delivered').length,'تم تسليمها للعملاء','check')}</div><div class="order-list">${os.map(orderCard).join('')||empty('لا توجد مهام حالياً','ستظهر هنا الشحنات فور إسنادها لك من الإدارة','truck')}</div>`;}
let adminSelectedCat = 'الكل';

function productManagement(){
 const allProds = dashboard?.products || [];
 const allCats = ['الكل', ...new Set([...storeCategories, ...allProds.map(p => p.category)].filter(Boolean))];
 if (!allCats.includes(adminSelectedCat)) adminSelectedCat = 'الكل';
 const filtered = allProds.filter(p => (adminSelectedCat === 'الكل' || p.category === adminSelectedCat) && (!search || p.name.includes(search) || p.category.includes(search)));

 return `
 <div class="section-head" style="flex-wrap:wrap;gap:14px">
  <div>
   <h1>إدارة المجموعات الأساسية والأصناف والأسعار</h1>
   <p>إجمالي ${allProds.length} صنف موزعة على ${allCats.length - 1} مجموعات أساسية — قابلة للتعديل والحذف والإضافة الفورية</p>
  </div>
  ${has('products.write') ? `
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button class="btn secondary" type="button" data-action="categories-manager">📂 إدارة المجموعات (${allCats.length - 1})</button>
   <button class="btn ghost" type="button" data-action="seed-full-catalog">🔄 استعادة الكتالوج الشامل (52 صنف)</button>
   <button class="btn" type="button" data-action="edit-product">${icon('plus',17)} إضافة صنف جديد</button>
  </div>` : ''}
 </div>

 <div class="search-row">
  <div class="searchbox">${icon('search',18)}<input id="search" placeholder="ابحث عن أي صنف أو مجموعة لتعديله أو حذفه..." value="${esc(search)}"></div>
 </div>

 <div class="category-list">
  ${allCats.map(c => {
   const count = c === 'الكل' ? allProds.length : allProds.filter(p => p.category === c).length;
   return `<button type="button" class="category ${adminSelectedCat === c ? 'active' : ''}" data-action="admin-cat-filter" data-id="${esc(c)}">
    ${icon(c === 'الكل' ? 'grid' : 'bag', 15)}
    <span>${esc(c)}</span>
    <small style="opacity:0.8;margin-right:4px">(${count})</small>
   </button>`;
  }).join('')}
 </div>

 <div class="products">${filtered.map(p => productCard(p, true)).join('')}</div>
 ${filtered.length ? '' : empty('لا توجد أصناف في هذه المجموعة حالياً', 'اضغط على «إضافة صنف جديد» أو «استعادة الكتالوج الشامل»', 'bag')}`;
}

function categoriesManagerModal(){
 const allProds = dashboard?.products || [];
 const cats = [...new Set([...storeCategories, ...allProds.map(p => p.category)].filter(Boolean))];
 modal('إدارة المجموعات والأقسام الأساسية في المتجر', `
 <div class="stack">
  <form class="form" data-form="add-category" style="background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);padding:14px;border-radius:14px">
   <label>إضافة مجموعة أساسية جديدة للمتجر
    <div class="inline" style="gap:8px;flex-wrap:nowrap">
     <input name="name" required minlength="2" maxlength="60" placeholder="مثال: العطور الشرقية، الأجهزة الذكية، الهدايا...">
     <button class="btn small" type="submit" style="white-space:nowrap">+ إضافة المجموعة</button>
    </div>
   </label>
  </form>

  <div style="display:grid;gap:10px;max-height:48vh;overflow-y:auto;padding-left:4px">
   ${cats.map(c => {
    const count = allProds.filter(p => p.category === c).length;
    return `
    <div style="background:rgba(4,25,19,0.85);border:1px solid rgba(212,175,55,0.25);border-radius:14px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
     <div>
      <strong style="color:#ffffff;font-size:14px">📂 ${esc(c)}</strong>
      <small style="display:block;color:#fef08a;margin-top:3px">${count} صنف مسجل داخل هذه المجموعة</small>
     </div>
     <div class="inline" style="gap:6px">
      <button class="btn small secondary" type="button" data-action="edit-product-in-cat" data-id="${esc(c)}">+ إضافة صنف هنا</button>
      <button class="btn small ghost" type="button" data-action="rename-category-prompt" data-id="${esc(c)}">✏️ تعديل الاسم</button>
      <button class="btn small danger" type="button" data-action="delete-category-confirm" data-id="${esc(c)}">🗑️ حذف المجموعة</button>
     </div>
    </div>`;
   }).join('')}
  </div>

  <button class="btn full secondary" type="button" data-action="close">إغلاق</button>
 </div>`);
}


function cartView(){
 const lines=Object.entries(cart).map(([id,qty])=>({p:products.find(p=>p.id===id),qty})).filter(l=>l.p);
 const subtotal=lines.reduce((n,l)=>n+l.p.price*l.qty,0);
 return `<div class="section-head"><div><h1>حقيبة المشتريات</h1><p>${cartCount()} قطع فاخرة في انتظارك</p></div>${pill('دفع وتسليم آمن','shield')}</div>${!lines.length?empty('حقيبة التسوق فارغة حالياً','اكتشف مجموعتنا الحصرية وأضف اختياراتك المفضلة','cart'):`<div class="cart-layout"><div class="panel">${lines.map(({p,qty})=>{
  const realImg = p.image || defaultRealImages[p.icon] || '';
  return `<div class="cart-item"><div class="mini-art">${realImg ? `<img src="${esc(realImg)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : art(p.icon)}</div><div style="flex:1"><h3>${esc(p.name)}</h3>${amount(p.price)}<div class="spacer"></div><div class="qty"><button data-action="qty-minus" data-id="${esc(p.id)}" aria-label="تقليل الكمية">−</button><span>${qty}</span><button data-action="add" data-id="${esc(p.id)}" aria-label="زيادة الكمية">+</button></div></div><button class="icon-btn" data-action="remove-cart" data-id="${esc(p.id)}" aria-label="إزالة المنتج">${icon('close',15)}</button></div>`;
 }).join('')}</div><div class="panel"><h2>ملخص الطلب الفاخر</h2><div class="spacer"></div><div class="bill-line"><span>مجموع المنتجات</span><b>${money(subtotal)} ${currencyLabel(commerce.currency)}</b></div><div class="bill-line"><span>رسوم التوصيل السريع</span><b>${money(commerce.deliveryFee)} ${currencyLabel(commerce.currency)}</b></div>${commissionCartLine(subtotal)}<div class="bill-line total"><span>الإجمالي النهائي</span><span style="color:var(--vip-emerald)">${money(subtotal+commerce.deliveryFee+customerFee(subtotal))} ${currencyLabel(commerce.currency)}</span></div><div class="spacer"></div><form class="form" data-form="checkout"><label>عنوان التوصيل الدقيق<textarea name="address" minlength="8" maxlength="500" required placeholder="المدينة، الحي، اسم الشارع، رقم المبنى"></textarea></label><div class="panel" style="padding:12px;background:#f8fafd"><button type="button" class="btn secondary full" data-action="checkout-map">📍 تحديد موقع التسليم بدقة على Google Maps</button><small id="destination-label" style="display:block;margin-top:6px;text-align:center">${checkoutDestination?'تم حفظ نقطة التسليم بنجاح':'اختياري: اضغط لتحديد باب المبنى عبر الخريطة'}</small></div><label>رقم التواصل مع العميل<input name="phone" type="tel" minlength="8" maxlength="20" required placeholder="05xxxxxxxx" dir="ltr"></label>${checkoutPaymentFields()}<button class="btn full" style="background:var(--vip-gold-gradient);color:#0a1a12;font-weight:bold" type="submit">تأكيد الطلب الفاخر ${icon('arrow',17)}</button><div class="form-error" hidden></div></form></div></div>`}`;
}

function staffPageView(){
 if(!['Admin','Supervisor'].includes(user.role) && !has('users.manage') && !has('registrations.manage'))return empty('هذه الصفحة مخصصة لإدارة المتجر والمشرفين');
 const list=dashboard.staff||[];
 return `<div class="section-head"><div><h1>طاقم وعمال المتجر</h1><p>سجل تفصيلي لحسابات وملفات العاملين، الرواتب، الورديات، والمهام اليومية</p></div><div class="inline"><button class="btn" data-action="new-staff">+ إضافة عامل جديد للمنظومة</button>${pill(list.length+' موظف وعامل','users')}</div></div>
 <div class="order-list">${list.map(s=>`<article class="ticket-card" style="border-right:5px solid ${s.status==='Active'?'var(--green)':s.status==='OnLeave'?'var(--orange)':'var(--red)'};background:white">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
   <div>
    <h3 style="font-size:16px">${esc(s.fullName)}</h3>
    <p style="font-size:13px;color:var(--green);font-weight:bold;margin-top:3px">${esc(s.jobTitle)} · قسم ${esc(s.department)}</p>
   </div>
   <span class="badge ${s.status==='Active'?'Ready':s.status==='OnLeave'?'Assigned':'Cancelled'}">${s.status==='Active'?'على رأس العمل':s.status==='OnLeave'?'في إجازة':'منتهي التعاقد'}</span>
  </div>
  <div class="staff-card-kpi">
   <div><small>الراتب الشهري</small><strong>${money(s.monthlySalary)} ${currencyLabel(commerce.currency)}</strong></div>
   <div><small>الوردية والدوام</small><strong>${esc(s.shift)}</strong></div>
   <div><small>ساعات العمل</small><strong>${esc(s.workingHours)}</strong></div>
  </div>
  <div class="order-meta" style="margin-top:12px;font-size:12px">
   <span>📞 هاتف: <b dir="ltr">${esc(s.phone)}</b></span> ${s.nationalId?` · <span>🪪 الهوية/الإقامة: <b>${esc(s.nationalId)}</b></span>`:''} ${s.address?` · <span>📍 السكن: ${esc(s.address)}</span>`:''}
  </div>
  ${s.notes?`<div style="font-size:12px;background:var(--soft);padding:10px;border-radius:10px;margin-top:10px;line-height:1.7"><strong>ملاحظات الإدارة والأداء:</strong> ${esc(s.notes)}</div>`:''}
  <div class="order-actions" style="margin-top:14px;border-top:1px dashed var(--line);padding-top:12px">
   <button class="btn small secondary" data-action="edit-staff" data-id="${esc(s.id)}">تعديل ملف العامل</button>
   <button class="btn small danger" data-action="delete-staff" data-id="${esc(s.id)}">حذف العامل</button>
  </div>
 </article>`).join('')||empty('لا يوجد عمال مسجلون بعد','أضف أول عامل لتوثيق مهامه وراتبه وساعات دوامه','users')}</div>`;
}

function usersView(){
 if(!['Admin','Supervisor'].includes(user.role) && !has('users.manage') && !has('registrations.manage'))return empty('هذه الصفحة مخصصة لإدارة المتجر والمشرفين');
 const list = dashboard.users || [];
 const onlineCount = list.filter(u=>u.isOnline).length;
 const frozenCount = list.filter(u=>!u.active).length;
 
 return `<div class="section-head">
  <div>
   <h1>إدارة المستخدمين والحسابات المتصلة والصلاحيات</h1>
   <p>تحكم دقيق وشامل: مراقبة المتصلين، تعديل وتوليد كلمات المرور، تجميد وتنشيط الحسابات، وضبط الصلاحيات</p>
  </div>
  <div class="inline">
   <button class="btn secondary" data-action="registration-fields">📋 تخصيص نموذج التسجيل</button>
   <button class="btn" data-action="new-user">${icon('plus',17)}إضافة مستخدم جديد</button>
  </div>
 </div>

 <div class="stats" style="grid-template-columns:repeat(4,1fr);margin:16px 0 24px">
  <div class="stat"><div class="label">إجمالي الحسابات${icon('users',18)}</div><strong>${list.length}</strong><small>مستخدم مسجل في المتجر</small></div>
  <div class="stat featured"><div class="label">المتصلون الآن${icon('check',18)}</div><strong>${onlineCount}</strong><small>جلسات نشطة حالياً</small></div>
  <div class="stat"><div class="label">حسابات مجمدة${icon('shield',18)}</div><strong>${frozenCount}</strong><small>بانتظار التنشيط أو معلقة</small></div>
  <div class="stat"><div class="label">العملاء والشركاء${icon('cart',18)}</div><strong>${list.filter(u=>u.role==='Customer').length}</strong><small>عملاء مسجلين</small></div>
 </div>

 <div style="display:grid;gap:14px">
  ${list.map(u=>{
   const isSelf = u.id === user.id;
   const isAdminOwner = u.name.toLowerCase() === 'ahmed' && u.role === 'Admin';
   return `
   <article class="order" style="background:rgba(4,25,19,0.85);border:1px solid rgba(212,175,55,0.28);border-radius:18px;padding:18px">
    <div class="order-top" style="align-items:flex-start">
     <div style="display:flex;align-items:center;gap:14px">
      <div style="position:relative">
       <span class="avatar" style="width:46px;height:46px;border:2px solid ${u.isOnline?'#22c55e':'var(--line)'};font-size:18px">${esc(u.name[0])}</span>
       <span style="position:absolute;bottom:0;right:0;width:12px;height:12px;border-radius:50%;background:${u.isOnline?'#22c55e':'#64748b'};border:2px solid #041913" title="${u.isOnline?'متصل الآن':'غير متصل'}"></span>
      </div>
      <div>
       <div style="display:flex;align-items:center;gap:8px">
        <h3 style="font-size:16px;color:#ffffff;margin:0">${esc(u.name)}</h3>
        ${isSelf ? '<span class="badge Ready" style="font-size:10px">أنت (حسابك الحالي)</span>' : ''}
        ${isAdminOwner ? '<span class="badge" style="background:var(--vip-gold-gradient);color:#031711;font-size:10px;font-weight:bold">👑 المدير العام الرئيسي</span>' : ''}
       </div>
       <p style="font-size:12px;color:#94a3b8;margin:4px 0 0" dir="ltr">${esc(u.email)}</p>
       <div style="display:flex;gap:12px;font-size:11px;color:#cbd5e1;margin-top:6px;flex-wrap:wrap">
        <span>الدور: <b style="color:#fef08a">${roles[u.role]||u.role}</b></span>
        <span>·</span>
        <span>الحالة: <b style="color:${u.active?'#22c55e':'#ef4444'}">${u.active?'نشط وفعال':'مجمد بانتظار التنشيط'}</b></span>
        <span>·</span>
        <span>الاتصال: <b style="color:${u.isOnline?'#22c55e':'#94a3b8'}">${u.isOnline?`🟢 متصل الآن (${u.sessionCount||1} أجهزة)`:'⚪ غير متصل'}</b></span>
       </div>
      </div>
     </div>
     
     <div class="inline" style="gap:8px;flex-wrap:wrap">
      ${u.forgotPasswordAt ? `<span class="badge" style="background:rgba(245,158,11,0.22);color:#fbbf24;border:1px solid rgba(245,158,11,0.55)">🔑 نسيان كلمة المرور</span>` : ''}
      <span class="badge ${u.active?'Ready':'Cancelled'}">${u.active?'نشط':'مجمد'}</span>
     </div>
    </div>

    ${u.tempPassword ? `
    <div style="background:rgba(212,175,55,0.12);border:1px dashed rgba(212,175,55,0.4);padding:10px 14px;border-radius:12px;margin:12px 0;display:flex;align-items:center;justify-content:space-between;font-size:12px">
     <div>
      <span style="color:#fef08a">🔑 كلمة المرور المؤقتة المسجلة:</span>
      <code style="color:#ffffff;background:#031711;padding:3px 8px;border-radius:6px;margin:0 6px;font-size:13px">${esc(u.tempPassword)}</code>
     </div>
     <button class="btn small ghost" type="button" data-action="copy-text" data-id="${esc(u.tempPassword)}">نسخ كلمة المرور</button>
    </div>` : ''}

    <div class="order-bottom" style="margin-top:14px;padding-top:14px;border-top:1px dashed rgba(212,175,55,0.25)">
     <div class="order-actions" style="width:100%;justify-content:flex-start;gap:8px">
      <!-- زر تعديل كلمة المرور -->
      <button class="btn small secondary" type="button" data-action="admin-edit-password" data-id="${esc(u.id)}">
       🔑 تعديل كلمة المرور
      </button>

      <!-- زر توليد كلمة مرور مؤقتة وعرضها -->
      <button class="btn small secondary" type="button" data-action="admin-gen-password" data-id="${esc(u.id)}" title="توليد كلمة سر جديدة وعرضها لنسخها وإرسالها للعميل">
       🎲 توليد كلمة سر مؤقتة
      </button>

      <!-- زر تجميد / تنشيط الحساب -->
      ${!isSelf ? `
      <button class="btn small ${u.active?'danger':'ghost'}" type="button" data-action="admin-toggle-freeze" data-id="${esc(u.id)}" style="${!u.active?'background:var(--vip-gold-gradient);color:#031711;font-weight:bold':''}">
       ${u.active ? '❄️ تجميد الحساب' : '✓ تنشيط الحساب الآن'}
      </button>` : ''}

      <!-- زر إنهاء الجلسات النشطة -->
      ${u.isOnline && !isSelf ? `
      <button class="btn small ghost" type="button" data-action="admin-terminate-sessions" data-id="${esc(u.id)}" title="تسجيل خروج المستخدم من كافة الأجهزة المتصلة">
       🚪 إنهاء الجلسات النشطة
      </button>` : ''}

      <!-- زر الصلاحيات الدقيقة -->
      <button class="btn small ghost" type="button" data-action="permissions" data-id="${esc(u.id)}" ${isSelf?'disabled':''}>
       🛡️ الصلاحيات الدقيقة
      </button>

      <!-- زر حذف الحساب نهائياً -->
      ${!isSelf && !isAdminOwner ? `
      <button class="btn small danger" type="button" data-action="admin-delete-user" data-id="${esc(u.id)}" title="حذف حساب المستخدم نهائياً">
       🗑️ حذف الحساب
      </button>` : ''}
     </div>
    </div>
   </article>`;
  }).join('')}
 </div>`;
}

function editProfileModal(){
 modal('تعديل اسم المستخدم وكلمة المرور',`<form class="form" data-form="update-profile">
 <label>الاسم الظاهر في المتجر (اسم المستخدم)<input name="name" value="${esc(user.name)}" required minlength="2" maxlength="80"></label>
 <label>البريد الإلكتروني<input name="email" type="email" value="${esc(user.email)}" required dir="ltr"></label>
 <hr style="border:0;border-top:1px dashed var(--line);margin:6px 0">
 <p class="hint">اترك حقول كلمة المرور فارغة إذا كنت تريد تعديل الاسم والبريد فقط دون تغيير كلمة المرور.</p>
 <label>كلمة المرور الحالية للتأكيد<input name="currentPassword" type="password" placeholder="أدخل كلمة المرور الحالية"></label>
 <label>كلمة المرور الجديدة (6 أحرف أو أكثر)<input name="newPassword" type="password" minlength="6" maxlength="128" placeholder="كلمة المرور الجديدة"></label>
 <button class="btn full" type="submit">حفظ التعديلات</button>
 <div class="form-error" hidden></div></form>`);
}

function accountView(){return `<div class="section-head"><div><h1>حسابك في المتجر</h1><p>تفاصيل الحساب، وإدارة المظهر، والإعلانات، وطاقم العمل</p></div></div><div class="panel stack" style="max-width:650px"><div class="inline"><span class="avatar" style="border:2px solid var(--vip-gold)">${esc(user.name[0])}</span><div><h2>${esc(user.name)}</h2><p class="hint" style="color:var(--vip-emerald);font-weight:bold">${roles[user.role]||user.role} · ${esc(user.email)}</p></div></div><button class="btn secondary" data-action="edit-profile">✏️ تعديل اسم المستخدم وكلمة المرور</button>${has('appearance.manage')?'<button class="btn" style="background:var(--vip-gold-gradient);color:#081c13;font-weight:bold" data-action="appearance">🎨 شاشة تعديل شكل المتجر والأيقونة والاسم</button><button class="btn secondary" data-action="banners-manager">📢 إدارة الإعلانات وبانرات العروض</button>':''}${has('users.manage')?'<button class="btn secondary" data-action="staff-manager">👥 إدارة عمال المتجر تفصيلياً</button><button class="btn" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold" data-action="registration-fields">📋 تخصيص نموذج تسجيل المستخدمين الجدد (الأهم والخيارات)</button>':''}${has('commissions.manage')?'<button class="btn secondary" data-action="commissions">العمولات والأسعار</button>':''}${has('policies.manage')?'<button class="btn secondary" data-action="policy-editor">الاتفاقيات وشروط المتجر وحذف الحساب</button>':''}${has('registrations.manage')?'<button class="btn secondary" data-action="registrations">لوحة تسجيل العملاء والتجار والمناديب</button>':''}<button class="btn secondary" data-action="store-policies">اتفاقية التسجيل وشروط المتجر</button>${has('commerce.manage')?'<button class="btn secondary" data-action="commerce-settings">العملات واللغة وطرق الدفع</button>':''}${has('payments.review')?'<button class="btn secondary" data-action="payment-reviews">مراجعة الدفع والإيصالات</button>':''}<button class="btn secondary" data-action="install-app">📱 تثبيت التطبيق (آيفون / أندرويد)</button><button class="btn secondary" data-action="language">تغيير اللغة / Language</button><button class="btn secondary" data-action="device-permissions">أذونات الكاميرا والمايك والموقع</button><button class="btn" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold" data-action="notification-style">🔔 تخصيص نغمات وشكل إشعارات التطبيق</button><button class="btn secondary" data-action="enable-notifications">📲 اختبار إشعار فوري على شاشة الجوال</button>${has('appearance.manage')?'<button class="btn secondary" data-action="interface-design">تصميم الشاشات المتقدم</button>':''}${has('notifications.send')?'<button class="btn secondary" data-action="compose-notice">إرسال إشعارات</button>':''}<button class="btn secondary" data-action="notices">الإشعارات الواردة <span class="notice-count"></span></button><button class="btn secondary" data-action="support">مركز الدعم الفني المباشر</button><button class="btn ghost" data-action="privacy">الخصوصية وحذف الحساب</button>${user.role==='Admin'?`<button class="btn" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold" data-action="admin-tech-settings">🔑 مفتاح الخرائط وإعدادات إرسال الإيميلات (SMTP)</button>`:``}<button class="btn secondary" data-action="connect">إعداد اتصال المتجر</button>${demo?'<button class="btn secondary" data-action="switch-role">استعراض واجهة أخرى</button>':''}<button class="btn ghost" data-action="logout">تسجيل الخروج</button>${user.role!=='Admin'?'<button class="btn danger" data-action="delete-account">طلب حذف حسابي</button>':''}<p class="hint">الإصدار 1.8.0 · المتجر المطور (iOS & Android)</p></div>`;}

/* ========================================================
    Dedicated Final Login Screen (شاشة الدخول النهائية )
   ======================================================== */

/* ==========================================================================
   DYNAMIC REGISTRATION FIELDS MANAGER (نظام إدارة وتخصيص حقول التسجيل من الإدارة)
   ========================================================================== */
let customRegFields = [
 { id: 'name', label: 'اسم المستخدم (متصل بدون مسافات أو رموز)', type: 'text', required: true, enabled: true, placeholder: 'مثال: محمدالعتيبي أو Ahmed2026', isSystem: true },
 { id: 'email', label: 'البريد الإلكتروني (لإرسال واستعادة كلمة المرور)', type: 'email', required: true, enabled: true, placeholder: 'you@example.com', isSystem: true },
 { id: 'password', label: 'كلمة المرور', type: 'password', required: true, enabled: true, placeholder: 'كلمة المرور (6 أحرف فأكثر)', isSystem: true },
 { id: 'phone', label: 'رقم الجوال للتواصل', type: 'tel', required: true, enabled: true, placeholder: '05xxxxxxxx', isSystem: false },
 { id: 'city', label: 'المدينة / المنطقة', type: 'text', required: false, enabled: true, placeholder: 'الرياض، جدة، مكة، القصيم...', isSystem: false },
 { id: 'address', label: 'الحي والشارع', type: 'text', required: false, enabled: true, placeholder: 'اسم الحي والشارع', isSystem: false },
 { id: 'accountType', label: 'نوع الحساب المطلوب', type: 'select', required: false, enabled: true, options: ['عميل تسوق', 'شريك تاجر', 'مندوب توصيل'], placeholder: 'اختر نوع الحساب', isSystem: false },
 { id: 'commercialId', label: 'رقم السجل التجاري أو الرخصة', type: 'text', required: false, enabled: false, placeholder: 'اختياري للتجار والمناديب', isSystem: false },
 { id: 'notes', label: 'ملاحظات أو طلبات خاصة', type: 'textarea', required: false, enabled: false, placeholder: 'أية تفاصيل إضافية تود مشاركتها مع الإدارة', isSystem: false }
];

function loadRegFields(){
 try {
  const saved = localStorage.getItem('ts-reg-fields');
  if(saved) customRegFields = JSON.parse(saved);
 } catch(e){}
}
loadRegFields();

function saveRegFields(){
 try {
  localStorage.setItem('ts-reg-fields', JSON.stringify(customRegFields));
  if(apiBase && user?.role==='Admin'){
   request('/registration-fields','PUT', customRegFields).catch(()=>{});
  }
 } catch(e){}
}

function registrationFieldsManager(){
 modal('تخصيص نموذج تسجيل المستخدمين الجدد', `<div class="stack">
  <div style="background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.35);padding:14px;border-radius:14px;font-size:12.5px;line-height:1.8;color:#fef08a">
   <strong>لوحة تحكم خيارات وحقول التسجيل للمستخدم الجديد:</strong><br>
   يمكنك تحديد الخيارات التي تظهر للعملاء الجدد، إضافة حقول جديدة أو حذفها، وتعيين ما هو <b>إلزامي (الأهم)</b> وما هو <b>اختياري (غير مهم)</b>.
  </div>
  
  <div class="inline" style="justify-content:space-between;margin:8px 0">
   <button class="btn small" type="button" data-action="new-reg-field">+ إضافة خيار / حقل جديد للنموذج</button>
   <button class="btn small ghost" type="button" data-action="reset-reg-fields">استعادة الحقول الافتراضية</button>
  </div>
  
  <div style="display:grid;gap:12px;max-height:50vh;overflow-y:auto;padding-left:4px">
   ${customRegFields.map(f=>`
   <div style="background:rgba(4,25,19,0.85);border:1px solid rgba(212,175,55,0.25);border-radius:14px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
    <div>
     <div style="display:flex;align-items:center;gap:8px">
      <strong style="font-size:14px;color:#ffffff">${esc(f.label)}</strong>
      <small style="color:#94a3b8">(${f.type==='select'?'قائمة منسدلة':f.type==='tel'?'رقم جوال':f.type==='textarea'?'نص طويل':'نص'})</small>
     </div>
     <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
      <span class="badge" style="${f.required?'background:var(--vip-gold-gradient);color:#031711;font-weight:bold':'background:rgba(255,255,255,0.08);color:#94a3b8'}">${f.required?'★ إلزامي (الأهم)':'اختياري (غير مهم)'}</span>
      <span class="badge ${f.enabled?'Ready':'Cancelled'}">${f.enabled?'✓ يظهر للمستخدم':'✗ مخفي'}</span>
      ${f.options?.length?`<small style="color:#cbd5e1">خيارات: ${f.options.join(' ، ')}</small>`:''}
     </div>
    </div>
    
    <div class="inline" style="gap:6px">
     <button class="btn small secondary" type="button" data-action="toggle-reg-required" data-id="${esc(f.id)}" title="تبديل بين إلزامي واختياري">
      ${f.required?'جعله اختياري (غير مهم)':'جعله إلزامي (الأهم)'}
     </button>
     <button class="btn small ghost" type="button" data-action="toggle-reg-enabled" data-id="${esc(f.id)}" title="إظهار أو إخفاء من شاشة التسجيل">
      ${f.enabled?'إخفاء':'إظهار'}
     </button>
     ${!f.isSystem?`<button class="btn small danger" type="button" data-action="delete-reg-field" data-id="${esc(f.id)}" title="حذف هذا الخيار نهائياً">حذف</button>`:`<small style="color:#64748b">حقل أساسي</small>`}
    </div>
   </div>`).join('')}
  </div>
  
  <button class="btn full secondary" type="button" data-action="close">إغلاق وحفظ</button>
 </div>`);
}

function newRegFieldModal(){
 modal('إضافة خيار جديد لنموذج تسجيل المستخدمين', `<form class="form" data-form="create-reg-field">
  <label>اسم الخيار / الحقل الظاهر للعميل
   <input name="label" required minlength="2" maxlength="60" placeholder="مثلاً: رقم الهوية الوطنية، اسم المحل، الحساب البنكي...">
  </label>
  <div class="row">
   <label>نوع الإدخال
    <select name="type">
     <option value="text">نص قصير (Text)</option>
     <option value="tel">رقم جوال / هاتف (Phone)</option>
     <option value="select">قائمة خيارات منسدلة (Dropdown)</option>
     <option value="textarea">نص تفصيلي متعدد الأسطر (Textarea)</option>
    </select>
   </label>
   <label>تحديد الأهمية (الأهم أو غير مهم)
    <select name="required">
     <option value="true">★ إلزامي (الأهم) - لا يكتمل التسجيل بدونه</option>
     <option value="false">اختياري (غير مهم) - اختياري للمستخدم</option>
    </select>
   </label>
  </div>
  <label>خيارات القائمة المنسدلة (فقط في حال اخترت «قائمة خيارات منسدلة»، افصل بينها بفاصلة)
   <input name="options" placeholder="مثلاً: عميل تجزئة، عميل جملة، شريك موزع">
  </label>
  <label>نص التلميح داخل الحقل (Placeholder)
   <input name="placeholder" placeholder="مثلاً: أدخل رقم الهوية هنا...">
  </label>
  <button class="btn full" type="submit">إضافة الخيار وحفظه فوراً في النموذج</button>
  <div class="form-error" hidden></div>
 </form>`);
}

function toggleRegRequired(id){
 const f = customRegFields.find(x=>x.id===id);
 if(!f) return;
 f.required = !f.required;
 saveRegFields();
 registrationFieldsManager();
 toast(`تم تغيير حقل «${f.label}» إلى: ${f.required ? 'إلزامي (الأهم)' : 'اختياري (غير مهم)'}`);
}

function toggleRegEnabled(id){
 const f = customRegFields.find(x=>x.id===id);
 if(!f) return;
 f.enabled = !f.enabled;
 saveRegFields();
 registrationFieldsManager();
 toast(`تم ${f.enabled ? 'تفعيل وإظهار' : 'إخفاء'} حقل «${f.label}» في نموذج التسجيل`);
}

function deleteRegField(id){
 const idx = customRegFields.findIndex(x=>x.id===id);
 if(idx === -1) return;
 if(customRegFields[idx].isSystem){
  toast('لا يمكن حذف الحقول الأساسية للنظام');
  return;
 }
 const name = customRegFields[idx].label;
 customRegFields.splice(idx, 1);
 saveRegFields();
 registrationFieldsManager();
 toast(`تم حذف خيار «${name}» من النموذج بنجاح`);
}

function resetRegFields(){
 localStorage.removeItem('ts-reg-fields');
 customRegFields = [
  { id: 'name', label: 'اسم المستخدم (متصل بدون مسافات أو رموز)', type: 'text', required: true, enabled: true, placeholder: 'مثال: محمدالعتيبي أو Ahmed2026', isSystem: true },
  { id: 'email', label: 'البريد الإلكتروني (لإرسال واستعادة كلمة المرور)', type: 'email', required: true, enabled: true, placeholder: 'you@example.com', isSystem: true },
  { id: 'password', label: 'كلمة المرور', type: 'password', required: true, enabled: true, placeholder: 'كلمة المرور (6 أحرف فأكثر)', isSystem: true },
  { id: 'phone', label: 'رقم الجوال للتواصل', type: 'tel', required: true, enabled: true, placeholder: '05xxxxxxxx', isSystem: false },
  { id: 'city', label: 'المدينة / المنطقة', type: 'text', required: false, enabled: true, placeholder: 'الرياض، جدة، مكة، القصيم...', isSystem: false },
  { id: 'address', label: 'الحي والشارع', type: 'text', required: false, enabled: true, placeholder: 'اسم الحي والشارع', isSystem: false },
  { id: 'accountType', label: 'نوع الحساب المطلوب', type: 'select', required: false, enabled: true, options: ['عميل تسوق', 'شريك تاجر', 'مندوب توصيل'], placeholder: 'اختر نوع الحساب', isSystem: false },
  { id: 'commercialId', label: 'رقم السجل التجاري أو الرخصة', type: 'text', required: false, enabled: false, placeholder: 'اختياري للتجار والمناديب', isSystem: false },
  { id: 'notes', label: 'ملاحظات أو طلبات خاصة', type: 'textarea', required: false, enabled: false, placeholder: 'أية تفاصيل إضافية تود مشاركتها مع الإدارة', isSystem: false }
 ];
 saveRegFields();
 registrationFieldsManager();
 toast('تمت استعادة الحقول الافتراضية بنجاح');
}


function renderAuth(tab='login'){
 document.body.dataset.page = 'auth';
 startLoginAdTimer();
 const isLogin = tab === 'login';
 const isRegister = tab === 'register';
 const isForgot = tab === 'forgot';

 $('#app').innerHTML = `<div class="vip-auth-page" style="display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap">
  <div id="login-ads-container">${renderLoginAdsCarousel()}</div>
  <div class="vip-auth-card">
   <div class="vip-logo-container">
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
     ${isForgot ? '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/>' : 
       isRegister ? '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>' :
       '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'}
    </svg>
   </div>

   <h1 class="vip-auth-title">${esc(storeAppearance.storeName || 'التسوق')}</h1>
   <p class="vip-auth-subtitle">${isForgot ? 'استعادة كلمة المرور وإرسال إشعار للإدارة' : isRegister ? 'إنشاء حساب مستخدم جديد (مجمد لحين التنشيط من الإدارة)' : esc(storeAppearance.subtitle || 'كل ما تحب، أقرب إليك')}</p>
   
   <form class="form" data-form="${isForgot ? 'forgot-password' : isRegister ? 'register' : 'login'}">
    ${isLogin ? `
    <div class="vip-input-group">
     <label>اسم المستخدم</label>
     <div class="input-wrapper">
      <span class="input-icon">
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </span>
      <input class="vip-input" name="email" type="text" maxlength="200" required autocomplete="username" dir="auto" oninput="this.value=this.value.replace(/\s+/g,'')" placeholder="اسم المستخدم المتصل (عربي / إنجليزي)">
     </div>
    </div>
    
    <div class="vip-input-group">
     <label>كلمة المرور</label>
     <div class="input-wrapper">
      <span class="input-icon">
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </span>
      <input class="vip-input" name="password" type="password" minlength="6" maxlength="128" required autocomplete="current-password" placeholder="أدخل كلمة المرور">
     </div>
    </div>
    
    <button class="vip-btn-login" type="submit">
     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m14 6-6 6 6 6M8 12h13"/></svg>
     <span>دخول</span>
    </button>` : ''}

    ${isRegister ? `
    <div style="max-height:46vh;overflow-y:auto;padding-left:4px;display:grid;gap:12px">
     ${customRegFields.filter(f=>f.enabled).map(f=>{
       const isReq = f.required;
       const reqBadge = isReq 
         ? `<span style="color:#fef08a;font-weight:bold;margin-right:4px">* (إلزامي - الأهم)</span>`
         : `<span style="color:#94a3b8;font-size:11px;margin-right:4px">(اختياري - غير مهم)</span>`;
       
       if(f.type === 'select'){
         return `
         <div class="vip-input-group">
           <label>${esc(f.label)} ${reqBadge}</label>
           <div class="input-wrapper">
             <select class="vip-input" name="${esc(f.id)}" ${isReq?'required':''}>
               <option value="">${esc(f.placeholder || 'اختر...')}</option>
               ${(f.options||[]).map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}
             </select>
           </div>
         </div>`;
       }
       if(f.type === 'textarea'){
         return `
         <div class="vip-input-group">
           <label>${esc(f.label)} ${reqBadge}</label>
           <div class="input-wrapper">
             <textarea class="vip-input" name="${esc(f.id)}" ${isReq?'required':''} placeholder="${esc(f.placeholder)}" rows="2"></textarea>
           </div>
         </div>`;
       }
       return `
       <div class="vip-input-group">
         <label>${esc(f.label)} ${reqBadge}</label>
         <div class="input-wrapper">
           <input class="vip-input" name="${esc(f.id)}" type="${f.type}" ${isReq?'required':''} placeholder="${esc(f.placeholder)}" dir="${['email','password','tel'].includes(f.type)?'ltr':'rtl'}">
         </div>
       </div>`;
     }).join('')}
    </div>
    <button class="vip-btn-login" type="submit" style="margin-top:14px">
     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m14 6-6 6 6 6M8 12h13"/></svg>
     <span>تسجيل الحساب</span>
    </button>` : ''}

    ${isForgot ? `
    <div class="vip-input-group">
     <label>البريد الإلكتروني أو اسم المستخدم</label>
     <div class="input-wrapper">
      <span class="input-icon">
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      </span>
      <input class="vip-input" name="emailOrUsername" type="text" maxlength="200" required autocomplete="email" dir="auto" placeholder="أدخل البريد الإلكتروني المسجل أو اسم المستخدم">
     </div>
     <small style="display:block;color:#fef08a;font-size:11px;margin-top:6px">سيتم إرسال كلمة المرور الجديدة فوراً إلى بريدك الإلكتروني المسجل.</small>
    </div>
    <button class="vip-btn-login" type="submit">
     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m14 6-6 6 6 6M8 12h13"/></svg>
     <span>إرسال كلمة السر إلى إيميل المستخدم</span>
    </button>` : ''}
    
    <div class="form-error" hidden style="margin-top:14px;background:#fcecee;color:#b83f45;padding:10px;border-radius:10px;font-size:12px;line-height:1.7"></div>
   </form>
   
   ${isLogin ? `
   <div style="display:flex;justify-content:center;align-items:center;gap:16px;margin-top:22px;font-size:13.5px">
    <button type="button" class="btn-text-gold" data-action="to-register">مستخدم جديد</button>
    <span style="color:rgba(212,175,55,0.4)">|</span>
    <button type="button" class="btn-text-muted" data-action="to-forgot">نسيان كلمة المرور</button>
   </div>` : `
   <div style="display:flex;justify-content:center;align-items:center;gap:10px;margin-top:20px;font-size:13.5px">
    <button type="button" class="btn-text-gold" data-action="to-login">← العودة لشاشة الدخول</button>
   </div>`}
   
   <div class="vip-auth-footer">
    <button type="button" class="btn-text-muted" data-action="install-app">📱 تثبيت على الجوال</button>
    <span style="color:#475569">|</span>
    <button type="button" class="btn-text-muted" data-action="privacy">الخصوصية وحماية البيانات</button>
   </div>
  </div>
 </div>`;
}

function renderRolePicker(){renderAuth();}

function installAppModal(){
 modal('تثبيت التطبيق على الآيفون والأندرويد',`<div class="stack">${isStandaloneApp()?`<div class="ticket-card"><strong>التطبيق يعمل الآن بوضع الشاشة الكاملة على جهازك.</strong></div>`:''}${deferredInstallPrompt?`<button class="btn full" data-action="trigger-pwa-install">تثبيت مباشر على أندرويد</button>`:''}<div class="ticket-card"><strong>تثبيت على الآيفون (iOS Safari)</strong><p class="hint">1. افتح الرابط في متصفح Safari على الآيفون أو الآيباد.<br>2. اضغط على زر المشاركة (Share) في الشريط السفلي.<br>3. اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen) ثم اضغط «إضافة».</p></div><div class="ticket-card"><strong>تثبيت على الأندرويد (Chrome / APK)</strong><p class="hint">يمكنك تثبيت التطبيق مباشرة من المتصفح بضغطة زر أو عبر حزمة تطبيق الأندرويد (Matjar.Android).</p></div><button class="btn ghost full" data-action="close">فهمت</button></div>`);
}
function productEditor(id){
 const p=dashboard.products.find(p=>p.id===id)||{name:'',category:'أزياء',price:'',stock:0,icon:'bag',image:'',description:'',active:true,merchantId:user.role==='Admin'?(dashboard.users.find(u=>u.role==='Merchant')?.id||user.id):user.id};
 modal(id?'تعديل تفاصيل المنتج':'منتج جديد',`<form class="form" data-form="product" data-id="${esc(id||'')}">
 <label>اسم المنتج<input name="name" value="${esc(p.name)}" required minlength="2" maxlength="100"></label>
 <label>وصف وتفاصيل المنتج<textarea name="description" maxlength="500" placeholder="اكتب وصفاً جذاباً للمنتج ومواصفاته">${esc(p.description||'')}</textarea></label>
 <label>رابط صورة حقيقية للمنتج (أو ارفع ملف من جهازك أدناه)<input name="imageUrl" id="product-img-url" value="${esc(p.image||'')}" placeholder="https://..."></label>
 <label>أو رفع صورة من الجهاز (PNG / JPEG / WebP)<input type="file" id="product-img-file" accept="image/png,image/jpeg,image/webp"></label>
 <input type="hidden" name="image" id="product-img-data" value="${esc(p.image||'')}">
 <div id="product-img-preview">${p.image?`<img src="${esc(p.image)}" style="max-height:140px;border-radius:12px;object-fit:cover;margin:8px 0;box-shadow:0 4px 12px rgba(0,0,0,0.1)" alt="صورة المنتج">`:''}</div>
 <div class="row">
  <label>${uiLanguage==='en'?'Price':'السعر'} (${commerce.currency})<input name="price" type="number" min="${priceStep()}" max="1000000000000" step="${priceStep()}" value="${p.price}" required></label>
  <label>المخزون<input name="stock" type="number" min="0" max="100000" step="1" value="${p.stock}" required></label>
 </div>
 <div class="row">
  <label>المجموعة الأساسية / القسم
  <input name="category" list="store-categories-datalist" value="${esc(p.category)}" required minlength="2" maxlength="60" placeholder="اختر مجموعة أو اكتب اسم مجموعة جديدة">
  <datalist id="store-categories-datalist">
   ${[...new Set([...storeCategories, ...(dashboard?.products||[]).map(x=>x.category)])].map(c=>`<option value="${esc(c)}">`).join('')}
  </datalist>
 </label>
  <label>رسم المنتج البديل<select name="icon">${Object.keys(palettes).map(k=>`<option value="${k}" ${p.icon===k?'selected':''}>${({bag:'حقيبة',shoe:'حذاء',headphones:'سماعة',watch:'ساعة',shirt:'قميص',lamp:'مصباح',coffee:'كوب',bottle:'قارورة'})[k]}</option>`).join('')}</select></label>
 </div>
 ${user.role==='Admin'?`<label>التاجر<select name="merchantId">${dashboard.users.filter(u=>['Merchant','Admin'].includes(u.role)&&u.active).map(u=>`<option value="${esc(u.id)}" ${u.id===p.merchantId?'selected':''}>${esc(u.name)}</option>`).join('')}</select></label>`:`<input type="hidden" name="merchantId" value="${esc(p.merchantId)}">`}
 <label class="check"><input type="checkbox" name="active" ${p.active?'checked':''}>المنتج ظاهر للعملاء</label>
 <button class="btn full">حفظ المنتج</button>
 <div class="form-error" hidden></div></form>`);
 $('#product-img-url').oninput=e=>{
  if(e.target.value){$('#product-img-data').value=e.target.value;$('#product-img-preview').innerHTML=`<img src="${esc(e.target.value)}" style="max-height:140px;border-radius:12px;object-fit:cover;margin:8px 0" alt="معاينة">`;}
 };
 $('#product-img-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
   const data=await normalizeImage(file,800,600000);
   $('#product-img-data').value=data;
   $('#product-img-preview').innerHTML=`<img src="${esc(data)}" style="max-height:140px;border-radius:12px;object-fit:cover;margin:8px 0" alt="معاينة الصورة">`;
  }catch(err){toast(err.message);}
 };
}
function permissionEditor(id){const u=dashboard.users.find(u=>u.id===id);if(!u||id===user.id)return;modal('صلاحيات '+u.name,`<form class="form" data-form="permissions" data-id="${esc(id)}"><div class="row"><label>نوع الحساب<select name="role">${Object.keys(roles).map(r=>`<option value="${r}" ${r===u.role?'selected':''}>${roles[r]}</option>`).join('')}</select></label><label class="check"><input name="active" type="checkbox" ${u.active?'checked':''}>الحساب فعال</label></div><p class="hint">موروث: يتبع الدور. السماح والمنع استثناءان خاصان بهذا المستخدم. المدير يمتلك كامل الصلاحيات.</p><div class="modal-scroll">${Object.entries(rights).map(([key,title])=>`<div class="permission-row"><span>${title}</span><select aria-label="${title}" name="perm:${key}"><option value="inherit" ${!(key in u.overrides)?'selected':''}>موروث من الدور</option><option value="allow" ${u.overrides[key]===true?'selected':''}>سماح</option><option value="deny" ${u.overrides[key]===false?'selected':''}>منع</option></select></div>`).join('')}</div><button class="btn full">حفظ الصلاحيات</button><div class="form-error" hidden></div></form>`);}
function newUser(){
 modal('إضافة مستخدم جديد وتحديد صلاحياته', `
 <form class="form" data-form="new-user">
  <div style="background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.35);padding:12px 14px;border-radius:12px;font-size:12px;color:#fef08a;line-height:1.7">
   <strong>إنشاء حساب فوري يفتح من أي جهاز:</strong><br>
   يمكنك كتابة اسم المستخدم باللغة <b>العربية</b> أو <b>الإنجليزية</b>، وسيتم تفعيل الحساب فوراً ليفتح حسب الدور والصلاحيات المحددة.
  </div>
  
  <label>اسم المستخدم (متصل بدون مسافات أو رموز - عربي أو إنجليزي)
   <input name="name" data-username-field="true" type="text" required minlength="2" maxlength="50" placeholder="مثال: محمدالعتيبي أو Khaled1">
  </label>
  
  <label>البريد الإلكتروني للمستخدم (لإرسال واستعادة كلمة السر)
   <input name="email" type="email" required dir="ltr" maxlength="200" placeholder="user@example.com">
  </label>
  
  <label>كلمة المرور للدخول (4 أحرف أو أرقام فأكثر)
   <input name="password" type="text" required minlength="4" maxlength="128" autocomplete="off" placeholder="مثال: 123456">
  </label>
  
  <label>الدور ونوع الواجهة التي ستفتح للمستخدم
   <select name="role" required>
    <option value="Courier">🛵 مندوب توصيل (تفتح له شاشة مهام التوصيل والخرائط)</option>
    <option value="Supervisor">🛡️ مشرف عام (تفتح له لوحة الإشراف والطلبات والمنتجات)</option>
    <option value="Merchant">🏪 تاجر / شريك تجاري (تفتح له شاشة إدارة منتجاته وطلباته)</option>
    <option value="Support">🎧 دعم فني (تفتح له شاشة تذاكر ومحادثات العملاء والطلبات)</option>
    <option value="Customer">🛍️ عميل معتمد (تفتح له واجهة التسوق والسلة والطلبات)</option>
    <option value="Admin">👑 مدير عام (كامل صلاحيات الإدارة العليا)</option>
   </select>
  </label>
  
  <button class="btn full" type="submit">✓ إنشاء وتفعيل المستخدم فوراً</button>
  <div class="form-error" hidden></div>
 </form>`);
}
function connect(){modal('الاتصال بمتجر التسوق',`<p class="hint">تُضبط هذه الخطوة بواسطة إدارة المتجر. يتطلب التشغيل الفعلي رابط خادم المتجر الآمن.</p><div class="spacer"></div><form class="form" data-form="connect"><label>رابط المتجر<input name="url" type="url" dir="ltr" placeholder="https://store.example.com" value="${esc(apiBase)}" required></label><button class="btn full">اتصال</button><div class="form-error" hidden></div></form>`);}
function privacy(){modal('الخصوصية وحذف الحساب',`<div class="stack hint"><h3>بياناتك في المتجر</h3><p>المتجر يلتزم بأعلى معايير الخصوصية والأمان وحماية بيانات البطاقات والشحنات المشفرة.</p><button class="btn full" data-action="close">فهمت</button></div>`);}

async function action(name,id,el=null){
  if(name==='grant-all-permissions'){
  localStorage.setItem('ts-permissions-prompted','true');
  closeModal();
  if('Notification' in window){
   Notification.requestPermission().then(perm => {
    if(perm === 'granted' && typeof triggerMobileNotification === 'function'){
     triggerMobileNotification('🎉 تم تفعيل إشعارات الجوال', 'ستصلك الآن تنبيهات الطلبات الجديدة والرسائل مباشرة على شاشة هاتفك.');
    }
   }).catch(()=>{});
  }
  if('geolocation' in navigator){
   navigator.geolocation.getCurrentPosition(()=>{}, ()=>{}, { timeout: 6000 });
  }
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
   navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    .then(stream => { stream.getTracks().forEach(t => t.stop()); })
    .catch(()=>{});
  }
  toast('تم حفظ طلب الأذونات بنجاح!');
  return;
 }
 if(name==='skip-permissions'){
  localStorage.setItem('ts-permissions-prompted','true');
  closeModal();
  return;
 }
  if(name==='admin-edit-password'){adminEditPasswordModal(id);return;}
 if(name==='admin-delete-user'){adminDeleteUserModal(id);return;}
 if(name==='copy-text'){
  try {
   navigator.clipboard.writeText(id);
   toast('تم نسخ كلمة المرور: ' + id);
  } catch(e) { toast('كلمة المرور: ' + id); }
  return;
 }
 if(name==='admin-gen-password'){
  try {
   const randomPass = 'Pass@' + Math.floor(100000 + Math.random() * 900000);
   if(!apiBase){
    const d=demoData();
    const u=d.users.find(x=>x.id===id);
    if(u){u.password=randomPass; u.tempPassword=randomPass; saveDemoData(d);}
   } else {
    await request('/users/'+id+'/reset-password','POST',{newPassword:randomPass});
   }
   await refresh();
   modal('تم توليد كلمة المرور بنجاح', `
   <div class="stack" style="text-align:center">
    <h3 style="color:#22c55e">✓ تم إنشاء كلمة مرور مؤقتة جديدة</h3>
    <p class="hint">تم تحديث كلمة مرور المستخدم بنجاح. يمكنك نسخها وتزويد العميل بها:</p>
    <div style="background:#031711;border:1px solid rgba(212,175,55,0.4);border-radius:12px;padding:14px;margin:10px 0">
     <code style="font-size:18px;color:#fde047;letter-spacing:1px">${randomPass}</code>
    </div>
    <button class="btn full" type="button" data-action="copy-text" data-id="${randomPass}">📋 نسخ كلمة المرور</button>
    <button class="btn ghost full" type="button" data-action="close">إغلاق</button>
   </div>`);
  } catch(e) { toast(e.message); }
  return;
 }
 if(name==='admin-toggle-freeze'){
  try {
   if(!apiBase){
    const d=demoData();
    const u=d.users.find(x=>x.id===id);
    if(u){u.active=!u.active; saveDemoData(d);}
   } else {
    await request('/users/'+id+'/toggle-freeze','POST');
   }
   await refresh();
   toast('تم تحديث حالة الحساب بنجاح');
  } catch(e) { toast(e.message); }
  return;
 }
 if(name==='admin-terminate-sessions'){
  try {
   if(!apiBase){
    toast('تم إنهاء كافة الجلسات النشطة للمستخدم');
   } else {
    await request('/users/'+id+'/terminate-sessions','POST');
    toast('تم تسجيل خروج المستخدم من كافة الأجهزة المتصلة بنجاح');
   }
   await refresh();
  } catch(e) { toast(e.message); }
  return;
 }
 if(name==='confirm-admin-delete'){
  try {
   if(!apiBase){
    const d=demoData();
    d.users=d.users.filter(x=>x.id!==id);
    saveDemoData(d);
   } else {
    await request('/users/'+id,'DELETE');
   }
   closeModal();
   await refresh();
   toast('تم حذف حساب المستخدم نهائياً بنجاح');
  } catch(e) { toast(e.message); }
  return;
 }
  if(name==='view-product'){viewProductModal(id);return;}
 if(name==='instant-refresh'){
  await refresh();
  if(typeof updateNotices==='function')await updateNotices();
  toast('تم تحديث كافة بيانات المتجر بنجاح!');
  return;
 }
  if(name==='admin-cat-filter'){adminSelectedCat=id;render();return;}
 if(name==='categories-manager'){categoriesManagerModal();return;}
 if(name==='edit-product-in-cat'){
  closeModal();
  productEditor();
  setTimeout(()=>{const inp=document.querySelector('form[data-form="product"] input[name="category"]');if(inp)inp.value=id;},50);
  return;
 }
 if(name==='delete-product'){
  const p = (dashboard?.products||[]).find(x=>x.id===id) || products.find(x=>x.id===id);
  modal('تأكيد حذف الصنف', `
  <div class="stack">
   <p style="color:#ef4444;font-size:14px;line-height:1.7">
    ⚠️ هل أنت متأكد من حذف الصنف <b>«${esc(p?.name||'هذا الصنف')}»</b> نهائياً من المتجر؟
   </p>
   <div class="inline" style="justify-content:flex-end;gap:10px;margin-top:12px">
    <button class="btn ghost" type="button" data-action="close">إلغاء</button>
    <button class="btn danger" type="button" data-action="confirm-delete-product" data-id="${esc(id)}">تأكيد الحذف النهائي</button>
   </div>
  </div>`);
  return;
 }
 if(name==='confirm-delete-product'){
  if(!apiBase){
   const d = demoData();
   d.products = d.products.filter(x=>x.id!==id);
   saveDemoData(d);
  } else {
   await request('/products/'+id, 'DELETE');
  }
  closeModal();
  await refresh();
  toast('تم حذف الصنف من المتجر بنجاح');
  return;
 }
 if(name==='rename-category-prompt'){
  modal('تعديل اسم المجموعة الأساسية', `
  <form class="form" data-form="rename-category" data-id="${esc(id)}">
   <label>الاسم الحالي للمجموعة<input value="${esc(id)}" disabled></label>
   <label>الاسم الجديد للمجموعة<input name="newName" value="${esc(id)}" required minlength="2" maxlength="60"></label>
   <button class="btn full" type="submit">حفظ الاسم الجديد وتحديث أصناف المجموعة</button>
  </form>`);
  return;
 }
 if(name==='delete-category-confirm'){
  modal('حذف المجموعة وأصنافها', `
  <div class="stack">
   <p style="color:#ef4444;font-size:14px;line-height:1.7">
    ⚠️ هل تريد حذف مجموعة <b>«${esc(id)}»</b> مع جميع الأصناف المدرجة بداخلها؟
   </p>
   <div class="inline" style="justify-content:flex-end;gap:10px">
    <button class="btn ghost" type="button" data-action="close">تراجع</button>
    <button class="btn danger" type="button" data-action="confirm-delete-category" data-id="${esc(id)}">نعم، حذف المجموعة</button>
   </div>
  </div>`);
  return;
 }
 if(name==='confirm-delete-category'){
  storeCategories = storeCategories.filter(c => c !== id);
  if(!apiBase){
   const d = demoData();
   d.products = d.products.filter(p => p.category !== id);
   saveDemoData(d);
  } else {
   await request('/categories/' + encodeURIComponent(id), 'DELETE');
  }
  closeModal();
  await refresh();
  toast('تم حذف المجموعة بنجاح');
  return;
 }
 if(name==='seed-full-catalog'){
  if(!apiBase){
   localStorage.removeItem('ts-demo-data');
  } else {
   await request('/products/seed-catalog', 'POST');
  }
  storeCategories = [...defaultCoreCategories];
  await refresh();
  toast('تم توليد واستعادة الكتالوج الشامل (8 مجموعات و52 صنفاً بالأسعار) بنجاح!');
  return;
 }
  if(name==='open-gmaps'){
  const lat = el?.dataset?.lat;
  const lng = el?.dataset?.lng;
  openInGooglePlayMaps(lat, lng);
  return;
 }
 if(name==='support'){
  page = 'support'; render(); return;
 }
 if(name==='open-new-ticket'){
  modal('بدء محادثة دعم فني مباشرة', `
  <form class="form" data-form="new-support-ticket">
   <p class="hint">سيتم تحويل محادثتك فوراً إلى أول موظف دعم فني متصل.</p>
   <label>عنوان المشكلة أو الاستفسار<input name="subject" required maxlength="120" placeholder="مثال: استفسار عن طلب أو مشكلة تقنية"></label>
   <label>تفاصيل رسالتك<textarea name="message" rows="3" required maxlength="2000" placeholder="اكتب رسالتك هنا..."></textarea></label>
   <button class="btn full" type="submit">💬 بدء الدردشة المباشرة</button>
  </form>`);
  return;
 }
 if(name==='refresh-support'){
  await loadSupportTickets(false);
  toast('تم تحديث المحادثات');
  return;
 }
 if(name==='select-ticket'){
  activeTicketId = id;
  if(apiBase && (user.role==='Support' || has('support.manage')) && user.role!=='Admin'){
   try { await request('/tickets/'+id+'/claim', 'POST'); } catch(e){}
  }
  await loadSupportTickets(false);
  return;
 }
 if(name==='toggle-ticket-status'){
  const nextStatus = el?.dataset?.status || 'Closed';
  if(!apiBase){
   const d = demoData();
   const t = (d.tickets||[]).find(x=>x.id===id);
   if(t){ t.status = nextStatus; persistDemo(d); }
  } else {
   await request('/tickets/'+id+'/status', 'PUT', { status: nextStatus });
  }
  await loadSupportTickets(false);
  toast(nextStatus==='Closed'?'تم إغلاق البلاغ':'تمت إعادة فتح البلاغ');
  return;
 }
 if(name==='refresh-admin-gps'){
  if(typeof refreshAdminLiveLocation === 'function'){
   refreshAdminLiveLocation(coords => {
    toast('تم تحديث موقع الأدمن المباشر بنجاح');
    if(devicesMapInstance && coords){
     initDevicesMap(lastDevicesList);
     devicesMapInstance.setView([coords.lat, coords.lng], 12);
    }
   });
  }
  return;
 }
 if(name==='focus-device-map'){
  const lat = parseFloat(el?.dataset?.lat);
  const lng = parseFloat(el?.dataset?.lng);
  if(lat && lng) focusDeviceOnMap(lat, lng);
  return;
 }
 if(name==='gallery-thumb'){
  const mainImg = document.getElementById('gallery-main-display');
  if(mainImg && id) mainImg.src = id;
  return;
 }
 if(name==='switch-login-ad'){
  switchLoginAd(Number(id)||0);
  return;
 }
 if(name==='admin-tech-settings'){
  await adminTechSettingsModal();
  return;
 }
 if(name==='set-auto-approve'){
  const autoApprove = id === 'true';
  if(!apiBase){
   governance.policies.autoApproveCustomers = autoApprove;
  } else {
   await request('/policies/auto-approve', 'POST', { autoApprove });
   await refreshGovernance();
  }
  render();
  toast(autoApprove ? 'تم تفعيل القبول التلقائي للحسابات الجديدة' : 'تم تفعيل مراجعة وموافقة المشرفين للحسابات الجديدة');
  return;
 }
 if(name==='to-register'){renderAuth('register');return;}
 if(name==='to-forgot'){renderAuth('forgot');return;}
 if(name==='to-login'){renderAuth('login');return;}
 if(name==='registration-fields'){registrationFieldsManager();return;}
 if(name==='new-reg-field'){newRegFieldModal();return;}
 if(name==='toggle-reg-required'){toggleRegRequired(id);return;}
 if(name==='toggle-reg-enabled'){toggleRegEnabled(id);return;}
 if(name==='delete-reg-field'){deleteRegField(id);return;}
 if(name==='reset-reg-fields'){resetRegFields();return;}
 if(name==='activate-user'){
  try {
   if(!apiBase){
    const d=demoData();
    const target=d.users.find(x=>x.id===id);
    if(target) target.active=true;
    saveDemoData(d);
   } else {
    await request('/users/'+id+'/activate','POST');
   }
   await refresh();
   toast('تم تنشيط الحساب بنجاح! يستطيع المستخدم الدخول الآن');
  } catch(e){ toast(e.message); }
  return;
 }
 if(await governanceAction(name,id))return;if(await commerceAction(name,id))return;if(await chatAction(name,id))return;
 if(await appearanceAction(name,id))return;if(await extendedAction(name,id))return;
 if(name==='edit-profile'){editProfileModal();return;}
 if(name==='banner-click'){if(id){category=id;page='home';render();$('#product-heading')?.scrollIntoView({behavior:'smooth'});}return;}
 if(name==='install-app'){installAppModal();return;}
 if(name==='trigger-pwa-install'){if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;closeModal();}return;}
 if(name==='login-screen'){demo=false;sessionStorage.removeItem('ts-demo');user=null;renderAuth();return;}
 if(name==='close'){closeModal();return;}if(name==='privacy'){privacy();return;}if(name==='connect'){connect();return;}
 if(name==='start-demo'){demo=true;sessionStorage.setItem('ts-demo','true');user=null;renderAuth();return;}
 if(name==='demo-role'){demo=true;sessionStorage.setItem('ts-demo','true');const d=demoData();user=demoUser(d.users.find(u=>u.role===id&&u.active));if(!user)throw new Error('لا يوجد حساب فعال لهذا الدور');sessionStorage.setItem('ts-demo-user',user.id);page='home';await refresh();return;}
 if(name==='switch-role'){stopSharing();user=null;renderAuth();return;}
 if(name==='logout'){stopSharing();await request('/auth/logout','POST');token='';user=null;sessionStorage.removeItem('ts-token');sessionStorage.removeItem('ts-demo-user');renderAuth();return;}
 if(name==='navigate'){
  // اختصارات احترافية تفتح نوافذ التحكم مباشرة مع تمرير سلس للشريط السفلي
  if(id==='banners'){await bannersManager();return;}
  if(id==='appearance'){appearanceEditor();return;}
  if(id==='regfields'){registrationFieldsManager();return;}
  if(id==='commissions'){if(typeof commissionsEditor==='function')await commissionsEditor();return;}
  if(id==='notices'){if(typeof noticesCenter==='function')await noticesCenter();return;}
  if(id==='support'){if(typeof supportCenter==='function')await supportCenter();return;}
  
  page=id;
  render();
  window.scrollTo({top:0,behavior:'smooth'});
  
  // تمرير الشريط السفلي تلقائياً ليتوسط الخيار النشط بنعومة
  setTimeout(()=>{
   const activeBtn = document.querySelector(`.mobile-nav button[data-id="${id}"]`);
   if(activeBtn && activeBtn.scrollIntoView){
    activeBtn.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
   }
  }, 60);
  return;
 }
 if(name==='category'){category=id;render();return;}
 if(name==='browse'){$('#product-heading')?.scrollIntoView({behavior:'smooth'});return;}
 if(name==='favorite'){favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];localStorage.setItem('ts-favorites',JSON.stringify(favorites));render();return;}
 if(name==='add'){const p=products.find(p=>p.id===id);if(!p||p.stock<((cart[id]||0)+1))throw new Error('وصلت إلى أقصى كمية متاحة');cart[id]=(cart[id]||0)+1;saveCart();render();toast('أضفنا القطعة الفاخرة إلى حقيبة التسوق');return;}
 if(name==='qty-minus'){if(cart[id]>1)cart[id]--;else delete cart[id];saveCart();render();return;}
 if(name==='remove-cart'){delete cart[id];saveCart();render();return;}
 if(name==='edit-product'){productEditor(id);return;}if(name==='permissions'){permissionEditor(id);return;}if(name==='new-user'){newUser();return;}
 if(name==='cancel-order'){modal('إلغاء الطلب',`<p class="hint">سيُلغى الطلب وتُعاد الكميات إلى المخزون. هل تريد المتابعة؟</p><div class="spacer"></div><button class="btn danger full" data-action="confirm-cancel" data-id="${esc(id)}">تأكيد إلغاء الطلب</button>`);return;}
 if(name==='confirm-cancel'){await request('/orders/'+id+'/cancel','POST');closeModal();await refresh();toast('تم إلغاء الطلب');return;}
 if(name==='order-ready'||name==='order-pickup'){await request('/orders/'+id+'/'+(name==='order-ready'?'ready':'pickup'),'POST');await refresh();toast('تم تحديث حالة الطلب');return;}
 if(name==='assign'){const couriers=dashboard.users.filter(u=>u.role==='Courier'&&u.active);modal('إسناد مندوب للطلب',`<form class="form" data-form="assign" data-id="${esc(id)}"><label>مندوب التوصيل السريع<select name="courierId" required>${couriers.map(u=>`<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('')}</select></label>${!couriers.length?'<p class="hint">أضف حساب مندوب فعال من إدارة المستخدمين أولًا.</p>':''}<button class="btn" ${!couriers.length?'disabled':''}>إسناد المهمة</button><div class="form-error" hidden></div></form>`);return;}
 if(name==='deliver'){modal('تأكيد استلام العميل',`<form class="form" data-form="deliver" data-id="${esc(id)}"><p class="hint">اطلب رمز الاستلام السري من العميل عند تسليم الشحنة. ${demo?'رمز العرض: 123456':''}</p><label>رمز التأكيد السري<input name="pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required dir="ltr" autocomplete="off"></label><button class="btn full">تم تسليم الشحنة بنجاح</button><div class="form-error" hidden></div></form>`);return;}
 if(name==='delete-account'){modal('حذف الحساب',`<form class="form" data-form="delete-account"><p class="hint">سيتوقف الحساب وتُزال بياناته الشخصية، مع الاحتفاظ بسجل الطلبات المحاسبي.</p><label>كلمة المرور للتأكيد<input name="password" type="password" required autocomplete="current-password"></label><button class="btn danger full">تأكيد حذف حسابي</button><div class="form-error" hidden></div></form>`);}
}

document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');
 if(!b)return;
 e.preventDefault();
 if(busy)return;
 const act=b.dataset.action;
 const id=b.dataset.id;
 try{
  busy=true;
  if(b.tagName==='BUTTON')b.disabled=true;
  await action(act,id,b);
 }catch(err){
  toast(err.message);
 }finally{
  busy=false;
  if(b.isConnected && b.tagName==='BUTTON')b.disabled=false;
 }
});
document.addEventListener('input',e=>{if(e.target.id==='search'){search=e.target.value;const start=e.target.selectionStart;render();$('#search').focus();$('#search').setSelectionRange(start,start);}});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!form.dataset.form)return;e.preventDefault();if(busy)return;busy=true;const b=form.querySelector('button[type="submit"],button.btn');if(b)b.disabled=true;const error=form.querySelector('.form-error');if(error)error.hidden=true;
 try{
  const f=Object.fromEntries(new FormData(form));const kind=form.dataset.form,id=form.dataset.id;
  if(await governanceForm(kind,id,f,form))return;if(await commerceForm(kind,id,f,form))return;if(await chatForm(kind,id,f,form))return;if(await appearanceForm(kind,id,f,form))return;if(await extendedForm(kind,id,f))return;
  if(kind==='update-profile'){
   f.name = validateConnectedUsername(f.name);
   const updated=await request('/me/profile','PUT',f);
   user=updated;closeModal();render();toast('تم تحديث بيانات الحساب وكلمة المرور بنجاح');return;
  }
  if((kind==='login'||kind==='register'||kind==='setup')&&!apiBase){
   demo=true;sessionStorage.setItem('ts-demo','true');
   const d=demoData();
   if(kind==='login'){
    const inputId=(f.email||'').trim().toLowerCase();
    const found=d.users.find(u=>u.email.toLowerCase()===inputId||u.name.toLowerCase()===inputId);
    const expectedPass=found?.password||(found?.role==='Admin'?'583192':null);
    if(found && !found.active && (!expectedPass || f.password === expectedPass)) throw new Error('حسابك مجمد حالياً وبانتظار التنشيط والموافقة من قِبل إدارة المتجر');
    if(!found||!found.active||(expectedPass&&f.password!==expectedPass))throw new Error('بيانات الدخول غير صحيحة');
    user=demoUser(found);sessionStorage.setItem('ts-demo-user',user.id);page='home';await refresh();return;
   }
  }
      if(kind==='create-reg-field'){
   const label=(f.label||'').trim();
   if(!label)throw new Error('أدخل اسم الخيار أو الحقل');
   const id='f_'+Date.now();
   const opts=f.options?f.options.split(/[،,]/).map(x=>x.trim()).filter(Boolean):[];
   customRegFields.push({
    id,
    label,
    type:f.type||'text',
    required:f.required==='true',
    enabled:true,
    options:opts,
    placeholder:f.placeholder||'',
    isSystem:false
   });
   saveRegFields();
   closeModal();
   registrationFieldsManager();
   toast('تمت إضافة الخيار بنجاح إلى نموذج تسجيل المستخدمين الجدد');
   return;
  }
    if(kind==='admin-save-password'){
   const newPass=(f.password||'').trim();
   if(newPass.length < 6) throw new Error('كلمة المرور 6 أحرف فأكثر');
   if(!apiBase){
    const d=demoData();
    const u=d.users.find(x=>x.id===id);
    if(u){u.password=newPass; u.tempPassword=newPass; saveDemoData(d);}
   } else {
    await request('/users/'+id+'/reset-password','POST',{newPassword:newPass});
   }
   closeModal();
   await refresh();
   toast('تم حفظ وتعديل كلمة المرور بنجاح للمستخدم');
   return;
  }
    if(kind==='add-category'){
   const cName = (f.name||'').trim();
   if(!cName) throw new Error('أدخل اسم المجموعة');
   if(!storeCategories.includes(cName)) storeCategories.push(cName);
   if(apiBase) await request('/categories', 'POST', { name: cName });
   categoriesManagerModal();
   toast('تمت إضافة المجموعة الأساسية بنجاح');
   return;
  }
  if(kind==='rename-category'){
   const nName = (f.newName||'').trim();
   if(!nName) throw new Error('أدخل الاسم الجديد');
   const idx = storeCategories.indexOf(id);
   if(idx >= 0) storeCategories[idx] = nName;
   else storeCategories.push(nName);
   if(!apiBase){
    const d = demoData();
    d.products.forEach(p => { if(p.category === id) p.category = nName; });
    saveDemoData(d);
   } else {
    await request('/categories', 'PUT', { oldName: id, newName: nName });
   }
   closeModal();
   await refresh();
   toast('تم تحديث اسم المجموعة وجميع أصنافها بنجاح');
   return;
  }
  if(kind==='new-support-ticket'){
   let created;
   if(!apiBase){
    const d = demoData();
    const num = 'SUP-' + (1001 + (d.tickets||[]).length);
    const sup = (d.users||[]).find(x => x.role==='Support' && x.active);
    created = { id:'t_'+Date.now(), ticketNumber:num, userId:user.id, name:user.name, userRole:user.role, subject:f.subject, status:sup?'InProgress':'Open', assignedSupportId:sup?.id||null, assignedSupportName:sup?.name||null, updatedAt:new Date().toISOString(), messages:[{userId:user.id,name:user.name,message:f.message,at:new Date().toISOString(),senderRole:user.role}] };
    d.tickets.unshift(created); persistDemo(d);
   } else {
    created = await request('/tickets', 'POST', { subject: f.subject, message: f.message, orderId: null });
   }
   activeTicketId = created.id;
   closeModal();
   await loadSupportTickets(false);
   toast('تم فتح محادثة الدعم الفني بنجاح');
   return;
  }
  if(kind==='support-reply'){
   const msg = (f.message || '').trim();
   if(!msg) return;
   if(!apiBase){
    const d = demoData();
    const t = (d.tickets||[]).find(x=>x.id===id);
    if(t){
     const isAdm = user.role === 'Admin';
     t.messages.push({ userId:user.id, name:isAdm?'الإدارة':user.name, message:msg, at:new Date().toISOString(), senderRole:isAdm?'Admin':user.role });
     t.updatedAt = new Date().toISOString();
     persistDemo(d);
    }
   } else {
    await request('/tickets/'+id+'/reply', 'POST', { message: msg });
   }
   form.reset();
   await loadSupportTickets(false);
   return;
  }
  if(kind==='ticket-lookup'){
   const num = (f.number || '').trim();
   if(!num) throw new Error('أدخل رقم البلاغ السابق للبحث');
   if(!apiBase){
    const d = demoData();
    const found = (d.tickets||[]).find(x => (x.ticketNumber||'').toUpperCase()===num.toUpperCase() || x.id===num);
    if(!found) throw new Error('لم يتم العثور على بلاغ بهذا الرقم');
    supportLookupResult = found;
    activeTicketId = found.id;
   } else {
    const found = await request('/tickets/lookup?number=' + encodeURIComponent(num));
    supportLookupResult = found;
    activeTicketId = found.id;
   }
   renderSupportChatList();
   renderSupportMainPane(false);
   toast('تم عرض تفاصيل البلاغ والمحادثة');
   return;
  }
    if(kind==='save-admin-tech-settings'){
   await request('/admin/settings', 'PUT', {
    host: f.host, port: Number(f.port)||587, user: f.user, pass: f.pass,
    mapApiKey: f.mapApiKey, mapTileUrl: f.mapTileUrl
   });
   config.mapApiKey = f.mapApiKey || '';
   config.mapTileUrl = f.mapTileUrl || '';
   closeModal();
   toast('تم حفظ مفتاح الخرائط وإعدادات البريد الإلكتروني بنجاح!');
   return;
  }
  if(kind==='test-smtp-email'){
   const res = await request('/admin/settings/test-email', 'POST', { emailOrUsername: f.email });
   toast(res.message || 'تم إرسال رسالة الاختبار بنجاح!');
   return;
  }
  if(kind==='register'){
   f.name = validateConnectedUsername(f.name);
   if(!apiBase){
    const d=demoData();
    const email=(f.email||'').trim().toLowerCase();
    if(d.users.some(u=>u.name.toLowerCase()===f.name.toLowerCase()))throw new Error('اسم المستخدم هذا موجود ومسجل مسبقاً، اختر اسماً آخر');
    if(d.users.some(u=>u.email.toLowerCase()===email))throw new Error('البريد الإلكتروني مسجل بالفعل');
    const newUser={id:'u_'+Date.now(),name:f.name.trim(),email,password:f.password,role:'Customer',active:false,overrides:{}};
    d.users.push(newUser);
    if(!d.notices) d.notices=[];
    d.notices.unshift({
     id:'not_'+Date.now(),
     title:'🔔 تسجيل مستخدم جديد (مجمد بانتظار التنشيط)',
     message:`قام المستخدم ${newUser.name} (${newUser.email}) بإنشاء حساب جديد. الحساب مجمد حالياً وبانتظار موافقة وتنشيط الإدارة.`,
     at:new Date().toISOString(),
     read:false
    });
    saveDemoData(d);
   } else {
    const res = await request('/auth/register','POST',f);
    if(res && res.token && res.user){
     token = res.token; user = res.user;
     sessionStorage.setItem('ts-token', token);
     page = 'home'; setupNeeded = false;
     await refresh();
     toast('تم إنشاء حسابك وتفعيله تلقائياً بنجاح!');
     return;
    }
   }
   renderAuth('login');
   modal('تم إنشاء الحساب بنجاح',`<div class="stack"><div class="ticket-card" style="background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4)"><strong>حسابك مجمد حالياً وبانتظار التنشيط</strong><p class="hint">تم تسجيل حسابك بنجاح وهو حالياً قيد المراجعة. تم إرسال إشعار تنبيه إلى الإدارة والمشرفين لتنشيط الحساب، وستتمكن من الدخول فور اعتماده.</p></div><button class="btn full" data-action="close">فهمت</button></div>`);
   return;
  }
  if(kind==='forgot-password'){
   const q=(f.emailOrUsername||'').trim();
   if(!q)throw new Error('أدخل اسم المستخدم أو البريد الإلكتروني المسجل');
   let respMessage = '';
   let sentEmail = q;
   if(!apiBase){
    const d=demoData();
    const u=d.users.find(x=>x.email.toLowerCase()===q.toLowerCase()||x.name.toLowerCase()===q.toLowerCase());
    if(!u) throw new Error('لم يتم العثور على حساب مسجل بهذا الاسم أو البريد الإلكتروني');
    const tempPass = 'Pass@' + Math.floor(100000 + Math.random() * 900000);
    u.password = tempPass;
    u.tempPassword = tempPass;
    u.forgotPasswordAt = new Date().toISOString();
    sentEmail = u.email;
    if(!d.notices) d.notices=[];
    d.notices.unshift({
     id:'not_'+Date.now(),
     title:'⚠️ تم إرسال كلمة المرور للإيميل',
     message:`طلب العميل ${u.name} (${u.email}) استعادة كلمة المرور. تم إنشاء كلمة مرور مؤقتة (${tempPass}) وتعيينها وإرسالها لبريده المسجل.`,
     at:new Date().toISOString(),
     read:false
    });
    saveDemoData(d);
    respMessage = `تم إرسال كلمة المرور المؤقتة الجديدة إلى بريدك الإلكتروني المسجل (${u.email}) بنجاح! تفقد صندوق الوارد ورسائل غير الهام (Spam).`;
   } else {
    const res = await request('/auth/forgot-password','POST',{emailOrUsername:q});
    respMessage = res.message || `تم إرسال كلمة المرور إلى بريدك الإلكتروني المسجل (${res.email || q}) بنجاح!`;
    sentEmail = res.email || q;
   }
   renderAuth('login');
   modal('تم إرسال كلمة المرور إلى بريدك الإلكتروني', `
   <div class="stack" style="text-align:center">
    <div class="vip-logo-container" style="width:68px;height:68px;margin:0 auto 10px">
     <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
     </svg>
    </div>
    <h2 style="font-size:18px;color:#22c55e;margin-bottom:6px">تم الإرسال بنجاح!</h2>
    <div style="background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.35);padding:14px;border-radius:14px;font-size:13px;line-height:1.8;color:#fef08a">
     ${esc(respMessage)}
    </div>
    <p class="hint" style="font-size:12px;color:#cbd5e1;line-height:1.7;margin-top:6px">
     افتح تطبيق البريد الإلكتروني في هاتفك وانسخ كلمة المرور الجديدة لتسجيل الدخول فوراً.
    </p>
    <button class="btn full" type="button" data-action="close">دخول الآن بكلمة المرور الجديدة</button>
   </div>`);
   return;
  }
  if(kind==='login'||kind==='setup'){const result=await request(kind==='setup'?'/setup':'/auth/'+kind,'POST',f);token=result.token;user=result.user;sessionStorage.setItem('ts-token',token);page='home';setupNeeded=false;await refresh();}
  if(kind==='connect'){const url=new URL(f.url);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('استخدم رابط HTTPS آمنًا');const next=url.origin;const res=await fetch(next+'/api/health');if(!res.ok||(await res.json()).status!=='ok')throw new Error('هذا الرابط ليس خادم المتجر');apiBase=next;localStorage.setItem('ts-server',apiBase);demo=false;sessionStorage.removeItem('ts-demo');sessionStorage.removeItem('ts-demo-user');token='';user=null;sessionStorage.removeItem('ts-token');setupNeeded=(await request('/setup')).required;closeModal();renderAuth();}
  if(kind==='checkout'){const result=await request('/orders','POST',{items:Object.entries(cart).map(([productId,qty])=>({productId,qty})),address:f.address,phone:f.phone,destination:checkoutDestination,paymentMethodId:f.paymentMethodId||'cod',currency:commerce.currency,commissionVersion:governance.commissions.version});checkoutDestination=null;cart={};saveCart();page='orders';await refresh();toast('تأكد طلبك الفاخر رقم '+result.number);if(result.paymentType&&result.paymentType!=='Cash')await paymentOrder(result.id);}
  if(kind==='product'){await request('/products'+(id?'/'+id:''),id?'PUT':'POST',{...f,price:Number(f.price),stock:Number(f.stock),active:f.active==='on'});closeModal();await refresh();toast('تم حفظ المنتج بنجاح');}
  if(kind==='new-user'){
   const cleanName = validateConnectedUsername(f.name);
   const cleanEmail = (f.email||'').trim() || cleanName;
   const payload = { name: cleanName, email: cleanEmail, password: f.password, role: f.role };
   if(!apiBase){
    const d = demoData();
    if(d.users.some(x => x.name.toLowerCase()===cleanName.toLowerCase() || x.email.toLowerCase()===cleanEmail.toLowerCase())) throw new Error('الاسم أو المعرف مسجل مسبقاً');
    d.users.push({ id:'u_'+Date.now(), name:cleanName, email:cleanEmail, password:f.password, tempPassword:f.password, role:f.role, active:true, overrides:{} });
    saveDemoData(d);
   } else {
    await request('/users','POST',payload);
   }
   closeModal();
   await refresh();
   modal('تم إنشاء وتفعيل الحساب بنجاح!', `
   <div class="stack" style="text-align:center">
    <h3 style="color:#22c55e;margin:0">✓ الحساب جاهز للفتح من أي جهاز فوراً</h3>
    <p class="hint">يستطيع المستخدم الآن فتح التطبيق من هاتفه أو جهاز الكمبيوتر وتسجيل الدخول بالبيانات التالية:</p>
    <div style="background:rgba(4,25,19,0.9);border:1px solid rgba(212,175,55,0.45);border-radius:14px;padding:16px;text-align:right;font-size:13px;line-height:1.9">
     <div>👤 <strong>اسم المستخدم للدخول:</strong> <code style="color:#fde047;font-size:15px">${esc(cleanName)}</code></div>
     ${cleanEmail !== cleanName ? `<div>📧 <strong>أو عبر المعرف:</strong> <code style="color:#fde047;font-size:14px">${esc(cleanEmail)}</code></div>` : ''}
     <div>🔑 <strong>كلمة المرور:</strong> <code style="color:#fde047;font-size:15px">${esc(f.password)}</code></div>
     <div>🛡️ <strong>الواجهة والصلاحية:</strong> <span style="color:#22c55e;font-weight:bold">${esc(roles[f.role]||f.role)}</span></div>
    </div>
    <button class="btn full" type="button" data-action="copy-text" data-id="اسم المستخدم: ${esc(cleanName)} | كلمة المرور: ${esc(f.password)}">📋 نسخ بيانات الدخول لإرسالها للمستخدم</button>
    <button class="btn ghost full" type="button" data-action="close">تم</button>
   </div>`);
   return;
  }
  if(kind==='permissions'){const overrides={};for(const [key,value]of Object.entries(f))if(key.startsWith('perm:')&&value!=='inherit')overrides[key.slice(5)]=value==='allow';await request('/users/'+id,'PUT',{role:f.role,active:f.active==='on',overrides});closeModal();await refresh();toast('تم حفظ الصلاحيات');}
  if(kind==='assign'||kind==='deliver'){await request('/orders/'+id+'/'+kind,'POST',f);if(kind==='deliver'&&sharingOrder===id)stopSharing();closeModal();await refresh();toast('تم تحديث الشحنة');}
  if(kind==='delete-account'){if(demo){closeModal();toast('حذف الحسابات الفعلية متاح عند ربط المتجر');return;}await request('/me','DELETE',f);token='';user=null;sessionStorage.removeItem('ts-token');closeModal();renderAuth();toast('تم حذف حسابك');}
 }catch(err){if(error){error.textContent=err.message;error.hidden=false;}else toast(err.message);}finally{busy=false;if(b?.isConnected)b.disabled=false;}
});


/* ========================================================
   Initial Install Permissions Request (طلب الصلاحيات عند التثبيت والفتح لأول مرة)
   ======================================================== */
function checkAndPromptInitialPermissions(){
 if(localStorage.getItem('ts-permissions-prompted')) return;
 
 setTimeout(() => {
  if(localStorage.getItem('ts-permissions-prompted')) return;
  modal('تهيئة أذونات التطبيق', `
  <div class="stack" style="text-align:center">
   <div class="vip-logo-container" style="width:68px;height:68px;margin:0 auto 10px">
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
     <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
   </div>
   <h2 style="font-size:19px;color:#ffffff;margin-bottom:6px">أذونات المتجر لتجربة متكاملة</h2>
   <p class="hint" style="color:#d1fae5;font-size:12.5px;line-height:1.7;margin-bottom:14px">
    للحصول على التنبيهات الفورية والتتبع المباشر لطلباتك، نرجو تفعيل صلاحيات التطبيق الأساسية بنقرة واحدة:
   </p>
   
   <div style="display:grid;gap:10px;text-align:right">
    <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);padding:10px 14px;border-radius:12px">
     <strong style="color:#fef08a;font-size:12.5px">🔔 إشعارات وتنبيهات الجوال:</strong>
     <small style="display:block;color:#cbd5e1;font-size:11px;margin-top:3px">لاستلام تنبيهات الطلبات والرسائل في شاشة القفل.</small>
    </div>
    <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);padding:10px 14px;border-radius:12px">
     <strong style="color:#fef08a;font-size:12.5px">📍 الموقع وخرائط Google:</strong>
     <small style="display:block;color:#cbd5e1;font-size:11px;margin-top:3px">لتحديد عنوان التوصيل وتتبع مندوب الشحن مباشرة.</small>
    </div>
    <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);padding:10px 14px;border-radius:12px">
     <strong style="color:#fef08a;font-size:12.5px">📷 الكاميرا والميكروفون:</strong>
     <small style="display:block;color:#cbd5e1;font-size:11px;margin-top:3px">لإرفاق صور الإيصالات والتسجيلات الصوتية في المحادثة.</small>
    </div>
   </div>
   
   <button class="btn full" style="margin-top:14px;background:var(--vip-gold-gradient);color:#031711;font-weight:bold" data-action="grant-all-permissions">
    ✓ تفعيل ومنح الصلاحيات الآن
   </button>
   <button class="btn ghost full" data-action="skip-permissions">
    المتابعة لاحقاً
   </button>
  </div>
  `);
 }, 1500);
}

// طلب الصلاحيات فور تثبيت التطبيق كـ PWA على الهاتف
window.addEventListener('appinstalled', () => {
 localStorage.removeItem('ts-permissions-prompted');
 checkAndPromptInitialPermissions();
});

async function init(){
 reportDeviceInstallTelemetry();
 checkAndPromptInitialPermissions();
 if('serviceWorker' in navigator && !isNativeWrapper() && (location.protocol==='https:' || ['localhost','127.0.0.1'].includes(location.hostname))){
  
  navigator.serviceWorker.register('sw.js').then(reg => {
   // فحص التحديثات البرمجية الجديدة للمتجر تلقائياً في الخلفية
   setInterval(() => { reg.update().catch(()=>{}); }, 45000);
  }).catch(()=>{});

 }
 try{config=await(await fetch('config.json')).json();try{const mc=await fetch((config.apiBaseUrl||(!isNativeWrapper()?location.origin:''))+'/api/maps-config');if(mc.ok){const mData=await mc.json();if(mData.mapApiKey)config.mapApiKey=mData.mapApiKey;if(mData.mapTileUrl)config.mapTileUrl=mData.mapTileUrl;}}catch(e){}apiBase=apiBase||config.apiBaseUrl||(!isNativeWrapper()?location.origin:'');
  await refreshGovernance();await refreshCommerce();await refreshDesigns();await refreshAppearance();await refreshBanners();
  if(new URLSearchParams(location.search).get('demo')==='1'){demo=true;sessionStorage.setItem('ts-demo','true');}
  if(demo){const id=sessionStorage.getItem('ts-demo-user');const u=demoData().users.find(u=>u.id===id&&u.active);if(u){user=demoUser(u);await refresh();}else renderAuth();}
  else if(!apiBase){renderAuth();}else if(token){try{user=await request('/me');await refresh();}catch{user=null;renderAuth();}}
  else{setupNeeded=(await request('/setup')).required;renderAuth();}
 }catch(err){renderAuth();}
}
init();


// دعم السحب السلس يميناً ويساراً لشريط الخيارات السفلي
document.addEventListener('DOMContentLoaded', () => {
 let isDown = false, startX, scrollLeft;
 document.addEventListener('mousedown', e => {
  const slider = e.target.closest('.mobile-nav');
  if(!slider) return;
  isDown = true;
  startX = e.pageX - slider.offsetLeft;
  scrollLeft = slider.scrollLeft;
 });
 document.addEventListener('mouseleave', () => { isDown = false; });
 document.addEventListener('mouseup', () => { isDown = false; });
 document.addEventListener('mousemove', e => {
  if(!isDown) return;
  const slider = e.target.closest('.mobile-nav');
  if(!slider) return;
  e.preventDefault();
  const x = e.pageX - slider.offsetLeft;
  const walk = (x - startX) * 1.8;
  slider.scrollLeft = scrollLeft - walk;
 });
});


/* ========================================================
   WhatsApp-Style Live Support Chat System
   ======================================================== */
let supportTicketsList = [];
let activeTicketId = null;
let supportLookupResult = null;
let supportPollTimer = null;

function supportHome(){
 const isAdmin = user.role === 'Admin';
 const isStaff = isAdmin || user.role === 'Support' || has('support.manage');
 const canCreate = !isStaff || isAdmin;
 return `
 <div class="section-head">
  <div>
   <h1>💬 الدعم الفني المباشر (دردشة فورية)</h1>
   <p>${isAdmin ? 'متابعة جميع محادثات العملاء والتجار والمناديب مع موظفي الدعم الفني والرد باسم الإدارة' : isStaff ? 'محادثاتك المباشرة مع العملاء والتجار والمناديب — المحادثات المفتوحة مع موظف آخر مخفية عنك تلقائياً إلا برقم البلاغ السابق' : 'تواصل مباشر وفوري مع أول موظف دعم فني متصل بنفس تجربة واتساب'}</p>
  </div>
  <div class="inline" style="gap:8px">
   ${canCreate ? `<button class="btn" type="button" data-action="open-new-ticket">➕ محادثة دعم فني جديدة</button>` : ''}
   <button class="btn secondary" type="button" data-action="refresh-support">🔄 تحديث المحادثات</button>
  </div>
 </div>

 <div class="wa-shell">
  <aside class="wa-sidebar">
   <div class="wa-sidebar-head">
    <div style="display:flex;justify-content:space-between;align-items:center">
     <strong style="color:#fef08a;font-size:14px">${isAdmin ? '📋 جميع المحادثات الجارية' : isStaff ? '🎧 محادثاتي والبلاغات' : '💬 محادثاتي مع الدعم'}</strong>
     <span id="wa-tickets-count" class="badge Ready">0</span>
    </div>
    ${isStaff ? `
    <form data-form="ticket-lookup" style="display:flex;gap:6px">
     <input name="number" type="text" placeholder="🔍 رقم البلاغ السابق (مثال: SUP-1001)" style="flex:1;padding:7px 10px;border-radius:10px;border:1px solid rgba(212,175,55,0.35);background:#031711;color:#fff;font-size:12px" dir="auto">
     <button class="btn small" type="submit">بحث</button>
    </form>` : ''}
   </div>
   <div id="wa-chat-list" class="wa-chat-list">
    <p class="hint" style="padding:14px;text-align:center">جاري تحميل المحادثات...</p>
   </div>
  </aside>

  <section class="wa-main" id="wa-main-pane">
   <div class="wa-messages" style="justify-content:center;align-items:center;text-align:center">
    <div style="color:#94a3b8;font-size:14px">
     <div style="font-size:40px;margin-bottom:8px">💬</div>
     <p>اختر محادثة من القائمة أو ابدأ محادثة دعم فني جديدة</p>
    </div>
   </div>
  </section>
 </div>`;
}

function getAllVisibleSupportTickets(){
 const merged = [...supportTicketsList];
 if(supportLookupResult && !merged.some(t => t.id === supportLookupResult.id)){
  merged.unshift({ ...supportLookupResult, _fromLookup: true });
 }
 return merged;
}

function renderSupportChatList(){
 const listEl = document.getElementById('wa-chat-list');
 const cntEl = document.getElementById('wa-tickets-count');
 if(!listEl) return;
 const items = getAllVisibleSupportTickets();
 if(cntEl) cntEl.textContent = String(items.length);
 if(!items.length){
  listEl.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12.5px">لا توجد محادثات حالياً.<br>اضغط على "محادثة دعم فني جديدة" للبدء.</div>`;
  return;
 }
 const statusMap = { Open: 'بانتظار موظف', InProgress: 'جاري المحادثة', Closed: 'مغلقة' };
 listEl.innerHTML = items.map(t => {
  const msgs = t.messages || [];
  const last = msgs[msgs.length - 1];
  const isActive = t.id === activeTicketId;
  const num = t.ticketNumber || ('SUP-' + String(t.id||'').slice(0,4).toUpperCase());
  const roleLbl = roles[t.userRole] || t.userRole || 'مستخدم';
  return `
  <button type="button" class="wa-chat-item ${isActive?'active':''}" data-action="select-ticket" data-id="${esc(t.id)}">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px">
    <strong style="color:#fef08a;font-size:12.5px">#${esc(num)} · ${esc(t.name)}</strong>
    <span class="badge ${t.status==='Closed'?'Cancelled':'Ready'}" style="font-size:10px">${statusMap[t.status]||t.status}</span>
   </div>
   <div style="font-size:12px;color:#fff;font-weight:600;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
    ${t._fromLookup ? '🔎 [بلاغ سابق] ' : ''}${esc(t.subject)}
   </div>
   <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;gap:6px">
    <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last ? esc(last.name + ': ' + last.message) : esc(roleLbl)}</span>
    <span>${t.assignedSupportName ? '🎧 '+esc(t.assignedSupportName) : '⏳'}</span>
   </div>
  </button>`;
 }).join('');
}

function renderSupportMainPane(preserveInput=false){
 const pane = document.getElementById('wa-main-pane');
 if(!pane) return;
 const items = getAllVisibleSupportTickets();
 const t = items.find(x => x.id === activeTicketId) || items[0];
 if(!t){
  pane.innerHTML = `<div class="wa-messages" style="justify-content:center;align-items:center;text-align:center"><div style="color:#94a3b8;font-size:14px"><div style="font-size:40px;margin-bottom:8px">💬</div><p>ابدأ محادثة جديدة مع الدعم الفني الآن</p></div></div>`;
  return;
 }
 activeTicketId = t.id;
 const isAdmin = user.role === 'Admin';
 const isStaff = isAdmin || user.role === 'Support' || has('support.manage');
 const num = t.ticketNumber || ('SUP-' + String(t.id||'').slice(0,4).toUpperCase());
 const roleLbl = roles[t.userRole] || t.userRole || 'مستخدم';

 const existingInput = preserveInput ? pane.querySelector('input[name="message"]') : null;
 const draftVal = existingInput ? existingInput.value : '';
 const wasFocused = existingInput && document.activeElement === existingInput;

 const msgsHtml = (t.messages || []).map(m => {
  const sRole = m.senderRole || 'User';
  if(sRole === 'System' || m.userId === 'system'){
   return `<div class="wa-bubble-row sys"><div class="wa-sys-pill">${esc(m.message)}</div></div>`;
  }
  const isMine = m.userId === user.id || (isAdmin && sRole === 'Admin');
  const isAdminMsg = sRole === 'Admin' || m.name === 'الإدارة';
  const senderLabel = isAdminMsg ? '👑 الإدارة' : (sRole === 'Support' ? `🎧 الدعم الفني: ${esc(m.name)}` : `👤 ${esc(m.name)}`);
  const timeStr = m.at ? new Date(m.at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '';
  return `
  <div class="wa-bubble-row ${isMine?'mine':'theirs'} ${isAdminMsg?'admin-msg':''}">
   <div class="wa-bubble">
    <div class="wa-sender">${senderLabel}</div>
    <div>${esc(m.message)}</div>
    <div class="wa-meta"><span>${timeStr}</span><span>✓✓</span></div>
   </div>
  </div>`;
 }).join('') || `<div class="wa-bubble-row sys"><div class="wa-sys-pill">بدأت المحادثة حول: ${esc(t.subject)}</div></div>`;

 if(preserveInput && document.getElementById('wa-messages-feed') && document.getElementById('wa-messages-feed').dataset.ticketId === t.id){
  const feed = document.getElementById('wa-messages-feed');
  const atBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 60;
  feed.innerHTML = msgsHtml;
  if(atBottom) feed.scrollTop = feed.scrollHeight;
  return;
 }

 pane.innerHTML = `
  <div class="wa-header">
   <div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
     <strong style="color:#fff;font-size:14.5px">#${esc(num)} · ${esc(t.name)}</strong>
     <span class="badge" style="background:rgba(212,175,55,0.18);color:#fef08a;font-size:10.5px">${esc(roleLbl)}</span>
     <span class="badge ${t.status==='Closed'?'Cancelled':'Ready'}" style="font-size:10.5px">${t.status==='Closed'?'مغلقة':t.assignedSupportName?'🎧 '+esc(t.assignedSupportName):'⏳ بانتظار موظف متصل'}</span>
    </div>
    <div style="font-size:12px;color:#cbd5e1;margin-top:3px">المشكلة: <b style="color:#fde047">${esc(t.subject)}</b></div>
   </div>
   ${isStaff ? `
   <div class="inline" style="gap:6px">
    <button class="btn small ${t.status==='Closed'?'':'danger'}" type="button" data-action="toggle-ticket-status" data-id="${esc(t.id)}" data-status="${t.status==='Closed'?'Open':'Closed'}">
     ${t.status==='Closed'?'🔓 إعادة فتح':'🔒 إغلاق البلاغ'}
    </button>
   </div>` : ''}
  </div>
  <div id="wa-messages-feed" class="wa-messages" data-ticket-id="${esc(t.id)}">
   ${msgsHtml}
  </div>
  ${t.status === 'Closed' ? `
  <div style="padding:12px;text-align:center;background:#111b21;color:#94a3b8;font-size:12.5px;border-top:1px solid rgba(255,255,255,0.08)">
   🔒 تم إغلاق هذا البلاغ. يمكنك فتح محادثة جديدة أو إعادة فتحه من الإدارة.
  </div>` : `
  <form class="wa-composer" data-form="support-reply" data-id="${esc(t.id)}">
   <input name="message" type="text" maxlength="2000" required autocomplete="off" placeholder="${isAdmin ? 'اكتب رسالتك باسم الإدارة هنا...' : 'اكتب رسالتك للدعم الفني هنا...'}" value="${esc(draftVal)}">
   <button class="btn" type="submit" style="border-radius:22px;padding:10px 18px">➤ إرسال</button>
  </form>`}`;

 const feed = document.getElementById('wa-messages-feed');
 if(feed) feed.scrollTop = feed.scrollHeight;
 if(wasFocused){
  const ni = pane.querySelector('input[name="message"]');
  if(ni){ ni.focus(); ni.setSelectionRange(ni.value.length, ni.value.length); }
 }
}

async function loadSupportTickets(preserveInput=true){
 try {
  if(!apiBase){
   const d = demoData();
   const isAdmin = user.role === 'Admin';
   const isStaff = isAdmin || user.role === 'Support';
   supportTicketsList = (d.tickets || []).filter(t => isAdmin ? true : isStaff ? (!t.assignedSupportId || t.assignedSupportId === user.id) : t.userId === user.id);
  } else {
   supportTicketsList = await request('/tickets');
  }
  if(!activeTicketId && supportTicketsList.length > 0) activeTicketId = supportTicketsList[0].id;
  renderSupportChatList();
  renderSupportMainPane(preserveInput);
 } catch(e){}
}

function afterSupportRender(){
 loadSupportTickets(false);
 if(supportPollTimer) clearInterval(supportPollTimer);
 supportPollTimer = setInterval(() => {
  const onSupport = page === 'support' || (page === 'home' && user?.role === 'Support');
  if(!onSupport){ clearInterval(supportPollTimer); supportPollTimer = null; return; }
  loadSupportTickets(true);
 }, 3500);
}
