const chatRightKeys=['chat.read','chat.delivery','chat.support','chat.text','chat.image','chat.audio','chat.camera'];
const designScreens={'Login':'شاشة الدخول','Customer.home':'العميل · المنتجات','Customer.orders':'العميل · الطلبات','Customer.cart':'العميل · السلة','Customer.account':'العميل · حسابي','Merchant.home':'التاجر · الرئيسية','Merchant.products':'التاجر · المنتجات','Merchant.orders':'التاجر · الطلبات','Merchant.account':'التاجر · الحساب','Courier.home':'المندوب · المهام','Courier.history':'المندوب · السجل','Courier.account':'المندوب · الحساب','Support.home':'الدعم · الرئيسية','Support.account':'الدعم · الحساب','Admin.home':'الإدارة · الرئيسية','Admin.orders':'الإدارة · الطلبات','Admin.products':'الإدارة · المنتجات','Admin.users':'الإدارة · الصلاحيات','Admin.audit':'الإدارة · سجل النشاط','Admin.account':'الإدارة · الحساب'};
const designDefaults={title:'',subtitle:'',primary:'',background:'',ink:'',font:'Inherit',image:'',layout:'Standard',columns:2,radius:16};
let interfaceDesigns={},designImage='',designImageLoading=false,chatState=null;
async function refreshDesigns(){try{interfaceDesigns=await request('/designs');}catch{}}
function paintInterface(){const key=user?user.role+'.'+page:'Login',d=interfaceDesigns[key];if(!d)return;const r=document.documentElement;for(const [key,value]of Object.entries({'--green':d.primary,'--bg':d.background,'--ink':d.ink}))if(value)r.style.setProperty(key,value);if(d.font!=='Inherit')r.style.fontFamily=storeFonts[d.font]||storeFonts.Tahoma;const el=$('#view')||document.querySelector('.auth-form');if(!el)return;el.dataset.designLayout=d.layout;el.style.setProperty('--design-columns',d.columns);el.style.setProperty('--design-mobile-columns',Math.min(2,d.columns));el.style.setProperty('--design-radius',d.radius+'px');let banner=el.querySelector(':scope > .interface-banner');if(!d.title&&!d.subtitle&&!d.image){banner?.remove();return;}if(!banner){banner=document.createElement('section');banner.className='interface-banner';el.prepend(banner);}const sig=JSON.stringify(d);if(banner.dataset.signature!==sig){banner.dataset.signature=sig;banner.innerHTML=`${d.image?`<img src="${esc(d.image)}" alt="صورة الواجهة">`:''}<div>${d.title?`<h2>${esc(d.title)}</h2>`:''}${d.subtitle?`<p>${esc(d.subtitle)}</p>`:''}</div>`;}}
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
 $('#chat-pending').innerHTML=a?`<div style="display:flex;align-items:center;gap:12px;background:#ffffff;padding:8px 12px;border-radius:10px;margin:8px 0;box-shadow:0 1px 2px rgba(0,0,0,0.1)">
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
