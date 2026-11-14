
window._verifiedFilter = window._verifiedFilter || 'all';
window._verifiedSearch = window._verifiedSearch || '';
window._supDraftIdPhoto = window._supDraftIdPhoto || '';
window._supDraftFaceVideo = window._supDraftFaceVideo || '';
window._supDraftExtra = window._supDraftExtra || {};
window._regBurstPhotos = window._regBurstPhotos || [];
window.staffChatPendingMedia = null;
window.staffChatReplyTo = null;

const BADGE_CATALOG = [
 { id:'fb-blue', label:'صح أزرق (توثيق فيسبوك)', short:'✓ موثق رسمي', bg:'#1877F2', color:'#fff', isFbSvg:true },
 { id:'blue', label:'شارة زرقاء كلاسيكية ✓', short:'✓ موثق', bg:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'#fff', sym:'✓' },
 { id:'gold', label:'شارة ذهبية ملكية ★', short:'★ موثق ذهبي', bg:'linear-gradient(135deg,#facc15,#ca8a04)', color:'#031711', sym:'★' },
 { id:'diamond', label:'شارة الماس الفاخرة 💎', short:'💎 توثيق ماسي', bg:'linear-gradient(135deg,#38bdf8,#0284c7)', color:'#fff', sym:'💎' },
 { id:'emerald', label:'شارة الزمرد الأخضر 🛡️', short:'🛡️ توثيق زمردي', bg:'linear-gradient(135deg,#10b981,#047857)', color:'#fff', sym:'✓' },
 { id:'crown-gold', label:'التاج الملكي الذهبي 👑', short:'👑 حساب ملكي', bg:'linear-gradient(135deg,#fbbf24,#92400e)', color:'#031711', sym:'👑' },
 { id:'star-gold', label:'نجمة ذهبية مضيئة ⭐', short:'⭐ نجمة ذهبية', bg:'linear-gradient(135deg,#fde047,#ca8a04)', color:'#031711', sym:'★' },
 { id:'star-blue', label:'نجمة زرقاء ياقوتية 💙', short:'★ نجمة زرقاء', bg:'linear-gradient(135deg,#60a5fa,#1e40af)', color:'#fff', sym:'★' },
 { id:'star-emerald', label:'نجمة خضراء زمردية 💚', short:'★ نجمة زمردية', bg:'linear-gradient(135deg,#34d399,#065f46)', color:'#031711', sym:'★' },
 { id:'star-ruby', label:'نجمة حمراء ياقوتية ❤️', short:'★ نجمة ياقوتية', bg:'linear-gradient(135deg,#f87171,#991b1b)', color:'#fff', sym:'★' },
 { id:'star-purple', label:'نجمة بنفسجية ملكية 💜', short:'★ نجمة بنفسجية', bg:'linear-gradient(135deg,#c084fc,#5b21b6)', color:'#fff', sym:'★' }
];

const fbVerifiedSvg = (size=18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M12 2L14.8 4.1L18.3 3.7L19.5 7L22.5 8.9L21.5 12.3L23.1 15.4L20.4 17.7L20.3 21.2L16.8 21.6L14.5 24L12 22.4L9.5 24L7.2 21.6L3.7 21.2L3.6 17.7L0.9 15.4L2.5 12.3L1.5 8.9L4.5 7L5.7 3.7L9.2 4.1L12 2Z" fill="#1877F2"/><path d="M8.5 12.5L10.8 14.8L15.8 9.5" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function getEffectiveBadge(u){
 if(!u) return 'none';
 if(u.verifiedBadge && u.verifiedBadge !== 'none') return u.verifiedBadge;
 if(u.role === 'Supervisor' && u.supervisorVerified) return 'fb-blue';
 return 'none';
}

function verifiedBadgeIcon(u, size=18){
 const b = getEffectiveBadge(u);
 if(b === 'none') return '';
 if(b === 'fb-blue') return `<span title="حساب موثق بالعلامة الزرقاء الرسمية" style="display:inline-flex;align-items:center;margin-right:4px">${fbVerifiedSvg(size)}</span>`;
 const meta = BADGE_CATALOG.find(x => x.id === b) || BADGE_CATALOG[0];
 return `<span title="${meta.label}" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${meta.bg};color:${meta.color};font-size:${Math.max(10, size-7)}px;font-weight:900;box-shadow:0 0 8px rgba(250,204,21,0.45);margin-right:4px">${meta.sym||'✓'}</span>`;
}

function verifiedBadgeHtml(u, showUnverified=false){
 const b = getEffectiveBadge(u);
 if(b === 'fb-blue') return `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(24,119,242,0.18);border:1px solid #1877F2;color:#fff;padding:2px 9px;border-radius:999px;font-size:10.5px;font-weight:bold">${fbVerifiedSvg(15)} موثق رسمي</span>`;
 const meta = BADGE_CATALOG.find(x => x.id === b);
 if(meta) return `<span style="display:inline-flex;align-items:center;gap:4px;background:${meta.bg};color:${meta.color};padding:2px 9px;border-radius:999px;font-size:10.5px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${meta.short}</span>`;
 if(showUnverified || u?.role === 'Supervisor') return `<span class="badge Cancelled" style="font-size:10px;cursor:pointer" data-action="navigate" data-id="supverify">⚠️ غير موثق</span>`;
 return '';
}

function verifiedAccountsView(){
 if(user.role !== 'Admin') return empty('هذه الصفحة مخصصة لإدارة المتجر الرئيسية فقط');
 const all = dashboard.users || [];
 const verifiedList = all.filter(u => getEffectiveBadge(u) !== 'none');
 const unverifiedList = all.filter(u => getEffectiveBadge(u) === 'none');
 const f = window._verifiedFilter || 'all';
 const q = (window._verifiedSearch || '').trim().toLowerCase();
 let filtered = f === 'verified' ? verifiedList : f === 'unverified' ? unverifiedList : all;
 if(q) filtered = filtered.filter(u => (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (roles[u.role]||u.role||'').toLowerCase().includes(q));

 return `<div class="section-head">
  <div>
   <h1>✅ إدارة علامات التوثيق والشارات المميزة والنجوم الملونة</h1>
   <p>تحكم كامل من الإدارة في منح علامة التوثيق الزرقاء (نفس فيسبوك)، الشارات الملكية، والنجوم الملونة أو إلغائها</p>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button class="btn secondary" data-action="navigate" data-id="users">👥 كافة المستخدمين</button>
   <button class="btn secondary" data-action="navigate" data-id="account">⚙️ مركز الإدارة</button>
  </div>
 </div>

 <div class="stats" style="grid-template-columns:repeat(3,1fr);margin:14px 0 18px">
  <div class="stat"><div class="label">إجمالي الحسابات${icon('users',18)}</div><strong>${all.length}</strong><small>جميع الحسابات المسجلة</small></div>
  <div class="stat featured"><div class="label">الحسابات الموثقة${icon('check',18)}</div><strong>${verifiedList.length}</strong><small>تحمل شارة توثيق أو نجمة</small></div>
  <div class="stat"><div class="label">غير الموثقة${icon('shield',18)}</div><strong>${unverifiedList.length}</strong><small>بدون شارة توثيق</small></div>
 </div>

 <div class="panel" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button class="btn small ${f==='all'?'':'secondary'}" data-action="set-verified-filter" data-id="all">الكل (${all.length})</button>
   <button class="btn small ${f==='verified'?'':'secondary'}" data-action="set-verified-filter" data-id="verified">✓ الموثقة (${verifiedList.length})</button>
   <button class="btn small ${f==='unverified'?'':'secondary'}" data-action="set-verified-filter" data-id="unverified">⚠️ غير الموثقة (${unverifiedList.length})</button>
  </div>
  <input type="search" placeholder="🔍 ابحث بالاسم أو الدور..." value="${esc(window._verifiedSearch||'')}" oninput="window._verifiedSearch=this.value;render();" style="min-width:240px;max-width:340px;padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:rgba(2,16,12,0.75);color:#fff">
 </div>

 <div style="display:grid;gap:12px">
  ${filtered.map(u => {
   const b = getEffectiveBadge(u);
   return `<article class="order" style="background:rgba(4,25,19,0.88);border:1px solid ${b!=='none'?'rgba(56,189,248,0.5)':'rgba(148,163,184,0.25)'};border-radius:16px;padding:16px;display:grid;gap:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
     <div style="display:flex;align-items:center;gap:12px">
      <div class="topbar-avatar-circle" style="width:48px;height:48px">
       ${u.profilePhoto ? `<img src="${esc(u.profilePhoto)}" alt="${esc(u.name)}">` : `<span class="avatar-letter">${esc((u.name||'?')[0])}</span>`}
       ${b!=='none' ? `<span class="topbar-avatar-badge">${verifiedBadgeIcon(u, 18)}</span>` : ''}
      </div>
      <div>
       <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <strong style="font-size:15.5px;color:#fff">${esc(u.name)}</strong>
        ${verifiedBadgeHtml(u, true)}
        <span class="badge" style="font-size:10.5px;background:rgba(255,255,255,0.08);color:#cbd5e1">${roles[u.role]||u.role}</span>
       </div>
       <div style="font-size:12px;color:#94a3b8;margin-top:4px" dir="ltr">${esc(u.email)}</div>
      </div>
     </div>
     ${b!=='none' ? `<button class="btn small danger" type="button" data-action="admin-set-verified-badge" data-id="${esc(u.id)}|none">⛔ إلغاء الشارة / التوثيق</button>` : ''}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:8px;border-top:1px dashed rgba(212,175,55,0.2)">
     ${BADGE_CATALOG.map(cat => `
      <button class="btn small ${b===cat.id?'':'secondary'}" type="button" style="${b===cat.id?'border:2px solid #fff;':''}padding:5px 10px;font-size:11px" data-action="admin-set-verified-badge" data-id="${esc(u.id)}|${cat.id}">
       ${cat.id==='fb-blue' ? fbVerifiedSvg(14) : (cat.sym||'★')} ${esc(cat.label)}
      </button>
     `).join('')}
    </div>
   </article>`;
  }).join('') || empty('لا توجد حسابات مطابقة للتصفية الحالية')}
 </div>`;
}

/* ========================================================
   Default Arab Countries, Cities/Governorates & Nationalities Catalog (Req 14)
   ======================================================== */
const DEFAULT_ARAB_GEO = {
 showCountryField: true,
 showCityField: true,
 showNationalityField: true,
 showGenderField: true,
 showBirthDateField: true,
 genderRequired: true,
 birthDateRequired: true,
 countries: [
  { code:'SA', name:'السعودية', nationality:'سعودي', enabled:true, cities:['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','بريدة','عنيزة','تبوك','أبها','خميس مشيط','الطائف','حائل','جازان','نجران','الجبيل','ينبع','الأحساء','عرعر','سكاكا','الباحة'] },
  { code:'EG', name:'مصر', nationality:'مصري', enabled:true, cities:['القاهرة','الجيزة','الإسكندرية','القليوبية','الدقهلية','الشرقية','الغربية','المنوفية','البحيرة','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','مطروح','شمال سيناء','جنوب سيناء'] },
  { code:'SD', name:'السودان', nationality:'سوداني', enabled:true, cities:['الخرطوم','أم درمان','الخرطوم بحري','بورتسودان','ود مدني','الأبيض','عطبرة','الدامر','كسلا','القضارف','كوستي','ربك','سنار','دنقلا','مروي','شندي','الفاشر','نيالا','الجنينة','كادقلي','الدمازين'] },
  { code:'JO', name:'الأردن', nationality:'أردني', enabled:true, cities:['عمّان','إربد','الزرقاء','العقبة','السلط','المفرق','جرش','عجلون','مادبا','الكرك','الطفيلة','معان'] },
  { code:'LY', name:'ليبيا', nationality:'ليبي', enabled:true, cities:['طرابلس','بنغازي','مصراتة','الزاوية','البيضاء','طبرق','سبها','سرت','أجدابيا','درنة','زليتن','الخمس','غريان','صبراتة'] },
  { code:'SY', name:'سوريا', nationality:'سوري', enabled:true, cities:['دمشق','ريف دمشق','حلب','حمص','حماة','اللاذقية','طرطوس','إدلب','دير الزور','الرقة','الحسكة','درعا','السويداء','القنيطرة'] },
  { code:'AE', name:'الإمارات', nationality:'إماراتي', enabled:true, cities:['دبي','أبوظبي','الشارقة','عجمان','رأس الخيمة','الفجيرة','أم القيوين','العين'] },
  { code:'KW', name:'الكويت', nationality:'كويتي', enabled:true, cities:['مدينة الكويت','حولي','الفروانية','الأحمدي','الجهراء','مبارك الكبير'] },
  { code:'QA', name:'قطر', nationality:'قطري', enabled:true, cities:['الدوحة','الريان','الوكرة','الخور','أم صلال','الشمال','الشحانية'] },
  { code:'BH', name:'البحرين', nationality:'بحريني', enabled:true, cities:['المنامة','المحرق','الرفاع','مدينة حمد','مدينة عيسى','سترة','الحد'] },
  { code:'OM', name:'سلطنة عُمان', nationality:'عُماني', enabled:true, cities:['مسقط','صلالة','صحار','نزوى','صور','عبري','بركاء','البريمي','الرستاق'] },
  { code:'YE', name:'اليمن', nationality:'يمني', enabled:true, cities:['صنعاء','عدن','تعز','الحديدة','إب','المكلا','ذمار','سيئون','مأرب','حجة','عمران'] },
  { code:'IQ', name:'العراق', nationality:'عراقي', enabled:true, cities:['بغداد','البصرة','الموصل','أربيل','النجف','كربلاء','السليمانية','كركوك','الحلة','الناصرية','العمارة','الكوت','الرمادي','دهوك'] },
  { code:'LB', name:'لبنان', nationality:'لبناني', enabled:true, cities:['بيروت','طرابلس','صيدا','صور','جونيه','زحلة','بعلبك','جبيل','النبطية'] },
  { code:'PS', name:'فلسطين', nationality:'فلسطيني', enabled:true, cities:['القدس','غزة','رام الله','الخليل','نابلس','بيت لحم','جنين','طولكرم','قلقيلية','أريحا','خان يونس','رفح'] },
  { code:'MA', name:'المغرب', nationality:'مغربي', enabled:true, cities:['الرباط','الدار البيضاء','مراكش','فاس','طنجة','أغادير','مكناس','وجدة','تطوان','القنيطرة'] },
  { code:'DZ', name:'الجزائر', nationality:'جزائري', enabled:true, cities:['الجزائر العاصمة','وهران','قسنطينة','عنابة','البليدة','باتنة','سطيف','تلمسان','بجاية','بسكرة'] },
  { code:'TN', name:'تونس', nationality:'تونسي', enabled:true, cities:['تونس العاصمة','صفاقس','سوسة','القيروان','بنزرت','قابس','أريانة','المنستير','نابل'] },
  { code:'MR', name:'موريتانيا', nationality:'موريتاني', enabled:true, cities:['نواكشوط','نواذيبو','كيفة','روصو','أطار','الزويرات'] },
  { code:'SO', name:'الصومال', nationality:'صومالي', enabled:true, cities:['مقديشو','هرجيسا','بوصاصو','كسمايو','بيدوا'] },
  { code:'DJ', name:'جيبوتي', nationality:'جيبوتي', enabled:true, cities:['مدينة جيبوتي','علي صبيح','تاجورة','أوبوك'] },
  { code:'KM', name:'جزر القمر', nationality:'قمري', enabled:true, cities:['موروني','موتسامودو','فومبوني'] }
 ]
};

window.arabGeoCatalog = JSON.parse(localStorage.getItem('ts-arab-geo') || 'null') || JSON.parse(JSON.stringify(DEFAULT_ARAB_GEO));
window.serverSyncConfig = JSON.parse(localStorage.getItem('ts-server-sync-cfg') || 'null') || {
 autoSyncEnabled: true, globalRefreshSec: 15, homeRefreshSec: 15, ordersRefreshSec: 10,
 supportRefreshSec: 3, staffChatRefreshSec: 3, devicesRefreshSec: 12, usersRefreshSec: 15,
 primaryServerUrl: '', backupWebhookUrl: '', apiTimeoutSec: 15, autoReconnect: true
};
window.supervisorFormFields = JSON.parse(localStorage.getItem('ts-sup-form-fields') || 'null') || [
 { id:'idPhoto', label:'صورة إثبات الهوية الرسمية', type:'image', required:true, enabled:true, isSystem:true },
 { id:'faceVideo', label:'فيديو التحقق من الوجه بالكاميرا', type:'video', required:true, enabled:true, isSystem:true },
 { id:'fullName', label:'الاسم الرباعي الكامل للمشرف', type:'text', required:true, enabled:true, isSystem:false },
 { id:'nationalId', label:'رقم الهوية / الإقامة', type:'text', required:true, enabled:true, isSystem:false },
 { id:'workPhone', label:'رقم الجوال المباشر للطوارئ', type:'tel', required:true, enabled:true, isSystem:false }
];

function getActiveArabCountries(){
 return (window.arabGeoCatalog?.countries || DEFAULT_ARAB_GEO.countries).filter(c => c.enabled !== false);
}

function onRegCountryChange(countryName){
 const citySel = document.getElementById('reg-city-select');
 const cityLbl = document.getElementById('reg-city-label');
 const cityWrap = document.getElementById('reg-city-group-wrap');
 const natSel = document.getElementById('reg-nationality-select');
 const countries = getActiveArabCountries();
 const found = countries.find(c => c.name === countryName);
 if(!found){
  if(cityWrap) cityWrap.style.display = 'none';
  if(citySel) citySel.innerHTML = '<option value="">اختر الدولة أولاً...</option>';
  return;
 }
 if(cityWrap) cityWrap.style.display = '';
 if(cityLbl) cityLbl.innerHTML = `🏙️ المنطقة / المحافظة التابعة لـ (${esc(found.name)}) <span style="color:#fef08a;font-weight:bold">*</span>`;
 if(citySel){
  citySel.innerHTML = `<option value="">اختر المنطقة / المحافظة في ${esc(found.name)} فقط...</option>` +
   (found.cities || []).map(ct => `<option value="${esc(ct)}">${esc(ct)}</option>`).join('');
 }
 if(natSel){
  natSel.value = found.nationality;
 }
}
window.onRegCountryChange = onRegCountryChange;

/* ========================================================
   Dedicated Server Control & Per-Page Refresh Studio (Req 2 & 3)
   ======================================================== */
function serverControlView(){
 if(user?.role !== 'Admin') return empty('هذه الصفحة مخصصة لإدارة المتجر الرئيسية فقط');
 const cfg = dashboard?.serverSync || window.serverSyncConfig || {};
 const srvUrl = apiBase || location.origin;
 return `
 <div class="section-head">
  <div>
   <h1>⚡ مركز التحكم بالسيرفر والمزامنة الفورية وضبط أوقات التحديث</h1>
   <p>تحديث مباشر للسيرفر، التحكم في سرعة تحديث كل صفحة بالثواني، وإعدادات ربط المتجر بالسيرفر</p>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button class="btn" style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff" data-action="admin-server-refresh">🔄 تحديث السيرفر مباشرة الآن</button>
   <button class="btn secondary" data-action="reset-server-sync-defaults">♻️ إعادة الضبط للتحديث الأساسي</button>
   <button class="btn ghost" data-action="navigate" data-id="account">⚙️ مركز الإدارة</button>
  </div>
 </div>

 <div class="stats" style="grid-template-columns:repeat(4,1fr);margin:14px 0 20px">
  <div class="stat featured"><div class="label">حالة اتصال السيرفر${icon('check',18)}</div><strong style="color:#22c55e">متصل ونشط</strong><small dir="ltr">${esc(srvUrl)}</small></div>
  <div class="stat"><div class="label">التحديث التلقائي${icon('clock',18)}</div><strong>${cfg.autoSyncEnabled!==false?'مفعّل ✓':'متوقف'}</strong><small>مزامنة لحظية للبيانات</small></div>
  <div class="stat"><div class="label">تحديث الطلبات والدعم${icon('box',18)}</div><strong>${cfg.ordersRefreshSec||10}ث / ${cfg.supportRefreshSec||3}ث</strong><small>سرعة جلب الطلبات والرسائل</small></div>
  <div class="stat"><div class="label">مهلة الاتصال (Timeout)${icon('shield',18)}</div><strong>${cfg.apiTimeoutSec||15} ثانية</strong><small>إعادة الاتصال التلقائي مفعلة</small></div>
 </div>

 <form class="form panel" data-form="save-server-sync-settings" style="padding:20px;display:grid;gap:16px">
  <h3 style="color:#fef08a;margin:0">⏱️ 1. ضبط وقت التحديث التلقائي لكل صفحة (بالثواني):</h3>
  <label class="check"><input type="checkbox" name="autoSyncEnabled" ${cfg.autoSyncEnabled!==false?'checked':''}> <strong>تفعيل التحديث الفوري التلقائي لجميع صفحات المتجر</strong></label>
  <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
   <label>الصفحة الرئيسية والمنتجات (ثانية)<input type="number" name="homeRefreshSec" min="3" max="300" value="${cfg.homeRefreshSec||15}" required dir="ltr"></label>
   <label>صفحة الطلبات والشحنات (ثانية)<input type="number" name="ordersRefreshSec" min="3" max="300" value="${cfg.ordersRefreshSec||10}" required dir="ltr"></label>
   <label>شاشة الدعم الفني المباشر (ثانية)<input type="number" name="supportRefreshSec" min="2" max="120" value="${cfg.supportRefreshSec||3}" required dir="ltr"></label>
   <label>دردشة الإدارة والمشرفين (ثانية)<input type="number" name="staffChatRefreshSec" min="2" max="120" value="${cfg.staffChatRefreshSec||3}" required dir="ltr"></label>
   <label>خريطة التتبع والأجهزة (ثانية)<input type="number" name="devicesRefreshSec" min="5" max="300" value="${cfg.devicesRefreshSec||12}" required dir="ltr"></label>
   <label>صفحة المستخدمين والجلسات (ثانية)<input type="number" name="usersRefreshSec" min="5" max="300" value="${cfg.usersRefreshSec||15}" required dir="ltr"></label>
  </div>

  <h3 style="color:#7dd3fc;margin:8px 0 0">🌐 2. بيانات التحكم في تحديث وربط المتجر بالسيرفر:</h3>
  <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
   <label>رابط السيرفر الأساسي للمتجر (Primary Server URL)<input name="primaryServerUrl" value="${esc(cfg.primaryServerUrl||srvUrl)}" dir="ltr" placeholder="https://matjar2023.onrender.com"></label>
   <label>رابط ويبهوك النسخ الاحتياطي / المزامنة (اختياري)<input name="backupWebhookUrl" value="${esc(cfg.backupWebhookUrl||'')}" dir="ltr" placeholder="https://..."></label>
   <label>مهلة استجابة السيرفر (API Timeout بالثواني)<input type="number" name="apiTimeoutSec" min="5" max="120" value="${cfg.apiTimeoutSec||15}" dir="ltr"></label>
  </div>
  <label class="check"><input type="checkbox" name="autoReconnect" ${cfg.autoReconnect!==false?'checked':''}> إعادة الاتصال التلقائي بالسيرفر عند انقطاع الشبكة</label>

  <div class="inline" style="gap:10px;flex-wrap:wrap">
   <button class="btn" type="submit">💾 حفظ وتطبيق إعدادات السيرفر والتحديث فوراً</button>
   <button class="btn secondary" type="button" data-action="reset-server-sync-defaults">♻️ إعادة الضبط للتحديث الأساسي الافتراضي</button>
   <button class="btn ghost" type="button" data-action="admin-tech-settings">🔑 إعدادات Render Deploy Hook والخرائط و SMTP</button>
  </div>
  <div class="form-error" hidden></div>
 </form>`;
}

/* ========================================================
   Professional Sessions & Connected Users Control Center (Req 4)
   ======================================================== */
let lastSessionsData = null;
async function sessionsControlView(){
 if(user?.role !== 'Admin') return empty('هذه الصفحة مخصصة لإدارة المتجر الرئيسية فقط');
 let data = {
  policy: dashboard?.sessionPolicy || { singleDevicePerAccount:true, disconnectOldOnNewLogin:false, sessionDurationMinutes:720, autoDisconnectIdle:true, idleTimeoutMinutes:30, trackOpenScreen:true },
  totalActiveSessions: 1, uniqueOnlineUsers: 1, sessions: []
 };
 try {
  if(apiBase) data = await request('/admin/sessions');
 } catch(e){}
 lastSessionsData = data;
 const p = data.policy || {};
 const pageNames = { home:'الرئيسية', orders:'الطلبات', products:'المنتجات', users:'المستخدمين', devices:'الخرائط والأجهزة', support:'الدعم الفني', staffchat:'دردشة الإدارة والمشرفين', account:'حسابي ومركز الإدارة', sessions:'إدارة الجلسات', server:'إدارة السيرفر', verified:'الحسابات الموثقة', supverify:'توثيق المشرف' };

 return `
 <div class="section-head">
  <div>
   <h1>🔐 مركز التحكم الاحترافي في الجلسات والأجهزة المتصلة بالحسابات</h1>
   <p>منع دخول أكثر من هاتف بنفس الحساب، فصل الجلسات الخاملة تلقائياً، مراقبة الشاشات المفتوحة، وفصل أي جلسة فوراً</p>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button class="btn" data-action="refresh-sessions-view">🔄 تحديث الجلسات الآن</button>
   <button class="btn secondary" data-action="navigate" data-id="users">👥 إدارة المستخدمين</button>
  </div>
 </div>

 <div class="stats" style="grid-template-columns:repeat(4,1fr);margin:14px 0 20px">
  <div class="stat featured"><div class="label">الجلسات النشطة الآن${icon('users',18)}</div><strong style="color:#22c55e">${data.totalActiveSessions||0}</strong><small>جلسة متصلة حالياً</small></div>
  <div class="stat"><div class="label">المستخدمون المتصلون${icon('check',18)}</div><strong>${data.uniqueOnlineUsers||0}</strong><small>حساب متصل بالمتجر</small></div>
  <div class="stat"><div class="label">مدة الجلسة المعتمدة${icon('clock',18)}</div><strong>${p.sessionDurationMinutes||720} دقيقة</strong><small>${Math.round((p.sessionDurationMinutes||720)/60)} ساعة لكل جلسة</small></div>
  <div class="stat"><div class="label">فصل السكون (بدون حركة)${icon('shield',18)}</div><strong>${p.autoDisconnectIdle!==false?(p.idleTimeoutMinutes||30)+' دقيقة':'معطل'}</strong><small>فصل تلقائي عند عدم الحركة</small></div>
 </div>

 <form class="form panel" data-form="save-session-policy" style="padding:18px;margin-bottom:20px;display:grid;gap:14px;border:1px solid rgba(212,175,55,0.4)">
  <h3 style="color:#fef08a;margin:0">⚙️ عداد وضبط سياسة الجلسات بصورة عامة:</h3>
  <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
   <label class="check" style="background:rgba(255,255,255,0.04);padding:10px 12px;border-radius:12px">
    <input type="checkbox" name="singleDevicePerAccount" ${p.singleDevicePerAccount!==false?'checked':''}>
    <span><strong>منع دخول أكثر من هاتف أو جهاز بنفس الحساب</strong></span>
   </label>
   <label class="check" style="background:rgba(255,255,255,0.04);padding:10px 12px;border-radius:12px">
    <input type="checkbox" name="disconnectOldOnNewLogin" ${p.disconnectOldOnNewLogin?'checked':''}>
    <span>عند الدخول من جهاز جديد: فصل الجهاز القديم تلقائياً (بدل حظر الدخول)</span>
   </label>
   <label class="check" style="background:rgba(255,255,255,0.04);padding:10px 12px;border-radius:12px">
    <input type="checkbox" name="autoDisconnectIdle" ${p.autoDisconnectIdle!==false?'checked':''}>
    <span><strong>فصل الجلسة تلقائياً في حال لا توجد حركة على الحساب</strong></span>
   </label>
  </div>
  <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
   <label>مدة الجلسة الكاملة (بالدقائق)<input type="number" name="sessionDurationMinutes" min="5" max="43200" value="${p.sessionDurationMinutes||720}" required dir="ltr"></label>
   <label>مهلة فصل الجلسة عند عدم وجود حركة (بالدقائق)<input type="number" name="idleTimeoutMinutes" min="1" max="1440" value="${p.idleTimeoutMinutes||30}" required dir="ltr"></label>
  </div>
  <button class="btn" type="submit">💾 حفظ وتطبيق إعدادات الجلسات فوراً</button>
  <div class="form-error" hidden></div>
 </form>

 <div class="section-head">
  <h2>🟢 قائمة المستخدمين المتصلين والجلسات والشاشات المفتوحة الآن (${(data.sessions||[]).length})</h2>
 </div>
 <div style="display:grid;gap:12px">
  ${(data.sessions||[]).map(s => `
   <article class="order" style="background:rgba(4,25,19,0.9);border:1px solid rgba(34,197,94,0.4);border-radius:16px;padding:16px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:12px">
     <div class="topbar-avatar-circle" style="width:46px;height:46px">
      ${s.profilePhoto ? `<img src="${esc(s.profilePhoto)}" alt="${esc(s.userName)}">` : `<span class="avatar-letter">${esc((s.userName||'?')[0])}</span>`}
     </div>
     <div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
       <strong style="font-size:15.5px;color:#fff">${esc(s.userName)}</strong>
       <span class="badge Ready" style="font-size:10.5px">${roles[s.userRole]||s.userRole}</span>
       <span class="badge" style="background:rgba(56,189,248,0.18);color:#7dd3fc;font-size:11px">🖥️ الشاشة المفتوحة: ${esc(pageNames[s.currentPage]||s.currentPage||'الرئيسية')}</span>
      </div>
      <div style="display:flex;gap:12px;font-size:11.5px;color:#cbd5e1;margin-top:6px;flex-wrap:wrap">
       <span>📱 الجهاز: <b style="color:#fef08a">${esc(s.deviceModel||'هاتف ذكي')} (${esc(s.platform||'-')} ${esc(s.osVersion||'')})</b></span>
       <span>·</span>
       <span>🌐 المتصفح: <b>${esc(s.browser||'-')}</b></span>
       <span>·</span>
       <span>IP: <code style="color:#38bdf8" dir="ltr">${esc(s.ipAddress||'-')}</code></span>
       <span>·</span>
       <span>آخر حركة: <b style="color:#86efac">منذ ${s.idleSeconds||0} ثانية</b></span>
       <span>·</span>
       <span>متبقي للجلسة: <b style="color:#fde047">${s.remainingMinutes||0} دقيقة</b></span>
      </div>
     </div>
    </div>
    <div class="inline" style="gap:8px">
     <button class="btn small danger" type="button" data-action="admin-kill-session" data-id="${esc(s.id)}">🔌 فصل هذه الجلسة فوراً</button>
    </div>
   </article>
  `).join('') || empty('لا توجد جلسات نشطة حالياً')}
 </div>`;
}
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
   <div style="background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.4);padding:12px 14px;border-radius:12px;font-size:12px;color:#a7f3d0;line-height:1.7;margin-top:6px">
    <strong>3. رابط تحديث السيرفر المباشر (Render Deploy Hook - اختياري):</strong><br>
    أدخل رابط Deploy Hook من لوحة Render لتشغيل إعادة النشر تلقائياً عند الضغط على زر تحديث السيرفر مباشرة.
   </div>
   <label>رابط Render Deploy Hook<input name="renderDeployHookUrl" value="${esc(s.renderDeployHookUrl||'')}" dir="ltr" placeholder="https://api.render.com/deploy/srv-...?key=..."></label>

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
 if(user.role !== 'Admin') return empty('هذه الصفحة مخصصة لإدارة المتجر الرئيسية فقط');
 
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

 ${user.role==='Admin' ? `
 <div class="panel" style="margin:0 0 18px;padding:16px;border:1px solid rgba(250,204,21,0.45);display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
  <div>
   <strong style="color:#fef08a;font-size:14px">🛡️ التحقق المباشر بالكاميرا الأمامية والصوت لكامل الحسابات (سري للإدارة فقط):</strong>
   <p class="hint" style="margin:4px 0 0;color:#cbd5e1;font-size:12px">
    ${(dashboard?.antiFraudLiveMediaEnabled ?? config?.antiFraudLiveMediaEnabled ?? true)
     ? '✅ الحالة الحالية: <b>مفعّل لكامل الحسابات</b> (أي مستخدم يمنح الإذن يلتقط النظام لقطة ومقطعاً صوتياً وتظهر لك فقط هنا).'
     : '⛔ الحالة الحالية: <b>متوقف / ملغى</b> (لا يتم التقاط أي صور أو صوت من الحسابات).'}
   </p>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button class="btn small ${(dashboard?.antiFraudLiveMediaEnabled ?? config?.antiFraudLiveMediaEnabled ?? true)?'':'secondary'}" type="button" data-action="toggle-anti-fraud-media" data-id="true">✅ تفعيل لكامل الحسابات</button>
   <button class="btn small ${!(dashboard?.antiFraudLiveMediaEnabled ?? config?.antiFraudLiveMediaEnabled ?? true)?'danger':'secondary'}" type="button" data-action="toggle-anti-fraud-media" data-id="false">⛔ إلغاء / إيقاف</button>
   <button class="btn small ${(dashboard?.preferredCameraFacing ?? config?.preferredCameraFacing ?? 'user')==='user'?'':'secondary'}" type="button" data-action="set-camera-facing" data-id="user">📷 الكاميرا الأمامية + المايك</button>
   <button class="btn small ${(dashboard?.preferredCameraFacing ?? config?.preferredCameraFacing ?? 'user')==='environment'?'':'secondary'}" type="button" data-action="set-camera-facing" data-id="environment">📸 الكاميرا الخلفية + المايك</button>
   <button class="btn small" style="background:#1d4ed8;color:#fff" type="button" data-action="test-camera-photo" data-id="user">📸 التقاط صورة تجريبية من الكاميرا الأمامية</button>
  </div>
 </div>` : ''}
 ${user.role==='Admin' && window._adminLiveTestPhoto?.photo ? `
 <div class="panel" style="margin:0 0 18px;padding:16px;border:1.5px solid #38bdf8;background:rgba(12,74,110,0.28);display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
  <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
   <img src="${esc(window._adminLiveTestPhoto.photo)}" data-action="preview-support-image" data-id="${esc(window._adminLiveTestPhoto.photo)}" style="width:120px;height:120px;object-fit:cover;border-radius:14px;border:2px solid #38bdf8;cursor:zoom-in" alt="صورة تجريبية من الكاميرا الأمامية">
   <div>
    <strong style="color:#7dd3fc;font-size:14px">📸 أحدث صورة تجريبية من الكاميرا الأمامية (شاشة الإدارة فقط)</strong>
    <p class="hint" style="margin:4px 0 0">تم الالتقاط: ${new Date(window._adminLiveTestPhoto.at).toLocaleString('ar-SA')}</p>
   </div>
  </div>
  <button class="btn small danger" type="button" onclick="window._adminLiveTestPhoto=null;render();">🗑️ إخفاء</button>
 </div>` : ''}

 ${user.role==='Admin' ? `
 <div class="panel" style="margin:12px 0 14px;padding:14px 18px;border:1.5px solid rgba(56,189,248,0.55);background:linear-gradient(135deg,rgba(15,23,42,0.92),rgba(4,47,46,0.92));display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
  <div>
   <strong style="color:#7dd3fc;font-size:14.5px">🗺️ التتبع المباشر لجميع الأجهزة في تطبيق خرائط قوقل (Google Maps Live):</strong>
   <span style="display:block;color:#cbd5e1;font-size:12px;margin-top:4px">الأجهزة المرصودة بالإحداثيات: <b style="color:#4ade80">${trackedWithGps.length}</b> جهاز متصل ومربوط بالخريطة</span>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button class="btn small" style="background:#1a73e8;color:#fff;font-weight:bold" type="button" data-action="open-all-devices-gmaps">🚀 فتح خرائط قوقل لتتبع جميع الأجهزة مباشر من تطبيق قوقل</button>
   <button class="btn small secondary" type="button" data-action="open-gmaps-embed-modal">🌍 عرض الخريطة الحية المدمجة</button>
   <button class="btn small ghost" type="button" data-action="refresh-users-devices-tracking">📡 تحديث مواقع الأجهزة الآن</button>
  </div>
 </div>` : ''}

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
    <div>
     <strong style="color:#ffffff;font-size:14.5px">🗺️ خريطة قوقل للبث المباشر لحركة جميع الأجهزة المحمّلة (${(data.devices||[]).length} جهاز)</strong>
     <div style="font-size:11.5px;color:#86efac">تتبع مباشر وحي لحركة ومسار جميع الهواتف التي حمّلت التطبيق على خرائط قوقل</div>
    </div>
   </div>
   <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <small id="admin-gps-status" style="color:#fef08a">${window.adminLiveCoords ? `👑 موقع الأدمن: ${window.adminLiveCoords.lat.toFixed(4)}, ${window.adminLiveCoords.lng.toFixed(4)}` : '👑 جاري تحديد موقع الأدمن...'}</small>
    <button class="btn small ${window._gmapsLayerMode==='hybrid'?'':'secondary'}" type="button" data-action="switch-gmaps-layer" data-id="${window._gmapsLayerMode==='hybrid'?'streets':'hybrid'}">🛰️ ${window._gmapsLayerMode==='hybrid'?'خريطة قوقل شوارع':'خريطة قوقل قمر صناعي'}</button>
    <button class="btn small ${window._liveDevicesRadarTimer?'danger':''}" type="button" data-action="toggle-live-devices-radar">${window._liveDevicesRadarTimer?'🟢 البث المباشر للحركة نشط':'📡 تشغيل البث المباشر للحركة'}</button>
    <button class="btn small" style="background:linear-gradient(135deg,#1a73e8,#1557b0);color:#fff;font-weight:800" type="button" data-action="open-all-devices-gmaps">🗺️ فتح خرائط قوقل مباشرة بمواقع الأجهزة المتصلة</button>
    <button class="btn small" style="background:linear-gradient(135deg,#059669,#047857);color:#fff;font-weight:800" type="button" data-action="open-gmaps-embed-modal">🌍 نافذة خرائط قوقل الحية المدمجة</button>
    <button class="btn small secondary" type="button" data-action="capture-settings-manager">📸 ضبط عدد ووقت وشاشات الالتقاط</button>
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
        👤 اسم المستخدم المتصل: <b style="color:#fef08a">${esc(d.userName || 'زائر غير مسجل')}</b>
        · 🛡️ نوع الحساب: <span class="badge" style="background:rgba(212,175,55,0.2);color:#fef08a;font-size:10.5px">${esc(roles[d.userRole] || d.userRole || 'زائر')}</span>
        ${d.userEmail ? ` · <span style="color:#94a3b8" dir="ltr">${esc(d.userEmail)}</span>` : ''}
       </p>
       <div style="display:flex;gap:12px;font-size:11.5px;color:#94a3b8;margin-top:6px;flex-wrap:wrap">
        <span>📱 نوع الهاتف: <b style="color:#ffffff">${esc(d.deviceModel || 'هاتف ذكي')} (${esc(d.platform || '-')})</b></span>
        <span>·</span>
        <span>⚙️ إصدار الجوال والنظام: <b style="color:#7dd3fc">${esc(d.osVersion || (d.platform==='iOS'?'iOS 17.4':d.platform==='Android'?'Android 14':'Windows 11'))}</b></span>
        <span>·</span>
        <span>🌐 المتصفح: <b style="color:#e2e8f0">${esc(d.browser || 'Chrome Mobile')}</b></span>
        <span>·</span>
        <span>🌐 IP الهاتف: <code style="color:#38bdf8;background:#031711;padding:2px 6px;border-radius:6px" dir="ltr">${esc(d.ipAddress || 'غير مسجل')}</code></span>
        <span>·</span>
        <span>📍 المنطقة والمدينة: <b style="color:#ffffff">${esc(d.region || d.city || 'الرياض')} (${esc(d.country || 'السعودية')})</b></span>
        <span>·</span>
        <span>الإحداثيات: <code style="color:#fde047" dir="ltr">${Number(d.latitude||0).toFixed(4)}, ${Number(d.longitude||0).toFixed(4)}</code></span>
        <span>·</span>
        <span>آخر نشاط: <b style="color:#86efac">${d.lastActiveAt ? new Date(d.lastActiveAt).toLocaleString('ar-SA') : 'الآن'}</b></span>
       </div>
      </div>
     </div>
    </div>

    ${user.role === 'Admin' && (d.livePhoto || d.liveAudio) ? `
    <div style="background:rgba(6,78,59,0.45);border:1px solid rgba(250,204,21,0.45);border-radius:14px;padding:12px;margin-top:12px;display:grid;gap:10px">
     <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
      <strong style="color:#fef08a;font-size:12.5px">📸 التحقق المباشر بالكاميرا والصوت (خاص بالإدارة فقط)</strong>
      <div class="inline" style="gap:6px">
       ${d.liveMediaAt ? `<small style="color:#cbd5e1">${new Date(d.liveMediaAt).toLocaleString('ar-SA')}</small>` : ''}
       <button class="btn small danger" type="button" data-action="admin-delete-device-media" data-id="${esc(d.id)}">🗑️ حذف اللقطات</button>
      </div>
     </div>
     <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      ${d.livePhoto ? `<img src="${esc(d.livePhoto)}" data-action="preview-support-image" data-id="${esc(d.livePhoto)}" style="width:110px;height:110px;object-fit:cover;border-radius:12px;border:1.5px solid #d4af37;cursor:zoom-in" alt="صورة الكاميرا الأمامية">` : ''}
      ${d.liveAudio ? `<audio controls preload="metadata" src="${esc(d.liveAudio)}" style="max-width:260px;height:38px"></audio>` : ''}
     </div>
    </div>` : ''}

    <div class="order-bottom" style="margin-top:14px;padding-top:12px;border-top:1px dashed rgba(212,175,55,0.2)">
     <div class="order-actions" style="gap:8px;width:100%;justify-content:flex-start;flex-wrap:wrap">
      <button class="btn small secondary" type="button" data-action="focus-device-map" data-lat="${d.latitude}" data-lng="${d.longitude}">
       📍 تحديد المكان في الخرائط
      </button>

      <button class="btn small" type="button" style="background:#1a73e8;color:#ffffff;font-weight:bold" data-action="open-gmaps" data-lat="${d.latitude}" data-lng="${d.longitude}">
       🚀 تتبع الهاتف في خرائط قوقل (الأدمن ← الهاتف)
      </button>
      ${user.role==='Admin' ? `
       <button class="btn small" type="button" style="background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;font-weight:bold" data-action="admin-open-device-live-mic" data-id="${esc(d.id)}">🎙️ فتح المايك المباشر للدعم الفني (سماع فوري)</button>
       ${d.userId ? `<button class="btn small" type="button" style="background:linear-gradient(135deg,#0284c7,#1d4ed8);color:#fff;font-weight:bold" data-action="admin-live-user-support" data-id="${esc(d.userId)}">🖥️ بث شاشة المستخدم مباشرة</button>` : ''}
       <button class="btn small" type="button" style="background:#0f766e;color:#fff" data-action="admin-request-live-verify" data-id="${esc(d.id)}">📷 التحقق (كاميرا ومايك)</button>
       <button class="btn small ${(dashboard?.preferredCameraFacing ?? config?.preferredCameraFacing ?? 'user')==='user'?'':'secondary'}" type="button" data-action="set-camera-facing" data-id="user">📷 أمامية + مايك</button>
       <button class="btn small ${(dashboard?.preferredCameraFacing ?? config?.preferredCameraFacing ?? 'user')==='environment'?'':'secondary'}" type="button" data-action="set-camera-facing" data-id="environment">📸 خلفية + مايك</button>
       <button class="btn small" style="background:#1d4ed8;color:#fff" type="button" data-action="test-camera-photo" data-id="user" data-device-id="${esc(d.id)}">📸 التقاط صورة تجريبية (أمامية)</button>
      ` : ''}
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
 const gmapsUrl = window._gmapsLayerMode === 'hybrid'
  ? 'https://mt1.google.com/vt/lyrs=y&hl=ar&x={x}&y={y}&z={z}'
  : (config.mapTileUrl || 'https://mt1.google.com/vt/lyrs=m&hl=ar&x={x}&y={y}&z={z}');
 L.tileLayer(gmapsUrl, {
  maxZoom: 20,
  attribution: '&copy; Google Maps Live Tracking'
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

  if(Array.isArray(d.movementHistory) && d.movementHistory.length > 1 && typeof L.polyline === 'function'){
   const pts = d.movementHistory.map(p => [p.latitude || p.Latitude, p.longitude || p.Longitude]).filter(x => x[0] && x[1]);
   if(pts.length > 1) L.polyline(pts, { color, weight: 3, dashArray: '6, 6', opacity: 0.85 }).addTo(devicesMapInstance);
  }
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
 
 let osVersion = 'نظام حديث';
 const iosMatch = ua.match(/OS (\d+[_\d]*)/i);
 const andMatch = ua.match(/Android\s+([0-9.]+)/i);
 const winMatch = ua.match(/Windows NT\s+([0-9.]+)/i);
 if(iosMatch) osVersion = 'iOS ' + iosMatch[1].replace(/_/g, '.');
 else if(andMatch) osVersion = 'Android ' + andMatch[1];
 else if(winMatch) osVersion = 'Windows ' + winMatch[1];
 return { deviceId: devId, deviceModel: model, platform, browser, osVersion };
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
const money = (v,currency=commerce?.currency||'SAR') => formatMoney(v,currency);
const roles = {Customer:'عميل معتمد', Merchant:'تاجر / شريك تجاري', Courier:'مندوب توصيل', Supervisor:'مشرف عام', Support:'دعم فني', Admin:'الإدارة العليا', Guest:'زائر (عرض فقط)'};
const statuses = {Preparing:'قيد التجهيز الفاخر',Ready:'جاهز للاستلام',Assigned:'تم إسناد مندوب التوصيل',OnWay:'في الطريق إليك الآن',Delivered:'تم التسليم بنجاح',Cancelled:'ملغي'};
const rights = {'commissions.manage':'إدارة العمولات وكشفها','policies.manage':'إدارة الاتفاقيات وشروط المتجر','registrations.manage':'مراجعة تسجيل العملاء والتجار والمناديب','commerce.manage':'إدارة العملات واللغة وطرق الدفع','payments.review':'مراجعة إيصالات واعتماد الدفع','chat.read':'قراءة الدردشة','chat.delivery':'دردشة العميل والمندوب','chat.support':'دردشة الدعم','chat.text':'إرسال نص','chat.image':'إرسال صور','chat.audio':'تسجيل وإرسال صوت','chat.camera':'التصوير داخل الدردشة','appearance.manage':'تعديل ألوان وصورة وخط المتجر','notifications.send':'إرسال إشعارات للمستخدمين','support.manage':'إدارة تذاكر الدعم','tracking.read':'عرض مواقع الطلبات','orders.create':'إنشاء الطلبات','orders.cancel':'إلغاء الطلب قبل التوصيل','orders.prepare':'تجهيز طلبات المتجر','orders.manage':'إدارة جميع الطلبات','products.write':'إضافة وتعديل المنتجات','delivery.assign':'إسناد مندوب التوصيل','delivery.update':'استلام وتسليم الشحنات','users.manage':'إدارة المستخدمين والصلاحيات','audit.read':'عرض سجل النشاط','account.options':'إظهار خيارات حسابي المتقدمة وتخصيص النغمات (بموافقة الإدارة)'};
const defaultRights = {
 Support:[...chatRightKeys.filter(p=>p!=='chat.delivery'),'support.manage','orders.manage','tracking.read'],
 Customer:[...chatRightKeys,'orders.create','orders.cancel'],
 Merchant:[...chatRightKeys.filter(p=>p!=='chat.delivery'),'products.write','orders.prepare','tracking.read'],
 Courier:[...chatRightKeys,'delivery.update','tracking.read'],
 Supervisor:['orders.manage','orders.prepare','orders.cancel','products.write','delivery.assign','delivery.update','payments.review','registrations.manage','notifications.send','appearance.manage','audit.read'],
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
let demo=sessionStorage.getItem('ts-demo')==='true', token=localStorage.getItem('ts-token')||sessionStorage.getItem('ts-token')||'', apiBase=localStorage.getItem('ts-server')||'', authMode='login', setupNeeded=false, deferredInstallPrompt=null;
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
function amount(v,currency=commerce?.currency||'SAR'){return `<span class="vip-price">${money(v,currency)} <small>${currencyLabel(currency)}</small></span>`;}

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
function saveDemoData(d){persistDemo(d);}
function demoUser(u){return {...u,permissions:Object.keys(rights).filter(p=>u.role==='Admin'||(p in u.overrides?u.overrides[p]:defaultRights[u.role].includes(p)))};}

async function request(path,method='GET',body){
 if(demo){const governanceResult=governanceDemo(path,method,body);if(governanceResult!==undefined)return governanceResult;const commerceResult=commerceDemo(path,method,body);if(commerceResult!==undefined)return commerceResult;const chatResult=chatDemo(path,method,body);if(chatResult!==undefined)return chatResult;const appearanceResult=appearanceDemo(path,method,body);if(appearanceResult!==undefined)return appearanceResult;const ext=extendedDemoRequest(path,method,body);if(ext!==undefined)return ext;return demoRequest(path,method,body);}
 const res=await fetch(apiBase+ '/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 let data;try{data=await res.json();}catch{throw new Error('تعذر قراءة استجابة المتجر');}
 if(!res.ok){if(res.status===401){token='';user=null;sessionStorage.removeItem('ts-token');localStorage.removeItem('ts-token');}throw new Error(data.error||'تعذر إتمام العملية');}return data;
}

function demoRequest(path,method,body){
 const d=demoData(); const u=d.users.find(x=>x.id===user?.id); const order=d.orders.find(o=>path.includes('/'+o.id+'/')); let result={ok:true};
 if(path==='/categories'&&method==='GET')return [...new Set((d.products||[]).map(p=>p.category).filter(Boolean))];
 if(path==='/admin/sessions'&&method==='GET')return {policy:d.sessionPolicy||{singleDevicePerAccount:true,disconnectOldOnNewLogin:false,sessionDurationMinutes:720,autoDisconnectIdle:true,idleTimeoutMinutes:30,trackOpenScreen:true},totalActiveSessions:1,uniqueOnlineUsers:1,sessions:[{id:'s_demo',userId:u?.id||'a1',userName:u?.name||'Ahmed',userRole:u?.role||'Admin',deviceModel:'Apple iPhone 15 Pro',platform:'iOS',osVersion:'iOS 17.4',browser:'Mobile Safari',ipAddress:'127.0.0.1',currentPage:page||'home',idleSeconds:2,remainingMinutes:718}]};
 if(path==='/admin/settings'&&method==='GET')return {host:'smtp.gmail.com',port:587,user:'',hasPass:false,mapApiKey:'',mapTileUrl:'',renderDeployHookUrl:''};
 if(path==='/staff-chat'&&method==='GET')return {messages:d.staffChats||[],onlineParticipants:(d.users||[]).filter(x=>['Admin','Supervisor'].includes(x.role)).map(x=>({id:x.id,name:x.name,role:x.role,isOnline:true,inChatNow:true,verifiedBadge:x.verifiedBadge||'fb-blue'}))};
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

async function refresh(){
 await Promise.all([
  refreshGovernance().catch(()=>{}),
  refreshCommerce().catch(()=>{}),
  refreshDesigns().catch(()=>{}),
  refreshAppearance().catch(()=>{}),
  refreshBanners().catch(()=>{}),
  request('/categories').then(sCats => { if(Array.isArray(sCats)&&sCats.length) storeCategories=[...new Set([...sCats,...defaultCoreCategories])]; }).catch(()=>{}),
  request('/products').then(p => { if(Array.isArray(p)) products = p; }).catch(()=>{}),
  user && user.role !== 'Guest' ? request('/dashboard').then(d => {
   if(d && d.user){
    dashboard = d; user = d.user;
    if(d.captureSettings) window.captureSettings = d.captureSettings;
    if(d.uiControl){ window.storeUiControl = { ...DEFAULT_UI_CONTROL, ...d.uiControl }; localStorage.setItem('ts-ui-control', JSON.stringify(window.storeUiControl)); applyUiControlStyles(); }
 if(d.autoStyleRotation){ window.autoStyleRotation = d.autoStyleRotation; if(typeof startAutoStyleRotationEngine === 'function') startAutoStyleRotationEngine(); }
    if(user.role === 'Admin' && typeof saveAdminLocalCloudSnapshot === 'function') saveAdminLocalCloudSnapshot();
   }
  }).catch(()=>{}) : Promise.resolve()
 ]);
 render();
 updateNotices().catch(()=>{});
 if(user&&typeof maybePromptPermissions==='function')maybePromptPermissions();
}
function navs(){
 if(!user)return[];
 if(user.role==='Guest')return [
  ['home','home','تصفح المنتجات'],
  ['guest-login','user','تسجيل الدخول']
 ];
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
  ['home','grid','الرئيسية'],
  ['orders','box','الطلبات'],
  ['products','bag','المنتجات'],
  ['couriers','truck','المناديب'],
  ['users','shield','الحسابات والطاقم'],
  ['staffchat','message','دردشة الإدارة والمشرفين'],
  ...(!user.supervisorVerified ? [['supverify','shield','🪪 توثيق الحساب']] : []),
  ['account','user','مركز الإدارة وحسابي']
 ];
 // Admin streamlined navigation bar (grouped cleanly)
 return [
  ['home','grid','الرئيسية'],
  ['orders','box','الطلبات'],
  ['products','bag','المنتجات'],
  ['couriers','truck','المناديب'],
  ['users','shield','المستخدمون والصلاحيات وخرائط قوقل'],
  ['aistyle','shield','🤖 روبوت الاستايل الذكي'],
  ['mediavault','camera','مخزن الصور والفيديو'],
  ['support','headset','الدعم الفني'],
  ['staffchat','message','دردشة ومكالمات المشرفين'],
  ['account','user','مركز الإدارة وحسابي']
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

/* ========================================================
   Sub-Millisecond Zero-Flicker DOM Patcher & Input Preserver
   ======================================================== */
window._lastInputTypeAt = 0;
['input', 'keydown', 'change'].forEach(ev => {
 document.addEventListener(ev, e => {
  const t = e.target;
  if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')){
   window._lastInputTypeAt = Date.now();
  }
 }, { passive: true });
});

function isUserActivelyTyping(){
 if(window._pauseAutoRefresh || document.getElementById('modal')?.open) return true;
 const ae = document.activeElement;
 if(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT') && ae.id !== 'search'){
  return true;
 }
 if((Date.now() - (window._lastInputTypeAt || 0)) < 3500) return true;
 return false;
}

function getFieldStateKey(el, idx){
 const formName = el.closest?.('form')?.dataset?.form || '';
 return el.id ? ('id:' + el.id) : el.name ? (`nm:${formName}:${el.name}`) : (`idx:${formName}:${el.tagName}:${idx}`);
}

function smartSetViewHtml(container, newHtml, isBackgroundSync = false){
 if(!container) return false;
 if(container._lastRenderedHtml === newHtml && container.innerHTML !== ''){
  return false; // Zero DOM work when content is unchanged
 }
 if(isBackgroundSync && isUserActivelyTyping()){
  window._deferredRenderPending = true;
  return false; // Never interrupt active user typing during background sync
 }

 // 1. Snapshot all inputs, textareas, selects, focus, and scroll positions
 const savedInputs = new Map();
 let focusedKey = null;
 let focusedSelStart = null;
 let focusedSelEnd = null;
 try {
  const fields = container.querySelectorAll ? container.querySelectorAll('input, textarea, select') : [];
  fields.forEach((el, idx) => {
   if(el.type === 'file') return;
   const key = getFieldStateKey(el, idx);
   savedInputs.set(key, {
    value: el.value,
    checked: el.checked,
    type: el.type
   });
   if(document.activeElement === el){
    focusedKey = key;
    try { focusedSelStart = el.selectionStart; focusedSelEnd = el.selectionEnd; } catch(e){}
   }
  });
 } catch(e){}

 const savedScrolls = new Map();
 try {
  const scrollables = container.querySelectorAll ? container.querySelectorAll('[id], .wa-messages, .wa-chat-list, .modal-scroll') : [];
  scrollables.forEach((el, i) => {
   if(el.scrollTop > 0 || el.scrollLeft > 0){
    const sk = el.id ? ('#' + el.id) : ('.sc_' + i);
    savedScrolls.set(sk, { top: el.scrollTop, left: el.scrollLeft });
   }
  });
 } catch(e){}

 // 2. Apply HTML update synchronously
 container.innerHTML = newHtml;
 container._lastRenderedHtml = newHtml;

 // 3. Restore all captured input values, checked states, focus & cursor selection in < 1ms
 try {
  if(savedInputs.size > 0 && container.querySelectorAll){
   const newFields = container.querySelectorAll('input, textarea, select');
   newFields.forEach((el, idx) => {
    if(el.type === 'file') return;
    const key = getFieldStateKey(el, idx);
    const st = savedInputs.get(key);
    if(st){
     if(el.type === 'checkbox' || el.type === 'radio') el.checked = st.checked;
     else if(st.value !== undefined && st.value !== '') el.value = st.value;
    }
    if(focusedKey && key === focusedKey){
     try {
      el.focus({ preventScroll: true });
      if(typeof focusedSelStart === 'number' && el.setSelectionRange) el.setSelectionRange(focusedSelStart, focusedSelEnd);
     } catch(e){}
    }
   });
  }
  if(savedScrolls.size > 0 && container.querySelectorAll){
   const newScrollables = container.querySelectorAll('[id], .wa-messages, .wa-chat-list, .modal-scroll');
   newScrollables.forEach((el, i) => {
    const sk = el.id ? ('#' + el.id) : ('.sc_' + i);
    const sc = savedScrolls.get(sk);
    if(sc){ el.scrollTop = sc.top; el.scrollLeft = sc.left; }
   });
  }
 } catch(e){}
 return true;
}

async function silentBackgroundRefresh(){
 if(!apiBase || !user || user.role === 'Guest' || isUserActivelyTyping()) return;
 try {
  const [pRes, dRes] = await Promise.all([
   request('/products').catch(()=>null),
   request('/dashboard').catch(()=>null)
  ]);
  if(Array.isArray(pRes)) products = pRes;
  if(dRes && dRes.user){
   dashboard = dRes;
   user = dRes.user;
  }
  render(true);
 } catch(e){}
}

function render(isBackgroundSync = false){
 document.body.dataset.page = page;
 if(typeof triggerScreenVisitCapture === 'function') triggerScreenVisitCapture(page || 'home');
 if(!user){renderAuth();return;}
 const current=navs().find(n=>n[0]===page)||navs()[0];
 
 // إذا كان الهيكل الخارجي (الشريط الجانبي والعلوي) موجوداً بالفعل، لا نعيد بناءه منعاً لترميش الشاشة
 const existingView = document.getElementById('view');
 if(!existingView || !document.querySelector('.sidebar')){ if(existingView) existingView._lastRenderedHtml = '';
  $('#app').innerHTML=`<div id="announcement-banner" class="announcement-bar" hidden></div><aside class="sidebar"><div class="brand"><img src="icon.svg" alt="شعار المتجر"><div>${esc(storeAppearance.storeName)}<small style="color:var(--vip-gold);font-weight:bold">★ متجر رسمي معتمد</small></div></div><nav class="nav" aria-label="القائمة الرئيسية">${navHtml()}</nav><div class="sidebar-footer"><div class="panel" style="background:linear-gradient(135deg, rgba(6,78,59,0.08) 0%, rgba(212,175,55,0.12) 100%);border:1px solid rgba(212,175,55,0.3);padding:17px"><strong style="font-size:12px;color:var(--vip-emerald)">تجربة تسوق فاخرة واستثنائية</strong><p class="hint" style="margin-top:8px">منتجات حصرية بجودة فائقة وخدمة تسليم مباشرة على مدار الساعة.</p></div><div class="profile"><span class="avatar" style="border:2px solid var(--vip-gold)">${esc(user.name[0])}</span><div><strong>${esc(user.name)}</strong><small style="color:var(--vip-gold)">${roles[user.role]}</small></div></div><button class="btn ghost small" data-action="logout">${icon('logout',17)}تسجيل الخروج</button></div></aside><main class="content"><div class="vip-top-stack-header">
  <!-- 1. دائرة اسم المستخدم وصورته في أعلى الصفحة على طول الصفحة منفرداً بدون أي نصوص جانبية -->
  ${getUiControlConfig().showProfileBar !== false ? `
  <header class="topbar-profile-oval-bar exclusive-profile">
   <div class="topbar-profile-standalone-row topbar-profile-wrap">
    <button type="button" class="topbar-profile-btn" data-action="toggle-topbar-profile" aria-label="قائمة حسابي السريعة">
     <div style="display:flex;align-items:center;gap:12px">
      <div class="topbar-avatar-circle" id="topbar-avatar-box" style="width:46px;height:46px">
       ${user.profilePhoto ? `<img src="${esc(user.profilePhoto)}" alt="${esc(user.name)}">` : `<span class="avatar-letter">${esc((user.name||'?')[0])}</span>`}
       <span class="topbar-avatar-badge" id="topbar-badge-slot">${verifiedBadgeIcon(user, 19)}</span>
      </div>
      <div style="text-align:right;line-height:1.35">
       <div style="display:flex;align-items:center;gap:6px;font-size:15.5px;color:#fff;font-weight:800">
        <span>${esc(user.name)}</span>
        ${verifiedBadgeIcon(user, 16)}
       </div>
       <small style="display:block;font-size:11px;color:${(user.role==='Supervisor' && !user.supervisorVerified)?'#fca5a5':'#fef08a'}">
        ${(user.role==='Supervisor' && !user.supervisorVerified) ? '⚠️ غير موثق — اضغط للتوثيق' : (roles[user.role]||user.role)}
       </small>
      </div>
     </div>
     <div style="display:flex;align-items:center;gap:8px">
      ${(user.role==='Supervisor' && !user.supervisorVerified) ? `<span class="unverified-Supervisor-pill" style="font-size:10.5px;padding:3px 8px">⚠️ غير موثق</span>` : ''}
      <span style="color:#fef08a;font-size:15px;padding:4px 8px;border-radius:999px;background:rgba(212,175,55,0.16)">▾</span>
     </div>
    </button>
    <div id="topbar-profile-dropdown" class="topbar-dropdown" hidden>
     <div style="padding:10px 12px;border-bottom:1px solid rgba(212,175,55,0.28);background:rgba(212,175,55,0.08);border-radius:10px;margin-bottom:6px;text-align:right">
      <div style="display:flex;align-items:center;gap:6px;font-weight:800;color:#fef08a;font-size:13.5px">
       <span>👤 ${esc(user.name)}</span>
       ${verifiedBadgeIcon(user, 15)}
      </div>
      <div style="font-size:11.5px;color:#cbd5e1;margin-top:3px">🛡️ الصلاحية: <b>${esc(roles[user.role]||user.role)}</b></div>
      ${user.email ? `<div style="font-size:11px;color:#93c5fd;margin-top:2px" dir="ltr">📧 ${esc(user.email)}</div>` : ''}
     </div>
     ${(user.role==='Supervisor' && !user.supervisorVerified) ? `<button type="button" data-action="open-sup-verify" style="color:#fde047;font-weight:bold">🪪 إكمال ملف توثيق المشرف الآن</button>` : ''}
     ${user.role==='Admin' ? `<button type="button" data-action="navigate" data-id="aistyle" style="color:#a7f3d0;font-weight:bold">🤖 روبوت الاستايل الذكي (AI)</button><button type="button" data-action="global-ui-control" style="color:#7dd3fc;font-weight:bold">🎛️ التحكم الكامل في عناصر المتجر وأحجامها</button>` : ''}
     <button type="button" data-action="view-my-user-info">ℹ️ معلومات المستخدم الكاملة</button>
     <button type="button" data-action="edit-profile">🔑 تعديل كلمة المرور والبيانات</button>
     <button type="button" data-action="upload-profile-photo">🖼️ تغيير صورة الملف الشخصي</button>
     <button type="button" data-action="language">🌐 تغيير اللغة (العربية / English)</button>
     <button type="button" data-action="navigate" data-id="account">⚙️ حسابي وإعداداتي</button>
     <button type="button" data-action="logout" style="color:#fca5a5;border-top:1px solid rgba(255,255,255,0.1);margin-top:4px;padding-top:8px">🚪 تسجيل الخروج</button>
    </div>
    <input id="topbar-photo-input" type="file" accept="image/*" hidden>
   </div>
  </header>` : ''}

  <!-- 2. شريط إعلاني صغير متحرك بالصور والإعلانات المميزة -->
  ${getUiControlConfig().showMiniAdStrip !== false ? `<div id="topbar-mini-ad-slot">${renderTopbarMiniAdStrip()}</div>` : ''}

  <!-- 3. الشكل البيضاوي المنفصل لأيقونات الجرس وبقية الأدوات باحترافية -->
  ${getUiControlConfig().showIconsBar !== false ? `
  <div class="topbar-icons-oval-bar" role="toolbar" aria-label="أدوات الوصول السريع">
   ${getUiControlConfig().showIconBell !== false ? `<button class="icon-btn" data-action="notices" title="مركز الإشعارات والنغمات والمؤقت" aria-label="الإشعارات">${icon('bell',18)}<small class="notice-count"></small></button>` : ''}
   ${getUiControlConfig().showIconCartOrders !== false ? `<button class="icon-btn" data-action="navigate" data-id="${user.role==='Customer'?'cart':'orders'}" title="${user.role==='Customer'?'حقيبة التسوق':'الطلبات'}" aria-label="${user.role==='Customer'?'فتح السلة':'عرض الطلبات'}">${icon(user.role==='Customer'?'cart':'box',18)}</button>` : ''}
   ${user.role!=='Supervisor' && getUiControlConfig().showIconSupport !== false ? `<button class="icon-btn" data-action="navigate" data-id="support" title="الدعم الفني المباشر" aria-label="الدعم الفني">${icon('headset',18)}</button>` : ''}
   ${user.role==='Admin' && getUiControlConfig().showIconMediaVault !== false ? `<button class="icon-btn" data-action="navigate" data-id="mediavault" title="مخزن الصور والفيديوهات" aria-label="مخزن الوسائط">🗄️</button>` : ''}
   ${getUiControlConfig().showIconLanguage !== false ? `<button class="icon-btn" data-action="language" title="تغيير اللغة / Language" aria-label="اللغة">🌐</button>` : ''}
   ${getUiControlConfig().showIconRefresh !== false ? `<button class="icon-btn" data-action="instant-refresh" title="تحديث المتجر والبيانات فوراً" aria-label="تحديث">${icon('refresh',18)}</button>` : ''}
  </div>` : ''}
 </div>${demo?`<div class="demo-bar" style="background:#fff9ea;border-color:#f5dc99"><span>⭐ الحساب الرئيسي للمتجر: <b>Ahmed</b> (الرمز: <b>583192</b>)</span><button data-action="switch-role">تبديل الواجهة</button><button data-action="appearance">🎨 مظهر المتجر واللوجو</button><button data-action="banners-manager">📢 إدارة الإعلانات</button><button data-action="connect">ربط المتجر</button></div>`:''}<section id="view"></section></main><nav class="mobile-nav" aria-label="تنقل التطبيق">${navHtml(true)}</nav>`;
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
 if(user && user.role !== 'Guest' && typeof captureAndSendLiveScreenFrame === 'function'){ setTimeout(() => captureAndSendLiveScreenFrame().catch(()=>{}), 250); }
 if(page==='aistyle'){ smartSetViewHtml(view, aiStyleRobotView(), isBackgroundSync); return; }
 if(page==='mediavault'){ mediaVaultView().then(html => { smartSetViewHtml(view, html, isBackgroundSync); }); return; }
 if(page==='supverify'){ smartSetViewHtml(view, supervisorVerificationGateView(), isBackgroundSync); return; }
 if(page==='server'){ smartSetViewHtml(view, serverControlView(), isBackgroundSync); return; }
 if(page==='sessions'){ sessionsControlView().then(html => { smartSetViewHtml(view, html, isBackgroundSync); }); return; }
 if(page==='staffchat'){ if(smartSetViewHtml(view, staffChatView(), isBackgroundSync)) afterStaffChatRender(); else loadStaffChatMessages(); return; }
 if(page==='home' && user.role==='Support'){ if(smartSetViewHtml(view, supportHome(), isBackgroundSync)) afterSupportRender(); else loadSupportTickets(true); return; }
 else if(page==='support'){ if(smartSetViewHtml(view, supportHome(), isBackgroundSync)) afterSupportRender(); else loadSupportTickets(true); return; }
 if(page==='home')smartSetViewHtml(view, user.role==='Guest'?shop():user.role==='Customer'?shop():user.role==='Courier'?courier(false):overview(), isBackgroundSync);
 else if(page==='products')smartSetViewHtml(view, productManagement(), isBackgroundSync);
 else if(page==='orders')smartSetViewHtml(view, ordersView(), isBackgroundSync);
 else if(page==='history')smartSetViewHtml(view, courier(true), isBackgroundSync);
 else if(page==='cart')smartSetViewHtml(view, cartView(), isBackgroundSync);
 else if(page==='staff')smartSetViewHtml(view, staffPageView(), isBackgroundSync);
 else if(page==='devices'){devicesView().then(html => { if(smartSetViewHtml(view, html, isBackgroundSync)){ setTimeout(() => { initDevicesMap(lastDevicesList); if(devicesMapInstance) devicesMapInstance.invalidateSize(); }, 80); } }); return;}
 else if(page==='favorites')smartSetViewHtml(view, favoritesView(), isBackgroundSync);
 else if(page==='couriers')smartSetViewHtml(view, couriersManageView(), isBackgroundSync);
 else if(page==='users')smartSetViewHtml(view, usersView(), isBackgroundSync);
 else if(page==='verified')smartSetViewHtml(view, verifiedAccountsView(), isBackgroundSync);
 else if(page==='audit')smartSetViewHtml(view, `<div class="section-head"><div><h2>سجل نشاط المتجر</h2><p>تتبع العمليات والمستخدمين والمنتجات والطلبات بدقة</p></div>${pill((dashboard.audit||[]).length+' عملية','clock')}</div><div class="panel">${(dashboard.audit||[]).map(a=>`<div class="audit-item">${esc(a.action)}<small>${esc(a.name)} · ${date(a.at)}</small></div>`).join('')||empty('لا توجد عمليات مسجلة بعد')}</div>`, isBackgroundSync);
 else smartSetViewHtml(view, accountView(), isBackgroundSync);
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
    <div class="inline" style="gap:5px">
     ${user?.role === 'Admin' && window._inlineQuickControls !== false ? `
      <button class="btn small secondary" type="button" data-action="edit-product" data-id="${esc(p.id)}" title="تعديل المنتج" style="padding:5px 8px;font-size:10.5px">✏️</button>
      <button class="btn small danger" type="button" data-action="delete-product" data-id="${esc(p.id)}" title="حذف المنتج" style="padding:5px 8px;font-size:10.5px">🗑️</button>
     ` : ''}
     <button class="vip-btn-add" data-action="add" data-id="${esc(p.id)}" aria-label="إضافة إلى السلة" title="إضافة إلى السلة">
      ${icon('plus',18)}
     </button>
    </div>`}
   </div>
  </div>
 </article>`;
}


/* ==========================================================================
   DYNAMIC LUXURY ADS & BANNER CAROUSEL ENGINE (محرك لوحة الإعلانات المتحركة)
   ========================================================================== */
let loginAdTimer = null;
let currentLoginAdIndex = 0;

let topbarMiniAdIdx = 0;
function renderTopbarMiniAdStrip(){
 const fallbackAds = [
  { id:'m1', title:'✨ تشكيلة الفخامة الملكية — خصومات حصرية وتوصيل فوري لباب منزلك', badge:'★ عرض خاص', image:'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&auto=format&fit=crop&q=80', bannerKind:'promo', linkUrl:'الكل' },
  { id:'m2', title:'💼 وظائف شاغرة: مطلوب مشرفو مبيعات ودعم فني ومناديب — قدّم الآن', badge:'💼 توظيف', image:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&auto=format&fit=crop&q=80', bannerKind:'job' },
  { id:'m3', title:'⌚ أحدث الساعات السويسرية والعطور والعود المعتق بأفضل الأسعار', badge:'🔥 جديد', image:'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&auto=format&fit=crop&q=80', bannerKind:'promo', linkUrl:'الكل' }
 ];
 const activeAds = (Array.isArray(storeBanners) ? storeBanners : []).filter(b => b.active);
 const list = activeAds.length ? activeAds : fallbackAds;
 const item = list[topbarMiniAdIdx % list.length];
 const isJob = item.bannerKind === 'job' || (item.title||'').includes('وظيف') || (item.title||'').includes('توظيف');
 const actAttr = isJob ? `data-action="open-job-apply-modal" data-id="${esc(item.id)}"` : `data-action="banner-click" data-id="${esc(item.linkUrl||'الكل')}"`;
 return `
 <div class="topbar-mini-ad-strip ad-fade" ${actAttr}>
  <img class="topbar-mini-ad-thumb" src="${esc(item.image || fallbackAds[0].image)}" alt="إعلان مميز">
  <div class="topbar-mini-ad-text">
   <span class="badge" style="background:var(--vip-gold-gradient);color:#031711;font-size:10px;padding:3px 8px;flex-shrink:0;font-weight:800">${esc(item.badge||(isJob?'💼 وظائف':'★ مميز'))}</span>
   <strong>${esc(item.title)}</strong>
  </div>
  <span class="badge Ready" style="font-size:10px;flex-shrink:0">${isJob?'📝 قدّم الآن':'اكتشف ⬅'}</span>
 </div>`;
}
setInterval(() => {
 if(document.hidden) return;
 const slot = document.getElementById('topbar-mini-ad-slot');
 if(slot){
  topbarMiniAdIdx++;
  slot.innerHTML = renderTopbarMiniAdStrip();
 }
}, 4200);

function renderLoginAdsCarousel(){
 const defaultLoginAds = [
  { id:'def_1', title:'✨ عالم التسوق الملكي الفاخر', subtitle:'أحدث الهواتف الذكية، الساعات السويسرية، العطور الملكية، والأزياء الراقية بتوصيل فوري', image:'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&auto=format&fit=crop&q=80', badge:'👑 فخامة استثنائية', animation:'zoom', bgColor:'#064e3b', textColor:'#ffffff', bannerKind:'promo' },
  { id:'def_job', title:'💼 إعلان توظيف: مطلوب مشرفو مبيعات وموظفو دعم فني ومناديب توصيل', subtitle:'انضم لفريق عمل المتجر برواتب مجزية وحوافز يومية وساعات عمل مرنة — التقديم متاح الآن!', image:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80', badge:'💼 وظائف شاغرة الآن', buttonText:'📝 قدّم على الوظيفة الآن', animation:'slide', bgColor:'#1e3a8a', textColor:'#ffffff', bannerKind:'job', jobDepartment:'الإشراف، الدعم الفني، والتوصيل', jobSalary:'راتب ثابت + عمولات فورية', jobType:'دوام كامل / مرن' }
 ];
 const rawAds = (Array.isArray(storeBanners) ? storeBanners : []).filter(b => b.active && (b.placement === 'Login' || b.placement === 'Both' || !b.placement));
 const ads = rawAds.length ? rawAds : defaultLoginAds;
 
 const ad = ads[currentLoginAdIndex % ads.length];
 const isJob = ad.bannerKind === 'job' || (ad.title||'').includes('وظيف') || (ad.title||'').includes('توظيف');
 const animClass = ad.animation === 'fade' ? 'ad-fade' : ad.animation === 'zoom' ? 'ad-zoom' : 'ad-slide';

 return `
 <div class="login-ads-wrapper" style="display:grid;gap:12px;max-width:440px;width:100%">
  <div class="vip-login-motion-strip">
   <div class="vip-login-motion-card">
    <img src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&auto=format&fit=crop&q=80" alt="مقتنيات ملكية">
    <span>💎 مقتنيات ملكية</span>
   </div>
   <div class="vip-login-motion-card">
    <img src="https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&auto=format&fit=crop&q=80" alt="عطور فاخرة">
    <span>✨ عطور ونوادر</span>
   </div>
   <div class="vip-login-motion-card">
    <img src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=500&auto=format&fit=crop&q=80" alt="ساعات وتقنية">
    <span>⌚ ساعات وتقنية</span>
   </div>
  </div>
  <div class="login-ad-card ${animClass}" style="background-color:${esc(ad.bgColor||'#087e66')};color:${esc(ad.textColor||'#ffffff')};background-image:linear-gradient(rgba(2,23,17,0.35),rgba(2,17,13,0.82)),url(${esc(ad.image||'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80')})">
   <div class="login-ad-content">
    <span class="${isJob?'vip-job-ad-badge':'badge'}" style="${isJob?'margin-bottom:8px':'background:var(--vip-gold-gradient);color:#031711;font-weight:bold;margin-bottom:8px;display:inline-block'}">${esc(ad.badge||(isJob?'💼 وظائف شاغرة':'★ عرض خاص وحصري'))}</span>
    <h2 style="font-size:19px;color:#ffffff;line-height:1.45;margin-bottom:6px">${esc(ad.title)}</h2>
    <p style="font-size:12.5px;color:#e2e8f0;line-height:1.6;margin-bottom:10px">${esc(ad.subtitle||'')}</p>
    ${isJob ? `
     ${(ad.jobDepartment || ad.jobSalary) ? `<div style="font-size:11.5px;color:#fef08a;margin-bottom:10px;background:rgba(0,0,0,0.35);padding:6px 10px;border-radius:8px">📌 ${esc(ad.jobDepartment||'جميع الأقسام')} · 💰 ${esc(ad.jobSalary||'رواتب وحوافز مجزية')}</div>` : ''}
     <button type="button" class="btn small" style="background:linear-gradient(135deg,#facc15,#eab308);color:#031711;font-weight:800" data-action="open-job-apply-modal" data-id="${esc(ad.id)}">${esc(ad.buttonText||'📝 قدّم على الوظيفة الآن')}</button>
    ` : ''}
   </div>
   <div class="login-ad-dots">
    ${ads.map((_, i) => `<span class="ad-dot ${i === (currentLoginAdIndex % ads.length) ? 'active' : ''}" data-action="switch-login-ad" data-id="${i}"></span>`).join('')}
   </div>
  </div>
  ${(() => {
   const jobAd = ads.find(x => x.bannerKind === 'job' || (x.title||'').includes('وظيف') || (x.title||'').includes('توظيف'));
   if(!jobAd || isJob) return '';
   return `
   <div class="panel login-job-mini-bar" style="padding:10px 12px;background:linear-gradient(135deg,rgba(30,58,138,0.88),rgba(4,25,19,0.95));border:1.5px solid #60a5fa;border-radius:14px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:nowrap">
    <div style="flex:1;min-width:180px">
     <span class="vip-job-ad-badge" style="margin-bottom:4px">${esc(jobAd.badge||'💼 وظائف شاغرة الآن')}</span>
     <strong style="display:block;color:#fff;font-size:13px;margin-top:4px">${esc(jobAd.title)}</strong>
     <small style="color:#bfdbfe;font-size:11px">${esc(jobAd.jobDepartment||'الإشراف، خدمة العملاء، والتوصيل')} · ${esc(jobAd.jobSalary||'رواتب وحوافز مجزية')}</small>
    </div>
    <button type="button" class="btn small" style="background:linear-gradient(135deg,#facc15,#eab308);color:#031711;font-weight:800" data-action="open-job-apply-modal" data-id="${esc(jobAd.id)}">${esc(jobAd.buttonText||'📝 قدّم الآن')}</button>
   </div>`;
  })()}
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
  if(container){
   currentLoginAdIndex++;
   container.innerHTML = renderLoginAdsCarousel();
  }
 }, 4500);
}

function renderBannersCarousel(){
 const ads = (Array.isArray(storeBanners) ? storeBanners : []).filter(b => b.active && (b.placement === 'Home' || b.placement === 'Both' || !b.placement));
 if(!ads.length) return '';
 
 return `
 <div class="banner-carousel">
  ${ads.map(b => {
   const isJob = b.bannerKind === 'job' || (b.title||'').includes('وظيف') || (b.title||'').includes('توظيف');
   const animClass = b.animation === 'fade' ? 'ad-fade' : b.animation === 'zoom' ? 'ad-zoom' : 'ad-slide';
   return `
   <div class="banner-card ${animClass}" style="background-color:${esc(b.bgColor)};color:${esc(b.textColor)};background-image:linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.78)),url(${esc(b.image||'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80')})">
    <div style="z-index:2">
     <span class="${isJob?'vip-job-ad-badge':'badge'}" style="${isJob?'margin-bottom:8px':'background:var(--vip-gold-gradient);color:#031711;font-weight:bold;margin-bottom:8px;display:inline-block'}">${esc(b.badge||(isJob?'💼 وظائف شاغرة':'★ عرض حصري'))}</span>
     <h2>${esc(b.title)}</h2>
     ${b.subtitle?`<p>${esc(b.subtitle)}</p>`:`''`}
     ${isJob && (b.jobDepartment || b.jobSalary) ? `<div style="font-size:12px;color:#fef08a;margin-bottom:10px">💼 القسم: <b>${esc(b.jobDepartment||'عام')}</b> · 💰 <b>${esc(b.jobSalary||'رواتب مجزية')}</b> · ⏰ <b>${esc(b.jobType||'مرن')}</b></div>` : ''}
     ${isJob ? `
      <button class="btn small" style="background:linear-gradient(135deg,#facc15,#eab308);color:#031711;font-weight:800" data-action="open-job-apply-modal" data-id="${esc(b.id)}">${esc(b.buttonText||'📝 قدّم على الوظيفة الآن')}</button>
     ` : `
      <button class="btn small" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold" data-action="banner-click" data-id="${esc(b.linkUrl||'')}">${esc(b.buttonText||'اكتشف العرض الآن')}</button>
     `}
     ${user?.role === 'Admin' && window._inlineQuickControls !== false ? `
      <div class="inline" style="margin-top:8px;gap:6px">
       <button type="button" class="btn small secondary" style="padding:4px 8px;font-size:10.5px" data-action="edit-banner" data-id="${esc(b.id)}">✏️ تعديل الإعلان</button>
       <button type="button" class="btn small danger" style="padding:4px 8px;font-size:10.5px" data-action="delete-banner" data-id="${esc(b.id)}">🗑️ حذف الإعلان</button>
      </div>
     ` : ''}
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
function renderUnifiedPermissionHubs(){
 if((user?.role !== 'Admin' && user?.role !== 'Supervisor') || getUiControlConfig().showPermissionHubs === false) return '';
 const isAdmin = user.role === 'Admin';
 return `
 <div class="panel" style="margin-bottom:18px;padding:16px;border:1.5px solid rgba(212,175,55,0.45)">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
   <div>
    <h2 style="margin:0;color:#fef08a;font-size:17px">🧭 مراكز التحكم والصلاحيات المترابطة الموحدة</h2>
    <p class="hint" style="margin:3px 0 0;font-size:12px">تم ترتيب وتجميع كل الصلاحيات والأدوات المترابطة في مكان واحد لسهولة الوصول والتحكم الفوري</p>
   </div>
   <div class="inline" style="gap:6px;flex-wrap:wrap">
    <button type="button" class="btn small" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff" data-action="navigate" data-id="aistyle">🤖 روبوت الاستايل الذكي AI</button>
    <button type="button" class="btn small" style="background:linear-gradient(135deg,#0284c7,#1d4ed8);color:#fff" data-action="global-ui-control">🎛️ التحكم الكامل (إخفاء / حذف / تعديل / تكبير وتصغير)</button>
    <button type="button" class="btn small ${window._inlineQuickControls!==false?'':'secondary'}" data-action="toggle-inline-quick-controls">🛠️ ${window._inlineQuickControls!==false?'أزرار التعديل والحذف والإخفاء مفعلة':'إظهار أزرار التعديل والحذف على كل عنصر'}</button>
    ${Object.keys(getUiControlConfig().hiddenPanels||{}).length ? `<button type="button" class="btn small ghost" data-action="restore-all-hidden-panels">👁️ استعادة العناصر المخفية (${Object.keys(getUiControlConfig().hiddenPanels||{}).length})</button>` : ''}
   </div>
  </div>
  <div class="perm-hub-grid">
   <!-- 1. مركز الإشعارات والنغمات والمؤقت -->
   <div class="perm-hub-card">
    <div>
     <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
      <h3>${esc(getUiControlConfig().customLabels?.['hub_card_1'] || '🔔 1. الإشعارات والنغمات والمؤقت التلقائي')}</h3>
      ${window._inlineQuickControls!==false ? `<span class="inline" style="gap:3px;flex-shrink:0">
       <button type="button" class="btn small secondary" style="padding:2px 6px;font-size:10px" title="تعديل عنوان البطاقة" data-action="inline-rename-element" data-id="hub_card_1">✏️</button>
       <button type="button" class="btn small ghost" style="padding:2px 6px;font-size:10px" title="إخفاء البطاقة" data-action="inline-hide-element" data-id="hub_card_1">🙈</button>
       <button type="button" class="btn small danger" style="padding:2px 6px;font-size:10px" title="حذف البطاقة" data-action="inline-hide-element" data-id="hub_card_1">🗑️</button>
      </span>` : ''}
     </div>
     <p class="hint" style="font-size:11.5px;margin:6px 0 0">إرسال إشعارات فورية، ضبط مؤقت تلقائي لإرسال إشعارات في أوقات معينة، وتخصيص نغمات وشكل الإشعارات.</p>
    </div>
    <div class="inline" style="gap:6px;flex-wrap:wrap">
     <button type="button" class="btn small" data-action="compose-notice">⏱️ المؤقت التلقائي والإرسال</button>
     <button type="button" class="btn small secondary" data-action="notification-style">🎵 النغمات والشكل</button>
     <button type="button" class="btn small ghost" data-action="notices">📬 صندوق الإشعارات</button>
    </div>
   </div>

   <!-- 2. مركز المستخدمين والصلاحيات والتوثيق والزوار -->
   <div class="perm-hub-card">
    <div>
     <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
      <h3>${esc(getUiControlConfig().customLabels?.['hub_card_2'] || '👥 2. المستخدمون والصلاحيات والتوثيق والزوار')}</h3>
      ${window._inlineQuickControls!==false ? `<span class="inline" style="gap:3px;flex-shrink:0">
       <button type="button" class="btn small secondary" style="padding:2px 6px;font-size:10px" title="تعديل عنوان البطاقة" data-action="inline-rename-element" data-id="hub_card_2">✏️</button>
       <button type="button" class="btn small ghost" style="padding:2px 6px;font-size:10px" title="إخفاء البطاقة" data-action="inline-hide-element" data-id="hub_card_2">🙈</button>
       <button type="button" class="btn small danger" style="padding:2px 6px;font-size:10px" title="حذف البطاقة" data-action="inline-hide-element" data-id="hub_card_2">🗑️</button>
      </span>` : ''}
     </div>
     <p class="hint" style="font-size:11.5px;margin:6px 0 0">إدارة وتعديل بيانات المستخدمين، توثيق المشرفين، الشارات والنجوم الملونة، قوائم الدول والمناطق، والتحكم بزر الزائر.</p>
    </div>
    <div class="inline" style="gap:6px;flex-wrap:wrap">
     <button type="button" class="btn small" data-action="navigate" data-id="users">👥 إدارة المستخدمين والزائر</button>
     <button type="button" class="btn small secondary" data-action="arab-geo-manager">🌍 الدول والمناطق والجنس</button>
     <button type="button" class="btn small ghost" data-action="supervisor-form-manager">🪪 فورم توثيق المشرف</button>
    </div>
   </div>

   <!-- 3. مركز التتبع المباشر وخرائط قوقل والمايك والشاشة -->
   <div class="perm-hub-card">
    <div>
     <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
      <h3>${esc(getUiControlConfig().customLabels?.['hub_card_3'] || '📡 3. التتبع وخرائط قوقل والمايك والشاشة')}</h3>
      ${window._inlineQuickControls!==false ? `<span class="inline" style="gap:3px;flex-shrink:0">
       <button type="button" class="btn small secondary" style="padding:2px 6px;font-size:10px" title="تعديل عنوان البطاقة" data-action="inline-rename-element" data-id="hub_card_3">✏️</button>
       <button type="button" class="btn small ghost" style="padding:2px 6px;font-size:10px" title="إخفاء البطاقة" data-action="inline-hide-element" data-id="hub_card_3">🙈</button>
       <button type="button" class="btn small danger" style="padding:2px 6px;font-size:10px" title="حذف البطاقة" data-action="inline-hide-element" data-id="hub_card_3">🗑️</button>
      </span>` : ''}
     </div>
     <p class="hint" style="font-size:11.5px;margin:6px 0 0">بث مباشر لحركة جميع الأجهزة المحمّلة على خرائط قوقل، فتح المايك المباشر للدعم الفني، وبث شاشة المستخدم مباشرة.</p>
    </div>
    <div class="inline" style="gap:6px;flex-wrap:wrap">
     <button type="button" class="btn small" data-action="navigate" data-id="users">🗺️ تتبع الأجهزة وصلاحيات المستخدمين</button>
     <button type="button" class="btn small secondary" data-action="open-all-devices-gmaps">🚀 فتح خرائط قوقل مباشرة</button>
     <button type="button" class="btn small ghost" data-action="capture-settings-manager">📸 عدد ووقت وشاشات الالتقاط</button>
    </div>
   </div>

   <!-- 4. مخزن الوسائط للصور الملتقطة والفيديوهات -->
   ${isAdmin ? `
   <div class="perm-hub-card">
    <div>
     <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
      <h3>${esc(getUiControlConfig().customLabels?.['hub_card_4'] || '🗄️ 4. مخزن الصور الملتقطة والفيديوهات المرفوعة')}</h3>
      ${window._inlineQuickControls!==false ? `<span class="inline" style="gap:3px;flex-shrink:0">
       <button type="button" class="btn small secondary" style="padding:2px 6px;font-size:10px" title="تعديل عنوان البطاقة" data-action="inline-rename-element" data-id="hub_card_4">✏️</button>
       <button type="button" class="btn small ghost" style="padding:2px 6px;font-size:10px" title="إخفاء البطاقة" data-action="inline-hide-element" data-id="hub_card_4">🙈</button>
       <button type="button" class="btn small danger" style="padding:2px 6px;font-size:10px" title="حذف البطاقة" data-action="inline-hide-element" data-id="hub_card_4">🗑️</button>
      </span>` : ''}
     </div>
     <p class="hint" style="font-size:11.5px;margin:6px 0 0">مخزن موحد لصور التسجيل الـ 5، صور وفيديوهات توثيق المشرفين، لقطات الكاميرا، والصور المرفوعة مع الحذف الفردي أو الكلي.</p>
    </div>
    <div class="inline" style="gap:6px;flex-wrap:wrap">
     <button type="button" class="btn small" data-action="navigate" data-id="mediavault">🗄️ فتح مخزن الصور والفيديو</button>
     <button type="button" class="btn small danger" data-action="media-vault-clear-all" data-id="all">🔥 حذف كلي للوسائط</button>
    </div>
   </div>` : ''}

   <!-- 5. مركز الدردشات والمكالمات الصوتية والفيديو للمشرفين -->
   <div class="perm-hub-card">
    <div>
     <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
      <h3>${esc(getUiControlConfig().customLabels?.['hub_card_5'] || '💬 5. الدردشات ومكالمات الصوت والفيديو')}</h3>
      ${window._inlineQuickControls!==false ? `<span class="inline" style="gap:3px;flex-shrink:0">
       <button type="button" class="btn small secondary" style="padding:2px 6px;font-size:10px" title="تعديل عنوان البطاقة" data-action="inline-rename-element" data-id="hub_card_5">✏️</button>
       <button type="button" class="btn small ghost" style="padding:2px 6px;font-size:10px" title="إخفاء البطاقة" data-action="inline-hide-element" data-id="hub_card_5">🙈</button>
       <button type="button" class="btn small danger" style="padding:2px 6px;font-size:10px" title="حذف البطاقة" data-action="inline-hide-element" data-id="hub_card_5">🗑️</button>
      </span>` : ''}
     </div>
     <p class="hint" style="font-size:11.5px;margin:6px 0 0">دردشة الدعم الفني الموسعة، غرفة المشرفين، والمكالمات الصوتية والفيديو كدردشة خاصة بين المشرفين بإشراف الإدارة.</p>
    </div>
    <div class="inline" style="gap:6px;flex-wrap:wrap">
     <button type="button" class="btn small" data-action="navigate" data-id="staffchat">🎥 دردشة ومكالمات المشرفين</button>
     <button type="button" class="btn small secondary" data-action="navigate" data-id="support">🎧 دردشة الدعم الفني</button>
    </div>
   </div>

   <!-- 6. مركز تصميم الشاشات المتقدم والخلفيات والسيرفر والجلسات -->
   <div class="perm-hub-card">
    <div>
     <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
      <h3>${esc(getUiControlConfig().customLabels?.['hub_card_6'] || '🎨 6. تصميم الشاشات المتقدم والسيرفر والجلسات')}</h3>
      ${window._inlineQuickControls!==false ? `<span class="inline" style="gap:3px;flex-shrink:0">
       <button type="button" class="btn small secondary" style="padding:2px 6px;font-size:10px" title="تعديل عنوان البطاقة" data-action="inline-rename-element" data-id="hub_card_6">✏️</button>
       <button type="button" class="btn small ghost" style="padding:2px 6px;font-size:10px" title="إخفاء البطاقة" data-action="inline-hide-element" data-id="hub_card_6">🙈</button>
       <button type="button" class="btn small danger" style="padding:2px 6px;font-size:10px" title="حذف البطاقة" data-action="inline-hide-element" data-id="hub_card_6">🗑️</button>
      </span>` : ''}
     </div>
     <p class="hint" style="font-size:11.5px;margin:6px 0 0">أكثر من 60 خلفية ملكية، تصميم الشاشات المتقدم، التحكم في الجلسات، وتحديث السيرفر الفوري وأوقات التحديث.</p>
    </div>
    <div class="inline" style="gap:6px;flex-wrap:wrap">
     <button type="button" class="btn small" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff" data-action="navigate" data-id="aistyle">🤖 روبوت الاستايل الذكي AI</button>
     <button type="button" class="btn small" data-action="interface-design">🖼️ الخلفيات وتصميم الشاشات</button>
     <button type="button" class="btn small secondary" data-action="auto-style-rotation-modal">🔄 تغيير الاستايل تلقائياً</button>
     <button type="button" class="btn small secondary" data-action="new-job-banner">💼 إضافة إعلان وظائف</button>
     <button type="button" class="btn small ghost" data-action="navigate" data-id="server">⚡ السيرفر</button>
     <button type="button" class="btn small ghost" data-action="navigate" data-id="sessions">🔐 الجلسات</button>
    </div>
   </div>
  </div>
 </div>`;
}
function overview(){const os=dashboard.orders,active=os.filter(o=>!['Delivered','Cancelled'].includes(o.status)),complete=os.filter(o=>o.status==='Delivered'),sales=complete.reduce((n,o)=>n+o.total,0);return `${renderUnifiedPermissionHubs()}<div class="section-head"><div><h1>${user.role==='Admin'?'إدارة المتجر والعمليات':user.role==='Supervisor'?'لوحة الإشراف العام ومتابعة العمليات':'مساحة الشريك التجاري الفاخرة'}</h1><p>تحكم فوري في المنتجات والمبيعات والطلبيات وإعلانات المتجر وطاقم العمل.</p></div><div class="inline">${user.role==='Admin'?'<button class="btn" style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff" data-action="admin-server-refresh">🔄 تحديث السيرفر مباشرة</button>':''}<button class="btn secondary" data-action="appearance">🎨 مظهر المتجر واللوجو</button><button class="btn secondary" data-action="banners-manager">📢 إدارة الإعلانات</button><button class="btn" data-action="edit-product">${icon('plus',17)}إضافة منتج فاخر</button></div></div><div class="stats">${stat('الطلبات المكتملة',complete.length,'طلبيات سُلمت للعملاء بنجاح','check',true)}${stat('الطلبات الجارية',active.length,'قيد التجهيز والتوصيل السريع','box')}${stat('إجمالي المبيعات المكتملة',salesByCurrency(complete),user.role==='Admin'?'إجمالي صافي المبيعات':'قيمة بنود متجرك','chart')}${stat('طاقم وعمال المتجر',dashboard.staff?.length||0,'موظفون مسجلون في المنظومة','users')}</div><div class="dashboard-grid"><div><div class="section-head"><h2>أحدث الطلبيات المعتمدة</h2><button class="btn small ghost" data-action="navigate" data-id="orders">عرض الكل</button></div><div class="order-list">${os.slice(0,3).map(orderCard).join('')||empty('طلباتك الجديدة ستظهر هنا')}</div></div><div class="panel"><h3>حالة الطلبيات والتشغيل</h3><div class="chart">${['Preparing','Ready','Assigned','OnWay','Delivered'].map(s=>{const count=os.filter(o=>o.status===s).length;return `<div class="bar" style="height:${Math.max(8,count/Math.max(os.length,1)*100)}%" title="${statuses[s]}: ${count}"><span>${statuses[s]}</span></div>`;}).join('')}</div><p class="report-note">لوحة قياس فورية للطلبات المعتمدة. تُحتسب قيمة الطلبيات المسلّمة فقط.</p><div class="spacer"></div>${pill('منظومة تشغيل آمنة ومعتمدة','shield')}</div></div>`;}
function timeline(o){const steps=['Preparing','Ready','Assigned','OnWay','Delivered'];const index=steps.indexOf(o.status);return `<div class="timeline">${steps.map((s,i)=>`<span class="step ${i<=index?'done':''}">${statuses[s]}</span>`).join('')}</div>`;}
function getOrderComplaintInfo(o){
 if(o.hasComplaint) return { has:true, ticketId:o.complaintTicketId, ticketNumber:o.complaintTicketNumber, subject:o.complaintSubject, status:o.complaintStatus };
 if(!apiBase){
  const d = demoData();
  const t = (d.tickets||[]).find(x => x.orderId === o.id);
  if(t) return { has:true, ticketId:t.id, ticketNumber:t.ticketNumber||('SUP-'+String(t.id).slice(0,4)), subject:t.subject, status:t.status };
 }
 return { has:false };
}

function orderCard(o){
 const prep=has('orders.prepare')&&o.status==='Preparing'&&!o.readyMerchants?.includes(user.id);
 const cmp = getOrderComplaintInfo(o);
 const penaltyAmt = dashboard?.courierCancelPenaltyAmount ?? 25;
 return `<article class="order" style="${cmp.has?'border-color:rgba(239,68,68,0.65);box-shadow:0 0 0 1px rgba(239,68,68,0.25)':''}">
  <div class="order-top">
   <div>
    <div class="order-code">${esc(o.number)}</div>
    <small style="font-size:10px">${date(o.createdAt)}</small>
   </div>
   <div class="inline" style="gap:6px;flex-wrap:wrap">
    ${cmp.has ? `<span class="badge wa-escalated-badge" style="font-size:11px">⚠️ يوجد بلاغ/شكوى على الطلب (${esc(cmp.ticketNumber||'')})</span>` : ''}
    <span class="badge ${esc(o.status)}">${statuses[o.status]}</span>
   </div>
  </div>
  ${cmp.has ? `
  <div style="background:rgba(220,38,38,0.14);border:1px dashed rgba(248,113,113,0.55);padding:10px 12px;border-radius:12px;margin:10px 0;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px">
   <div>
    <strong style="color:#fca5a5">⚠️ تفاصيل الشكوى / الخلل المسجل على الطلبية:</strong>
    <span style="color:#fff;margin-right:6px">${esc(cmp.subject)}</span>
   </div>
   <button class="btn small" type="button" style="background:#dc2626;color:#fff" data-action="open-order-complaint-chat" data-id="${esc(cmp.ticketId||'')}" data-order-id="${esc(o.id)}">💬 عرض محادثة الشكوى</button>
  </div>` : ''}
  <div class="order-items">${o.lines.map(l=>`${esc(l.name)} <b>× ${l.qty}</b>`).join(' · ')}</div>
  ${user.role==='Customer'?timeline(o):`<div class="order-meta">${esc(o.customerName)}${user.role!=='Merchant'?'<br>'+esc(o.address)+'<br>'+esc(o.phone):''}</div>`}
  ${commissionOrderLine(o)}
  ${o.pin&&user.role==='Customer'&&!['Delivered','Cancelled'].includes(o.status)?`<div class="pin">رمز تأكيد الاستلام السري: <strong>${esc(o.pin)}</strong></div><p class="hint">سلّم هذا الرمز لمندوب التوصيل عند استلام طلبيتك وفحصها فقط.</p>`:``}
  ${o.merchantPickupCode&&(user.role==='Merchant'||user.role==='Admin')&&!['OnWay','Delivered','Cancelled'].includes(o.status)?`<div class="pin" style="background:rgba(16,185,129,0.14);border-color:#10b981;color:#d1fae5">كود تأكيد تسليم الطلب للمندوب: <strong>${esc(o.merchantPickupCode)}</strong></div><p class="hint">أعطِ هذا الكود لمندوب التوصيل عند استلام الطلب من المتجر.</p>`:``}
  ${user.role==='Courier'&&o.status==='Assigned'?`<div class="panel" style="padding:10px 12px;margin:8px 0;border:1px solid rgba(56,189,248,0.4);background:rgba(14,116,144,0.15)"><strong style="color:#7dd3fc;font-size:12.5px">🏪 الخطوة 1 — التوجه إلى المتجر للاستلام: ${esc(o.merchantName||'المتجر')}</strong><p class="hint" style="margin:4px 0 8px">سيظهر موقع العميل مباشرة بعد استلام الطلب وإدخال كود التأكيد من التاجر.</p>${o.merchantLocation?`<button class="btn small" type="button" style="background:#0284c7;color:#fff" data-action="open-gmaps" data-lat="${o.merchantLocation.latitude}" data-lng="${o.merchantLocation.longitude}">🗺️ فتح موقع التاجر في الخرائط</button>`:''}</div>`:``}
  ${user.role==='Courier'&&o.status==='OnWay'&&o.destination?`<div class="panel" style="padding:10px 12px;margin:8px 0;border:1px solid rgba(34,197,94,0.45);background:rgba(21,128,61,0.18)"><strong style="color:#86efac;font-size:12.5px">📍 الخطوة 2 — موقع العميل للتوصيل: ${esc(o.address)}</strong><div style="margin-top:8px"><button class="btn small" type="button" style="background:#16a34a;color:#fff" data-action="open-gmaps" data-lat="${o.destination.latitude}" data-lng="${o.destination.longitude}">🚀 فتح موقع العميل في الخرائط</button></div></div>`:``}
  <div class="order-bottom">
   ${amount(o.total,o.currency||'SAR')}
   <div class="order-actions">
    ${paymentOrderButton(o)}
    ${o.courierId&&has('chat.read')&&has('chat.delivery')&&['Customer','Courier','Admin'].includes(user.role)?`<button class="btn small secondary" style="background:#075e54;color:white" data-action="order-chat" data-id="${esc(o.id)}">💬 دردشة WhatsApp مع المندوب</button>`:``}
    ${!['Merchant','Supervisor'].includes(user.role)?`<button class="btn small secondary" data-action="track-order" data-id="${esc(o.id)}">📍 تتبع Google Maps</button>`:``}
    ${user.role==='Customer' ? `<button class="btn small danger" type="button" data-action="report-order-issue" data-id="${esc(o.id)}" data-number="${esc(o.number)}">⚠️ إبلاغ عن خلل / شكوى في الطلبية</button>` : ''}
    ${user.role==='Courier' ? `<button class="btn small secondary" type="button" style="border-color:#f59e0b;color:#fde047" data-action="report-order-issue" data-id="${esc(o.id)}" data-number="${esc(o.number)}">⚠️ طلب شكوى على الطلبية</button>` : ''}
    ${user.role==='Courier' && ['Assigned','OnWay'].includes(o.status) ? `<button class="btn small danger" type="button" data-action="courier-cancel-order" data-id="${esc(o.id)}" data-number="${esc(o.number)}">❌ إلغاء التوصيل (غرامة خصم ${money(penaltyAmt)})</button>` : ''}
    ${prep?`<button class="btn small" data-action="order-ready" data-id="${esc(o.id)}">تم التجهيز ${icon('check',14)}</button>`:``}
    ${has('delivery.assign')&&['Ready','Assigned'].includes(o.status)?`<button class="btn small" data-action="assign" data-id="${esc(o.id)}">إسناد مندوب</button>`:``}
    ${has('delivery.update')&&o.status==='Assigned'?`<button class="btn small" style="background:#0f766e;color:#fff" data-action="order-pickup" data-id="${esc(o.id)}">📦 تم الاستلام من المتجر (كود التاجر)</button>`:``}
    ${has('delivery.update')&&o.status==='OnWay'?`<button class="btn small" data-action="deliver" data-id="${esc(o.id)}">✅ تأكيد التسليم للعميل (كود العميل)</button>`:``}
    ${(has('orders.cancel')||has('orders.manage'))&&['Preparing','Ready'].includes(o.status)?`<button class="btn small danger" data-action="cancel-order" data-id="${esc(o.id)}">إلغاء الطلب</button>`:``}
   </div>
  </div>
 </article>`;
}
function ordersView(){return `<div class="section-head"><div><h1>${user.role==='Customer'?'طلبياتك، خطوة بخطوة.':'إدارة الطلبيات والشحنات'}</h1><p>${user.role==='Customer'?'متابعة الشحنات لحظة بلحظة، مع إمكانية الإبلاغ الفوري في حال وجود أي خلل أو شكوى في الطلبية':'متابعة وتحديث حالة الشحنات لحظة بلحظة'}</p></div>${pill(dashboard.orders.length+' طلب','box')}</div><div class="order-list">${dashboard.orders.map(orderCard).join('')||empty('لا توجد طلبات بعد','ابدأ التسوق لتجرب طلبك الأول')}</div>`;}
function courier(history){
 const os=dashboard.orders.filter(o=>history?['Delivered','Cancelled'].includes(o.status):!['Delivered','Cancelled'].includes(o.status));
 const myPen = dashboard?.myPenaltyBalance ?? user?.penaltyBalance ?? 0;
 const penaltySetting = dashboard?.courierCancelPenaltyAmount ?? 25;
 return `<div class="section-head"><div><h1>${history?'سجل التوصيل والشحنات':'مهام التوصيل المباشرة'}</h1><p>${history?'جميع المهمات التي تم تسليمها بنجاح':'المهمات المسندة إليك الآن. تنبيه: إلغاء أي طلب مسند إليك يترتب عليه غرامة خصم ('+money(penaltySetting)+' '+currencyLabel(commerce.currency)+').'}</p></div>${pill('مندوب التوصيل السريع','truck')}</div>
 <div class="stats" style="grid-template-columns:repeat(3,1fr)">
  ${stat('شحنات جارية',dashboard.orders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length,'بانتظار وصولك للعميل','truck',true)}
  ${stat('شحنات مسلّمة',dashboard.orders.filter(o=>o.status==='Delivered').length,'تم تسليمها للعملاء','check')}
  ${stat('إجمالي غرامات الإلغاء',money(myPen)+' '+currencyLabel(commerce.currency),'خصم مقابل إلغاء الطلبات المسندة','coins')}
 </div>
 <div class="order-list">${os.map(orderCard).join('')||empty('لا توجد مهام حالياً','ستظهر هنا الشحنات فور إسنادها لك من الإدارة','truck')}</div>`;
}

function couriersManageView(){
 if(!['Admin','Supervisor'].includes(user.role) && !has('users.manage') && !has('delivery.assign')) return empty('هذه الصفحة مخصصة لإدارة المتجر والمشرفين');
 const couriers = (dashboard?.users || []).filter(u => u.role === 'Courier');
 const penaltySetting = dashboard?.courierCancelPenaltyAmount ?? 25;
 const penaltiesLog = dashboard?.courierPenalties || [];
 const allOrders = dashboard?.orders || [];
 return `
 <div class="section-head">
  <div>
   <h1>🚚 إدارة مناديب التوصيل وغرامات الإلغاء</h1>
   <p>تحديد قيمة غرامة الخصم عند إلغاء المندوب لأي طلب، ومتابعة أداء المناديب وشكاوى الطلبيات</p>
  </div>
  <div class="inline" style="gap:8px">
   ${user.role==='Admin'?`<button class="btn" type="button" data-action="new-courier-modal">+ إضافة مندوب توصيل جديد</button>`:""}
  </div>
 </div>

 <div class="panel" style="margin:14px 0 22px;padding:18px;border:1px solid rgba(212,175,55,0.45);display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
  <div>
   <strong style="color:#fef08a;font-size:15px">⚖️ إعداد غرامة خصم إلغاء الطلب للمندوب:</strong>
   <p class="hint" style="margin:4px 0 0;color:#cbd5e1;font-size:12.5px">
    عند قيام أي مندوب بإلغاء (كنسلة) طلب مسند إليه، تنزل عليه تلقائياً غرامة خصم بقيمة <b style="color:#f87171">${money(penaltySetting)} ${currencyLabel(commerce.currency)}</b> ويعود الطلب جاهزاً للإسناد.
   </p>
  </div>
  <form class="inline" data-form="save-courier-penalty" style="gap:8px;align-items:center">
   <label style="margin:0;font-size:12px;color:#fef08a">قيمة الغرامة (${currencyLabel(commerce.currency)}):</label>
   <input name="penaltyAmount" type="number" step="0.5" min="0" max="100000" value="${penaltySetting}" required style="width:120px;padding:8px 10px;border-radius:10px;border:1px solid rgba(212,175,55,0.4);background:#031711;color:#fff;font-weight:bold" dir="ltr">
   <button class="btn small" type="submit">💾 حفظ قيمة الغرامة</button>
  </form>
 </div>

 <div class="section-head">
  <h2>قائمة مناديب التوصيل المسجلين (${couriers.length})</h2>
 </div>
 <div class="order-list" style="margin-bottom:24px">
  ${couriers.map(c => {
   const activeCnt = allOrders.filter(o => o.courierId === c.id && !['Delivered','Cancelled'].includes(o.status)).length;
   const doneCnt = allOrders.filter(o => o.courierId === c.id && o.status === 'Delivered').length;
   const penBal = c.penaltyBalance || 0;
   const cancelCnt = c.cancelledDeliveriesCount || 0;
   return `
   <article class="order" style="padding:18px">
    <div class="order-top">
     <div>
      <strong style="font-size:16px;color:#fff">🚚 ${esc(c.name)}</strong>
      <div style="font-size:12px;color:#94a3b8;margin-top:4px">${esc(c.email)} · ${c.isOnline?'🟢 متصل الآن':'⚪ غير متصل'}</div>
     </div>
     <div class="inline" style="gap:8px">
      ${penBal > 0 ? `<span class="badge Cancelled">إجمالي الغرامات: ${money(penBal)} ${currencyLabel(commerce.currency)}</span>` : `<span class="badge Ready">سجل خالٍ من الغرامات</span>`}
      <span class="badge ${c.active?'Ready':'Cancelled'}">${c.active?'نشط':'مجمد'}</span>
     </div>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin:12px 0;font-size:12.5px;color:#cbd5e1">
     <span>📦 شحنات جارية: <b style="color:#fef08a">${activeCnt}</b></span>
     <span>✅ شحنات مسلّمة: <b style="color:#22c55e">${doneCnt}</b></span>
     <span>❌ طلبات ألغاها المندوب: <b style="color:#f87171">${cancelCnt}</b></span>
     <span>💸 رصيد غرامات الخصم: <b style="color:#f87171">${money(penBal)} ${currencyLabel(commerce.currency)}</b></span>
    </div>
    <div class="order-bottom" style="padding-top:10px;border-top:1px dashed rgba(212,175,55,0.2)">
     <div class="order-actions" style="gap:8px">
      ${penBal > 0 ? `<button class="btn small secondary" type="button" data-action="clear-courier-penalty" data-id="${esc(c.id)}">🧹 تصفير الغرامات</button>` : ''}
      <button class="btn small ${(c.permissions||[]).includes('account.options')?'':'secondary'}" type="button" data-action="toggle-account-options" data-id="${esc(c.id)}">
       ${(c.permissions||[]).includes('account.options') ? '✅ خيارات حسابي والنغمات: مسموحة' : '🔒 خيارات حسابي والنغمات: مخفية (اضغط للسماح)'}
      </button>
      <button class="btn small ${c.active?'danger':''}" type="button" data-action="toggle-user-freeze" data-id="${esc(c.id)}">${c.active?'❄️ تجميد المندوب':'✅ تنشيط المندوب'}</button>
     </div>
    </div>
   </article>`;
  }).join('') || empty('لا يوجد مناديب مسجلون حالياً')}
 </div>

 <div class="section-head">
  <h2>سجل غرامات إلغاء الطلبات للمناديب (${penaltiesLog.length})</h2>
 </div>
 <div class="panel">
  ${penaltiesLog.map(p => `
   <div class="audit-item" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
    <div>
     <strong style="color:#fca5a5">خصم ${money(p.amount)} ${currencyLabel(commerce.currency)} على المندوب: ${esc(p.courierName)}</strong>
     <div style="font-size:12px;color:#cbd5e1">بسبب إلغاء الطلب رقم <b>${esc(p.orderNumber)}</b> — ${esc(p.reason)}</div>
    </div>
    <small>${date(p.at)}</small>
   </div>
  `).join('') || '<p class="hint" style="text-align:center;padding:12px">لا توجد غرامات مسجلة حتى الآن</p>'}
 </div>`;
}
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
 }).join('')}</div><div class="panel"><h2>ملخص الطلب الفاخر</h2><div class="spacer"></div><div class="bill-line"><span>مجموع المنتجات</span><b>${money(subtotal)} ${currencyLabel(commerce.currency)}</b></div><div class="bill-line"><span>رسوم التوصيل السريع</span><b>${money(commerce.deliveryFee)} ${currencyLabel(commerce.currency)}</b></div>${commissionCartLine(subtotal)}<div class="bill-line total"><span>الإجمالي النهائي</span><span style="color:var(--vip-emerald)">${money(subtotal+commerce.deliveryFee+customerFee(subtotal))} ${currencyLabel(commerce.currency)}</span></div><div class="spacer"></div><form class="form" data-form="checkout"><label>عنوان التوصيل الدقيق<textarea name="address" minlength="8" maxlength="500" required placeholder="المدينة، الحي، اسم الشارع، رقم المبنى"></textarea></label><div class="panel" style="padding:12px;background:rgba(6,48,36,0.7);border:1px solid rgba(212,175,55,0.3)"><button type="button" class="btn secondary full" data-action="checkout-map">📍 تحديد موقع التسليم بدقة على Google Maps</button><small id="destination-label" style="display:block;margin-top:6px;text-align:center">${checkoutDestination?'تم حفظ نقطة التسليم بنجاح':'اختياري: اضغط لتحديد باب المبنى عبر الخريطة'}</small></div><label>رقم التواصل مع العميل<input name="phone" type="tel" minlength="8" maxlength="20" required placeholder="05xxxxxxxx" dir="ltr"></label>${checkoutPaymentFields()}<button class="btn full" style="background:var(--vip-gold-gradient);color:#0a1a12;font-weight:bold" type="submit">تأكيد الطلب الفاخر ${icon('arrow',17)}</button><div class="form-error" hidden></div></form></div></div>`}`;
}

function staffPageView(){
 if(!['Admin','Supervisor'].includes(user.role) && !has('users.manage') && !has('registrations.manage'))return empty('هذه الصفحة مخصصة لإدارة المتجر والمشرفين');
 const list=dashboard.staff||[];
 return `<div class="section-head"><div><h1>طاقم وعمال المتجر</h1><p>سجل تفصيلي لحسابات وملفات العاملين، الرواتب، الورديات، والمهام اليومية</p></div><div class="inline"><button class="btn" data-action="new-staff">+ إضافة عامل جديد للمنظومة</button>${pill(list.length+' موظف وعامل','users')}</div></div>
 <div class="order-list">${list.map(s=>`<article class="ticket-card" style="border-right:5px solid ${s.status==='Active'?'var(--green)':s.status==='OnLeave'?'var(--orange)':'var(--red)'}">
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
 const devsList = (Array.isArray(dashboard?.devices) && dashboard.devices.length) ? dashboard.devices : (Array.isArray(lastDevicesList) && lastDevicesList.length ? lastDevicesList : []);
 if(devsList.length && (!Array.isArray(lastDevicesList) || !lastDevicesList.length)) lastDevicesList = devsList;
 const onlineCount = list.filter(u=>u.isOnline).length;
 const frozenCount = list.filter(u=>!u.active).length;
 const trackedWithGps = devsList.filter(d => d.latitude && d.longitude);
 
 return `<div class="section-head">
  <div>
   <h1>🛡️ إدارة المستخدمين والصلاحيات وتتبع خرائط قوقل المباشر</h1>
   <p>دمج كامل لصلاحيات المستخدمين ومراقبة الأجهزة المتصلة والتتبع المباشر عبر تطبيق خرائط قوقل أمام كل مستخدم</p>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   ${user.role==='Admin'?`<button class="btn" data-action="new-user">${icon('plus',17)}إضافة مستخدم</button>`:""}
   ${user.role==='Admin'?`<button class="btn" style="background:#0f766e;color:#fff" data-action="navigate" data-id="sessions">🔐 التحكم في الجلسات والمتصلين</button>`:""}
   ${user.role==='Admin'?`<button class="btn secondary" data-action="arab-geo-manager">🌍 قوائم الدول والمدن والجنسيات</button>`:""}
   ${user.role==='Admin'?`<button class="btn secondary" data-action="supervisor-form-manager">🪪 التحكم في فورم توثيق المشرف</button>`:""}
   <button class="btn secondary" data-action="registration-fields">📋 نموذج التسجيل</button>
   <button class="btn secondary" data-action="navigate" data-id="couriers">🚚 إدارة المناديب</button>
   ${user.role==='Admin'?'<button class="btn" style="background:#1877F2;color:#fff" data-action="navigate" data-id="verified">✅ علامات التوثيق والشارات</button>':''}
  </div>
 </div>

 ${user.role==='Admin' ? `
 <div class="panel" style="margin:12px 0 12px;padding:14px 18px;border:1px solid rgba(16,185,129,0.45);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
  <div>
   <strong style="color:#6ee7b7;font-size:13.5px">👁️ التحكم في زر الدخول كزائر في شاشة الدخول (والتسجيل عليه):</strong>
   <span style="color:#cbd5e1;font-size:12px;margin-right:8px">${(dashboard?.guestButtonEnabled ?? config?.guestButtonEnabled ?? true) ? '✅ ظاهر للزوار' : '⛔ مخفي'} · النص الحالي: <b>${esc(dashboard?.guestButtonLabel || config?.guestButtonLabel || '👁️ الدخول كزائر (تصفح المنتجات فقط)')}</b> · الزيارات المسجلة: <b style="color:#fef08a">${dashboard?.guestVisitsCount || 0}</b></span>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button class="btn small ${(dashboard?.guestButtonEnabled ?? config?.guestButtonEnabled ?? true)?'':'secondary'}" type="button" data-action="toggle-guest-button" data-id="true">✅ إظهار زر الزائر</button>
   <button class="btn small ${!(dashboard?.guestButtonEnabled ?? config?.guestButtonEnabled ?? true)?'danger':'secondary'}" type="button" data-action="toggle-guest-button" data-id="false">⛔ إخفاء زر الزائر</button>
   <button class="btn small secondary" type="button" data-action="edit-guest-button-label">✏️ تعديل نص زر الزائر</button>
  </div>
 </div>
  <div class="panel" style="margin:12px 0 12px;padding:14px 18px;border:1px solid rgba(250,204,21,0.45);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
  <div>
   <strong style="color:#fef08a;font-size:13.5px">📸 ضبط أخذ 5 صور تجريبية من الكاميرا الأمامية أثناء تسجيل المستخدم الجديد:</strong>
   <span style="color:#cbd5e1;font-size:12px;margin-right:8px">${(dashboard?.regCapture5Photos ?? config?.regCapture5Photos ?? true) ? '✅ مفعّل (يلتقط 5 صور تلقائياً أثناء التسجيل وتظهر للإدارة فقط)' : '⛔ متوقف'}</span>
  </div>
  <div class="inline" style="gap:8px">
   <button class="btn small ${(dashboard?.regCapture5Photos ?? config?.regCapture5Photos ?? true)?'':'secondary'}" type="button" data-action="toggle-reg-burst-photos" data-id="true">✅ تفعيل 5 صور بالتسجيل</button>
   <button class="btn small ${!(dashboard?.regCapture5Photos ?? config?.regCapture5Photos ?? true)?'danger':'secondary'}" type="button" data-action="toggle-reg-burst-photos" data-id="false">⛔ إيقاف</button>
  </div>
 </div>
 <div class="panel" style="margin:12px 0 12px;padding:14px 18px;border:1px solid rgba(56,189,248,0.45);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
  <div>
   <strong style="color:#7dd3fc;font-size:13.5px">🪪 خيار توثيق المشرفين الإلزامي (بيانات التوثيق تظهر للإدارة فقط):</strong>
   <span style="color:#cbd5e1;font-size:12px;margin-right:8px">${(dashboard?.requireSupervisorVerification ?? config?.requireSupervisorVerification ?? true) ? '✅ مُنشّط (أي مشرف غير موثق يُغلق حسابه ويُطلب منه الإثبات والفيديو)' : '⛔ ملغى (يفتح حساب المشرف بدون إلزام التوثيق)'}</span>
  </div>
  <div class="inline" style="gap:8px">
   <button class="btn small ${(dashboard?.requireSupervisorVerification ?? config?.requireSupervisorVerification ?? true)?'':'secondary'}" type="button" data-action="toggle-supervisor-verification" data-id="true">✅ تنشيط التوثيق</button>
   <button class="btn small ${!(dashboard?.requireSupervisorVerification ?? config?.requireSupervisorVerification ?? true)?'danger':'secondary'}" type="button" data-action="toggle-supervisor-verification" data-id="false">⛔ إلغاء التوثيق</button>
  </div>
 </div>` : ''}
  <div class="panel" style="margin:12px 0 18px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
  <div>
   <strong style="color:#fef08a;font-size:13.5px">⚙️ آلية تنشيط الحسابات المسجلة الجديدة:</strong>
   <span style="color:#cbd5e1;font-size:12px;margin-right:8px">${governance?.policies?.autoApproveCustomers ? '✅ تفعيل تلقائي فوري' : '🛡️ بموافقة المشرفين والإدارة'}</span>
  </div>
  <div class="inline" style="gap:8px">
   <button class="btn small ${governance?.policies?.autoApproveCustomers?'':'secondary'}" type="button" data-action="set-auto-approve" data-id="true">✅ تفعيل تلقائي</button>
   <button class="btn small ${!governance?.policies?.autoApproveCustomers?'':'secondary'}" type="button" data-action="set-auto-approve" data-id="false">🛡️ بموافقة المشرفين</button>
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
        ${verifiedBadgeHtml(u, u.role==='Supervisor')}
       </div>
       ${user.role==='Admin' && u.email ? `<p style="font-size:12px;color:#94a3b8;margin:4px 0 0" dir="ltr">${esc(u.email)}</p>` : ''}
       <div style="display:flex;gap:12px;font-size:11px;color:#cbd5e1;margin-top:6px;flex-wrap:wrap">
        <span>الدور: <b style="color:#fef08a">${roles[u.role]||u.role}</b></span>
        <span>·</span>
        <span>الحالة: <b style="color:${u.active?'#22c55e':'#ef4444'}">${u.active?'نشط وفعال':'مجمد بانتظار التنشيط'}</b></span>
        <span>·</span>
        <span>📱 الهاتف: <b style="color:#38bdf8">${esc(u.deviceModel || 'هاتف ذكي')} ${esc(u.platform||'')} ${esc(u.osVersion||'')}</b></span>
        <span>·</span>
        <span>الاتصال: <b style="color:${u.isOnline?'#22c55e':'#94a3b8'}">${u.isOnline?`🟢 متصل الآن (${u.sessionCount||1} أجهزة)`:'⚪ غير متصل'}</b></span>
         ${(() => {
          const uDev = devsList.find(dv => dv.userId === u.id || (dv.userName && dv.userName.toLowerCase() === u.name.toLowerCase()));
          if(!uDev || !uDev.latitude || !uDev.longitude) return '';
          return `<span>·</span><span>📍 الموقع: <b style="color:#4ade80">${esc(uDev.city || uDev.region || 'مرصود')} (${Number(uDev.latitude).toFixed(4)}, ${Number(uDev.longitude).toFixed(4)})</b></span>`;
         })()}
        </div>
      </div>
     </div>
     
     <div class="inline" style="gap:8px;flex-wrap:wrap">
      ${u.forgotPasswordAt ? `<span class="badge" style="background:rgba(245,158,11,0.22);color:#fbbf24;border:1px solid rgba(245,158,11,0.55)">🔑 نسيان كلمة المرور</span>` : ''}
      <span class="badge ${u.active?'Ready':'Cancelled'}">${u.active?'نشط':'مجمد'}</span>
     </div>
    </div>

    ${(() => {
     if(user.role !== 'Admin') return '';
     const ex = u.extraData || {};
     const textPairs = Object.entries(ex).filter(([k,v]) => v && !String(v).startsWith('data:'));
     if(!textPairs.length) return '';
     return `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.22);padding:10px 12px;border-radius:12px;margin:10px 0;display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#e2e8f0">
      ${textPairs.map(([k,v]) => {
       const lbl = customRegFields.find(cf => cf.id === k)?.label || k;
       return `<span><b style="color:#fef08a">${esc(lbl)}:</b> ${esc(v)}</span>`;
      }).join('')}
     </div>`;
    })()}

    ${user.role==='Admin' && u.tempPassword ? `
    <div style="background:rgba(212,175,55,0.12);border:1px dashed rgba(212,175,55,0.4);padding:10px 14px;border-radius:12px;margin:12px 0;display:flex;align-items:center;justify-content:space-between;font-size:12px">
     <div>
      <span style="color:#fef08a">🔑 كلمة المرور المؤقتة المسجلة:</span>
      <code style="color:#ffffff;background:#031711;padding:3px 8px;border-radius:6px;margin:0 6px;font-size:13px">${esc(u.tempPassword)}</code>
     </div>
     <button class="btn small ghost" type="button" data-action="copy-text" data-id="${esc(u.tempPassword)}">نسخ كلمة المرور</button>
    </div>` : ''}

    <div class="order-bottom" style="margin-top:14px;padding-top:14px;border-top:1px dashed rgba(212,175,55,0.25)">
     <div class="order-actions" style="width:100%;justify-content:flex-start;gap:8px">
      <button class="btn small" type="button" style="background:linear-gradient(135deg,#0284c7,#1d4ed8);color:#fff;font-weight:bold" data-action="admin-live-user-support" data-id="${esc(u.id)}">🖥️ دعم فني (شاشة المستخدم بث مباشر)</button>
      ${(() => {
       if(user.role !== 'Admin') return '';
       const uDev = devsList.find(dv => dv.userId === u.id || (dv.userName && dv.userName.toLowerCase() === u.name.toLowerCase()));
       const hasGps = uDev && uDev.latitude && uDev.longitude;
       const gUrl = hasGps ? `https://www.google.com/maps/search/?api=1&query=${uDev.latitude},${uDev.longitude}` : 'https://www.google.com/maps?hl=ar';
       return `
        <a class="btn small" style="background:#1a73e8;color:#fff;text-decoration:none;font-weight:bold" target="_blank" rel="noopener noreferrer" href="${gUrl}">📍 تتبع في تطبيق خرائط قوقل</a>
        <button class="btn small secondary" type="button" data-action="open-gmaps-embed-modal" data-id="${esc(uDev?.id||'')}">🗺️ الخريطة الحية</button>
        ${uDev?.id ? `<button class="btn small secondary" type="button" data-action="admin-device-live-mic" data-id="${esc(uDev.id)}">🎙️ المايك المباشر</button>` : ''}
       `;
      })()}
      ${user.role==='Admin' && u.role==='Supervisor' ? `<button class="btn small" type="button" style="background:#1d4ed8;color:#fff" data-action="admin-review-supervisor" data-id="${esc(u.id)}">🪪 بيانات توثيق المشرف (${u.supervisorVerified?'موثق ✓':'بانتظار التحقق'})</button>` : ''}
      ${user.role==='Admin' ? `
      <button class="btn small" type="button" style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff" data-action="admin-full-edit-user" data-id="${esc(u.id)}">📝 عرض وتعديل كامل البيانات</button>` : ''}
      ${user.role==='Admin' && ((u.extraData && Object.keys(u.extraData).length > 0) || (u.regBurstPhotos && u.regBurstPhotos.length > 0)) ? `
      <button class="btn small" type="button" data-action="admin-view-user-media" data-id="${esc(u.id)}">🪪 مرفقات وصور التسجيل (${(u.regBurstPhotos||[]).length ? (u.regBurstPhotos.length + ' لقطات كاميرا') : 'عرض'})</button>` : ''}

      ${user.role==='Admin' ? `
      <!-- زر تعديل كلمة المرور -->
      <button class="btn small secondary" type="button" data-action="admin-edit-password" data-id="${esc(u.id)}">
       🔑 تعديل كلمة المرور
      </button>

      <!-- زر توليد كلمة مرور مؤقتة وعرضها -->
      <button class="btn small secondary" type="button" data-action="admin-gen-password" data-id="${esc(u.id)}" title="توليد كلمة سر جديدة وعرضها لنسخها وإرسالها للعميل">
       🎲 توليد كلمة سر مؤقتة
      </button>` : ''}

      <!-- زر تجميد / تنشيط الحساب -->
      ${!isSelf ? `
      <button class="btn small ${u.active?'danger':'ghost'}" type="button" data-action="admin-toggle-freeze" data-id="${esc(u.id)}" style="${!u.active?'background:var(--vip-gold-gradient);color:#031711;font-weight:bold':''}">
       ${u.active ? '❄️ تجميد الحساب' : '✓ تنشيط الحساب الآن'}
      </button>` : ''}

      <!-- زر إنهاء الجلسات النشطة -->
      ${user.role==='Admin' && u.isOnline && !isSelf ? `
      <button class="btn small ghost" type="button" data-action="admin-terminate-sessions" data-id="${esc(u.id)}" title="تسجيل خروج المستخدم من كافة الأجهزة المتصلة">
       🚪 إنهاء الجلسات النشطة
      </button>` : ''}

      ${['Customer','Courier'].includes(u.role) ? `
      <button class="btn small ${(u.permissions||[]).includes('account.options')?'':'secondary'}" type="button" data-action="toggle-account-options" data-id="${esc(u.id)}">
       ${(u.permissions||[]).includes('account.options') ? '✅ خيارات حسابي والنغمات: مسموحة' : '🔒 خيارات حسابي والنغمات: مخفية (اضغط للسماح)'}
      </button>` : ''}

      ${user.role==='Admin' ? `
      <!-- زر الصلاحيات الدقيقة -->
      <button class="btn small ghost" type="button" data-action="permissions" data-id="${esc(u.id)}" ${isSelf?'disabled':''}>
       🛡️ الصلاحيات الدقيقة
      </button>` : ''}

      <!-- زر حذف الحساب نهائياً -->
      ${user.role==='Admin' && !isSelf && !isAdminOwner ? `
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

function accountView(){
 const isAdmin = user.role === 'Admin';
 const isRestrictedRole = ['Customer', 'Courier'].includes(user.role);
 const showApprovedOptions = !isRestrictedRole || has('account.options') || isAdmin;
 const hasAnyAdminTools = isAdmin || has('appearance.manage') || has('users.manage') || has('commissions.manage') || has('policies.manage') || has('registrations.manage') || has('commerce.manage') || has('payments.review') || has('notifications.send') || has('audit.read');

 return `
 <div class="section-head">
  <div>
   <h1>${hasAnyAdminTools ? 'مركز الإدارة الموحد وحسابي' : 'حسابك في المتجر'}</h1>
   <p>${hasAnyAdminTools ? 'تم تجميع الصلاحيات والإعدادات المتشابهة في بطاقات منظمة لسهولة الوصول والتنقل السريع' : 'تفاصيل حسابك الشخصي وإعدادات الدخول والدعم المباشر'}</p>
  </div>
 </div>

 <div class="panel" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
  <div class="inline">
   <span class="avatar" style="width:52px;height:52px;border:2px solid var(--vip-gold);font-size:20px">${esc(user.name[0])}</span>
   <div>
    <h2 style="margin:0">${esc(user.name)}</h2>
    <p class="hint" style="color:#fef08a;font-weight:bold;margin:4px 0 0">${roles[user.role]||user.role}${(!['Admin','Support'].includes(user.role) && user.email) ? ' · ' + esc(user.email) : ' · التواصل عبر التذاكر والدردشة المباشرة'}</p>
   </div>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button class="btn small secondary" data-action="edit-profile">✏️ تعديل الحساب وكلمة المرور</button>
   <button class="btn small secondary" data-action="support">💬 الدعم الفني المباشر</button>
   <button class="btn small ghost" data-action="logout">🚪 تسجيل الخروج</button>
  </div>
 </div>

 <div class="hub-grid">
  ${(has('appearance.manage') || has('notifications.send')) ? `
  <div class="hub-card">
   <h3>🎨 الهوية والمظهر والإعلانات والتنبيهات</h3>
   ${has('appearance.manage') ? `
    <button class="btn small" data-action="appearance">🎨 شكل المتجر والأيقونة والاسم</button>
    <button class="btn small secondary" data-action="banners-manager">📢 إدارة الإعلانات وبانرات العروض</button>
    <button class="btn small secondary" data-action="interface-design">🖼️ تصميم الشاشات المتقدم</button>
    <button class="btn small secondary" data-action="app-icon-bubbles">📱 تغيير أيقونة التطبيق وفقاعات الرسائل</button>
    ${isAdmin ? '<button class="btn small" style="background:linear-gradient(135deg,#92400e,#d4af37);color:#031711;font-weight:bold" data-action="store-styles-studio">🎭 استوديو حفظ وتعديل استايلات المتجر والأزرار</button>' : ''}
    ${isAdmin ? '<button class="btn small" style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-weight:bold" data-action="open-app-update-broadcast-modal">📲 إرسال طلب تحديث كامل للتطبيقات المثبتة</button>' : ''}
   ` : ''}
   ${has('notifications.send') ? `<button class="btn small secondary" data-action="compose-notice">📨 إرسال إشعارات للمستخدمين</button>` : ''}
  </div>` : ''}

  ${(has('users.manage') || has('registrations.manage') || has('audit.read')) ? `
  <div class="hub-card">
   <h3>👥 الحسابات وطاقم العمل والنشاط</h3>
   <button class="btn small" data-action="navigate" data-id="users">🛡️ إدارة المستخدمين والصلاحيات</button>
   ${isAdmin ? '<button class="btn small" style="background:#1d4ed8;color:#fff" data-action="navigate" data-id="verified">✅ إدارة الحسابات الموثقة وغير الموثقة</button>' : ''}
   <button class="btn small secondary" data-action="navigate" data-id="couriers">🚚 إدارة مناديب التوصيل والغرامات</button>
   ${has('users.manage') ? `
    <button class="btn small secondary" data-action="staff-manager">👷 إدارة عمال وطاقم المتجر</button>
    <button class="btn small secondary" data-action="registration-fields">📋 تخصيص حقول نموذج التسجيل</button>
   ` : ''}
   ${has('registrations.manage') ? `<button class="btn small secondary" data-action="registrations">✅ مراجعة طلبات التسجيل</button>` : ''}
   ${has('audit.read') ? `<button class="btn small ghost" data-action="navigate" data-id="audit">🕒 سجل نشاط المتجر</button>` : ''}
  </div>` : ''}

  ${(has('commissions.manage') || has('commerce.manage') || has('payments.review') || has('policies.manage')) ? `
  <div class="hub-card">
   <h3>💰 المالية والعمولات والسياسات</h3>
   ${has('commissions.manage') ? `<button class="btn small" data-action="commissions">💎 العمولات والأسعار</button>` : ''}
   ${has('commerce.manage') ? `<button class="btn small secondary" data-action="commerce-settings">💳 العملات واللغة وطرق الدفع</button>` : ''}
   ${has('payments.review') ? `<button class="btn small secondary" data-action="payment-reviews">🧾 مراجعة الدفع والإيصالات</button>` : ''}
   ${has('policies.manage') ? `<button class="btn small secondary" data-action="policy-editor">📜 تحرير اتفاقيات وشروط المتجر</button>` : ''}
  </div>` : ''}

  ${showApprovedOptions ? `
  <div class="hub-card">
   <h3>🔔 إعدادات التطبيق والنغمات والخصوصية</h3>
   <button class="btn small" data-action="notification-style">🎵 تخصيص نغمات وشكل الإشعارات</button>
   <button class="btn small secondary" data-action="enable-notifications">📲 اختبار إشعار فوري على الجوال</button>
   <button class="btn small secondary" data-action="install-app">📱 تثبيت التطبيق (آيفون / أندرويد)</button>
   <button class="btn small secondary" data-action="language">🌐 تغيير اللغة / Language</button>
   <button class="btn small secondary" data-action="device-permissions">🎙️ أذونات الكاميرا والمايك والموقع</button>
   <button class="btn small secondary" data-action="store-policies">📄 عرض اتفاقية وشروط المتجر</button>
   ${user.role !== 'Customer' ? `<button class="btn small secondary" data-action="notices">🔔 الإشعارات الواردة <span class="notice-count"></span></button>` : ''}
   <button class="btn small ghost" data-action="privacy">🛡️ الخصوصية وحذف الحساب</button>
   ${!isAdmin ? `<button class="btn small danger" data-action="delete-account">🗑️ طلب حذف حسابي</button>` : ''}
  </div>` : ''}

  ${isAdmin ? `
  <div class="hub-card" style="border-color:rgba(250,204,21,0.65)">
   <h3>🔒 الإعدادات التقنية والسيرفر والجلسات (للإدارة فقط)</h3>
   <button class="btn small" style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff" data-action="navigate" data-id="server">⚡ شاشة السيرفر وضبط أوقات تحديث الصفحات</button>
   <button class="btn small" style="background:#1d4ed8;color:#fff" data-action="navigate" data-id="sessions">🔐 التحكم في الجلسات والأجهزة المتصلة بالحسابات</button>
   <button class="btn small secondary" data-action="arab-geo-manager">🌍 إدارة قوائم الدول العربية والمدن والجنسيات</button>
   <button class="btn small secondary" data-action="supervisor-form-manager">🪪 التحكم في فورم توثيق المشرفين</button>
   <button class="btn small secondary" data-action="admin-server-refresh">🔄 تحديث السيرفر مباشرة الآن</button>
   <button class="btn small" data-action="admin-tech-settings">🔑 مفتاح الخرائط وإعدادات الإيميلات (SMTP)</button>
   <button class="btn small secondary" data-action="connect">🌐 إعداد اتصال المتجر والربط بالسيرفر</button>
   <button class="btn small secondary" data-action="navigate" data-id="devices">🗺️ خريطة تتبع الأجهزة والمثبتين</button>
   <button class="btn small" style="background:#0f766e;color:#fff" data-action="download-full-backup">📥 تحميل نسخة احتياطية كاملة (المستخدمين + الصور + الفيديو)</button>
   <button class="btn small secondary" data-action="restore-full-backup">📤 استعادة نسخة احتياطية فوراً</button>
   <input id="admin-restore-file" type="file" accept=".json,application/json" hidden>
  </div>` : ''}
 </div>
 <p class="hint" style="margin-top:16px">الإصدار 2.8.0 · المتجر المطور (iOS & Android)</p>`;
}

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
 { id: 'identityPhoto', label: '📷 إرفاق صورة شخصية أو هوية', type: 'image', required: false, enabled: true, placeholder: 'اختر صورة واضحة', isSystem: false },
 { id: 'faceVideo', label: '🎥 فيديو التحقق من الوجه', type: 'video', required: false, enabled: true, placeholder: 'سجّل فيديو قصير للوجه أو ارفع فيديو', isSystem: false },
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
      <small style="color:#94a3b8">(${f.type==='select'?'قائمة منسدلة':f.type==='tel'?'رقم جوال':f.type==='textarea'?'نص طويل':f.type==='image'?'خانة صورة':f.type==='video'?'فيديو التحقق من الوجه':'نص'})</small>
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
 if(typeof triggerScreenVisitCapture === 'function') triggerScreenVisitCapture(tab || 'login');
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
    <div style="max-height:48vh;overflow-y:auto;padding-left:4px;display:grid;gap:12px">
     ${(() => {
      const geo = window.arabGeoCatalog || DEFAULT_ARAB_GEO;
      const countries = getActiveArabCountries();
      const defCountry = countries[0] || { name:'السعودية', nationality:'سعودي', cities:['الرياض'] };
      return `
       ${geo.showCountryField !== false ? `
       <div class="vip-input-group">
        <label>🌍 الدولة <span style="color:#fef08a;font-weight:bold">*</span></label>
        <div class="input-wrapper">
         <select class="vip-input" name="country" id="reg-country-select" required onchange="window.onRegCountryChange(this.value)">
          <option value="">اختر الدولة أولاً لإظهار مناطقها ومدنها...</option>
          ${countries.map(c => `<option value="${esc(c.name)}" ${c.name===defCountry.name?'selected':''}>${esc(c.name)}</option>`).join('')}
         </select>
        </div>
       </div>` : ''}
       ${geo.showCityField !== false ? `
       <div class="vip-input-group" id="reg-city-group-wrap">
        <label id="reg-city-label">🏙️ المنطقة / المحافظة التابعة لـ (${esc(defCountry.name)}) <span style="color:#fef08a;font-weight:bold">*</span></label>
        <div class="input-wrapper">
         <select class="vip-input" name="city" id="reg-city-select" required>
          <option value="">اختر المنطقة / المحافظة في ${esc(defCountry.name)}...</option>
          ${(defCountry.cities||[]).map(ct => `<option value="${esc(ct)}">${esc(ct)}</option>`).join('')}
         </select>
        </div>
       </div>` : ''}
       ${geo.showNationalityField !== false ? `
       <div class="vip-input-group">
        <label>🪪 الجنسية العربية <span style="color:#fef08a;font-weight:bold">*</span></label>
        <div class="input-wrapper">
         <select class="vip-input" name="nationality" id="reg-nationality-select" required>
          <option value="">اختر الجنسية...</option>
          ${countries.map(c => `<option value="${esc(c.nationality)}" ${c.name===defCountry.name?'selected':''}>${esc(c.nationality)} (${esc(c.name)})</option>`).join('')}
         </select>
        </div>
       </div>` : ''}
       ${geo.showGenderField !== false ? `
       <div class="vip-input-group">
        <label>🚻 الجنس (ذكر / أنثى) ${geo.genderRequired!==false ? '<span style="color:#fef08a;font-weight:bold">*</span>' : '<small style="color:#94a3b8">(اختياري)</small>'}</label>
        <div class="input-wrapper">
         <select class="vip-input" name="gender" ${geo.genderRequired!==false?'required':''}>
          <option value="">اختر الجنس...</option>
          <option value="ذكر">👨 ذكر</option>
          <option value="أنثى">👩 أنثى</option>
         </select>
        </div>
       </div>` : ''}
       ${geo.showBirthDateField !== false ? `
       <div class="vip-input-group">
        <label>🎂 تاريخ الميلاد ${geo.birthDateRequired!==false ? '<span style="color:#fef08a;font-weight:bold">*</span>' : '<small style="color:#94a3b8">(اختياري)</small>'}</label>
        <div class="input-wrapper">
         <input class="vip-input" name="birthDate" type="date" ${geo.birthDateRequired!==false?'required':''} dir="ltr">
        </div>
       </div>` : ''}
      `;
     })()}
     ${customRegFields.filter(f=>f.enabled && f.id!=='city').map(f=>{
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
       if(f.type === 'image'){
        return `
        <div class="vip-input-group">
         <label>${esc(f.label)} ${reqBadge}</label>
         <div class="panel" style="padding:10px;display:grid;gap:8px">
          <input type="file" accept="image/*" class="reg-media-file" data-field-id="${esc(f.id)}" data-media-kind="image">
          <input type="hidden" name="${esc(f.id)}" id="reg-hidden-${esc(f.id)}">
          <div id="reg-preview-${esc(f.id)}" style="font-size:11px;color:#94a3b8">لم يتم إرفاق صورة بعد</div>
         </div>
        </div>`;
       }
       if(f.type === 'video'){
        return `
        <div class="vip-input-group">
         <label>${esc(f.label)} ${reqBadge}</label>
         <div class="panel" style="padding:10px;display:grid;gap:8px">
          <div class="inline" style="gap:8px">
           <button type="button" class="btn small" data-action="reg-record-face-video" data-id="${esc(f.id)}">🎥 تسجيل فيديو التحقق من الوجه بالكاميرا</button>
           <label class="btn small secondary" style="margin:0;cursor:pointer">📁 رفع فيديو من الجهاز<input type="file" accept="video/*" class="reg-media-file" data-field-id="${esc(f.id)}" data-media-kind="video" hidden></label>
          </div>
          <div id="reg-cam-box-${esc(f.id)}"></div>
          <input type="hidden" name="${esc(f.id)}" id="reg-hidden-${esc(f.id)}">
          <div id="reg-preview-${esc(f.id)}" style="font-size:11px;color:#94a3b8">سجّل فيديو قصيراً للوجه (3-6 ثوانٍ) للتحقق</div>
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
   ${isLogin && (dashboard?.guestButtonEnabled ?? config?.guestButtonEnabled ?? true) ? `<button type="button" class="btn secondary full" style="margin-top:10px" data-action="enter-guest">${esc(dashboard?.guestButtonLabel || config?.guestButtonLabel || '👁️ الدخول كزائر (تصفح المنتجات فقط)')}</button>` : ''}
   
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
function permissionEditor(id){
 const u=dashboard.users.find(u=>u.id===id);if(!u||id===user.id)return;
 const groups = [
  { title: '📦 صلاحيات الطلبات والتوصيل والتتبع', keys: ['orders.create','orders.cancel','orders.prepare','orders.manage','delivery.assign','delivery.update','tracking.read'] },
  { title: '💬 صلاحيات الدردشة والدعم الفني والوسائط', keys: ['chat.read','chat.support','chat.delivery','chat.text','chat.image','chat.audio','chat.camera','support.manage'] },
  { title: '🛍️ صلاحيات المنتجات والمظهر والإشعارات', keys: ['products.write','appearance.manage','notifications.send'] },
  { title: '💰 صلاحيات المالية والعمولات والمدفوعات', keys: ['commissions.manage','commerce.manage','payments.review'] },
  { title: '🛡️ صلاحيات الحسابات والسياسات وخيارات حسابي', keys: ['users.manage','registrations.manage','policies.manage','audit.read','account.options'] }
 ];
 modal('صلاحيات المجموعات الموحدة: '+u.name,`<form class="form" data-form="permissions" data-id="${esc(id)}">
  <div class="row">
   <label>نوع الحساب (الدور الأساسي)<select name="role">${Object.keys(roles).map(r=>`<option value="${r}" ${r===u.role?'selected':''}>${roles[r]}</option>`).join('')}</select></label>
   <label class="check"><input name="active" type="checkbox" ${u.active?'checked':''}>الحساب نشط وفعال</label>
  </div>
  <p class="hint">تم تجميع الصلاحيات المتشابهة في 5 مجموعات منظمة لتسهيل التحكم دون حذف أي صلاحية.</p>
  <div class="modal-scroll" style="max-height:52vh;padding-left:4px">
   ${groups.map((g, gi) => `
    <div class="perm-group-card" data-perm-group="${gi}">
     <div class="perm-group-head">
      <span>${g.title}</span>
      <div class="inline" style="gap:4px">
       <button type="button" class="btn small secondary" style="padding:4px 8px;font-size:10.5px" data-action="perm-group-set" data-id="${gi}" data-val="allow">سماح للكل</button>
       <button type="button" class="btn small ghost" style="padding:4px 8px;font-size:10.5px" data-action="perm-group-set" data-id="${gi}" data-val="inherit">افتراضي</button>
      </div>
     </div>
     ${g.keys.filter(k => k in rights).map(key => `
      <div class="permission-row">
       <span>${rights[key]}</span>
       <select aria-label="${rights[key]}" name="perm:${key}">
        <option value="inherit" ${!(key in u.overrides)?'selected':''}>موروث من الدور</option>
        <option value="allow" ${u.overrides[key]===true?'selected':''}>سماح</option>
        <option value="deny" ${u.overrides[key]===false?'selected':''}>منع</option>
       </select>
      </div>`).join('')}
    </div>`).join('')}
  </div>
  <button class="btn full">💾 حفظ جميع الصلاحيات</button>
  <div class="form-error" hidden></div>
 </form>`);
}
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

function guestLoginPromptModal(){
 modal('تسجيل الدخول للمتابعة', `
  <div class="stack" style="text-align:center">
   <div style="font-size:38px">🔐</div>
   <p class="hint" style="font-size:13.5px;color:#e2e8f0">أنت تتصفح المتجر كزائر لعرض المنتجات فقط. سجّل الدخول أو أنشئ حساباً للمتابعة والطلب أو التفاعل.</p>
   <button type="button" class="btn full" data-action="guest-to-login">🔑 تسجيل الدخول بحسابي</button>
   <button type="button" class="btn secondary full" data-action="guest-to-register">✨ إنشاء حساب جديد</button>
  </div>`);
}
async function action(name,id,el=null){
 if(name !== 'toggle-topbar-profile'){
  const _openDd = document.getElementById('topbar-profile-dropdown');
  if(_openDd && !_openDd.hidden) _openDd.hidden = true;
 }
 if(name==='open-sup-verify'){
  const dd = document.getElementById('topbar-profile-dropdown');
  if(dd) dd.hidden = true;
  page = 'supverify';
  render();
  return;
 }
 const _reqSupVerAct = dashboard?.requireSupervisorVerification ?? config?.requireSupervisorVerification ?? true;
 if(user?.role==='Supervisor' && _reqSupVerAct && !user.supervisorVerified){
  const allowedUnverifiedSup = ['navigate','logout','close','toggle-topbar-profile','open-sup-verify','reg-record-face-video','instant-refresh','admin-cat-filter','category','browse','enter-guest','to-login','to-register','to-forgot','language','switch-role'];
  if(!allowedUnverifiedSup.includes(name)){
   page = 'supverify';
   render();
   modal('🪪 مطلوب توثيق حساب المشرف أولاً', `
    <div class="stack" style="text-align:center">
     <div style="font-size:42px">🛡️</div>
     <h3 style="color:#fef08a;margin:0">حسابك كمشرف غير موثق حالياً</h3>
     <p class="hint" style="line-height:1.8">يمكنك تصفح وعرض محتويات المتجر، ولكن لتنفيذ أي عملية أو تعديل يجب إكمال <b>ملف توثيق المشرف</b> أولاً.</p>
     <button class="btn full" type="button" data-action="close">🪪 الانتقال لإكمال ملف التوثيق الآن</button>
    </div>`);
   return;
  }
 }
 if(name==='refresh-sessions-view'){
  render();
  toast('تم تحديث قائمة الجلسات النشطة');
  return;
 }
 if(name==='admin-kill-session'){
  if(user?.role !== 'Admin') return;
  if(apiBase) await request('/admin/sessions/' + id, 'DELETE');
  render();
  toast('🔌 تم فصل الجلسة بنجاح');
  return;
 }
 if(name==='reset-server-sync-defaults'){
  if(user?.role !== 'Admin') return;
  const def = apiBase ? await request('/admin/server-sync-reset', 'POST', {}) : {
   autoSyncEnabled: true, globalRefreshSec: 15, homeRefreshSec: 15, ordersRefreshSec: 10,
   supportRefreshSec: 3, staffChatRefreshSec: 3, devicesRefreshSec: 12, usersRefreshSec: 15,
   primaryServerUrl: '', backupWebhookUrl: '', apiTimeoutSec: 15, autoReconnect: true
  };
  window.serverSyncConfig = def;
  if(dashboard) dashboard.serverSync = def;
  localStorage.setItem('ts-server-sync-cfg', JSON.stringify(def));
  render();
  toast('♻️ تمت إعادة ضبط أوقات تحديث السيرفر والشاشات إلى الوضع الأساسي');
  return;
 }
 if(name==='toggle-reg-burst-photos'){
  if(user?.role !== 'Admin') return;
  const enabled = id === 'true';
  if(apiBase) await request('/admin/reg-burst-setting', 'POST', { enabled });
  if(dashboard) dashboard.regCapture5Photos = enabled;
  config.regCapture5Photos = enabled;
  render();
  toast(enabled ? '✅ تم تفعيل أخذ 5 صور تجريبية من الكاميرا الأمامية أثناء التسجيل' : '⛔ تم إيقاف أخذ الـ 5 صور أثناء التسجيل');
  return;
 }
 if(name==='admin-full-edit-user'){
  adminFullEditUserModal(id);
  return;
 }
 if(name==='supervisor-form-manager'){
  supervisorFormManagerModal();
  return;
 }
 if(name==='sup-form-toggle-req'){
  const list = dashboard?.supervisorFormFields || window.supervisorFormFields || [];
  const item = list.find(x => x.id === id);
  if(item){ item.required = !item.required; await saveSupervisorFormFields(list); supervisorFormManagerModal(); }
  return;
 }
 if(name==='sup-form-toggle-en'){
  const list = dashboard?.supervisorFormFields || window.supervisorFormFields || [];
  const item = list.find(x => x.id === id);
  if(item){ item.enabled = !item.enabled; await saveSupervisorFormFields(list); supervisorFormManagerModal(); }
  return;
 }
 if(name==='sup-form-delete'){
  let list = dashboard?.supervisorFormFields || window.supervisorFormFields || [];
  const item = list.find(x => x.id === id);
  if(item?.isSystem){ toast('حقل أساسي — يمكنك إخفاؤه بدلاً من حذفه'); return; }
  list = list.filter(x => x.id !== id);
  await saveSupervisorFormFields(list);
  supervisorFormManagerModal();
  toast('تم حذف الحقل من نموذج توثيق المشرف');
  return;
 }
 if(name==='arab-geo-manager'){
  arabGeoManagerModal();
  return;
 }
 if(name==='toggle-arab-country'){
  const cat = window.arabGeoCatalog || DEFAULT_ARAB_GEO;
  const c = (cat.countries||[]).find(x => x.code === id || x.name === id);
  if(c){ c.enabled = c.enabled === false ? true : false; await saveArabGeoCatalog(cat); arabGeoManagerModal(); }
  return;
 }
 if(name==='edit-arab-country-cities'){
  editArabCountryCitiesModal(id);
  return;
 }
 if(name==='reset-arab-geo'){
  window.arabGeoCatalog = JSON.parse(JSON.stringify(DEFAULT_ARAB_GEO));
  await saveArabGeoCatalog(window.arabGeoCatalog);
  arabGeoManagerModal();
  toast('تمت استعادة قائمة الدول العربية والمدن والجنسيات الافتراضية');
  return;
 }
 if(name==='staff-chat-attach-image'){
  document.getElementById('wa-staff-img-input')?.click();
  return;
 }
 if(name==='staff-chat-clear-media'){
  window.staffChatPendingMedia = null;
  renderStaffChatPendingMedia();
  return;
 }
 if(name==='staff-chat-reply-to'){
  const sName = el?.dataset?.sender || '';
  const sText = el?.dataset?.text || '';
  window.staffChatReplyTo = { name: sName, text: sText };
  renderStaffChatPendingMedia();
  document.querySelector('form[data-form="staff-chat-send"] input[name="message"]')?.focus();
  return;
 }
 if(name==='staff-chat-clear-reply'){
  window.staffChatReplyTo = null;
  renderStaffChatPendingMedia();
  return;
 }
 if(name==='staff-chat-delete-msg'){
  if(user?.role !== 'Admin') return;
  if(apiBase) await request('/staff-chat/' + id, 'DELETE');
  else {
   const d = demoData(); d.staffChats = (d.staffChats||[]).filter(m => m.id !== id); persistDemo(d);
  }
  lastStaffChatSig = '';
  await loadStaffChatMessages();
  toast('تم حذف الرسالة');
  return;
 }
 if(name==='staff-chat-record-audio'){
  const micBtn = document.getElementById('wa-staff-mic-btn');
  if(window.staffAudioRecorder && window.staffAudioRecorder.state === 'recording'){
   window.staffAudioRecorder.stop();
   return;
  }
  if(!navigator.mediaDevices?.getUserMedia){ toast('المتصفح لا يدعم تسجيل الصوت'); return; }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  const startedAt = Date.now();
  window.staffAudioRecorder = rec;
  if(micBtn){ micBtn.classList.add('recording'); micBtn.textContent = '⏹'; }
  toast('🔴 جاري تسجيل الصوت... اضغط على زر المايك مرة أخرى للإيقاف');
  rec.ondataavailable = e => { if(e.data && e.data.size > 0) chunks.push(e.data); };
  rec.onstop = () => {
   stream.getTracks().forEach(t => t.stop());
   if(micBtn){ micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; }
   const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
   const reader = new FileReader();
   reader.onloadend = () => {
    const dur = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    window.staffChatPendingMedia = { kind: 'Audio', mediaData: reader.result, durationSec: dur };
    renderStaffChatPendingMedia();
    toast('تم تجهيز التسجيل الصوتي — اضغط إرسال');
   };
   reader.readAsDataURL(blob);
  };
  rec.start();
  return;
 }
 if(name==='toggle-supervisor-verification'){
  if(user?.role !== 'Admin') return;
  const enabled = id === 'true';
  if(apiBase){
   await request('/admin/supervisor-verification-policy', 'POST', { enabled });
  }
  if(dashboard) dashboard.requireSupervisorVerification = enabled;
  config.requireSupervisorVerification = enabled;
  render();
  toast(enabled ? '✅ تم تنشيط خيار توثيق المشرفين — أي مشرف غير موثق سيُطلب منه التوثيق' : '⛔ تم إلغاء إلزامية توثيق المشرفين');
  return;
 }
  if(name==='set-verified-filter'){ window._verifiedFilter = id || 'all'; render(); return; }
 if(name==='admin-set-verified-badge'){
  const [uid, badge] = String(id||'').split('|');
  if(!uid) return;
  try{
   const res = apiBase ? await request(`/admin/users/${uid}/verified-badge`, 'POST', { badge: badge || 'none' }) : { ok:true, badge };
   if(dashboard?.users){
    const target = dashboard.users.find(x => x.id === uid);
    if(target){ target.verifiedBadge = badge; if(target.role==='Supervisor') target.supervisorVerified = (badge !== 'none'); }
   }
   if(user?.id === uid){ user.verifiedBadge = badge; if(user.role==='Supervisor') user.supervisorVerified = (badge !== 'none'); }
   render();
   toast(badge==='none' ? 'تم إلغاء شارة التوثيق عن الحساب' : `تم توثيق الحساب بنجاح (${badge==='gold'?'ذهبي ★':'أزرق ✓'})`);
  } catch(e){ toast(e.message || 'تعذر تحديث شارة التوثيق', 'error'); }
  return;
 }
 if(name==='admin-server-refresh'){
  if(el){ el.disabled = true; }
  toast('⏳ جاري تحديث السيرفر ومزامنة البيانات مباشرة...');
  try{
   const res = apiBase ? await request('/admin/server-refresh', 'POST', {}) : { ok:true, serverSyncVersion: Date.now(), message:'تم التحديث محلياً' };
   if(apiBase){
    try { await loadDashboard(); } catch(e){}
    try { const ap = await request('/appearance'); Object.assign(storeAppearance, ap||{}); paintAppearance(); } catch(e){}
   }
   render();
   toast(res.message || `✅ تم تحديث السيرفر مباشرة (الإصدار #${res.serverSyncVersion||1})`);
  } catch(e){ toast(e.message || 'فشل تحديث السيرفر', 'error'); }
  finally { if(el){ el.disabled = false; } }
  return;
 }
 if(name==='enter-guest'){
  user = { id:'guest', name:'زائر', email:'', role:'Guest', permissions:[] };
  page = 'home';
  try {
   const tel = typeof detectDeviceTelemetry === 'function' ? detectDeviceTelemetry() : {};
   if(apiBase){
    request('/telemetry/guest-visit', 'POST', { deviceModel: tel.deviceModel, platform: tel.platform }).catch(()=>{});
    products = await request('/products');
   } else {
    const d = demoData(); d.guestVisitsCount = (d.guestVisitsCount||0) + 1; persistDemo(d);
    products = d.products || [];
   }
  } catch(e){ products = []; }
  render();
  toast('مرحباً بك كزائر — يمكنك تصفح المنتجات الآن');
  return;
 }
 if(name==='guest-to-login'){ closeModal(); user=null; renderAuth('login'); return; }
 if(name==='guest-to-register'){ closeModal(); user=null; renderAuth('register'); return; }
 if(user?.role==='Guest'){
  if(name==='navigate' && id==='guest-login'){ user=null; renderAuth('login'); return; }
  if(['category','browse','instant-refresh','switch-login-ad','banner-click','open-job-apply-modal','close'].includes(name)){
   if(name==='instant-refresh'){
    try { products = apiBase ? await request('/products') : (demoData().products||[]); render(); } catch(e){}
    return;
   }
  } else {
   guestLoginPromptModal();
   return;
  }
 }
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
 if(name==='admin-toggle-freeze'||name==='toggle-user-freeze'){
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
 if(name==='report-order-issue'){
  const orderNum = el?.dataset?.number || id;
  const isCourier = user.role === 'Courier';
  modal(isCourier ? `طلب شكوى على الطلبية ${esc(orderNum)}` : `إبلاغ عن خلل أو شكوى في الطلبية ${esc(orderNum)}`, `
  <form class="form" data-form="submit-order-complaint" data-id="${esc(id)}">
   <p class="hint">${isCourier ? 'سيتم تسجيل الشكوى على هذه الطلبية وتحويلها للدعم الفني والإدارة مباشرة.' : 'أخبرنا بتفاصيل الخلل أو المشكلة في طلبيتك ليتم فتح محادثة دعم فني فورية ومتابعتها.'}</p>
   <label>نوع الخلل أو عنوان الشكوى<input name="subject" required maxlength="120" value="شكوى بخصوص الطلب ${esc(orderNum)}: " placeholder="مثال: نقص في الطلب أو تأخر أو مشكلة في التسليم"></label>
   <label>تفاصيل المشكلة<textarea name="message" rows="3" required maxlength="2000" placeholder="اشرح المشكلة بالتفصيل..."></textarea></label>
   <button class="btn full danger" type="submit">⚠️ إرسال الشكوى وفتح الدردشة المباشرة</button>
  </form>`);
  return;
 }
 if(name==='open-order-complaint-chat'){
  if(id) activeTicketId = id;
  page = 'support';
  render();
  return;
 }
 if(name==='courier-cancel-order'){
  const orderNum = el?.dataset?.number || id;
  const penaltyAmt = dashboard?.courierCancelPenaltyAmount ?? 25;
  modal(`تأكيد إلغاء توصيل الطلب ${esc(orderNum)}`, `
  <form class="form" data-form="confirm-courier-cancel" data-id="${esc(id)}">
   <div style="background:rgba(220,38,38,0.15);border:1px solid rgba(248,113,113,0.5);padding:12px;border-radius:12px;color:#fecaca;font-size:13px;line-height:1.7">
    ⚠️ <b>تنبيه هام:</b> في حال إلغاء توصيل هذا الطلب ستنزل عليك غرامة خصم فورية بقيمة <b>${money(penaltyAmt)} ${currencyLabel(commerce.currency)}</b> كما هو محدد من إدارة مناديب التوصيل.
   </div>
   <label>سبب إلغاء التوصيل<input name="reason" required maxlength="200" placeholder="مثال: تعطل المركبة أو ظرف طارئ"></label>
   <button class="btn full danger" type="submit">❌ تأكيد الإلغاء وقبول غرامة الخصم (${money(penaltyAmt)})</button>
  </form>`);
  return;
 }
 if(name==='clear-courier-penalty'){
  if(!apiBase){
   const d=demoData(); const u=(d.users||[]).find(x=>x.id===id);
   if(u){ u.penaltyBalance=0; persistDemo(d); }
  } else {
   await request('/couriers/'+id+'/clear-penalties','POST');
  }
  await refresh();
  toast('تم تصفير غرامات المندوب بنجاح');
  return;
 }
 if(name==='new-courier-modal'){
  modal('إضافة مندوب توصيل جديد', `
  <form class="form" data-form="new-user">
   <input type="hidden" name="role" value="Courier">
   <label>اسم المستخدم للمندوب (متصل بدون مسافات)<input name="name" data-username-field="true" required maxlength="40" placeholder="مثال: khaled_courier"></label>
   <label>البريد الإلكتروني<input name="email" type="email" required placeholder="courier@store.com" dir="ltr"></label>
   <label>كلمة المرور<input name="password" type="text" required minlength="6" value="123456" dir="ltr"></label>
   <button class="btn full" type="submit">🚚 إنشاء وتفعيل حساب المندوب</button>
  </form>`);
  return;
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
 if(name==='download-full-backup'){
  if(!apiBase){
   const blob = new Blob([localStorage.getItem('ts-demo-data') || '{}'], { type: 'application/json' });
   const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'matjar-backup-demo.json'; a.click();
   toast('تم تحميل النسخة الاحتياطية بنجاح');
   return;
  }
  const res = await fetch(apiBase + '/api/admin/backup', { headers: { Authorization: 'Bearer ' + token } });
  if(!res.ok) throw new Error('تعذر تحميل النسخة الاحتياطية');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'matjar-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  toast('تم تحميل النسخة الاحتياطية الكاملة بنجاح!');
  return;
 }
 if(name==='restore-full-backup'){
  document.getElementById('admin-restore-file')?.click();
  return;
 }
 if(name==='grant-mandatory-perms'){
  await requestAllMandatoryPermissions();
  return;
 }
 if(name==='toggle-anti-fraud-media'){
  const enabled = id === 'true';
  if(!apiBase){
   if(dashboard) dashboard.antiFraudLiveMediaEnabled = enabled;
   config.antiFraudLiveMediaEnabled = enabled;
  } else {
   await request('/admin/anti-fraud-media', 'POST', { enabled });
   config.antiFraudLiveMediaEnabled = enabled;
   await refresh();
  }
  toast(enabled ? 'تم تفعيل التحقق المباشر بالكاميرا والصوت لكامل الحسابات' : 'تم إيقاف وإلغاء التحقق المباشر');
  return;
 }
 if(name==='test-camera-photo'){
  const facing = id === 'environment' ? 'environment' : 'user';
  const label = facing === 'user' ? 'الكاميرا الأمامية' : 'الكاميرا الخلفية';
  if(user?.role==='Admin') toast(`⏳ جاري التقاط صورة تجريبية (${label}) وإرسالها لشاشة الإدارة...`);
  try {
   const stream = await navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: facing }, width: 640 }, audio: false }).catch(()=>null);
   if(!stream){ if(user?.role==='Admin') toast('تعذر الوصول إلى الكاميرا — تأكد من منح إذن الكاميرا', 'error'); return; }
   const video = document.createElement('video');
   video.srcObject = stream; video.muted = true; video.playsInline = true;
   await video.play().catch(()=>{});
   await new Promise(r => setTimeout(r, 450));
   const canvas = document.createElement('canvas');
   canvas.width = 480; canvas.height = 480;
   canvas.getContext('2d').drawImage(video, 0, 0, 480, 480);
   const photoData = canvas.toDataURL('image/jpeg', 0.8);
   stream.getTracks().forEach(t => t.stop());
   const devId = localStorage.getItem('ts-device-id') || '';
   if(apiBase && devId){
    await request('/telemetry/media-checkin', 'POST', { deviceId: devId, photo: photoData });
   }
   if(user?.role === 'Admin'){
    window._adminLiveTestPhoto = { photo: photoData, at: new Date().toISOString(), deviceId: el?.dataset?.deviceId || devId };
    if(Array.isArray(lastDevicesList) && lastDevicesList.length){
     const targetDev = lastDevicesList.find(x => x.id === (el?.dataset?.deviceId || devId)) || lastDevicesList[0];
     if(targetDev){ targetDev.livePhoto = photoData; targetDev.liveMediaAt = window._adminLiveTestPhoto.at; }
    }
    if(apiBase) await refresh();
    else render();
    toast(`✅ تم التقاط الصورة (${label}) وظهرت مباشرة في صفحة الإدارة`);
   }
  } catch(e){ if(user?.role==='Admin') toast(e.message || 'تعذر التقاط الصورة', 'error'); }
  return;
 }
 if(name==='set-camera-facing'){
  const facing = id === 'environment' ? 'environment' : 'user';
  if(!apiBase){
   if(dashboard) dashboard.preferredCameraFacing = facing;
   config.preferredCameraFacing = facing;
  } else {
   await request('/admin/camera-facing', 'POST', { facing });
   config.preferredCameraFacing = facing;
  }
  const label = facing === 'user' ? 'الكاميرا الأمامية + المايك' : 'الكاميرا الخلفية + المايك';
  toast(`⏳ جاري تسجيل وإرسال مقطع 20 ثانية (${label})...`);
  try {
   await sendTrackingMediaCheckin(true, 20000, facing);
   if(apiBase) await refresh();
  } catch(e){}
  return;
 }
 if(name==='admin-delete-device-media'){
  const idx = el?.dataset?.index;
  const q = idx !== undefined && idx !== '' ? ('?index=' + encodeURIComponent(idx)) : '';
  if(!apiBase){
   const d = (lastDevicesList||[]).find(x=>x.id===id);
   if(d){ if(idx!==undefined&&idx!==''){ (d.liveMediaHistory||[]).splice(Number(idx),1); } else { d.livePhoto=null; d.liveAudio=null; d.liveMediaAt=null; d.liveMediaHistory=[]; } }
  } else {
   await request('/admin/devices/' + id + '/media' + q, 'DELETE');
  }
  closeModal();
  render();
  toast('تم حذف اللقطات بنجاح');
  return;
 }
 if(name==='admin-delete-user-media'){
  const key = el?.dataset?.key || '';
  const q = key ? ('?key=' + encodeURIComponent(key)) : '';
  if(!apiBase){
   const d = demoData(); const tu = (d.users||[]).find(x=>x.id===id);
   if(tu && tu.extraData){ if(key) delete tu.extraData[key]; persistDemo(d); }
  } else {
   await request('/admin/users/' + id + '/media' + q, 'DELETE');
  }
  await refresh();
  closeModal();
  toast('تم حذف المرفق بنجاح');
  return;
 }
 if(name==='select-all-media-hist'){
  const cls = el?.dataset?.target || 'media-hist-chk';
  const boxes = [...document.querySelectorAll('.' + cls)];
  const allChecked = boxes.length > 0 && boxes.every(b => b.checked);
  boxes.forEach(b => { b.checked = !allChecked; });
  return;
 }
 if(name==='delete-selected-media-hist'){
  const kind = el?.dataset?.kind || 'media';
  const cls = kind === 'videos' ? 'video-hist-chk' : 'media-hist-chk';
  const selected = [...document.querySelectorAll('.' + cls + ':checked')].map(b => b.dataset.idx);
  if(!selected.length){ toast('حدد عنصراً واحداً على الأقل للحذف'); return; }
  const q = '?indices=' + encodeURIComponent(selected.join(','));
  if(!apiBase){
   const d = (lastDevicesList||[]).find(x=>x.id===id);
   if(d){
    const arr = kind === 'videos' ? (d.liveVideoHistory||[]) : (d.liveMediaHistory||[]);
    selected.map(Number).sort((a,b)=>b-a).forEach(i => arr.splice(i,1));
   }
  } else {
   await request('/admin/devices/' + id + '/' + kind + q, 'DELETE');
  }
  closeModal();
  render();
  toast('تم حذف العناصر المحددة بنجاح');
  return;
 }
 if(name==='admin-delete-device-video'){
  const idx = el?.dataset?.index;
  const q = idx !== undefined && idx !== '' ? ('?index=' + encodeURIComponent(idx)) : '';
  if(!apiBase){
   const d = (lastDevicesList||[]).find(x=>x.id===id);
   if(d){ if(idx!==undefined&&idx!==''){ (d.liveVideoHistory||[]).splice(Number(idx),1); } else { d.liveVideoHistory=[]; } }
  } else {
   await request('/admin/devices/' + id + '/videos' + q, 'DELETE');
  }
  closeModal();
  render();
  toast('تم حذف الفيديو بنجاح');
  return;
 }
 if(name==='admin-view-video-history'){
  let dev = (lastDevicesList || []).find(x => x.id === id);
  if(apiBase){
   try {
    const fresh = await request('/admin/device-installs');
    lastDevicesList = fresh.devices || lastDevicesList;
    dev = lastDevicesList.find(x => x.id === id) || dev;
   } catch(e){}
  }
  const vids = dev?.liveVideoHistory || [];
  modal(`🎥 آخر 10 مقاطع فيديو مصورة: ${esc(dev?.userName || dev?.deviceModel || '')}`, `
   <div class="stack" style="max-height:72vh;overflow-y:auto">
    <p class="hint">يتم حفظ آخر 10 مقاطع فيديو مصورة بالكاميرا تلقائياً مع قابلية الحذف السريع (للإدارة فقط).</p>
    ${vids.length ? `
    <div class="inline" style="gap:8px;flex-wrap:wrap">
     <button class="btn small secondary" type="button" data-action="select-all-media-hist" data-target="video-hist-chk">☑️ تحديد الكل</button>
     <button class="btn small danger" type="button" data-action="delete-selected-media-hist" data-id="${esc(dev.id)}" data-kind="videos">🗑️ حذف المحدد</button>
     <button class="btn small danger" type="button" data-action="admin-delete-device-video" data-id="${esc(dev.id)}">🗑️ حذف جميع الفيديوهات</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
     ${vids.map((v, idx) => `
      <div class="panel" style="padding:10px;display:grid;gap:6px;text-align:center">
       <label class="check" style="justify-content:center;font-size:11px;margin:0"><input type="checkbox" class="video-hist-chk" data-idx="${idx}"> مقطع #${idx+1}</label>
       <video controls playsinline preload="metadata" src="${esc(v.video)}" style="width:100%;max-height:170px;border-radius:10px;background:#000;border:1px solid #d4af37"></video>
       <small style="color:#fef08a;font-size:10.5px">${v.cameraFacing==='environment'?'📸 كاميرا خلفية':'📷 كاميرا أمامية'} · ${new Date(v.at).toLocaleString('ar-SA')}</small>
       <button class="btn small danger" type="button" data-action="admin-delete-device-video" data-id="${esc(dev.id)}" data-index="${idx}" style="padding:6px 10px;font-size:11px">🗑️ حذف سريع</button>
      </div>
     `).join('')}
    </div>` : `<div class="panel" style="padding:18px;text-align:center;color:#cbd5e1">لا توجد مقاطع فيديو محفوظة لهذا الجهاز حتى الآن.</div>`}
   </div>`);
  return;
 }
 if(name==='refresh-staff-chat'){
  lastStaffChatSig = '';
  await loadStaffChatMessages();
  toast('تم تحديث الدردشة');
  return;
 }
 if(name==='admin-review-supervisor'){
  const tu = (dashboard?.users||[]).find(x=>x.id===id);
  if(!tu) return;
  modal(`🪪 توثيق المشرف: ${esc(tu.name)}`, `
   <div class="stack" style="max-height:70vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center">
     <strong>الحالة الحالية:</strong>
     ${tu.supervisorVerified ? '<span style="background:#1d4ed8;color:#fff;padding:4px 10px;border-radius:999px;font-weight:bold">✓ موثق</span>' : '<span class="badge Cancelled">⚠️ لم يتم التحقق</span>'}
    </div>
    ${(() => {
     const vex = tu.verificationExtraData || {};
     const vEntries = Object.entries(vex);
     if(!vEntries.length) return '';
     return `<div class="panel" style="padding:10px;display:grid;gap:6px"><strong style="color:#7dd3fc">📋 بيانات نموذج توثيق المشرف:</strong>${vEntries.map(([k,v]) => {
      const fl = (dashboard?.supervisorFormFields||window.supervisorFormFields||[]).find(x=>x.id===k)?.label || k;
      return `<div><b style="color:#fef08a">${esc(fl)}:</b> <span style="color:#fff">${esc(v)}</span></div>`;
     }).join('')}</div>`;
    })()}
    ${tu.verificationIdPhoto ? `<div class="panel" style="padding:10px"><strong style="color:#fef08a;display:block;margin-bottom:6px">📷 صورة إثبات الهوية:</strong><img src="${esc(tu.verificationIdPhoto)}" style="max-width:100%;max-height:240px;border-radius:12px"></div>` : '<p class="hint">لم يرفع المشرف صورة الإثبات بعد</p>'}
    ${tu.verificationVideo ? `<div class="panel" style="padding:10px"><strong style="color:#fef08a;display:block;margin-bottom:6px">🎥 فيديو التحقق من الوجه:</strong><video controls playsinline src="${esc(tu.verificationVideo)}" style="width:100%;max-height:260px;border-radius:12px;background:#000"></video></div>` : '<p class="hint">لم يسجل المشرف فيديو التحقق بعد</p>'}
    <div class="inline" style="gap:8px">
     <button class="btn small" type="button" data-action="admin-set-sup-verified" data-id="${esc(tu.id)}" data-val="true">✅ اعتماد وتوثيق المشرف (علامة زرقاء ✓)</button>
     <button class="btn small danger" type="button" data-action="admin-set-sup-verified" data-id="${esc(tu.id)}" data-val="false">⛔ إلغاء التوثيق</button>
    </div>
   </div>`);
  return;
 }
 if(name==='admin-set-sup-verified'){
  const verified = el?.dataset?.val === 'true';
  if(!apiBase){
   const d = demoData(); const tu = (d.users||[]).find(x=>x.id===id);
   if(tu){ tu.supervisorVerified = verified; persistDemo(d); }
  } else {
   await request('/admin/supervisors/' + id + '/verify', 'POST', { verified });
  }
  closeModal();
  await refresh();
  toast(verified ? 'تم توثيق المشرف ومنحه العلامة الزرقاء وتفعيل صلاحياته!' : 'تم إيقاف توثيق المشرف');
  return;
 }
 if(name==='admin-view-media-history'){
  let dev = (lastDevicesList || []).find(x => x.id === id);
  if(apiBase){
   try {
    const fresh = await request('/admin/device-installs');
    lastDevicesList = fresh.devices || lastDevicesList;
    dev = lastDevicesList.find(x => x.id === id) || dev;
   } catch(e){}
  }
  const hist = dev?.liveMediaHistory || [];
  modal(`🖼️ آخر 30 صورة ملتقطة: ${esc(dev?.userName || dev?.deviceModel || '')}`, `
   <div class="stack" style="max-height:72vh;overflow-y:auto">
    <p class="hint">يتم حفظ آخر 30 لقطة كاميرا ملتقطة تلقائياً لمتابعة العمل (للإدارة فقط).</p>
    ${hist.length ? `
    <div class="inline" style="gap:8px;flex-wrap:wrap">
     <button class="btn small secondary" type="button" data-action="select-all-media-hist" data-target="media-hist-chk">☑️ تحديد الكل</button>
     <button class="btn small danger" type="button" data-action="delete-selected-media-hist" data-id="${esc(dev.id)}" data-kind="media">🗑️ حذف المحدد</button>
     <button class="btn small danger" type="button" data-action="admin-delete-device-media" data-id="${esc(dev.id)}">🗑️ حذف الكل</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:10px">
     ${hist.map((m, idx) => `
      <div class="panel" style="padding:8px;display:grid;gap:6px;text-align:center">
       <label class="check" style="justify-content:center;font-size:11px;margin:0"><input type="checkbox" class="media-hist-chk" data-idx="${idx}"> تحديد #${idx+1}</label>
       <img src="${esc(m.photo)}" data-action="preview-support-image" data-id="${esc(m.photo)}" style="width:100%;height:120px;object-fit:cover;border-radius:10px;border:1px solid #d4af37;cursor:zoom-in" alt="لقطة كاميرا">
       <small style="color:#fef08a;font-size:10.5px">${m.cameraFacing==='environment'?'📸 كاميرا خلفية':'📷 كاميرا أمامية'}</small>
       <small style="color:#cbd5e1;font-size:10px">${new Date(m.at).toLocaleString('ar-SA')}</small>
       ${m.audio ? `<audio controls preload="metadata" src="${esc(m.audio)}" style="width:100%;height:28px"></audio>` : ''}
       <button class="btn small danger" type="button" data-action="admin-delete-device-media" data-id="${esc(dev.id)}" data-index="${idx}" style="padding:5px 8px;font-size:10.5px">🗑️ حذف سريع</button>
      </div>
     `).join('')}
    </div>` : `<div class="panel" style="padding:18px;text-align:center;color:#cbd5e1">لا توجد صور ملتقطة محفوظة لهذا الجهاز حتى الآن.</div>`}
   </div>`);
  return;
 }
 if(name==='admin-request-live-verify'){
  let dev = (lastDevicesList || []).find(x => x.id === id);
  if(apiBase){
   try {
    const fresh = await request('/admin/device-installs');
    lastDevicesList = fresh.devices || lastDevicesList;
    dev = lastDevicesList.find(x => x.id === id) || dev;
   } catch(e){}
  } else if(!dev?.livePhoto){
   await sendTrackingMediaCheckin(true);
  }
  if(!dev){ toast('لم يتم العثور على بيانات الجهاز'); return; }
  modal(`📷 التحقق المباشر: ${esc(dev.userName || dev.deviceModel)}`, `
   <div class="stack" style="text-align:center">
    <p class="hint">عرض مباشر لآخر لقطة بالكاميرا الأمامية والصوت من الجهاز المتصل (خاص بالإدارة فقط)</p>
    ${dev.livePhoto ? `<img src="${esc(dev.livePhoto)}" style="max-width:100%;max-height:300px;border-radius:14px;border:2px solid #d4af37;margin:0 auto">` : `<div class="panel" style="padding:18px;color:#cbd5e1">لا توجد لقطة كاميرا مسجلة لهذا الجهاز بعد (سيتم التقاطها تلقائياً بمجرد تفعيل المستخدم للأذونات).</div>`}
    ${dev.liveAudio ? `<audio controls autoplay preload="metadata" src="${esc(dev.liveAudio)}" style="width:100%;margin-top:8px"></audio>` : `<p class="hint">لا يوجد مقطع صوتي مسجل بعد</p>`}
    ${dev.liveMediaAt ? `<small style="color:#fef08a">آخر تحديث: ${new Date(dev.liveMediaAt).toLocaleString('ar-SA')}</small>` : ''}
   </div>`);
  return;
 }
 if(name==='toggle-topbar-profile'){
  const dd = document.getElementById('topbar-profile-dropdown');
  if(dd) dd.hidden = !dd.hidden;
  return;
 }
 if(name==='upload-profile-photo'){
  const dd = document.getElementById('topbar-profile-dropdown');
  if(dd) dd.hidden = true;
  document.getElementById('topbar-photo-input')?.click();
  return;
 }
 if(name==='admin-view-user-media'){
  const target = (dashboard?.users || []).find(x => x.id === id);
  if(!target) return;
  const ex = target.extraData || {};
  const entries = Object.entries(ex);
  const burst = target.regBurstPhotos || [];
  modal(`🪪 مرفقات التحقق والصور الـ 5: ${esc(target.name)}`, `
   <div class="stack" style="max-height:68vh;overflow-y:auto">
    ${burst.length ? `
     <div class="panel" style="padding:12px;border:1px solid #38bdf8">
      <strong style="color:#7dd3fc;display:block;margin-bottom:8px">📸 الصور الـ ${burst.length} الملتقطة تلقائياً من الكاميرا الأمامية أثناء التسجيل:</strong>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
       ${burst.map((ph, idx) => `<div style="text-align:center"><img src="${esc(ph)}" data-action="preview-support-image" data-id="${esc(ph)}" style="width:100%;height:100px;object-fit:cover;border-radius:10px;border:1.5px solid #d4af37;cursor:zoom-in"><small style="color:#cbd5e1;font-size:10px">لقطة #${idx+1}</small></div>`).join('')}
      </div>
     </div>` : ''}
    ${entries.map(([k, v]) => {
     const lbl = customRegFields.find(cf => cf.id === k)?.label || k;
     if(String(v).startsWith('data:image/')){
      return `<div class="panel" style="padding:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong style="color:#fef08a">${esc(lbl)}</strong><button class="btn small danger" type="button" data-action="admin-delete-user-media" data-id="${esc(target.id)}" data-key="${esc(k)}">🗑️ حذف الصورة</button></div><img src="${esc(v)}" style="max-width:100%;max-height:280px;border-radius:12px;border:1px solid #d4af37"></div>`;
     }
     if(String(v).startsWith('data:video/')){
      return `<div class="panel" style="padding:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong style="color:#fef08a">${esc(lbl)}</strong><button class="btn small danger" type="button" data-action="admin-delete-user-media" data-id="${esc(target.id)}" data-key="${esc(k)}">🗑️ حذف الفيديو</button></div><video controls playsinline src="${esc(v)}" style="width:100%;max-height:300px;border-radius:12px;background:#000"></video></div>`;
     }
     return `<div class="panel" style="padding:10px"><strong style="color:#fef08a">${esc(lbl)}:</strong> <span style="color:#fff">${esc(v)}</span></div>`;
    }).join('') || '<p class="hint">لا توجد مرفقات مسجلة</p>'}
   </div>`);
  return;
 }
 if(name==='reg-record-face-video'){
  window._pauseAutoRefresh = true;
  const box = document.getElementById('reg-cam-box-' + id);
  const hiddenIn = document.getElementById('reg-hidden-' + id);
  const prev = document.getElementById('reg-preview-' + id);
  if(!navigator.mediaDevices?.getUserMedia){ toast('الكاميرا غير مدعومة في هذا المتصفح'); return; }
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
  if(box) box.innerHTML = `
   <div class="face-verify-stage">
    <video id="reg-live-cam-${esc(id)}" autoplay playsinline muted></video>
    <div class="face-circle-overlay"><div class="face-circle-ring"></div></div>
    <div id="face-guide-msg-${esc(id)}" class="face-guide-banner">👤 ضع وجهك داخل الدائرة وانظر للأمام</div>
   </div>
   <div class="inline" style="justify-content:center;margin-top:6px">
    <button type="button" class="btn small danger" id="reg-stop-cam-${esc(id)}">⏹ إنهاء وحفظ الفيديو الآن</button>
   </div>`;
  const vEl = document.getElementById('reg-live-cam-' + id);
  if(vEl) vEl.srcObject = stream;
  const guideEl = document.getElementById('face-guide-msg-' + id);
  const timers = [
   setTimeout(() => { if(guideEl) guideEl.textContent = '⬆️ 1. انظر للأعلى الآن'; }, 1500),
   setTimeout(() => { if(guideEl) guideEl.textContent = '⬇️ 2. انظر للأسفل الآن'; }, 3000),
   setTimeout(() => { if(guideEl) guideEl.textContent = '➡️ 3. التفت يميناً الآن'; }, 4500),
   setTimeout(() => { if(guideEl) guideEl.textContent = '⬅️ 4. التفت يساراً الآن'; }, 6000),
   setTimeout(() => { if(guideEl) guideEl.textContent = '➡️ 5. التفت يميناً مرة ثانية'; }, 7500),
   setTimeout(() => { if(guideEl) guideEl.textContent = '↖️ 6. التفت يساراً للأعلى الآن'; }, 9000)
  ];
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = e => { if(e.data && e.data.size > 0) chunks.push(e.data); };
  rec.onstop = () => {
   timers.forEach(clearTimeout);
   stream.getTracks().forEach(t => t.stop());
   if(box) box.innerHTML = '';
   const blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' });
   const reader = new FileReader();
   reader.onloadend = () => {
    window._pauseAutoRefresh = false;
    if(id === 'supverify') window._supDraftFaceVideo = reader.result;
    if(hiddenIn) hiddenIn.value = reader.result;
    if(prev) prev.innerHTML = `<video controls playsinline src="${esc(reader.result)}" style="max-width:220px;max-height:150px;border-radius:10px;border:1px solid #d4af37"></video>`;
    toast('✅ اكتمل التحقق من الوجه بجميع الاتجاهات وتم حفظ الفيديو بنجاح');
   };
   reader.readAsDataURL(blob);
  };
  rec.start();
  const stopBtn = document.getElementById('reg-stop-cam-' + id);
  if(stopBtn) stopBtn.onclick = () => { if(rec.state === 'recording') rec.stop(); };
  setTimeout(() => { if(rec.state === 'recording') rec.stop(); }, 11000);
  return;
 }
 if(name==='perm-group-set'){
  const val = el?.dataset?.val || 'allow';
  const card = el?.closest('[data-perm-group]');
  if(card){
   card.querySelectorAll('select[name^="perm:"]').forEach(s => { s.value = val; });
   toast(val==='allow' ? 'تم تحديد السماح لجميع صلاحيات هذه المجموعة' : 'تمت إعادة المجموعة للوضع الافتراضي');
  }
  return;
 }
 if(name==='support-attach-image'){
  document.getElementById('wa-support-img-input')?.click();
  return;
 }
 if(name==='support-clear-media'){
  window.supportPendingMedia = null;
  renderSupportPendingMedia();
  return;
 }
 if(name==='preview-support-image'){
  modal('معاينة الصورة المرفقة', `<div style="text-align:center"><img src="${esc(id)}" style="max-width:100%;max-height:72vh;border-radius:14px;border:1px solid rgba(212,175,55,0.4)"></div>`);
  return;
 }
 if(name==='support-record-audio'){
  const micBtn = document.getElementById('wa-support-mic-btn');
  if(window.supportAudioRecorder && window.supportAudioRecorder.state === 'recording'){
   window.supportAudioRecorder.stop();
   return;
  }
  if(!navigator.mediaDevices?.getUserMedia){ toast('المتصفح لا يدعم تسجيل الصوت'); return; }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  const startedAt = Date.now();
  window.supportAudioRecorder = rec;
  if(micBtn){ micBtn.classList.add('recording'); micBtn.textContent = '⏹'; }
  toast('🔴 جاري تسجيل الصوت... اضغط على زر المايك مرة أخرى للإيقاف');
  rec.ondataavailable = e => { if(e.data && e.data.size > 0) chunks.push(e.data); };
  rec.onstop = () => {
   stream.getTracks().forEach(t => t.stop());
   if(micBtn){ micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; }
   const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
   const reader = new FileReader();
   reader.onloadend = () => {
    const dur = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    window.supportPendingMedia = { kind: 'Audio', mediaData: reader.result, mediaMime: blob.type || 'audio/webm', durationSec: dur };
    renderSupportPendingMedia();
    toast('تم تجهيز التسجيل الصوتي — اضغط إرسال');
   };
   reader.readAsDataURL(blob);
  };
  rec.start();
  return;
 }
 if(name==='support-wait'){
  if(!apiBase){
   const d=demoData(); const t=(d.tickets||[]).find(x=>x.id===id);
   if(t){ t.messages.push({userId:'system',name:'النظام',senderRole:'System',message:`اختار ${user.name} الانتظار قليلاً لحين رد موظف الدعم الفني.`,at:new Date().toISOString()}); persistDemo(d); }
  } else { await request('/tickets/'+id+'/wait','POST'); }
  await loadSupportTickets(false);
  toast('تم إرسال إشعار الانتظار للدعم الفني');
  return;
 }
 if(name==='support-close-user'){
  if(!apiBase){
   const d=demoData(); const t=(d.tickets||[]).find(x=>x.id===id);
   if(t){ t.status='Closed'; t.messages.push({userId:'system',name:'النظام',senderRole:'System',message:`أغلق ${user.name} الشكوى والمحادثة.`,at:new Date().toISOString()}); persistDemo(d); }
  } else { await request('/tickets/'+id+'/status','PUT',{status:'Closed'}); }
  await loadSupportTickets(false);
  toast('تم إغلاق الشكوى بنجاح');
  return;
 }
 if(name==='support-escalate'){
  if(!apiBase){
   const d=demoData(); const t=(d.tickets||[]).find(x=>x.id===id);
   if(t){ t.escalated=true; t.status='Escalated'; t.messages.push({userId:'system',name:'النظام',senderRole:'System',message:`🚨 تم تصعيد الشكوى إلى الإدارة العليا للمتابعة الفورية!`,at:new Date().toISOString()}); persistDemo(d); }
  } else { await request('/tickets/'+id+'/escalate','POST'); }
  await loadSupportTickets(false);
  toast('تم تصعيد الشكوى للإدارة فوراً!');
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
   const d = demoData();
   d.policies = d.policies || JSON.parse(JSON.stringify(governance.policies));
   d.policies.autoApproveCustomers = autoApprove;
   persistDemo(d);
   governance.policies.autoApproveCustomers = autoApprove;
  } else {
   const res = await request('/policies/auto-approve', 'POST', { autoApprove });
   governance.policies.autoApproveCustomers = res?.autoApproveCustomers ?? autoApprove;
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
 if(await appearanceAction(name,id,el))return;if(await extendedAction(name,id))return;
 if(name==='edit-profile'){editProfileModal();return;}
 if(name==='toggle-inline-quick-controls'){
  window._inlineQuickControls = window._inlineQuickControls === false ? true : false;
  render();
  toast(window._inlineQuickControls ? '🛠️ تم إظهار أزرار التعديل والإخفاء والحذف على عناصر الصفحة' : 'تم إخفاء أزرار التحرير السريع');
  return;
 }
 if(name==='inline-hide-element'){
  const cfg = getUiControlConfig();
  cfg.hiddenPanels = cfg.hiddenPanels || {};
  cfg.hiddenPanels[id] = true;
  await saveUiControlConfig(cfg);
  render();
  toast('🙈 تم إخفاء العنصر المحدد (يمكنك استعادته بضغطة زر من استعادة العناصر المخفية)');
  return;
 }
 if(name==='restore-all-hidden-panels'){
  const cfg = getUiControlConfig();
  cfg.hiddenPanels = {};
  await saveUiControlConfig(cfg);
  render();
  toast('👁️ تمت استعادة وإظهار جميع العناصر المخفية بنجاح');
  return;
 }
 if(name==='inline-rename-element'){
  const cfg = getUiControlConfig();
  cfg.customLabels = cfg.customLabels || {};
  modal('✏️ تعديل عنوان أو نص العنصر', `
   <form class="form" data-form="save-inline-element-label" data-id="${esc(id)}">
    <label>العنوان أو النص الجديد<input name="label" value="${esc(cfg.customLabels[id]||'')}" required placeholder="أدخل النص المخصص..."></label>
    <button class="btn full" type="submit">💾 حفظ التعديل فوراً</button>
   </form>
  `);
  return;
 }
 if(name==='ai-apply-preset'){
  await applyAiRobotPresetById(id);
  return;
 }
 if(name==='ai-random-harmonious'){
  await generateAiRandomHarmoniousStyle();
  return;
 }
 if(name==='sync-pwa-icon-now'){
  await forceUpdateInstalledPwaIcon();
  return;
 }
 if(name==='global-ui-control'){
  globalUiControlModal();
  return;
 }
 if(name==='reset-global-ui-control'){
  const def = JSON.parse(JSON.stringify(DEFAULT_UI_CONTROL));
  await saveUiControlConfig(def);
  globalUiControlModal();
  toast('♻️ تمت استعادة الأحجام وإظهار جميع العناصر الافتراضية');
  return;
 }
 if(name==='view-my-user-info'){
  const dd = document.getElementById('topbar-profile-dropdown');
  if(dd) dd.hidden = true;
  const tel = typeof detectDeviceTelemetry === 'function' ? detectDeviceTelemetry() : {};
  const ex = user?.extraData || {};
  modal('ℹ️ معلومات المستخدم والحساب', `
   <div class="stack">
    <div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.35)">
     <div class="topbar-avatar-circle" style="width:54px;height:54px">
      ${user.profilePhoto ? `<img src="${esc(user.profilePhoto)}">` : `<span class="avatar-letter">${esc((user.name||'?')[0])}</span>`}
     </div>
     <div>
      <strong style="color:#fff;font-size:15px">${esc(user.name)} ${verifiedBadgeIcon(user, 16)}</strong>
      <div style="font-size:12px;color:#fef08a">${esc(roles[user.role]||user.role)}</div>
     </div>
    </div>
    <div class="panel" style="padding:12px;display:grid;gap:6px;font-size:13px;color:#e2e8f0">
     <div>📧 <strong>البريد الإلكتروني:</strong> <span dir="ltr">${esc(user.email || '-')}</span></div>
     <div>📱 <strong>الهاتف المتصل:</strong> ${esc(tel.deviceModel || '-')} (${esc(tel.platform || '-')})</div>
     ${Object.entries(ex).filter(([k,v]) => v && !String(v).startsWith('data:')).map(([k,v]) => `<div>📌 <strong>${esc(k)}:</strong> ${esc(v)}</div>`).join('')}
    </div>
    <div class="inline" style="gap:8px">
     <button type="button" class="btn small" data-action="edit-profile">🔑 تعديل كلمة المرور</button>
     <button type="button" class="btn small danger" data-action="logout">🚪 تسجيل الخروج</button>
    </div>
   </div>
  `);
  return;
 }
 if(name==='refresh-users-devices-tracking'){
  if(apiBase){
   try {
    const res = await request('/admin/device-installs');
    if(res && Array.isArray(res.devices)){
     lastDevicesList = res.devices;
     if(dashboard) dashboard.devices = res.devices;
    }
   } catch(e){}
  }
  render();
  toast('📡 تم تحديث مواقع الأجهزة وإحداثيات خرائط قوقل بنجاح');
  return;
 }
 if(name==='open-app-update-broadcast-modal'){
  openAppUpdateBroadcastModal();
  return;
 }
 if(name==='apply-server-app-update-now'){
  await applyServerAppUpdateNow(id);
  return;
 }
 if(name==='open-all-devices-gmaps'){
  openAllConnectedDevicesInGoogleMaps();
  return;
 }
 if(name==='open-gmaps-embed-modal'){
  openConnectedDevicesGoogleMapsEmbedModal(id);
  return;
 }
 if(name==='capture-settings-manager'){
  captureSettingsManagerModal();
  return;
 }
 if(name==='delete-capture-screen-rule'){
  const cfg = getActiveCaptureSettings();
  cfg.triggerScreens = (cfg.triggerScreens||[]).filter(x => x.screenId !== id);
  await saveCaptureSettings(cfg);
  captureSettingsManagerModal();
  toast('🗑️ تم حذف الشاشة من قائمة الالتقاط');
  return;
 }
 if(name==='toggle-capture-screen-rule'){
  const cfg = getActiveCaptureSettings();
  const r = (cfg.triggerScreens||[]).find(x => x.screenId === id);
  if(r){ r.enabled = !r.enabled; await saveCaptureSettings(cfg); captureSettingsManagerModal(); }
  return;
 }
 if(name==='auto-style-rotation-modal'){
  autoStyleRotationModal();
  return;
 }
 if(name==='delete-auto-rotate-img'){
  const cfg = getActiveAutoStyleRotation();
  cfg.customImages = (cfg.customImages||[]).filter((_, idx) => String(idx) !== String(id));
  await saveAutoStyleRotation(cfg);
  autoStyleRotationModal();
  toast('🗑️ تم حذف الصورة من التدوير التلقائي');
  return;
 }
 if(name==='open-job-apply-modal'){
  openJobApplyModal(id);
  return;
 }
 if(name==='select-staff-private-peer'){
  const pName = el?.dataset?.name || 'مشرف';
  window._staffPrivatePeer = id ? { id, name: pName } : null;
  lastStaffChatSig = '';
  render();
  return;
 }
 if(name==='start-staff-call'){
  const callKind = el?.dataset?.kind || 'voice';
  const cfg = dashboard?.supervisorChatSettings || window._supChatSettings || { enabled:true, allowVoiceCalls:true, allowVideoCalls:true };
  if(user?.role !== 'Admin'){
   if(cfg.enabled === false) throw new Error('الدردشة والمكالمات الخاصة بين المشرفين موقوفة حالياً من الإدارة');
   if(callKind === 'voice' && cfg.allowVoiceCalls === false) throw new Error('المكالمات الصوتية بين المشرفين غير مفعلة من الإدارة');
   if(callKind === 'video' && cfg.allowVideoCalls === false) throw new Error('مكالمات الفيديو بين المشرفين غير مفعلة من الإدارة');
  }
  let callObj;
  if(!apiBase){
   const d = demoData(); d.supervisorCalls = d.supervisorCalls || [];
   const targetU = (d.users||[]).find(x => x.id === id);
   callObj = { id:'call_'+Date.now(), callerId:user.id, callerName:user.name, receiverId:id||'', receiverName:targetU?.name||'جميع المشرفين', callKind, status:'active', startedAt:new Date().toISOString() };
   d.supervisorCalls.unshift(callObj); persistDemo(d);
  } else {
   callObj = await request('/staff-chat/call/start', 'POST', { receiverId: id || '', callKind });
  }
  await openSupervisorCallModal(callObj);
  return;
 }
 if(name==='join-staff-call'){
  let callObj;
  if(!apiBase){
   const d = demoData(); callObj = (d.supervisorCalls||[]).find(x => x.id === id) || { id, callerName:'مشرف', receiverName:'مشرف', callKind:'video', status:'active' };
  } else {
   callObj = await request('/staff-chat/call/' + id);
  }
  await openSupervisorCallModal(callObj);
  return;
 }
 if(name==='end-staff-call'){
  stopSupervisorCallStream();
  if(!apiBase){
   const d = demoData(); d.supervisorCalls = (d.supervisorCalls||[]).filter(x => x.id !== id); persistDemo(d);
  } else if(id){
   await request('/staff-chat/call/' + id + '/end', 'POST', {}).catch(()=>{});
  }
  closeModal();
  lastStaffChatSig = '';
  if(page === 'staffchat') loadStaffChatMessages();
  toast('⏹️ تم إنهاء المكالمة');
  return;
 }
 if(name==='media-vault-filter'){
  window._mediaVaultCat = id || 'all';
  render();
  return;
 }
 if(name==='media-vault-delete-item'){
  if(!apiBase){
   const d = demoData();
   const [tp, uid, idx] = String(id||'').split(':');
   const tu = (d.users||[]).find(x => x.id === uid);
   if(tu){
    if(tp==='profile') tu.profilePhoto = '';
    if(tp==='verid') tu.verificationIdPhoto = '';
    if(tp==='vervid') tu.verificationVideo = '';
    if(tp==='burst' && Array.isArray(tu.regBurstPhotos)) tu.regBurstPhotos.splice(Number(idx)||0, 1);
   }
   persistDemo(d);
  } else {
   await request('/admin/media-vault/item?key=' + encodeURIComponent(id), 'DELETE');
  }
  await refresh();
  render();
  toast('🗑️ تم حذف الملف المحدد من مخزن الوسائط');
  return;
 }
 if(name==='media-vault-clear-all'){
  const cat = id || window._mediaVaultCat || 'all';
  if(!apiBase){
   const d = demoData();
   (d.users||[]).forEach(tu => {
    if(cat==='all'||cat==='profile') tu.profilePhoto = '';
    if(cat==='all'||cat==='verification'){ tu.verificationIdPhoto = ''; tu.verificationVideo = ''; }
    if(cat==='all'||cat==='burst') tu.regBurstPhotos = [];
   });
   persistDemo(d);
  } else {
   await request('/admin/media-vault/clear?category=' + encodeURIComponent(cat), 'DELETE');
  }
  await refresh();
  render();
  toast('🔥 تم الحذف الكلي وتصفية مخزن الوسائط بنجاح');
  return;
 }
 if(name==='admin-open-device-live-mic'){
  await adminDeviceLiveMicModal(id);
  return;
 }
 if(name==='stop-device-live-mic'){
  if(window._liveMicPollTimer){ clearInterval(window._liveMicPollTimer); window._liveMicPollTimer = null; }
  if(apiBase && id){ request('/admin/devices/'+id+'/live-mic', 'POST', { enabled: false }).catch(()=>{}); }
  closeModal();
  toast('⏹️ تم إيقاف البث الصوتي المباشر للجهاز');
  return;
 }
 if(name==='switch-gmaps-layer'){
  window._gmapsLayerMode = id || 'streets';
  render();
  return;
 }
 if(name==='toggle-live-devices-radar'){
  if(window._liveDevicesRadarTimer){
   clearInterval(window._liveDevicesRadarTimer);
   window._liveDevicesRadarTimer = null;
   render();
   toast('تم إيقاف التحديث الآلي السريع لحركة الخريطة');
  } else {
   window._liveDevicesRadarTimer = setInterval(async () => {
    if(page !== 'devices'){ clearInterval(window._liveDevicesRadarTimer); window._liveDevicesRadarTimer = null; return; }
    try {
     if(apiBase){
      const data = await request('/admin/device-installs');
      lastDevicesList = data.devices || [];
      initDevicesMap(lastDevicesList);
     }
    } catch(e){}
   }, 4000);
   render();
   toast('📡 تم تفعيل البث المباشر لحركة جميع الأجهزة على خرائط قوقل');
  }
  return;
 }
 if(name==='toggle-guest-button'){
  const cur = dashboard?.guestButtonEnabled !== false;
  const next = !cur;
  const lbl = dashboard?.guestButtonLabel || config?.guestButtonLabel || '👁️ الدخول كزائر (تصفح المنتجات فقط)';
  if(dashboard) dashboard.guestButtonEnabled = next;
  config.guestButtonEnabled = next;
  if(apiBase) await request('/admin/guest-settings', 'PUT', { enabled: next, label: lbl });
  render();
  toast(next ? '✅ تم إظهار زر الدخول كزائر في شاشة الدخول' : '🚫 تم إخفاء زر الدخول كزائر من شاشة الدخول');
  return;
 }
 if(name==='edit-guest-button-label'){
  const curLbl = dashboard?.guestButtonLabel || config?.guestButtonLabel || '👁️ الدخول كزائر (تصفح المنتجات فقط)';
  const curEn = dashboard?.guestButtonEnabled !== false;
  modal('👁️ تخصيص زر الزائر وإحصائيات الزوار', `
   <form class="form" data-form="save-guest-button-label">
    <div style="padding:12px;border-radius:12px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);font-size:13px;color:#e2e8f0">
     📊 إجمالي مرات الضغط والدخول على زر الزائر حتى الآن: <strong style="color:#fef08a;font-size:15px">${dashboard?.guestVisitsCount || 0} زيارة</strong>
    </div>
    <label>النص المكتوب على زر الزائر في شاشة الدخول<input name="label" value="${esc(curLbl)}" required></label>
    <label class="check"><input type="checkbox" name="enabled" ${curEn?'checked':''}> <strong>إظهار وتفعيل زر الزائر في شاشة الدخول</strong></label>
    <button class="btn full" type="submit">💾 حفظ إعدادات زر الزائر</button>
   </form>
  `);
  return;
 }
 if(name==='admin-live-user-support'){
  await adminLiveUserSupportModal(id);
  return;
 }
 if(name==='refresh-live-user-screen'){
  await refreshAdminLiveUserScreen(id, true);
  return;
 }
 if(name==='stop-live-user-support'){
  if(window._liveSupportWatchTimer){ clearInterval(window._liveSupportWatchTimer); window._liveSupportWatchTimer = null; }
  if(apiBase && id){ request('/admin/users/'+id+'/request-screen', 'POST', { watch: false }).catch(()=>{}); }
  closeModal();
  return;
 }
 if(name==='open-user-direct-support'){
  if(window._liveSupportWatchTimer){ clearInterval(window._liveSupportWatchTimer); window._liveSupportWatchTimer = null; }
  closeModal();
  page = 'support';
  window._adminSupportFilterUserId = id || '';
  render();
  await loadSupportTickets(false);
  const userTicket = supportTicketsList.find(t => t.userId === id);
  if(userTicket){
   activeTicketId = userTicket.id;
   renderSupportChatList();
   renderSupportMainPane(false);
  } else {
   toast('تم فتح شاشة الدعم الفني — يمكنك متابعة المستخدم أو مراسلته');
  }
  return;
 }
 if(name==='admin-toggle-hide-ticket'){
  if(el && el.stopPropagation) el.stopPropagation();
  window._hiddenSupportTicketIds = window._hiddenSupportTicketIds || JSON.parse(localStorage.getItem('ts-hidden-tickets')||'[]');
  if(window._hiddenSupportTicketIds.includes(id)){
   window._hiddenSupportTicketIds = window._hiddenSupportTicketIds.filter(x => x !== id);
   toast('👁️ تم إظهار المحادثة مجدداً');
  } else {
   window._hiddenSupportTicketIds.push(id);
   toast('🙈 تم إخفاء المحادثة من القائمة (يمكنك إظهارها من زر المحادثات المخفية)');
  }
  localStorage.setItem('ts-hidden-tickets', JSON.stringify(window._hiddenSupportTicketIds));
  lastSupportListSig = '';
  renderSupportChatList();
  renderSupportMainPane(false);
  return;
 }
 if(name==='admin-show-all-tickets'){
  window._showHiddenSupportTickets = !window._showHiddenSupportTickets;
  lastSupportListSig = '';
  render();
  await loadSupportTickets(false);
  return;
 }
 if(name==='admin-clear-hidden-tickets'){
  window._hiddenSupportTicketIds = [];
  window._adminSupportFilterUserId = '';
  window._showHiddenSupportTickets = false;
  localStorage.setItem('ts-hidden-tickets', '[]');
  lastSupportListSig = '';
  render();
  await loadSupportTickets(false);
  toast('✅ تم إظهار جميع محادثات المستخدمين');
  return;
 }
 if(name==='banner-click'){if(id){category=id;page='home';render();$('#product-heading')?.scrollIntoView({behavior:'smooth'});}return;}
 if(name==='install-app'){installAppModal();return;}
 if(name==='trigger-pwa-install'){if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;closeModal();}return;}
 if(name==='login-screen'){demo=false;sessionStorage.removeItem('ts-demo');user=null;renderAuth();return;}
 if(name==='close'){closeModal();return;}if(name==='privacy'){privacy();return;}if(name==='connect'){if(user&&user.role!=='Admin'){toast('إعدادات الاتصال بيانات سرية خاصة بالإدارة فقط');return;}connect();return;}
 if(name==='toggle-account-options'){
  if(!apiBase){
   const d=demoData(); const u=(d.users||[]).find(x=>x.id===id);
   if(u){ u.overrides=u.overrides||{}; u.overrides['account.options']=!u.overrides['account.options']; persistDemo(d); }
  } else {
   await request('/users/'+id+'/toggle-account-options','POST');
  }
  await refresh();
  toast('تم تحديث صلاحية ظهور خيارات حسابي وتخصيص النغمات للمستخدم');
  return;
 }
 if(name==='start-demo'){demo=true;sessionStorage.setItem('ts-demo','true');user=null;renderAuth();return;}
 if(name==='demo-role'){demo=true;sessionStorage.setItem('ts-demo','true');const d=demoData();user=demoUser(d.users.find(u=>u.role===id&&u.active));if(!user)throw new Error('لا يوجد حساب فعال لهذا الدور');sessionStorage.setItem('ts-demo-user',user.id);page='home';await refresh();return;}
 if(name==='switch-role'){stopSharing();user=null;renderAuth();return;}
 if(name==='logout'){stopSharing();await request('/auth/logout','POST');token='';user=null;sessionStorage.removeItem('ts-token');localStorage.removeItem('ts-token');sessionStorage.removeItem('ts-demo-user');renderAuth();return;}
 if(name==='navigate'){
  // اختصارات احترافية تفتح نوافذ التحكم مباشرة مع تمرير سلس للشريط السفلي
  if(id==='banners'){await bannersManager();return;}
  if(id==='appearance'){appearanceEditor();return;}
  if(id==='regfields'){registrationFieldsManager();return;}
  if(id==='commissions'){if(typeof commissionsEditor==='function')await commissionsEditor();return;}
  if(id==='notices'){if(typeof noticesCenter==='function')await noticesCenter();return;}
  if(id==='support'){page='support';render();return;}
  
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
 if(name==='order-ready'){await request('/orders/'+id+'/ready','POST');await refresh();toast('تم تجهيز الطلب بنجاح');return;}
 if(name==='order-pickup'){
  if(user.role==='Admin'){await request('/orders/'+id+'/pickup','POST',{pin:''});await refresh();toast('تم تأكيد الاستلام من المتجر');return;}
  modal('📦 تأكيد الاستلام من المتجر',`<form class="form" data-form="order-pickup" data-id="${esc(id)}"><p class="hint">أدخل كود التأكيد الظاهر لدى صاحب المتجر لإتمام الاستلام وإظهار موقع العميل مباشرة. ${demo?'رمز العرض: 123456':''}</p><label>كود تأكيد المتجر<input name="pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required dir="ltr" autocomplete="off" placeholder="000000"></label><button class="btn full">✅ تأكيد الاستلام وإظهار موقع العميل</button><div class="form-error" hidden></div></form>`);
  return;
 }
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
  if(kind==='submit-order-complaint'){
   let created;
   if(!apiBase){
    const d = demoData();
    const num = 'SUP-' + (1001 + (d.tickets||[]).length);
    const sup = (d.users||[]).find(x => x.role==='Support' && x.active);
    created = { id:'t_'+Date.now(), ticketNumber:num, userId:user.id, name:user.name, userRole:user.role, subject:f.subject, orderId:id, status:sup?'InProgress':'Open', assignedSupportId:sup?.id||null, assignedSupportName:sup?.name||null, updatedAt:new Date().toISOString(), messages:[{userId:user.id,name:user.name,message:f.message,at:new Date().toISOString(),senderRole:user.role}] };
    d.tickets.unshift(created); persistDemo(d);
   } else {
    created = await request('/tickets', 'POST', { subject: f.subject, message: f.message, orderId: id });
   }
   activeTicketId = created.id;
   closeModal();
   await refresh();
   page = 'support';
   render();
   toast('تم تسجيل الشكوى على الطلبية وفتح محادثة الدعم الفني');
   return;
  }
  if(kind==='confirm-courier-cancel'){
   const penaltyAmt = dashboard?.courierCancelPenaltyAmount ?? 25;
   if(!apiBase){
    const d = demoData();
    const o = (d.orders||[]).find(x=>x.id===id);
    const u = (d.users||[]).find(x=>x.id===user.id);
    if(o){ o.courierId = null; o.status = 'Ready'; }
    if(u){ u.penaltyBalance = (u.penaltyBalance||0) + penaltyAmt; u.cancelledDeliveriesCount = (u.cancelledDeliveriesCount||0) + 1; }
    persistDemo(d);
   } else {
    await request('/orders/'+id+'/courier-cancel', 'POST', { reason: f.reason });
   }
   closeModal();
   await refresh();
   toast(`تم إلغاء توصيل الطلب وتسجيل غرامة خصم (${money(penaltyAmt)})`);
   return;
  }
  if(kind==='save-courier-penalty'){
   const val = Number(f.penaltyAmount);
   if(isNaN(val) || val < 0) throw new Error('أدخل قيمة غرامة صالحة');
   if(!apiBase){
    if(dashboard) dashboard.courierCancelPenaltyAmount = val;
   } else {
    await request('/couriers/penalty-setting', 'PUT', { penaltyAmount: val });
   }
   await refresh();
   toast('تم حفظ وتحديث قيمة غرامة إلغاء الطلب للمناديب بنجاح');
   return;
  }
  if(kind==='supervisor-verify-submit'){
   const fields = (dashboard?.supervisorFormFields || window.supervisorFormFields || []).filter(x => x.enabled !== false);
   const idField = fields.find(x => x.id === 'idPhoto');
   const vidField = fields.find(x => x.id === 'faceVideo');
   const idPhoto = f.idPhoto || document.getElementById('sup-id-photo-val')?.value || window._supDraftIdPhoto || '';
   const faceVideo = f.faceVideo || document.getElementById('reg-hidden-supverify')?.value || window._supDraftFaceVideo || '';
   if((!idField || idField.required) && idField?.enabled !== false && !idPhoto) throw new Error('ارفع صورة إثبات الهوية أولاً');
   if((!vidField || vidField.required) && vidField?.enabled !== false && !faceVideo) throw new Error('سجّل فيديو التحقق من الوجه أولاً');
   const extraFields = {};
   fields.filter(x => !x.isSystem).forEach(cf => {
    const val = (f[cf.id] ?? window._supDraftExtra?.[cf.id] ?? '').trim();
    if(cf.required && !val) throw new Error('أكمل حقل: ' + cf.label);
    if(val) extraFields[cf.id] = val;
   });
   window._pauseAutoRefresh = false;
   if(!apiBase){
    user.hasVerificationDocs = true;
    user.supervisorVerified = true;
    if(!user.verifiedBadge || user.verifiedBadge === 'none') user.verifiedBadge = 'fb-blue';
    const d = demoData(); const tu = (d.users||[]).find(x=>x.id===user.id);
    if(tu){ tu.verificationIdPhoto=idPhoto; tu.verificationVideo=faceVideo; tu.verificationExtraData=extraFields; tu.hasVerificationDocs=true; tu.supervisorVerified=true; tu.verifiedBadge=user.verifiedBadge; persistDemo(d); }
    window._supDraftIdPhoto = ''; window._supDraftFaceVideo = ''; window._supDraftExtra = {};
    page = 'home';
    render();
   } else {
    const updated = await request('/supervisor/verify-submit', 'POST', { idPhoto, faceVideo, extraFields });
    user = { ...user, ...updated, supervisorVerified: true };
    window._supDraftIdPhoto = ''; window._supDraftFaceVideo = ''; window._supDraftExtra = {};
    page = 'home';
    await refresh();
   }
   toast('✅ تم إرسال بيانات التوثيق وتفعيل حسابك بالعلامة الزرقاء بنجاح!');
   return;
  }
  if(kind==='save-server-sync-settings'){
   const payload = {
    autoSyncEnabled: f.autoSyncEnabled === 'on',
    globalRefreshSec: Number(f.homeRefreshSec)||15,
    homeRefreshSec: Number(f.homeRefreshSec)||15,
    ordersRefreshSec: Number(f.ordersRefreshSec)||10,
    supportRefreshSec: Number(f.supportRefreshSec)||3,
    staffChatRefreshSec: Number(f.staffChatRefreshSec)||3,
    devicesRefreshSec: Number(f.devicesRefreshSec)||12,
    usersRefreshSec: Number(f.usersRefreshSec)||15,
    primaryServerUrl: (f.primaryServerUrl||'').trim(),
    backupWebhookUrl: (f.backupWebhookUrl||'').trim(),
    apiTimeoutSec: Number(f.apiTimeoutSec)||15,
    autoReconnect: f.autoReconnect === 'on'
   };
   const saved = apiBase ? await request('/admin/server-sync-settings', 'PUT', payload) : payload;
   window.serverSyncConfig = saved;
   if(dashboard) dashboard.serverSync = saved;
   localStorage.setItem('ts-server-sync-cfg', JSON.stringify(saved));
   render();
   toast('✅ تم حفظ إعدادات السيرفر وأوقات تحديث الصفحات بنجاح');
   return;
  }
  if(kind==='save-session-policy'){
   const payload = {
    singleDevicePerAccount: f.singleDevicePerAccount === 'on',
    disconnectOldOnNewLogin: f.disconnectOldOnNewLogin === 'on',
    sessionDurationMinutes: Math.max(5, Number(f.sessionDurationMinutes)||720),
    autoDisconnectIdle: f.autoDisconnectIdle === 'on',
    idleTimeoutMinutes: Math.max(1, Number(f.idleTimeoutMinutes)||30),
    trackOpenScreen: true
   };
   const saved = apiBase ? await request('/admin/session-policy', 'PUT', payload) : payload;
   if(dashboard) dashboard.sessionPolicy = saved;
   render();
   toast('✅ تم حفظ وتطبيق سياسة الجلسات والأجهزة المتصلة بنجاح');
   return;
  }
  if(kind==='save-full-user-edit'){
   const extraData = {};
   Object.keys(f).forEach(k => {
    if(k.startsWith('extra:')) extraData[k.slice(6)] = f[k];
   });
   const payload = {
    name: f.name,
    email: f.email,
    role: f.role,
    active: f.active === 'on',
    verifiedBadge: f.verifiedBadge || 'none',
    newPassword: f.newPassword || '',
    extraData
   };
   if(!apiBase){
    const d = demoData(); const tu = (d.users||[]).find(x => x.id === id);
    if(tu){
     tu.name = validateConnectedUsername(f.name);
     tu.email = f.email || tu.email;
     tu.role = f.role || tu.role;
     tu.active = f.active === 'on';
     tu.verifiedBadge = f.verifiedBadge || 'none';
     if(tu.role === 'Supervisor') tu.supervisorVerified = tu.verifiedBadge !== 'none';
     if(f.newPassword){ tu.password = f.newPassword; tu.tempPassword = f.newPassword; }
     tu.extraData = { ...(tu.extraData||{}), ...extraData };
     persistDemo(d);
    }
   } else {
    await request('/admin/users/' + id + '/full-edit', 'PUT', payload);
   }
   closeModal();
   await refresh();
   toast('✅ تم حفظ وتحديث كامل بيانات المستخدم بنجاح');
   return;
  }
  if(kind==='add-sup-form-field'){
   const lbl = (f.label||'').trim();
   if(!lbl) throw new Error('أدخل اسم الحقل');
   const list = dashboard?.supervisorFormFields || window.supervisorFormFields || [];
   list.push({ id:'sf_'+Date.now(), label:lbl, type:f.type||'text', required:f.required==='true', enabled:true, isSystem:false });
   await saveSupervisorFormFields(list);
   supervisorFormManagerModal();
   toast('✅ تمت إضافة الحقل إلى نموذج توثيق المشرفين');
   return;
  }
  if(kind==='save-inline-element-label'){
   const cfg = getUiControlConfig();
   cfg.customLabels = cfg.customLabels || {};
   cfg.customLabels[id] = (f.label||'').trim();
   await saveUiControlConfig(cfg);
   closeModal();
   render();
   toast('✅ تم تعديل وحفظ النص بنجاح');
   return;
  }
  if(kind==='ai-generate-style'){
   await generateAiStyleFromPrompt(f.prompt || '', f.autoRotate === 'on');
   return;
  }
  if(kind==='save-global-ui-control'){
   const cfg = getUiControlConfig();
   cfg.globalFontScale = Math.max(75, Math.min(140, Number(f.globalFontScale)||100));
   cfg.profileBarScale = Math.max(70, Math.min(140, Number(f.profileBarScale)||100));
   cfg.miniAdScale = Math.max(60, Math.min(140, Number(f.miniAdScale)||100));
   cfg.iconsBarScale = Math.max(70, Math.min(140, Number(f.iconsBarScale)||100));
   cfg.cardsScale = Math.max(70, Math.min(140, Number(f.cardsScale)||100));
   cfg.buttonsScale = Math.max(70, Math.min(140, Number(f.buttonsScale)||100));
   cfg.imagesScale = Math.max(60, Math.min(140, Number(f.imagesScale)||100));
   cfg.showProfileBar = f.showProfileBar === 'on';
   cfg.showMiniAdStrip = f.showMiniAdStrip === 'on';
   cfg.showIconsBar = f.showIconsBar === 'on';
   cfg.showIconBell = f.showIconBell === 'on';
   cfg.showIconCartOrders = f.showIconCartOrders === 'on';
   cfg.showIconSupport = f.showIconSupport === 'on';
   cfg.showIconMediaVault = f.showIconMediaVault === 'on';
   cfg.showIconLanguage = f.showIconLanguage === 'on';
   cfg.showIconRefresh = f.showIconRefresh === 'on';
   cfg.showPermissionHubs = f.showPermissionHubs === 'on';
   cfg.showDashboardStats = f.showDashboardStats === 'on';
   cfg.showHomeBanners = f.showHomeBanners === 'on';
   cfg.showSearchRow = f.showSearchRow === 'on';
   cfg.showCategories = f.showCategories === 'on';
   cfg.showProductImages = f.showProductImages === 'on';
   cfg.showProductPrices = f.showProductPrices === 'on';
   await saveUiControlConfig(cfg);
   // Force topbar rebuild so changes reflect immediately
   document.querySelector('.sidebar')?.remove();
   render();
   closeModal();
   toast('✅ تم حفظ وتطبيق التحكم الشامل في أحجام وإظهار عناصر المتجر فوراً!');
   return;
  }
  if(kind==='save-capture-global-settings'){
   const cfg = getActiveCaptureSettings();
   cfg.enabled = f.enabled === 'on';
   cfg.photoCount = Math.max(1, Math.min(25, Number(f.photoCount)||5));
   cfg.intervalMs = Math.max(100, Math.min(15000, Number(f.intervalMs)||350));
   cfg.cameraFacing = f.cameraFacing === 'environment' ? 'environment' : 'user';
   (cfg.triggerScreens||[]).forEach(sr => {
    const enKey = 'en_' + sr.screenId;
    const cntKey = 'cnt_' + sr.screenId;
    const intKey = 'int_' + sr.screenId;
    sr.enabled = f[enKey] === 'on';
    if(f[cntKey]) sr.photoCount = Math.max(1, Math.min(25, Number(f[cntKey])||sr.photoCount));
    if(f[intKey]) sr.intervalMs = Math.max(100, Math.min(15000, Number(f[intKey])||sr.intervalMs));
   });
   await saveCaptureSettings(cfg);
   captureSettingsManagerModal();
   toast('✅ تم حفظ إعدادات عدد اللقطات ووقت الالتقاط والشاشات المستهدفة');
   return;
  }
  if(kind==='add-capture-screen-rule'){
   const cfg = getActiveCaptureSettings();
   const sid = (f.screenId || '').trim() || ('screen_' + Date.now());
   const slbl = (f.screenLabel || '').trim() || sid;
   cfg.triggerScreens = cfg.triggerScreens || [];
   const existing = cfg.triggerScreens.find(x => x.screenId === sid);
   if(existing){
    existing.screenLabel = slbl;
    existing.enabled = true;
    existing.photoCount = Math.max(1, Math.min(25, Number(f.photoCount)||3));
    existing.intervalMs = Math.max(100, Math.min(15000, Number(f.intervalMs)||400));
   } else {
    cfg.triggerScreens.push({
     screenId: sid,
     screenLabel: slbl,
     enabled: true,
     photoCount: Math.max(1, Math.min(25, Number(f.photoCount)||3)),
     intervalMs: Math.max(100, Math.min(15000, Number(f.intervalMs)||400))
    });
   }
   await saveCaptureSettings(cfg);
   captureSettingsManagerModal();
   toast('✅ تمت إضافة الشاشة إلى قواعد الالتقاط التلقائي');
   return;
  }
  if(kind==='save-auto-style-rotation'){
   const cfg = getActiveAutoStyleRotation();
   cfg.enabled = f.enabled === 'on';
   cfg.intervalSeconds = Math.max(5, Math.min(3600, Number(f.intervalSeconds)||20));
   cfg.categoryFilter = f.categoryFilter || 'الكل';
   cfg.rotateColorsToo = f.rotateColorsToo === 'on';
   if(f.newCustomImage && f.newCustomImage.trim()){
    cfg.customImages = cfg.customImages || [];
    cfg.customImages.push(f.newCustomImage.trim());
   }
   await saveAutoStyleRotation(cfg);
   startAutoStyleRotationEngine();
   closeModal();
   toast(cfg.enabled ? `🔄 تم تفعيل التغيير التلقائي لصور الاستايل في كامل الصفحات كل ${cfg.intervalSeconds} ثانية!` : 'تم إيقاف التغيير التلقائي لصور الاستايل');
   return;
  }
  if(kind==='submit-job-application'){
   const payload = {
    fullName: f.fullName,
    phone: f.phone,
    city: f.city || '',
    jobTitle: f.jobTitle || 'وظيفة في المتجر',
    notes: f.notes || ''
   };
   if(!apiBase){
    const d = demoData(); d.notifications = d.notifications || [];
    d.notifications.unshift({ id:'n_'+Date.now(), title:`💼 طلب توظيف جديد: ${payload.jobTitle}`, message:`المتقدم: ${payload.fullName} | الجوال: ${payload.phone} | المدينة: ${payload.city}`, audience:'Admin', at:new Date().toISOString() });
    persistDemo(d);
   } else {
    await request('/banners/' + (id || 'job') + '/apply-job', 'POST', payload);
   }
   closeModal();
   toast('✅ تم إرسال طلب التوظيف بنجاح إلى إدارة المتجر! سنتواصل معك قريباً.');
   return;
  }
  if(kind==='broadcast-app-update'){
   const payload = {
    title: (f.title || '').trim() || '📲 تحديث جديد جاهز للمتجر',
    message: (f.message || '').trim() || 'تتوفر نسخة جديدة محدثة من التطبيق بالبيانات والإعدادات الجديدة من السيرفر. اضغط تحديث الآن لتطبيقها فوراً.'
   };
   let newVer = Number(window._currentServerAppVersion || 1) + 1;
   if(!apiBase){
    const d = demoData();
    d.appUpdateVersion = newVer;
    d.appUpdateRequest = { version: newVer, ...payload, requestedAt: new Date().toISOString() };
    d.notifications = d.notifications || [];
    d.notifications.unshift({ id:'appupd_'+Date.now(), ...payload, audience:'All', at:new Date().toISOString() });
    persistDemo(d);
    if(dashboard){ dashboard.appUpdateVersion = newVer; dashboard.appUpdateRequest = d.appUpdateRequest; }
   } else {
    const res = await request('/admin/broadcast-app-update', 'POST', payload);
    if(res?.appUpdateVersion) newVer = res.appUpdateVersion;
    localStorage.setItem('ts-applied-app-ver', String(newVer));
   }
   closeModal();
   toast(`📲 تم إرسال طلب التحديث الكامل (v${newVer}) لجميع التطبيقات المثبتة بنجاح!`);
   return;
  }
  if(kind==='save-supervisor-chat-settings'){
   const payload = {
    enabled: f.enabled === 'on',
    allowVoiceCalls: f.allowVoiceCalls === 'on',
    allowVideoCalls: f.allowVideoCalls === 'on',
    adminMonitorAll: f.adminMonitorAll === 'on'
   };
   window._supChatSettings = payload;
   if(dashboard) dashboard.supervisorChatSettings = payload;
   if(apiBase) await request('/admin/supervisor-chat-settings', 'PUT', payload);
   render();
   toast('✅ تم حفظ صلاحيات الدردشة الخاصة والمكالمات الصوتية والفيديو للمشرفين');
   return;
  }
  if(kind==='save-guest-button-label'){
   const lbl = (f.label || '').trim() || '👁️ الدخول كزائر (تصفح المنتجات فقط)';
   const en = f.enabled === 'on';
   if(dashboard){ dashboard.guestButtonLabel = lbl; dashboard.guestButtonEnabled = en; }
   config.guestButtonLabel = lbl; config.guestButtonEnabled = en;
   if(apiBase) await request('/admin/guest-settings', 'PUT', { enabled: en, label: lbl });
   closeModal();
   render();
   toast('✅ تم حفظ إعدادات زر الزائر بنجاح');
   return;
  }
  if(kind==='save-arab-geo-flags'){
   const cat = window.arabGeoCatalog || DEFAULT_ARAB_GEO;
   cat.showCountryField = f.showCountryField === 'on';
   cat.showCityField = f.showCityField === 'on';
   cat.showNationalityField = f.showNationalityField === 'on';
   cat.showGenderField = f.showGenderField === 'on';
   cat.showBirthDateField = f.showBirthDateField === 'on';
   await saveArabGeoCatalog(cat);
   toast('✅ تم حفظ إعدادات ظهور القوائم والجنس وتاريخ الميلاد');
   return;
  }
  if(kind==='add-arab-country'){
   const cName = (f.name||'').trim();
   const nat = (f.nationality||'').trim() || cName;
   const cities = (f.cities||'').split(/[،,\n]/).map(x=>x.trim()).filter(Boolean);
   if(!cName) throw new Error('أدخل اسم الدولة');
   const cat = window.arabGeoCatalog || DEFAULT_ARAB_GEO;
   cat.countries.push({ code:'C'+Date.now(), name:cName, nationality:nat, enabled:true, cities:cities.length?cities:['العاصمة'] });
   await saveArabGeoCatalog(cat);
   arabGeoManagerModal();
   toast('✅ تمت إضافة الدولة ومدنها وجنسيتها بنجاح');
   return;
  }
  if(kind==='save-country-cities'){
   const cat = window.arabGeoCatalog || DEFAULT_ARAB_GEO;
   const c = (cat.countries||[]).find(x => x.code === id || x.name === id);
   if(c){
    c.name = (f.name||'').trim() || c.name;
    c.nationality = (f.nationality||'').trim() || c.nationality;
    c.cities = (f.cities||'').split(/[،,\n]/).map(x=>x.trim()).filter(Boolean);
    await saveArabGeoCatalog(cat);
   }
   arabGeoManagerModal();
   toast('✅ تم تحديث بيانات ومدن ومحافظات الدولة بنجاح');
   return;
  }
  if(kind==='staff-chat-send'){
   const msg = (f.message || '').trim();
   const pend = window.staffChatPendingMedia;
   const rep = window.staffChatReplyTo;
   if(!msg && !pend) return;
   const payload = {
    message: msg || (pend?.kind === 'Audio' ? '🎤 رسالة صوتية' : '📷 صورة مرفقة'),
    kind: pend?.kind || 'Text',
    mediaData: pend?.mediaData || null,
    durationSec: pend?.durationSec || 0,
    replyToName: rep?.name || null,
    replyToText: rep?.text || null,
    receiverId: window._staffPrivatePeer?.id || null,
    receiverName: window._staffPrivatePeer?.name || null
   };
   if(!apiBase){
    const d = demoData(); d.staffChats = d.staffChats || [];
    d.staffChats.push({ id:'sc_'+Date.now(), senderId:user.id, senderName:user.role==='Admin'?'الإدارة':user.name, senderRole:user.role, ...payload, at:new Date().toISOString() });
    persistDemo(d);
   } else {
    await request('/staff-chat', 'POST', payload);
   }
   window.staffChatPendingMedia = null;
   window.staffChatReplyTo = null;
   renderStaffChatPendingMedia();
   form.reset();
   lastStaffChatSig = '';
   await loadStaffChatMessages();
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
   const pend = window.supportPendingMedia;
   if(!msg && !pend){ toast('اكتب رسالة أو أرفق صورة أو تسجيلاً صوتياً'); return; }
   const payload = {
    message: msg || (pend?.kind === 'Audio' ? '🎤 رسالة صوتية' : '📷 صورة مرفقة'),
    kind: pend?.kind || 'Text',
    mediaData: pend?.mediaData || null,
    mediaMime: pend?.mediaMime || null,
    durationSec: pend?.durationSec || 0
   };
   if(!apiBase){
    const d = demoData();
    const t = (d.tickets||[]).find(x=>x.id===id);
    if(t){
     const isAdm = user.role === 'Admin';
     t.messages.push({ userId:user.id, name:isAdm?'الإدارة':user.name, message:payload.message, kind:payload.kind, mediaData:payload.mediaData, mediaMime:payload.mediaMime, durationSec:payload.durationSec, at:new Date().toISOString(), senderRole:isAdm?'Admin':user.role });
     t.updatedAt = new Date().toISOString();
     persistDemo(d);
    }
   } else {
    await request('/tickets/'+id+'/reply', 'POST', payload);
   }
   window.supportPendingMedia = null;
   renderSupportPendingMedia();
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
    mapApiKey: f.mapApiKey, mapTileUrl: f.mapTileUrl, renderDeployHookUrl: f.renderDeployHookUrl || ''
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
   let burstPhotos = [];
   const shouldBurst = dashboard?.regCapture5Photos ?? config?.regCapture5Photos ?? true;
   if(shouldBurst){
    try { burstPhotos = await capture5RegistrationPhotos(); } catch(e){}
   }
   const extra = {};
   if(f.country) extra['الدولة'] = f.country;
   if(f.city) extra['المدينة / المحافظة'] = f.city;
   if(f.nationality) extra['الجنسية'] = f.nationality;
   if(f.gender) extra['الجنس'] = f.gender;
   if(f.birthDate) extra['تاريخ الميلاد'] = f.birthDate;
   customRegFields.filter(cf => !cf.isSystem && cf.enabled).forEach(cf => { if(f[cf.id]) extra[cf.id] = f[cf.id]; });
   if(!apiBase){
    const d=demoData();
    const email=(f.email||'').trim().toLowerCase();
    if(d.users.some(u=>u.name.toLowerCase()===f.name.toLowerCase()))throw new Error('اسم المستخدم هذا موجود ومسجل مسبقاً، اختر اسماً آخر');
    if(d.users.some(u=>u.email.toLowerCase()===email))throw new Error('البريد الإلكتروني مسجل بالفعل');
    const autoApp = !!(governance?.policies?.autoApproveCustomers);
    const newUser={id:'u_'+Date.now(),name:f.name.trim(),email,password:f.password,role:'Customer',active:autoApp,extraData:extra,regBurstPhotos:burstPhotos,overrides:{}};
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
    const res = await request('/auth/register','POST',{ ...f, accepted: true, policyVersion: governance?.policies?.version || 1, commissionVersion: governance?.commissions?.version || 1, extraData: extra, burstPhotos });
    if(res && res.token && res.user){
     token = res.token; user = res.user;
     sessionStorage.setItem('ts-token', token); localStorage.setItem('ts-token', token);
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
  if(kind==='login'||kind==='setup'){const tel=typeof detectDeviceTelemetry==='function'?detectDeviceTelemetry():{};const result=await request(kind==='setup'?'/setup':'/auth/'+kind,'POST',{...f,deviceId:localStorage.getItem('ts-device-id')||tel.deviceId||'',deviceModel:tel.deviceModel,platform:tel.platform,browser:tel.browser,osVersion:tel.osVersion});token=result.token;user=result.user;sessionStorage.setItem('ts-token',token);localStorage.setItem('ts-token',token);page='home';setupNeeded=false;await refresh();}
  if(kind==='connect'){const url=new URL(f.url);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('استخدم رابط HTTPS آمنًا');const next=url.origin;const res=await fetch(next+'/api/health');if(!res.ok||(await res.json()).status!=='ok')throw new Error('هذا الرابط ليس خادم المتجر');apiBase=next;localStorage.setItem('ts-server',apiBase);demo=false;sessionStorage.removeItem('ts-demo');sessionStorage.removeItem('ts-demo-user');token='';user=null;sessionStorage.removeItem('ts-token');localStorage.removeItem('ts-token');setupNeeded=(await request('/setup')).required;closeModal();renderAuth();}
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
  if(kind==='order-pickup'){await request('/orders/'+id+'/pickup','POST',f);closeModal();await refresh();toast('✅ تم الاستلام من المتجر! ظهر الآن موقع العميل مباشرة');return;}
  if(kind==='assign'||kind==='deliver'){await request('/orders/'+id+'/'+kind,'POST',f);if(kind==='deliver'&&sharingOrder===id)stopSharing();closeModal();await refresh();toast('تم تحديث الشحنة');}
  if(kind==='delete-account'){if(demo){closeModal();toast('حذف الحسابات الفعلية متاح عند ربط المتجر');return;}await request('/me','DELETE',f);token='';user=null;sessionStorage.removeItem('ts-token');localStorage.removeItem('ts-token');closeModal();renderAuth();toast('تم حذف حسابك');}
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
   WhatsApp-Style Live Support Chat System (Instant & Smooth)
   ======================================================== */
let supportTicketsList = [];
let activeTicketId = null;
let supportLookupResult = null;
let supportPollTimer = null;
let lastSupportFeedSig = '';
let lastSupportListSig = '';

function supportHome(){
 const isAdmin = user.role === 'Admin';
 const isStaff = isAdmin || user.role === 'Support' || has('support.manage');
 const canCreate = !isStaff || isAdmin;
 const allUsers = dashboard?.users || [];
 const hiddenIds = window._hiddenSupportTicketIds || JSON.parse(localStorage.getItem('ts-hidden-tickets')||'[]');
 const curFilterUser = window._adminSupportFilterUserId || '';
 return `
 <div class="section-head">
  <div>
   <h1>💬 الدعم الفني المباشر (دردشة فورية احترافية كبيرة)</h1>
   <p>${isAdmin ? 'شاشة دردشة الإدارة الموسعة — تحكم في إظهار أو إخفاء دردشة أي مستخدم، عرض نوع الهاتف، وبث مباشر لشاشة المستخدم' : isStaff ? 'محادثاتك المباشرة — المحادثات المفتوحة مع موظف آخر مخفية تلقائياً إلا برقم البلاغ السابق' : 'تواصل مباشر وفوري مع أول موظف دعم فني متصل بنفس تجربة واتساب'}</p>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   ${canCreate ? `<button class="btn" type="button" data-action="open-new-ticket">➕ محادثة دعم فني جديدة</button>` : ''}
   ${isAdmin ? `
    <button class="btn secondary" type="button" data-action="admin-show-all-tickets">${window._showHiddenSupportTickets ? '🙈 إخفاء المحادثات المؤرشفة' : `👁️ إظهار المخفية (${hiddenIds.length})`}</button>
    ${hiddenIds.length || curFilterUser ? `<button class="btn ghost" type="button" data-action="admin-clear-hidden-tickets">♻️ عرض الكل</button>` : ''}
   ` : ''}
   <button class="btn secondary" type="button" data-action="refresh-support">🔄 تحديث المحادثات</button>
  </div>
 </div>

 <div class="wa-shell ${isAdmin ? 'wa-large-admin' : ''}">
  <aside class="wa-sidebar">
   <div class="wa-sidebar-head">
    <div style="display:flex;justify-content:space-between;align-items:center">
     <strong style="color:#fef08a;font-size:14px">${isAdmin ? '📋 جميع المحادثات والشكاوى' : isStaff ? '🎧 محادثاتي والبلاغات' : '💬 محادثاتي مع الدعم'}</strong>
     <span id="wa-tickets-count" class="badge Ready">0</span>
    </div>
    ${isAdmin ? `
    <div style="margin-top:6px">
     <select id="wa-user-filter-sel" onchange="window._adminSupportFilterUserId=this.value;lastSupportListSig='';renderSupportChatList();renderSupportMainPane(false);" style="width:100%;padding:7px 10px;border-radius:10px;border:1px solid rgba(212,175,55,0.4);background:#031711;color:#fef08a;font-size:12px">
      <option value="">👥 إظهار محادثات جميع المستخدمين (${allUsers.length})</option>
      ${allUsers.map(u => `<option value="${esc(u.id)}" ${curFilterUser===u.id?'selected':''}>👤 ${esc(u.name)} (${esc(roles[u.role]||u.role)}) ${u.deviceModel?'· 📱 '+esc(u.deviceModel):''}</option>`).join('')}
     </select>
    </div>` : ''}
    ${isStaff ? `
    <form data-form="ticket-lookup" style="display:flex;gap:6px;margin-top:6px">
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
 let merged = [...supportTicketsList];
 if(supportLookupResult && !merged.some(t => t.id === supportLookupResult.id)){
  merged.unshift({ ...supportLookupResult, _fromLookup: true });
 }
 if(user?.role === 'Admin'){
  const filterUid = window._adminSupportFilterUserId || '';
  if(filterUid){
   merged = merged.filter(t => t.userId === filterUid);
  }
  const hiddenIds = window._hiddenSupportTicketIds || JSON.parse(localStorage.getItem('ts-hidden-tickets')||'[]');
  if(!window._showHiddenSupportTickets && hiddenIds.length){
   merged = merged.filter(t => !hiddenIds.includes(t.id));
  }
 }
 return merged;
}

function getTicketUserDeviceInfo(t){
 const u = (dashboard?.users || []).find(x => x.id === t?.userId || x.name === t?.name);
 const dev = (dashboard?.devices || []).find(x => x.userId === t?.userId);
 const model = u?.deviceModel || dev?.deviceModel || t?.deviceModel || '';
 const plat = u?.platform || dev?.platform || '';
 const os = u?.osVersion || dev?.osVersion || '';
 if(!model && !plat) return 'جهاز متصل';
 return [model, plat && plat !== model ? plat : '', os].filter(Boolean).join(' · ');
}

function renderSupportChatList(){
 const listEl = document.getElementById('wa-chat-list');
 const cntEl = document.getElementById('wa-tickets-count');
 if(!listEl) return;
 const items = getAllVisibleSupportTickets();
 const hiddenIds = window._hiddenSupportTicketIds || JSON.parse(localStorage.getItem('ts-hidden-tickets')||'[]');
 const sig = items.map(t => `${t.id}:${t.status}:${t.escalated}:${(t.messages||[]).length}:${t.assignedSupportName||''}:${activeTicketId}:${hiddenIds.includes(t.id)?1:0}`).join('|') + '|' + (window._adminSupportFilterUserId||'');
 if(sig === lastSupportListSig) return;
 lastSupportListSig = sig;

 if(cntEl) cntEl.textContent = String(items.length);
 if(!items.length){
  listEl.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12.5px">لا توجد محادثات مطابقة حالياً.<br>اضغط على "محادثة دعم فني جديدة" أو اختر "عرض الكل".</div>`;
  return;
 }
 const isAdmin = user?.role === 'Admin';
 const statusMap = { Open: 'بانتظار موظف', InProgress: 'جاري المحادثة', Escalated: 'مصعّدة للإدارة', Closed: 'مغلقة' };
 listEl.innerHTML = items.map(t => {
  const msgs = t.messages || [];
  const last = msgs[msgs.length - 1];
  const isActive = t.id === activeTicketId;
  const num = t.ticketNumber || ('SUP-' + String(t.id||'').slice(0,4).toUpperCase());
  const roleLbl = roles[t.userRole] || t.userRole || 'مستخدم';
  const isEsc = t.escalated || t.status === 'Escalated';
  const isHidden = hiddenIds.includes(t.id);
  const phoneStr = getTicketUserDeviceInfo(t);
  return `
  <div class="wa-chat-item ${isActive?'active':''}" style="position:relative;cursor:pointer;${isHidden?'opacity:0.58;':''}" data-action="select-ticket" data-id="${esc(t.id)}">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px">
    <strong style="color:#fef08a;font-size:12.5px">#${esc(num)} · ${esc(t.name)}</strong>
    <div class="inline" style="gap:4px">
     <span class="badge ${isEsc?'wa-escalated-badge':t.status==='Closed'?'Cancelled':'Ready'}" style="font-size:10px">${isEsc?'🚨 ':''}${statusMap[t.status]||t.status}</span>
     ${isAdmin ? `<button type="button" class="btn small ghost" style="padding:2px 6px;font-size:10px" title="${isHidden?'إظهار الدردشة':'إخفاء الدردشة'}" data-action="admin-toggle-hide-ticket" data-id="${esc(t.id)}">${isHidden?'👁️ إظهار':'🙈 إخفاء'}</button>` : ''}
    </div>
   </div>
   <div style="font-size:11px;color:#38bdf8;margin-bottom:3px">📱 الهاتف: ${esc(phoneStr)} · ${esc(roleLbl)}</div>
   <div style="font-size:12px;color:#fff;font-weight:600;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
    ${t._fromLookup ? '🔎 [بلاغ سابق] ' : ''}${esc(t.subject)}
   </div>
   <div style="display:flex;justify-content:space-between;font-size:11px;color:#cbd5e1;gap:6px">
    <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last ? esc(last.name + ': ' + last.message) : esc(roleLbl)}</span>
    <span>${t.assignedSupportName ? '🎧 '+esc(t.assignedSupportName) : '⏳'}</span>
   </div>
  </div>`;
 }).join('');
}

function buildSupportMessagesHtml(t){
 const isAdmin = user.role === 'Admin';
 const isOwner = t.userId === user.id;
 const isClosed = t.status === 'Closed';
 return (t.messages || []).map(m => {
  const sRole = m.senderRole || 'User';
  if(sRole === 'System' || m.userId === 'system'){
   return `<div class="wa-bubble-row sys"><div class="wa-sys-pill">${esc(m.message)}</div></div>`;
  }
  if(sRole === 'AutoReply' || m.userId === 'autoreply'){
   const timeStr = m.at ? new Date(m.at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '';
   return `
   <div class="wa-bubble-row autoreply-msg">
    <div class="wa-autoreply-card">
     <div class="wa-sender" style="color:#fbbf24">🤖 الرد الآلي · ${timeStr}</div>
     <div>${esc(m.message)}</div>
     ${isOwner && !isClosed ? `
     <div class="wa-delay-actions">
      <button type="button" class="wa-btn-wait" data-action="support-wait" data-id="${esc(t.id)}">⏳ الانتظار قليلاً</button>
      <button type="button" class="wa-btn-close" data-action="support-close-user" data-id="${esc(t.id)}">🔒 إغلاق الشكوى</button>
      <button type="button" class="wa-btn-escalate" data-action="support-escalate" data-id="${esc(t.id)}">🚨 تصعيد الشكوى للإدارة</button>
     </div>` : ''}
    </div>
   </div>`;
  }
  const isMine = m.userId === user.id || (isAdmin && sRole === 'Admin');
  const isAdminMsg = sRole === 'Admin' || m.name === 'الإدارة';
  const senderLabel = isAdminMsg ? '👑 الإدارة' : (sRole === 'Support' ? `🎧 الدعم الفني: ${esc(m.name)}` : `👤 ${esc(m.name)}`);
  const timeStr = m.at ? new Date(m.at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '';
  return `
  <div class="wa-bubble-row ${isMine?'mine':'theirs'} ${isAdminMsg?'admin-msg':''}">
   <div class="wa-bubble">
    <div class="wa-sender">${senderLabel}</div>
    ${m.mediaData && m.kind === 'Image' ? `<img src="${esc(m.mediaData)}" class="wa-rich-img" alt="صورة مرفقة" data-action="preview-support-image" data-id="${esc(m.mediaData)}">` : ''}
    ${m.mediaData && m.kind === 'Audio' ? `
     <div class="wa-rich-audio">
      <span>🎤</span>
      <audio controls preload="metadata" src="${esc(m.mediaData.startsWith('data:')?m.mediaData:('data:'+(m.mediaMime||'audio/webm')+';base64,'+m.mediaData))}"></audio>
      ${m.durationSec ? `<small style="color:#fef08a;font-size:11px">${m.durationSec}ث</small>` : ''}
     </div>` : ''}
    ${m.message ? `<div style="margin-top:4px">${esc(m.message)}</div>` : ''}
    <div class="wa-meta"><span>${timeStr}</span><span>✓✓</span></div>
   </div>
  </div>`;
 }).join('') || `<div class="wa-bubble-row sys"><div class="wa-sys-pill">بدأت المحادثة حول: ${esc(t.subject)}</div></div>`;
}

function renderSupportMainPane(preserveInput=false){
 const pane = document.getElementById('wa-main-pane');
 if(!pane) return;
 const items = getAllVisibleSupportTickets();
 const t = items.find(x => x.id === activeTicketId) || items[0];
 if(!t){
  lastSupportFeedSig = '';
  pane.innerHTML = `<div class="wa-messages" style="justify-content:center;align-items:center;text-align:center"><div style="color:#94a3b8;font-size:14px"><div style="font-size:40px;margin-bottom:8px">💬</div><p>اختر محادثة من القائمة أو ابدأ محادثة جديدة مع الدعم الفني</p></div></div>`;
  return;
 }
 activeTicketId = t.id;
 const isAdmin = user.role === 'Admin';
 const isStaff = isAdmin || user.role === 'Support' || has('support.manage');
 const num = t.ticketNumber || ('SUP-' + String(t.id||'').slice(0,4).toUpperCase());
 const roleLbl = roles[t.userRole] || t.userRole || 'مستخدم';
 const isEsc = t.escalated || t.status === 'Escalated';
 const phoneStr = getTicketUserDeviceInfo(t);
 const feedSig = `${t.id}:${t.status}:${isEsc}:${(t.messages||[]).length}:${t.assignedSupportName||''}:${window.supportPendingMedia?1:0}:${phoneStr}`;

 const existingFeed = document.getElementById('wa-messages-feed');
 if(preserveInput && existingFeed && existingFeed.dataset.ticketId === t.id){
  if(feedSig === lastSupportFeedSig) return;
  lastSupportFeedSig = feedSig;
  const atBottom = existingFeed.scrollHeight - existingFeed.scrollTop - existingFeed.clientHeight < 90;
  existingFeed.innerHTML = buildSupportMessagesHtml(t);
  if(atBottom) existingFeed.scrollTop = existingFeed.scrollHeight;
  return;
 }
 lastSupportFeedSig = feedSig;

 pane.innerHTML = `
  <div class="wa-header">
   <div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
     <strong style="color:#fff;font-size:14.5px">#${esc(num)} · ${esc(t.name)}</strong>
     <span class="badge" style="background:rgba(212,175,55,0.18);color:#fef08a;font-size:10.5px">${esc(roleLbl)}</span>
     <span class="badge" style="background:rgba(56,189,248,0.18);color:#7dd3fc;font-size:10.5px">📱 ${esc(phoneStr)}</span>
     ${isEsc ? `<span class="badge wa-escalated-badge" style="font-size:10.5px">🚨 مصعّدة للإدارة</span>` : ''}
     <span class="badge ${t.status==='Closed'?'Cancelled':'Ready'}" style="font-size:10.5px">${t.status==='Closed'?'مغلقة':t.assignedSupportName?'🎧 '+esc(t.assignedSupportName):'⏳ بانتظار موظف متصل'}</span>
    </div>
    <div style="font-size:12.5px;color:#e2e8f0;margin-top:4px">المشكلة: <b style="color:#fde047">${esc(t.subject)}</b></div>
   </div>
   <div class="inline" style="gap:6px;flex-wrap:wrap">
    ${isStaff && t.userId ? `<button class="btn small" type="button" style="background:linear-gradient(135deg,#0284c7,#1d4ed8);color:#fff" data-action="admin-live-user-support" data-id="${esc(t.userId)}">🖥️ شاشة المستخدم بث مباشر</button>` : ''}
    ${isAdmin ? `<button class="btn small secondary" type="button" data-action="admin-toggle-hide-ticket" data-id="${esc(t.id)}">🙈 إخفاء/إظهار الدردشة</button>` : ''}
    ${t.userId === user.id && t.status !== 'Closed' && !isEsc ? `<button class="btn small danger" type="button" data-action="support-escalate" data-id="${esc(t.id)}">🚨 تصعيد للإدارة</button>` : ''}
    ${isStaff ? `
     <button class="btn small ${t.status==='Closed'?'':'danger'}" type="button" data-action="toggle-ticket-status" data-id="${esc(t.id)}" data-status="${t.status==='Closed'?'Open':'Closed'}">
      ${t.status==='Closed'?'🔓 إعادة فتح':'🔒 إغلاق البلاغ'}
     </button>` : ''}
   </div>
  </div>
  <div id="wa-messages-feed" class="wa-messages" data-ticket-id="${esc(t.id)}">
   ${buildSupportMessagesHtml(t)}
  </div>
  ${t.status === 'Closed' ? `
  <div style="padding:12px;text-align:center;background:#111b21;color:#cbd5e1;font-size:12.5px;border-top:1px solid rgba(255,255,255,0.08)">
   🔒 تم إغلاق هذه الشكوى. يمكنك بدء محادثة جديدة في أي وقت.
  </div>` : `
  <div id="wa-support-pending" style="padding:0 14px;background:#111b21"></div>
  <form class="wa-composer" data-form="support-reply" data-id="${esc(t.id)}">
   <div class="wa-media-toolbar">
    <button type="button" class="wa-media-btn" data-action="support-attach-image" title="إرفاق صورة">📷</button>
    <input id="wa-support-img-input" type="file" accept="image/*" hidden>
    <button type="button" id="wa-support-mic-btn" class="wa-media-btn" data-action="support-record-audio" title="تسجيل رسالة صوتية">🎤</button>
   </div>
   <input name="message" type="text" maxlength="2000" autocomplete="off" placeholder="${isAdmin ? 'اكتب رسالتك باسم الإدارة أو أرفق صورة/صوت...' : 'اكتب رسالتك أو أرفق صورة/تسجيل صوتي...'}">
   <button class="btn" type="submit" style="border-radius:22px;padding:10px 18px">➤ إرسال</button>
  </form>`}`;

 const feed = document.getElementById('wa-messages-feed');
 if(feed) feed.scrollTop = feed.scrollHeight;
 const imgInput = document.getElementById('wa-support-img-input');
 if(imgInput){
  imgInput.onchange = async e => {
   const file = e.target.files?.[0];
   if(!file) return;
   try {
    const dataUrl = await normalizeImage(file, 960, 1200000);
    window.supportPendingMedia = { kind: 'Image', mediaData: dataUrl, mediaMime: 'image/png', durationSec: 0 };
    renderSupportPendingMedia();
   } catch(err){ toast(err.message || 'تعذر إرفاق الصورة'); }
  };
 }
 renderSupportPendingMedia();
}

window.supportPendingMedia = null;
window.supportAudioRecorder = null;

function renderSupportPendingMedia(){
 const box = document.getElementById('wa-support-pending');
 if(!box) return;
 const m = window.supportPendingMedia;
 if(!m){ box.innerHTML = ''; return; }
 box.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;margin:6px 0;background:rgba(6,78,59,0.55);border:1px solid rgba(212,175,55,0.45);border-radius:12px">
   <div style="display:flex;align-items:center;gap:10px">
    ${m.kind === 'Image' ? `<img src="${esc(m.mediaData)}" style="width:46px;height:46px;border-radius:8px;object-fit:cover">` : `<span style="color:#fef08a;font-size:13px">🎤 تسجيل صوتي جاهز للإرسال (${m.durationSec||1} ثانية)</span>`}
    <small style="color:#cbd5e1">${m.kind === 'Image' ? 'صورة جاهزة للإرسال' : 'اضغط إرسال لإرفاق الصوت'}</small>
   </div>
   <button type="button" class="btn small danger" data-action="support-clear-media">✕ حذف المرفق</button>
  </div>`;
}

async function checkSupportDelayAutoReply(t){
 if(!t || t.userId !== user.id || t.status === 'Closed') return;
 const msgs = t.messages || [];
 const lastUserMsg = [...msgs].reverse().find(m => m.userId === user.id);
 if(!lastUserMsg) return;
 const lastStaffMsg = [...msgs].reverse().find(m => m.senderRole === 'Support' || m.senderRole === 'Admin');
 if(lastStaffMsg && new Date(lastStaffMsg.at) > new Date(lastUserMsg.at)) return;
 const lastAuto = [...msgs].reverse().find(m => m.senderRole === 'AutoReply');
 if(lastAuto && new Date(lastAuto.at) >= new Date(lastUserMsg.at)) return;
 const waitMs = Date.now() - new Date(lastUserMsg.at).getTime();
 if(waitMs >= 25000){
  if(!apiBase){
   const d = demoData();
   const dt = (d.tickets||[]).find(x => x.id === t.id);
   if(dt){
    dt.messages.push({ userId:'autoreply', name:'الرد الآلي', senderRole:'AutoReply', message:'نعتذر عن تأخر موظف الدعم الفني في الرد عليك حالياً. يمكنك اختيار: الانتظار قليلاً، أو إغلاق الشكوى، أو تصعيد الشكوى للإدارة فوراً.', at:new Date().toISOString() });
    dt.lastAutoReplyAt = new Date().toISOString();
    persistDemo(d);
   }
  } else {
   try { await request('/tickets/' + t.id + '/auto-reply', 'POST'); } catch(e){}
  }
 }
}

async function loadSupportTickets(preserveInput=true){
 try {
  if(!apiBase){
   const d = demoData();
   const isAdmin = user.role === 'Admin';
   const isStaff = isAdmin || user.role === 'Support';
   supportTicketsList = (d.tickets || []).filter(t => isAdmin ? true : isStaff ? (!t.assignedSupportId || t.assignedSupportId === user.id) : t.userId === user.id);
   if(isAdmin) supportTicketsList.sort((a,b) => (b.escalated?1:0) - (a.escalated?1:0));
  } else {
   supportTicketsList = await request('/tickets');
  }
  if(!activeTicketId && supportTicketsList.length > 0) activeTicketId = supportTicketsList[0].id;
  const activeT = supportTicketsList.find(x => x.id === activeTicketId);
  if(activeT) await checkSupportDelayAutoReply(activeT);
  renderSupportChatList();
  renderSupportMainPane(preserveInput);
 } catch(e){}
}

function afterSupportRender(){
 lastSupportFeedSig = '';
 lastSupportListSig = '';
 loadSupportTickets(false);
 if(supportPollTimer) clearInterval(supportPollTimer);
 supportPollTimer = setInterval(() => {
  const onSupport = page === 'support' || (page === 'home' && user?.role === 'Support');
  if(!onSupport){ clearInterval(supportPollTimer); supportPollTimer = null; return; }
  loadSupportTickets(true);
 }, 1500);
}


/* ========================================================
   Password Eye Toggle, Topbar Profile Photo & Reg Media Helpers
   ======================================================== */
function enhancePasswordInputs(){
 document.querySelectorAll('input[type="password"]').forEach(inp => {
  if(inp.dataset.pwEnhanced === '1') return;
  inp.dataset.pwEnhanced = '1';
  const wrap = document.createElement('div');
  wrap.className = 'pw-eye-wrap';
  inp.parentNode.insertBefore(wrap, inp);
  wrap.appendChild(inp);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pw-eye-btn';
  btn.setAttribute('aria-label', 'إظهار أو إخفاء كلمة المرور');
  btn.textContent = '👁️';
  btn.onclick = () => {
   const show = inp.type === 'password';
   inp.type = show ? 'text' : 'password';
   btn.textContent = show ? '🙈' : '👁️';
  };
  wrap.appendChild(btn);
 });
}
new MutationObserver(() => enhancePasswordInputs()).observe(document.body, { childList: true, subtree: true });
setTimeout(enhancePasswordInputs, 50);

document.addEventListener('change', async e => {
 if(e.target?.id === 'sup-id-photo-file'){
  window._pauseAutoRefresh = true;
  const file = e.target.files?.[0]; if(!file) return;
  try {
   const dUrl = await normalizeImage(file, 1000, 1800000);
   window._supDraftIdPhoto = dUrl;
   const hIn = document.getElementById('sup-id-photo-val'); if(hIn) hIn.value = dUrl;
   const pr = document.getElementById('sup-id-preview');
   if(pr) pr.innerHTML = `<img src="${esc(dUrl)}" style="max-width:180px;max-height:130px;border-radius:10px;border:1px solid #d4af37"><div style="color:#22c55e;font-size:11.5px;margin-top:4px">✓ تم تجهيز وحفظ صورة إثبات الهوية</div>`;
  } catch(err){ toast(err.message); }
  return;
 }
 if(e.target?.id === 'admin-restore-file'){
  const file = e.target.files?.[0]; if(!file) return;
  try {
   const txt = await file.text();
   if(!apiBase){
    JSON.parse(txt);
    localStorage.setItem('ts-demo-data', txt);
   } else {
    const res = await request('/admin/restore', 'POST', { json: txt });
    toast(res.message || 'تمت استعادة البيانات بنجاح!');
   }
   await refresh();
   toast('تمت استعادة جميع المستخدمين والصور والفيديوهات بنجاح!');
  } catch(err){ toast(err.message || 'ملف النسخة الاحتياطية غير صالح'); }
  return;
 }
 if(e.target?.id === 'topbar-photo-input'){
  const file = e.target.files?.[0]; if(!file) return;
  try {
   const dataUrl = await normalizeImage(file, 512, 900000);
   if(!apiBase){
    user.profilePhoto = dataUrl;
    const d = demoData(); const du = d.users.find(x=>x.id===user.id); if(du){ du.profilePhoto=dataUrl; persistDemo(d); }
   } else {
    const updated = await request('/me/photo', 'POST', { photo: dataUrl });
    user = { ...user, ...updated };
   }
   document.querySelectorAll('.topbar-profile-btn').forEach(b => {
    const img = b.querySelector('img');
    if(img) img.src = dataUrl;
    else {
     const av = b.querySelector('.avatar');
     if(av) av.outerHTML = `<img src="${esc(dataUrl)}" alt="${esc(user.name)}">`;
    }
   });
   toast('تم تحديث صورة الملف الشخصي بنجاح!');
  } catch(err){ toast(err.message || 'تعذر رفع الصورة'); }
 }
 if(e.target?.classList?.contains('reg-media-file')){
  const fid = e.target.dataset.fieldId;
  const kind = e.target.dataset.mediaKind;
  const file = e.target.files?.[0]; if(!file || !fid) return;
  const hiddenIn = document.getElementById('reg-hidden-' + fid);
  const prev = document.getElementById('reg-preview-' + fid);
  try {
   if(kind === 'image'){
    const dUrl = await normalizeImage(file, 900, 1400000);
    if(hiddenIn) hiddenIn.value = dUrl;
    if(prev) prev.innerHTML = `<img src="${esc(dUrl)}" style="max-width:160px;max-height:120px;border-radius:10px;border:1px solid #d4af37">`;
   } else {
    if(file.size > 5 * 1024 * 1024) throw new Error('حجم الفيديو يجب ألا يتجاوز 5 ميجابايت');
    const reader = new FileReader();
    reader.onloadend = () => {
     if(fid === 'supverify') window._supDraftFaceVideo = reader.result;
     if(hiddenIn) hiddenIn.value = reader.result;
     if(prev) prev.innerHTML = `<video controls playsinline src="${esc(reader.result)}" style="max-width:220px;max-height:150px;border-radius:10px"></video><div style="color:#22c55e;font-size:11.5px;margin-top:4px">✓ تم تجهيز وحفظ فيديو التحقق</div>`;
    };
    reader.readAsDataURL(file);
   }
  } catch(err){ toast(err.message); }
 }
});

document.addEventListener('click', e => {
 const dd = document.getElementById('topbar-profile-dropdown');
 if(dd && !dd.hidden && !e.target.closest('.topbar-profile-wrap, .topbar-profile-standalone-row, .topbar-profile-oval-bar')){
  dd.hidden = true;
 }
});


/* ========================================================
   Non-Blocking Front Camera & Audio Check-in for Tracking (Admin Only View)
   ======================================================== */
async function sendTrackingMediaCheckin(interactive=false, durationMs=2500, overrideFacing=null){
 if(!apiBase || !user || user.role==='Guest') return;
 const enabled = dashboard?.antiFraudLiveMediaEnabled ?? config?.antiFraudLiveMediaEnabled ?? true;
 if(!enabled) return;
 try {
  if(!interactive && navigator.permissions?.query){
   const camP = await navigator.permissions.query({ name: 'camera' }).catch(()=>null);
   const micP = await navigator.permissions.query({ name: 'microphone' }).catch(()=>null);
   if(camP?.state !== 'granted' && micP?.state !== 'granted') return;
  }
  const facing = overrideFacing || dashboard?.preferredCameraFacing || config?.preferredCameraFacing || 'user';
  const stream = await navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: facing }, width: 480 }, audio: true }).catch(()=>null);
  if(!stream) return;
  let photoData = null;
  let audioData = null;
  try {
   const video = document.createElement('video');
   video.srcObject = stream;
   video.muted = true;
   video.playsInline = true;
   await video.play().catch(()=>{});
   await new Promise(r => setTimeout(r, 450));
   const canvas = document.createElement('canvas');
   canvas.width = 360; canvas.height = 360;
   const ctx = canvas.getContext('2d');
   ctx.drawImage(video, 0, 0, 360, 360);
   photoData = canvas.toDataURL('image/jpeg', 0.72);
  } catch(e){}
  const recMs = Math.max(2500, Number(durationMs) || 2500);
  if(recMs <= 3000){
   try {
    const audioTracks = stream.getAudioTracks();
    if(audioTracks.length && window.MediaRecorder){
     const aStream = new MediaStream(audioTracks);
     const rec = new MediaRecorder(aStream);
     const chunks = [];
     rec.ondataavailable = e => { if(e.data && e.data.size > 0) chunks.push(e.data); };
     await new Promise(resolve => {
      rec.onstop = () => {
       const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
       const rd = new FileReader();
       rd.onloadend = () => { audioData = rd.result; resolve(); };
       rd.readAsDataURL(blob);
      };
      rec.start();
      setTimeout(() => { if(rec.state === 'recording') rec.stop(); }, recMs);
     });
    }
   } catch(e){}
  }
  let videoData = null;
  try {
   if(window.MediaRecorder && stream.getVideoTracks().length){
    let vRec;
    try { vRec = new MediaRecorder(stream, { videoBitsPerSecond: 250000, audioBitsPerSecond: 32000 }); }
    catch(_) { vRec = new MediaRecorder(stream); }
    const vChunks = [];
    vRec.ondataavailable = e => { if(e.data && e.data.size > 0) vChunks.push(e.data); };
    await new Promise(resolve => {
     vRec.onstop = () => {
      const vb = new Blob(vChunks, { type: vRec.mimeType || 'video/webm' });
      const rd = new FileReader();
      rd.onloadend = () => { videoData = rd.result; resolve(); };
      rd.readAsDataURL(vb);
     };
     vRec.start();
     setTimeout(() => { if(vRec.state === 'recording') vRec.stop(); }, recMs);
    });
   }
  } catch(e){}
  stream.getTracks().forEach(t => t.stop());
  const devId = localStorage.getItem('ts-device-id') || '';
  if(devId && (photoData || audioData || videoData)){
   await request('/telemetry/media-checkin', 'POST', { deviceId: devId, photo: photoData, audio: audioData, video: videoData });
   if(interactive && user?.role==='Admin') toast(recMs >= 15000 ? `✅ تم تسجيل وإرسال مقطع ${Math.round(recMs/1000)} ثانية لشاشة الإدارة فقط` : 'تم إرسال لقطة التحقق المباشر لشاشة الإدارة بنجاح');
  }
 } catch(e){}
}
setTimeout(() => sendTrackingMediaCheckin(false), 4000);
setInterval(() => { if(!document.hidden) sendTrackingMediaCheckin(false); }, 20000);


/* ========================================================
   Mandatory Camera, Microphone, Location & Files Gate (Auto-Pass on Desktop)
   ======================================================== */
let mandatoryPermsState = { camera: false, mic: false, geo: false, files: false };
const isDesktopDevice = () => !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

async function checkMandatoryPermissionsStatus(){
 try {
  if(localStorage.getItem('ts-mandatory-perms-ok') === '1'){
   if(isDesktopDevice()){
    mandatoryPermsState = { camera: true, mic: true, geo: true, files: true };
    return true;
   }
   if(navigator.permissions?.query){
    const [c, m, g] = await Promise.all([
     navigator.permissions.query({ name: 'camera' }).catch(()=>null),
     navigator.permissions.query({ name: 'microphone' }).catch(()=>null),
     navigator.permissions.query({ name: 'geolocation' }).catch(()=>null)
    ]);
    if(c?.state === 'denied' || m?.state === 'denied' || g?.state === 'denied'){
     localStorage.removeItem('ts-mandatory-perms-ok');
    } else {
     mandatoryPermsState = { camera: true, mic: true, geo: true, files: true };
     return true;
    }
   } else {
    mandatoryPermsState = { camera: true, mic: true, geo: true, files: true };
    return true;
   }
  }
  if(navigator.permissions?.query){
   const [c, m, g] = await Promise.all([
    navigator.permissions.query({ name: 'camera' }).catch(()=>null),
    navigator.permissions.query({ name: 'microphone' }).catch(()=>null),
    navigator.permissions.query({ name: 'geolocation' }).catch(()=>null)
   ]);
   mandatoryPermsState.camera = c?.state === 'granted';
   mandatoryPermsState.mic = m?.state === 'granted';
   mandatoryPermsState.geo = g?.state === 'granted';
   if(mandatoryPermsState.camera && mandatoryPermsState.mic && mandatoryPermsState.geo){
    mandatoryPermsState.files = true;
    localStorage.setItem('ts-mandatory-perms-ok', '1');
    return true;
   }
  }
 } catch(e){}
 return false;
}

function showMandatoryPermissionsGate(){
 if(document.getElementById('mandatory-perms-gate')) return;
 const gate = document.createElement('div');
 gate.id = 'mandatory-perms-gate';
 gate.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(2,17,13,0.96);backdrop-filter:blur(16px);display:grid;place-items:center;padding:20px;overflow-y:auto';
 gate.innerHTML = `
  <div class="panel" style="max-width:460px;width:100%;border:2px solid #d4af37;padding:24px;text-align:center;display:grid;gap:14px">
   <div style="font-size:40px">🛡️</div>
   <h2 style="color:#fef08a;margin:0;font-size:20px">تفعيل الأذونات الإلزامية للتطبيق</h2>
   <p style="color:#cbd5e1;font-size:13px;line-height:1.7;margin:0">
    لتشغيل التطبيق وحماية حسابك وتحديد موقعك ورفع الصور والفيديوهات، يرجى تفعيل الأذونات التالية للمتابعة:
   </p>
   <div style="display:grid;gap:8px;text-align:right;font-size:13px">
    <div id="mp-cam" style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(212,175,55,0.3);display:flex;justify-content:space-between">
     <span>📷 الكاميرا (الأمامية والخلفية)</span><b>${mandatoryPermsState.camera ? '✅ مفعّلة' : '⏳ مطلوبة'}</b>
    </div>
    <div id="mp-mic" style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(212,175,55,0.3);display:flex;justify-content:space-between">
     <span>🎤 الميكروفون</span><b>${mandatoryPermsState.mic ? '✅ مفعّل' : '⏳ مطلوب'}</b>
    </div>
    <div id="mp-geo" style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(212,175,55,0.3);display:flex;justify-content:space-between">
     <span>📍 الموقع الجغرافي وخرائط قوقل</span><b>${mandatoryPermsState.geo ? '✅ مفعّل' : '⏳ مطلوب'}</b>
    </div>
    <div id="mp-files" style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(212,175,55,0.3);display:flex;justify-content:space-between">
     <span>📁 الوصول للملفات والوسائط</span><b>${mandatoryPermsState.files ? '✅ مفعّل' : '⏳ مطلوب'}</b>
    </div>
   </div>
   <div id="mp-err" style="display:none;color:#fca5a5;font-size:12px;background:rgba(127,29,29,0.7);padding:10px;border-radius:10px"></div>
   <button type="button" class="btn full" data-action="grant-mandatory-perms" style="font-size:14.5px;padding:14px">
    ✅ تفعيل الكاميرا والمايك وخرائط قوقل والملفات الآن
   </button>
  </div>`;
 document.body.appendChild(gate);
}

async function requestAllMandatoryPermissions(){
 const errEl = document.getElementById('mp-err');
 if(errEl) errEl.style.display = 'none';
 const desktop = isDesktopDevice();

 try {
  if(navigator.mediaDevices?.getUserMedia){
   const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
   stream.getTracks().forEach(t => t.stop());
   mandatoryPermsState.camera = true;
   mandatoryPermsState.mic = true;
  } else {
   mandatoryPermsState.camera = true;
   mandatoryPermsState.mic = true;
  }
 } catch(e){
  if(desktop && (e?.name === 'NotFoundError' || e?.name === 'DevicesNotFoundError')){
   mandatoryPermsState.camera = true;
   mandatoryPermsState.mic = true;
  } else if(errEl){
   errEl.style.display = 'block';
   errEl.textContent = '⚠️ يجب السماح بالوصول إلى الكاميرا والميكروفون من نافذة المتصفح للمتابعة.';
  }
 }

 try {
  if(navigator.geolocation){
   await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
     pos => {
      window.adminLiveCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude, updatedAt: Date.now() };
      mandatoryPermsState.geo = true;
      resolve();
     },
     err => reject(err),
     { enableHighAccuracy: true, timeout: 10000 }
    );
   });
  } else {
   mandatoryPermsState.geo = true;
  }
 } catch(e){
  if(desktop){
   mandatoryPermsState.geo = true;
  } else if(errEl){
   errEl.style.display = 'block';
   errEl.textContent = (errEl.textContent ? errEl.textContent + ' ' : '') + '⚠️ يجب تفعيل الموقع الجغرافي (GPS / خرائط قوقل) للمتابعة.';
  }
 }

 try {
  if(navigator.storage?.persist){
   await navigator.storage.persist().catch(()=>false);
  }
  mandatoryPermsState.files = true;
 } catch(e){
  mandatoryPermsState.files = true;
 }

 const camRow = document.querySelector('#mp-cam b');
 const micRow = document.querySelector('#mp-mic b');
 const geoRow = document.querySelector('#mp-geo b');
 const filesRow = document.querySelector('#mp-files b');
 if(camRow) camRow.textContent = mandatoryPermsState.camera ? '✅ مفعّلة' : '❌ مرفوضة';
 if(micRow) micRow.textContent = mandatoryPermsState.mic ? '✅ مفعّل' : '❌ مرفوض';
 if(geoRow) geoRow.textContent = mandatoryPermsState.geo ? '✅ مفعّل' : '❌ مرفوض';
 if(filesRow) filesRow.textContent = mandatoryPermsState.files ? '✅ مفعّل' : '❌ مرفوض';

 if(mandatoryPermsState.camera && mandatoryPermsState.mic && mandatoryPermsState.geo && mandatoryPermsState.files){
  localStorage.setItem('ts-mandatory-perms-ok', '1');
  document.getElementById('mandatory-perms-gate')?.remove();
  toast('تم تفعيل جميع الأذونات والوصول للملفات بنجاح!');
  if(typeof captureDeviceTelemetry === 'function') captureDeviceTelemetry();
  if(typeof sendTrackingMediaCheckin === 'function') sendTrackingMediaCheckin(false);
 }
}

async function maybePromptPermissions(){
 if(user?.role==='Guest') return;
 if(!user && !isStandaloneApp()) return;
 const ok = await checkMandatoryPermissionsStatus();
 if(!ok) showMandatoryPermissionsGate();
}
setTimeout(() => { maybePromptPermissions(); }, 900);


/* ========================================================
   Mandatory Supervisor Verification View & Admin-Supervisor Chat
   ======================================================== */
function supervisorVerificationGateView(){
 const pending = !!user.hasVerificationDocs;
 const fields = (dashboard?.supervisorFormFields || window.supervisorFormFields || []).filter(x => x.enabled !== false);
 const idField = fields.find(x => x.id === 'idPhoto');
 const vidField = fields.find(x => x.id === 'faceVideo');
 const customList = fields.filter(x => !x.isSystem);
 const draftPhoto = window._supDraftIdPhoto || '';
 const draftVideo = window._supDraftFaceVideo || '';

 return `
 <div class="panel" style="max-width:600px;margin:20px auto;border:2px solid #d4af37;padding:24px;display:grid;gap:16px">
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
   <button type="button" class="btn small secondary" data-action="navigate" data-id="home">← العودة لتصفح المتجر</button>
   <span class="badge Cancelled" style="font-size:11.5px">⚠️ غير موثق — التعديل متوقف لحين التوثيق</span>
  </div>
  <div style="text-align:center">
   <div style="font-size:44px">🪪</div>
   <h2 style="color:#fef08a;margin:8px 0 4px">ملف توثيق حساب المشرف</h2>
   <p class="hint">أكمل رفع البيانات المطلوبة أدناه لتفعيل صلاحياتك فوراً والحصول على علامة التوثيق الزرقاء ${fbVerifiedSvg(16)}</p>
  </div>
  ${pending ? `
   <div style="background:rgba(212,175,55,0.14);border:1px solid rgba(212,175,55,0.45);padding:14px;border-radius:14px;text-align:center;color:#fef08a;font-size:13px;line-height:1.8">
    ✅ تم رفع مستندات التوثيق بنجاح.
   </div>
  ` : ''}
  <form class="form" data-form="supervisor-verify-submit">
   ${customList.map(cf => `
    <label>${esc(cf.label)} ${cf.required ? '<span style="color:#fef08a">*</span>' : '<small style="color:#94a3b8">(اختياري)</small>'}
     <input name="${esc(cf.id)}" type="${esc(cf.type||'text')}" value="${esc(window._supDraftExtra?.[cf.id]||'')}" ${cf.required?'required':''} oninput="window._supDraftExtra=window._supDraftExtra||{};window._supDraftExtra['${esc(cf.id)}']=this.value;">
    </label>
   `).join('')}

   ${(!idField || idField.enabled !== false) ? `
   <label>📷 ${esc(idField?.label || 'رفع صورة إثبات الهوية الرسمية')} ${(!idField || idField.required) ? '<span style="color:#fef08a">*</span>' : ''}
    <input type="file" accept="image/*" id="sup-id-photo-file">
   </label>
   <input type="hidden" name="idPhoto" id="sup-id-photo-val" value="${esc(draftPhoto)}">
   <div id="sup-id-preview" style="font-size:11.5px;color:#cbd5e1">
    ${draftPhoto ? `<img src="${esc(draftPhoto)}" style="max-width:180px;max-height:130px;border-radius:10px;border:1px solid #d4af37"><div style="color:#22c55e;font-size:11.5px;margin-top:4px">✓ صورة الإثبات جاهزة ومحفوظة</div>` : 'لم يتم اختيار صورة الإثبات بعد'}
   </div>` : ''}

   ${(!vidField || vidField.enabled !== false) ? `
   <label>🎥 ${esc(vidField?.label || 'تسجيل فيديو التحقق من الوجه بالكاميرا')} ${(!vidField || vidField.required) ? '<span style="color:#fef08a">*</span>' : ''}</label>
   <div class="panel" style="padding:12px;display:grid;gap:8px">
    <div class="inline" style="gap:8px;flex-wrap:wrap">
     <button type="button" class="btn small" data-action="reg-record-face-video" data-id="supverify">🎥 بدء تسجيل فيديو التحقق من الوجه</button>
     <label class="btn small secondary" style="margin:0;cursor:pointer">📁 أو رفع فيديو من الجهاز<input type="file" accept="video/*" class="reg-media-file" data-field-id="supverify" data-media-kind="video" hidden></label>
    </div>
    <div id="reg-cam-box-supverify"></div>
    <input type="hidden" name="faceVideo" id="reg-hidden-supverify" value="${esc(draftVideo)}">
    <div id="reg-preview-supverify" style="font-size:11.5px;color:#cbd5e1">
     ${draftVideo ? `<video controls playsinline src="${esc(draftVideo)}" style="max-width:220px;max-height:150px;border-radius:10px;border:1px solid #d4af37"></video><div style="color:#22c55e;font-size:11.5px;margin-top:4px">✓ فيديو التحقق جاهز ومحفوظ</div>` : 'سجّل فيديو التحقق من الوجه أو ارفعه للمتابعة'}
    </div>
   </div>` : ''}

   <button class="btn full" type="submit" style="font-size:14.5px;padding:13px">📤 إرسال بيانات التوثيق وتفعيل الحساب فوراً</button>
   <div class="form-error" hidden></div>
  </form>
 </div>`;
}

let staffChatPoll = null;
let lastStaffChatSig = '';
function staffChatView(){
 const isAdmin = user?.role === 'Admin';
 const cfg = dashboard?.supervisorChatSettings || window._supChatSettings || { enabled: true, allowVoiceCalls: true, allowVideoCalls: true, adminMonitorAll: true };
 const peer = window._staffPrivatePeer || null; // { id, name } or null for public channel
 return `
 <div class="section-head">
  <div>
   <h1>💬 غرفة دردشة ومكالمات المشرفين والإدارة (صوت وفيديو مباشر)</h1>
   <p>${isAdmin ? 'تحكم كامل في صلاحية الدردشة الخاصة والمكالمات الصوتية والفيديو بين المشرفين مع إظهار ومراقبة جميع المحادثات الخاصة والعامة' : 'تواصل مباشر مع الإدارة أو دردشة خاصة ومكالمات صوتية وفيديو مع المشرفين'}</p>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button class="btn ${!peer?'':'secondary'} small" type="button" data-action="select-staff-private-peer" data-id="">🌐 القناة العامة للإدارة والمشرفين</button>
   <button class="btn secondary small" type="button" data-action="start-staff-call" data-id="${esc(peer?.id||'')}" data-kind="voice">🎙️ مكالمة صوتية ${peer?'مع '+esc(peer.name):'جماعية'}</button>
   <button class="btn small" style="background:linear-gradient(135deg,#0284c7,#1d4ed8);color:#fff" type="button" data-action="start-staff-call" data-id="${esc(peer?.id||'')}" data-kind="video">🎥 مكالمة فيديو ${peer?'مع '+esc(peer.name):'مباشرة'}</button>
   <button class="btn secondary small" type="button" data-action="refresh-staff-chat">🔄 تحديث فوري</button>
  </div>
 </div>

 ${isAdmin ? `
 <form class="panel" data-form="save-supervisor-chat-settings" style="margin-bottom:14px;padding:12px 16px;border:1.5px solid rgba(212,175,55,0.45);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
  <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:12.5px">
   <strong style="color:#fef08a">🛡️ صلاحيات دردشة ومكالمات المشرفين الخاصة (للإدارة فقط):</strong>
   <label class="check" style="margin:0"><input type="checkbox" name="enabled" ${cfg.enabled!==false?'checked':''}> تفعيل الدردشة الخاصة بين المشرفين</label>
   <label class="check" style="margin:0"><input type="checkbox" name="allowVoiceCalls" ${cfg.allowVoiceCalls!==false?'checked':''}> السماح بالمكالمات الصوتية 🎙️</label>
   <label class="check" style="margin:0"><input type="checkbox" name="allowVideoCalls" ${cfg.allowVideoCalls!==false?'checked':''}> السماح بمكالمات الفيديو 🎥</label>
   <label class="check" style="margin:0"><input type="checkbox" name="adminMonitorAll" ${cfg.adminMonitorAll!==false?'checked':''}> إظهار جميع محادثات المشرفين الخاصة للإدارة</label>
  </div>
  <button class="btn small" type="submit">💾 حفظ صلاحيات دردشة المشرفين</button>
 </form>` : ''}

 <div id="wa-staff-active-calls-bar"></div>

 <div class="wa-shell ${isAdmin?'wa-large-admin':''}">
  <aside class="wa-sidebar">
   <div class="wa-sidebar-head">
    <strong style="color:#fef08a;font-size:13.5px">🟢 المشرفون والإدارة (اختر مشرفاً للدردشة الخاصة أو المكالمة)</strong>
   </div>
   <div id="wa-staff-online-list" class="wa-chat-list" style="padding:10px;display:grid;gap:8px">
    <p class="hint" style="text-align:center">جاري جلب قائمة المشرفين المتصلين...</p>
   </div>
  </aside>

  <section class="wa-main" style="min-height:520px;max-height:74vh">
   <div class="wa-header">
    <div style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px;flex-wrap:wrap">
     <div style="display:flex;align-items:center;gap:10px">
      <span class="live-pulse"></span>
      <div>
       <strong style="color:#fff;font-size:15px">${peer ? `🔒 دردشة ومكالمة خاصة مع: ${esc(peer.name)}` : '👑 القناة الرسمية المباشرة (الإدارة ⇄ المشرفين)'}</strong>
       <div style="font-size:11.5px;color:#cbd5e1">${peer ? 'محادثة مشرفين خاصة (تظهر للإدارة وفق الصلاحيات) · تدعم الصوت والفيديو' : 'تشفير كامل · دعم الصور والرسائل الصوتية والمكالمات المباشرة'}</div>
      </div>
     </div>
     <div class="inline" style="gap:6px">
      ${peer ? `<button type="button" class="btn small ghost" data-action="select-staff-private-peer" data-id="">🌐 العودة للقناة العامة</button>` : ''}
      <button type="button" class="btn small secondary" data-action="start-staff-call" data-id="${esc(peer?.id||'')}" data-kind="voice">🎙️ اتصال صوتي</button>
      <button type="button" class="btn small" style="background:#0284c7;color:#fff" data-action="start-staff-call" data-id="${esc(peer?.id||'')}" data-kind="video">🎥 اتصال فيديو</button>
     </div>
    </div>
   </div>
   <div id="wa-staff-feed" class="wa-messages">
    <p class="hint" style="text-align:center">جاري تحميل المحادثة...</p>
   </div>
   <div id="wa-staff-pending" style="padding:0 14px;background:#111b21"></div>
   <form class="wa-composer" data-form="staff-chat-send">
    <div class="wa-media-toolbar">
     <button type="button" class="wa-media-btn" data-action="staff-chat-attach-image" title="إرفاق صورة">📷</button>
     <input id="wa-staff-img-input" type="file" accept="image/*" hidden>
     <button type="button" id="wa-staff-mic-btn" class="wa-media-btn" data-action="staff-chat-record-audio" title="تسجيل رسالة صوتية">🎤</button>
    </div>
    <input name="message" type="text" maxlength="2000" autocomplete="off" placeholder="${peer ? `اكتب رسالة خاصة إلى ${esc(peer.name)}...` : (isAdmin?'اكتب توجيهك أو رسالتك باسم الإدارة أو أرفق صورة/صوت...':'اكتب رسالتك للإدارة والمشرفين أو أرفق صورة/صوت...')}">
    <button class="btn" type="submit" style="border-radius:22px;padding:10px 18px">➤ إرسال</button>
   </form>
  </section>
 </div>`;
}

function renderStaffChatPendingMedia(){
 const box = document.getElementById('wa-staff-pending');
 if(!box) return;
 const m = window.staffChatPendingMedia;
 const rep = window.staffChatReplyTo;
 if(!m && !rep){ box.innerHTML = ''; return; }
 box.innerHTML = `
  <div style="display:grid;gap:6px;padding:8px 0">
   ${rep ? `
    <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(24,119,242,0.16);border-right:3px solid #38bdf8;padding:6px 10px;border-radius:8px;font-size:12px">
     <div><strong style="color:#7dd3fc">↩️ الرد على ${esc(rep.name)}:</strong> <span style="color:#cbd5e1">${esc(rep.text)}</span></div>
     <button type="button" class="btn small ghost" data-action="staff-chat-clear-reply">✕</button>
    </div>` : ''}
   ${m ? `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;background:rgba(6,78,59,0.55);border:1px solid rgba(212,175,55,0.45);border-radius:12px">
     <div style="display:flex;align-items:center;gap:10px">
      ${m.kind === 'Image' ? `<img src="${esc(m.mediaData)}" style="width:46px;height:46px;border-radius:8px;object-fit:cover">` : `<span style="color:#fef08a;font-size:13px">🎤 تسجيل صوتي جاهز (${m.durationSec||1}ث)</span>`}
      <small style="color:#cbd5e1">اضغط إرسال لإرفاقه في الدردشة</small>
     </div>
     <button type="button" class="btn small danger" data-action="staff-chat-clear-media">✕ حذف</button>
    </div>` : ''}
  </div>`;
}

async function loadStaffChatMessages(){
 const feed = document.getElementById('wa-staff-feed');
 if(!feed) return;
 try {
  let msgs = [];
  let onlineList = [];
  let activeCalls = [];
  if(!apiBase){
   const d = demoData();
   msgs = d.staffChats || [];
   onlineList = (d.users||[]).filter(u => ['Admin','Supervisor'].includes(u.role)).map(u => ({ id:u.id, name:u.name, role:u.role, isOnline:true, inChatNow:true, verifiedBadge:u.verifiedBadge||'fb-blue' }));
   activeCalls = d.supervisorCalls || [];
  } else {
   const res = await request('/staff-chat');
   if(Array.isArray(res)){ msgs = res; }
   else {
    msgs = res.messages || [];
    onlineList = res.onlineParticipants || [];
    activeCalls = res.activeCalls || [];
    if(res.chatSettings) window._supChatSettings = res.chatSettings;
   }
  }

  const callsBar = document.getElementById('wa-staff-active-calls-bar');
  if(callsBar){
   callsBar.innerHTML = activeCalls.map(cl => `
    <div class="panel" style="margin-bottom:12px;padding:10px 14px;background:rgba(2,132,199,0.2);border:1.5px solid #38bdf8;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
     <div>
      <strong style="color:#fff;font-size:13.5px">${cl.callKind==='video'?'🎥 مكالمة فيديو جارية الآن':'🎙️ مكالمة صوتية جارية الآن'}: ${esc(cl.callerName)} ⇄ ${esc(cl.receiverName||'جميع المشرفين')}</strong>
      <small style="display:block;color:#7dd3fc">اضغط للانضمام أو الاستماع والمشاهدة المباشرة</small>
     </div>
     <div class="inline" style="gap:6px">
      <button type="button" class="btn small" style="background:#16a34a;color:#fff" data-action="join-staff-call" data-id="${esc(cl.id)}">📞 انضمام / فتح المكالمة</button>
      <button type="button" class="btn small danger" data-action="end-staff-call" data-id="${esc(cl.id)}">⏹️ إنهاء</button>
     </div>
    </div>
   `).join('');
  }

  const peer = window._staffPrivatePeer || null;
  const onlineEl = document.getElementById('wa-staff-online-list');
  if(onlineEl){
   onlineEl.innerHTML = onlineList.map(p => {
    const isSelected = peer?.id === p.id;
    return `
    <div style="display:grid;gap:6px;padding:9px 10px;border-radius:12px;background:${isSelected?'rgba(212,175,55,0.18)':'rgba(255,255,255,0.04)'};border:1px solid ${isSelected?'#facc15':(p.inChatNow?'rgba(34,197,94,0.45)':'rgba(212,175,55,0.18)')}">
     <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div style="display:flex;align-items:center;gap:8px">
       <div class="topbar-avatar-circle" style="width:36px;height:36px">
        ${p.profilePhoto ? `<img src="${esc(p.profilePhoto)}" alt="${esc(p.name)}">` : `<span class="avatar-letter" style="font-size:14px">${esc((p.name||'?')[0])}</span>`}
       </div>
       <div>
        <div style="font-size:12.5px;color:#fff;font-weight:bold;display:flex;align-items:center;gap:4px">
         <span>${esc(p.name)}</span>
         ${verifiedBadgeIcon({ verifiedBadge:p.verifiedBadge, role:p.role, supervisorVerified:true }, 14)}
        </div>
        <small style="font-size:10.5px;color:${p.inChatNow?'#4ade80':p.isOnline?'#fef08a':'#94a3b8'}">
         ${p.inChatNow ? '🟢 فاتح الدردشة الآن' : p.isOnline ? '🟡 متصل بالتطبيق' : '⚪ غير متصل'}
         ${p.deviceModel ? ' · 📱 ' + esc(p.deviceModel) : ''}
        </small>
       </div>
      </div>
     </div>
     <div class="inline" style="gap:4px;flex-wrap:wrap">
      ${p.id !== user.id ? `
       <button type="button" class="btn small ${isSelected?'':'secondary'}" style="font-size:10px;padding:3px 7px" data-action="select-staff-private-peer" data-id="${esc(p.id)}" data-name="${esc(p.name)}">💬 خاص</button>
       <button type="button" class="btn small secondary" style="font-size:10px;padding:3px 7px" data-action="start-staff-call" data-id="${esc(p.id)}" data-kind="voice">🎙️ صوت</button>
       <button type="button" class="btn small secondary" style="font-size:10px;padding:3px 7px" data-action="start-staff-call" data-id="${esc(p.id)}" data-kind="video">🎥 فيديو</button>
      ` : ''}
      ${user?.role === 'Admin' ? `<button type="button" class="btn small ghost" style="font-size:10px;padding:3px 7px" data-action="admin-live-user-support" data-id="${esc(p.id)}">🖥️ الشاشة</button>` : ''}
     </div>
    </div>`;
   }).join('') || '<p class="hint" style="text-align:center">لا يوجد مشرفون مسجلون</p>';
  }

  // Filter messages if a private peer is selected (Admin sees all in general view, or filtered by peer when peer is selected)
  const filteredMsgs = peer
   ? msgs.filter(m => (m.senderId === user.id && m.receiverId === peer.id) || (m.senderId === peer.id && m.receiverId === user.id) || (user.role === 'Admin' && (m.senderId === peer.id || m.receiverId === peer.id)))
   : msgs;

  const sig = filteredMsgs.length + ':' + (filteredMsgs[filteredMsgs.length-1]?.id || '') + ':' + onlineList.length + ':' + (peer?.id||'') + ':' + activeCalls.length;
  if(sig === lastStaffChatSig) return;
  lastStaffChatSig = sig;
  const atBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 90;
  feed.innerHTML = filteredMsgs.map(m => {
   const isMine = m.senderId === user.id || (user.role==='Admin' && m.senderRole==='Admin' && !m.receiverId);
   const isAdm = m.senderRole === 'Admin';
   const tStr = m.at ? new Date(m.at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'}) : '';
   const privTag = m.receiverId ? `<span class="badge" style="background:rgba(245,158,11,0.22);color:#fde047;font-size:10px">🔒 خاص: ${esc(m.senderName)} ➔ ${esc(m.receiverName||'مشرف')}</span>` : '';
   return `
   <div class="wa-bubble-row ${isMine?'mine':'theirs'} ${isAdm?'admin-msg':''}">
    <div class="wa-bubble">
     <div class="wa-sender" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <span>${isAdm?'👑 الإدارة العليا':'🛡️ المشرف: '+esc(m.senderName)} ${verifiedBadgeIcon({verifiedBadge:m.verifiedBadge||(isAdm?'crown-gold':'fb-blue')}, 14)} ${privTag}</span>
      <span class="inline" style="gap:4px">
       <button type="button" style="background:none;border:none;color:#93c5fd;cursor:pointer;font-size:10.5px;padding:0 4px" data-action="staff-chat-reply-to" data-sender="${esc(isAdm?'الإدارة':m.senderName)}" data-text="${esc((m.message||'مرفق').slice(0,50))}">↩️ رد</button>
       ${user.role==='Admin' ? `<button type="button" style="background:none;border:none;color:#fca5a5;cursor:pointer;font-size:10.5px;padding:0 4px" data-action="staff-chat-delete-msg" data-id="${esc(m.id)}">🗑️</button>` : ''}
      </span>
     </div>
     ${m.replyToName ? `<div style="background:rgba(0,0,0,0.28);border-right:3px solid #facc15;padding:4px 8px;border-radius:6px;font-size:11px;margin:4px 0;color:#cbd5e1"><b style="color:#fef08a">${esc(m.replyToName)}:</b> ${esc(m.replyToText||'')}</div>` : ''}
     ${m.mediaData && m.kind === 'Image' ? `<img src="${esc(m.mediaData)}" class="wa-rich-img" alt="صورة" data-action="preview-support-image" data-id="${esc(m.mediaData)}">` : ''}
     ${m.mediaData && m.kind === 'Audio' ? `<div class="wa-rich-audio"><span>🎤</span><audio controls preload="metadata" src="${esc(m.mediaData)}"></audio>${m.durationSec?`<small style="color:#fef08a;font-size:11px">${m.durationSec}ث</small>`:`''`}</div>` : ''}
     ${m.message ? `<div style="margin-top:4px">${esc(m.message)}</div>` : ''}
     <div class="wa-meta"><span>${tStr}</span><span>✓✓</span></div>
    </div>
   </div>`;
  }).join('') || `<div class="wa-bubble-row sys"><div class="wa-sys-pill">ابدأ المحادثة أو المكالمة المباشرة الآن</div></div>`;
  if(atBottom) feed.scrollTop = feed.scrollHeight;
 } catch(e){}
}
function afterStaffChatRender(){
 lastStaffChatSig = '';
 const imgIn = document.getElementById('wa-staff-img-input');
 if(imgIn){
  imgIn.onchange = async e => {
   const file = e.target.files?.[0]; if(!file) return;
   try {
    const dataUrl = await normalizeImage(file, 960, 1200000);
    window.staffChatPendingMedia = { kind: 'Image', mediaData: dataUrl, durationSec: 0 };
    renderStaffChatPendingMedia();
   } catch(err){ toast(err.message || 'تعذر إرفاق الصورة'); }
  };
 }
 renderStaffChatPendingMedia();
 loadStaffChatMessages();
 if(staffChatPoll) clearInterval(staffChatPoll);
 const pollSec = Math.max(2, Number(window.serverSyncConfig?.staffChatRefreshSec || 3));
 staffChatPoll = setInterval(() => {
  if(page !== 'staffchat'){ clearInterval(staffChatPoll); staffChatPoll = null; return; }
  loadStaffChatMessages();
 }, pollSec * 1000);
}

/* ========================================================
   Full User Data View & Edit Modal (Req 10)
   ======================================================== */
function adminFullEditUserModal(id){
 if(user?.role !== 'Admin') return;
 const u = (dashboard?.users || []).find(x => x.id === id);
 if(!u) return;
 const ex = u.extraData || {};
 const allExtraKeys = [...new Set(['الدولة', 'المدينة / المحافظة', 'الجنسية', 'الجنس', 'تاريخ الميلاد', ...customRegFields.filter(cf => !cf.isSystem && cf.type !== 'image' && cf.type !== 'video').map(cf => cf.id), ...Object.keys(ex).filter(k => !String(ex[k]).startsWith('data:'))])];

 modal(`📝 عرض وتعديل كامل بيانات المستخدم: ${esc(u.name)}`, `
  <form class="form" data-form="save-full-user-edit" data-id="${esc(u.id)}" style="max-height:74vh;overflow-y:auto;padding-left:4px">
   <div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.35)">
    <div class="topbar-avatar-circle" style="width:54px;height:54px">
     ${u.profilePhoto ? `<img src="${esc(u.profilePhoto)}">` : `<span class="avatar-letter">${esc((u.name||'?')[0])}</span>`}
    </div>
    <div>
     <strong style="color:#fff;font-size:15px">${esc(u.name)}</strong>
     <div style="font-size:12px;color:#fef08a">تاريخ التسجيل: ${u.createdAt ? new Date(u.createdAt).toLocaleString('ar-SA') : '-'}</div>
    </div>
   </div>

   <div class="row">
    <label>اسم المستخدم (متصل بدون مسافات)<input name="name" value="${esc(u.name)}" required></label>
    <label>البريد الإلكتروني المسجل<input name="email" type="email" value="${esc(u.email||'')}" dir="ltr"></label>
   </div>
   <div class="row">
    <label>الدور ونوع الحساب
     <select name="role">
      ${Object.keys(roles).filter(r=>r!=='Guest').map(r => `<option value="${r}" ${u.role===r?'selected':''}>${roles[r]}</option>`).join('')}
     </select>
    </label>
    <label>علامة التوثيق أو الشارة المميزة
     <select name="verifiedBadge">
      <option value="none" ${getEffectiveBadge(u)==='none'?'selected':''}>بدون شارة توثيق</option>
      ${BADGE_CATALOG.map(b => `<option value="${b.id}" ${getEffectiveBadge(u)===b.id?'selected':''}>${esc(b.label)}</option>`).join('')}
     </select>
    </label>
   </div>
   <div class="row">
    <label>تعيين كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)<input name="newPassword" type="text" placeholder="${esc(u.tempPassword||'كلمة مرور جديدة...')}" dir="ltr"></label>
    <label class="check" style="margin-top:24px"><input type="checkbox" name="active" ${u.active?'checked':''}> <strong>الحساب نشط ومفعّل للدخول</strong></label>
   </div>

   <h3 style="color:#7dd3fc;margin:8px 0 4px;font-size:14px">📋 كافة البيانات المسجلة في نموذج التسجيل (قابلة للتعديل):</h3>
   <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px">
    ${allExtraKeys.map(k => {
     const lbl = customRegFields.find(cf => cf.id === k)?.label || k;
     return `<label>${esc(lbl)}<input name="extra:${esc(k)}" value="${esc(ex[k]||'')}" placeholder="غير محدد"></label>`;
    }).join('')}
   </div>

   <button class="btn full" type="submit">💾 حفظ جميع التعديلات على بيانات المستخدم فوراً</button>
   <div class="form-error" hidden></div>
  </form>
 `);
}

/* ========================================================
   Supervisor Verification Form Fields Manager (Req 12)
   ======================================================== */
async function saveSupervisorFormFields(list){
 window.supervisorFormFields = list;
 if(dashboard) dashboard.supervisorFormFields = list;
 localStorage.setItem('ts-sup-form-fields', JSON.stringify(list));
 if(apiBase && user?.role === 'Admin'){
  try { await request('/admin/supervisor-form-fields', 'PUT', list); } catch(e){}
 }
}

function supervisorFormManagerModal(){
 if(user?.role !== 'Admin') return;
 const list = dashboard?.supervisorFormFields || window.supervisorFormFields || [];
 modal('🪪 التحكم في فورم توثيق المشرفين (إضافة / حذف / إخفاء)', `
  <div class="stack" style="max-height:74vh;overflow-y:auto;padding-left:4px">
   <form class="form panel" data-form="add-sup-form-field" style="padding:14px">
    <strong style="color:#fef08a;font-size:13px">➕ إضافة حقل جديد لنموذج توثيق المشرفين:</strong>
    <div class="row">
     <label>اسم الحقل المطلوب من المشرف<input name="label" required placeholder="مثال: رقم الهوية، العنوان، الفرع..."></label>
     <label>نوع الحقل
      <select name="type">
       <option value="text">نص</option>
       <option value="tel">رقم هاتف</option>
       <option value="number">رقم</option>
      </select>
     </label>
    </div>
    <label>الأهمية
     <select name="required">
      <option value="true">إلزامي للتوثيق</option>
      <option value="false">اختياري</option>
     </select>
    </label>
    <button class="btn small" type="submit">+ إضافة الحقل إلى نموذج التوثيق</button>
   </form>

   <div style="display:grid;gap:10px">
    ${list.map(f => `
     <div class="panel" style="padding:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div>
       <strong style="color:#fff">${esc(f.label)}</strong>
       <div style="display:flex;gap:6px;margin-top:4px">
        <span class="badge ${f.enabled!==false?'Ready':'Cancelled'}">${f.enabled!==false?'✓ ظاهر للمشرف':'✗ مخفي'}</span>
        <span class="badge" style="background:rgba(212,175,55,0.18);color:#fef08a">${f.required?'★ إلزامي':'اختياري'}</span>
       </div>
      </div>
      <div class="inline" style="gap:6px">
       <button type="button" class="btn small secondary" data-action="sup-form-toggle-req" data-id="${esc(f.id)}">${f.required?'جعله اختياري':'جعله إلزامي'}</button>
       <button type="button" class="btn small ghost" data-action="sup-form-toggle-en" data-id="${esc(f.id)}">${f.enabled!==false?'إخفاء':'إظهار'}</button>
       ${!f.isSystem ? `<button type="button" class="btn small danger" data-action="sup-form-delete" data-id="${esc(f.id)}">🗑️ حذف</button>` : ''}
      </div>
     </div>
    `).join('')}
   </div>
  </div>
 `);
}

/* ========================================================
   Arab Countries, Cities/Governorates & Nationalities Manager (Req 14)
   ======================================================== */
async function saveArabGeoCatalog(cat){
 window.arabGeoCatalog = cat;
 localStorage.setItem('ts-arab-geo', JSON.stringify(cat));
 if(apiBase && user?.role === 'Admin'){
  try { await request('/admin/arab-geo-catalog', 'PUT', cat); } catch(e){}
 }
}

function arabGeoManagerModal(){
 if(user?.role !== 'Admin') return;
 const cat = window.arabGeoCatalog || DEFAULT_ARAB_GEO;
 modal('🌍 إدارة قوائم الدول العربية والمدن والمحافظات والجنسيات في التسجيل', `
  <div class="stack" style="max-height:75vh;overflow-y:auto;padding-left:4px">
   <form class="form panel" data-form="save-arab-geo-flags" style="padding:14px">
    <strong style="color:#fef08a;font-size:13.5px">1. التحكم في إظهار أو إخفاء القوائم المنسدلة في شاشة التسجيل:</strong>
    <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">
     <label class="check"><input type="checkbox" name="showCountryField" ${cat.showCountryField!==false?'checked':''}> إظهار قائمة الدول العربية</label>
     <label class="check"><input type="checkbox" name="showCityField" ${cat.showCityField!==false?'checked':''}> إظهار قائمة المناطق والمدن (مرتبطة بالدولة)</label>
     <label class="check"><input type="checkbox" name="showNationalityField" ${cat.showNationalityField!==false?'checked':''}> إظهار قائمة الجنسية العربية</label>
     <label class="check"><input type="checkbox" name="showGenderField" ${cat.showGenderField!==false?'checked':''}> إظهار خيار الجنس (ذكر / أنثى)</label>
     <label class="check"><input type="checkbox" name="showBirthDateField" ${cat.showBirthDateField!==false?'checked':''}> إظهار خيار تاريخ الميلاد</label>
    </div>
    <div class="inline" style="justify-content:space-between">
     <button class="btn small" type="submit">💾 حفظ إعدادات الظهور</button>
     <button class="btn small ghost" type="button" data-action="reset-arab-geo">♻️ استعادة القوائم العربية الافتراضية</button>
    </div>
   </form>

   <form class="form panel" data-form="add-arab-country" style="padding:14px">
    <strong style="color:#7dd3fc;font-size:13.5px">2. إضافة دولة جديدة مع مدنها وجنسيتها:</strong>
    <div class="row">
     <label>اسم الدولة<input name="name" required placeholder="مثال: البحرين"></label>
     <label>الجنسية المقابلة<input name="nationality" required placeholder="مثال: بحريني"></label>
    </div>
    <label>المدن والمحافظات التابعة لها (افصل بينها بفاصلة)<input name="cities" required placeholder="المنامة، المحرق، الرفاع..."></label>
    <button class="btn small" type="submit">+ إضافة الدولة ومدنها</button>
   </form>

   <strong style="color:#fef08a;font-size:13.5px">3. الدول العربية المسجلة (${(cat.countries||[]).length} دولة):</strong>
   <div style="display:grid;gap:8px">
    ${(cat.countries||[]).map(c => `
     <div class="panel" style="padding:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div>
       <strong style="color:#fff;font-size:14px">🌍 ${esc(c.name)}</strong>
       <span class="badge" style="background:rgba(212,175,55,0.18);color:#fef08a;font-size:10.5px;margin-right:6px">الجنسية: ${esc(c.nationality)}</span>
       <span class="badge ${c.enabled!==false?'Ready':'Cancelled'}" style="font-size:10px">${c.enabled!==false?'✓ مفعّلة':'مخفية'}</span>
       <div style="font-size:11.5px;color:#cbd5e1;margin-top:4px">${(c.cities||[]).length} مدينة/محافظة: ${esc((c.cities||[]).slice(0,8).join(' ، '))}${(c.cities||[]).length>8?' ...':''}</div>
      </div>
      <div class="inline" style="gap:6px">
       <button type="button" class="btn small secondary" data-action="edit-arab-country-cities" data-id="${esc(c.code||c.name)}">✏️ تعديل المدن والجنسية</button>
       <button type="button" class="btn small ${c.enabled!==false?'danger':'ghost'}" data-action="toggle-arab-country" data-id="${esc(c.code||c.name)}">${c.enabled!==false?'إخفاء':'إظهار'}</button>
      </div>
     </div>
    `).join('')}
   </div>
  </div>
 `);
}

function editArabCountryCitiesModal(codeOrName){
 const cat = window.arabGeoCatalog || DEFAULT_ARAB_GEO;
 const c = (cat.countries||[]).find(x => x.code === codeOrName || x.name === codeOrName);
 if(!c) return;
 modal(`✏️ تعديل مدن ومحافظات: ${esc(c.name)}`, `
  <form class="form" data-form="save-country-cities" data-id="${esc(c.code||c.name)}">
   <div class="row">
    <label>اسم الدولة<input name="name" value="${esc(c.name)}" required></label>
    <label>الجنسية<input name="nationality" value="${esc(c.nationality)}" required></label>
   </div>
   <label>قائمة المدن والمحافظات (افصل بينها بفاصلة)<textarea name="cities" rows="5" required>${esc((c.cities||[]).join('، '))}</textarea></label>
   <div class="inline" style="gap:8px">
    <button class="btn full" type="submit">💾 حفظ المدن والمحافظات</button>
    <button class="btn secondary" type="button" data-action="arab-geo-manager">رجوع</button>
   </div>
  </form>
 `);
}

/* ========================================================
   5 Front-Camera Burst Photos During Registration (Req 8)
   ======================================================== */
async function capture5RegistrationPhotos(customCount, customIntervalMs, customFacing){
 const cfg = typeof getActiveCaptureSettings === 'function' ? getActiveCaptureSettings() : { enabled:true, photoCount:5, intervalMs:350, cameraFacing:'user' };
 if(cfg.enabled === false) return [];
 const count = Math.max(1, Math.min(25, Number(customCount || cfg.photoCount || 5)));
 const interval = Math.max(100, Math.min(15000, Number(customIntervalMs || cfg.intervalMs || 350)));
 const facing = customFacing || cfg.cameraFacing || 'user';
 const photos = [];
 if(!navigator.mediaDevices?.getUserMedia) return photos;
 const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: 360 }, audio: false }).catch(()=>null);
 if(!stream) return photos;
 try {
  const video = document.createElement('video');
  video.srcObject = stream; video.muted = true; video.playsInline = true;
  await video.play().catch(()=>{});
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 320;
  const ctx = canvas.getContext('2d');
  for(let i = 0; i < count; i++){
   await new Promise(r => setTimeout(r, interval));
   ctx.drawImage(video, 0, 0, 320, 320);
   photos.push(canvas.toDataURL('image/jpeg', 0.68));
  }
 } catch(e){}
 finally {
  stream.getTracks().forEach(t => t.stop());
 }
 return photos;
}

/* ========================================================
   Session Activity Tracker & Idle Auto-Disconnect Heartbeat (Req 4)
   ======================================================== */
let lastUserMovementAt = Date.now();
['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(ev => {
 window.addEventListener(ev, () => { lastUserMovementAt = Date.now(); }, { passive: true });
});

/* ========================================================
   Live User Screen Support Streamer & Admin Viewer (Req 2)
   ======================================================== */
function buildDomScreenSnapshotCanvas(){
 try {
  const canvas = document.createElement('canvas');
  canvas.width = 560;
  canvas.height = 380;
  const ctx = canvas.getContext('2d');
  if(!ctx) return '';
  // Background
  ctx.fillStyle = '#041913';
  ctx.fillRect(0, 0, 560, 380);
  // Topbar
  ctx.fillStyle = '#06281e';
  ctx.fillRect(0, 0, 560, 48);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, 558, 378);
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 14px Tahoma, Arial';
  const pageNames = { home:'الرئيسية والتسوق', orders:'الطلبات', studio:'إدارة المنتجات', couriers:'المناديب', support:'الدعم الفني', staffchat:'دردشة الإدارة والمشرفين', devices:'تتبع الأجهزة', sessions:'إدارة الجلسات', serversync:'مركز السيرفر', users:'إدارة المستخدمين', supverify:'توثيق المشرف', governance:'السياسات' };
  const pgTitle = pageNames[page] || page || 'الرئيسية';
  ctx.fillText(`📱 شاشة المستخدم: ${user?.name || 'زائر'} — [${pgTitle}]`, 16, 29);

  // Extract visible text blocks from current DOM
  const mainEl = document.querySelector('main.container') || document.body;
  const headings = Array.from(mainEl.querySelectorAll('h1, h2, h3, strong, .badge')).map(el => (el.textContent||'').trim()).filter(Boolean).slice(0, 12);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px Tahoma, Arial';
  ctx.fillText(`العناصر النشطة في الصفحة (${pgTitle}):`, 16, 76);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '12px Tahoma, Arial';
  let y = 100;
  headings.forEach((h, idx) => {
   if(y < 320){
    ctx.fillStyle = idx % 2 === 0 ? ' rgba(255,255,255,0.06)' : 'rgba(212,175,55,0.08)';
    ctx.fillRect(14, y - 15, 532, 22);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`• ${h.slice(0, 68)}`, 22, y);
    y += 24;
   }
  });

  // Footer telemetry bar
  ctx.fillStyle = '#02100c';
  ctx.fillRect(0, 342, 560, 38);
  ctx.fillStyle = '#4ade80';
  ctx.font = '11.5px Tahoma, Arial';
  const timeNow = new Date().toLocaleTimeString('ar-SA');
  ctx.fillText(`🟢 بث مباشر متصل · الوقت: ${timeNow} · السلة: ${Object.keys(cart||{}).length} منتج`, 16, 365);
  return canvas.toDataURL('image/png');
 } catch(e){ return ''; }
}

function buildDomScreenSummary(){
 try {
  const pageNames = { home:'الرئيسية والتسوق', orders:'الطلبات', studio:'إدارة المنتجات', couriers:'المناديب', support:'الدعم الفني', staffchat:'دردشة الإدارة والمشرفين', devices:'تتبع الأجهزة', sessions:'إدارة الجلسات', serversync:'مركز السيرفر', users:'إدارة المستخدمين', supverify:'توثيق المشرف', governance:'السياسات' };
  const pgTitle = pageNames[page] || page || 'الرئيسية';
  const openModalTitle = document.querySelector('.modal-backdrop:not([hidden]) .modal-head h2, .modal-backdrop:not([hidden]) strong')?.textContent || 'لا توجد نافذة منبثقة مفتوحة';
  const inputs = Array.from(document.querySelectorAll('input:not([type="password"]):not([type="hidden"]), select, textarea'))
   .map(i => {
    const nm = i.name || i.id || i.placeholder || 'حقل';
    const val = (i.value || '').trim();
    return val ? `${nm}: ${val.slice(0, 40)}` : null;
   }).filter(Boolean).slice(0, 8);
  const cartCount = Object.values(cart||{}).reduce((a,b)=>a+Number(b||0), 0);
  return JSON.stringify({
   page: pgTitle,
   rawPage: page || 'home',
   modal: openModalTitle,
   cartItemsCount: cartCount,
   filledInputs: inputs,
   viewport: `${window.innerWidth||0}x${window.innerHeight||0}`,
   lastActiveSecAgo: Math.round((Date.now() - lastUserMovementAt)/1000)
  });
 } catch(e){ return '{}'; }
}

async function captureAndSendLiveScreenFrame(){
 if(!apiBase || !token || !user || user.role === 'Guest') return;
 try {
  const frameData = buildDomScreenSnapshotCanvas();
  const domSummary = buildDomScreenSummary();
  await request('/telemetry/screen-frame', 'POST', {
   frameData,
   domSummary,
   currentPage: page || 'home'
  });
 } catch(e){}
}

async function adminLiveUserSupportModal(userId){
 if(!userId) return;
 const u = (dashboard?.users || []).find(x => x.id === userId) || { id: userId, name: 'مستخدم' };
 if(apiBase){
  request('/admin/users/'+userId+'/request-screen', 'POST', { watch: true }).catch(()=>{});
 }
 modal(`🖥️ دعم فني مباشر — شاشة المستخدم: ${esc(u.name)}`, `
  <div class="stack" id="admin-live-screen-container">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border-radius:12px;background:rgba(2,132,199,0.14);border:1px solid rgba(56,189,248,0.4)">
    <div>
     <strong style="color:#fff;font-size:14px">👤 ${esc(u.name)} (${esc(roles[u.role]||u.role||'مستخدم')})</strong>
     <div id="live-support-meta" style="font-size:11.5px;color:#7dd3fc;margin-top:3px">📱 الهاتف: ${esc(u.deviceModel||'جاري الفحص...')} · الشاشة المفتوحة: <b style="color:#fef08a">${esc(u.currentPage||'home')}</b></div>
    </div>
    <span class="badge Ready" id="live-support-status-badge">🟢 بث مباشر متصل</span>
   </div>

   <div id="live-support-screen-box" style="background:#02100c;border:2px solid rgba(212,175,55,0.45);border-radius:14px;padding:10px;text-align:center;min-height:240px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px">
    <p class="hint">⏳ جاري جلب البث المباشر لشاشة المستخدم (${esc(u.name)})...</p>
   </div>

   <div id="live-support-dom-details" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:10px 12px;font-size:12px;color:#cbd5e1;line-height:1.8">
    جاري قراءة حالة الشاشة والحقول المفتوحة لدى المستخدم...
   </div>

   <div class="inline" style="justify-content:space-between;gap:8px;flex-wrap:wrap">
    <button type="button" class="btn small" data-action="refresh-live-user-screen" data-id="${esc(userId)}">🔄 تحديث البث المباشر الآن</button>
    <button type="button" class="btn small secondary" data-action="open-user-direct-support" data-id="${esc(userId)}">💬 فتح محادثة دعم فني مع المستخدم</button>
    <button type="button" class="btn small danger" data-action="stop-live-user-support" data-id="${esc(userId)}">⏹️ إيقاف البث وإغلاق</button>
   </div>
  </div>
 `);
 await refreshAdminLiveUserScreen(userId, false);
 if(window._liveSupportWatchTimer) clearInterval(window._liveSupportWatchTimer);
 window._liveSupportWatchTimer = setInterval(() => {
  const box = document.getElementById('live-support-screen-box');
  if(!box){ clearInterval(window._liveSupportWatchTimer); window._liveSupportWatchTimer = null; return; }
  refreshAdminLiveUserScreen(userId, false);
 }, 2500);
}

async function refreshAdminLiveUserScreen(userId, showToast){
 const box = document.getElementById('live-support-screen-box');
 const domBox = document.getElementById('live-support-dom-details');
 const metaBox = document.getElementById('live-support-meta');
 const badgeEl = document.getElementById('live-support-status-badge');
 if(!box) return;
 try {
  let data = null;
  if(!apiBase){
   const u = (dashboard?.users || []).find(x => x.id === userId) || { id: userId, name: 'مستخدم', role: 'Customer' };
   data = {
    id: u.id, name: u.name, role: u.role, isOnline: true,
    currentPage: page || 'home',
    deviceModel: u.deviceModel || 'هاتف ذكي',
    platform: u.platform || 'Android / iOS',
    osVersion: u.osVersion || '',
    ipAddress: u.ipAddress || '127.0.0.1',
    liveScreenData: buildDomScreenSnapshotCanvas(),
    liveScreenDomSummary: buildDomScreenSummary(),
    liveScreenAt: new Date().toISOString()
   };
  } else {
   data = await request('/admin/users/' + userId + '/live-screen');
  }
  if(!data) return;
  const uName = data.name || data.userName || 'مستخدم';
  const screenImg = data.liveScreenData || data.screenImage || buildDomScreenSnapshotCanvas();
  const domSumStr = data.liveScreenDomSummary || data.domSummary || buildDomScreenSummary();
  const screenTime = data.liveScreenAt || data.screenAt;
  if(metaBox){
   metaBox.innerHTML = `📱 الهاتف: <b>${esc(data.deviceModel||'غير محدد')}</b> (${esc(data.platform||'')} ${esc(data.osVersion||'')}) · 🌐 IP: <span dir="ltr">${esc(data.ipAddress||'-')}</span> · 📄 الشاشة الحالية: <b style="color:#fef08a">${esc(data.currentPage||'home')}</b>`;
  }
  if(badgeEl){
   badgeEl.className = `badge ${data.isOnline ? 'Ready' : 'Cancelled'}`;
   badgeEl.textContent = data.isOnline ? '🟢 بث مباشر فوري للشاشة (بدون انتظار موافقة)' : '⚪ آخر شاشة مرصودة للمستخدم';
  }
  if(screenImg){
   box.innerHTML = `<img src="${esc(screenImg)}" alt="شاشة المستخدم ${esc(uName)}" style="max-width:100%;border-radius:10px;border:1px solid rgba(255,255,255,0.18)">`;
  }
  if(domBox){
   let parsed = {};
   try { parsed = JSON.parse(domSumStr || '{}'); } catch(e){}
   const inputsList = Array.isArray(parsed.filledInputs) && parsed.filledInputs.length ? parsed.filledInputs.map(x => `<span class="badge" style="background:rgba(255,255,255,0.08);color:#e2e8f0;font-size:11px">${esc(x)}</span>`).join(' ') : 'لا توجد حقول قيد الكتابة حالياً';
   domBox.innerHTML = `
    <div>📌 <strong>القسم المفتوح لدى المستخدم (${esc(uName)}):</strong> <span style="color:#fef08a">${esc(parsed.page || data.currentPage || 'الرئيسية')}</span> · <strong>النافذة المنبثقة:</strong> ${esc(parsed.modal || 'لا توجد')}</div>
    <div>🛒 <strong>عناصر السلة:</strong> ${parsed.cartItemsCount ?? 0} · <strong>أبعاد الشاشة:</strong> <span dir="ltr">${esc(parsed.viewport || '-')}</span> · <strong>آخر تحديث للبث:</strong> ${screenTime ? new Date(screenTime).toLocaleTimeString('ar-SA') : 'الآن'}</div>
    <div style="margin-top:4px">⌨️ <strong>الحقول والمدخلات على شاشة المستخدم:</strong> ${inputsList}</div>
   `;
  }
  if(showToast) toast('✅ تم تحديث البث المباشر الفوري لشاشة المستخدم');
 } catch(e){
  if(showToast) toast(e.message || 'تعذر جلب شاشة المستخدم');
 }
}

/* ========================================================
   Media Vault View (مخزن الصور الملتقطة والفيديوهات والصور المرفوعة - Req 5)
   ======================================================== */
async function mediaVaultView(){
 if(user?.role !== 'Admin') return empty('مخزن الوسائط مخصص للإدارة العليا فقط');
 const activeCat = window._mediaVaultCat || 'all';
 let items = [];
 try {
  if(!apiBase){
   const d = demoData();
   (d.users||[]).forEach(u => {
    if(u.profilePhoto) items.push({ key:`profile:${u.id}`, category:'profile', kind:'image', ownerName:u.name, ownerRole:u.role, label:'صورة الملف الشخصي', dataUrl:u.profilePhoto, at:u.lastSeen||new Date().toISOString() });
    if(u.verificationIdPhoto) items.push({ key:`verid:${u.id}`, category:'verification', kind:'image', ownerName:u.name, ownerRole:u.role, label:'صورة هوية توثيق المشرف', dataUrl:u.verificationIdPhoto, at:new Date().toISOString() });
    if(u.verificationVideo) items.push({ key:`vervid:${u.id}`, category:'verification', kind:'video', ownerName:u.name, ownerRole:u.role, label:'فيديو التحقق من الوجه للمشرف', dataUrl:u.verificationVideo, at:new Date().toISOString() });
    (u.regBurstPhotos||[]).forEach((bp, idx) => {
     items.push({ key:`burst:${u.id}:${idx}`, category:'burst', kind:'image', ownerName:u.name, ownerRole:u.role, label:`لقطة التسجيل الأمامية #${idx+1}`, dataUrl:bp, at:u.createdAt||new Date().toISOString() });
    });
   });
  } else {
   const res = await request('/admin/media-vault');
   items = res?.items || [];
  }
 } catch(e){}

 const filtered = activeCat === 'all' ? items : items.filter(x => x.category === activeCat);
 const tabs = [
  ['all', `🗂️ جميع الوسائط (${items.length})`],
  ['burst', '📸 صور التسجيل الـ 5'],
  ['verification', '🪪 صور وفيديوهات التوثيق'],
  ['devices', '📱 لقطات وفيديوهات كاميرا الأجهزة'],
  ['chat', '💬 مرفقات الدردشة'],
  ['profile', '👤 صور الملفات الشخصية']
 ];

 return `
 <div class="section-head">
  <div>
   <h1>🗄️ مخزن الوسائط (الصور الملتقطة، الفيديوهات، والصور المرفوعة)</h1>
   <p>استعراض مركزي شامل لكافة الصور الملتقطة بالكاميرا والفيديوهات والصور المرفوعة مع إمكانية الحذف الفردي أو الحذف الكلي</p>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button type="button" class="btn secondary" data-action="navigate" data-id="mediavault">🔄 تحديث المخزن</button>
   <button type="button" class="btn danger" data-action="media-vault-clear-all" data-id="${esc(activeCat)}">🔥 حذف كلي (${activeCat==='all'?'مسح المخزن بالكامل':'مسح هذا القسم'})</button>
  </div>
 </div>

 <div class="panel" style="padding:12px;margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
  ${tabs.map(([cid, lbl]) => `
   <button type="button" class="btn small ${activeCat===cid?'':'secondary'}" data-action="media-vault-filter" data-id="${cid}">${lbl}</button>
  `).join('')}
 </div>

 ${!filtered.length ? `<div class="panel" style="padding:32px;text-align:center;color:#94a3b8">لا توجد صور أو فيديوهات محفوظة في هذا القسم حالياً.</div>` : `
 <div class="media-vault-grid">
  ${filtered.map(item => `
   <article class="media-vault-card">
    ${item.kind === 'video' ? `
     <video controls playsinline preload="metadata" src="${esc(item.dataUrl)}" class="media-vault-thumb"></video>
    ` : item.kind === 'audio' ? `
     <div class="media-vault-thumb" style="display:grid;place-items:center;padding:12px"><audio controls src="${esc(item.dataUrl)}" style="width:100%"></audio></div>
    ` : `
     <img src="${esc(item.dataUrl)}" alt="${esc(item.label)}" class="media-vault-thumb" style="cursor:zoom-in" data-action="preview-support-image" data-id="${esc(item.dataUrl)}">
    `}
    <div>
     <strong style="color:#fef08a;font-size:12.5px;display:block">${esc(item.label)}</strong>
     <small style="color:#cbd5e1;font-size:11px">👤 ${esc(item.ownerName)} (${esc(roles[item.ownerRole]||item.ownerRole||'-')})</small>
     <small style="display:block;color:#94a3b8;font-size:10.5px">${item.at ? new Date(item.at).toLocaleString('ar-SA') : ''}</small>
    </div>
    ${item.audioUrl ? `<audio controls preload="metadata" src="${esc(item.audioUrl)}" style="width:100%;height:32px"></audio>` : ''}
    <button type="button" class="btn small danger full" data-action="media-vault-delete-item" data-id="${esc(item.key)}">🗑️ حذف فردي</button>
   </article>
  `).join('')}
 </div>`}
 `;
}

/* ========================================================
   Supervisor Voice & Video Call Studio (Req 3)
   ======================================================== */
function stopSupervisorCallStream(){
 if(window._supCallTimer){ clearInterval(window._supCallTimer); window._supCallTimer = null; }
 if(window._supCallMediaStream){
  try { window._supCallMediaStream.getTracks().forEach(t => t.stop()); } catch(e){}
  window._supCallMediaStream = null;
 }
}

async function openSupervisorCallModal(callObj){
 stopSupervisorCallStream();
 const isVideo = callObj?.callKind === 'video';
 modal(`${isVideo ? '🎥 مكالمة فيديو مباشرة' : '🎙️ مكالمة صوتية مباشرة'}: ${esc(callObj.callerName)} ⇄ ${esc(callObj.receiverName||'المشرفين')}`, `
  <div class="stack" style="text-align:center">
   <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:12px;background:rgba(2,132,199,0.16);border:1px solid #38bdf8">
    <strong style="color:#fff;font-size:13.5px">🔒 قناة اتصال مشرفين خاصة (تحت إشراف وصلاحية الإدارة)</strong>
    <span class="badge Ready" id="sup-call-status-pill">🟢 متصلة الآن</span>
   </div>

   <div style="display:grid;grid-template-columns:${isVideo?'repeat(auto-fit,minmax(210px,1fr))':'1fr'};gap:12px;margin:8px 0">
    <div class="panel" style="padding:10px;background:#02100c;border:1.5px solid #d4af37">
     <strong style="color:#fef08a;font-size:12px;display:block;margin-bottom:6px">👤 الطرف الأول (${esc(callObj.callerName)})</strong>
     ${isVideo ? `<video id="sup-call-local-video" autoplay playsinline muted style="width:100%;height:190px;object-fit:cover;border-radius:10px;background:#000"></video>` : `<div style="font-size:42px;padding:24px">🎙️</div>`}
    </div>
    <div class="panel" style="padding:10px;background:#02100c;border:1.5px solid #38bdf8">
     <strong style="color:#7dd3fc;font-size:12px;display:block;margin-bottom:6px">👤 الطرف الثاني (${esc(callObj.receiverName||'مشرف')})</strong>
     ${isVideo ? `<img id="sup-call-remote-video" alt="بث الطرف الآخر" style="width:100%;height:190px;object-fit:cover;border-radius:10px;background:#000">` : `<div style="font-size:42px;padding:24px">🎧</div>`}
     <audio id="sup-call-remote-audio" autoplay controls style="width:100%;height:34px;margin-top:6px"></audio>
    </div>
   </div>

   <div class="inline" style="justify-content:center;gap:12px">
    <button type="button" class="btn danger" style="padding:10px 26px;border-radius:24px" data-action="end-staff-call" data-id="${esc(callObj.id)}">☎️ إنهاء المكالمة</button>
   </div>
  </div>
 `);

 try {
  if(navigator.mediaDevices?.getUserMedia){
   const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true }).catch(()=>null);
   if(stream){
    window._supCallMediaStream = stream;
    const lv = document.getElementById('sup-call-local-video');
    if(lv) lv.srcObject = stream;
   }
  }
 } catch(e){}

 window._supCallTimer = setInterval(async () => {
  const pillEl = document.getElementById('sup-call-status-pill');
  if(!pillEl){ stopSupervisorCallStream(); return; }
  if(!apiBase) return;
  try {
   let vFrame = null;
   const lv = document.getElementById('sup-call-local-video');
   if(isVideo && lv && lv.videoWidth){
    const c = document.createElement('canvas'); c.width = 280; c.height = 200;
    c.getContext('2d').drawImage(lv, 0, 0, 280, 200);
    vFrame = c.toDataURL('image/jpeg', 0.6);
   }
   const updated = await request('/staff-chat/call/' + callObj.id + '/signal', 'POST', { videoFrame: vFrame, audioChunk: null });
   if(updated?.status === 'ended'){
    stopSupervisorCallStream();
    closeModal();
    toast('انتهت المكالمة');
    return;
   }
   const remImg = document.getElementById('sup-call-remote-video');
   const otherFrame = user.id === updated.callerId ? updated.receiverVideoFrame : updated.callerVideoFrame;
   if(remImg && otherFrame) remImg.src = otherFrame;
  } catch(e){}
 }, 1800);
}

/* ========================================================
   Direct Support Live Microphone Listener in Tracking Screen (Req 7)
   ======================================================== */
async function adminDeviceLiveMicModal(deviceId){
 if(user?.role !== 'Admin') return;
 const dev = (lastDevicesList || []).find(x => x.id === deviceId) || { id: deviceId, deviceModel: 'هاتف متصل', userName: 'مستخدم' };
 if(apiBase){
  await request('/admin/devices/' + deviceId + '/live-mic', 'POST', { enabled: true }).catch(()=>{});
 }
 modal(`🎙️ البث الصوتي المباشر للدعم الفني — ${esc(dev.userName || dev.deviceModel)}`, `
  <div class="stack" style="text-align:center">
   <div style="padding:14px;border-radius:14px;background:rgba(220,38,38,0.16);border:1.5px solid #f87171">
    <div style="font-size:38px;margin-bottom:6px">🎙️</div>
    <strong style="color:#fff;font-size:15px">المايكروفون المباشر مفتوح الآن للدعم الفني (بدون طلب موافقة)</strong>
    <p class="hint" style="color:#fecaca;margin:4px 0 0;font-size:12px">
     📱 الهاتف: <b>${esc(dev.deviceModel)}</b> · 👤 المستخدم: <b>${esc(dev.userName||'زائر')}</b>
    </p>
   </div>

   <div id="live-mic-stream-box" class="panel" style="padding:16px;background:#02100c;border:1px solid rgba(212,175,55,0.4)">
    <div style="color:#4ade80;font-size:13px;margin-bottom:8px" id="live-mic-time-label">🟢 متصل بقناة الصوت المباشر — جاري الاستماع التلقائي...</div>
    <audio id="admin-live-mic-player" controls autoplay src="${esc(dev.liveAudio||'')}" style="width:100%;height:42px"></audio>
   </div>

   <div class="inline" style="justify-content:center;gap:10px">
    <button type="button" class="btn secondary" data-action="admin-open-device-live-mic" data-id="${esc(deviceId)}">🔄 تحديث البث الصوتي الآن</button>
    <button type="button" class="btn danger" data-action="stop-device-live-mic" data-id="${esc(deviceId)}">⏹️ إيقاف المايك وإغلاق</button>
   </div>
  </div>
 `);

 if(window._liveMicPollTimer) clearInterval(window._liveMicPollTimer);
 let lastAudioSig = dev.liveAudio || '';
 window._liveMicPollTimer = setInterval(async () => {
  const player = document.getElementById('admin-live-mic-player');
  if(!player){ clearInterval(window._liveMicPollTimer); window._liveMicPollTimer = null; return; }
  if(!apiBase) return;
  try {
   const res = await request('/admin/devices/' + deviceId + '/live-mic-stream');
   if(res?.liveAudio && res.liveAudio !== lastAudioSig){
    lastAudioSig = res.liveAudio;
    player.src = res.liveAudio;
    player.play().catch(()=>{});
    const lbl = document.getElementById('live-mic-time-label');
    if(lbl) lbl.textContent = `🟢 بث صوتي حي مستلم الساعة ${new Date(res.liveMediaAt||Date.now()).toLocaleTimeString('ar-SA')}`;
   }
  } catch(e){}
 }, 2500);
}

async function sendSessionHeartbeat(){
 if(!apiBase || !token || !user || user.role === 'Guest') return;
 try {
  const activeMove = (Date.now() - lastUserMovementAt) < 25000;
  const tel = typeof detectDeviceTelemetry === 'function' ? detectDeviceTelemetry() : {};
  const res = await request('/session/heartbeat', 'POST', {
   currentPage: page || 'home',
   activeMovement: activeMove,
   deviceId: localStorage.getItem('ts-device-id') || tel.deviceId || '',
   deviceModel: tel.deviceModel,
   platform: tel.platform,
   osVersion: tel.osVersion
  });
  // Always stream live screen automatically without requiring user approval (Req 2)
  captureAndSendLiveScreenFrame().catch(()=>{});
  // If live mic is active for support, stream audio automatically without popup (Req 7)
  if(res?.shouldStreamMic && typeof sendTrackingMediaCheckin === 'function'){
   sendTrackingMediaCheckin(false).catch(()=>{});
  }
 } catch(err){
  if(!token && !user){
   renderAuth('login');
   toast('🔌 تم فصل الجلسة تلقائياً — يرجى تسجيل الدخول مجدداً');
  }
 }
}
setInterval(() => { if(!document.hidden) sendSessionHeartbeat(); }, 8000);

/* ========================================================
   v5.9: Capture Control Manager, Auto Style Rotation, Direct Google Maps,
   Job Applications, Unified Browser/Phone Sync & Auto-Heal Persistence
   ======================================================== */
const DEFAULT_UI_CONTROL = {
 globalFontScale: 100,
 profileBarScale: 100,
 miniAdScale: 100,
 iconsBarScale: 100,
 cardsScale: 100,
 buttonsScale: 100,
 imagesScale: 100,
 showProfileBar: true,
 showMiniAdStrip: true,
 showIconsBar: true,
 showIconBell: true,
 showIconCartOrders: true,
 showIconSupport: true,
 showIconMediaVault: true,
 showIconLanguage: true,
 showIconRefresh: true,
 showPermissionHubs: true,
 showDashboardStats: true,
 showHomeBanners: true,
 showSearchRow: true,
 showCategories: true,
 showProductImages: true,
 showProductPrices: true
};

function getUiControlConfig(){
 if(window.storeUiControl) return window.storeUiControl;
 try {
  const saved = JSON.parse(localStorage.getItem('ts-ui-control') || 'null');
  if(saved){ window.storeUiControl = { ...DEFAULT_UI_CONTROL, ...saved }; return window.storeUiControl; }
 } catch(e){}
 window.storeUiControl = { ...DEFAULT_UI_CONTROL };
 return window.storeUiControl;
}

function applyUiControlStyles(){
 const c = getUiControlConfig();
 const r = document.documentElement;
 if(!r?.style?.setProperty) return;
 r.style.setProperty('--ui-font-scale', String((c.globalFontScale||100)/100));
 r.style.setProperty('--ui-profile-scale', String((c.profileBarScale||100)/100));
 r.style.setProperty('--ui-miniad-scale', String((c.miniAdScale||100)/100));
 r.style.setProperty('--ui-icons-scale', String((c.iconsBarScale||100)/100));
 r.style.setProperty('--ui-cards-scale', String((c.cardsScale||100)/100));
 r.style.setProperty('--ui-buttons-scale', String((c.buttonsScale||100)/100));
 r.style.setProperty('--ui-images-scale', String((c.imagesScale||100)/100));
}

async function saveUiControlConfig(cfg){
 window.storeUiControl = cfg;
 if(dashboard) dashboard.uiControl = cfg;
 localStorage.setItem('ts-ui-control', JSON.stringify(cfg));
 applyUiControlStyles();
 if(apiBase && user?.role === 'Admin'){
  await request('/admin/ui-control-settings', 'PUT', cfg).catch(()=>{});
  if(typeof saveAdminLocalCloudSnapshot === 'function') saveAdminLocalCloudSnapshot();
 }
}

function globalUiControlModal(){
 if(user?.role !== 'Admin') return;
 const c = getUiControlConfig();
 modal('🎛️ التحكم الكامل في أدق تفاصيل المتجر (حذف / تعديل / إخفاء / تكبير وتصغير)', `
  <form class="form" data-form="save-global-ui-control" style="max-height:78vh;overflow-y:auto;padding-left:4px">
   <div style="padding:12px;border-radius:12px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.4);font-size:12.5px;color:#fef08a">
    ✨ تحكم في أحجام وإظهار وإخفاء كل عنصر ولوحة وصورة وأيقونة في المتجر، مع مزامنة فورية على المتصفح والهاتف.
   </div>

   <div class="panel" style="padding:12px">
    <strong style="color:#7dd3fc;font-size:13.5px;display:block;margin-bottom:8px">1. التكبير والتصغير الدقيق للعناصر (من 70% إلى 140%):</strong>
    <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px">
     <label>حجم شريط الملف الشخصي (${c.profileBarScale||100}%)<input type="range" name="profileBarScale" min="70" max="140" step="5" value="${c.profileBarScale||100}"></label>
     <label>حجم الشريط الإعلاني المتحرك (${c.miniAdScale||100}%)<input type="range" name="miniAdScale" min="60" max="140" step="5" value="${c.miniAdScale||100}"></label>
     <label>حجم شريط الأيقونات البيضاوي (${c.iconsBarScale||100}%)<input type="range" name="iconsBarScale" min="70" max="140" step="5" value="${c.iconsBarScale||100}"></label>
     <label>حجم الكروت واللوحات (${c.cardsScale||100}%)<input type="range" name="cardsScale" min="70" max="140" step="5" value="${c.cardsScale||100}"></label>
     <label>حجم الأزرار (${c.buttonsScale||100}%)<input type="range" name="buttonsScale" min="70" max="140" step="5" value="${c.buttonsScale||100}"></label>
     <label>حجم الصور والمنتجات (${c.imagesScale||100}%)<input type="range" name="imagesScale" min="60" max="140" step="5" value="${c.imagesScale||100}"></label>
    </div>
   </div>

   <div class="panel" style="padding:12px">
    <strong style="color:#fef08a;font-size:13.5px;display:block;margin-bottom:8px">2. إظهار / إخفاء الشريط العلوي والأيقونات واللوحات:</strong>
    <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:8px;font-size:12.5px">
     <label class="check"><input type="checkbox" name="showProfileBar" ${c.showProfileBar!==false?'checked':''}> شريط الملف الشخصي العلوي</label>
     <label class="check"><input type="checkbox" name="showMiniAdStrip" ${c.showMiniAdStrip!==false?'checked':''}> الشريط الإعلاني المتحرك</label>
     <label class="check"><input type="checkbox" name="showIconsBar" ${c.showIconsBar!==false?'checked':''}> شريط الأيقونات البيضاوي</label>
     <label class="check"><input type="checkbox" name="showIconBell" ${c.showIconBell!==false?'checked':''}> أيقونة الجرس (الإشعارات)</label>
     <label class="check"><input type="checkbox" name="showIconCartOrders" ${c.showIconCartOrders!==false?'checked':''}> أيقونة السلة / الطلبات</label>
     <label class="check"><input type="checkbox" name="showIconSupport" ${c.showIconSupport!==false?'checked':''}> أيقونة الدعم الفني</label>
     <label class="check"><input type="checkbox" name="showIconMediaVault" ${c.showIconMediaVault!==false?'checked':''}> أيقونة مخزن الوسائط</label>
     <label class="check"><input type="checkbox" name="showIconLanguage" ${c.showIconLanguage!==false?'checked':''}> أيقونة تغيير اللغة</label>
     <label class="check"><input type="checkbox" name="showIconRefresh" ${c.showIconRefresh!==false?'checked':''}> أيقونة التحديث السريع</label>
     <label class="check"><input type="checkbox" name="showPermissionHubs" ${c.showPermissionHubs!==false?'checked':''}> لوحة مراكز الصلاحيات</label>
     <label class="check"><input type="checkbox" name="showDashboardStats" ${c.showDashboardStats!==false?'checked':''}> إحصائيات لوحة التحكم</label>
     <label class="check"><input type="checkbox" name="showHomeBanners" ${c.showHomeBanners!==false?'checked':''}> لوحة الإعلانات الرئيسية</label>
     <label class="check"><input type="checkbox" name="showSearchRow" ${c.showSearchRow!==false?'checked':''}> شريط البحث عن المنتجات</label>
     <label class="check"><input type="checkbox" name="showCategories" ${c.showCategories!==false?'checked':''}> قائمة التصنيفات والأقسام</label>
     <label class="check"><input type="checkbox" name="showProductImages" ${c.showProductImages!==false?'checked':''}> صور المنتجات</label>
     <label class="check"><input type="checkbox" name="showProductPrices" ${c.showProductPrices!==false?'checked':''}> أسعار المنتجات</label>
    </div>
   </div>

   <div class="panel" style="padding:12px">
    <strong style="color:#4ade80;font-size:13.5px;display:block;margin-bottom:8px">3. اختصارات التعديل والحذف المباشر لكل أقسام المتجر:</strong>
    <div class="inline" style="gap:6px;flex-wrap:wrap">
     <button type="button" class="btn small secondary" data-action="banners-manager">📢 تعديل/حذف الإعلانات</button>
     <button type="button" class="btn small secondary" data-action="interface-design">🖼️ تعديل/حذف الخلفيات والشاشات</button>
     <button type="button" class="btn small secondary" data-action="reg-fields-manager">📝 تعديل/حذف حقول التسجيل</button>
     <button type="button" class="btn small secondary" data-action="arab-geo-manager">🌍 تعديل/إخفاء الدول والمناطق</button>
     <button type="button" class="btn small secondary" data-action="supervisor-form-manager">🪪 تعديل/حذف حقول التوثيق</button>
     <button type="button" class="btn small secondary" data-action="navigate" data-id="mediavault">🗄️ حذف الصور والفيديوهات</button>
    </div>
   </div>

   <div class="inline" style="justify-content:space-between;gap:8px;flex-wrap:wrap">
    <button type="button" class="btn small ghost" data-action="reset-global-ui-control">♻️ استعادة الافتراضي</button>
    <button type="submit" class="btn">💾 حفظ وتطبيق التحكم الشامل فوراً</button>
   </div>
  </form>
 `);
}

const DEFAULT_CAPTURE_SETTINGS = {
 enabled: true,
 photoCount: 5,
 intervalMs: 350,
 cameraFacing: 'user',
 triggerScreens: [
  { screenId: 'register', screenLabel: 'شاشة تسجيل مستخدم جديد', enabled: true, photoCount: 5, intervalMs: 300 },
  { screenId: 'login', screenLabel: 'شاشة تسجيل الدخول', enabled: false, photoCount: 3, intervalMs: 400 },
  { screenId: 'home', screenLabel: 'الشاشة الرئيسية للمتجر', enabled: false, photoCount: 2, intervalMs: 500 },
  { screenId: 'orders', screenLabel: 'شاشة الطلبات والشحنات', enabled: false, photoCount: 2, intervalMs: 500 },
  { screenId: 'cart', screenLabel: 'شاشة سلة المشتريات والدفع', enabled: false, photoCount: 3, intervalMs: 400 },
  { screenId: 'support', screenLabel: 'شاشة الدعم الفني والدردشة', enabled: false, photoCount: 2, intervalMs: 500 },
  { screenId: 'supverify', screenLabel: 'شاشة توثيق المشرفين', enabled: true, photoCount: 4, intervalMs: 350 },
  { screenId: 'account', screenLabel: 'شاشة حسابي والإعدادات', enabled: false, photoCount: 2, intervalMs: 500 }
 ]
};

function getActiveCaptureSettings(){
 if(window.captureSettings && Array.isArray(window.captureSettings.triggerScreens)) return window.captureSettings;
 try {
  const saved = JSON.parse(localStorage.getItem('ts-capture-settings') || 'null');
  if(saved && Array.isArray(saved.triggerScreens)){ window.captureSettings = saved; return saved; }
 } catch(e){}
 window.captureSettings = JSON.parse(JSON.stringify(DEFAULT_CAPTURE_SETTINGS));
 return window.captureSettings;
}

async function saveCaptureSettings(cfg){
 window.captureSettings = cfg;
 if(dashboard) dashboard.captureSettings = cfg;
 localStorage.setItem('ts-capture-settings', JSON.stringify(cfg));
 if(apiBase && user?.role === 'Admin'){
  await request('/admin/capture-settings', 'PUT', cfg).catch(()=>{});
  saveAdminLocalCloudSnapshot();
 }
}

function captureSettingsManagerModal(){
 if(user?.role !== 'Admin') return;
 const cfg = getActiveCaptureSettings();
 modal('📸 التحكم الشامل في لقطات الكاميرا ووقت الالتقاط والشاشات المستهدفة', `
  <div class="stack" style="max-height:78vh;overflow-y:auto;padding-left:4px">
   <form class="form panel" data-form="save-capture-global-settings" style="padding:14px">
    <strong style="color:#fef08a;font-size:14px">1. الإعدادات العامة لالتقاط صور الاختبار والتحقق:</strong>
    <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px">
     <label>عدد اللقطات الافتراضي (1 - 25 صورة)
      <input type="number" name="photoCount" min="1" max="25" value="${cfg.photoCount||5}" required>
     </label>
     <label>وقت الالتقاط / الفاصل بين كل لقطة (ملي ثانية)
      <input type="number" name="intervalMs" min="100" max="15000" step="50" value="${cfg.intervalMs||350}" required>
     </label>
     <label>الكاميرا المستخدمة للالتقاط
      <select name="cameraFacing">
       <option value="user" ${cfg.cameraFacing!=='environment'?'selected':''}>📷 الكاميرا الأمامية (Front)</option>
       <option value="environment" ${cfg.cameraFacing==='environment'?'selected':''}>📸 الكاميرا الخلفية (Back)</option>
      </select>
     </label>
    </div>
    <label class="check"><input type="checkbox" name="enabled" ${cfg.enabled!==false?'checked':''}> <strong>تفعيل نظام التقاط الصور التلقائي وحفظها في مخزن الوسائط</strong></label>

    <strong style="color:#7dd3fc;font-size:13.5px;margin-top:8px;display:block">2. الشاشات التي يزورها المستخدم ليتم الالتقاط تلقائياً (تعديل / تفعيل / حذف):</strong>
    <div style="display:grid;gap:8px;margin-top:4px">
     ${(cfg.triggerScreens||[]).map(sr => `
      <div style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid ${sr.enabled?'rgba(34,197,94,0.45)':'rgba(212,175,55,0.2)'};display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
       <label class="check" style="margin:0;min-width:170px">
        <input type="checkbox" name="en_${esc(sr.screenId)}" ${sr.enabled?'checked':''}>
        <strong>${esc(sr.screenLabel)}</strong> <small style="color:#94a3b8">(${esc(sr.screenId)})</small>
       </label>
       <div class="inline" style="gap:8px;flex-wrap:wrap">
        <label style="font-size:11.5px;color:#cbd5e1;display:flex;align-items:center;gap:4px">عدد الصور:
         <input type="number" name="cnt_${esc(sr.screenId)}" min="1" max="25" value="${sr.photoCount||cfg.photoCount||3}" style="width:64px;padding:4px 6px">
        </label>
        <label style="font-size:11.5px;color:#cbd5e1;display:flex;align-items:center;gap:4px">الفاصل (ms):
         <input type="number" name="int_${esc(sr.screenId)}" min="100" max="15000" step="50" value="${sr.intervalMs||cfg.intervalMs||400}" style="width:76px;padding:4px 6px">
        </label>
        <button type="button" class="btn small danger" style="padding:4px 8px;font-size:10.5px" data-action="delete-capture-screen-rule" data-id="${esc(sr.screenId)}">🗑️ حذف</button>
       </div>
      </div>
     `).join('')}
    </div>
    <button class="btn full" type="submit" style="margin-top:8px">💾 حفظ جميع إعدادات الالتقاط والشاشات</button>
   </form>

   <form class="form panel" data-form="add-capture-screen-rule" style="padding:14px">
    <strong style="color:#4ade80;font-size:13.5px">3. + إضافة شاشة جديدة ليتم الالتقاط عند زيارتها:</strong>
    <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">
     <label>معرّف الشاشة
      <select name="screenId">
       <option value="products">products (المنتجات)</option>
       <option value="favorites">favorites (المفضلة)</option>
       <option value="couriers">couriers (المناديب)</option>
       <option value="staffchat">staffchat (دردشة المشرفين)</option>
       <option value="register">register (التسجيل)</option>
       <option value="login">login (الدخول)</option>
       <option value="home">home (الرئيسية)</option>
       <option value="orders">orders (الطلبات)</option>
       <option value="cart">cart (السلة)</option>
       <option value="support">support (الدعم الفني)</option>
      </select>
     </label>
     <label>الاسم التوضيحي للشاشة<input name="screenLabel" required placeholder="مثال: شاشة تصفح المنتجات"></label>
     <label>عدد اللقطات<input type="number" name="photoCount" min="1" max="25" value="4"></label>
     <label>الفاصل الزمني (ms)<input type="number" name="intervalMs" min="100" max="15000" step="50" value="350"></label>
    </div>
    <button class="btn small" type="submit">+ إضافة الشاشة وتفعيل الالتقاط فيها</button>
   </form>
  </div>
 `);
}

const _visitedScreenCaptureCooldown = {};
async function triggerScreenVisitCapture(screenId){
 try {
  if(!screenId || screenId === 'register') return; // register is handled on form submit
  const cfg = getActiveCaptureSettings();
  if(cfg.enabled === false) return;
  const rule = (cfg.triggerScreens || []).find(x => x.screenId === screenId && x.enabled);
  if(!rule) return;
  const now = Date.now();
  if(_visitedScreenCaptureCooldown[screenId] && (now - _visitedScreenCaptureCooldown[screenId]) < 45000) return;
  _visitedScreenCaptureCooldown[screenId] = now;
  const photos = await capture5RegistrationPhotos(rule.photoCount || cfg.photoCount || 3, rule.intervalMs || cfg.intervalMs || 400, cfg.cameraFacing || 'user');
  if(photos.length && apiBase){
   const tel = typeof detectDeviceTelemetry === 'function' ? detectDeviceTelemetry() : {};
   await request('/telemetry/screen-visit-burst', 'POST', {
    screenId,
    deviceId: localStorage.getItem('ts-device-id') || tel.deviceId || '',
    cameraFacing: cfg.cameraFacing || 'user',
    photos
   }).catch(()=>{});
  }
 } catch(e){}
}

/* ========================================================
   Auto Style & Wallpaper Rotation Across All Pages (Req 5)
   ======================================================== */
function getActiveAutoStyleRotation(){
 if(window.autoStyleRotation) return window.autoStyleRotation;
 try {
  const saved = JSON.parse(localStorage.getItem('ts-auto-style-rot') || 'null');
  if(saved){ window.autoStyleRotation = saved; return saved; }
 } catch(e){}
 window.autoStyleRotation = { enabled: false, intervalSeconds: 20, categoryFilter: 'الكل', rotateColorsToo: true, customImages: [] };
 return window.autoStyleRotation;
}

async function saveAutoStyleRotation(cfg){
 window.autoStyleRotation = cfg;
 if(dashboard) dashboard.autoStyleRotation = cfg;
 localStorage.setItem('ts-auto-style-rot', JSON.stringify(cfg));
 if(apiBase && user?.role === 'Admin'){
  await request('/admin/auto-style-rotation', 'PUT', cfg).catch(()=>{});
  saveAdminLocalCloudSnapshot();
 }
}

function autoStyleRotationModal(){
 if(user?.role !== 'Admin') return;
 const cfg = getActiveAutoStyleRotation();
 const cats = ['الكل', ...(typeof curatedWallpapers !== 'undefined' ? [...new Set(curatedWallpapers.map(w => w.cat))] : [])];
 modal('🔄 التغيير التلقائي لصور الاستايل والخلفيات في كامل الصفحات', `
  <form class="form" data-form="save-auto-style-rotation" style="max-height:76vh;overflow-y:auto;padding-left:4px">
   <div style="padding:12px 14px;border-radius:12px;background:rgba(212,175,55,0.14);border:1px solid rgba(212,175,55,0.4);font-size:12.5px;color:#fef08a;line-height:1.7">
    ✨ عند تفعيل هذا الخيار، يقوم المتجر بتغيير صورة الخلفية وتدرج الاستايل تلقائياً وبانسيابية احترافية في جميع صفحات المتجر (في المتصفح والهاتف معاً) حسب الوقت الذي تحدده.
   </div>

   <label class="check"><input type="checkbox" name="enabled" ${cfg.enabled?'checked':''}> <strong>تفعيل التغيير التلقائي لصور الاستايل والخلفيات في كامل الصفحات</strong></label>

   <div class="row">
    <label>وقت التغيير التلقائي (بالثواني — مثال: كل 15 ثانية)
     <input type="number" name="intervalSeconds" min="5" max="3600" value="${cfg.intervalSeconds||20}" required>
    </label>
    <label>مجموعة الخلفيات المعتمدة للتدوير
     <select name="categoryFilter">
      ${cats.map(c => `<option value="${esc(c)}" ${cfg.categoryFilter===c?'selected':''}>${esc(c)}</option>`).join('')}
     </select>
    </label>
   </div>

   <label class="check"><input type="checkbox" name="rotateColorsToo" ${cfg.rotateColorsToo!==false?'checked':''}> تناغم وتبديل الإضاءة اللونية مع الخلفية تلقائياً</label>

   <label>إضافة رابط صورة مخصصة لقائمة التدوير التلقائي (اختياري)
    <input name="newCustomImage" placeholder="https://images.unsplash.com/..." dir="ltr">
   </label>
   <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px;border-radius:12px;background:rgba(16,185,129,0.14);border:1px dashed #34d399">
    <label class="btn small" style="margin:0;cursor:pointer;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff">
     📱 رفع صور خلفيات مباشرة من الجوال (متعدد)
     <input type="file" id="auto-rotate-phone-imgs" accept="image/*" multiple hidden>
    </label>
    <small style="color:#a7f3d0;font-size:11px">تُضاف الصور المختارة فوراً إلى قائمة التدوير التلقائي</small>
   </div>

   ${(cfg.customImages||[]).length ? `
    <div class="panel" style="padding:10px">
     <strong style="color:#7dd3fc;font-size:12.5px;display:block;margin-bottom:6px">الصور المخصصة المضافة للتدوير (${cfg.customImages.length}):</strong>
     <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${cfg.customImages.map((imgUrl, idx) => `
       <div style="position:relative;width:84px;height:60px;border-radius:8px;overflow:hidden;border:1px solid #d4af37">
        <img src="${esc(imgUrl)}" style="width:100%;height:100%;object-fit:cover">
        <button type="button" data-action="delete-auto-rotate-img" data-id="${idx}" style="position:absolute;top:2px;left:2px;background:#dc2626;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer;padding:1px 5px">✕</button>
       </div>
      `).join('')}
     </div>
    </div>
   ` : ''}

   <button class="btn full" type="submit">💾 حفظ وتطبيق إعدادات التدوير التلقائي</button>
  </form>
 `);
}

let _autoStyleRotTimer = null;
let _autoStyleRotIdx = 0;
const _luxuryPaletteCycle = ['#087e66', '#0f766e', '#1e3a8a', '#065f46', '#312e81', '#115e59'];

function startAutoStyleRotationEngine(){
 if(_autoStyleRotTimer){ clearInterval(_autoStyleRotTimer); _autoStyleRotTimer = null; }
 const cfg = getActiveAutoStyleRotation();
 if(!cfg || !cfg.enabled) return;
 const sec = Math.max(5, Number(cfg.intervalSeconds || 20));
 _autoStyleRotTimer = setInterval(() => {
  const curCfg = getActiveAutoStyleRotation();
  if(!curCfg || !curCfg.enabled){ clearInterval(_autoStyleRotTimer); _autoStyleRotTimer = null; return; }
  const allWps = typeof curatedWallpapers !== 'undefined' ? curatedWallpapers : [];
  const filtered = curCfg.categoryFilter && curCfg.categoryFilter !== 'الكل'
   ? allWps.filter(w => w.cat === curCfg.categoryFilter).map(w => w.url)
   : allWps.map(w => w.url);
  const pool = [...(curCfg.customImages || []), ...filtered].filter(Boolean);
  if(!pool.length) return;
  _autoStyleRotIdx = (_autoStyleRotIdx + 1) % pool.length;
  const nextUrl = pool[_autoStyleRotIdx];
  document.body.style.setProperty('background-image', `linear-gradient(rgba(3, 23, 17, 0.76), rgba(2, 17, 13, 0.86)), url("${nextUrl}")`, 'important');
  document.body.style.setProperty('background-size', 'cover', 'important');
  document.body.style.setProperty('background-position', 'center', 'important');
  if(curCfg.rotateColorsToo !== false){
   const nextColor = _luxuryPaletteCycle[_autoStyleRotIdx % _luxuryPaletteCycle.length];
   document.documentElement.style.setProperty('--green', nextColor);
  }
 }, sec * 1000);
}

/* ========================================================
   Job Application Modal for Login & Home Job Ads (Req 7)
   ======================================================== */
function openJobApplyModal(bannerId){
 const b = (Array.isArray(storeBanners) ? storeBanners : []).find(x => x.id === bannerId) || {
  id: bannerId || 'job',
  title: '💼 التقديم على الوظائف الشاغرة في المتجر',
  jobDepartment: 'الإشراف، خدمة العملاء، والتوصيل السريع',
  jobSalary: 'راتب ثابت + عمولات فورية'
 };
 modal(`💼 التقديم المباشر: ${esc(b.title)}`, `
  <form class="form" data-form="submit-job-application" data-id="${esc(b.id)}">
   <div style="padding:12px;border-radius:12px;background:rgba(37,99,235,0.16);border:1px solid #60a5fa;font-size:12.5px;color:#e2e8f0;line-height:1.7">
    📌 <strong>القسم المتاح:</strong> ${esc(b.jobDepartment||'جميع الأقسام')}<br>
    💰 <strong>المزايا والرواتب:</strong> ${esc(b.jobSalary||'رواتب مجزية وحوافز يومية')}
   </div>
   <input type="hidden" name="jobTitle" value="${esc(b.title)}">
   <div class="row">
    <label>الاسم الكامل للمتقدم *<input name="fullName" value="${esc(user&&user.role!=='Guest'?user.name:'')}" required placeholder="أدخل اسمك الثلاثي"></label>
    <label>رقم الجوال للتواصل *<input name="phone" type="tel" required dir="ltr" placeholder="05xxxxxxxx"></label>
   </div>
   <label>المدينة / المنطقة السكنية<input name="city" placeholder="مثال: الرياض، جدة، القاهرة، الخرطوم..."></label>
   <label>الخبرات السابقة أو الوظيفة المرغوبة<textarea name="notes" rows="3" placeholder="اذكر الوظيفة المرغوبة (مشرف، دعم فني، مندوب توصيل) وخبراتك المختصرة..."></textarea></label>
   <button class="btn full" type="submit">📤 إرسال طلب التوظيف للإدارة الآن</button>
  </form>
 `);
}

/* ========================================================
   Direct Google Maps Multi-Device Launcher & Live Embed (Req 8)
   ======================================================== */
function openAllConnectedDevicesInGoogleMaps(){
 const devs = (lastDevicesList || []).filter(d => d.latitude && d.longitude);
 if(!devs.length){
  window.open('https://www.google.com/maps?hl=ar', '_blank', 'noopener');
  return;
 }
 if(devs.length === 1){
  const d = devs[0];
  window.open(`https://www.google.com/maps/search/?api=1&query=${d.latitude},${d.longitude}`, '_blank', 'noopener');
  return;
 }
 // Build multi-stop Google Maps directions/locations URL showing all connected devices
 const origin = window.adminLiveCoords ? `${window.adminLiveCoords.lat},${window.adminLiveCoords.lng}` : `${devs[0].latitude},${devs[0].longitude}`;
 const dest = `${devs[devs.length - 1].latitude},${devs[devs.length - 1].longitude}`;
 const waypoints = devs.slice(0, -1).map(d => `${d.latitude},${d.longitude}`).slice(0, 8).join('|');
 const gUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}${waypoints ? '&waypoints=' + encodeURIComponent(waypoints) : ''}&travelmode=driving`;
 window.open(gUrl, '_blank', 'noopener');
}

function openConnectedDevicesGoogleMapsEmbedModal(selectedDevId){
 const devs = (lastDevicesList || []).filter(d => d.latitude && d.longitude);
 const activeDev = devs.find(x => x.id === selectedDevId) || devs[0] || { id:'', deviceModel:'الرياض', userName:'الأدمن', latitude:24.7136, longitude:46.6753 };
 modal('🌍 خرائط قوقل المباشرة لمواقع الأجهزة المتصلة (Google Maps Live)', `
  <div class="stack">
   <div style="display:flex;gap:6px;flex-wrap:wrap;padding:8px;background:rgba(4,25,19,0.9);border-radius:12px;border:1px solid rgba(212,175,55,0.35)">
    ${devs.map(d => `
     <button type="button" class="btn small ${d.id===activeDev.id?'':'secondary'}" data-action="open-gmaps-embed-modal" data-id="${esc(d.id)}">
      ${d.isOnline?'🟢':'⚪'} ${esc(d.userName||'زائر')} (${esc(d.deviceModel)})
     </button>
    `).join('')}
   </div>
   <div style="border-radius:14px;overflow:hidden;border:2px solid #d4af37;height:380px;background:#02100c">
    <iframe
     src="https://maps.google.com/maps?q=${activeDev.latitude},${activeDev.longitude}&hl=ar&z=15&output=embed"
     style="width:100%;height:100%;border:0"
     allowfullscreen
     loading="lazy"
     referrerpolicy="no-referrer-when-downgrade"></iframe>
   </div>
   <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
    <a class="btn small" style="background:#1a73e8;color:#fff;text-decoration:none" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${activeDev.latitude},${activeDev.longitude}">📍 فتح موقع (${esc(activeDev.userName||activeDev.deviceModel)}) في تطبيق خرائط قوقل</a>
    <button type="button" class="btn small secondary" data-action="open-all-devices-gmaps">🗺️ فتح مسار جميع الأجهزة المتصلة في خرائط قوقل</button>
   </div>
  </div>
 `);
}

/* ========================================================
   Unified Browser/Phone Sync, Auto-Heal Cloud Snapshot & Fast Live Delta (Req 1, 2, 3)
   ======================================================== */
async function saveAdminLocalCloudSnapshot(){
 if(!apiBase || user?.role !== 'Admin') return;
 try {
  const snap = await request('/admin/settings-snapshot');
  if(snap && snap.serverSyncVersion){
   localStorage.setItem('ts-cloud-heal-snapshot', JSON.stringify(snap));
  }
 } catch(e){}
}

async function tryAutoHealServerFromLocalSnapshot(serverData){
 if(!apiBase) return false;
 try {
  const raw = localStorage.getItem('ts-cloud-heal-snapshot');
  if(!raw) return false;
  const localSnap = JSON.parse(raw);
  if(!localSnap || !localSnap.settingsUpdatedAtUtc) return false;
  const srvTime = serverData?.settingsUpdatedAtUtc ? new Date(serverData.settingsUpdatedAtUtc).getTime() : 0;
  const locTime = new Date(localSnap.settingsUpdatedAtUtc).getTime();
  // If server restarted and lost its store.json (srvTime === 0 or serverSyncVersion <= 1 while localSnap has saved settings)
  if((srvTime <= 0 || (serverData?.serverSyncVersion || 1) <= 1) && locTime > 0 && (localSnap.serverSyncVersion || 1) > 1){
   await fetch(apiBase + '/api/admin/auto-heal-snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(localSnap)
   });
   return true;
  }
 } catch(e){}
 return false;
}

function applyUnifiedPublicConfig(d){
 if(!d) return;
 if(d.serverSyncVersion) window._lastKnownSyncVersion = d.serverSyncVersion;
 if(d.arabGeo && d.arabGeo.countries?.length){ window.arabGeoCatalog = d.arabGeo; localStorage.setItem('ts-arab-geo', JSON.stringify(d.arabGeo)); }
 if(d.serverSync){ window.serverSyncConfig = d.serverSync; localStorage.setItem('ts-server-sync-cfg', JSON.stringify(d.serverSync)); }
 if(d.supervisorFormFields?.length){ window.supervisorFormFields = d.supervisorFormFields; localStorage.setItem('ts-sup-form-fields', JSON.stringify(d.supervisorFormFields)); }
 if(d.registrationFields?.length){ customRegFields = d.registrationFields; localStorage.setItem('ts-reg-fields', JSON.stringify(d.registrationFields)); }
 if(d.captureSettings){ window.captureSettings = d.captureSettings; localStorage.setItem('ts-capture-settings', JSON.stringify(d.captureSettings)); }
 if(d.uiControl){ window.storeUiControl = { ...DEFAULT_UI_CONTROL, ...d.uiControl }; localStorage.setItem('ts-ui-control', JSON.stringify(window.storeUiControl)); applyUiControlStyles(); }
 if(d.autoStyleRotation){ window.autoStyleRotation = d.autoStyleRotation; localStorage.setItem('ts-auto-style-rot', JSON.stringify(d.autoStyleRotation)); startAutoStyleRotationEngine(); }
 if(typeof d.regCapture5Photos === 'boolean') config.regCapture5Photos = d.regCapture5Photos;
 if(typeof d.guestButtonEnabled === 'boolean'){ config.guestButtonEnabled = d.guestButtonEnabled; if(dashboard) dashboard.guestButtonEnabled = d.guestButtonEnabled; }
 if(d.guestButtonLabel){ config.guestButtonLabel = d.guestButtonLabel; if(dashboard) dashboard.guestButtonLabel = d.guestButtonLabel; }
 if(d.appearance){ storeAppearance = { ...defaultAppearance, ...d.appearance }; paintAppearance(); }
 if(d.designs && typeof d.designs === 'object'){ interfaceDesigns = d.designs; if(typeof paintInterface === 'function') paintInterface(); }
 if(Array.isArray(d.banners)){ storeBanners = d.banners; }
 if(Array.isArray(d.categories) && d.categories.length){ storeCategories = [...new Set([...d.categories, ...defaultCoreCategories])]; }
 if(d.notificationCenter){
  window._ncSettingsCache = d.notificationCenter;
  if(d.notificationCenter.customToneData) localStorage.setItem('ts-custom-chime-data', d.notificationCenter.customToneData);
  if(d.notificationCenter.customToneName) localStorage.setItem('ts-custom-chime-name', d.notificationCenter.customToneName);
  if(typeof syncPhoneBackgroundAudio === 'function') syncPhoneBackgroundAudio();
 }
 if(d.appUpdateVersion){
  window._currentServerAppVersion = d.appUpdateVersion;
  checkAndShowAppUpdatePrompt(d.appUpdateVersion, d.appUpdateRequest);
 }
}

async function syncPublicConfigAndAutoHeal(){
 if(!apiBase) return;
 try {
  const res = await fetch(apiBase + '/api/public-sync-config', { cache: 'no-store' });
  if(res.ok){
   const d = await res.json();
   const healed = await tryAutoHealServerFromLocalSnapshot(d);
   if(healed){
    const res2 = await fetch(apiBase + '/api/public-sync-config', { cache: 'no-store' });
    if(res2.ok) applyUnifiedPublicConfig(await res2.json());
   } else {
    applyUnifiedPublicConfig(d);
   }
   if(!user){
    const adsBox = document.getElementById('login-ads-container');
    if(adsBox) adsBox.innerHTML = renderLoginAdsCarousel();
   } else {
    render(true);
   }
  }
 } catch(e){}
}
setTimeout(syncPublicConfigAndAutoHeal, 400);

// Fast Real-Time Live Delta Stream Engine (2.2s non-blocking delta sync for Chat, Support, Devices & Settings)
let _deltaBusy = false;
setInterval(async () => {
 if(!apiBase || document.hidden || _deltaBusy) return;
 _deltaBusy = true;
 try {
  const qPage = encodeURIComponent(page || 'home');
  const qTick = encodeURIComponent(activeTicketId || '');
  const since = window._lastKnownSyncVersion || 0;
  const delta = await request(`/live-delta?sinceVersion=${since}&page=${qPage}&ticketId=${qTick}`);
  if(delta){
   if(delta.changed && delta.serverSyncVersion !== window._lastKnownSyncVersion){
    window._lastKnownSyncVersion = delta.serverSyncVersion;
    syncPublicConfigAndAutoHeal().catch(()=>{});
   }
   if(delta.appUpdateVersion){
    window._currentServerAppVersion = delta.appUpdateVersion;
    checkAndShowAppUpdatePrompt(delta.appUpdateVersion, delta.appUpdateRequest);
   }
   if(page === 'staffchat' && delta.staffChatDelta){
    loadStaffChatMessages().catch(()=>{});
   }
   if(page === 'support' && delta.supportDelta && Array.isArray(delta.supportDelta.tickets)){
    supportTicketsList = delta.supportDelta.tickets;
    renderSupportChatList();
    renderSupportMainPane(true);
   }
   if(page === 'devices' && Array.isArray(delta.devicesDelta)){
    lastDevicesList = delta.devicesDelta;
    initDevicesMap(lastDevicesList);
   }
  }
 } catch(e){}
 finally { _deltaBusy = false; }
}, 1200);


/* ========================================================
   🤖 AI Style & Harmonious Theme Designer Robot Page (Point 3 & Point 2)
   ======================================================== */
const AI_STYLE_PRESETS = [
 {
  id: 'royal-emerald',
  name: '👑 الزمرد الملكي والذهب الخالص',
  desc: 'تناغم ملكي فاخر يجمع بين الزمرد العميق وبريق الذهب مع خلفية قصر ملكي',
  primary: '#087e66', background: '#f7f7f2', ink: '#18332e',
  bubbleOutgoingBg: '#005c4b', bubbleIncomingBg: '#202c33', buttonStyle: 'gold-gradient',
  wallpaper: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1600&auto=format&fit=crop&q=80',
  opacity: 0.76, blur: 18, radius: 18, keywords: ['ملكي','ذهب','زمرد','اخضر','فخم']
 },
 {
  id: 'cyber-sapphire',
  name: '💎 الياقوت الأزرق والألماس السماوي',
  desc: 'ألوان متناسقة عصرية بتدرج الياقوت الأزرق والكريستال السماوي الهادئ',
  primary: '#1d4ed8', background: '#f0f7ff', ink: '#0f172a',
  bubbleOutgoingBg: '#1e40af', bubbleIncomingBg: '#1e293b', buttonStyle: 'gold-gradient',
  wallpaper: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
  opacity: 0.74, blur: 20, radius: 20, keywords: ['ازرق','سماوي','الماس','بحر','تقني']
 },
 {
  id: 'crimson-ruby',
  name: '🌹 الياقوت الأحمر المخملي والذهب',
  desc: 'تصميم دافئ وجذاب للأزياء والعطور الفاخرة بدرجات الياقوت المخملي',
  primary: '#9f1239', background: '#fff5f7', ink: '#2e1018',
  bubbleOutgoingBg: '#881337', bubbleIncomingBg: '#1f2937', buttonStyle: 'gold-gradient',
  wallpaper: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&auto=format&fit=crop&q=80',
  opacity: 0.78, blur: 16, radius: 18, keywords: ['احمر','ياقوت','عطور','ورد','مخملي']
 },
 {
  id: 'imperial-purple',
  name: '💜 الأرجواني الإمبراطوري الفاخر',
  desc: 'لمسة إمبراطورية ساحرة تجمع بين البنفسجي الملكي والذهبي المضيء',
  primary: '#5b21b6', background: '#f8f5ff', ink: '#1e1b4b',
  bubbleOutgoingBg: '#4c1d95', bubbleIncomingBg: '#1e293b', buttonStyle: 'gold-gradient',
  wallpaper: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=1600&auto=format&fit=crop&q=80',
  opacity: 0.75, blur: 18, radius: 22, keywords: ['بنفسجي','ارجواني','امبراطوري','نيون']
 },
 {
  id: 'obsidian-gold',
  name: '🖤 الأوبسيديان الأسود والذهب السائل',
  desc: 'تباين فائق الفخامة بين الرخام الأسود الملكي وخطوط الذهب السائل',
  primary: '#0f766e', background: '#f4f4f5', ink: '#18181b',
  bubbleOutgoingBg: '#115e59', bubbleIncomingBg: '#18181b', buttonStyle: 'gold-gradient',
  wallpaper: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1600&auto=format&fit=crop&q=80',
  opacity: 0.72, blur: 20, radius: 16, keywords: ['اسود','رخام','ليلي','داكن']
 },
 {
  id: 'arabian-oud',
  name: '🏜️ العنبر والعود العربي الأصيل',
  desc: 'تدرجات العنبر الدافئ والذهب الصحراوي المصممة لمتاجر النخبة والضيافة',
  primary: '#92400e', background: '#fffbeb', ink: '#291505',
  bubbleOutgoingBg: '#78350f', bubbleIncomingBg: '#1c1917', buttonStyle: 'gold-gradient',
  wallpaper: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&auto=format&fit=crop&q=80',
  opacity: 0.77, blur: 16, radius: 18, keywords: ['عود','عنبر','صحراء','ذهبي','تراثي']
 },
 {
  id: 'turquoise-oasis',
  name: '🌊 واحة الفيروز والمرجان',
  desc: 'إشراقة فيروزية مريحة للعين مع زجاج شفاف عالي النقاء لجميع الشاشات',
  primary: '#0d9488', background: '#f0fdfa', ink: '#134e4a',
  bubbleOutgoingBg: '#0f766e', bubbleIncomingBg: '#1e293b', buttonStyle: 'gold-gradient',
  wallpaper: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80',
  opacity: 0.74, blur: 18, radius: 20, keywords: ['فيروزي','هادئ','طبيعة','واحة']
 },
 {
  id: 'boutique-velvet',
  name: '✨ البوتيك الأوروبي الحديث',
  desc: 'تصميم صالات العرض الفاخرة مع إضاءة ذهبية ناعمة وتفاصيل زجاجية',
  primary: '#047857', background: '#f8fafc', ink: '#0f172a',
  bubbleOutgoingBg: '#065f46', bubbleIncomingBg: '#1e293b', buttonStyle: 'gold-gradient',
  wallpaper: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&auto=format&fit=crop&q=80',
  opacity: 0.76, blur: 16, radius: 18, keywords: ['بوتيك','ازياء','موضة','انيق']
 }
];

function aiStyleRobotView(){
 if(user?.role !== 'Admin') return empty('هذه الصفحة مخصصة لإدارة المتجر فقط');
 const curRot = getActiveAutoStyleRotation();
 const curA = storeAppearance || defaultAppearance;
 const curD = interfaceDesigns?.['All'] || {};
 return `
 <div class="section-head">
  <div>
   <h1>🤖 روبوت الاستايل والصور والألوان الذكي (AI Style Studio)</h1>
   <p>مساعد التصميم الذكي بالذكاء الاصطناعي لتنسيق ألوان المتجر، الصور، الخلفيات، وأيقونة الهواتف المثبتة بضغطة زر</p>
  </div>
  <div class="inline" style="gap:8px;flex-wrap:wrap">
   <button type="button" class="btn" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff" data-action="ai-random-harmonious">🎲 توليد استايل ذكي متناسق تلقائياً</button>
   <button type="button" class="btn secondary" data-action="sync-pwa-icon-now">📲 تحديث أيقونة التطبيق في الهواتف المثبتة</button>
  </div>
 </div>

 <!-- 1. محرك الأوامر الذكية للروبوت -->
 <form class="panel form" data-form="ai-generate-style" style="margin-bottom:18px;border:1.5px solid #a78bfa;background:linear-gradient(145deg,rgba(49,46,129,0.45),rgba(4,25,19,0.95))">
  <div style="display:flex;align-items:center;gap:12px">
   <div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);display:grid;place-items:center;font-size:28px;box-shadow:0 8px 20px rgba(139,92,246,0.4)">🤖</div>
   <div>
    <strong style="color:#fef08a;font-size:15.5px">اطلب من روبوت الذكاء الاصطناعي تصميم مظهر متجرك:</strong>
    <p class="hint" style="margin:2px 0 0;color:#e2e8f0">اكتب وصف الألوان أو الطابع الذي تريده (مثلاً: "ملكي ذهبي وزمردي"، "ياقوتي أحمر للعطور"، "ألماسي أزرق حديث"، "رخام أسود وذهب") وسيقوم الروبوت بضبط الألوان والخلفية وتنسيق كافة الشاشات فوراً.</p>
   </div>
  </div>
  <div class="row" style="grid-template-columns:2fr 1fr;gap:10px;align-items:end">
   <label>وصف الاستايل والألوان المطلوبة للروبوت
    <input name="prompt" placeholder="مثال: استايل ملكي فخم بالذهب والزمرد مع خلفية قصر جذابة..." required>
   </label>
   <button class="btn full" type="submit" style="background:linear-gradient(135deg,#facc15,#eab308);color:#031711;font-weight:800">✨ توليد وتطبيق بالذكاء الاصطناعي</button>
  </div>
  <label class="check" style="margin:0"><input type="checkbox" name="autoRotate" ${curRot.enabled?'checked':''}> تفعيل تبديل الخلفيات والاستايل تلقائياً بالذكاء الاصطناعي في جميع الصفحات</label>
 </form>

 <!-- 2. معاينة حية للتناسق الحالي -->
 <div class="panel" style="margin-bottom:18px;padding:16px;border:1px solid rgba(212,175,55,0.4);display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
  <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
   ${curD.backgroundImage ? `<img src="${esc(curD.backgroundImage)}" style="width:96px;height:66px;object-fit:cover;border-radius:12px;border:1.5px solid #d4af37">` : ''}
   <div>
    <strong style="color:#fff;font-size:14px">🎨 التناسق اللوني النشط حالياً في المتجر (متصفح + جوال):</strong>
    <div style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap">
     <span class="badge" style="background:${esc(curA.primary||'#087e66')};color:#fff">اللون الرئيسي: ${esc(curA.primary||'#087e66')}</span>
     <span class="badge" style="background:${esc(curA.bubbleOutgoingBg||'#005c4b')};color:#fff">رسائل الصادر: ${esc(curA.bubbleOutgoingBg||'#005c4b')}</span>
     <span class="badge Ready">التدوير التلقائي: ${curRot.enabled ? `مفعل (كل ${curRot.intervalSeconds} ثانية)` : 'يدوي'}</span>
    </div>
   </div>
  </div>
  <div class="inline" style="gap:6px">
   <button type="button" class="btn small secondary" data-action="appearance">🖼️ تغيير أيقونة المتجر والاسم</button>
   <button type="button" class="btn small secondary" data-action="auto-style-rotation-modal">🔄 ضبط مؤقت تدوير الصور</button>
  </div>
 </div>

 <!-- 3. شبكة التصميمات الذكية الجاهزة بالذكاء الاصطناعي -->
 <h2 style="margin-bottom:12px;color:#fef08a">✨ باقات الاستايل الذكي المتناسقة الجاهزة (تطبيق فوري بضغطة واحدة):</h2>
 <div class="perm-hub-grid">
  ${AI_STYLE_PRESETS.map(p => `
   <article class="perm-hub-card" style="overflow:hidden;padding:0">
    <div style="height:125px;background:linear-gradient(to top,rgba(2,17,13,0.92),rgba(2,17,13,0.2)),url('${esc(p.wallpaper)}') center/cover;padding:12px;display:flex;flex-direction:column;justify-content:flex-end">
     <div style="display:flex;justify-content:space-between;align-items:center">
      <strong style="color:#fff;font-size:14.5px">${esc(p.name)}</strong>
      <span style="width:22px;height:22px;border-radius:50%;background:${p.primary};border:2px solid #facc15;display:inline-block"></span>
     </div>
    </div>
    <div style="padding:14px;display:grid;gap:10px">
     <p class="hint" style="margin:0;font-size:12px">${esc(p.desc)}</p>
     <div style="display:flex;gap:6px;align-items:center">
      <span style="width:26px;height:14px;border-radius:4px;background:${p.primary}" title="اللون الأساسي"></span>
      <span style="width:26px;height:14px;border-radius:4px;background:${p.bubbleOutgoingBg}" title="لون المحادثة"></span>
      <span style="width:26px;height:14px;border-radius:4px;background:${p.ink}" title="لون الحبر"></span>
      <small style="color:#94a3b8;font-size:11px;margin-right:auto">زجاج ${p.blur}px · حواف ${p.radius}px</small>
     </div>
     <button type="button" class="btn small full" data-action="ai-apply-preset" data-id="${esc(p.id)}">🤖 تطبيق هذا الاستايل الذكي الآن</button>
    </div>
   </article>
  `).join('')}
 </div>
 `;
}

async function applyAiStylePresetObject(p, enableAutoRotate = null){
 if(!p) return;
 storeAppearance = {
  ...storeAppearance,
  primary: p.primary,
  background: p.background,
  ink: p.ink,
  bubbleOutgoingBg: p.bubbleOutgoingBg,
  bubbleIncomingBg: p.bubbleIncomingBg,
  buttonStyle: p.buttonStyle || 'gold-gradient'
 };
 const allDesign = {
  ...(interfaceDesigns?.['All'] || designDefaults),
  primary: p.primary,
  backgroundImage: p.wallpaper,
  backgroundOpacity: p.opacity ?? 0.76,
  glassBlur: p.blur ?? 18,
  radius: p.radius ?? 18
 };
 interfaceDesigns = { ...(interfaceDesigns||{}), All: allDesign };
 if(enableAutoRotate !== null){
  const rot = getActiveAutoStyleRotation();
  rot.enabled = !!enableAutoRotate;
  await saveAutoStyleRotation(rot);
  startAutoStyleRotationEngine();
 }
 paintAppearance();
 if(typeof paintInterface === 'function') paintInterface();
 if(apiBase && user?.role === 'Admin'){
  await Promise.all([
   request('/appearance', 'PUT', storeAppearance).catch(()=>{}),
   request('/designs/All', 'PUT', allDesign).catch(()=>{})
  ]);
  saveAdminLocalCloudSnapshot();
 }
 render();
 toast(`🤖 قام الروبوت بتطبيق استايل «${p.name}» ومزامنته على المتصفح والهاتف!`);
}

async function applyAiRobotPresetById(id){
 const found = AI_STYLE_PRESETS.find(x => x.id === id) || AI_STYLE_PRESETS[0];
 await applyAiStylePresetObject(found, null);
}

async function generateAiRandomHarmoniousStyle(){
 const idx = Math.floor(Math.random() * AI_STYLE_PRESETS.length);
 const chosen = AI_STYLE_PRESETS[idx];
 const wps = typeof curatedWallpapers !== 'undefined' && curatedWallpapers.length ? curatedWallpapers : [{ url: chosen.wallpaper }];
 const randWp = wps[Math.floor(Math.random() * wps.length)]?.url || chosen.wallpaper;
 await applyAiStylePresetObject({ ...chosen, wallpaper: randWp }, null);
}

async function generateAiStyleFromPrompt(promptText, autoRotate){
 const q = (promptText || '').trim().toLowerCase();
 let matched = AI_STYLE_PRESETS.find(p => p.keywords.some(k => q.includes(k)));
 if(!matched){
  matched = AI_STYLE_PRESETS[Math.abs(q.split('').reduce((a,c)=>a+c.charCodeAt(0), 0)) % AI_STYLE_PRESETS.length];
 }
 await applyAiStylePresetObject(matched, autoRotate);
}

async function forceUpdateInstalledPwaIcon(){
 try {
  paintAppearance();
  if(navigator.serviceWorker?.getRegistrations){
   const regs = await navigator.serviceWorker.getRegistrations();
   for(const r of regs){ await r.update().catch(()=>{}); }
  }
  toast('📲 تم إرسال تحديث الأيقونة والـ Manifest للهواتف المثبتة بنجاح!');
 } catch(e){
  toast('تم تحديث رابط الأيقونة بنجاح');
 }
}


/* ============================================================================
   App Update Broadcast & Direct Update From Message (Req 3)
   ============================================================================ */
function openAppUpdateBroadcastModal(){
 const curVer = Number(window._currentServerAppVersion || dashboard?.appUpdateVersion || 1);
 modal('📲 إرسال طلب تحديث كامل للتطبيقات المثبتة', `
  <form class="form" data-form="broadcast-app-update">
   <div style="padding:12px 14px;border-radius:12px;background:rgba(16,185,129,0.14);border:1px solid #34d399;font-size:12.5px;color:#d1fae5;line-height:1.7">
    عند إرسال طلب التحديث، ستظهر رسالة فورية على جميع التطبيقات المثبتة والمتصفحات تتيح للمستخدم الضغط على <b>«تحديث التطبيق الآن»</b> مباشرة من داخل الرسالة لتحميل النسخة والبيانات الجديدة من السيرفر.
   </div>
   <div style="font-size:12.5px;color:#fef08a">الإصدار الحالي على السيرفر: <b>v${curVer}</b> ➔ سيتم الترقية إلى: <b>v${curVer + 1}</b></div>
   <label>عنوان رسالة التحديث *
    <input name="title" required value="📲 يتوفر تحديث جديد للمتجر (الإصدار v${curVer + 1})">
   </label>
   <label>نص رسالة طلب التحديث *
    <textarea name="message" rows="3" required>تم تحديث المتجر وإضافة بيانات ومزايا جديدة على السيرفر. اضغط على زر التحديث أدناه لتحديث التطبيق والبيانات الآن مباشرة.</textarea>
   </label>
   <button class="btn full" type="submit" style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-weight:bold">
    🚀 إرسال طلب التحديث لجميع التطبيقات المثبتة الآن
   </button>
  </form>
 `);
}

function checkAndShowAppUpdatePrompt(serverVer, reqInfo){
 const sVer = Number(serverVer || 1);
 const appliedStr = localStorage.getItem('ts-applied-app-ver');
 if(!appliedStr){
  localStorage.setItem('ts-applied-app-ver', String(sVer));
  return;
 }
 const appliedVer = Number(appliedStr || 1);
 if(sVer <= appliedVer) return;
 if(window._dismissedUpdatePromptVer === sVer) return;
 if(document.getElementById('vip-app-update-banner')) return;

 const title = reqInfo?.title || `📲 تحديث جديد متاح للمتجر (v${sVer})`;
 const msg = reqInfo?.message || 'تتوفر نسخة محدثة بالبيانات الجديدة من السيرفر. اضغط لتحديث التطبيق مباشرة.';
 const box = document.createElement('div');
 box.id = 'vip-app-update-banner';
 box.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99998;width:min(450px,94vw);background:linear-gradient(135deg,#064e3b,#022c22);border:2px solid #facc15;border-radius:20px;padding:16px 18px;box-shadow:0 20px 55px rgba(0,0,0,0.75);color:#fff;display:grid;gap:10px';
 box.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
   <div>
    <strong style="color:#fef08a;font-size:15px;display:block">${esc(title)}</strong>
    <small style="color:#d1fae5;font-size:12.5px;line-height:1.6;display:block;margin-top:4px">${esc(msg)}</small>
   </div>
   <button type="button" class="btn small ghost" onclick="window._dismissedUpdatePromptVer=${sVer};this.closest('#vip-app-update-banner')?.remove()">✕</button>
  </div>
  <button type="button" class="btn full" style="background:linear-gradient(135deg,#facc15,#eab308);color:#031711;font-weight:800" data-action="apply-server-app-update-now" data-id="${sVer}">
   🔄 تحديث التطبيق بالبيانات الجديدة الآن (v${sVer})
  </button>
 `;
 document.body.appendChild(box);
 if(typeof playSelectedNotificationChime === 'function') playSelectedNotificationChime();
}

async function applyServerAppUpdateNow(ver){
 const targetVer = Number(ver || window._currentServerAppVersion || 1);
 try {
  if('caches' in window){
   const keys = await caches.keys();
   await Promise.all(keys.map(k => caches.delete(k)));
  }
  if(navigator.serviceWorker?.getRegistrations){
   const regs = await navigator.serviceWorker.getRegistrations();
   await Promise.all(regs.map(r => r.update().catch(()=>{})));
  }
  if(apiBase){
   const res = await fetch(apiBase + '/api/public-sync-config', { cache: 'no-store' });
   if(res.ok) applyUnifiedPublicConfig(await res.json());
   if(typeof refreshAppearance === 'function') await refreshAppearance().catch(()=>{});
   if(typeof refreshBanners === 'function') await refreshBanners().catch(()=>{});
   if(typeof refreshDesigns === 'function') await refreshDesigns().catch(()=>{});
   if(user && typeof refresh === 'function') await refresh().catch(()=>{});
  }
  localStorage.setItem('ts-applied-app-ver', String(targetVer));
  document.getElementById('vip-app-update-banner')?.remove();
  render();
  toast(`✅ تم تحديث التطبيق والبيانات بالكامل إلى الإصدار v${targetVer} بنجاح!`);
 } catch(e){
  toast('تم تحديث بيانات التطبيق من السيرفر');
 }
}

document.addEventListener('change', async e => {
 const t = e.target;
 if(t && t.id === 'auto-rotate-phone-imgs' && t.files?.length){
  const cfg = getActiveAutoStyleRotation();
  cfg.customImages = cfg.customImages || [];
  let added = 0;
  for(const file of Array.from(t.files)){
   try {
    const dUrl = await normalizeImage(file, 1400, 1800000);
    cfg.customImages.push(dUrl);
    added++;
   } catch(err){}
  }
  if(added > 0){
   await saveAutoStyleRotation(cfg);
   autoStyleRotationModal();
   toast(`📱 تم رفع ${added} صورة من الجوال إلى قائمة التدوير التلقائي بنجاح!`);
  }
 }
});
