
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
    <div style="width:65px;height:65px;border-radius:12px;overflow:hidden;border:2px solid ${idx===0?'#fef08a':'rgba(212,175,55,0.3)'};cursor:pointer;flex-shrink:0" onclick="document.getElementById('gallery-main-display').src='${esc(img)}'">
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
const roles = {Customer:'عميل معتمد', Merchant:'شريك تجاري', Courier:'مندوب التوصيل السريع', Admin:'الإدارة العليا', Support:'الدعم الفني المباشر'};
const statuses = {Preparing:'قيد التجهيز الفاخر',Ready:'جاهز للاستلام',Assigned:'تم إسناد مندوب التوصيل',OnWay:'في الطريق إليك الآن',Delivered:'تم التسليم بنجاح',Cancelled:'ملغي'};
const rights = {'commissions.manage':'إدارة العمولات وكشفها','policies.manage':'إدارة الاتفاقيات وشروط المتجر','registrations.manage':'مراجعة تسجيل العملاء والتجار والمناديب','commerce.manage':'إدارة العملات واللغة وطرق الدفع','payments.review':'مراجعة إيصالات واعتماد الدفع','chat.read':'قراءة الدردشة','chat.delivery':'دردشة العميل والمندوب','chat.support':'دردشة الدعم','chat.text':'إرسال نص','chat.image':'إرسال صور','chat.audio':'تسجيل وإرسال صوت','chat.camera':'التصوير داخل الدردشة','appearance.manage':'تعديل ألوان وصورة وخط المتجر','notifications.send':'إرسال إشعارات للمستخدمين','support.manage':'إدارة تذاكر الدعم','tracking.read':'عرض مواقع الطلبات','orders.create':'إنشاء الطلبات','orders.cancel':'إلغاء الطلب قبل التوصيل','orders.prepare':'تجهيز طلبات المتجر','orders.manage':'إدارة جميع الطلبات','products.write':'إضافة وتعديل المنتجات','delivery.assign':'إسناد مندوب التوصيل','delivery.update':'استلام وتسليم الشحنات','users.manage':'إدارة المستخدمين والصلاحيات','audit.read':'عرض سجل النشاط'};
const defaultRights = {Support:[...chatRightKeys.filter(p=>p!=='chat.delivery'),'support.manage'],Customer:[...chatRightKeys,'orders.create','orders.cancel'],Merchant:[...chatRightKeys.filter(p=>p!=='chat.delivery'),'products.write','orders.prepare'],Courier:[...chatRightKeys,'delivery.update'],Admin:Object.keys(rights)};
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
check:'m5 12 4 4L19 6',clock:'M12 8v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20',chart:'M3 3v18h18M7 15l5-5 4 3 5-8',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',close:'m6 6 12 12M6 18 18 6',edit:'m16 3 5 5-13 13H3v-5L16 3Z',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4'};
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

function seedDemo(){
  const names=[
  ['حقيبة يد جلدية إيطالية فاخرة','إكسسوارات',480,'bag',15,'حقيبة يد نسائية مصنوعة يدوياً من أفخم جلود التوسكانا الطبيعية مع حزام مريح وسحاب ذهبي أنيق.'],
  ['ساعة يد كرونوغراف ملكية ذهبية','إلكترونيات ومجوهرات',1250,'watch',8,'ساعة يد ميكانيكية بسوار فولاذي مطلي بالذهب ومينا ياقوتي مقاوم للخدش وحركة سويسرية دقيقة.'],
  ['عطر العود الملكي ونفحات العنبر','عطور وعناية',390,'perfume',20,'عطر نخبوي مركز يجمع بين دهن العود الكمبودي النادر ونفحات العنبر والمسك الأبيض الفاخر.'],
  ['سماعة رأس لاسلكية هاي-ريز عازلة','إلكترونيات ومجوهرات',780,'headphones',12,'صوت نقي فائق الدقة مع خاصية إلغاء الضوضاء النشطة ANC الذكية وبطارية تدوم حتى 35 ساعة متواصلة.'],
  ['حذاء سنيكرز كاجوال جلدي نخبوي','أزياء',420,'shoe',16,'تصميم عصري فخم من الجلد الطبيعي المرن مع نعل طبي مبتكر يمتص الصدمات ويوفر راحة قصوى طوال اليوم.'],
  ['نظارة شمسية كلاسيكية بإطار ذهبي','إكسسوارات',290,'glasses',25,'عدسات مستقطبة مستوية بحماية 100% من الأشعة فوق البنفسجية UV400 وإطار تيتانيوم ذهبي خفيف ومتين.'],
  ['ماكينة تحضير قهوة إسبريسو إيطالية','المنزل والديكور',850,'coffee',10,'مضخة إيطالية بقوة 15 بار مع نظام تسخين فوري وعصا تبخير احترافية لتحضير أرقى مشروبات القهوة المختصة.'],
  ['مصباح طاولة رخامي بإضاءة دافئة','المنزل والديكور',240,'lamp',14,'قطعة ديكور راقية بقاعدة من الرخام الأسود الطبيعي ولمسات نحاسية مع إضاءة LED ذكية قابلة للتعتيم.'],
  ['كاميرا رقمية ميرورليس بدقة 4K','إلكترونيات ومجوهرات',3400,'camera',6,'مستشعر احترافي كامل بدقة 24.2 ميجابكسل مع تصوير فيديو سينمائي بدقة 4K ونظام تركيز بؤري فائق السرعة.'],
  ['محفظة بطاقات جلد طبيعي مع حماية RFID','إكسسوارات',160,'wallet',30,'محفظة نحيفة بحجم الجيب مصنوعة من جلد عالي الجودة ومزودة بشريحة أمان تمنع قراءة البطاقات عن بُعد.'],
  ['قميص قطني نخبوي بأزرار لؤلؤية','أزياء',260,'shirt',22,'منسوج من خيوط القطن المصري الفاخر 100% بنعومة لا تضاهى وتصميم رسمي جذاب للمناسبات الخاصة.'],
  ['قارورة ماء حرارية فاخرة مزدوجة','إكسسوارات',135,'bottle',40,'مصنوعة من الفولاذ المقاوم للصدأ بدرجة 316 لحفظ المشروبات باردة 24 ساعة وساخنة 12 ساعة مع ملمس مخملي.']
 ];
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

async function refresh(){await refreshGovernance();await refreshCommerce();await refreshDesigns();await refreshAppearance();await refreshBanners();products=await request('/products');if(user){dashboard=await request('/dashboard');user=dashboard.user;}render();await updateNotices();}
function navs(){if(!user)return[];if(user.role==='Support')return [['home','shield','الدعم الفني المباشر'],['account','user','حسابي']];return user.role==='Customer'?[['home','home','اكتشف'],['orders','box','طلباتي'],['cart','cart','السلة'],['account','user','حسابي']]:user.role==='Merchant'?[['home','grid','نظرة عامة'],['products','bag','المنتجات'],['orders','box','الطلبات'],['account','user','حسابي']]:user.role==='Courier'?[['home','truck','مهامي'],['history','clock','السجل'],['account','user','حسابي']]:[['home','grid','لوحة التحكم'],['orders','box','الطلبات'],['products','bag','المنتجات'],['staff','users','طاقم العمل'],['users','shield','الصلاحيات'],['audit','clock','سجل النشاط'],['account','user','حسابي']];}
function navHtml(mobile=false){return navs().map(([id,symbol,title])=>`<button data-action="navigate" data-id="${id}" class="${page===id?'active':''}">${icon(symbol,mobile?22:20)}<span>${title}</span>${id==='cart'&&cartCount()?`<b class="count">${cartCount()}</b>`:''}</button>`).join('');}

function render(){
 document.body.dataset.page = page;
 if(!user){renderAuth();return;}
 const current=navs().find(n=>n[0]===page)||navs()[0];
 $('#app').innerHTML=`<div id="announcement-banner" class="announcement-bar" hidden></div><aside class="sidebar"><div class="brand"><img src="icon.svg" alt="شعار المتجر"><div>${esc(storeAppearance.storeName)}<small style="color:var(--vip-gold);font-weight:bold">★ متجر رسمي معتمد</small></div></div><nav class="nav" aria-label="القائمة الرئيسية">${navHtml()}</nav><div class="sidebar-footer"><div class="panel" style="background:linear-gradient(135deg, rgba(6,78,59,0.08) 0%, rgba(212,175,55,0.12) 100%);border:1px solid rgba(212,175,55,0.3);padding:17px"><strong style="font-size:12px;color:var(--vip-emerald)">تجربة تسوق فاخرة واستثنائية</strong><p class="hint" style="margin-top:8px">منتجات حصرية بجودة فائقة وخدمة تسليم مباشرة على مدار الساعة.</p></div><div class="profile"><span class="avatar" style="border:2px solid var(--vip-gold)">${esc(user.name[0])}</span><div><strong>${esc(user.name)}</strong><small style="color:var(--vip-gold)">${roles[user.role]}</small></div></div><button class="btn ghost small" data-action="logout">${icon('logout',17)}تسجيل الخروج</button></div></aside><main class="content"><header class="topbar"><div><div class="eyebrow">${user.role==='Customer'?'مرحباً بك في عالم '+esc(storeAppearance.storeName)+' الفاخر':roles[user.role]+' / مساحة التحكم الرئيسية'}</div><div class="title">${current[2]} <small>· ${esc(user.name)}</small></div></div><div class="left"><button class="icon-btn" data-action="instant-refresh" title="تحديث المتجر والبيانات فوراً" aria-label="تحديث">${icon('refresh',18)}</button><button class="icon-btn" data-action="notices" aria-label="الإشعارات">${icon('bell')}<small class="notice-count"></small></button>${pill('متجر رسمي معتمد','shield')}<button class="icon-btn" data-action="navigate" data-id="${user.role==='Customer'?'cart':'orders'}" aria-label="${user.role==='Customer'?'فتح السلة':'عرض الطلبات'}">${icon(user.role==='Customer'?'cart':'box')}</button><span class="avatar">${esc(user.name[0])}</span></div></header>${demo?`<div class="demo-bar" style="background:#fff9ea;border-color:#f5dc99"><span>⭐ الحساب الرئيسي للمتجر: <b>Ahmed</b> (الرمز: <b>583192</b>)</span><button data-action="switch-role">تبديل الواجهة</button><button data-action="appearance">🎨 مظهر المتجر واللوجو</button><button data-action="banners-manager">📢 إدارة الإعلانات</button><button data-action="connect">ربط المتجر</button></div>`:''}<section id="view"></section></main><nav class="mobile-nav" aria-label="تنقل التطبيق">${navHtml(true)}</nav>`;
 paintAppearance();
 const view=$('#view');
 if(page==='home')view.innerHTML=user.role==='Support'?supportHome():user.role==='Customer'?shop():user.role==='Courier'?courier(false):overview();
 else if(page==='products')view.innerHTML=productManagement();
 else if(page==='orders')view.innerHTML=ordersView();
 else if(page==='history')view.innerHTML=courier(true);
 else if(page==='cart')view.innerHTML=cartView();
 else if(page==='staff')view.innerHTML=staffPageView();
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
    <button class="vip-btn-add" data-action="${manage?'edit-product':'add'}" data-id="${esc(p.id)}" aria-label="${manage?'تعديل المنتج':'إضافة إلى السلة'}" title="${manage?'تعديل المنتج':'إضافة إلى السلة'}">
     ${icon(manage?'edit':'plus',18)}
    </button>
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
    ${ads.map((_, i) => `<span class="ad-dot ${i === (currentLoginAdIndex % ads.length) ? 'active' : ''}" onclick="switchLoginAd(${i})"></span>`).join('')}
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


function shop(){
 const cats=['الكل',...new Set(products.map(p=>p.category))];
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
function overview(){const os=dashboard.orders,active=os.filter(o=>!['Delivered','Cancelled'].includes(o.status)),complete=os.filter(o=>o.status==='Delivered'),sales=complete.reduce((n,o)=>n+o.total,0);return `<div class="section-head"><div><h1>${user.role==='Admin'?'إدارة المتجر والعمليات':'مساحة الشريك التجاري الفاخرة'}</h1><p>تحكم فوري في المنتجات والمبيعات والطلبيات وإعلانات المتجر وطاقم العمل.</p></div><div class="inline"><button class="btn secondary" data-action="appearance">🎨 مظهر المتجر واللوجو</button><button class="btn secondary" data-action="banners-manager">📢 إدارة الإعلانات</button><button class="btn" data-action="edit-product">${icon('plus',17)}إضافة منتج فاخر</button></div></div><div class="stats">${stat('الطلبات المكتملة',complete.length,'طلبيات سُلمت للعملاء بنجاح','check',true)}${stat('الطلبات الجارية',active.length,'قيد التجهيز والتوصيل السريع','box')}${stat('إجمالي المبيعات المكتملة',salesByCurrency(complete),user.role==='Admin'?'إجمالي صافي المبيعات':'قيمة بنود متجرك','chart')}${stat('طاقم وعمال المتجر',dashboard.staff?.length||0,'موظفون مسجلون في المنظومة','users')}</div><div class="dashboard-grid"><div><div class="section-head"><h2>أحدث الطلبيات المعتمدة</h2><button class="btn small ghost" data-action="navigate" data-id="orders">عرض الكل</button></div><div class="order-list">${os.slice(0,3).map(orderCard).join('')||empty('طلباتك الجديدة ستظهر هنا')}</div></div><div class="panel"><h3>حالة الطلبيات والتشغيل</h3><div class="chart">${['Preparing','Ready','Assigned','OnWay','Delivered'].map(s=>{const count=os.filter(o=>o.status===s).length;return `<div class="bar" style="height:${Math.max(8,count/Math.max(os.length,1)*100)}%" title="${statuses[s]}: ${count}"><span>${statuses[s]}</span></div>`;}).join('')}</div><p class="report-note">لوحة قياس فورية للطلبات المعتمدة. تُحتسب قيمة الطلبيات المسلّمة فقط.</p><div class="spacer"></div>${pill('منظومة تشغيل آمنة ومعتمدة','shield')}</div></div>`;}
function timeline(o){const steps=['Preparing','Ready','Assigned','OnWay','Delivered'];const index=steps.indexOf(o.status);return `<div class="timeline">${steps.map((s,i)=>`<span class="step ${i<=index?'done':''}">${statuses[s]}</span>`).join('')}</div>`;}
function orderCard(o){const prep=has('orders.prepare')&&o.status==='Preparing'&&!o.readyMerchants?.includes(user.id);return `<article class="order"><div class="order-top"><div><div class="order-code">${esc(o.number)}</div><small style="font-size:10px">${date(o.createdAt)}</small></div><span class="badge ${esc(o.status)}">${statuses[o.status]}</span></div><div class="order-items">${o.lines.map(l=>`${esc(l.name)} <b>× ${l.qty}</b>`).join(' · ')}</div>${user.role==='Customer'?timeline(o):`<div class="order-meta">${esc(o.customerName)}${user.role!=='Merchant'?'<br>'+esc(o.address)+'<br>'+esc(o.phone):''}</div>`}${commissionOrderLine(o)}${o.pin&&user.role==='Customer'&&!['Delivered','Cancelled'].includes(o.status)?`<div class="pin">رمز تأكيد الاستلام السري: <strong>${esc(o.pin)}</strong></div><p class="hint">سلّم هذا الرمز لمندوب التوصيل عند استلام طلبيتك وفحصها فقط.</p>`:''}<div class="order-bottom">${amount(o.total,o.currency||'SAR')}<div class="order-actions">${paymentOrderButton(o)}${o.courierId&&has('chat.read')&&has('chat.delivery')&&['Customer','Courier','Admin'].includes(user.role)?`<button class="btn small secondary" style="background:#075e54;color:white" data-action="order-chat" data-id="${esc(o.id)}">💬 دردشة WhatsApp مع المندوب</button>`:''}${user.role!=='Merchant'?`<button class="btn small secondary" data-action="track-order" data-id="${esc(o.id)}">📍 تتبع Google Maps</button>`:''}${prep?`<button class="btn small" data-action="order-ready" data-id="${esc(o.id)}">تم التجهيز ${icon('check',14)}</button>`:''}${has('delivery.assign')&&['Ready','Assigned'].includes(o.status)?`<button class="btn small" data-action="assign" data-id="${esc(o.id)}">إسناد مندوب</button>`:''}${has('delivery.update')&&o.status==='Assigned'?`<button class="btn small" data-action="order-pickup" data-id="${esc(o.id)}">استلام الشحنة</button>`:''}${has('delivery.update')&&o.status==='OnWay'?`<button class="btn small" data-action="deliver" data-id="${esc(o.id)}">تأكيد التسليم</button>`:''}${(has('orders.cancel')||has('orders.manage'))&&['Preparing','Ready'].includes(o.status)?`<button class="btn small danger" data-action="cancel-order" data-id="${esc(o.id)}">إلغاء الطلب</button>`:''}</div></div></article>`;}
function ordersView(){return `<div class="section-head"><div><h1>${user.role==='Customer'?'طلبياتك، خطوة بخطوة.':'إدارة الطلبيات والشحنات'}</h1><p>متابعة وتحديث حالة الشحنات لحظة بلحظة</p></div>${pill(dashboard.orders.length+' طلب','box')}</div><div class="order-list">${dashboard.orders.map(orderCard).join('')||empty('لا توجد طلبات بعد','ابدأ التسوق لتجرب طلبك الأول')}</div>`;}
function courier(history){const os=dashboard.orders.filter(o=>history?['Delivered','Cancelled'].includes(o.status):!['Delivered','Cancelled'].includes(o.status));return `<div class="section-head"><div><h1>${history?'سجل التوصيل والشحنات':'مهام التوصيل المباشرة'}</h1><p>${history?'جميع المهمات التي تم تسليمها بنجاح':'المهمات المسندة إليك الآن. استلم الشحنة، ابدأ الملاحة، وأكّد التسليم.'}</p></div>${pill('مندوب التوصيل السريع','truck')}</div><div class="stats">${stat('شحنات جارية',dashboard.orders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length,'بانتظار وصولك للعميل','truck',true)}${stat('شحنات مسلّمة',dashboard.orders.filter(o=>o.status==='Delivered').length,'تم تسليمها للعملاء','check')}</div><div class="order-list">${os.map(orderCard).join('')||empty('لا توجد مهام حالياً','ستظهر هنا الشحنات فور إسنادها لك من الإدارة','truck')}</div>`;}
function productManagement(){return `<div class="section-head"><div><h1>كتالوج المنتجات الفاخرة.</h1><p>أضف الصور الحقيقية والتفاصيل والسعر، وتابع المخزون المتاح.</p></div>${has('products.write')?`<button class="btn" data-action="edit-product">${icon('plus',17)}إضافة منتج جديد</button>`:''}</div><div class="products">${dashboard.products.map(p=>productCard(p,true)).join('')}</div>${dashboard.products.length?'':empty('ابدأ بمنتجك الأول','منتجاتك الجديدة ستظهر للعملاء بعد إضافتها')}</div>`;}

function cartView(){
 const lines=Object.entries(cart).map(([id,qty])=>({p:products.find(p=>p.id===id),qty})).filter(l=>l.p);
 const subtotal=lines.reduce((n,l)=>n+l.p.price*l.qty,0);
 return `<div class="section-head"><div><h1>حقيبة المشتريات</h1><p>${cartCount()} قطع فاخرة في انتظارك</p></div>${pill('دفع وتسليم آمن','shield')}</div>${!lines.length?empty('حقيبة التسوق فارغة حالياً','اكتشف مجموعتنا الحصرية وأضف اختياراتك المفضلة','cart'):`<div class="cart-layout"><div class="panel">${lines.map(({p,qty})=>{
  const realImg = p.image || defaultRealImages[p.icon] || '';
  return `<div class="cart-item"><div class="mini-art">${realImg ? `<img src="${esc(realImg)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : art(p.icon)}</div><div style="flex:1"><h3>${esc(p.name)}</h3>${amount(p.price)}<div class="spacer"></div><div class="qty"><button data-action="qty-minus" data-id="${esc(p.id)}" aria-label="تقليل الكمية">−</button><span>${qty}</span><button data-action="add" data-id="${esc(p.id)}" aria-label="زيادة الكمية">+</button></div></div><button class="icon-btn" data-action="remove-cart" data-id="${esc(p.id)}" aria-label="إزالة المنتج">${icon('close',15)}</button></div>`;
 }).join('')}</div><div class="panel"><h2>ملخص الطلب الفاخر</h2><div class="spacer"></div><div class="bill-line"><span>مجموع المنتجات</span><b>${money(subtotal)} ${currencyLabel(commerce.currency)}</b></div><div class="bill-line"><span>رسوم التوصيل السريع</span><b>${money(commerce.deliveryFee)} ${currencyLabel(commerce.currency)}</b></div>${commissionCartLine(subtotal)}<div class="bill-line total"><span>الإجمالي النهائي</span><span style="color:var(--vip-emerald)">${money(subtotal+commerce.deliveryFee+customerFee(subtotal))} ${currencyLabel(commerce.currency)}</span></div><div class="spacer"></div><form class="form" data-form="checkout"><label>عنوان التوصيل الدقيق<textarea name="address" minlength="8" maxlength="500" required placeholder="المدينة، الحي، اسم الشارع، رقم المبنى"></textarea></label><div class="panel" style="padding:12px;background:#f8fafd"><button type="button" class="btn secondary full" data-action="checkout-map">📍 تحديد موقع التسليم بدقة على Google Maps</button><small id="destination-label" style="display:block;margin-top:6px;text-align:center">${checkoutDestination?'تم حفظ نقطة التسليم بنجاح':'اختياري: اضغط لتحديد باب المبنى عبر الخريطة'}</small></div><label>رقم التواصل مع العميل<input name="phone" type="tel" minlength="8" maxlength="20" required placeholder="05xxxxxxxx" dir="ltr"></label>${checkoutPaymentFields()}<button class="btn full" style="background:var(--vip-gold-gradient);color:#0a1a12;font-weight:bold" type="submit">تأكيد الطلب الفاخر ${icon('arrow',17)}</button><div class="form-error" hidden></div></form></div></div>`}`;
}

function staffPageView(){
 if(user.role!=='Admin')return empty('هذه الصفحة مخصصة لإدارة المتجر');
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
 if(user.role!=='Admin')return empty('هذه الصفحة مخصصة لإدارة المتجر');
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
     
     <div class="inline" style="gap:8px">
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

function accountView(){return `<div class="section-head"><div><h1>حسابك في المتجر</h1><p>تفاصيل الحساب، وإدارة المظهر، والإعلانات، وطاقم العمل</p></div></div><div class="panel stack" style="max-width:650px"><div class="inline"><span class="avatar" style="border:2px solid var(--vip-gold)">${esc(user.name[0])}</span><div><h2>${esc(user.name)}</h2><p class="hint" style="color:var(--vip-emerald);font-weight:bold">${roles[user.role]||user.role} · ${esc(user.email)}</p></div></div><button class="btn secondary" data-action="edit-profile">✏️ تعديل اسم المستخدم وكلمة المرور</button>${has('appearance.manage')?'<button class="btn" style="background:var(--vip-gold-gradient);color:#081c13;font-weight:bold" data-action="appearance">🎨 شاشة تعديل شكل المتجر والأيقونة والاسم</button><button class="btn secondary" data-action="banners-manager">📢 إدارة الإعلانات وبانرات العروض</button>':''}${has('users.manage')?'<button class="btn secondary" data-action="staff-manager">👥 إدارة عمال المتجر تفصيلياً</button><button class="btn" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold" data-action="registration-fields">📋 تخصيص نموذج تسجيل المستخدمين الجدد (الأهم والخيارات)</button>':''}${has('commissions.manage')?'<button class="btn secondary" data-action="commissions">العمولات والأسعار</button>':''}${has('policies.manage')?'<button class="btn secondary" data-action="policy-editor">الاتفاقيات وشروط المتجر وحذف الحساب</button>':''}${has('registrations.manage')?'<button class="btn secondary" data-action="registrations">لوحة تسجيل العملاء والتجار والمناديب</button>':''}<button class="btn secondary" data-action="store-policies">اتفاقية التسجيل وشروط المتجر</button>${has('commerce.manage')?'<button class="btn secondary" data-action="commerce-settings">العملات واللغة وطرق الدفع</button>':''}${has('payments.review')?'<button class="btn secondary" data-action="payment-reviews">مراجعة الدفع والإيصالات</button>':''}<button class="btn secondary" data-action="install-app">📱 تثبيت التطبيق (آيفون / أندرويد)</button><button class="btn secondary" data-action="language">تغيير اللغة / Language</button><button class="btn secondary" data-action="device-permissions">أذونات الكاميرا والمايك والموقع</button><button class="btn" style="background:var(--vip-gold-gradient);color:#031711;font-weight:bold" data-action="notification-style">🔔 تخصيص نغمات وشكل إشعارات التطبيق</button><button class="btn secondary" data-action="enable-notifications">📲 اختبار إشعار فوري على شاشة الجوال</button>${has('appearance.manage')?'<button class="btn secondary" data-action="interface-design">تصميم الشاشات المتقدم</button>':''}${has('notifications.send')?'<button class="btn secondary" data-action="compose-notice">إرسال إشعارات</button>':''}<button class="btn secondary" data-action="notices">الإشعارات الواردة <span class="notice-count"></span></button><button class="btn secondary" data-action="support">مركز الدعم الفني المباشر</button><button class="btn ghost" data-action="privacy">الخصوصية وحذف الحساب</button><button class="btn secondary" data-action="connect">إعداد اتصال المتجر</button>${demo?'<button class="btn secondary" data-action="switch-role">استعراض واجهة أخرى</button>':''}<button class="btn ghost" data-action="logout">تسجيل الخروج</button>${user.role!=='Admin'?'<button class="btn danger" data-action="delete-account">طلب حذف حسابي</button>':''}<p class="hint">الإصدار 1.8.0 · المتجر المطور (iOS & Android)</p></div>`;}

/* ========================================================
    Dedicated Final Login Screen (شاشة الدخول النهائية )
   ======================================================== */

/* ==========================================================================
   DYNAMIC REGISTRATION FIELDS MANAGER (نظام إدارة وتخصيص حقول التسجيل من الإدارة)
   ========================================================================== */
let customRegFields = [
 { id: 'name', label: 'الاسم الكامل', type: 'text', required: true, enabled: true, placeholder: 'أدخل اسمك الكريم', isSystem: true },
 { id: 'email', label: 'اسم المستخدم أو البريد الإلكتروني', type: 'text', required: true, enabled: true, placeholder: 'you@example.com أو اسم المستخدم', isSystem: true },
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
  { id: 'name', label: 'الاسم الكامل', type: 'text', required: true, enabled: true, placeholder: 'أدخل اسمك الكريم', isSystem: true },
  { id: 'email', label: 'اسم المستخدم أو البريد الإلكتروني', type: 'text', required: true, enabled: true, placeholder: 'you@example.com أو اسم المستخدم', isSystem: true },
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
      <input class="vip-input" name="email" type="text" maxlength="200" required autocomplete="username" dir="ltr" placeholder="أدخل اسم المستخدم أو البريد">
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
     <label>اسم المستخدم أو البريد الإلكتروني أو رقم الجوال</label>
     <div class="input-wrapper">
      <span class="input-icon">
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </span>
      <input class="vip-input" name="emailOrUsername" type="text" maxlength="200" required autocomplete="username" dir="ltr" placeholder="أدخل اسم المستخدم أو البريد أو الجوال">
     </div>
    </div>
    <button class="vip-btn-login" type="submit">
     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m14 6-6 6 6 6M8 12h13"/></svg>
     <span>إرسال طلب الاستعادة للإدارة</span>
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
  <label>القسم<input name="category" value="${esc(p.category)}" required minlength="2" maxlength="50"></label>
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
function newUser(){modal('إضافة عضو للفريق',`<form class="form" data-form="new-user"><label>الاسم<input name="name" required minlength="2" maxlength="80"></label><label>البريد الإلكتروني<input name="email" type="email" required dir="ltr"></label><label>كلمة مرور أولية<input name="password" type="password" required minlength="6" maxlength="128" autocomplete="new-password"></label><label>الدور<select name="role">${Object.entries(roles).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><button class="btn full">إنشاء المستخدم</button><div class="form-error" hidden></div></form>`);}
function connect(){modal('الاتصال بمتجر التسوق',`<p class="hint">تُضبط هذه الخطوة بواسطة إدارة المتجر. يتطلب التشغيل الفعلي رابط خادم المتجر الآمن.</p><div class="spacer"></div><form class="form" data-form="connect"><label>رابط المتجر<input name="url" type="url" dir="ltr" placeholder="https://store.example.com" value="${esc(apiBase)}" required></label><button class="btn full">اتصال</button><div class="form-error" hidden></div></form>`);}
function privacy(){modal('الخصوصية وحذف الحساب',`<div class="stack hint"><h3>بياناتك في المتجر</h3><p>المتجر يلتزم بأعلى معايير الخصوصية والأمان وحماية بيانات البطاقات والشحنات المشفرة.</p><button class="btn full" data-action="close">فهمت</button></div>`);}

async function action(name,id){
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
 if(name==='navigate'){page=id;render();window.scrollTo(0,0);return;}
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
  await action(act,id);
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
  if(kind==='register'){
   if(!apiBase){
    const d=demoData();
    const email=(f.email||'').trim().toLowerCase();
    if(d.users.some(u=>u.email.toLowerCase()===email))throw new Error('البريد مسجل بالفعل');
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
    await request('/auth/register','POST',f);
   }
   renderAuth('login');
   modal('تم إنشاء الحساب بنجاح',`<div class="stack"><div class="ticket-card" style="background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4)"><strong>حسابك مجمد حالياً وبانتظار التنشيط</strong><p class="hint">تم تسجيل حسابك بنجاح وهو حالياً قيد المراجعة. تم إرسال إشعار تنبيه إلى إدارة المتجر لتنشيط الحساب، وستتمكن من الدخول فور اعتماده.</p></div><button class="btn full" data-action="close">فهمت</button></div>`);
   return;
  }
  if(kind==='forgot-password'){
   const q=(f.emailOrUsername||'').trim();
   if(!q)throw new Error('أدخل اسم المستخدم أو البريد الإلكتروني');
   if(!apiBase){
    const d=demoData();
    if(!d.notices) d.notices=[];
    d.notices.unshift({
     id:'not_'+Date.now(),
     title:'⚠️ طلب استعادة / نسيان كلمة المرور',
     message:`طلب المستخدم أو العميل (${q}) إعادة تعيين كلمة المرور الخاصة بحسابه.`,
     at:new Date().toISOString(),
     read:false
    });
    saveDemoData(d);
   } else {
    await request('/auth/forgot-password','POST',{emailOrUsername:q});
   }
   renderAuth('login');
   modal('طلب استعادة كلمة المرور',`<div class="stack"><div class="ticket-card" style="background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4)"><strong>تم إرسال طلبك إلى الإدارة بنجاح</strong><p class="hint">تم إرسال إشعار تنبيه للإدارة بطلب استعادة كلمة المرور للمستخدم (${esc(q)}). سيتم مراجعة الطلب والتواصل معك.</p></div><button class="btn full" data-action="close">حسناً</button></div>`);
   return;
  }
  if(kind==='login'||kind==='setup'){const result=await request(kind==='setup'?'/setup':'/auth/'+kind,'POST',f);token=result.token;user=result.user;sessionStorage.setItem('ts-token',token);page='home';setupNeeded=false;await refresh();}
  if(kind==='connect'){const url=new URL(f.url);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('استخدم رابط HTTPS آمنًا');const next=url.origin;const res=await fetch(next+'/api/health');if(!res.ok||(await res.json()).status!=='ok')throw new Error('هذا الرابط ليس خادم المتجر');apiBase=next;localStorage.setItem('ts-server',apiBase);demo=false;sessionStorage.removeItem('ts-demo');sessionStorage.removeItem('ts-demo-user');token='';user=null;sessionStorage.removeItem('ts-token');setupNeeded=(await request('/setup')).required;closeModal();renderAuth();}
  if(kind==='checkout'){const result=await request('/orders','POST',{items:Object.entries(cart).map(([productId,qty])=>({productId,qty})),address:f.address,phone:f.phone,destination:checkoutDestination,paymentMethodId:f.paymentMethodId||'cod',currency:commerce.currency,commissionVersion:governance.commissions.version});checkoutDestination=null;cart={};saveCart();page='orders';await refresh();toast('تأكد طلبك الفاخر رقم '+result.number);if(result.paymentType&&result.paymentType!=='Cash')await paymentOrder(result.id);}
  if(kind==='product'){await request('/products'+(id?'/'+id:''),id?'PUT':'POST',{...f,price:Number(f.price),stock:Number(f.stock),active:f.active==='on'});closeModal();await refresh();toast('تم حفظ المنتج بنجاح');}
  if(kind==='new-user'){await request('/users','POST',f);closeModal();await refresh();toast('تم إنشاء المستخدم');}
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
 checkAndPromptInitialPermissions();
 if('serviceWorker' in navigator && !isNativeWrapper() && (location.protocol==='https:' || ['localhost','127.0.0.1'].includes(location.hostname))){
  
  navigator.serviceWorker.register('sw.js').then(reg => {
   // فحص التحديثات البرمجية الجديدة للمتجر تلقائياً في الخلفية
   setInterval(() => { reg.update().catch(()=>{}); }, 45000);
  }).catch(()=>{});

 }
 try{config=await(await fetch('config.json')).json();apiBase=apiBase||config.apiBaseUrl||(!isNativeWrapper()?location.origin:'');
  await refreshGovernance();await refreshCommerce();await refreshDesigns();await refreshAppearance();await refreshBanners();
  if(new URLSearchParams(location.search).get('demo')==='1'){demo=true;sessionStorage.setItem('ts-demo','true');}
  if(demo){const id=sessionStorage.getItem('ts-demo-user');const u=demoData().users.find(u=>u.id===id&&u.active);if(u){user=demoUser(u);await refresh();}else renderAuth();}
  else if(!apiBase){renderAuth();}else if(token){try{user=await request('/me');await refresh();}catch{user=null;renderAuth();}}
  else{setupNeeded=(await request('/setup')).required;renderAuth();}
 }catch(err){renderAuth();}
}
init();
