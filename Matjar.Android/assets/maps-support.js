let checkoutDestination=null, mapView=null, mapTimer=null, sharingWatch=null, sharingOrder=null, sharingBusy=false, lastSent=0;

function disposeMap(){clearInterval(mapTimer);mapTimer=null;if(mapView){mapView.remove();mapView=null;}}
function stopSharing(){if(sharingWatch!==null)navigator.geolocation.clearWatch(sharingWatch);sharingWatch=null;const id=sharingOrder;sharingOrder=null;if(id)request('/orders/'+id+'/location','DELETE').catch(()=>{});}
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopSharing();disposeMap();}});
window.addEventListener('pagehide',()=>{stopSharing();disposeMap();});

function geoOnce(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('الجهاز لا يدعم تحديد الموقع'));navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),()=>reject(new Error('تعذر تحديد الموقع. اسمح بالموقع أو اختر نقطة على الخريطة.')),{enableHighAccuracy:true,timeout:20000,maximumAge:0});});}

function startMap(center){
 disposeMap();
 mapView=L.map('delivery-map',{zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}).setView(center||[24.7136,46.6753],13);
 L.tileLayer(config.mapTileUrl||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; Google Maps & OpenStreetMap'}).addTo(mapView);
 setTimeout(()=>mapView?.invalidateSize(),100);
 return mapView;
}

function mark(point,label,color='#1a73e8',iconSymbol='📍'){
 if(!point||!mapView)return;
 return L.circleMarker([point.latitude,point.longitude],{radius:11,color,fillColor:color,fillOpacity:.9,weight:2}).addTo(mapView).bindTooltip(`${iconSymbol} ${label}`,{permanent:true,direction:'top',className:'leaflet-tooltip'});
}

function mapShell(extra){
 return `<div class="live-tracking-panel">
  <div class="live-tracking-header">
   <div class="inline"><span class="live-pulse"></span><strong>تتبع الطلب والموقع المباشر (Google Maps)</strong></div>
   <small id="live-indicator">تحديث فوري</small>
  </div>
  <div id="delivery-map" class="delivery-map" aria-label="خريطة التوصيل المباشرة"></div>
  <div id="map-state" style="padding:10px 16px;font-size:12px;background:#f8fafd;border-top:1px solid #e1e8ed" role="status"></div>
  <div class="maps-action-bar">${extra}</div>
 </div>`;
}

function chooseDestination(id){
 const o=dashboard?.orders.find(o=>o.id===id);const initial=o?.destination||checkoutDestination;let selected=initial,marker;
 modal('تحديد موقع تسليم الطلب بدقة',mapShell(`
  <button class="btn secondary" data-action="map-locate">🎯 استخدام موقعي الحالي بدقة</button>
  <button class="btn" data-action="map-save">💾 حفظ نقطة التسليم للطلب</button>
  <span class="hint" style="width:100%">اضغط على أي مكان بالخريطة لتحديد عنوان المبنى بدقة ليتمكن المندوب من الوصول إليك عبر Google Maps.</span>
 `));
 const m=startMap(initial?[initial.latitude,initial.longitude]:null);
 const select=p=>{
  selected=p;if(marker)m.removeLayer(marker);
  marker=mark(p,'نقطة التسليم الخاصة بك','#087e66','🏠');
  $('#map-state').innerHTML=`📍 <b>الإحداثيات المحددة:</b> ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`;
 };
 if(initial)select(initial);
 m.on('click',e=>select({latitude:e.latlng.lat,longitude:e.latlng.lng,accuracy:0}));
 
 $('#modal').querySelector('[data-action="map-locate"]').onclick=async()=>{
  try{const p=await geoOnce();select(p);m.setView([p.latitude,p.longitude],16,{animate:false});}catch(e){toast(e.message);}
 };
 $('#modal').querySelector('[data-action="map-save"]').onclick=async()=>{
  try{
   if(!selected)throw new Error('حدد نقطة على الخريطة أولًا');
   if(id){await request('/orders/'+id+'/destination','PUT',selected);await refresh();}
   else{checkoutDestination=selected;const label=$('#destination-label');if(label)label.textContent='تم تحديد موقع التسليم بنجاح';}
   closeModal();toast('تم حفظ موقع التسليم بدقة');
  }catch(e){toast(e.message);}
 };
}

async function tracking(id){
 const data=await request('/orders/'+id+'/tracking');
 const active=['Assigned','OnWay'].includes(data.status);
 const own=user.role==='Courier';
 const isCustomer=user.role==='Customer';
 
 modal('تتبع الشحنة المباشر ومسار المندوب',mapShell(`
  ${isCustomer&&['Preparing','Ready'].includes(data.status)?`<button class="btn secondary small" data-action="edit-destination" data-id="${esc(id)}">✏️ تعديل موقع التسليم</button>`:''}
  ${own&&active?`<button class="btn small" style="background:#00e676;color:#053a1a" data-action="share-location" data-id="${esc(id)}">📡 بدء بث موقعي المباشر للعميل</button><button class="btn secondary small" data-action="stop-location">⏹ إيقاف البث</button>`:''}
  <div id="navigation-link" style="display:flex;gap:8px;width:100%"></div>
  <button class="btn secondary small" data-action="refresh-tracking" data-id="${esc(id)}">🔄 تحديث الخريطة الآن</button>
 `));

 startMap(data.destination?[data.destination.latitude,data.destination.longitude]:null);
 let markers=[];
 
 const paint=d=>{
  if(!mapView)return;
  markers.forEach(x=>mapView.removeLayer(x));
  markers=[];
  
  if(d.destination){
   markers.push(mark(d.destination,'موقع تسليم العميل','#1a73e8','🏠'));
  }
  if(d.courierLocation){
   markers.push(mark(d.courierLocation,'مندوب التوصيل المباشر','#e65100','🛵'));
  }
  
  const p=d.courierLocation;
  const stateEl=$('#map-state');
  if(stateEl){
   stateEl.innerHTML=p?`
    <div style="display:flex;justify-content:space-between;align-items:center">
     <span>🛵 <b>حالة المندوب:</b> ${d.sharing?'<span style="color:#00a884">يبث موقعه المباشر الآن</span>':'المشاركة متوقفة'} (آخر رصد: ${new Date(p.updatedAt).toLocaleTimeString('ar-SA')})</span>
     <span>دقة الرصد: ${Math.round(p.accuracy)}م</span>
    </div>
   `:d.destination?'🏠 <b>موقع العميل محدد</b> · بانتظار بدء حركة المندوب':'⚠️ العميل لم يحدد موقعه على الخريطة بعد';
  }

  // Google Maps Direct Navigation Links
  const navBox=$('#navigation-link');
  if(navBox){
   let buttonsHtml='';
   if(d.destination){
    const dest=d.destination;
    buttonsHtml+=`<a class="btn-gmaps" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=${dest.latitude},${dest.longitude}&travelmode=driving">
     <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
     ${own?'فتح الملاحة عبر خرائط Google لموقع العميل':'الملاحة إلى موقع التسليم عبر Google Maps'}
    </a>`;
   }
   if(d.courierLocation&&!own){
    const cLoc=d.courierLocation;
    buttonsHtml+=`<a class="btn-gmaps" style="background:#e65100" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${cLoc.latitude},${cLoc.longitude}">
     🛵 موقع المندوب الحالي في Google Maps
    </a>`;
   }
   navBox.innerHTML=buttonsHtml;
  }
  
  if(markers.length>1){
   mapView.fitBounds(L.featureGroup(markers).getBounds().pad(.35),{maxZoom:16,animate:false});
  }
 };
 
 paint(data);
 mapTimer=setInterval(async()=>{
  if(!$('#modal').open)return disposeMap();
  try{const d=await request('/orders/'+id+'/tracking');paint(d);}catch(e){clearInterval(mapTimer);}
 },8000);
}

function startSharing(id){
 if(!navigator.geolocation)throw new Error('تحديد الموقع غير متاح');
 stopSharing();sharingOrder=id;lastSent=0;
 sharingWatch=navigator.geolocation.watchPosition(async p=>{
  if(sharingBusy||sharingOrder!==id||Date.now()-lastSent<4000)return;
  sharingBusy=true;
  try{
   await request('/orders/'+id+'/location','PUT',{latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy});
   lastSent=Date.now();
   if($('#map-state'))$('#map-state').innerHTML='📡 <b>تم إرسال موقعك المباشر للعميل</b> بنجاح بنظام GPS في ' + new Date().toLocaleTimeString('ar-SA');
  }catch(e){stopSharing();toast(e.message);}finally{sharingBusy=false;}
 },()=>{stopSharing();toast('تعذر تحديد الموقع. تأكد من تفعيل GPS.');},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
 toast('بدأت مشاركة موقعك المباشر مع العميل بنجاح');
}

function supportHome(){return `<div class="section-head"><div><h1>الدعم الفني</h1><p>تابع رسائل العملاء والتجار والمندوبين بتصميم WhatsApp المتطور.</p></div></div><div class="panel stack"><p>يمكنك قراءة التذاكر والرد عليها والمحادثة الفورية بالصور والتسجيلات الصوتية ومتابعة خرائط الطلبات.</p><button class="btn" data-action="support">فتح مركز الدعم</button></div>`;}
async function supportCenter(){const tickets=await request('/tickets');modal('مركز الدعم الفني والمحادثات',`<div class="stack"><button class="btn" data-action="new-ticket">فتح تذكرة دعم جديدة</button><p class="hint">محادثات فورية آمنة مع خدمة العملاء.</p>${tickets.map(t=>`<button class="ticket-card" data-action="open-ticket" data-id="${esc(t.id)}"><strong>${esc(t.subject)}</strong><small>${esc(t.name)} · ${t.status==='Closed'?'مغلقة':'مفتوحة'} · ${t.messages.length} رسالة</small></button>`).join('')||'<p class="hint">لا توجد تذاكر بعد.</p>'}<span dir="ltr">${esc(config.supportEmail||'')}</span></div>`);}

async function openTicket(id){
 const t=(await request('/tickets')).find(t=>t.id===id);if(!t)throw new Error('التذكرة غير متاحة');
 modal(t.subject,`<div class="stack">
  ${has('chat.read')&&has('chat.support')?`<button class="btn" style="background:#075e54" data-action="ticket-chat" data-id="${esc(id)}">💬 فتح محادثة WhatsApp للدعم الفني</button>`:''}
  <p class="hint">${t.status==='Closed'?'مغلقة':'مفتوحة'}${t.orderId?' · مرتبطة بالطلب '+esc(t.orderId):''}</p>
  <div class="ticket-messages">${t.messages.map(m=>`<div class="ticket-message"><strong>${esc(m.name)}</strong><p>${esc(m.message)}</p><small>${new Date(m.at).toLocaleString('ar-SA')}</small></div>`).join('')}</div>
  ${t.status!=='Closed'?`<form class="form" data-form="ticket-reply" data-id="${esc(id)}"><label>الرد السريع<textarea name="message" required maxlength="2000" placeholder="اكتب ردك هنا..."></textarea></label><button class="btn">إرسال الرد</button><div class="form-error" hidden></div></form>`:''}
  ${has('support.manage')?`<button class="btn secondary" data-action="ticket-status" data-id="${esc(id)}" data-status="${t.status==='Closed'?'Open':'Closed'}">${t.status==='Closed'?'إعادة فتح':'إغلاق'} التذكرة</button>`:''}
 </div>`);
}

async function extendedAction(name,id){
 if(name==='checkout-map'){chooseDestination();return true;}
 if(name==='edit-destination'){chooseDestination(id);return true;}
 if(name==='track-order'||name==='refresh-tracking'){await tracking(id);return true;}
 if(name==='share-location'){startSharing(id);return true;}
 if(name==='stop-location'){stopSharing();toast('توقفت مشاركة الموقع المباشر');return true;}
 if(name==='support'){await supportCenter();return true;}
 if(name==='open-ticket'){await openTicket(id);return true;}
 if(name==='ticket-status'){const t=(await request('/tickets')).find(t=>t.id===id);await request('/tickets/'+id+'/status','PUT',{status:t.status==='Closed'?'Open':'Closed'});await openTicket(id);return true;}
 if(name==='new-ticket'){modal('تذكرة دعم جديدة',`<form class="form" data-form="new-ticket"><label>الموضوع<input name="subject" required minlength="3" maxlength="120" placeholder="عنوان التذكرة"></label><label>الطلب المرتبط<select name="orderId"><option value="">استفسار عام</option>${(dashboard.orders||[]).map(o=>`<option value="${esc(o.id)}">${esc(o.number)}</option>`).join('')}</select></label><label>كيف نساعدك؟<textarea name="message" required minlength="3" maxlength="2000" placeholder="اكتب استفسارك بالتفصيل..."></textarea></label><button class="btn">إرسال للدعم</button><div class="form-error" hidden></div></form>`);return true;}
 return false;
}

async function extendedForm(kind,id,f){
 if(kind==='new-ticket'){const t=await request('/tickets','POST',f);await openTicket(t.id);return true;}
 if(kind==='ticket-reply'){await request('/tickets/'+id+'/reply','POST',f);await openTicket(id);return true;}
 return false;
}

function extendedDemoRequest(path,method,body){
 const d=demoData();const o=d.orders.find(o=>path.startsWith('/orders/'+o.id+'/'));const save=v=>{persistDemo(d);return v;};
 if(o&&path.endsWith('/destination')){o.destination=body;return save({ok:true});}
 if(o&&path.endsWith('/tracking'))return {id:o.id,status:o.status,destination:o.destination,courierLocation:['Assigned','OnWay'].includes(o.status)?o.courierLocation:null,sharing:o.sharing};
 if(o&&path.endsWith('/location')){o.courierLocation=method==='DELETE'?null:{...body,updatedAt:new Date().toISOString()};o.sharing=method!=='DELETE';return save({ok:true});}
 if(path==='/tickets'){if(method==='GET')return d.tickets.filter(t=>t.userId===user.id||has('support.manage'));const t={id:crypto.randomUUID(),userId:user.id,name:user.name,subject:body.subject,orderId:body.orderId,status:'Open',updatedAt:new Date().toISOString(),messages:[{userId:user.id,name:user.name,message:body.message,at:new Date().toISOString()}]};d.tickets.unshift(t);return save(t);}
 if(path.startsWith('/tickets/')){const t=d.tickets.find(t=>t.id===path.split('/')[2]);if(!t)throw new Error('التذكرة غير موجودة');if(path.endsWith('/reply'))t.messages.push({userId:user.id,name:user.name,message:body.message,at:new Date().toISOString()});if(path.endsWith('/status'))t.status=body.status;return save(t);}
 return undefined;
}
