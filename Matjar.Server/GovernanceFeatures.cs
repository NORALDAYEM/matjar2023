public static class GovernanceFeatures
{
    public static decimal Fee(FeeRule r,decimal basis,string currency,bool cap=false)=>r.Enabled?(cap?Math.Min(basis,CommerceFeatures.Round(basis*r.Percent/100+r.Fixed,currency)):CommerceFeatures.Round(basis*r.Percent/100+r.Fixed,currency)):0;
    public static void Snapshot(Data d,Order o,int? expected){
        var f=d.Commissions;ChatFeatures.Need(expected==f.Version||(!f.Customer.Enabled&&!f.Merchant.Enabled&&!f.Courier.Enabled),"تغيرت العمولات؛ حدّث السلة قبل التأكيد",409);
        o.CommissionVersion=f.Version;o.CustomerCommission=Fee(f.Customer,o.Lines.Sum(l=>l.Price*l.Qty),o.Currency);
        o.MerchantCommissions=o.Lines.GroupBy(l=>l.MerchantId).ToDictionary(g=>g.Key,g=>Fee(f.Merchant,g.Sum(l=>l.Price*l.Qty),o.Currency,true));o.CourierCommission=Fee(f.Courier,o.DeliveryFee,o.Currency,true);
    }
    public static void Agreement(Data d,bool accepted,int? policy,int? fees){
        if(d.Commissions.Customer.Enabled||d.Commissions.Merchant.Enabled||d.Commissions.Courier.Enabled)ChatFeatures.Need(accepted&&fees==d.Commissions.Version,"وافق على العمولات الحالية قبل التسجيل",409);
        if(d.Policies.Published&&d.Policies.RequireAcceptance)ChatFeatures.Need(accepted&&policy==d.Policies.Version&&fees==d.Commissions.Version,"اقرأ الاتفاقية والعمولات الحالية ووافق عليها قبل التسجيل",409);
    }
    public static void Map(RouteGroupBuilder api,Func<string,string,string,string,User> factory){
        api.MapGet("/governance",(Store s)=>s.Read(d=>new{commissions=d.Commissions,policies=d.Policies,currency=d.Commerce.Currency}));
        api.MapPut("/commissions/settings",(CommissionSettings r,Store s,HttpContext c)=>s.Write(d=>{
            var u=ChatFeatures.Actor(d,c);ChatFeatures.Need(ChatFeatures.Has(u,"commissions.manage"),"لا توجد صلاحية لإدارة العمولات",403);
            foreach(var rule in new[]{r.Customer,r.Merchant,r.Courier})ChatFeatures.Need(rule is not null&&rule.Percent is >=0 and <=100&&rule.Fixed is >=0 and <=1000000000&&CommerceFeatures.Round(rule.Fixed,d.Commerce.Currency)==rule.Fixed,"نسبة أو مبلغ العمولة غير صالح");
            d.CommissionHistory.Add(System.Text.Json.JsonSerializer.Deserialize<CommissionSettings>(System.Text.Json.JsonSerializer.Serialize(d.Commissions))!);r.Version=d.Commissions.Version+1;d.Commissions=r;s.Audit(d,u,"تعديل سياسة العمولات إلى الإصدار "+r.Version);return r;
        }));
        api.MapGet("/commissions/ledger",(Store s,HttpContext c)=>s.Read(d=>{
            var u=ChatFeatures.Actor(d,c);ChatFeatures.Need(ChatFeatures.Has(u,"commissions.manage"),"لا توجد صلاحية لعرض كشف العمولات",403);
            return d.Orders.OrderByDescending(o=>o.CreatedAt).Select(o=>new{o.Id,o.Number,o.Status,o.Currency,o.CustomerCommission,merchantCommission=o.MerchantCommissions.Values.Sum(),o.CourierCommission,o.CommissionVersion,o.Total,commissionTotal=o.CustomerCommission+o.MerchantCommissions.Values.Sum()+o.CourierCommission,earned=o.Status=="Delivered"}).ToArray();
        }));
        api.MapPut("/policies",(StorePolicies r,Store s,HttpContext c)=>s.Write(d=>{
            var u=ChatFeatures.Actor(d,c);ChatFeatures.Need(ChatFeatures.Has(u,"policies.manage"),"لا توجد صلاحية لتعديل الاتفاقيات",403);
            ChatFeatures.Need(new[]{r.Registration,r.Terms,r.Deletion}.All(v=>v is not null&&v.Length is >=20 and <=12000),"اكتب نصوص الاتفاقية والشروط وحذف الحساب بين 20 و12000 حرف");
            d.PolicyHistory.Add(System.Text.Json.JsonSerializer.Deserialize<StorePolicies>(System.Text.Json.JsonSerializer.Serialize(d.Policies))!);r.Version=d.Policies.Version+1;d.Policies=r;s.Audit(d,u,"تحديث ونشر سياسة المتجر إصدار "+r.Version);return r;
        }));
        api.MapPost("/enrollment",(EnrollmentInput r,Store s)=>s.Write(d=>{
            ChatFeatures.Need(d.Users.Count>0,"يجب إعداد المتجر أولًا",409);ChatFeatures.Need(r.Role is "Customer" or "Merchant" or "Courier","نوع الحساب غير مسموح",403);
            ChatFeatures.Need(r.Role!="Merchant"||d.Policies.AllowMerchants,"تسجيل التجار غير متاح حاليًا",403);ChatFeatures.Need(r.Role!="Courier"||d.Policies.AllowCouriers,"تسجيل المناديب غير متاح حاليًا",403);
            Agreement(d,r.Accepted,r.PolicyVersion,r.CommissionVersion);
            ChatFeatures.Need(r.Phone is not null&&r.Phone.Trim().Length is >=8 and <=20&&r.BusinessName is not null&&r.BusinessName.Length<=100,"أدخل رقم تواصل صالحًا");if(r.Role=="Merchant")ChatFeatures.Need(r.BusinessName!.Trim().Length>=2,"أدخل اسم المتجر");
            ChatFeatures.Need(!d.Users.Any(u=>u.Email==r.Email.Trim().ToLowerInvariant()),"البريد مسجل بالفعل",409);
            var u=factory(r.Name,r.Email,r.Password,r.Role);u.Active=r.Role=="Customer"&&d.Policies.AutoApproveCustomers;u.PolicyVersion=r.PolicyVersion??0;u.AcceptedAt=r.Accepted?DateTime.UtcNow:null;
            d.Users.Add(u);var a=new Enrollment{Id=Guid.NewGuid().ToString("N"),UserId=u.Id,Name=u.Name,Email=u.Email,Role=u.Role,Phone=r.Phone!.Trim(),BusinessName=r.BusinessName!.Trim(),Status=u.Active?"Approved":"Pending",PolicyVersion=r.PolicyVersion??0,CommissionVersion=r.CommissionVersion??0,Accepted=r.Accepted};d.Enrollments.Add(a);return new{a.Id,a.Status};
        })).RequireRateLimiting("auth");
        api.MapGet("/enrollments",(Store s,HttpContext c)=>s.Read(d=>{var u=ChatFeatures.Actor(d,c);ChatFeatures.Need(ChatFeatures.Has(u,"registrations.manage"),"لا توجد صلاحية لمراجعة التسجيل",403);return d.Enrollments.OrderByDescending(a=>a.At).ToArray();}));
        api.MapPost("/enrollments/{id}/review",(string id,EnrollmentReview r,Store s,HttpContext c)=>s.Write(d=>{
            var u=ChatFeatures.Actor(d,c);ChatFeatures.Need(ChatFeatures.Has(u,"registrations.manage"),"لا توجد صلاحية لمراجعة التسجيل",403);ChatFeatures.Need(r.Decision is "Approved" or "Rejected"&&r.Note is not null&&r.Note.Length<=500,"القرار غير صالح");
            var a=d.Enrollments.FirstOrDefault(a=>a.Id==id)??throw new RuleException("طلب التسجيل غير موجود",404);ChatFeatures.Need(a.Status=="Pending","سبق مراجعة هذا الطلب",409);if(r.Decision=="Rejected")ChatFeatures.Need(r.Note!.Trim().Length>=3,"اكتب سبب الرفض");
            var target=d.Users.First(x=>x.Id==a.UserId);ChatFeatures.Need(target.Role==a.Role&&target.Role is "Customer" or "Merchant" or "Courier","نوع الحساب تغيّر؛ راجعه من إدارة المستخدمين",409);
            a.Status=r.Decision;a.Note=r.Note!;a.ReviewedAt=DateTime.UtcNow;a.ReviewerId=u.Id;target.Active=r.Decision=="Approved";if(!target.Active)d.Sessions.RemoveAll(x=>x.UserId==target.Id);s.Audit(d,u,"مراجعة تسجيل "+a.Role+": "+a.Status);return a;
        }));
    }
}
public sealed class FeeRule{public bool Enabled{get;set;}public decimal Percent{get;set;}public decimal Fixed{get;set;}}
public sealed class CommissionSettings{public int Version{get;set;}=1;public FeeRule Customer{get;set;}=new();public FeeRule Merchant{get;set;}=new();public FeeRule Courier{get;set;}=new();}
public sealed class StorePolicies{public int Version{get;set;}=1;public bool Published{get;set;}public bool RequireAcceptance{get;set;}=true;public bool AutoApproveCustomers{get;set;}=true;public bool AllowMerchants{get;set;}=true;public bool AllowCouriers{get;set;}=true;public string Registration{get;set;}="بتسجيلك تقر بصحة بياناتك، وتطلع على الرسوم والعمولات المعلنة لدورك. حسابات التجار والمناديب تحتاج موافقة الإدارة قبل التفعيل.";public string Terms{get;set;}="تظهر أسعار المنتجات والتوصيل وعمولة العميل قبل تأكيد الطلب. يراجع المتجر إيصالات الدفع يدويًا، ولا يعد إرفاق الإيصال تأكيدًا لوصول المبلغ.";public string Deletion{get;set;}="يمكن طلب حذف الحساب من حسابي بعد إتمام الالتزامات والطلبات المفتوحة. تزال البيانات التعريفية ورسائل الحساب وفق آلية الحذف، وتُحتفظ بالسجلات المالية الضرورية. يحدد المشغل مدة الاحتفاظ ووسيلة التواصل قبل النشر.";}
public sealed class Enrollment{public string Id{get;set;}="";public string UserId{get;set;}="";public string Name{get;set;}="";public string Email{get;set;}="";public string Role{get;set;}="Customer";public string Phone{get;set;}="";public string BusinessName{get;set;}="";public string Status{get;set;}="Pending";public int PolicyVersion{get;set;}public int CommissionVersion{get;set;}public bool Accepted{get;set;}public DateTime At{get;set;}=DateTime.UtcNow;public string Note{get;set;}="";public DateTime? ReviewedAt{get;set;}public string ReviewerId{get;set;}="";}
public sealed record EnrollmentInput(string Name,string Email,string Password,string Role,string Phone,string BusinessName,bool Accepted,int? PolicyVersion,int? CommissionVersion);
public sealed record EnrollmentReview(string Decision,string Note);
