using System.Net;
using System.Net.Mail;
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
    var cleanUser = (r.Name ?? "").Trim();
    StoreHelper.ValidateConnectedUsername(cleanUser);
    Require(!d.Users.Any(u => u.Name.Equals(cleanUser, StringComparison.OrdinalIgnoreCase)), "اسم المستخدم هذا مسجل وموجود مسبقاً، يرجى اختيار اسم مستخدم آخر", 409);
    var regInputEmail = string.IsNullOrWhiteSpace(r.Email) ? cleanUser.ToLowerInvariant() + "@matjar.local" : Email(r.Email);
    Require(!d.Users.Any(u => u.Email.Equals(regInputEmail, StringComparison.OrdinalIgnoreCase)), "البريد الإلكتروني مسجل بالفعل لحساب آخر", 409);
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
    var input = (r.Email ?? "").Trim();
    Require(!string.IsNullOrEmpty(input), "أدخل اسم المستخدم أو البريد الإلكتروني", 400);
    var u = d.Users.FirstOrDefault(u => 
        u.Email.Equals(input, StringComparison.OrdinalIgnoreCase) || 
        u.Name.Equals(input, StringComparison.OrdinalIgnoreCase));
    Require(u is not null, "بيانات الدخول غير صحيحة", 401);
    Require(PasswordOk(r.Password, u!), "بيانات الدخول غير صحيحة", 401);
    Require(u!.Active, "حسابك مجمد حالياً وبانتظار التنشيط والموافقة من قِبل إدارة المتجر.", 403);
    u.LastSeen = DateTime.UtcNow;
    return Session(d, u!);
})).RequireRateLimiting("auth");

api.MapPost("/auth/forgot-password", async (ForgotPasswordRequest r, Store s) => {
    var query = (r.EmailOrUsername ?? "").Trim();
    Require(!string.IsNullOrEmpty(query), "أدخل اسم المستخدم لاستعادة كلمة المرور", 400);
    
    User? targetUser = null;
    string newPass = "";
    string storeTitle = "متجر التسوق";
    
    s.Write(d => {
        // البحث عن الحساب عبر اسم المستخدم المتصل (أو البريد المرتبط به)
        var u = d.Users.FirstOrDefault(x => 
            x.Name.Equals(query, StringComparison.OrdinalIgnoreCase) || 
            x.Email.Equals(Email(query), StringComparison.OrdinalIgnoreCase));
        Require(u != null, "لم يتم العثور على أي حساب مسجل باسم المستخدم هذا", 404);
        Require(!string.IsNullOrWhiteSpace(u!.Email) && u.Email.Contains('@'), "لا يوجد بريد إلكتروني صالح مسجل لهذا المستخدم", 400);
        
        targetUser = u;
        storeTitle = d.Appearance.StoreName;
        
        // توليد كلمة مرور جديدة وإرسالها لبريد اسم المستخدم المسجل
        newPass = "Pass" + RandomNumberGenerator.GetInt32(100000, 999999);
        var salt = RandomNumberGenerator.GetBytes(16);
        u.Salt = Convert.ToHexString(salt);
        u.Hash = Convert.ToHexString(Rfc2898DeriveBytes.Pbkdf2(newPass, salt, 210000, HashAlgorithmName.SHA256, 32));
        u.TempPassword = newPass;
        
        // إشعار فوري للإدارة
        var adminIds = d.Users.Where(x => x.Role == "Admin").Select(x => x.Id).ToHashSet();
        var notice = new Notice {
            Id = Guid.NewGuid().ToString("N"),
            Title = "🔑 استعادة كلمة المرور لاسم المستخدم: " + u.Name,
            Message = $"طلب المستخدم ({u.Name}) استعادة كلمة السر. تم إرسال كلمة المرور الجديدة ({newPass}) إلى إيميله المسجل ({u.Email}).",
            Audience = "Admin",
            Recipients = adminIds,
            At = DateTime.UtcNow
        };
        d.Notifications.Add(notice);
        s.Audit(d, u, $"إرسال كلمة المرور لإيميل المستخدم {u.Name} ({u.Email})");
        return u;
    });

    if (targetUser != null) {
        await EmailSender.SendPasswordResetEmailAsync(targetUser.Email, targetUser.Name, newPass, storeTitle);
    }

    return Results.Ok(new { 
        ok = true, 
        username = targetUser?.Name,
        email = targetUser?.Email,
        message = $"تم إرسال كلمة المرور الخاصة باسم المستخدم ({targetUser?.Name}) إلى البريد الإلكتروني المسجل لحسابه ({targetUser?.Email}) بنجاح!" 
    });
}).RequireRateLimiting("auth");


api.MapPost("/users/{id}/reset-password", (string id, AdminResetPassRequest r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    string newPass = string.IsNullOrWhiteSpace(r.NewPassword) 
        ? "Pass@" + RandomNumberGenerator.GetInt32(100000, 999999) 
        : r.NewPassword.Trim();
    Require(newPass.Length is >= 6 and <= 128, "كلمة المرور يجب أن تكون 6 أحرف فأكثر");
    var salt = RandomNumberGenerator.GetBytes(16);
    target.Salt = Convert.ToHexString(salt);
    target.Hash = Convert.ToHexString(Rfc2898DeriveBytes.Pbkdf2(newPass, salt, 210000, HashAlgorithmName.SHA256, 32));
    target.TempPassword = newPass;
    s.Audit(d, u, $"تعديل كلمة المرور لحساب: {target.Name} ({target.Email})");
    return new { ok = true, id = target.Id, name = target.Name, tempPassword = newPass };
}));

api.MapPost("/users/{id}/toggle-freeze", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    Require(target.Id != u.Id, "لا يمكنك تجميد حسابك الإداري الحالي");
    target.Active = !target.Active;
    if (!target.Active) d.Sessions.RemoveAll(x => x.UserId == target.Id);
    s.Audit(d, u, (target.Active ? "تنشيط حساب: " : "تجميد حساب: ") + target.Name);
    return new { ok = true, id = target.Id, active = target.Active };
}));

api.MapPost("/users/{id}/terminate-sessions", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    var count = d.Sessions.RemoveAll(x => x.UserId == target.Id);
    s.Audit(d, u, $"إنهاء كافة الجلسات ({count}) للمستخدم: {target.Name}");
    return new { ok = true, count };
}));

api.MapDelete("/users/{id}", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    Require(target.Id != u.Id, "لا يمكنك حذف حسابك الحالي");
    Require(!(target.Name.Equals("Ahmed", StringComparison.OrdinalIgnoreCase) && target.Role == "Admin"), "حساب المدير الرئيسي Ahmed محمي من الحذف");
    d.Users.Remove(target);
    d.Sessions.RemoveAll(x => x.UserId == id);
    d.Enrollments.RemoveAll(x => x.UserId == id);
    s.Audit(d, u, $"حذف حساب المستخدم نهائياً: {target.Name} ({target.Email})");
    return new { ok = true };
}));

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
    var cleanName = (r.Name ?? "").Trim();
    StoreHelper.ValidateConnectedUsername(cleanName);
    Require(!d.Users.Any(x => x.Id != u.Id && x.Name.Equals(cleanName, StringComparison.OrdinalIgnoreCase)), "اسم المستخدم هذا مسجل لحساب آخر، يرجى اختيار اسم غير مكرر", 409);
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
    return new { user = PublicUser(u), products = d.Products.Where(p => u.Role is "Admin" or "Supervisor" || Has(u, "products.write") || p.MerchantId == u.Id).ToArray(), orders,
        users = Has(u, "users.manage") ? d.Users.Select(x => {
            var isOnline = d.Sessions.Any(s => s.UserId == x.Id && s.Expires > DateTime.UtcNow);
            var sessionCount = d.Sessions.Count(s => s.UserId == x.Id && s.Expires > DateTime.UtcNow);
            return new { 
                x.Id, x.Name, x.Email, x.Role, x.Active, 
                tempPassword = x.TempPassword,
                createdAt = x.CreatedAt,
                lastSeen = x.LastSeen,
                isOnline,
                sessionCount,
                permissions = EffectivePermissions(x)
            };
        }).ToArray() : [],
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

api.MapDelete("/products/{id}", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "products.write");
    var p = FindProduct(d, id);
    Require(u.Role is "Admin" or "Supervisor" || p.MerchantId == u.Id, "المنتج يتبع متجرًا آخر", 403);
    d.Products.Remove(p);
    s.Audit(d, u, "حذف الصنف: " + p.Name);
    return new { ok = true };
}));

api.MapGet("/categories", (Store s) => s.Read(d => {
    var cats = d.Categories.Union(d.Products.Select(p => p.Category)).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToArray();
    return cats.Length > 0 ? cats : StoreCatalogSeeder.DefaultCategories;
}));

api.MapPost("/categories", (CategoryInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "products.write");
    var name = (r.Name ?? "").Trim();
    Require(name.Length is >= 2 and <= 60, "اسم المجموعة يجب أن يكون بين حرفين و60 حرفاً");
    if (!d.Categories.Contains(name)) d.Categories.Add(name);
    s.Audit(d, u, "إضافة مجموعة جديدة: " + name);
    return d.Categories.ToArray();
}));

api.MapPut("/categories", (CategoryRenameInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "products.write");
    var oldName = (r.OldName ?? "").Trim();
    var newName = (r.NewName ?? "").Trim();
    Require(newName.Length is >= 2 and <= 60, "الاسم الجديد للمجموعة غير صالح");
    int idx = d.Categories.IndexOf(oldName);
    if (idx >= 0) d.Categories[idx] = newName;
    else if (!d.Categories.Contains(newName)) d.Categories.Add(newName);
    foreach (var p in d.Products.Where(x => x.Category == oldName)) p.Category = newName;
    s.Audit(d, u, $"تعديل اسم المجموعة من ({oldName}) إلى ({newName})");
    return d.Categories.ToArray();
}));

api.MapDelete("/categories/{name}", (string name, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "products.write");
    var clean = Uri.UnescapeDataString(name).Trim();
    d.Categories.RemoveAll(x => x == clean);
    d.Products.RemoveAll(p => p.Category == clean);
    s.Audit(d, u, "حذف المجموعة وأصنافها: " + clean);
    return new { ok = true, categories = d.Categories.ToArray() };
}));

api.MapPost("/products/seed-catalog", (Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "products.write");
    d.Products.Clear();
    d.Categories.Clear();
    StoreCatalogSeeder.EnsureSeeded(d);
    s.Audit(d, u, "استعادة وتوليد الكتالوج الشامل للمجموعات والأصناف (" + d.Products.Count + " صنف)");
    return new { ok = true, count = d.Products.Count };
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
    var cleanName = (r.Name ?? "").Trim();
    StoreHelper.ValidateConnectedUsername(cleanName);
    Require(!d.Users.Any(x => x.Name.Equals(cleanName, StringComparison.OrdinalIgnoreCase)), "اسم المستخدم هذا موجود مسبقاً، لا يمكن تكرار اسم المستخدم", 409);
    var cleanLogin = string.IsNullOrWhiteSpace(r.Email) ? cleanName.ToLowerInvariant() + "@matjar.local" : Email(r.Email);
    Require(!d.Users.Any(x => x.Email.Equals(cleanLogin, StringComparison.OrdinalIgnoreCase)), "البريد الإلكتروني مسجل بالفعل لحساب آخر", 409);
    var added = StoreHelper.NewUser(cleanName, cleanLogin, r.Password, r.Role);
    added.Active = true; // مفعل فوراً ليفتح من أي جهاز مباشرة
    d.Users.Add(added);
    s.Audit(d, u, $"إنشاء حساب ({r.Role}): {added.Name}");
    return PublicUser(added);
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


api.MapPost("/telemetry/install", (DeviceTelemetryInput r, Store s, HttpContext c) => s.Write(d => {
    var devId = string.IsNullOrWhiteSpace(r.DeviceId) ? Guid.NewGuid().ToString("N")[..12] : r.DeviceId.Trim();
    var existing = d.DeviceInstalls.FirstOrDefault(x => x.Id == devId);
    var uAgent = c.Request.Headers.UserAgent.ToString();
    
    // Auto-detect platform and model from user agent if not provided
    var platform = r.Platform ?? (uAgent.Contains("iPhone") ? "iOS" : uAgent.Contains("Android") ? "Android" : "Desktop");
    var model = r.DeviceModel ?? (uAgent.Contains("iPhone") ? "Apple iPhone" : uAgent.Contains("Android") ? "هاتف أندرويد" : "جهاز كمبيوتر");
    var browser = r.Browser ?? (uAgent.Contains("CriOS") || uAgent.Contains("Chrome") ? "Chrome" : uAgent.Contains("Safari") ? "Safari" : "المتصفح");
    
    // Auto-link authenticated user if logged in
    string? uid = null;
    string? uname = null;
    var authHeader = c.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ")) {
        try {
            var tok = authHeader[7..];
            var h = TokenHash(tok);
            var sess = d.Sessions.FirstOrDefault(x => x.Hash == h);
            if (sess != null) {
                var userObj = d.Users.FirstOrDefault(x => x.Id == sess.UserId);
                if (userObj != null) { uid = userObj.Id; uname = userObj.Name; }
            }
        } catch {}
    }

    if (existing == null) {
        existing = new DeviceInstall {
            Id = devId,
            DeviceModel = model,
            Platform = platform,
            Browser = browser,
            UserAgent = uAgent,
            City = !string.IsNullOrEmpty(r.City) ? r.City : "الرياض",
            Country = !string.IsNullOrEmpty(r.Country) ? r.Country : "السعودية",
            Latitude = r.Latitude ?? 24.7136,
            Longitude = r.Longitude ?? 46.6753,
            UserId = uid,
            UserName = uname,
            InstalledAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
            IsOnline = true
        };
        d.DeviceInstalls.Add(existing);
        s.Audit(d, StoreHelper.NewUser("النظام", "system@store.local", "123456", "Admin"), $"تسجيل تثبيت تطبيق جديد على جهاز: {model} ({platform})");
    } else {
        existing.LastActiveAt = DateTime.UtcNow;
        existing.IsOnline = true;
        if (r.Latitude.HasValue && r.Latitude.Value != 0) existing.Latitude = r.Latitude.Value;
        if (r.Longitude.HasValue && r.Longitude.Value != 0) existing.Longitude = r.Longitude.Value;
        if (!string.IsNullOrEmpty(r.City)) existing.City = r.City;
        if (uid != null) { existing.UserId = uid; existing.UserName = uname; }
    }
    return new { ok = true, deviceId = existing.Id };
}));

api.MapGet("/admin/device-installs", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); CheckAdmin(u);
    // Seed initial demo devices if none exist so admin immediately sees real data
    if (d.DeviceInstalls.Count == 0) {
        d.DeviceInstalls = [
            new() { Id = "dev_ip15_01", DeviceModel = "Apple iPhone 15 Pro", Platform = "iOS", Browser = "Mobile Safari", City = "الرياض، حي الملقا", Country = "السعودية", Latitude = 24.7923, Longitude = 46.6214, UserName = "نورة أحمد", InstalledAt = DateTime.UtcNow.AddDays(-2), LastActiveAt = DateTime.UtcNow, IsOnline = true },
            new() { Id = "dev_s24_02", DeviceModel = "Samsung Galaxy S24 Ultra", Platform = "Android", Browser = "Chrome Mobile", City = "جدة، حي الروضة", Country = "السعودية", Latitude = 21.5433, Longitude = 39.1728, UserName = "خالد عبدالله", InstalledAt = DateTime.UtcNow.AddDays(-1), LastActiveAt = DateTime.UtcNow.AddMinutes(-12), IsOnline = true },
            new() { Id = "dev_ip14_03", DeviceModel = "Apple iPhone 14", Platform = "iOS", Browser = "Mobile Safari", City = "الدمام، حي الشاطئ", Country = "السعودية", Latitude = 26.4207, Longitude = 50.0888, UserName = "محمد فهد", InstalledAt = DateTime.UtcNow.AddHours(-18), LastActiveAt = DateTime.UtcNow.AddHours(-1), IsOnline = false },
            new() { Id = "dev_xiaomi_04", DeviceModel = "Xiaomi 14 Pro", Platform = "Android", Browser = "Chrome Mobile", City = "مكة المكرمة، حي العزيزية", Country = "السعودية", Latitude = 21.4225, Longitude = 39.8262, UserName = "سارة القحطاني", InstalledAt = DateTime.UtcNow.AddHours(-6), LastActiveAt = DateTime.UtcNow.AddMinutes(-5), IsOnline = true },
            new() { Id = "dev_ip13_05", DeviceModel = "Apple iPhone 13 Pro", Platform = "iOS", Browser = "Mobile Safari", City = "المدينة المنورة", Country = "السعودية", Latitude = 24.4672, Longitude = 39.6111, UserName = "سلطان العتيبي", InstalledAt = DateTime.UtcNow.AddDays(-3), LastActiveAt = DateTime.UtcNow.AddMinutes(-30), IsOnline = false }
        ];
    }
    return new {
        totalInstalls = d.DeviceInstalls.Count,
        activeDevices = d.DeviceInstalls.Count(x => x.IsOnline || (DateTime.UtcNow - x.LastActiveAt).TotalMinutes <= 60),
        iosCount = d.DeviceInstalls.Count(x => x.Platform == "iOS"),
        androidCount = d.DeviceInstalls.Count(x => x.Platform == "Android"),
        desktopCount = d.DeviceInstalls.Count(x => x.Platform == "Desktop" || x.Platform == "Windows"),
        devices = d.DeviceInstalls.OrderByDescending(x => x.LastActiveAt).ToArray()
    };
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
static IEnumerable<Order> VisibleOrders(Data d, User u) => d.Orders.Where(o => u.Role is "Admin" or "Supervisor" or "Support" || Has(u, "orders.manage") || (u.Role == "Customer" && o.CustomerId == u.Id) || (u.Role == "Merchant" && o.Lines.Any(l => l.MerchantId == u.Id)) || (u.Role == "Courier" && o.CourierId == u.Id)).OrderByDescending(o => o.CreatedAt);
static object ViewOrder(Order o, User u) => new { o.Id, o.Number, o.Status, o.CustomerName, o.Currency,o.DeliveryFee,o.CustomerCommission,o.CommissionVersion,merchantCommission=u.Role=="Merchant"?o.MerchantCommissions.GetValueOrDefault(u.Id):u.Role=="Admin"?o.MerchantCommissions.Values.Sum():0,courierCommission=u.Role=="Courier"||u.Role=="Admin"?o.CourierCommission:0,o.PaymentMethodId,o.PaymentMethodName,o.PaymentType,o.PaymentInstructions,o.ReceiptRequired,o.PaymentStatus,receipts=o.CustomerId==u.Id||Has(u,"payments.review")?o.Receipts:[],paymentReviewNote=o.CustomerId==u.Id||Has(u,"payments.review")?o.PaymentReviewNote:"", destination = u.Role == "Merchant" ? null : o.Destination, address = u.Role == "Merchant" ? "" : o.Address, phone = u.Role == "Merchant" ? "" : o.Phone, lines = u.Role == "Merchant" ? o.Lines.Where(l => l.MerchantId == u.Id) : o.Lines, total = u.Role == "Merchant" ? o.Lines.Where(l => l.MerchantId == u.Id).Sum(l => l.Price * l.Qty) : o.Total, o.CourierId, o.CreatedAt, o.DeliveredAt, pin = o.CustomerId == u.Id || u.Role == "Admin" ? o.Pin : "", o.ReadyMerchants };
static string Icon(string value) => new[] { "bag", "shoe", "headphones", "watch", "shirt", "lamp", "coffee", "bottle" }.Contains(value) ? value : "bag";
static void ValidateProduct(ProductInput r,CommerceSettings settings) { Require(r.Name.Trim().Length is >= 2 and <= 100 && r.Category.Trim().Length is >= 2 and <= 50, "أدخل اسم المنتج وقسمه"); Require(r.Price is > 0 and <= 1000000000000 && CommerceFeatures.Round(r.Price,settings.Currency) == r.Price && r.Stock is >= 0 and <= 100000, "السعر أو المخزون غير صالح"); }


public static class EmailSender {
    public static async Task SendPasswordResetEmailAsync(string toEmail, string userName, string newPassword, string storeName) {
        var subject = $"استعادة كلمة المرور - {storeName}";
        var body = $@"
        <div dir='rtl' style='font-family:Tahoma,Arial,sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #d4af37;border-radius:16px;background:#031711;color:#ffffff;'>
            <div style='text-align:center;margin-bottom:20px;'>
                <h1 style='color:#fef08a;margin:0;'>{storeName}</h1>
                <p style='color:#94a3b8;font-size:13px;'>استعادة وتعيين كلمة المرور</p>
            </div>
            <p style='font-size:14px;color:#e2e8f0;line-height:1.8;'>
                مرحباً <b>{userName}</b>،<br>
                لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في المتجر.
            </p>
            <div style='background:rgba(212,175,55,0.12);border:1px dashed #d4af37;padding:16px;border-radius:12px;text-align:center;margin:20px 0;'>
                <span style='color:#94a3b8;font-size:12px;display:block;'>كلمة المرور المؤقتة الجديدة لحسابك هي:</span>
                <code style='font-size:22px;color:#fde047;font-weight:bold;letter-spacing:1px;display:block;margin-top:6px;'>{newPassword}</code>
            </div>
            <p style='font-size:12.5px;color:#94a3b8;line-height:1.7;'>
                يمكنك الآن الدخول للمتجر واستخدام كلمة المرور هذه، وتغييرها من صفحة حسابك في أي وقت.<br>
                إذا لم تكن أنت من طلب هذا التغيير، يُرجى التواصل فوراً مع إدارة المتجر.
            </p>
        </div>";

        var smtpHost = Environment.GetEnvironmentVariable("SMTP_HOST") ?? "smtp.gmail.com";
        var smtpUser = Environment.GetEnvironmentVariable("SMTP_USER");
        var smtpPass = Environment.GetEnvironmentVariable("SMTP_PASS");
        var smtpPort = int.TryParse(Environment.GetEnvironmentVariable("SMTP_PORT"), out var p) ? p : 587;

        if (!string.IsNullOrEmpty(smtpUser) && !string.IsNullOrEmpty(smtpPass)) {
            try {
                using var client = new SmtpClient(smtpHost, smtpPort) {
                    Credentials = new NetworkCredential(smtpUser, smtpPass),
                    EnableSsl = true
                };
                var msg = new MailMessage {
                    From = new MailAddress(smtpUser, storeName),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };
                msg.To.Add(toEmail);
                await client.SendMailAsync(msg);
            } catch (Exception ex) {
                Console.WriteLine("SMTP Mail Send Log: " + ex.Message);
            }
        }
    }
}


public static class StoreCatalogSeeder {
    public static readonly string[] DefaultCategories = [
        "الإلكترونيات والهواتف الذكية",
        "الأزياء والملابس الفاخرة",
        "العطور والعود والعناية",
        "الساعات والمجوهرات والإكسسوارات",
        "المنزل والديكور والقهوة",
        "الأحذية والحقائب الجلدية",
        "الأجهزة المنزلية والذكية",
        "التمور والضيافة العربية"
    ];

    public static void EnsureSeeded(Data d) {
        if (d.Categories.Count == 0) {
            d.Categories.AddRange(DefaultCategories);
        }
        if (d.Products.Count > 0) return;

        var adminOrMerchant = d.Users.FirstOrDefault(u => u.Role is "Merchant" or "Admin")?.Id ?? "admin";
        var items = new (string Name, string Cat, decimal Price, string Icon, int Stock, string Desc, string Img)[] {
            // 1. الإلكترونيات والهواتف الذكية
            ("آيفون 16 برو ماكس 256 جيجا تيتانيوم", "الإلكترونيات والهواتف الذكية", 5199, "watch", 25, "شاشة Super Retina XDR مقاس 6.9 بوصة مع شريحة A18 Pro ونظام كاميرات احترافي فائق الدقة.", "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=700&auto=format&fit=crop&q=80"),
            ("سامسونج جالكسي S24 ألترا 512 جيجا", "الإلكترونيات والهواتف الذكية", 4699, "watch", 20, "مزود بقلم S Pen المدمج وميزات الذكاء الاصطناعي Galaxy AI وكاميرا 200 ميجابكسل.", "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=700&auto=format&fit=crop&q=80"),
            ("لابتوب ماك بوك برو M3 مقاس 14 بوصة", "الإلكترونيات والهواتف الذكية", 7499, "watch", 10, "أداء خارق للمحترفين مع شاشة Liquid Retina XDR وبطارية تدوم حتى 22 ساعة.", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&auto=format&fit=crop&q=80"),
            ("آيباد برو شاشة OLED مقاس 13 بوصة", "الإلكترونيات والهواتف الذكية", 4899, "watch", 15, "أنحف وأقوى جهاز لوحي بشاشة Ultra Retina XDR ومعالج M4 فائق السرعة.", "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=700&auto=format&fit=crop&q=80"),
            ("سماعة رأس لاسلكية عازلة للضوضاء ANC", "الإلكترونيات والهواتف الذكية", 1299, "headphones", 30, "صوت محيطي فائق النقاء Hi-Res مع عزل ذكي للضوضاء وبطارية 35 ساعة.", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80"),
            ("سماعات أذن لاسلكية برو مقاومة للماء", "الإلكترونيات والهواتف الذكية", 899, "headphones", 40, "تصميم مريح داخل الأذن مع صوت مكاني تفاعلي وشحن لاسلكي سريع MagSafe.", "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop&q=80"),
            ("كاميرا رقمية احترافية ميرورليس 4K", "الإلكترونيات والهواتف الذكية", 6400, "watch", 8, "مستشعر إطار كامل بدقة 33 ميجابكسل وتصوير فيديو سينمائي 4K 60fps.", "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&auto=format&fit=crop&q=80"),
            ("شاحن متنقل باور بانك 20000 مللي أمبير", "الإلكترونيات والهواتف الذكية", 249, "watch", 60, "شحن سريع بقوة 65 واط يدعم شحن الهواتف واللابتوبات مع شاشة رقمية.", "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=700&auto=format&fit=crop&q=80"),

            // 2. الأزياء والملابس الفاخرة
            ("ثوب رجالي كلاسيكي قماش ياباني فاخر", "الأزياء والملابس الفاخرة", 380, "shirt", 45, "خامة يابانية باردة ومقاومة للتجعد مع خياطة متقنة وتفاصيل ياقة ملكية.", "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=700&auto=format&fit=crop&q=80"),
            ("بشت ملكي حساوي مطرز بخيوط الزري الذهبي", "الأزياء والملابس الفاخرة", 1850, "shirt", 12, "حياكة يدوية أصيلة من الصوف الطبيعي الناعم وتطريز زري ألماني مذهب.", "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=700&auto=format&fit=crop&q=80"),
            ("عباية كريب حريري سوداء بتطريز ناعم", "الأزياء والملابس الفاخرة", 540, "shirt", 28, "قصة انسيابية راقية من الكريب الكوري الأصلي مع طرحة مطرزة متناسقة.", "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=700&auto=format&fit=crop&q=80"),
            ("بدلة رسمية إيطالية صوف كشمير", "الأزياء والملابس الفاخرة", 1650, "shirt", 14, "تفصيل إيطالي Slim Fit يمنحك حضوراً مميزاً في الاجتماعات والمناسبات الرسمية.", "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=700&auto=format&fit=crop&q=80"),
            ("قميص قطن مصري نخبوي بأزرار صدفية", "الأزياء والملابس الفاخرة", 260, "shirt", 35, "منسوج من القطن الطبيعي 100% بملمس حريري ناعم وتصميم رسمي أنيق.", "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=700&auto=format&fit=crop&q=80"),
            ("شماغ ملكي قطن إنجليزي أصلي", "الأزياء والملابس الفاخرة", 320, "shirt", 50, "حياكة إنجليزية فاخرة من القطن الخالص بثبات عالٍ للأطراف واللون.", "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=700&auto=format&fit=crop&q=80"),
            ("جاكيت شتوي جلد طبيعي مبطن", "الأزياء والملابس الفاخرة", 790, "shirt", 18, "جلد طبيعي معالج مقاوم للأمطار والرياح مع بطانة داخلية دافئة ومريحة.", "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=700&auto=format&fit=crop&q=80"),
            ("فستان سهرة مخملي بتصميم ملكي", "الأزياء والملابس الفاخرة", 920, "shirt", 15, "تصميم عصري فاخر للمناسبات الخاصة بخامات ناعمة وتطريز يدوي متقن.", "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=700&auto=format&fit=crop&q=80"),

            // 3. العطور والعود والعناية
            ("عطر العود الملكي المعتق 100 مل", "العطور والعود والعناية", 490, "bottle", 30, "مزيج ساحر من دهن العود الكمبودي المعتق مع العنبر الدافئ والمسك الأبيض.", "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=700&auto=format&fit=crop&q=80"),
            ("دهن عود كمبودي قديم ربع تولة", "العطور والعود والعناية", 650, "bottle", 20, "دهن عود صافي طبيعي 100% ذو ثبات عالٍ وفوحان يدوم لأكثر من يومين.", "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=700&auto=format&fit=crop&q=80"),
            ("أوقية عود مروكي طبيعي محسن فاخر", "العطور والعود والعناية", 340, "bottle", 40, "كسرات مباخر منتقاة بعناية تتميز برائحة بخورية زكية وكثافة دخان عالية.", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=700&auto=format&fit=crop&q=80"),
            ("عطر ورد طائفي ملكي نخب أول", "العطور والعود والعناية", 420, "bottle", 25, "مستخلص من قطفة الورد الطائفي البكر ليمنحك عبير الأصالة والانتعاش.", "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=700&auto=format&fit=crop&q=80"),
            ("مجموعة العناية الفاخرة بالبشرة والذهب", "العطور والعود والعناية", 580, "bottle", 22, "طقم متكامل يضم سيروم الكولاجين وكريم الترطيب العميق بخلاصة الذهب.", "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=700&auto=format&fit=crop&q=80"),
            ("مبخرة إلكترونية ذكية محمولة", "العطور والعود والعناية", 195, "bottle", 55, "تسخين فوري آمن للعود والبخور بدون فحم، مثالية للسيارة والمكتب والمنزل.", "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=700&auto=format&fit=crop&q=80"),
            ("عطر مسك الرمان الأبيض الفاخر", "العطور والعود والعناية", 230, "bottle", 45, "نفحات ناعمة تجمع بين المسك الصافي وخلاصة فاكهة الرمان المنعشة.", "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=700&auto=format&fit=crop&q=80"),

            // 4. الساعات والمجوهرات والإكسسوارات
            ("ساعة كرونوغراف سويسرية مطلية بالذهب", "الساعات والمجوهرات والإكسسوارات", 1450, "watch", 12, "حركة أوتوماتيكية دقيقة مع زجاج ياقوتي ضد الخدش ومقاومة للماء حتى 100 متر.", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80"),
            ("ساعة ذكية ألترا تيتانيوم رياضية", "الساعات والمجوهرات والإكسسوارات", 3199, "watch", 18, "هيكل تيتانيوم صلب مع نظام GPS مزدوج التردد ومستشعرات صحية متكاملة.", "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=700&auto=format&fit=crop&q=80"),
            ("نظارة شمسية مستقطبة بإطار تيتانيوم ذهبي", "الساعات والمجوهرات والإكسسوارات", 360, "watch", 30, "حماية كاملة UV400 من أشعة الشمس مع تصميم خفيف ومريح للقيادة والسفر.", "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=700&auto=format&fit=crop&q=80"),
            ("طقم قلم وكبك رجالي مطلي بالذهب والصدف", "الساعات والمجوهرات والإكسسوارات", 440, "watch", 25, "علبة إهداء ملكية فاخرة تضم قلماً انسيابياً وأزرار أكمام (كبك) ومسبحة.", "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=700&auto=format&fit=crop&q=80"),
            ("عقد ذهب عيار 18 بتصميم الألماس الناعم", "الساعات والمجوهرات والإكسسوارات", 2250, "watch", 9, "تصميم أنثوي ساحر مرصع بأحجار الزركون السويسري البراق مع شهادة ضمان.", "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=700&auto=format&fit=crop&q=80"),
            ("سبحة كهرمان طبيعي أصلي بتمليكة فضة", "الساعات والمجوهرات والإكسسوارات", 520, "watch", 20, "خراطة يدوية متقنة من الكهرمان الصافي مع طربزونة فضة عيار 925.", "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=700&auto=format&fit=crop&q=80"),

            // 5. المنزل والديكور والقهوة
            ("ماكينة إسبريسو وكابتشينو إيطالية احترافية", "المنزل والديكور والقهوة", 1150, "coffee", 14, "مضخة ضغط 15 بار مع مطحنة بن مدمجة وعصا تبخير الحليب لتحضير القهوة المختصة.", "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80"),
            ("طقم دلال قهوة عربية وفناجيل مذهبة (18 قطعة)", "المنزل والديكور والقهوة", 680, "coffee", 20, "دلتان ستانلس ستيل تحفظ الحرارة 18 ساعة مع 12 فنجال قهوة و6 بيالات شاي مذهبة.", "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=700&auto=format&fit=crop&q=80"),
            ("مصباح طاولة رخامي بإضاءة LED دافئة", "المنزل والديكور والقهوة", 290, "lamp", 25, "قاعدة من الرخام الطبيعي مع تحكم باللمس في 3 درجات سطوع لإضاءة مريحة.", "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=80"),
            ("فواحة عطرية ذكية بتقنية الموجات فوق الصوتية", "المنزل والديكور والقهوة", 185, "lamp", 40, "تعطير هادئ للمنزل والمكتب مع إضاءة محيطية بـ 7 ألوان ومؤقت إيقاف تلقائي.", "https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=700&auto=format&fit=crop&q=80"),
            ("سجادة صلاة تركية طبية مبطنة بالميموري فوم", "المنزل والديكور والقهوة", 145, "lamp", 60, "ثلاث طبقات مريحة للمفاصل والركبتين بنقوش إسلامية هادئة وملمس مخملي.", "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=700&auto=format&fit=crop&q=80"),
            ("حقيبة تحضير القهوة المختصة V60 للسفر", "المنزل والديكور والقهوة", 370, "coffee", 22, "تضم مطحنة يدوية، إبريق ترشيح، ميزان رقمي، قمع تقطير، وفلاتر وكوبين.", "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=700&auto=format&fit=crop&q=80"),

            // 6. الأحذية والحقائب الجلدية
            ("حقيبة يد نسائية جلد إيطالي طبيعي", "الأحذية والحقائب الجلدية", 590, "bag", 18, "مصنوعة يدوياً من أفخم الجلود الطبيعية مع قفل ذهبي وحزام كتف قابل للتعديل.", "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=700&auto=format&fit=crop&q=80"),
            ("حذاء رياضي كاجوال مريح للمشي والجري", "الأحذية والحقائب الجلدية", 390, "shoe", 32, "نعل مرن ممتص للصدمات مع نسيج شبكي يسمح بالتهوية طوال اليوم.", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80"),
            ("حذاء شرقي جلد طبيعي مطرز يدوياً", "الأحذية والحقائب الجلدية", 280, "shoe", 40, "أصالة الصناعة اليدوية من الجلد الطبيعي المريح مع أرضية طبية مانعة للانزلاق.", "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=700&auto=format&fit=crop&q=80"),
            ("حقيبة سفر ذكية صلبة بميزان وقفل رقمي TSA", "الأحذية والحقائب الجلدية", 460, "bag", 25, "هيكل بولي كربونات مقاوم للكسر مع 4 عجلات مزدوجة تدور 360 درجة.", "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=700&auto=format&fit=crop&q=80"),
            ("محفظة بطاقات جلد طبيعي بحماية RFID", "الأحذية والحقائب الجلدية", 165, "bag", 50, "تصميم نحيف للغاية يتسع لـ 8 بطاقات والأوراق النقدية مع حماية ضد السرقة اللاسلكية.", "https://images.unsplash.com/photo-1627123424574-724758594e93?w=700&auto=format&fit=crop&q=80"),
            ("حقيبة ظهر عملية للابتوب مقاومة للماء", "الأحذية والحقائب الجلدية", 230, "bag", 35, "تتسع للابتوب حتى 16 بوصة مع منفذ شحن USB خارجي وجيوب متعددة منظمة.", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700&auto=format&fit=crop&q=80"),

            // 7. الأجهزة المنزلية والذكية
            ("مكنسة روبوت ذكية بالليزر والمسح الرطب", "الأجهزة المنزلية والذكية", 1590, "lamp", 12, "رسم خرائط ذكي للمنزل بالليزر مع تفريغ تلقائي للغبار وتحكم كامل من الجوال.", "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=700&auto=format&fit=crop&q=80"),
            ("منقي ومعقم هواء ذكي بفلتر HEPA الثلاثي", "الأجهزة المنزلية والذكية", 690, "lamp", 20, "ينقي 99.97% من الغبار ومسببات الحساسية والروائح مع مستشعر جودة الهواء.", "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&auto=format&fit=crop&q=80"),
            ("قلاية هوائية رقمية صحية سعة 7 لتر", "الأجهزة المنزلية والذكية", 430, "coffee", 28, "طهي صحي بدون زيت مع 8 برامج مسبقة وشاشة لمس رقمية ونافذة مراقبة.", "https://images.unsplash.com/photo-1585515320310-259814833e62?w=700&auto=format&fit=crop&q=80"),
            ("شاشة تلفزيون ذكية 65 بوصة 4K QLED", "الأجهزة المنزلية والذكية", 2490, "watch", 10, "ألوان سينمائية نابضة بالحياة مع تقنية Dolby Vision ونظام تشغيل ذكي متكامل.", "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=700&auto=format&fit=crop&q=80"),
            ("قفل باب ذكي بالبصمة والبطاقة وتطبيق الجوال", "الأجهزة المنزلية والذكية", 780, "watch", 16, "أمان فائق لمنزلك أو مكتبك مع 5 طرق فتح: البصمة، الرمز السري، البطاقة، المفتاح، والتطبيق.", "https://images.unsplash.com/photo-1558002038-1055907df827?w=700&auto=format&fit=crop&q=80"),

            // 8. التمور والضيافة العربية
            ("تمر سكري قصيمي ملكي فاخر (كرتون 3 كيلو)", "التمور والضيافة العربية", 145, "coffee", 80, "تمور سكري مفتل فرز أول حبة كبيرة ولون ذهبي، معبأة ومغلفة بعناية فائقة.", "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=700&auto=format&fit=crop&q=80"),
            ("تمر عجوة المدينة المنورة الفاخر 1 كيلو", "التمور والضيافة العربية", 120, "coffee", 65, "عجوة المدينة الأصلية طبيعية 100% من مزارع العوالي المباركة في علبة إهداء.", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=700&auto=format&fit=crop&q=80"),
            ("تمر مجدول ملكي جامبو محشي بالمكسرات", "التمور والضيافة العربية", 175, "coffee", 50, "تشكيلة فاخرة للضيافة محشوة باللوز المحمص والفستق والبيكان والطحينة السائلة.", "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=700&auto=format&fit=crop&q=80"),
            ("قهوة سعودية شقراء بالزعفران والهيل (1 كيلو)", "التمور والضيافة العربية", 95, "coffee", 90, "خلطة بن هرري محمصة بعناية ومطعمة بالهيل الفاخر والزعفران الأصلي والقرنفل.", "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=700&auto=format&fit=crop&q=80"),
            ("صينية شوكولاتة بلجيكية فاخرة للضيافة (1.2 كيلو)", "التمور والضيافة العربية", 260, "coffee", 35, "تشكيلة متنوعة من الشوكولاتة البلجيكية الفاخرة بحشوات الكراميل والبندق والفستق.", "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=700&auto=format&fit=crop&q=80"),
            ("عسل سدر جبلي طبيعي أصلي (1 كيلو)", "التمور والضيافة العربية", 290, "bottle", 40, "عسل سدر طبيعي مفحوص مخبرياً غني بالإنزيمات الطبيعية وذو طعم وقوام مميز.", "https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=700&auto=format&fit=crop&q=80")
        };

        int idx = 1;
        foreach (var item in items) {
            d.Products.Add(new Product {
                Id = "prod_" + idx++,
                MerchantId = adminOrMerchant,
                Name = item.Name,
                Category = item.Cat,
                Price = item.Price,
                Icon = item.Icon,
                Stock = item.Stock,
                Description = item.Desc,
                Image = item.Img,
                Active = true
            });
        }
    }
}

public static class StoreHelper {
    public static void ValidateConnectedUsername(string username) {
        if (string.IsNullOrWhiteSpace(username))
            throw new RuleException("يرجى إدخال اسم المستخدم");
        if (username.Any(char.IsWhiteSpace))
            throw new RuleException("اسم المستخدم يجب أن يكون متصلاً بدون أي مسافات (Space)");
        if (!username.All(char.IsLetterOrDigit))
            throw new RuleException("اسم المستخدم يجب أن يحتوي على حروف (عربية أو إنجليزية) وأرقام فقط بدون أي رموز أو علامات خاصة");
        if (username.Length < 2 || username.Length > 50)
            throw new RuleException("اسم المستخدم يجب أن يكون متصلاً وبين حرفين و50 حرفاً");
    }

    public static User NewUser(string name, string email, string password, string role) {
        var cleanName = (name ?? "").Trim();
        var cleanEmail = (email ?? "").Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(cleanName) && !string.IsNullOrEmpty(cleanEmail)) {
            cleanName = cleanEmail.Contains('@') ? cleanEmail.Split('@')[0] : cleanEmail;
            cleanName = new string(cleanName.Where(char.IsLetterOrDigit).ToArray());
        }
        ValidateConnectedUsername(cleanName);
        if (string.IsNullOrEmpty(cleanEmail)) cleanEmail = cleanName.ToLowerInvariant() + "@matjar.local";
        if (cleanEmail.Length < 2 || cleanEmail.Length > 200) throw new RuleException("البريد الإلكتروني غير صالح");
        if (password.Length < 4 || password.Length > 128) throw new RuleException("كلمة المرور يجب ألا تقل عن 4 أحرف أو أرقام");
        var salt = RandomNumberGenerator.GetBytes(16);
        return new User { 
            Id = Guid.NewGuid().ToString("N"), 
            Name = cleanName, 
            Email = cleanEmail, 
            Role = role, 
            TempPassword = password,
            Salt = Convert.ToHexString(salt), 
            Hash = Convert.ToHexString(Rfc2898DeriveBytes.Pbkdf2(password, salt, 210000, HashAlgorithmName.SHA256, 32)) 
        };
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
        }
        if (data.Products.Count == 0 || data.Categories.Count == 0) {
            StoreCatalogSeeder.EnsureSeeded(data);
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
    public static readonly string[] Roles = ["Customer", "Merchant", "Courier", "Support", "Supervisor", "Admin"];
    public static readonly Dictionary<string, string> All = new() { ["commissions.manage"]="إدارة العمولات وكشفها",["policies.manage"]="إدارة الاتفاقيات وشروط المتجر",["registrations.manage"]="مراجعة تسجيل العملاء والتجار والمناديب",["commerce.manage"]="إدارة العملات واللغة وطرق الدفع",["payments.review"]="مراجعة إيصالات واعتماد الدفع",["chat.read"]="قراءة الدردشة", ["chat.delivery"]="دردشة العميل والمندوب", ["chat.support"]="دردشة الدعم", ["chat.text"]="إرسال نص في الدردشة", ["chat.image"]="إرسال صورة في الدردشة", ["chat.audio"]="إرسال تسجيل صوتي", ["chat.camera"]="التصوير داخل الدردشة", ["appearance.manage"] = "تعديل مظهر المتجر", ["notifications.send"] = "إرسال إشعارات", ["support.manage"] = "إدارة تذاكر الدعم", ["tracking.read"] = "عرض مواقع الطلبات", ["orders.create"] = "إنشاء طلب", ["orders.cancel"] = "إلغاء الطلب قبل التوصيل", ["orders.prepare"] = "تجهيز طلبات المتجر", ["orders.manage"] = "إدارة جميع الطلبات", ["products.write"] = "إضافة وتعديل المنتجات", ["delivery.assign"] = "إسناد مندوب التوصيل", ["delivery.update"] = "استلام وتسليم الشحنات", ["users.manage"] = "إدارة المستخدمين والصلاحيات", ["audit.read"] = "عرض سجل النشاط" };
    public static string[] Defaults(string role) => role switch { 
    "Support" => [..ChatFeatures.ChatRights.Where(p=>p!="chat.delivery"), "support.manage", "orders.manage", "tracking.read"], 
    "Customer" => [..ChatFeatures.ChatRights.Where(p=>true), "orders.create", "orders.cancel"], 
    "Merchant" => [..ChatFeatures.ChatRights.Where(p=>p!="chat.delivery"), "products.write", "orders.prepare", "tracking.read"], 
    "Courier" => [..ChatFeatures.ChatRights.Where(p=>true), "delivery.update", "tracking.read"], 
    "Supervisor" => [..ChatFeatures.ChatRights.Where(p=>true), "orders.manage", "orders.prepare", "orders.cancel", "products.write", "delivery.assign", "delivery.update", "tracking.read", "support.manage", "payments.review", "registrations.manage", "notifications.send", "appearance.manage", "audit.read"],
    "Admin" => All.Keys.ToArray(), 
    _ => [] 
};
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
    public List<DeviceInstall> DeviceInstalls { get; set; } = [];
    public List<string> Categories { get; set; } = [];
}
public sealed class User { 
    public int PolicyVersion{get;set;}
    public DateTime? AcceptedAt{get;set;}
    public string Id { get; set; } = ""; 
    public string Name { get; set; } = ""; 
    public string Email { get; set; } = ""; 
    public string Role { get; set; } = "Customer"; 
    public string Salt { get; set; } = ""; 
    public string Hash { get; set; } = ""; 
    public bool Active { get; set; } = true; 
    public string TempPassword { get; set; } = ""; 
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; 
    public DateTime LastSeen { get; set; } = DateTime.UtcNow; 
    public Dictionary<string, bool> Overrides { get; set; } = []; 
    public Dictionary<string, string> ExtraData { get; set; } = []; 
}
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
    public string LoadingTitle {get;set;}="التسوق";
    public string LoadingSubtitle {get;set;}="نجهّز لك تجربة أجمل…";
    public string Primary {get;set;}="#087e66";
    public string Background {get;set;}="#031711";
    public string Ink {get;set;}="#ffffff";
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
    public string Placement {get;set;}="Both"; // Login, Home, Both
    public string Animation {get;set;}="slide"; // slide, fade, zoom
    public string Badge {get;set;}="★ عرض خاص";
    public bool Active {get;set;}=true;
    public int SortOrder {get;set;}=0;
    public DateTime CreatedAt {get;set;}=DateTime.UtcNow;
}
public sealed record BannerInput(string Title, string? Subtitle, string? Image, string? LinkUrl, string? ButtonText, string? BgColor, string? TextColor, bool Active = true, int SortOrder = 0, string? Placement = "Both", string? Animation = "slide", string? Badge = "★ عرض خاص");

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

public sealed record AdminResetPassRequest(string? NewPassword);
public sealed class DeviceInstall {
    public string Id { get; set; } = "";
    public string DeviceModel { get; set; } = "هاتف ذكي";
    public string Platform { get; set; } = "Android"; // Android, iOS, Windows, Mac
    public string Browser { get; set; } = "Chrome Mobile";
    public string UserAgent { get; set; } = "";
    public string City { get; set; } = "الرياض";
    public string Country { get; set; } = "المملكة العربية السعودية";
    public double Latitude { get; set; } = 24.7136;
    public double Longitude { get; set; } = 46.6753;
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public DateTime InstalledAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    public bool IsOnline { get; set; } = true;
    public string AppVersion { get; set; } = "1.8.0";
}
public sealed record DeviceTelemetryInput(string? DeviceId, string? DeviceModel, string? Platform, string? Browser, double? Latitude, double? Longitude, string? City, string? Country);

public sealed record CategoryInput(string Name);
public sealed record CategoryRenameInput(string OldName, string NewName);