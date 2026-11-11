using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.StaticFiles;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<Store>();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddRateLimiter(o => {
    o.RejectionStatusCode = 429;
    o.AddPolicy("auth", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "local", _ => new FixedWindowRateLimiterOptions { PermitLimit = 15, Window = TimeSpan.FromMinutes(1) }));
});
var app = builder.Build();
app.Use(async (ctx, next) => {
    ctx.Response.Headers.XContentTypeOptions = "nosniff";
    ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    ctx.Response.Headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: blob: https://tile.openstreetmap.org https://images.unsplash.com; media-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self'; manifest-src 'self'; connect-src 'self' https: http://127.0.0.1:* appassets:; frame-ancestors 'none'; base-uri 'self'";
    try { await next(); }
    catch (RuleException e) { if (!ctx.Response.HasStarted) { ctx.Response.StatusCode = e.Status; await ctx.Response.WriteAsJsonAsync(new { error = e.Message }); } }
});
var contentTypeProvider = new FileExtensionContentTypeProvider();
contentTypeProvider.Mappings[".webmanifest"] = "application/manifest+json";
app.UseCors(); app.UseRateLimiter(); app.UseDefaultFiles(); app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = contentTypeProvider });
var api = app.MapGroup("/api");
api.MapGet("/health", () => new { name = "التسوق", status = "ok", version = "1.7.0", platforms = new[] { "iOS", "Android", "Web/PWA" } });
api.MapGet("/setup", (Store s) => new { required = s.Read(d => d.Users.Count == 0) });
api.MapPost("/setup", (SetupRequest r, Store s, HttpContext c) => s.Write(d => {
    Require(d.Users.Count == 0, "تم إعداد المتجر مسبقًا", 409);
    var expected = Environment.GetEnvironmentVariable("MATJAR_SETUP_TOKEN");
    Require(!string.IsNullOrEmpty(expected) && SafeEqual(expected, r.Token), "رمز الإعداد غير صحيح", 403);
    var u = StoreHelper.NewUser(r.Name, r.Email, r.Password, "Admin"); d.Users.Add(u);
    s.Audit(d, u, "إنشاء المدير الأول"); return Session(d, u);
})).RequireRateLimiting("auth");
api.MapPost("/auth/register", (RegisterRequest r, Store s) => s.Write(d => {
    Require(d.Users.Count > 0, "يجب إعداد المتجر أولًا", 409);
    Require(!d.Users.Any(u => u.Email == Email(r.Email)), "البريد الإلكتروني مسجل بالفعل", 409);
    GovernanceFeatures.Agreement(d, r.Accepted, r.PolicyVersion, r.CommissionVersion);
    
    // إنشاء الحساب بحالة مجمدة لحين التنشيط والموافقة من الآدمن
    var u = StoreHelper.NewUser(r.Name, r.Email, r.Password, "Customer");
    u.Active = false; // مجمد لحين التنشيط من الإدارة
    u.PolicyVersion = r.PolicyVersion ?? 0;
    u.AcceptedAt = r.Accepted ? DateTime.UtcNow : null;
    d.Users.Add(u);
    
    d.Enrollments.Add(new Enrollment {
        Id = Guid.NewGuid().ToString("N"),
        UserId = u.Id,
        Name = u.Name,
        Email = u.Email,
        Role = "Customer",
        Status = "Pending",
        Accepted = r.Accepted,
        PolicyVersion = r.PolicyVersion ?? 0,
        CommissionVersion = r.CommissionVersion ?? 0
    });
    
    // إرسال إشعار تنبيه للإدارة
    var adminIds = d.Users.Where(x => x.Role == "Admin").Select(x => x.Id).ToHashSet();
    var notice = new Notice {
        Id = Guid.NewGuid().ToString("N"),
        Title = "🔔 تسجيل مستخدم جديد (مجمد بانتظار التنشيط)",
        Message = $"قام المستخدم {u.Name} ({u.Email}) بإنشاء حساب جديد. الحساب مجمد حالياً وبانتظار موافقة وتنشيط الإدارة.",
        Audience = "Admin",
        Recipients = adminIds,
        At = DateTime.UtcNow
    };
    d.Notifications.Add(notice);
    s.Audit(d, u, $"تسجيل مستخدم جديد مجمد: {u.Name} ({u.Email})");
    
    return new { ok = true, pending = true, message = "تم تسجيل حسابك بنجاح. حسابك حالياً مجمد وبانتظار التنشيط والموافقة من قِبل إدارة المتجر." };
})).RequireRateLimiting("auth");
api.MapPost("/auth/login", (LoginRequest r, Store s) => s.Write(d => {
    var u = d.Users.FirstOrDefault(u => u.Email == Email(r.Email) || (u.Name.Equals(r.Email.Trim(), StringComparison.OrdinalIgnoreCase) && u.Role == "Admin"));
    Require(u is not null, "بيانات الدخول غير صحيحة", 401);
    Require(PasswordOk(r.Password, u!), "بيانات الدخول غير صحيحة", 401);
    Require(u!.Active, "حسابك مجمد حالياً وبانتظار التنشيط والموافقة من قِبل إدارة المتجر.", 403);
    return Session(d, u!);
})).RequireRateLimiting("auth");

api.MapPost("/auth/forgot-password", (ForgotPasswordRequest r, Store s) => s.Write(d => {
    var query = (r.EmailOrUsername ?? "").Trim();
    Require(!string.IsNullOrEmpty(query), "أدخل اسم المستخدم أو البريد الإلكتروني", 400);
    var u = d.Users.FirstOrDefault(x => x.Email == Email(query) || x.Name.Equals(query, StringComparison.OrdinalIgnoreCase));
    var userName = u != null ? u.Name : query;
    var userEmail = u != null ? u.Email : query;
    var adminIds = d.Users.Where(x => x.Role == "Admin").Select(x => x.Id).ToHashSet();
    var notice = new Notice {
        Id = Guid.NewGuid().ToString("N"),
        Title = "⚠️ طلب استعادة / نسيان كلمة المرور",
        Message = $"طلب المستخدم أو العميل {userName} ({userEmail}) إعادة تعيين كلمة المرور لحسابه.",
        Audience = "Admin",
        Recipients = adminIds,
        At = DateTime.UtcNow
    };
    d.Notifications.Add(notice);
    return new { ok = true, message = "تم رفع طلب استعادة كلمة المرور إلى إدارة المتجر بنجاح. سيتم مراجعة طلبك والتواصل معك." };
})).RequireRateLimiting("auth");

api.MapPost("/users/{id}/activate", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    target.Active = true;
    s.Audit(d, u, $"تنشيط حساب المستخدم: {target.Name} ({target.Email})");
    return PublicUser(target);
}));
api.MapPost("/auth/logout", (Store s, HttpContext c) => s.Write(d => { var hash = TokenHash(Bearer(c)); d.Sessions.RemoveAll(x => x.Hash == hash); return new { ok = true }; }));
api.MapGet("/me", (Store s, HttpContext c) => s.Read(d => PublicUser(Actor(d, c))));
api.MapPut("/me/profile", (ProfileUpdate r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    Require(!string.IsNullOrWhiteSpace(r.Name) && r.Name.Trim().Length is >= 2 and <= 80, "الاسم يجب أن يكون بين حرفين و80 حرفاً");
    if (!string.IsNullOrWhiteSpace(r.Email) && Email(r.Email) != u.Email) {
        Require(r.Email.Length <= 200 && r.Email.Contains('@') && !r.Email.Any(char.IsWhiteSpace), "البريد الإلكتروني غير صالح");
        Require(!d.Users.Any(x => x.Id != u.Id && x.Email == Email(r.Email)), "هذا البريد مسجل بالفعل لحساب آخر", 409);
        u.Email = Email(r.Email);
    }
    if (!string.IsNullOrEmpty(r.NewPassword)) {
        Require(PasswordOk(r.CurrentPassword, u), "كلمة المرور الحالية غير صحيحة", 403);
        Require(r.NewPassword.Length is >= 6 and <= 128, "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف");
        var salt = RandomNumberGenerator.GetBytes(16);
        u.Salt = Convert.ToHexString(salt);
        u.Hash = Convert.ToHexString(Rfc2898DeriveBytes.Pbkdf2(r.NewPassword, salt, 210000, HashAlgorithmName.SHA256, 32));
    }
    u.Name = r.Name.Trim();
    s.Audit(d, u, "تعديل بيانات الحساب الشخصي: " + u.Name);
    return PublicUser(u);
}));

api.MapGet("/products", (Store s) => s.Read(d => d.Products.Where(p => p.Active && d.Users.Any(u => u.Id == p.MerchantId && u.Active)).ToArray()));
api.MapGet("/dashboard", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c);
    var orders = VisibleOrders(d, u).Select(o => ViewOrder(o, u)).ToArray();
    return new { user = PublicUser(u), products = d.Products.Where(p => u.Role == "Admin" || p.MerchantId == u.Id).ToArray(), orders,
        users = Has(u, "users.manage") ? d.Users.Select(PublicUser).ToArray() : [],
        staff = Has(u, "users.manage") ? d.Staff.OrderByDescending(x => x.CreatedAt).ToArray() : [],
        banners = d.Banners.Where(b => b.Active).OrderBy(b => b.SortOrder).ToArray(),
        audit = Has(u, "audit.read") ? d.Audit.TakeLast(100).Reverse().ToArray() : [], permissions = Permissions.All };
}));
api.MapPost("/products", (ProductInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "products.write"); ValidateProduct(r,d.Commerce);
    var merchant = u.Role == "Admin" ? r.MerchantId : u.Id;
    Require(d.Users.Any(x => x.Id == merchant && x.Active && x.Role is "Merchant" or "Admin"), "اختر تاجرًا فعالًا");
    var p = new Product { Id = Guid.NewGuid().ToString("N"), MerchantId = merchant, Name = r.Name.Trim(), Category = r.Category.Trim(), Price = r.Price, Stock = r.Stock, Icon = Icon(r.Icon), Image = r.Image ?? "", Description = r.Description?.Trim() ?? "", Active = true };
    d.Products.Add(p); s.Audit(d, u, "إضافة منتج: " + p.Name); return p;
}));
api.MapPut("/products/{id}", (string id, ProductInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "products.write"); ValidateProduct(r,d.Commerce); var p = FindProduct(d, id);
    Require(u.Role == "Admin" || p.MerchantId == u.Id, "المنتج يتبع متجرًا آخر", 403);
    p.Name = r.Name.Trim(); p.Category = r.Category.Trim(); p.Price = r.Price; p.Stock = r.Stock; p.Icon = Icon(r.Icon); p.Image = r.Image ?? ""; p.Description = r.Description?.Trim() ?? ""; p.Active = r.Active;
    s.Audit(d, u, "تعديل منتج: " + p.Name); return p;
}));
api.MapPost("/orders", (Checkout r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "orders.create");
    if(r.Destination is not null) ValidateGeo(r.Destination);
    Require(r.Currency is null||r.Currency==d.Commerce.Currency,"تغيرت عملة المتجر؛ حدّث السلة قبل التأكيد",409);
    var payment=d.PaymentMethods.FirstOrDefault(m=>m.Id==r.PaymentMethodId&&m.Active)??throw new RuleException("اختر طريقة دفع فعالة",409);
    Require(r.Items.Count is > 0 and <= 50, "السلة غير صالحة");
    Require(r.Address.Trim().Length is >= 8 and <= 500 && r.Phone.Trim().Length is >= 8 and <= 20, "أدخل عنوانًا ورقم هاتف صالحين");
    var lines = new List<OrderLine>();
    foreach (var group in r.Items.GroupBy(x => x.ProductId)) {
        var qty = group.Sum(x => x.Qty); Require(group.All(x => x.Qty > 0) && qty <= 100, "الكمية غير صالحة");
        var p = FindProduct(d, group.Key); Require(p.Active && p.Stock >= qty && d.Users.Any(x => x.Id == p.MerchantId && x.Active), "المخزون غير كاف: " + p.Name, 409);
        lines.Add(new OrderLine { ProductId = p.Id, MerchantId = p.MerchantId, Name = p.Name, Price = p.Price, Qty = qty, Icon = p.Icon, Image = p.Image });
    }
    foreach (var l in lines) FindProduct(d, l.ProductId).Stock -= l.Qty;
    var o = new Order { Id = Guid.NewGuid().ToString("N"), Number = "TS-" + DateTime.UtcNow.ToString("yyMMdd") + "-" + (d.Orders.Count + 1).ToString("D4"), CustomerId = u.Id, CustomerName = u.Name, Address = r.Address.Trim(), Phone = r.Phone.Trim(), Lines = lines, Pin = RandomNumberGenerator.GetInt32(100000, 1000000).ToString() };
    o.Currency=d.Commerce.Currency;o.DeliveryFee=d.Commerce.DeliveryFee;o.PaymentMethodId=payment.Id;o.PaymentMethodName=payment.Name;o.PaymentType=payment.Type;o.PaymentInstructions=payment.Instructions;o.ReceiptRequired=payment.ReceiptRequired;o.PaymentStatus=payment.Type=="Cash"?"Unpaid":"AwaitingReceipt";
    if(r.Destination is not null) o.Destination=new GeoPoint(r.Destination.Latitude,r.Destination.Longitude,r.Destination.Accuracy,DateTime.UtcNow);
    GovernanceFeatures.Snapshot(d,o,r.CommissionVersion);d.Orders.Add(o); s.Audit(d, u, "طلب جديد " + o.Number); return ViewOrder(o, u);
}));
api.MapPost("/orders/{id}/ready", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "orders.prepare"); var o = FindOrder(d, id);
    Require(o.Status == "Preparing", "لا يمكن تجهيز الطلب في حالته الحالية", 409);
    Require(o.PaymentType=="Cash"||o.PaymentStatus=="Paid","يجب اعتماد الدفع قبل تجهيز الطلب",409);
    Require(u.Role == "Admin" || o.Lines.Any(l => l.MerchantId == u.Id), "الطلب لا يتبع متجرك", 403);
    if (u.Role == "Admin") o.ReadyMerchants = o.Lines.Select(l => l.MerchantId).ToHashSet(); else o.ReadyMerchants.Add(u.Id);
    if (o.Lines.All(l => o.ReadyMerchants.Contains(l.MerchantId))) o.Status = "Ready";
    s.Audit(d, u, "تجهيز " + o.Number); return ViewOrder(o, u);
}));
api.MapPost("/orders/{id}/assign", (string id, Assignment r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "delivery.assign"); var o = FindOrder(d, id);
    Require(o.Status is "Ready" or "Assigned", "جهّز الطلب أولًا", 409);
    Require(d.Users.Any(x => x.Id == r.CourierId && x.Role == "Courier" && x.Active), "اختر مندوبًا فعالًا");
    o.Sharing=false; o.CourierLocation=null; o.CourierId = r.CourierId; o.Status = "Assigned"; s.Audit(d, u, "إسناد توصيل " + o.Number); return ViewOrder(o, u);
}));
api.MapPost("/orders/{id}/pickup", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "delivery.update"); var o = FindOrder(d, id);
    Require(o.CourierId == u.Id || u.Role == "Admin", "المهمة لمندوب آخر", 403); Require(o.Status == "Assigned", "حالة الطلب لا تسمح بالاستلام", 409);
    o.Status = "OnWay"; s.Audit(d, u, "استلام المندوب " + o.Number); return ViewOrder(o, u);
}));
api.MapPost("/orders/{id}/deliver", (string id, Delivery r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "delivery.update"); var o = FindOrder(d, id);
    Require(o.CourierId == u.Id || u.Role == "Admin", "المهمة لمندوب آخر", 403); Require(o.Status == "OnWay", "حالة الطلب لا تسمح بالتسليم", 409);
    Require(SafeEqual(o.Pin, r.Pin), "رمز التسليم غير صحيح"); o.Sharing=false; o.CourierLocation=null; o.Status = "Delivered"; o.DeliveredAt = DateTime.UtcNow;
    s.Audit(d, u, "تسليم " + o.Number); return ViewOrder(o, u);
}));
api.MapPost("/orders/{id}/cancel", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); var o = FindOrder(d, id);
    Require((o.CustomerId == u.Id && Has(u, "orders.cancel")) || Has(u, "orders.manage"), "لا توجد صلاحية للإلغاء", 403);
    Require(o.Status is "Preparing" or "Ready", "لا يمكن إلغاء طلب بعد إسناده للتوصيل", 409);
    foreach (var l in o.Lines) FindProduct(d, l.ProductId).Stock += l.Qty;
    o.Status = "Cancelled"; s.Audit(d, u, "إلغاء " + o.Number); return ViewOrder(o, u);
}));
api.MapPost("/users", (UserInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u); Require(Permissions.Roles.Contains(r.Role), "الدور غير صالح");
    Require(!d.Users.Any(x => x.Email == Email(r.Email)), "البريد مسجل بالفعل", 409);
    var added = StoreHelper.NewUser(r.Name, r.Email, r.Password, r.Role); d.Users.Add(added); s.Audit(d, u, "إنشاء مستخدم " + added.Name); return PublicUser(added);
}));
api.MapPut("/users/{id}", (string id, UserChange r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u); var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    Require(Permissions.Roles.Contains(r.Role), "الدور غير صالح"); Require(id != u.Id, "تعديل حسابك الإداري الحالي محمي");
    Require(r.Overrides.Keys.All(Permissions.All.ContainsKey), "صلاحية غير معروفة");
    if (target.Role == "Admin" && target.Active && (!r.Active || r.Role != "Admin")) Require(d.Users.Count(x => x.Role == "Admin" && x.Active) > 1, "يجب الإبقاء على مدير فعال");
    var changedRole = target.Role != r.Role;
    target.Role = r.Role; target.Active = r.Active; target.Overrides = r.Overrides;
    if (!target.Active || changedRole) d.Sessions.RemoveAll(x => x.UserId == id);
    s.Audit(d, u, "تعديل الصلاحيات: " + target.Name); return PublicUser(target);
}));

// Staff Management Endpoints (تطوير وإدارة عمال المتجر تفصيلياً)
api.MapGet("/staff", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); CheckAdmin(u); return d.Staff.OrderByDescending(x => x.CreatedAt).ToArray();
}));
api.MapPost("/staff", (StaffInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    Require(!string.IsNullOrWhiteSpace(r.FullName) && r.FullName.Trim().Length is >= 2 and <= 100, "أدخل اسم العامل الرباعي أو الثلاثي بشكل صحيح");
    Require(!string.IsNullOrWhiteSpace(r.JobTitle) && r.JobTitle.Trim().Length is >= 2 and <= 80, "أدخل المسمى الوظيفي للعامل");
    Require(!string.IsNullOrWhiteSpace(r.Phone) && r.Phone.Trim().Length is >= 8 and <= 25, "أدخل رقم هاتف صالح");
    var member = new StaffMember {
        Id = Guid.NewGuid().ToString("N"),
        UserId = r.UserId ?? "",
        FullName = r.FullName.Trim(),
        JobTitle = r.JobTitle.Trim(),
        Department = r.Department?.Trim() ?? "العمليات والمخزن",
        Phone = r.Phone.Trim(),
        NationalId = r.NationalId?.Trim() ?? "",
        Shift = r.Shift?.Trim() ?? "صباحي",
        WorkingHours = r.WorkingHours?.Trim() ?? "8 ساعات",
        MonthlySalary = r.MonthlySalary,
        Status = r.Status is "Active" or "OnLeave" or "Terminated" ? r.Status : "Active",
        Notes = r.Notes?.Trim() ?? "",
        Address = r.Address?.Trim() ?? "",
        CreatedAt = DateTime.UtcNow
    };
    d.Staff.Add(member); s.Audit(d, u, "إضافة ملف عامل في المتجر: " + member.FullName); return member;
}));
api.MapPut("/staff/{id}", (string id, StaffInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var member = d.Staff.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("ملف العامل غير موجود", 404);
    Require(!string.IsNullOrWhiteSpace(r.FullName) && r.FullName.Trim().Length is >= 2 and <= 100, "أدخل اسم العامل بشكل صحيح");
    Require(!string.IsNullOrWhiteSpace(r.JobTitle) && r.JobTitle.Trim().Length is >= 2 and <= 80, "أدخل المسمى الوظيفي للعامل");
    member.UserId = r.UserId ?? member.UserId;
    member.FullName = r.FullName.Trim();
    member.JobTitle = r.JobTitle.Trim();
    member.Department = r.Department?.Trim() ?? member.Department;
    member.Phone = r.Phone.Trim();
    member.NationalId = r.NationalId?.Trim() ?? member.NationalId;
    member.Shift = r.Shift?.Trim() ?? member.Shift;
    member.WorkingHours = r.WorkingHours?.Trim() ?? member.WorkingHours;
    member.MonthlySalary = r.MonthlySalary;
    member.Status = r.Status is "Active" or "OnLeave" or "Terminated" ? r.Status : member.Status;
    member.Notes = r.Notes?.Trim() ?? "";
    member.Address = r.Address?.Trim() ?? "";
    s.Audit(d, u, "تحديث ملف العامل: " + member.FullName); return member;
}));
api.MapDelete("/staff/{id}", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var member = d.Staff.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("ملف العامل غير موجود", 404);
    d.Staff.Remove(member); s.Audit(d, u, "حذف ملف العامل: " + member.FullName); return new { ok = true };
}));

// Ads & Banners Endpoints (إدارة الإعلانات وبانرات المتجر)
api.MapGet("/banners", (Store s) => s.Read(d => d.Banners.Where(b => b.Active).OrderBy(b => b.SortOrder).ToArray()));
api.MapGet("/banners/all", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); Check(u, "appearance.manage"); return d.Banners.OrderBy(b => b.SortOrder).ToArray();
}));
api.MapPost("/banners", (BannerInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "appearance.manage");
    Require(!string.IsNullOrWhiteSpace(r.Title) && r.Title.Trim().Length is >= 2 and <= 100, "أدخل عنوان الإعلان");
    Require(!string.IsNullOrWhiteSpace(r.Image), "أرفق صورة الإعلان");
    var banner = new StoreBanner {
        Id = Guid.NewGuid().ToString("N"),
        Title = r.Title.Trim(),
        Subtitle = r.Subtitle?.Trim() ?? "",
        LinkUrl = r.LinkUrl?.Trim() ?? "",
        ButtonText = r.ButtonText?.Trim() ?? "اكتشف الآن",
        Image = r.Image,
        BgColor = string.IsNullOrEmpty(r.BgColor) ? "#087e66" : r.BgColor,
        TextColor = string.IsNullOrEmpty(r.TextColor) ? "#ffffff" : r.TextColor,
        Active = r.Active,
        SortOrder = r.SortOrder,
        CreatedAt = DateTime.UtcNow
    };
    d.Banners.Add(banner); s.Audit(d, u, "إضافة إعلان جديد: " + banner.Title); return banner;
}));
api.MapPut("/banners/{id}", (string id, BannerInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "appearance.manage");
    var banner = d.Banners.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("الإعلان غير موجود", 404);
    Require(!string.IsNullOrWhiteSpace(r.Title) && r.Title.Trim().Length is >= 2 and <= 100, "أدخل عنوان الإعلان");
    banner.Title = r.Title.Trim();
    banner.Subtitle = r.Subtitle?.Trim() ?? "";
    banner.LinkUrl = r.LinkUrl?.Trim() ?? "";
    banner.ButtonText = r.ButtonText?.Trim() ?? "اكتشف الآن";
    if (!string.IsNullOrEmpty(r.Image)) banner.Image = r.Image;
    banner.BgColor = string.IsNullOrEmpty(r.BgColor) ? banner.BgColor : r.BgColor;
    banner.TextColor = string.IsNullOrEmpty(r.TextColor) ? banner.TextColor : r.TextColor;
    banner.Active = r.Active;
    banner.SortOrder = r.SortOrder;
    s.Audit(d, u, "تعديل الإعلان: " + banner.Title); return banner;
}));
api.MapDelete("/banners/{id}", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "appearance.manage");
    var banner = d.Banners.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("الإعلان غير موجود", 404);
    d.Banners.Remove(banner); s.Audit(d, u, "حذف الإعلان: " + banner.Title); return new { ok = true };
}));

api.MapDelete("/me", ([Microsoft.AspNetCore.Mvc.FromBody] DeleteAccount r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Require(PasswordOk(r.Password, u), "كلمة المرور غير صحيحة", 403);
    Require(u.Role != "Admin", "تواصل مع إدارة المتجر لنقل الإدارة قبل حذف حساب المدير");
    Require(!d.Orders.Any(o => (o.CustomerId == u.Id || o.CourierId == u.Id || o.Lines.Any(l => l.MerchantId == u.Id)) && o.Status is not ("Delivered" or "Cancelled")), "أكمل الطلبات المفتوحة قبل حذف الحساب", 409);
    foreach(var a in d.Enrollments.Where(a=>a.UserId==u.Id)){a.Name="حساب محذوف";a.Email="";a.Phone="";a.BusinessName="";}u.Active = false; u.Name = "حساب محذوف"; u.Email = "deleted-" + u.Id; u.Hash = ""; u.Salt = ""; d.Sessions.RemoveAll(x => x.UserId == u.Id);
    foreach (var p in d.Products.Where(p => p.MerchantId == u.Id)) p.Active = false;
    foreach (var o in d.Orders.Where(o => o.CustomerId == u.Id)) { o.CustomerName = "حساب محذوف"; o.Address = ""; o.Phone = ""; o.Destination=null; o.CourierLocation=null; o.Sharing=false; }
    foreach(var t in d.Tickets) { if(t.UserId==u.Id) t.Name="حساب محذوف"; t.Messages=t.Messages.Select(m=>m.UserId==u.Id?new TicketMessage(m.UserId,"حساب محذوف","حُذفت رسالة صاحب الحساب",m.At):m).ToList(); }
    foreach(var m in d.ChatMessages.Where(m=>m.SenderId==u.Id)){if(m.Mime!="")File.Delete(s.MediaFile(m.Id));m.Mime="";m.Body="حُذفت الرسالة";m.Kind="Text";m.SenderName="حساب محذوف";}
    s.Audit(d, u, "حذف الحساب مع الاحتفاظ بسجل الطلبات المحاسبي"); return new { ok = true };
}));
api.MapPut("/orders/{id}/destination", (string id, GeoInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d,c); var o = FindOrder(d,id);
    Require(o.CustomerId == u.Id, "الموقع لصاحب الطلب فقط",403);
    Require(o.Status is "Preparing" or "Ready", "لا يمكن تغيير الموقع بعد إسناد المندوب",409);
    ValidateGeo(r); o.Destination = new GeoPoint(r.Latitude,r.Longitude,r.Accuracy,DateTime.UtcNow); return new {ok=true};
}));
api.MapGet("/orders/{id}/tracking", (string id, Store s, HttpContext c) => s.Read(d => {
    var u=Actor(d,c); var o=FindOrder(d,id); CheckTracking(u,o);
    return new {o.Id,o.Status,o.Destination, courierLocation=o.Status is "Assigned" or "OnWay" ? o.CourierLocation : null, sharing=o.Sharing && o.Status is "Assigned" or "OnWay"};
}));
api.MapPut("/orders/{id}/location", (string id, GeoInput r, Store s, HttpContext c) => s.Write(d => {
    var u=Actor(d,c); var o=FindOrder(d,id); Check(u,"delivery.update");
    Require(u.Role=="Courier" && o.CourierId==u.Id,"الموقع للمندوب المسند فقط",403);
    Require(o.Status is "Assigned" or "OnWay","التوصيل غير نشط",409); ValidateGeo(r);
    o.CourierLocation=new GeoPoint(r.Latitude,r.Longitude,r.Accuracy,DateTime.UtcNow); o.Sharing=true; return new {ok=true};
}));
api.MapDelete("/orders/{id}/location", (string id, Store s, HttpContext c) => s.Write(d => {
    var u=Actor(d,c); var o=FindOrder(d,id); Require(o.CourierId==u.Id && u.Role=="Courier","المندوب المسند فقط",403);
    o.Sharing=false; o.CourierLocation=null; return new {ok=true};
}));
api.MapGet("/tickets", (Store s,HttpContext c)=>s.Read(d=>{
    var u=Actor(d,c); return d.Tickets.Where(t=>t.UserId==u.Id || Has(u,"support.manage")).OrderByDescending(t=>t.UpdatedAt).Select(t=>new {t.Id,t.UserId,t.Name,t.Subject,t.OrderId,t.Status,t.UpdatedAt,messages=Has(u,"chat.read")&&Has(u,"chat.support")?t.Messages:[]}).ToArray();
}));
api.MapPost("/tickets", (TicketInput r,Store s,HttpContext c)=>s.Write(d=>{
    var u=Actor(d,c); Check(u,"chat.support");Check(u,"chat.read");
    Require(r.Subject is not null&&r.Subject.Trim().Length is >=3 and <=120&&r.Message is not null&&r.Message.Length<=2000,"أدخل موضوعًا ورسالة صالحة");
    if(!string.IsNullOrWhiteSpace(r.Message)){Check(u,"chat.text");Require(r.Message.Trim().Length>=3,"الرسالة قصيرة");}else Require(Has(u,"chat.image")||Has(u,"chat.audio"),"لا توجد صلاحية لإرسال رسالة",403);
    if(!string.IsNullOrEmpty(r.OrderId)) Require(VisibleOrders(d,u).Any(o=>o.Id==r.OrderId),"الطلب غير متاح",403);
    var t=new SupportTicket {Id=Guid.NewGuid().ToString("N"),UserId=u.Id,Name=u.Name,Subject=Has(u,"chat.text")?r.Subject!.Trim():"طلب دعم",OrderId=r.OrderId};
    if(!string.IsNullOrWhiteSpace(r.Message))t.Messages.Add(new TicketMessage(u.Id,u.Name,r.Message.Trim(),DateTime.UtcNow));d.Tickets.Add(t);return t;
}));
api.MapPost("/tickets/{id}/reply", (string id,TicketReply r,Store s,HttpContext c)=>s.Write(d=>{
    var u=Actor(d,c);var t=d.Tickets.FirstOrDefault(t=>t.Id==id)??throw new RuleException("التذكرة غير موجودة",404);
    Require(t.UserId==u.Id || Has(u,"support.manage"),"التذكرة لحساب آخر",403);
    Check(u,"chat.support");Check(u,"chat.text");Require(t.Status!="Closed","التذكرة مغلقة",409);Require(r.Message.Trim().Length is >=1 and <=2000,"الرسالة غير صالحة");
    t.Messages.Add(new TicketMessage(u.Id,u.Name,r.Message.Trim(),DateTime.UtcNow));t.UpdatedAt=DateTime.UtcNow;
    s.Audit(d,u,"رد على تذكرة دعم");return t;
}));
api.MapPut("/tickets/{id}/status", (string id,TicketStatus r,Store s,HttpContext c)=>s.Write(d=>{
    var u=Actor(d,c);Check(u,"support.manage");var t=d.Tickets.FirstOrDefault(t=>t.Id==id)??throw new RuleException("التذكرة غير موجودة",404);
    Require(r.Status is "Open" or "Closed","الحالة غير صالحة"); t.Status=r.Status;t.UpdatedAt=DateTime.UtcNow;s.Audit(d,u,"تغيير حالة تذكرة دعم");return t;
}));
api.MapGet("/appearance",(Store s)=>s.Read(d=>d.Appearance));
api.MapPut("/appearance",(Appearance r,Store s,HttpContext c)=>s.Write(d=>{
    var u=Actor(d,c);Check(u,"appearance.manage");
    Require(!string.IsNullOrWhiteSpace(r.StoreName)&&r.StoreName.Trim().Length<=60,"اسم المتجر غير صالح");
    Require(new[]{r.Primary,r.Background,r.Ink}.All(v=>v is not null && System.Text.RegularExpressions.Regex.IsMatch(v,"^#[0-9a-fA-F]{6}$")),"الألوان غير صالحة");
    Require(new[]{"Tahoma","Arial","System","Serif"}.Contains(r.Font),"الخط غير صالح");
    Require(r.Logo is not null && r.Logo.Length<=450000,"حجم الصورة كبير");
    if(r.Logo!.Length>0){Require(r.Logo.StartsWith("data:image/png;base64,"),"الصورة يجب أن تكون PNG");byte[] bytes;try{bytes=Convert.FromBase64String(r.Logo[22..]);}catch{throw new RuleException("الصورة غير صالحة");}Require(bytes.Length>=24&&bytes.AsSpan(0,8).SequenceEqual(new byte[]{137,80,78,71,13,10,26,10}),"الصورة غير صالحة");var w=System.Buffers.Binary.BinaryPrimitives.ReadInt32BigEndian(bytes.AsSpan(16,4));var h=System.Buffers.Binary.BinaryPrimitives.ReadInt32BigEndian(bytes.AsSpan(20,4));Require(w is >0 and <=1200 && h is >0 and <=1200,"أبعاد الصورة غير صالحة");}
    r.StoreName=r.StoreName.Trim();
    r.Subtitle = r.Subtitle?.Trim() ?? "كل ما تحب، أقرب إليك";
    r.Announcement = r.Announcement?.Trim() ?? "";
    r.AnnouncementActive = r.AnnouncementActive;
    d.Appearance=r;s.Audit(d,u,"تحديث مظهر المتجر والاسم والشعار");return r;
}));
api.MapGet("/notifications",(Store s,HttpContext c)=>s.Read(d=>{
    var u=Actor(d,c);return d.Notifications.Where(n=>n.Recipients.Contains(u.Id)).OrderByDescending(n=>n.At).Take(100).Select(n=>new{n.Id,n.Title,n.Message,n.At,read=n.ReadBy.Contains(u.Id)}).ToArray();
}));
api.MapGet("/notifications/sent",(Store s,HttpContext c)=>s.Read(d=>{
    var u=Actor(d,c);Check(u,"notifications.send");return d.Notifications.OrderByDescending(n=>n.At).Take(100).Select(n=>new{n.Id,n.Title,n.Message,n.At,n.Audience,sentCount=n.Recipients.Count,readCount=n.ReadBy.Count}).ToArray();
}));
api.MapPost("/notifications",(NoticeInput r,Store s,HttpContext c)=>s.Write(d=>{
    var u=Actor(d,c);Check(u,"notifications.send");Require(r.Title.Trim().Length is >=2 and <=100&&r.Message.Trim().Length is >=2 and <=1000,"أدخل عنوانًا ورسالة صالحين");
    Require(new[]{"Customer","Courier","Merchant","All","User"}.Contains(r.Audience),"الفئة غير صالحة");
    var ids=d.Users.Where(x=>x.Active&&(r.Audience=="All"||r.Audience=="User"&&x.Id==r.UserId||x.Role==r.Audience)).Select(x=>x.Id).ToHashSet();Require(ids.Count>0,"لا يوجد مستلمون فعالون");
    var n=new Notice{Id=Guid.NewGuid().ToString("N"),Title=r.Title.Trim(),Message=r.Message.Trim(),Audience=r.Audience,Recipients=ids};d.Notifications.Add(n);s.Audit(d,u,"إرسال إشعار إلى "+ids.Count+" حساب");return new{id=n.Id,sentCount=ids.Count};
}));
api.MapPut("/notifications/{id}/read",(string id,Store s,HttpContext c)=>s.Write(d=>{
    var u=Actor(d,c);var n=d.Notifications.FirstOrDefault(n=>n.Id==id)??throw new RuleException("الإشعار غير موجود",404);Require(n.Recipients.Contains(u.Id),"الإشعار لحساب آخر",403);n.ReadBy.Add(u.Id);return new{ok=true};
}));

api.MapGet("/registration-fields", (Store s) => s.Read(d => {
    if (d.RegistrationFields.Count == 0) {
        d.RegistrationFields = [
            new() { Id = "name", Label = "الاسم الكامل", Type = "text", Required = true, Enabled = true, Placeholder = "أدخل اسمك الكريم", IsSystem = true },
            new() { Id = "email", Label = "اسم المستخدم أو البريد الإلكتروني", Type = "text", Required = true, Enabled = true, Placeholder = "you@example.com أو اسم المستخدم", IsSystem = true },
            new() { Id = "password", Label = "كلمة المرور", Type = "password", Required = true, Enabled = true, Placeholder = "كلمة المرور (6 أحرف فأكثر)", IsSystem = true },
            new() { Id = "phone", Label = "رقم الجوال للتواصل", Type = "tel", Required = true, Enabled = true, Placeholder = "05xxxxxxxx", IsSystem = false },
            new() { Id = "city", Label = "المدينة / المنطقة", Type = "text", Required = false, Enabled = true, Placeholder = "الرياض، جدة، مكة، القصيم...", IsSystem = false },
            new() { Id = "address", Label = "الحي والشارع", Type = "text", Required = false, Enabled = true, Placeholder = "اسم الحي والشارع", IsSystem = false },
            new() { Id = "accountType", Label = "نوع الحساب", Type = "select", Required = false, Enabled = true, Options = ["عميل تسوق", "شريك تاجر", "مندوب توصيل"], Placeholder = "اختر نوع الحساب", IsSystem = false },
            new() { Id = "commercialId", Label = "رقم السجل التجاري / الرخصة", Type = "text", Required = false, Enabled = false, Placeholder = "اختياري للتجار والمناديب", IsSystem = false },
            new() { Id = "notes", Label = "ملاحظات أو طلبات خاصة", Type = "textarea", Required = false, Enabled = false, Placeholder = "أية تفاصيل إضافية تود مشاركتها مع الإدارة", IsSystem = false }
        ];
    }
    return d.RegistrationFields;
}));

api.MapPut("/registration-fields", (List<RegistrationField> fields, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.RegistrationFields = fields;
    s.Audit(d, u, "تحديث خيارات وحقول نموذج تسجيل المستخدمين الجدد");
    return d.RegistrationFields;
}));

GovernanceFeatures.Map(api,StoreHelper.NewUser);
CommerceFeatures.Map(api);
ChatFeatures.Map(api);
app.Run();

static void ValidateGeo(GeoInput r) => Require(double.IsFinite(r.Latitude)&&double.IsFinite(r.Longitude)&&double.IsFinite(r.Accuracy)&&r.Latitude is >=-90 and <=90 && r.Longitude is >=-180 and <=180 && r.Accuracy is >=0 and <=10000,"الإحداثيات غير صالحة");
static void CheckTracking(User u,Order o) => Require(o.CustomerId==u.Id || (u.Role=="Courier"&&o.CourierId==u.Id) || u.Role=="Admin" || Has(u,"tracking.read"),"لا توجد صلاحية لعرض الموقع",403);

static void Require(bool value, string message, int status = 400) { if (!value) throw new RuleException(message, status); }
static string Email(string v) => v.Trim().ToLowerInvariant();
static string TokenHash(string v) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(v)));
static bool SafeEqual(string a, string b) => CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
static string Bearer(HttpContext c) => c.Request.Headers.Authorization.ToString().StartsWith("Bearer ") ? c.Request.Headers.Authorization.ToString()[7..] : "";
static User Actor(Data d, HttpContext c) {
    var hash = TokenHash(Bearer(c)); var session = d.Sessions.FirstOrDefault(x => x.Hash == hash && x.Expires > DateTime.UtcNow);
    return d.Users.FirstOrDefault(u => u.Id == session?.UserId && u.Active) ?? throw new RuleException("سجّل الدخول للمتابعة", 401);
}
static bool Has(User u, string p) => u.Role == "Admin" || (u.Overrides.TryGetValue(p, out var value) ? value : Permissions.Defaults(u.Role).Contains(p));
static void Check(User u, string p) => Require(Has(u, p), "ليست لديك صلاحية لهذه العملية", 403);
static void CheckAdmin(User u) => Require(u.Role == "Admin" && Has(u, "users.manage"), "إدارة المستخدمين للمدير فقط", 403);
static object PublicUser(User u) => new { u.Id, u.Name, u.Email, u.Role, u.Active, u.Overrides, permissions = Permissions.All.Keys.Where(k => Has(u, k)).ToArray() };
static object Session(Data d, User u) {
    d.Sessions.RemoveAll(x => x.Expires < DateTime.UtcNow);
    var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    d.Sessions.Add(new LoginSession { Hash = TokenHash(token), UserId = u.Id, Expires = DateTime.UtcNow.AddHours(12) });
    return new { token, user = PublicUser(u) };
}
static bool PasswordOk(string password, User u) => u.Hash.Length > 0 && password.Length <= 128 && SafeEqual(u.Hash, Convert.ToHexString(Rfc2898DeriveBytes.Pbkdf2(password, Convert.FromHexString(u.Salt), 210000, HashAlgorithmName.SHA256, 32)));
static Product FindProduct(Data d, string id) => d.Products.FirstOrDefault(p => p.Id == id) ?? throw new RuleException("المنتج غير موجود", 404);
static Order FindOrder(Data d, string id) => d.Orders.FirstOrDefault(o => o.Id == id) ?? throw new RuleException("الطلب غير موجود", 404);
static IEnumerable<Order> VisibleOrders(Data d, User u) => d.Orders.Where(o => u.Role == "Admin" || (u.Role == "Customer" && o.CustomerId == u.Id) || (u.Role == "Merchant" && o.Lines.Any(l => l.MerchantId == u.Id)) || (u.Role == "Courier" && o.CourierId == u.Id)).OrderByDescending(o => o.CreatedAt);
static object ViewOrder(Order o, User u) => new { o.Id, o.Number, o.Status, o.CustomerName, o.Currency,o.DeliveryFee,o.CustomerCommission,o.CommissionVersion,merchantCommission=u.Role=="Merchant"?o.MerchantCommissions.GetValueOrDefault(u.Id):u.Role=="Admin"?o.MerchantCommissions.Values.Sum():0,courierCommission=u.Role=="Courier"||u.Role=="Admin"?o.CourierCommission:0,o.PaymentMethodId,o.PaymentMethodName,o.PaymentType,o.PaymentInstructions,o.ReceiptRequired,o.PaymentStatus,receipts=o.CustomerId==u.Id||Has(u,"payments.review")?o.Receipts:[],paymentReviewNote=o.CustomerId==u.Id||Has(u,"payments.review")?o.PaymentReviewNote:"", destination = u.Role == "Merchant" ? null : o.Destination, address = u.Role == "Merchant" ? "" : o.Address, phone = u.Role == "Merchant" ? "" : o.Phone, lines = u.Role == "Merchant" ? o.Lines.Where(l => l.MerchantId == u.Id) : o.Lines, total = u.Role == "Merchant" ? o.Lines.Where(l => l.MerchantId == u.Id).Sum(l => l.Price * l.Qty) : o.Total, o.CourierId, o.CreatedAt, o.DeliveredAt, pin = o.CustomerId == u.Id || u.Role == "Admin" ? o.Pin : "", o.ReadyMerchants };
static string Icon(string value) => new[] { "bag", "shoe", "headphones", "watch", "shirt", "lamp", "coffee", "bottle" }.Contains(value) ? value : "bag";
static void ValidateProduct(ProductInput r,CommerceSettings settings) { Require(r.Name.Trim().Length is >= 2 and <= 100 && r.Category.Trim().Length is >= 2 and <= 50, "أدخل اسم المنتج وقسمه"); Require(r.Price is > 0 and <= 1000000000000 && CommerceFeatures.Round(r.Price,settings.Currency) == r.Price && r.Stock is >= 0 and <= 100000, "السعر أو المخزون غير صالح"); }

public static class StoreHelper {
    public static User NewUser(string name, string email, string password, string role) {
        if (name.Trim().Length < 2 || name.Trim().Length > 80) throw new RuleException("الاسم بين حرفين و80 حرفًا");
        if (email.Length > 200 || !email.Contains('@') || email.Any(char.IsWhiteSpace)) throw new RuleException("البريد الإلكتروني غير صالح");
        if (password.Length < 6 || password.Length > 128) throw new RuleException("كلمة المرور يجب ألا تقل عن 6 أحرف");
        var salt = RandomNumberGenerator.GetBytes(16);
        return new User { Id = Guid.NewGuid().ToString("N"), Name = name.Trim(), Email = email.Trim().ToLowerInvariant(), Role = role, Salt = Convert.ToHexString(salt), Hash = Convert.ToHexString(Rfc2898DeriveBytes.Pbkdf2(password, salt, 210000, HashAlgorithmName.SHA256, 32)) };
    }
}

public sealed class Store {
    private readonly object gate = new(); private readonly string path; private Data data;
    private static readonly JsonSerializerOptions json = new() { WriteIndented = true };
    public Store(IWebHostEnvironment env) {
        path = Environment.GetEnvironmentVariable("MATJAR_DATA") ?? Path.Combine(env.ContentRootPath, "App_Data", "store.json");
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        if (File.Exists(path)) {
            data = JsonSerializer.Deserialize<Data>(File.ReadAllText(path)) ?? new();
        } else {
            data = new();
            // تهيئة الحساب الآمن الرئيسي الافتراضي للمتجر: Ahmed / 583192
            var defaultAdmin = StoreHelper.NewUser("Ahmed", "ahmed@matjar.local", "583192", "Admin");
            data.Users.Add(defaultAdmin);
            data.Audit.Add(new AuditEntry(DateTime.UtcNow, defaultAdmin.Id, "Ahmed", "تهيئة حساب المدير الرئيسي"));
            File.WriteAllText(path, JsonSerializer.Serialize(data, json));
        }
    }
    public string MediaFile(string id) { if(!System.Text.RegularExpressions.Regex.IsMatch(id,"^[a-f0-9]{32}$")) throw new RuleException("معرف المرفق غير صالح"); var folder=Path.Combine(Path.GetDirectoryName(Path.GetFullPath(path))!,"chat-media");Directory.CreateDirectory(folder);return Path.Combine(folder,id+".bin"); }
    public T Read<T>(Func<Data, T> read) { lock (gate) return read(data); }
    public T Write<T>(Func<Data, T> write) { lock (gate) {
        var snapshot = JsonSerializer.Serialize(data, json);
        try { var result = write(data); var tmp = path + ".tmp"; File.WriteAllText(tmp, JsonSerializer.Serialize(data, json)); File.Move(tmp, path, true); return result; }
        catch { data = JsonSerializer.Deserialize<Data>(snapshot)!; throw; }
    } }
    public void Audit(Data d, User u, string action) { d.Audit.Add(new AuditEntry(DateTime.UtcNow, u.Id, u.Name, action)); if (d.Audit.Count > 10000) d.Audit.RemoveRange(0, d.Audit.Count - 10000); }
}
public static class Permissions {
    public static readonly string[] Roles = ["Customer", "Merchant", "Courier", "Support", "Admin"];
    public static readonly Dictionary<string, string> All = new() { ["commissions.manage"]="إدارة العمولات وكشفها",["policies.manage"]="إدارة الاتفاقيات وشروط المتجر",["registrations.manage"]="مراجعة تسجيل العملاء والتجار والمناديب",["commerce.manage"]="إدارة العملات واللغة وطرق الدفع",["payments.review"]="مراجعة إيصالات واعتماد الدفع",["chat.read"]="قراءة الدردشة", ["chat.delivery"]="دردشة العميل والمندوب", ["chat.support"]="دردشة الدعم", ["chat.text"]="إرسال نص في الدردشة", ["chat.image"]="إرسال صورة في الدردشة", ["chat.audio"]="إرسال تسجيل صوتي", ["chat.camera"]="التصوير داخل الدردشة", ["appearance.manage"] = "تعديل مظهر المتجر", ["notifications.send"] = "إرسال إشعارات", ["support.manage"] = "إدارة تذاكر الدعم", ["tracking.read"] = "عرض مواقع الطلبات", ["orders.create"] = "إنشاء طلب", ["orders.cancel"] = "إلغاء الطلب قبل التوصيل", ["orders.prepare"] = "تجهيز طلبات المتجر", ["orders.manage"] = "إدارة جميع الطلبات", ["products.write"] = "إضافة وتعديل المنتجات", ["delivery.assign"] = "إسناد مندوب التوصيل", ["delivery.update"] = "استلام وتسليم الشحنات", ["users.manage"] = "إدارة المستخدمين والصلاحيات", ["audit.read"] = "عرض سجل النشاط" };
    public static string[] Defaults(string role) => role switch { "Support" => [..ChatFeatures.ChatRights.Where(p=>p!="chat.delivery"),"support.manage"], "Customer" => [..ChatFeatures.ChatRights.Where(p=>true),"orders.create", "orders.cancel"], "Merchant" => [..ChatFeatures.ChatRights.Where(p=>p!="chat.delivery"),"products.write", "orders.prepare"], "Courier" => [..ChatFeatures.ChatRights.Where(p=>true),"delivery.update"], "Admin" => All.Keys.ToArray(), _ => [] };
}
public sealed class Data {
    public List<StorePolicies> PolicyHistory{get;set;}=[];
    public List<CommissionSettings> CommissionHistory{get;set;}=[];
    public CommissionSettings Commissions {get;set;}=new();
    public StorePolicies Policies{get;set;}=new();
    public List<Enrollment> Enrollments{get;set;}=[];
    public CommerceSettings Commerce {get;set;}=new();
    public List<PaymentMethod> PaymentMethods {get;set;}=[new()];
    public Dictionary<string,InterfaceDesign> Designs {get;set;}=[];
    public List<ChatMessage> ChatMessages {get;set;}=[];
    public Appearance Appearance {get;set;}=new();
    public List<StoreBanner> Banners {get;set;}=[];
    public List<StaffMember> Staff {get;set;}=[];
    public List<Notice> Notifications {get;set;}=[];
    public List<SupportTicket> Tickets { get; set; } = [];
    public List<User> Users { get; set; } = [];
    public List<Product> Products { get; set; } = [];
    public List<Order> Orders { get; set; } = [];
    public List<LoginSession> Sessions { get; set; } = [];
    public List<AuditEntry> Audit { get; set; } = [];
    public List<RegistrationField> RegistrationFields { get; set; } = [];
}
public sealed class User { public int PolicyVersion{get;set;}public DateTime? AcceptedAt{get;set;}public string Id { get; set; } = ""; public string Name { get; set; } = ""; public string Email { get; set; } = ""; public string Role { get; set; } = "Customer"; public string Salt { get; set; } = ""; public string Hash { get; set; } = ""; public bool Active { get; set; } = true; public Dictionary<string, bool> Overrides { get; set; } = []; }
public sealed class LoginSession { public string Hash { get; set; } = ""; public string UserId { get; set; } = ""; public DateTime Expires { get; set; } }
public sealed class Product { public string Id { get; set; } = ""; public string MerchantId { get; set; } = ""; public string Name { get; set; } = ""; public string Category { get; set; } = ""; public decimal Price { get; set; } public int Stock { get; set; } public string Icon { get; set; } = "bag"; public string Image { get; set; } = ""; public string Description { get; set; } = ""; public bool Active { get; set; } = true; }
public sealed class OrderLine { public string ProductId { get; set; } = ""; public string MerchantId { get; set; } = ""; public string Name { get; set; } = ""; public decimal Price { get; set; } public int Qty { get; set; } public string Icon { get; set; } = "bag"; public string Image { get; set; } = ""; }
public sealed class Order { public string Id { get; set; } = ""; public string Number { get; set; } = ""; public GeoPoint? Destination { get; set; } public GeoPoint? CourierLocation { get; set; } public bool Sharing { get; set; } public int CommissionVersion{get;set;}public decimal CustomerCommission{get;set;}public decimal CourierCommission{get;set;}public Dictionary<string,decimal> MerchantCommissions{get;set;}=[];public string Currency {get;set;}="SAR";public decimal DeliveryFee {get;set;}=15;public string PaymentMethodId{get;set;}="cod";public string PaymentMethodName{get;set;}="الدفع عند الاستلام";public string PaymentType{get;set;}="Cash";public string PaymentInstructions{get;set;}="";public bool ReceiptRequired{get;set;}public string PaymentStatus{get;set;}="Unpaid";public string PaymentReviewNote{get;set;}="";public List<Receipt> Receipts{get;set;}=[];public string CustomerId { get; set; } = ""; public string CustomerName { get; set; } = ""; public string Address { get; set; } = ""; public string Phone { get; set; } = ""; public string Status { get; set; } = "Preparing"; public string? CourierId { get; set; } public string Pin { get; set; } = ""; public DateTime CreatedAt { get; set; } = DateTime.UtcNow; public DateTime? DeliveredAt { get; set; } public List<OrderLine> Lines { get; set; } = []; public HashSet<string> ReadyMerchants { get; set; } = []; public decimal Total => Lines.Sum(l => l.Price * l.Qty) + DeliveryFee + CustomerCommission; }
public sealed record AuditEntry(DateTime At, string UserId, string Name, string Action);
public sealed class RuleException(string message, int status = 400) : Exception(message) { public int Status => status; }
public sealed record SetupRequest(string Name, string Email, string Password, string Token);
public sealed record RegisterRequest(string Name, string Email, string Password,bool Accepted=false,int? PolicyVersion=null,int? CommissionVersion=null);
public sealed record LoginRequest(string Email, string Password);
public sealed record ProfileUpdate(string Name, string Email, string CurrentPassword, string? NewPassword = null);
public sealed record ProductInput(string Name, string Category, decimal Price, int Stock, string Icon, string MerchantId, string? Image = null, string? Description = null, bool Active = true);
public sealed record CartLine(string ProductId, int Qty);
public sealed record Checkout(List<CartLine> Items, string Address, string Phone, GeoInput? Destination=null,string PaymentMethodId="cod",string? Currency=null,int? CommissionVersion=null);
public sealed record Assignment(string CourierId);
public sealed record Delivery(string Pin);
public sealed record UserInput(string Name, string Email, string Password, string Role);
public sealed record UserChange(string Role, bool Active, Dictionary<string, bool> Overrides);
public sealed record DeleteAccount(string Password);

public sealed record GeoInput(double Latitude,double Longitude,double Accuracy=0);
public sealed record GeoPoint(double Latitude,double Longitude,double Accuracy,DateTime UpdatedAt);
public sealed class SupportTicket { public string Id {get;set;}=""; public string UserId {get;set;}=""; public string Name {get;set;}=""; public string Subject {get;set;}=""; public string? OrderId {get;set;} public string Status {get;set;}="Open"; public DateTime UpdatedAt {get;set;}=DateTime.UtcNow; public List<TicketMessage> Messages {get;set;}=[]; }
public sealed record TicketMessage(string UserId,string Name,string Message,DateTime At);
public sealed record TicketInput(string Subject,string Message,string? OrderId);
public sealed record TicketReply(string Message);
public sealed record TicketStatus(string Status);

public sealed class Appearance {
    public string StoreName {get;set;}="التسوق";
    public string Subtitle {get;set;}="كل ما تحب، أقرب إليك";
    public string Primary {get;set;}="#087e66";
    public string Background {get;set;}="#f7f7f2";
    public string Ink {get;set;}="#18332e";
    public string Font {get;set;}="Tahoma";
    public string Logo {get;set;}="";
    public string Announcement {get;set;}="";
    public bool AnnouncementActive {get;set;}=false;
}
public sealed class StoreBanner {
    public string Id {get;set;}="";
    public string Title {get;set;}="";
    public string Subtitle {get;set;}="";
    public string Image {get;set;}="";
    public string LinkUrl {get;set;}="";
    public string ButtonText {get;set;}="اكتشف الآن";
    public string BgColor {get;set;}="#087e66";
    public string TextColor {get;set;}="#ffffff";
    public bool Active {get;set;}=true;
    public int SortOrder {get;set;}=0;
    public DateTime CreatedAt {get;set;}=DateTime.UtcNow;
}
public sealed record BannerInput(string Title, string? Subtitle, string Image, string? LinkUrl, string? ButtonText, string? BgColor, string? TextColor, bool Active = true, int SortOrder = 0);

public sealed class StaffMember {
    public string Id {get;set;}="";
    public string UserId {get;set;}="";
    public string FullName {get;set;}="";
    public string JobTitle {get;set;}="";
    public string Department {get;set;}="العمليات والمخزن";
    public string Phone {get;set;}="";
    public string NationalId {get;set;}="";
    public string Shift {get;set;}="صباحي";
    public string WorkingHours {get;set;}="8 ساعات";
    public decimal MonthlySalary {get;set;}=0;
    public string Status {get;set;}="Active";
    public string Notes {get;set;}="";
    public string Address {get;set;}="";
    public DateTime CreatedAt {get;set;}=DateTime.UtcNow;
}
public sealed record StaffInput(string FullName, string JobTitle, string? Department, string Phone, string? NationalId, string? Shift, string? WorkingHours, decimal MonthlySalary = 0, string Status = "Active", string? Notes = null, string? Address = null, string? UserId = null);

public sealed class Notice {public string Id {get;set;}="";public string Title {get;set;}="";public string Message {get;set;}="";public string Audience {get;set;}="";public DateTime At {get;set;}=DateTime.UtcNow;public HashSet<string> Recipients {get;set;}=[];public HashSet<string> ReadBy {get;set;}=[];}
public sealed record NoticeInput(string Title,string Message,string Audience,string? UserId);
public sealed record ForgotPasswordRequest(string EmailOrUsername);
public sealed class RegistrationField {
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public string Type { get; set; } = "text";
    public bool Required { get; set; } = true;
    public bool Enabled { get; set; } = true;
    public List<string> Options { get; set; } = [];
    public string Placeholder { get; set; } = "";
    public bool IsSystem { get; set; } = false;
}
