const chatRightKeys=['chat.read','chat.delivery','chat.support','chat.text','chat.image','chat.audio','chat.camera'];
const designScreens={'All':'🌟 جميع الشاشات والتطبيق بالكامل','Login':'شاشة الدخول','Customer.home':'العميل · المنتجات','Customer.orders':'العميل · الطلبات','Customer.cart':'العميل · السلة','Customer.account':'العميل · حسابي','Merchant.home':'التاجر · الرئيسية','Merchant.products':'التاجر · المنتجات','Merchant.orders':'التاجر · الطلبات','Merchant.account':'التاجر · الحساب','Courier.home':'المندوب · المهام','Courier.history':'المندوب · السجل','Courier.account':'المندوب · الحساب','Support.home':'الدعم · الرئيسية','Support.account':'الدعم · الحساب','Admin.home':'الإدارة · الرئيسية','Admin.orders':'الإدارة · الطلبات','Admin.products':'الإدارة · المنتجات','Admin.users':'الإدارة · الصلاحيات','Admin.audit':'الإدارة · سجل النشاط','Admin.account':'الإدارة · الحساب'};
const designDefaults={title:'',subtitle:'',primary:'',background:'',ink:'',font:'Inherit',image:'',backgroundImage:'',backgroundOpacity:0.78,glassBlur:16,layout:'Standard',columns:2,radius:16};
const curatedWallpapers = [
 { cat:'فخامة وبوتيك', name:'بوتيك فاخر', url:'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&auto=format&fit=crop&q=80' },
 { cat:'فخامة وبوتيك', name:'قاعة ملكية', url:'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1600&auto=format&fit=crop&q=80' },
 { cat:'فخامة وبوتيك', name:'فندق فاخر', url:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&auto=format&fit=crop&q=80' },
 { cat:'فخامة وبوتيك', name:'صالة عرض', url:'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80' },
 { cat:'فخامة وبوتيك', name:'هدايا وتغليف', url:'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1600&auto=format&fit=crop&q=80' },
 { cat:'فخامة وبوتيك', name:'ديكور عصري', url:'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1600&auto=format&fit=crop&q=80' },
 { cat:'فخامة وبوتيك', name:'مكتب أعمال', url:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&auto=format&fit=crop&q=80' },
 { cat:'ذهب ورخام', name:'رخام وذهب', url:'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&auto=format&fit=crop&q=80' },
 { cat:'ذهب ورخام', name:'رخام أسود', url:'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1600&auto=format&fit=crop&q=80' },
 { cat:'ذهب ورخام', name:'أمواج ذهبية', url:'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&auto=format&fit=crop&q=80' },
 { cat:'ذهب ورخام', name:'إضاءة ذهبية', url:'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1600&auto=format&fit=crop&q=80' },
 { cat:'ذهب ورخام', name:'بريق ذهبي', url:'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80' },
 { cat:'ذهب ورخام', name:'معدن مصقول', url:'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1600&auto=format&fit=crop&q=80' },
 { cat:'ذهب ورخام', name:'خطوط ذهبية', url:'https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&auto=format&fit=crop&q=80' },
 { cat:'أزياء وعطور', name:'مجوهرات ذهبية', url:'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&auto=format&fit=crop&q=80' },
 { cat:'أزياء وعطور', name:'ساعات فاخرة', url:'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=1600&auto=format&fit=crop&q=80' },
 { cat:'أزياء وعطور', name:'عطور ملكية', url:'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&auto=format&fit=crop&q=80' },
 { cat:'أزياء وعطور', name:'أزياء راقية', url:'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80' },
 { cat:'أزياء وعطور', name:'أناقة كلاسيكية', url:'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&auto=format&fit=crop&q=80' },
 { cat:'أزياء وعطور', name:'حقائب فاخرة', url:'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1600&auto=format&fit=crop&q=80' },
 { cat:'أزياء وعطور', name:'أحذية رياضية', url:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&auto=format&fit=crop&q=80' },
 { cat:'طبيعة وزمرد', name:'زمرد ليلي', url:'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1600&auto=format&fit=crop&q=80' },
 { cat:'طبيعة وزمرد', name:'سماء ليلية', url:'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80' },
 { cat:'طبيعة وزمرد', name:'غابة زمردية', url:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&auto=format&fit=crop&q=80' },
 { cat:'طبيعة وزمرد', name:'صحراء ذهبية', url:'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1600&auto=format&fit=crop&q=80' },
 { cat:'طبيعة وزمرد', name:'بحر هادئ', url:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80' },
 { cat:'طبيعة وزمرد', name:'جبال الضباب', url:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&auto=format&fit=crop&q=80' },
 { cat:'طبيعة وزمرد', name:'شفق قطبي', url:'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1600&auto=format&fit=crop&q=80' },
 { cat:'طبيعة وزمرد', name:'شلال استوائي', url:'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'أبراج حديثة', url:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'أضواء المدينة', url:'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'تقنية وابتكار', url:'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'إلكترونيات', url:'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'قهوة ومزاج', url:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'نيون ليلي', url:'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'أفق دبي', url:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'معمار هندسي', url:'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'فضاء عميق', url:'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'لوحة فنية', url:'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'زجاج ملون', url:'https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'ليزر ذهبي', url:'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80' },
 { cat:'مدن وتقنية', name:'موجات زرقاء', url:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80' },
 { cat:'قصور ملكية وVIP', name:'قصر ملكي مذهّب', url:'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1600&auto=format&fit=crop&q=80' },
 { cat:'قصور ملكية وVIP', name:'ثريا كريستال فاخرة', url:'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&auto=format&fit=crop&q=80' },
 { cat:'قصور ملكية وVIP', name:'ردهة رخامية ذهبية', url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&auto=format&fit=crop&q=80' },
 { cat:'قصور ملكية وVIP', name:'مخمل أخضر ملكي', url:'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=1600&auto=format&fit=crop&q=80' },
 { cat:'قصور ملكية وVIP', name:'مخمل كحلي فاخر', url:'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=1600&auto=format&fit=crop&q=80' },
 { cat:'قصور ملكية وVIP', name:'جناح إمبراطوري', url:'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1600&auto=format&fit=crop&q=80' },
 { cat:'قصور ملكية وVIP', name:'تحف ومجوهرات ملكية', url:'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1600&auto=format&fit=crop&q=80' },
 { cat:'قصور ملكية وVIP', name:'سجاد فارسي فاخر', url:'https://images.unsplash.com/photo-1600166898405-da9535204843?w=1600&auto=format&fit=crop&q=80' },
 { cat:'قصور ملكية وVIP', name:'بوابة قصر أندلسي', url:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1600&auto=format&fit=crop&q=80' },
 { cat:'قصور ملكية وVIP', name:'قاعة ألماسية', url:'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&auto=format&fit=crop&q=80' },
 { cat:'نيون وثلاثي الأبعاد', name:'أمواج زمردية 3D', url:'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80' },
 { cat:'نيون وثلاثي الأبعاد', name:'كرات الذهب السائل', url:'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1600&auto=format&fit=crop&q=80' },
 { cat:'نيون وثلاثي الأبعاد', name:'شبكة الكريستال المضيئة', url:'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=1600&auto=format&fit=crop&q=80' },
 { cat:'نيون وثلاثي الأبعاد', name:'تدرج السايبر الفاخر', url:'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1600&auto=format&fit=crop&q=80' },
 { cat:'نيون وثلاثي الأبعاد', name:'ألياف ضوئية ذهبية', url:'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80' },
 { cat:'نيون وثلاثي الأبعاد', name:'هندسة سوداء وذهبية', url:'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80' },
 { cat:'نيون وثلاثي الأبعاد', name:'مجرة الزمرد والذهب', url:'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80' },
 { cat:'نيون وثلاثي الأبعاد', name:'انعكاس الحرير الأسود', url:'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1600&auto=format&fit=crop&q=80' }
];
let interfaceDesigns={},designImage='',designBgImage='',designImageLoading=false,chatState=null;
async function refreshDesigns(){try{const _d=await request('/designs');if(_d&&typeof _d==='object')interfaceDesigns=_d;}catch{}}
function paintInterface(){
 const key=user?user.role+'.'+page:'Login';
 const d=interfaceDesigns[key]||interfaceDesigns['All'];
 const r=document.documentElement;
 if(d){
  if(d.primary)r.style.setProperty('--green',d.primary);
  if(d.font&&d.font!=='Inherit')r.style.fontFamily=storeFonts[d.font]||storeFonts.Tahoma;
  if(d.backgroundImage){
   const op = typeof d.backgroundOpacity === 'number' ? d.backgroundOpacity : 0.78;
   document.body.style.setProperty('background-image', `linear-gradient(rgba(3, 23, 17, ${op}), rgba(2, 17, 13, ${Math.min(0.96, op + 0.08)})), url("${d.backgroundImage}")`, 'important');
   document.body.style.setProperty('background-size', 'cover', 'important');
   document.body.style.setProperty('background-position', 'center', 'important');
  } else {
   document.body.style.removeProperty('background-image');
  }
  r.style.setProperty('--vip-glass-blur', (d.glassBlur ?? 16) + 'px');
 } else {
  document.body.style.removeProperty('background-image');
 }
 const el=$('#view')||document.querySelector('.auth-form');if(!el||!d)return;
 el.dataset.designLayout=d.layout||'Standard';
 el.style.setProperty('--design-columns',d.columns||2);
 el.style.setProperty('--design-mobile-columns',Math.min(2,d.columns||2));
 el.style.setProperty('--design-radius',(d.radius??16)+'px');
 let banner=el.querySelector(':scope > .interface-banner');
 if(!d.title&&!d.subtitle&&!d.image){banner?.remove?.();return;}
 if(!banner){banner=document.createElement('section');banner.className='interface-banner';el.prepend(banner);}
 const sig=JSON.stringify({t:d.title,s:d.subtitle,i:d.image});
 if(banner.dataset.signature!==sig){banner.dataset.signature=sig;banner.innerHTML=`${d.image?`<img src="${esc(d.image)}" alt="صورة الواجهة">`:`''`}<div>${d.title?`<h2>${esc(d.title)}</h2>`:`''`}${d.subtitle?`<p>${esc(d.subtitle)}</p>`:`''`}</div>`;}
}

function interfaceDesignEditor(selectedKey='All'){
 const cur = { ...designDefaults, ...(interfaceDesigns[selectedKey] || {}) };
 designImage = cur.image || '';
 designBgImage = cur.backgroundImage || '';
 const cats = ['الكل', ...new Set(curatedWallpapers.map(w => w.cat))];
 const activeCat = window._activeWpCat || 'الكل';
 const filteredWps = activeCat === 'الكل' ? curatedWallpapers : curatedWallpapers.filter(w => w.cat === activeCat);

 modal('🎨 استوديو تصميم الشاشات المتقدم والخلفيات الملكية الفاخرة', `
 <form class="form" data-form="interface-design" style="max-height:78vh;overflow-y:auto;padding-left:4px">
  <div style="background:linear-gradient(135deg,rgba(212,175,55,0.16),rgba(6,78,59,0.5));border:1px solid rgba(212,175,55,0.45);padding:12px 14px;border-radius:14px;font-size:12.5px;color:#fef08a;line-height:1.7">
   ✨ <strong>التحكم الاحترافي الدقيق في كل شاشة:</strong> خصّص الخلفية الملكية، درجة الشفافية والزجاج، سمك ووهج الإطارات الذهبية، الأعمدة، والألوان لكل شاشة على حدة أو للتطبيق بالكامل.
  </div>

  <label>1. اختر الشاشة المراد تخصيص تصميمها
   <select name="key" id="design-screen-sel" style="font-weight:bold;color:#fef08a">
    ${Object.entries(designScreens).map(([k,v])=>`<option value="${k}" ${k===selectedKey?'selected':''}>${esc(v)}</option>`).join('')}
   </select>
  </label>

  <div class="row">
   <label>عنوان ترحيبي أعلى الشاشة<input name="title" maxlength="80" value="${esc(cur.title)}" placeholder="مثال: أهلاً بك في الجناح الملكي"></label>
   <label>وصف فرعي مختصر<input name="subtitle" maxlength="240" value="${esc(cur.subtitle)}" placeholder="مثال: تشكيلة حصرية مختارة بعناية"></label>
  </div>

  <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px">
   <label>نمط توزيع البطاقات
    <select name="layout">
     ${[['Standard','متوازن احترافي'],['Compact','مضغوط سريع'],['Spacious','ملكي واسع VIP']].map(([v,t])=>`<option value="${v}" ${cur.layout===v?'selected':''}>${t}</option>`).join('')}
    </select>
   </label>
   <label>نوع الخط للشاشة
    <select name="font">
     ${['Inherit','Tahoma','Arial','System','Serif'].map(f=>`<option value="${f}" ${cur.font===f?'selected':''}>${f==='Inherit'?'الخط الافتراضي للمتجر':f}</option>`).join('')}
    </select>
   </label>
   <label>عدد الأعمدة في الشبكة (1-4)
    <input name="columns" type="number" min="1" max="4" value="${cur.columns||2}">
   </label>
   <label>انحناء زوايا البطاقات (0-28px)
    <input name="radius" type="number" min="0" max="28" value="${cur.radius??16}">
   </label>
  </div>

  <div class="row" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">
   <label>درجة تعتيم الخلفية (${Math.round((cur.backgroundOpacity??0.78)*100)}%)
    <input name="backgroundOpacity" type="range" min="0.15" max="0.95" step="0.05" value="${cur.backgroundOpacity??0.78}">
   </label>
   <label>قوة التضبيب الزجاجي Blur (${cur.glassBlur??16}px)
    <input name="glassBlur" type="range" min="0" max="28" step="2" value="${cur.glassBlur??16}">
   </label>
   <label>اللون المميز للشاشة (اختياري)
    <input name="primary" type="color" value="${cur.primary || storeAppearance?.primary || '#087e66'}">
   </label>
  </div>

  <div class="panel" style="padding:12px">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
    <strong style="color:#fef08a;font-size:13.5px">🖼️ مكتبة الخلفيات الملكية والـ VIP (${curatedWallpapers.length} خلفية عالية الدقة):</strong>
    <span class="badge Ready" style="font-size:10.5px">${filteredWps.length} خلفية معروضة</span>
   </div>
   <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
    ${cats.map(c => `<button type="button" class="btn small ${activeCat===c?'':'ghost'}" style="font-size:11px;padding:4px 10px" onclick="window._activeWpCat='${esc(c)}';interfaceDesignEditor(document.getElementById('design-screen-sel')?.value||'${esc(selectedKey)}')">${esc(c)}</button>`).join('')}
   </div>
   <div class="design-gallery-grid" style="max-height:240px;overflow-y:auto;padding:4px">
    <button type="button" class="design-wp-item ${!designBgImage?'active':''}" data-action="pick-design-bg" data-id="">
     <div style="height:54px;display:grid;place-items:center;background:#031711;border-radius:8px;font-size:11px;color:#cbd5e1">بدون خلفية</div>
     <small>اللون الافتراضي</small>
    </button>
    ${filteredWps.map(w => `
     <button type="button" class="design-wp-item ${designBgImage===w.url?'active':''}" data-action="pick-design-bg" data-id="${esc(w.url)}">
      <img src="${esc(w.url)}" alt="${esc(w.name)}" loading="lazy" style="height:54px;object-fit:cover">
      <small>${esc(w.name)}</small>
     </button>`).join('')}
   </div>
   <div style="margin-top:10px;display:grid;gap:8px">
    <label>أو الصق رابط صورة خلفية مخصّصة مباشرة<input id="design-bg-url" name="backgroundImage" value="${esc(designBgImage)}" placeholder="https://..." dir="ltr"></label>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px;border-radius:12px;background:rgba(16,185,129,0.14);border:1px dashed #34d399">
     <label class="btn small" style="margin:0;cursor:pointer;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff">
      📱 رفع صورة خلفية مباشرة من الجوال / الاستوديو
      <input id="design-bg-file" type="file" accept="image/*" hidden>
     </label>
     <small style="color:#a7f3d0;font-size:11.5px">يدعم الصور عالية الدقة من استوديو الهاتف مباشرة</small>
    </div>
   </div>
  </div>
  <button class="btn full" type="submit">💾 حفظ وتطبيق التصميم المتقدم فوراً</button>
  <div class="form-error" hidden></div>
 </form>`);
 const sel = document.getElementById('design-screen-sel');
 if(sel) sel.onchange = () => interfaceDesignEditor(sel.value);
 const bgFile = document.getElementById('design-bg-file');
 if(bgFile) bgFile.onchange = async e => {
  const file = e.target.files?.[0]; if(!file) return;
  try {
   const dUrl = await normalizeImage(file, 1400, 2000000);
   designBgImage = dUrl;
   const uIn = document.getElementById('design-bg-url');
   if(uIn) uIn.value = dUrl;
   toast('تم تجهيز صورة الخلفية الشفافة بنجاح');
  } catch(err){ toast(err.message); }
 };
}
async function decodeImageSource(file){
 if(window.createImageBitmap){try{return await createImageBitmap(file);}catch{}}
 return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve({width:img.naturalWidth||img.width,height:img.naturalHeight||img.height,draw:(ctx,w,h)=>ctx.drawImage(img,0,0,w,h),close:()=>{}});};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('تعذرت قراءة الصورة'));};img.src=url;});
}
async function normalizeImage(file,width=1024,max=1450000){if(!file||!['image/png','image/jpeg','image/webp','image/heic','image/heif'].includes(file.type)&&!file.type.startsWith('image/')||file.size>8*1024*1024)throw new Error('اختر صورة PNG أو JPEG أو WebP حتى 8 ميجابايت');const source=await decodeImageSource(file);const factor=Math.min(1,width/Math.max(source.width,source.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(source.width*factor));canvas.height=Math.max(1,Math.round(source.height*factor));const ctx=canvas.getContext('2d');if(source.draw)source.draw(ctx,canvas.width,canvas.height);else ctx.drawImage(source,0,0,canvas.width,canvas.height);source.close?.();const data=canvas.toDataURL('image/png');if(data.length>max)throw new Error('اختر صورة أصغر أو أقل تفاصيل');return data;}

function stopDeviceCapture(){const s=chatState;if(!s)return;s.cancelRecording=true;if(s.recorder?.state==='recording')s.recorder.stop();s.wavStop?.();s.stream?.getTracks().forEach(t=>t.stop());s.stream=null;clearTimeout(s.recordTimeout);clearInterval(s.recordTicker);$('#chat-camera')?.replaceChildren();}
function stopChat(){const s=chatState;chatState=null;if(!s)return;clearInterval(s.poll);s.cancelRecording=true;if(s.recorder?.state==='recording')s.recorder.stop();s.wavStop?.();s.stream?.getTracks().forEach(t=>t.stop());clearTimeout(s.recordTimeout);clearInterval(s.recordTicker);for(const url of s.urls.values())URL.revokeObjectURL(url);}
document.getElementById('modal').addEventListener('close',stopChat);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDeviceCapture();});

async function openChat(channel,reference){
 await request('/chat/'+channel+'/'+reference);
 const isOrder=channel==='order';
 const title=isOrder?'دردشة الطلب والمندوب':'فريق الدعم الفني والمساعدة';
 const subtitle=isOrder?'متصل الآن · تواصل مباشر مع مندوب التوصيل':'متصل الآن · الرد المباشر لخدمة العملاء';
 
 modal(title,`<div class="wa-chat-container">
  <div class="wa-header">
   <div class="user-info">
    <div class="wa-avatar">${isOrder?'🚚':'💬'}</div>
    <div>
     <h3>${esc(title)}</h3>
     <small><span class="status-dot"></span> ${esc(subtitle)}</small>
    </div>
   </div>
   <div class="inline">
    <button class="wa-btn-icon" data-action="chat-refresh" title="تحديث الرسائل" style="color:white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></button>
   </div>
  </div>
  <div id="chat-messages" class="wa-messages" aria-live="polite"></div>
  <div id="chat-camera" style="padding:0 12px"></div>
  <div id="chat-pending" style="padding:0 12px"></div>
  <form class="wa-input-bar" data-form="chat-message">
   ${has('chat.image')?`<label class="wa-btn-icon" title="إرفاق صورة" style="cursor:pointer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg><input id="chat-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>`:''}
   ${has('chat.camera')?`<button type="button" class="wa-btn-icon" data-action="chat-camera" title="الكاميرا"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>`:''}
   <input class="wa-input" name="body" maxlength="2000" placeholder="اكتب رسالة..." autocomplete="off" ${has('chat.text')?'':'disabled'}>
   ${has('chat.audio')?`<button type="button" class="wa-btn-icon" data-action="chat-record" title="تسجيل صوتي"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg></button>`:''}
   <button class="wa-btn-send" type="submit" title="إرسال"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transform:scaleX(-1)"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>
   <div class="form-error" hidden></div>
  </form>
  <span id="chat-record-state" style="font-size:11px;color:#075e54;padding:4px 16px;text-align:center" role="status"></span>
 </div>`);
 
 const s=chatState={channel,reference,urls:new Map(),signature:'',attachment:null,stream:null,recorder:null,wavStop:null};
 if($('#chat-file'))$('#chat-file').onchange=async e=>{if(!e.target.files[0])return;try{const data=await normalizeImage(e.target.files[0]);if(chatState!==s)return;s.attachment={kind:'Image',data,mime:'image/png',camera:false};pendingChat();}catch(e){toast(e.message);}};
 await refreshChat();
 s.poll=setInterval(()=>{if(!document.hidden&&chatState===s)refreshChat().catch(e=>{stopChat();$('#chat-messages')?.replaceChildren();toast(e.message);});},3500);
}

async function refreshChat(){
 const s=chatState;if(!s)return;
 const messages=await request('/chat/'+s.channel+'/'+s.reference);if(chatState!==s)return;
 const sig=JSON.stringify(messages);if(sig===s.signature)return;s.signature=sig;s.messages=messages;
 const el=$('#chat-messages');if(!el)return;
 el.innerHTML=messages.map(m=>{
  const isMe=m.senderId===user.id;
  const timeStr=new Date(m.at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'});
  return `<div class="wa-bubble ${isMe?'outgoing':'incoming'}">
   ${!isMe?`<strong style="display:block;font-size:11px;color:#128c7e;margin-bottom:2px">${esc(m.senderName)}</strong>`:''}
   ${m.body?`<div style="white-space:pre-wrap">${esc(m.body)}</div>`:''}
   ${m.hasAttachment?`<div id="media-${esc(m.id)}" style="margin-top:4px"><button class="btn secondary small" style="border-radius:18px" data-action="chat-media" data-id="${esc(m.id)}">${m.kind==='Audio'?'▶ تشغيل التسجيل الصوتي ('+m.seconds+'ث)':'🖼️ عرض الصورة'}</button></div>`:''}
   <div class="wa-bubble-meta">
    <span>${timeStr}</span>
    ${isMe?`<span class="wa-ticks" title="تم التسليم والقراءة">✓✓</span>`:''}
   </div>
  </div>`;
 }).join('')||'<div style="text-align:center;color:#667781;font-size:12px;margin:auto;background:rgba(255,255,255,0.8);padding:8px 16px;border-radius:10px">قناة محادثة مشفرة وآمنة · ابدأ المراسلة الآن</div>';
 el.scrollTop=el.scrollHeight;
}

function pendingChat(){
 const s=chatState;if(!s)return;const a=s.attachment;
 $('#chat-pending').innerHTML=a?`<div style="display:flex;align-items:center;gap:12px;background:#111b21;color:#fef08a;border:1px solid rgba(212,175,55,0.4);padding:8px 12px;border-radius:10px;margin:8px 0">
  ${a.kind==='Image'?`<img src="${esc(a.data)}" style="width:50px;height:50px;object-fit:cover;border-radius:6px">`:`<span style="font-size:13px;color:#075e54">🎤 تسجيل صوتي جاهز (${a.seconds} ثانية)</span>`}
  <button type="button" class="btn small ghost" data-action="chat-discard">إلغاء المرفق</button>
 </div>`:'';
}

async function mediaChat(id){
 const s=chatState;if(!s)return;const m=s.messages.find(m=>m.id===id);if(!m)return;
 let url=s.urls.get(id);
 if(!url){
  let blob;
  if(demo){
   const msg=demoData().chatMessages.find(m=>m.id===id);
   const b64=msg.kind==='Image'?msg.data.split(',')[1]:msg.data;
   blob=new Blob([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],{type:msg.mime});
  }else{
   const r=await fetch(apiBase+'/api/chat/'+s.channel+'/'+s.reference+'/media/'+id,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
   if(!r.ok)throw new Error('المرفق غير متاح');
   blob=await r.blob();
  }
  if(chatState!==s)return;url=URL.createObjectURL(blob);s.urls.set(id,url);
 }
 const el=document.getElementById('media-'+id);if(!el)return;
 el.innerHTML=m.kind==='Audio'?`<audio controls playsinline preload="metadata" style="width:100%;height:38px;margin-top:4px" src="${url}"></audio>`:`<img class="wa-media-img" src="${url}" alt="صورة المرفق">`;
}

function encodeWavMono16k(buffers,sampleRate){
 const total=buffers.reduce((a,b)=>a+b.length,0);const merged=new Float32Array(total);let offset=0;for(const b of buffers){merged.set(b,offset);offset+=b.length;}
 const targetRate=16000,ratio=sampleRate/targetRate,outLength=Math.max(1,Math.floor(total/ratio));
 const wav=new ArrayBuffer(44+outLength*2),view=new DataView(wav);
 const writeStr=(pos,str)=>{for(let i=0;i<str.length;i++)view.setUint8(pos+i,str.charCodeAt(i));};
 writeStr(0,'RIFF');view.setUint32(4,36+outLength*2,true);writeStr(8,'WAVE');writeStr(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,targetRate,true);view.setUint32(28,targetRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);writeStr(36,'data');view.setUint32(40,outLength*2,true);
 for(let i=0;i<outLength;i++){const sample=Math.max(-1,Math.min(1,merged[Math.floor(i*ratio)]||0));view.setInt16(44+i*2,sample<0?sample*0x8000:sample*0x7FFF,true);}
 return new Uint8Array(wav);
}

async function recordChat(){
 const s=chatState;if(!s||!has('chat.audio'))throw new Error('التسجيل غير مسموح');
 if(s.stream)throw new Error('أوقف التسجيل أو الكاميرا أولًا');
 if(!navigator.mediaDevices?.getUserMedia)throw new Error('الجهاز لا يدعم التسجيل من هذه الواجهة');
 const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(chatState!==s){stream.getTracks().forEach(t=>t.stop());return;}
 const supportedMime=window.MediaRecorder?['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4;codecs=mp4a.40.2','audio/mp4'].find(m=>{try{return MediaRecorder.isTypeSupported(m);}catch{return false;}}):null;
 s.stream=stream;s.cancelRecording=false;const start=Date.now();
 if(supportedMime){
  const chunks=[];let size=0;const rec=s.recorder=new MediaRecorder(stream,{mimeType:supportedMime,audioBitsPerSecond:32000});
  rec.ondataavailable=e=>{if(e.data.size){size+=e.data.size;chunks.push(e.data);if(size>2100000&&rec.state==='recording'){s.cancelRecording=true;rec.stop();toast('التسجيل كبير جدًا');}}};
  rec.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());s.stream=null;clearTimeout(s.recordTimeout);clearInterval(s.recordTicker);if(chatState!==s||s.cancelRecording)return;const cleanMime=supportedMime.split(';')[0];const blob=new Blob(chunks,{type:cleanMime});const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));s.attachment={kind:'Audio',data:btoa(binary),mime:cleanMime,seconds:Math.min(60,Math.max(1,Math.round((Date.now()-start)/1000)))};$('#chat-record-state').textContent='اكتمل التسجيل الصوتي';pendingChat();};
  rec.start(1000);
 }else{
  const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx){stream.getTracks().forEach(t=>t.stop());s.stream=null;throw new Error('صيغة التسجيل غير مدعومة');}
  const ctx=new AudioCtx(),source=ctx.createMediaStreamSource(stream),proc=ctx.createScriptProcessor(4096,1,1),buffers=[];
  proc.onaudioprocess=e=>{if(!s.cancelRecording)buffers.push(new Float32Array(e.inputBuffer.getChannelData(0)));};
  source.connect(proc);proc.connect(ctx.destination);
  s.recorder={state:'recording',stop:()=>s.wavStop?.()};
  s.wavStop=()=>{if(s.recorder.state!=='recording')return;s.recorder.state='inactive';s.wavStop=null;proc.disconnect();source.disconnect();ctx.close().catch(()=>{});stream.getTracks().forEach(t=>t.stop());s.stream=null;clearTimeout(s.recordTimeout);clearInterval(s.recordTicker);if(chatState!==s||s.cancelRecording)return;const bytes=encodeWavMono16k(buffers,ctx.sampleRate||44100);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));s.attachment={kind:'Audio',data:btoa(binary),mime:'audio/wav',seconds:Math.min(60,Math.max(1,Math.round((Date.now()-start)/1000)))};$('#chat-record-state').textContent='اكتمل التسجيل الصوتي';pendingChat();};
 }
 $('#chat-record-state').textContent='🔴 جاري تسجيل رسالة صوتية (اضغط إيقاف عند الانتهاء)...';
 s.recordTicker=setInterval(()=>{if($('#chat-record-state'))$('#chat-record-state').textContent='🔴 جاري التسجيل · '+Math.floor((Date.now()-start)/1000)+' ثانية';},1000);
 s.recordTimeout=setTimeout(()=>{if(s.recorder?.state==='recording')s.recorder.stop();},60000);
}

async function cameraChat(){
 const s=chatState;if(!s||!has('chat.camera')||!has('chat.image'))throw new Error('التصوير غير مسموح');
 if(s.stream)throw new Error('أوقف التسجيل أو الكاميرا أولًا');
 const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
 if(chatState!==s){stream.getTracks().forEach(t=>t.stop());return;}
 s.stream=stream;
 $('#chat-camera').innerHTML='<div style="background:#000;border-radius:12px;padding:8px;margin:8px 0"><video id="chat-video" autoplay playsinline muted style="width:100%;max-height:220px;border-radius:8px"></video><div class="chat-tools" style="margin-top:8px"><button class="btn small" data-action="chat-snap">📸 التقاط الصورة</button><button class="btn small ghost" data-action="chat-cancel-camera">إلغاء</button></div></div>';
 $('#chat-video').srcObject=stream;
}

async function snapChat(){
 const s=chatState,v=$('#chat-video');if(!s||!v?.videoWidth)throw new Error('انتظر جاهزية الكاميرا');
 const canvas=document.createElement('canvas');const f=Math.min(1,1024/Math.max(v.videoWidth,v.videoHeight));
 canvas.width=Math.round(v.videoWidth*f);canvas.height=Math.round(v.videoHeight*f);
 canvas.getContext('2d').drawImage(v,0,0,canvas.width,canvas.height);
 const data=canvas.toDataURL('image/png');
 s.attachment={kind:'Image',data,mime:'image/png',camera:true};
 stopDeviceCapture();pendingChat();
}

function devicePermissions(){modal('تهيئة الكاميرا والمايك والموقع',`<div class="stack"><p>الكاميرا لصور الدردشة، والمايك لتسجيل رسالة صوتية، والموقع لخريطة التسليم وفتح خرائط Google أو خرائط Apple. لا نسجل أو نرسل بيانات تلقائيًا، ويمكنك المتابعة دون هذه الأذونات.</p><button class="btn secondary" data-action="permission-camera">السماح بالكاميرا وتجربتها</button><button class="btn secondary" data-action="permission-mic">السماح بالمايك وتجربته</button><button class="btn secondary" data-action="permission-location">السماح بالموقع للخرائط</button><div id="permission-result" class="hint" role="status"></div><button class="btn ghost" data-action="close">متابعة</button></div>`);}

async function chatAction(name,id){
 if(name==='order-chat'){await openChat('order',id);return true;}
 if(name==='ticket-chat'){await openChat('ticket',id);return true;}
 if(name==='interface-design'){interfaceDesignEditor();return true;}
 if(name==='pick-design-bg'){
  designBgImage = id || '';
  const uIn = document.getElementById('design-bg-url');
  if(uIn) uIn.value = designBgImage;
  document.querySelectorAll('.design-wp-item').forEach(b => b.classList.toggle('active', b.dataset.id === designBgImage));
  toast(designBgImage ? 'تم اختيار صورة الخلفية — اضغط حفظ للتطبيق' : 'تمت إزالة الخلفية المخصصة');
  return true;
 }
 if(name==='chat-refresh'){await refreshChat();return true;}
 if(name==='chat-media'){await mediaChat(id);return true;}
 if(name==='chat-record'){await recordChat();return true;}
 if(name==='chat-stop-record'){if(chatState?.recorder?.state==='recording')chatState.recorder.stop();return true;}
 if(name==='chat-camera'){await cameraChat();return true;}
 if(name==='chat-snap'){await snapChat();return true;}
 if(name==='chat-cancel-camera'){stopDeviceCapture();return true;}
 if(name==='chat-discard'){if(chatState)chatState.attachment=null;pendingChat();return true;}
 if(name==='device-permissions'){devicePermissions();return true;}
 if(name==='permission-camera'||name==='permission-mic'){const stream=await navigator.mediaDevices.getUserMedia(name==='permission-camera'?{video:true}:{audio:true});stream.getTracks().forEach(t=>t.stop());$('#permission-result').textContent='الإذن متاح بنجاح.';return true;}
 if(name==='permission-location'){const p=await geoOnce();$('#permission-result').innerHTML=`الموقع متاح.<div class="chat-tools" style="margin-top:8px"><a class="btn-gmaps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}">📍 فتح في خرائط Google</a><a class="btn secondary small" target="_blank" rel="noopener noreferrer" href="https://maps.apple.com/?ll=${p.latitude},${p.longitude}&q=${p.latitude},${p.longitude}">فتح في خرائط Apple</a></div>`;return true;}
 return false;
}

async function chatForm(kind,id,f,form){
 if(kind==='interface-design'){
  const key = f.key || 'All';
  const payload = {
   title: f.title || '',
   subtitle: f.subtitle || '',
   primary: '',
   background: '',
   ink: '',
   font: f.font || 'Inherit',
   image: designImage || '',
   backgroundImage: (f.backgroundImage ?? designBgImage ?? '').trim(),
   backgroundOpacity: Number(f.backgroundOpacity ?? 0.78),
   glassBlur: Number(f.glassBlur ?? 16),
   layout: f.layout || 'Standard',
   columns: Number(f.columns || 2),
   radius: Number(f.radius ?? 16)
  };
  await request('/designs/' + encodeURIComponent(key), 'PUT', payload);
  await refreshDesigns();
  if(typeof saveAdminLocalCloudSnapshot==='function')saveAdminLocalCloudSnapshot();
  closeModal();
  paintInterface();
  toast('تم حفظ وتطبيق تصميم الشاشة والخلفية الشفافة بنجاح!');
  return true;
 }
 if(kind==='chat-message'){
  const s=chatState;if(!s)throw new Error('أعد فتح المحادثة');
  if(s.recorder?.state==='recording'){s.recorder.stop();await new Promise(r=>setTimeout(r,300));}
  const attachment=s.attachment;
  const payload={kind:attachment?.kind||'Text',body:f.body||'',data:attachment?.data||null,mime:attachment?.mime||null,seconds:attachment?.seconds||0,camera:!!attachment?.camera};
  await request('/chat/'+s.channel+'/'+s.reference,'POST',payload);
  if(chatState!==s)return true;
  s.attachment=null;form.elements.body.value='';pendingChat();$('#chat-record-state').textContent='';
  await refreshChat();return true;
 }
 return false;
}

function chatDemo(path,method,body){
 const d=demoData();d.designs??={};d.chatMessages??=[];const save=v=>{persistDemo(d);return v;};
 if(path==='/designs')return d.designs;
 if(path.startsWith('/designs/')){d.designs[path.split('/')[2]]=body;return save(body);}
 if(path.startsWith('/chat/')){
  const [,_,channel,reference]=path.split('/');
  const peer=channel==='order'?d.orders.find(o=>o.id===reference)?.courierId||'':'';
  if(method==='GET')return d.chatMessages.filter(m=>m.channel===channel&&m.reference===reference&&m.peer===peer).map(m=>({...m,hasAttachment:m.kind!=='Text'}));
  const m={id:crypto.randomUUID(),channel,reference,peer,senderId:user.id,senderName:user.name,at:new Date().toISOString(),...body};
  d.chatMessages.push(m);return save({id:m.id});
 }
 return undefined;
}
