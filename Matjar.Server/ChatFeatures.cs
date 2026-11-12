using System.Text.RegularExpressions;

public static class ChatFeatures
{
    public static readonly string[] ChatRights=["chat.read","chat.delivery","chat.support","chat.text","chat.image","chat.audio","chat.camera"];
    public static readonly string[] DesignKeys=["All","Login","Customer.home","Customer.orders","Customer.cart","Customer.account","Merchant.home","Merchant.products","Merchant.orders","Merchant.account","Courier.home","Courier.history","Courier.account","Support.home","Support.account","Admin.home","Admin.orders","Admin.products","Admin.users","Admin.audit","Admin.account"];
    public static void Map(RouteGroupBuilder api)
    {
        api.MapGet("/designs",(Store s)=>s.Read(d=>d.Designs));
        api.MapPut("/designs/{key}",(string key,InterfaceDesign r,Store s,HttpContext c)=>s.Write(d=>{
            var u=Actor(d,c);Need(Has(u,"appearance.manage"),"ليس لديك تفويض لتعديل الشاشات",403);
            Need(DesignKeys.Contains(key),"الشاشة غير معروفة");
            Need(r.Title is not null&&r.Title.Length<=80&&r.Subtitle is not null&&r.Subtitle.Length<=240,"العنوان طويل");
            Need(new[]{r.Primary,r.Background,r.Ink}.All(v=>v is not null&&(v==""||Regex.IsMatch(v,"^#[0-9a-fA-F]{6}$"))),"الألوان غير صالحة");
            Need(new[]{"Inherit","Tahoma","Arial","System","Serif"}.Contains(r.Font)&&new[]{"Standard","Compact","Spacious"}.Contains(r.Layout)&&r.Columns is >=1 and <=4&&r.Radius is >=0 and <=28,"تنسيق الشاشة غير صالح");
            if (!string.IsNullOrEmpty(r.Image) && !r.Image.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) ValidateImage(r.Image,1500000,true);
            if (!string.IsNullOrEmpty(r.BackgroundImage) && !r.BackgroundImage.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) Need(r.BackgroundImage.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) && r.BackgroundImage.Length <= 2500000, "صورة الخلفية غير صالحة");
            d.Designs[key]=r;s.Audit(d,u,"تعديل تصميم الشاشة "+key);return r;
        }));
        api.MapGet("/chat/{channel}/{reference}",(string channel,string reference,Store s,HttpContext c)=>s.Read(d=>{
            var u=Actor(d,c);var peer=Scope(d,u,channel,reference,false);
            return d.ChatMessages.Where(m=>m.Channel==channel&&m.Reference==reference&&m.Peer==peer).OrderBy(m=>m.At).TakeLast(200).Select(m=>new{m.Id,m.SenderId,m.SenderName,m.Kind,m.Body,m.Mime,m.Seconds,m.At,hasAttachment=m.Mime!=""}).ToArray();
        }));
        api.MapPost("/chat/{channel}/{reference}",(string channel,string reference,ChatInput r,Store s,HttpContext c)=>s.Write(d=>{
            var u=Actor(d,c);var peer=Scope(d,u,channel,reference,true);
            Need(r.Kind is "Text" or "Image" or "Audio","نوع الرسالة غير صالح");
            Need(r.Body is not null&&r.Body.Length<=2000,"الرسالة طويلة");
            if(!string.IsNullOrWhiteSpace(r.Body))Need(Has(u,"chat.text"),"الكتابة غير مسموحة لحسابك",403);
            var right=r.Kind switch{"Text"=>"chat.text","Image"=>"chat.image",_=>"chat.audio"};Need(Has(u,right),"هذا النوع من الرسائل غير مسموح لحسابك",403);
            if(r.Camera)Need(r.Kind=="Image"&&Has(u,"chat.camera"),"التصوير غير مسموح لحسابك",403);
            byte[]? bytes=null;string mime="";
            if(r.Kind=="Text")Need(!string.IsNullOrWhiteSpace(r.Body)&&string.IsNullOrEmpty(r.Data),"أدخل رسالة نصية");
            else if(r.Kind=="Image"){bytes=ValidateImage(r.Data,1450000,false);mime="image/png";}
            else {Need(r.Seconds is >=1 and <=60,"مدة التسجيل من ثانية إلى دقيقة");Need(r.Data is not null&&r.Data.Length<=2900000,"التسجيل كبير");try{bytes=Convert.FromBase64String(r.Data!);}catch{throw new RuleException("التسجيل غير صالح");}
                Need(bytes.Length is >=16 and <=2100000,"التسجيل غير صالح");
                if(r.Mime=="audio/webm"&&bytes.AsSpan(0,4).SequenceEqual(new byte[]{0x1a,0x45,0xdf,0xa3}))mime=r.Mime;
                else if(r.Mime=="audio/ogg"&&System.Text.Encoding.ASCII.GetString(bytes,0,4)=="OggS")mime=r.Mime;
                else if(r.Mime=="audio/wav"&&System.Text.Encoding.ASCII.GetString(bytes,0,4)=="RIFF"&&System.Text.Encoding.ASCII.GetString(bytes,8,4)=="WAVE")mime=r.Mime;
                else if((r.Mime=="audio/mp4"||r.Mime=="audio/aac"||r.Mime=="audio/x-m4a")&&System.Text.Encoding.ASCII.GetString(bytes,4,4)=="ftyp")mime="audio/mp4";
                else throw new RuleException("صيغة التسجيل غير مدعومة");
            }
            Need(d.ChatMessages.Count(m=>m.SenderId==u.Id&&m.At>DateTime.UtcNow.AddMinutes(-1))<30,"تم إرسال رسائل كثيرة؛ انتظر دقيقة",429);
            var m=new ChatMessage{Id=Guid.NewGuid().ToString("N"),Channel=channel,Reference=reference,Peer=peer,SenderId=u.Id,SenderName=u.Name,Kind=r.Kind,Body=r.Body!,Mime=mime,Seconds=r.Kind=="Audio"?r.Seconds:0};
            if(bytes is not null)File.WriteAllBytes(s.MediaFile(m.Id),bytes);
            d.ChatMessages.Add(m);s.Audit(d,u,"إرسال رسالة "+r.Kind+" في "+channel);return new{m.Id};
        }));
        api.MapGet("/chat/{channel}/{reference}/media/{id}",(string channel,string reference,string id,Store s,HttpContext c)=>s.Read<IResult>(d=>{
            var u=Actor(d,c);var peer=Scope(d,u,channel,reference,false);var m=d.ChatMessages.FirstOrDefault(m=>m.Id==id&&m.Channel==channel&&m.Reference==reference&&m.Peer==peer&&m.Mime!="")??throw new RuleException("المرفق غير موجود",404);
            var path=s.MediaFile(m.Id);Need(File.Exists(path),"المرفق غير متاح",404);c.Response.Headers.CacheControl="no-store";return Results.Bytes(File.ReadAllBytes(path),m.Mime);
        }));
    }
    public static User Actor(Data d,HttpContext c){var value=c.Request.Headers.Authorization.ToString();var token=value.StartsWith("Bearer ")?value[7..]:"";var hash=Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));var session=d.Sessions.FirstOrDefault(s=>s.Hash==hash&&s.Expires>DateTime.UtcNow);return d.Users.FirstOrDefault(u=>u.Id==session?.UserId&&u.Active)??throw new RuleException("سجّل الدخول",401);}
    public static bool Has(User u,string p)=>u.Role=="Admin"||(u.Overrides.TryGetValue(p,out var v)?v:Permissions.Defaults(u.Role).Contains(p));
    public static void Need(bool condition,string message,int code=400){if(!condition)throw new RuleException(message,code);}
    private static string Scope(Data d,User u,string channel,string reference,bool send){
        Need(Has(u,"chat.read"),"قراءة الدردشة غير مسموحة لحسابك",403);
        if(channel=="order"){Need(Has(u,"chat.delivery"),"دردشة التوصيل غير مسموحة",403);var o=d.Orders.FirstOrDefault(o=>o.Id==reference)??throw new RuleException("الطلب غير موجود",404);
            Need(!string.IsNullOrEmpty(o.CourierId)&&(u.Role=="Admin"||o.CustomerId==u.Id||u.Role=="Courier"&&o.CourierId==u.Id),"المحادثة بين صاحب الطلب ومندوبه فقط",403);
            if(send)Need(o.Status is "Assigned" or "OnWay","انتهت محادثة التوصيل؛ تواصل مع الدعم",409);return o.CourierId!;
        }
        if(channel=="ticket"){Need(Has(u,"chat.support"),"دردشة الدعم غير مسموحة",403);var t=d.Tickets.FirstOrDefault(t=>t.Id==reference)??throw new RuleException("التذكرة غير موجودة",404);Need(t.UserId==u.Id||Has(u,"support.manage"),"المحادثة لحساب آخر",403);if(send)Need(t.Status!="Closed","التذكرة مغلقة",409);return "";}
        throw new RuleException("القناة غير صالحة");
    }
    public static byte[]? ValidateImage(string? data,int max,bool optional){
        Need(data is not null&&data.Length<=max,"حجم الصورة غير صالح");if(optional&&data=="")return null;
        Need(data!.StartsWith("data:image/png;base64,"),"الصورة يجب أن تكون PNG");byte[] bytes;try{bytes=Convert.FromBase64String(data[22..]);}catch{throw new RuleException("الصورة غير صالحة");}
        Need(bytes.Length>=24&&bytes.AsSpan(0,8).SequenceEqual(new byte[]{137,80,78,71,13,10,26,10}),"الصورة غير صالحة");var w=System.Buffers.Binary.BinaryPrimitives.ReadInt32BigEndian(bytes.AsSpan(16,4));var h=System.Buffers.Binary.BinaryPrimitives.ReadInt32BigEndian(bytes.AsSpan(20,4));Need(w is >0 and <=1200&&h is >0 and <=1200,"أبعاد الصورة غير صالحة");return bytes;
    }
}
public sealed class InterfaceDesign{public string Title{get;set;}="";public string Subtitle{get;set;}="";public string Primary{get;set;}="";public string Background{get;set;}="";public string Ink{get;set;}="";public string Font{get;set;}="Inherit";public string Image{get;set;}="";public string BackgroundImage{get;set;}="";public double BackgroundOpacity{get;set;}=0.78;public int GlassBlur{get;set;}=16;public string Layout{get;set;}="Standard";public int Columns{get;set;}=2;public int Radius{get;set;}=16;}
public sealed class ChatMessage{public string Id{get;set;}="";public string Channel{get;set;}="";public string Reference{get;set;}="";public string Peer{get;set;}="";public string SenderId{get;set;}="";public string SenderName{get;set;}="";public string Kind{get;set;}="Text";public string Body{get;set;}="";public string Mime{get;set;}="";public int Seconds{get;set;}public DateTime At{get;set;}=DateTime.UtcNow;}
public sealed record ChatInput(string Kind,string Body,string? Data,string? Mime,int Seconds=0,bool Camera=false);
