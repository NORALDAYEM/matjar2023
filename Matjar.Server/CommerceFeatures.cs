using System.Text.Json;

public static class CommerceFeatures
{
    public static readonly CurrencyInfo[] Currencies=JsonSerializer.Deserialize<CurrencyInfo[]>(typeof(CommerceFeatures).Assembly.GetManifestResourceStream("currencies.json")!,new JsonSerializerOptions{PropertyNameCaseInsensitive=true})!;
    public static int Digits(string code)=>Currencies.FirstOrDefault(c=>c.Code==code)?.Digits??2;
    public static decimal Round(decimal value,string code)=>decimal.Round(value,Digits(code),MidpointRounding.AwayFromZero);
    public static void Map(RouteGroupBuilder api)
    {
        api.MapGet("/commerce",(Store s)=>s.Read(d=>new{settings=d.Commerce,methods=d.PaymentMethods.Where(m=>m.Active).ToArray(),currencies=Currencies}));
        api.MapPut("/commerce",(CommerceChange r,Store s,HttpContext c)=>s.Write(d=>{
            var u=ChatFeatures.Actor(d,c);Need(ChatFeatures.Has(u,"commerce.manage"),"ليس لديك صلاحية إعداد العملات والدفع",403);
            Need(Currencies.Any(x=>x.Code==r.Currency),"العملة غير معروفة");Need(r.Language is "ar" or "en","اللغة غير صالحة");Need(r.DeliveryFee>=0&&r.DeliveryFee<=1000000000&&Round(r.DeliveryFee,r.Currency)==r.DeliveryFee,"رسوم التوصيل غير صالحة");
            if(r.Currency!=d.Commerce.Currency){Need(r.ConvertCatalog&&r.ConversionRate is >0 and <=1000000000,"أدخل سعر تحويل صريحًا ووافق على إعادة تسعير المنتجات");foreach(var p in d.Products){var price=Round(p.Price*r.ConversionRate,r.Currency);Need(price is >0 and <=1000000000000,"التحويل يجعل سعر أحد المنتجات صفرًا أو كبيرًا جدًا");p.Price=price;}foreach(var rule in new[]{d.Commissions.Customer,d.Commissions.Merchant,d.Commissions.Courier}){var fixedFee=Round(rule.Fixed*r.ConversionRate,r.Currency);Need(fixedFee<=1000000000,"العمولة الثابتة بعد التحويل كبيرة جدًا");rule.Fixed=fixedFee;}d.Commissions.Version++;}
            d.Commerce=new CommerceSettings{Currency=r.Currency,DeliveryFee=r.DeliveryFee,Language=r.Language};s.Audit(d,u,"تحديث عملة وتسعير المتجر: "+r.Currency);return d.Commerce;
        }));
        api.MapGet("/payment-methods",(Store s,HttpContext c)=>s.Read(d=>{var u=ChatFeatures.Actor(d,c);Need(ChatFeatures.Has(u,"commerce.manage"),"ليس لديك صلاحية",403);return d.PaymentMethods;}));
        api.MapPut("/payment-methods/{id}",(string id,PaymentMethodInput r,Store s,HttpContext c)=>s.Write(d=>{
            var u=ChatFeatures.Actor(d,c);Need(ChatFeatures.Has(u,"commerce.manage"),"ليس لديك صلاحية إدارة طرق الدفع",403);
            Need(r.Name is not null&&r.Name.Trim().Length is >=2 and <=80&&r.Instructions is not null&&r.Instructions.Length<=1000,"أدخل الاسم وتعليمات الدفع");Need(r.Type is "Cash" or "Bank" or "Wallet" or "Other","نوع الدفع غير صالح");Need(r.Type=="Cash"||!r.Active||!string.IsNullOrWhiteSpace(r.Instructions),"أدخل بيانات الحساب وتعليمات الدفع قبل التفعيل");Need(r.Type!="Cash"||!r.ReceiptRequired,"الدفع النقدي لا يتطلب إيصال تحويل");
            var m=d.PaymentMethods.FirstOrDefault(m=>m.Id==id);if(m is not null&&m.Active&&!r.Active)Need(d.PaymentMethods.Count(m=>m.Active)>1,"يجب إبقاء طريقة دفع فعالة واحدة على الأقل");
            if(m is null){m=new PaymentMethod{Id=Guid.NewGuid().ToString("N")};d.PaymentMethods.Add(m);}m.Name=r.Name!.Trim();m.Type=r.Type;m.Instructions=r.Instructions!;m.Active=r.Active;m.ReceiptRequired=r.ReceiptRequired;s.Audit(d,u,"تعديل طريقة الدفع "+m.Name);return m;
        }));
        api.MapPost("/orders/{id}/receipt",(string id,ReceiptInput r,Store s,HttpContext c)=>s.Write(d=>{
            var u=ChatFeatures.Actor(d,c);var o=Order(d,id);Need(o.CustomerId==u.Id,"الإيصال لصاحب الطلب فقط",403);Need(o.Status!="Cancelled"&&o.PaymentType!="Cash"&&o.PaymentStatus!="Paid","لا يمكن إرفاق إيصال لهذا الطلب",409);Need(o.Receipts.Count<5,"وصلت إلى حد الإيصالات؛ تواصل مع الإدارة",409);Need(r.Reference is not null&&r.Reference.Length<=100,"رقم المرجع طويل");
            byte[] bytes;string mime;if(r.Mime=="image/png"){bytes=ChatFeatures.ValidateImage(r.Data,1450000,false)!;mime=r.Mime;}else{Need(r.Mime=="application/pdf"&&r.Data is not null&&r.Data.Length<=4200000,"اختر صورة أو PDF حتى 3 ميجابايت");try{bytes=Convert.FromBase64String(r.Data!);}catch{throw new RuleException("الإيصال غير صالح");}Need(bytes.Length is >=8 and <=3100000&&System.Text.Encoding.ASCII.GetString(bytes,0,5)=="%PDF-","ملف PDF غير صالح");mime="application/pdf";}
            var receipt=new Receipt{Id=Guid.NewGuid().ToString("N"),Mime=mime,Reference=r.Reference!};File.WriteAllBytes(s.MediaFile(receipt.Id),bytes);o.Receipts.Add(receipt);o.PaymentStatus="PendingReview";o.PaymentReviewNote="";s.Audit(d,u,"إرفاق إيصال للطلب "+o.Number);return new{receipt.Id,o.PaymentStatus};
        }));
        api.MapGet("/orders/{id}/receipt/{receiptId}",(string id,string receiptId,Store s,HttpContext c)=>s.Read<IResult>(d=>{
            var u=ChatFeatures.Actor(d,c);var o=Order(d,id);Need(o.CustomerId==u.Id||ChatFeatures.Has(u,"payments.review"),"لا توجد صلاحية لعرض الإيصال",403);var r=o.Receipts.FirstOrDefault(r=>r.Id==receiptId)??throw new RuleException("الإيصال غير موجود",404);var path=s.MediaFile(r.Id);Need(File.Exists(path),"الإيصال غير متاح",404);c.Response.Headers.CacheControl="no-store";return Results.Bytes(File.ReadAllBytes(path),r.Mime,fileDownloadName:r.Mime=="application/pdf"?"receipt.pdf":null);
        }));
        api.MapPost("/orders/{id}/payment-review",(string id,PaymentReview r,Store s,HttpContext c)=>s.Write(d=>{
            var u=ChatFeatures.Actor(d,c);Need(ChatFeatures.Has(u,"payments.review"),"ليس لديك صلاحية اعتماد الدفع",403);var o=Order(d,id);Need(o.PaymentStatus!="Paid"&&o.Status!="Cancelled","لا يمكن تعديل دفع مؤكد أو طلب ملغي",409);Need(r.Decision is "Paid" or "Rejected","القرار غير صالح");Need(r.Note is not null&&r.Note.Length<=500&&(r.Decision!="Rejected"||r.Note.Trim().Length>=3),"اكتب سبب الرفض");
            var latest=o.Receipts.LastOrDefault();if(latest is not null){Need(latest.Id==r.ReceiptId&&latest.Status=="PendingReview","راجع أحدث إيصال قيد المراجعة",409);latest.Status=r.Decision;latest.Note=r.Note!;latest.ReviewedAt=DateTime.UtcNow;latest.ReviewerId=u.Id;}
            else Need(!o.ReceiptRequired&&r.Decision=="Paid","أرفق الإيصال أولًا",409);
            o.PaymentStatus=r.Decision;o.PaymentReviewNote=r.Note!;s.Audit(d,u,"مراجعة دفع "+o.Number+": "+r.Decision);return new{o.PaymentStatus};
        }));
        api.MapGet("/payments",(Store s,HttpContext c)=>s.Read(d=>{
            var u=ChatFeatures.Actor(d,c);Need(ChatFeatures.Has(u,"payments.review"),"ليس لديك صلاحية مراجعة الدفع",403);return d.Orders.OrderByDescending(o=>o.CreatedAt).Select(o=>new{o.Id,o.Number,o.CustomerName,o.Status,o.Currency,o.Total,o.PaymentMethodName,o.PaymentType,o.PaymentStatus,o.ReceiptRequired,o.Receipts,o.PaymentReviewNote}).ToArray();
        }));
    }
    static void Need(bool c,string m,int s=400)=>ChatFeatures.Need(c,m,s);
    static Order Order(Data d,string id)=>d.Orders.FirstOrDefault(o=>o.Id==id)??throw new RuleException("الطلب غير موجود",404);
}
public sealed record CurrencyInfo(string Code,string Name,int Digits);
public sealed class CommerceSettings{public string Currency{get;set;}="SAR";public decimal DeliveryFee{get;set;}=15;public string Language{get;set;}="ar";}
public sealed record CommerceChange(string Currency,decimal DeliveryFee,string Language,decimal ConversionRate=1,bool ConvertCatalog=false);
public sealed class PaymentMethod{public string Id{get;set;}="cod";public string Name{get;set;}="الدفع عند الاستلام";public string Type{get;set;}="Cash";public string Instructions{get;set;}="";public bool Active{get;set;}=true;public bool ReceiptRequired{get;set;}}
public sealed record PaymentMethodInput(string Name,string Type,string Instructions,bool Active,bool ReceiptRequired);
public sealed class Receipt{public string Id{get;set;}="";public string Mime{get;set;}="";public string Reference{get;set;}="";public DateTime At{get;set;}=DateTime.UtcNow;public string Status{get;set;}="PendingReview";public string Note{get;set;}="";public DateTime? ReviewedAt{get;set;}public string ReviewerId{get;set;}="";}
public sealed record ReceiptInput(string Data,string Mime,string Reference);
public sealed record PaymentReview(string Decision,string? ReceiptId,string Note);
