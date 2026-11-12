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
    ctx.Response.Headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.googleapis.com https://*.gstatic.com https://images.unsplash.com; media-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self'; manifest-src 'self'; connect-src 'self' https: http://127.0.0.1:* appassets:; frame-ancestors 'none'; base-uri 'self'";
    try { await next(); }
    catch (RuleException e) { if (!ctx.Response.HasStarted) { ctx.Response.StatusCode = e.Status; await ctx.Response.WriteAsJsonAsync(new { error = e.Message }); } }
});
var contentTypeProvider = new FileExtensionContentTypeProvider();
contentTypeProvider.Mappings[".webmanifest"] = "application/manifest+json";
app.UseCors(); app.UseRateLimiter(); app.UseDefaultFiles();
app.MapGet("/manifest.webmanifest", (Store s) => s.Read(d => {
    var a = d.Appearance;
    var hasLogo = !string.IsNullOrWhiteSpace(a.Logo);
    var v = (a.StoreName + a.Logo.Length).GetHashCode();
    var iconSrc = hasLogo ? $"/api/app-icon.png?v={v}" : "/icon.svg";
    var iconType = hasLogo ? "image/png" : "image/svg+xml";
    var manifest = new {
        name = a.StoreName,
        short_name = a.StoreName,
        start_url = "/",
        display = "standalone",
        background_color = "#031711",
        theme_color = string.IsNullOrWhiteSpace(a.Primary) ? "#087e66" : a.Primary,
        icons = new[] {
            new { src = iconSrc, sizes = "192x192", type = iconType, purpose = "any maskable" },
            new { src = iconSrc, sizes = "512x512", type = iconType, purpose = "any maskable" }
        }
    };
    return Results.Json(manifest, contentType: "application/manifest+json; charset=utf-8");
}));
app.MapGet("/api/app-icon.png", (Store s, IWebHostEnvironment env) => s.Read<IResult>(d => {
    var logo = d.Appearance.Logo ?? "";
    if (logo.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase)) {
        try {
            var bytes = Convert.FromBase64String(logo[22..]);
            return Results.Bytes(bytes, "image/png");
        } catch {}
    }
    var svgPath = Path.Combine(env.WebRootPath, "icon.svg");
    if (File.Exists(svgPath)) return Results.File(svgPath, "image/svg+xml");
    return Results.NotFound();
}));
app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = contentTypeProvider });
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
    
    bool autoApprove = d.Policies.AutoApproveCustomers;
    var u = StoreHelper.NewUser(cleanUser, regInputEmail, r.Password, "Customer");
    u.Active = autoApprove;
    u.PolicyVersion = r.PolicyVersion ?? 0;
    u.AcceptedAt = r.Accepted ? DateTime.UtcNow : null;
    if (r.ExtraData != null) {
        long totalLen = 0;
        foreach (var kv in r.ExtraData) {
            if (!string.IsNullOrEmpty(kv.Value)) {
                totalLen += kv.Value.Length;
                Require(totalLen <= 9000000, "حجم مرفقات التحقق والصور كبير جداً (الحد الأقصى 9 ميجابايت)");
                u.ExtraData[kv.Key] = kv.Value;
            }
        }
    }
    d.Users.Add(u);
    
    d.Enrollments.Add(new Enrollment {
        Id = Guid.NewGuid().ToString("N"),
        UserId = u.Id,
        Name = u.Name,
        Email = u.Email,
        Role = "Customer",
        Status = autoApprove ? "Approved" : "Pending",
        Accepted = r.Accepted,
        PolicyVersion = r.PolicyVersion ?? 0,
        CommissionVersion = r.CommissionVersion ?? 0
    });
    
    var managerIds = d.Users.Where(x => x.Role is "Admin" or "Supervisor" || Has(x, "registrations.manage")).Select(x => x.Id).ToHashSet();
    var notice = new Notice {
        Id = Guid.NewGuid().ToString("N"),
        Title = autoApprove ? "✅ تسجيل عميل جديد (تم التفعيل تلقائياً)" : "🔔 تسجيل مستخدم جديد (مجمد بانتظار التنشيط)",
        Message = autoApprove
            ? $"قام العميل {u.Name} ({u.Email}) بإنشاء حساب جديد وتم تنشيطه تلقائياً."
            : $"قام المستخدم {u.Name} ({u.Email}) بإنشاء حساب جديد. الحساب مجمد حالياً وبانتظار موافقة وتنشيط الإدارة أو المشرفين.",
        Audience = "Admin",
        Recipients = managerIds,
        At = DateTime.UtcNow
    };
    d.Notifications.Add(notice);
    s.Audit(d, u, (autoApprove ? "تسجيل وتفعيل تلقائي: " : "تسجيل مستخدم جديد مجمد: ") + $"{u.Name} ({u.Email})");
    
    if (autoApprove) {
        return Results.Ok(Session(d, u));
    }
    return Results.Ok(new { ok = true, pending = true, message = "تم تسجيل حسابك بنجاح. حسابك حالياً مجمد وبانتظار التنشيط والموافقة من قِبل الإدارة أو المشرفين." });
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
    Require(!string.IsNullOrEmpty(query), "أدخل البريد الإلكتروني أو اسم المستخدم لاستعادة كلمة المرور", 400);
    
    User? targetUser = null;
    string newPass = "";
    string storeTitle = "متجر التسوق";
    
    s.Write(d => {
        // البحث عن الحساب عبر اسم المستخدم المتصل (أو البريد المرتبط به)
        var u = d.Users.FirstOrDefault(x => 
            x.Name.Equals(query, StringComparison.OrdinalIgnoreCase) || 
            x.Email.Equals(Email(query), StringComparison.OrdinalIgnoreCase));
        Require(u != null, "لم يتم العثور على أي حساب مسجل بهذا البريد الإلكتروني أو اسم المستخدم", 404);
        Require(!string.IsNullOrWhiteSpace(u!.Email) && u.Email.Contains('@'), "لا يوجد بريد إلكتروني صالح مسجل لهذا المستخدم", 400);
        
        targetUser = u;
        storeTitle = d.Appearance.StoreName;
        
        // توليد كلمة مرور جديدة وإرسالها لبريد اسم المستخدم المسجل
        newPass = "Pass" + RandomNumberGenerator.GetInt32(100000, 999999);
        var salt = RandomNumberGenerator.GetBytes(16);
        u.Salt = Convert.ToHexString(salt);
        u.Hash = Convert.ToHexString(Rfc2898DeriveBytes.Pbkdf2(newPass, salt, 210000, HashAlgorithmName.SHA256, 32));
        u.TempPassword = newPass;
        u.ForgotPasswordAt = DateTime.UtcNow;
        
        // إشعار فوري للإدارة والمشرفين
        var adminIds = d.Users.Where(x => x.Role == "Admin" || x.Role == "Supervisor").Select(x => x.Id).ToHashSet();
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

    SmtpSettings smtpCfg = s.Read(d => d.Smtp);
    bool mailSent = false;
    string mailErr = "";
    if (targetUser != null) {
        var res = await EmailSender.SendPasswordResetEmailAsync(targetUser.Email, targetUser.Name, newPass, storeTitle, smtpCfg);
        mailSent = res.Sent;
        mailErr = res.Error;
    }

    return Results.Ok(new { 
        ok = true, 
        emailSent = mailSent,
        username = targetUser?.Name,
        email = targetUser?.Email,
        message = mailSent
            ? $"تم إرسال كلمة المرور الجديدة للمستخدم ({targetUser?.Name}) مباشرة إلى بريده المسجل ({targetUser?.Email}) بنجاح! تفقد صندوق الوارد."
            : $"تم إنشاء كلمة مرور جديدة للمستخدم ({targetUser?.Name}) وإشعار الإدارة والمشرفين، ولكن تعذر الإرسال التلقائي للبريد ({mailErr}). يرجى ضبط إعدادات البريد (SMTP) في لوحة الإدارة."
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
    var u = Actor(d, c); Require(u.Role is "Admin" or "Supervisor" || Has(u, "users.manage") || Has(u, "registrations.manage"), "لا توجد صلاحية لتعديل حالة الحساب", 403);
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
    var u = Actor(d, c); Require(u.Role is "Admin" or "Supervisor" || Has(u, "users.manage") || Has(u, "registrations.manage"), "لا توجد صلاحية لتنشيط الحسابات", 403);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    target.Active = true;
    s.Audit(d, u, $"تنشيط حساب المستخدم: {target.Name} ({target.Email})");
    return PublicUser(target);
}));
api.MapPost("/auth/logout", (Store s, HttpContext c) => s.Write(d => { var hash = TokenHash(Bearer(c)); d.Sessions.RemoveAll(x => x.Hash == hash); return new { ok = true }; }));
api.MapGet("/me", (Store s, HttpContext c) => s.Read(d => PublicUser(Actor(d, c))));
api.MapPost("/me/photo", (ProfilePhotoInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var photo = r.Photo ?? "";
    Require(photo == "" || (photo.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) && photo.Length <= 1500000), "صورة الملف الشخصي غير صالحة أو كبيرة جداً");
    u.ProfilePhoto = photo;
    s.Audit(d, u, "تحديث صورة الملف الشخصي");
    return PublicUser(u);
}));
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
    var orders = VisibleOrders(d, u).Select(o => ViewOrder(d, o, u)).ToArray();
    return new { user = PublicUser(u), products = d.Products.Where(p => u.Role is "Admin" or "Supervisor" || Has(u, "products.write") || p.MerchantId == u.Id).ToArray(), orders,
        users = (Has(u, "users.manage") || Has(u, "registrations.manage") || u.Role == "Supervisor") ? d.Users.Select(x => {
            var isOnline = d.Sessions.Any(s => s.UserId == x.Id && s.Expires > DateTime.UtcNow);
            var sessionCount = d.Sessions.Count(s => s.UserId == x.Id && s.Expires > DateTime.UtcNow);
            return new { 
                x.Id, x.Name, x.Email, x.Role, x.Active, 
                tempPassword = x.TempPassword,
                forgotPasswordAt = x.ForgotPasswordAt,
                profilePhoto = x.ProfilePhoto,
                extraData = x.ExtraData,
                penaltyBalance = x.PenaltyBalance,
                cancelledDeliveriesCount = x.CancelledDeliveriesCount,
                createdAt = x.CreatedAt,
                lastSeen = x.LastSeen,
                isOnline,
                sessionCount,
                x.Overrides,
                permissions = Permissions.All.Keys.Where(k => Has(x, k)).ToArray()
            };
        }).ToArray() : [],
        staff = Has(u, "users.manage") ? d.Staff.OrderByDescending(x => x.CreatedAt).ToArray() : [],
        banners = d.Banners.Where(b => b.Active).OrderBy(b => b.SortOrder).ToArray(),
        antiFraudLiveMediaEnabled = d.AntiFraudLiveMediaEnabled,
        courierCancelPenaltyAmount = d.CourierCancelPenaltyAmount,
        courierPenalties = (u.Role is "Admin" or "Supervisor" or "Courier" || Has(u, "delivery.assign")) ? d.CourierPenalties.Where(p => u.Role != "Courier" || p.CourierId == u.Id).OrderByDescending(p => p.At).ToArray() : [],
        myPenaltyBalance = u.PenaltyBalance,
        myCancelledDeliveriesCount = u.CancelledDeliveriesCount,
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
    GovernanceFeatures.Snapshot(d,o,r.CommissionVersion);d.Orders.Add(o); s.Audit(d, u, "طلب جديد " + o.Number); return ViewOrder(d, o, u);
}));
api.MapPost("/orders/{id}/ready", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "orders.prepare"); var o = FindOrder(d, id);
    Require(o.Status == "Preparing", "لا يمكن تجهيز الطلب في حالته الحالية", 409);
    Require(o.PaymentType=="Cash"||o.PaymentStatus=="Paid","يجب اعتماد الدفع قبل تجهيز الطلب",409);
    Require(u.Role == "Admin" || o.Lines.Any(l => l.MerchantId == u.Id), "الطلب لا يتبع متجرك", 403);
    if (u.Role == "Admin") o.ReadyMerchants = o.Lines.Select(l => l.MerchantId).ToHashSet(); else o.ReadyMerchants.Add(u.Id);
    if (o.Lines.All(l => o.ReadyMerchants.Contains(l.MerchantId))) o.Status = "Ready";
    s.Audit(d, u, "تجهيز " + o.Number); return ViewOrder(d, o, u);
}));
api.MapPost("/orders/{id}/assign", (string id, Assignment r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "delivery.assign"); var o = FindOrder(d, id);
    Require(o.Status is "Ready" or "Assigned", "جهّز الطلب أولًا", 409);
    Require(d.Users.Any(x => x.Id == r.CourierId && x.Role == "Courier" && x.Active), "اختر مندوبًا فعالًا");
    o.Sharing=false; o.CourierLocation=null; o.CourierId = r.CourierId; o.Status = "Assigned"; s.Audit(d, u, "إسناد توصيل " + o.Number); return ViewOrder(d, o, u);
}));
api.MapPost("/orders/{id}/pickup", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "delivery.update"); var o = FindOrder(d, id);
    Require(o.CourierId == u.Id || u.Role == "Admin", "المهمة لمندوب آخر", 403); Require(o.Status == "Assigned", "حالة الطلب لا تسمح بالاستلام", 409);
    o.Status = "OnWay"; s.Audit(d, u, "استلام المندوب " + o.Number); return ViewOrder(d, o, u);
}));
api.MapPost("/orders/{id}/deliver", (string id, Delivery r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "delivery.update"); var o = FindOrder(d, id);
    Require(o.CourierId == u.Id || u.Role == "Admin", "المهمة لمندوب آخر", 403); Require(o.Status == "OnWay", "حالة الطلب لا تسمح بالتسليم", 409);
    Require(SafeEqual(o.Pin, r.Pin), "رمز التسليم غير صحيح"); o.Sharing=false; o.CourierLocation=null; o.Status = "Delivered"; o.DeliveredAt = DateTime.UtcNow;
    s.Audit(d, u, "تسليم " + o.Number); return ViewOrder(d, o, u);
}));
api.MapPost("/orders/{id}/courier-cancel", (string id, CourierCancelOrderInput? r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var o = FindOrder(d, id);
    Require(u.Role == "Courier" && o.CourierId == u.Id, "هذا الطلب غير مسند إليك كمندوب", 403);
    Require(o.Status is "Assigned" or "OnWay", "لا يمكن إلغاء التوصيل في هذه الحالة", 409);
    var penalty = d.CourierCancelPenaltyAmount;
    u.PenaltyBalance += penalty;
    u.CancelledDeliveriesCount += 1;
    o.CourierId = null;
    o.CourierLocation = null;
    o.Sharing = false;
    o.Status = "Ready"; // يعود الطلب جاهزاً لإسناده لمندوب آخر
    var reason = string.IsNullOrWhiteSpace(r?.Reason) ? "إلغاء مهمة التوصيل من قِبل المندوب" : r!.Reason.Trim();
    var entry = new CourierPenaltyEntry {
        Id = Guid.NewGuid().ToString("N"),
        CourierId = u.Id,
        CourierName = u.Name,
        OrderId = o.Id,
        OrderNumber = o.Number,
        Amount = penalty,
        Reason = reason,
        At = DateTime.UtcNow
    };
    d.CourierPenalties.Add(entry);
    var adminIds = d.Users.Where(x => x.Role is "Admin" or "Supervisor").Select(x => x.Id).ToHashSet();
    d.Notifications.Add(new Notice {
        Id = Guid.NewGuid().ToString("N"),
        Title = $"⚠️ إلغاء توصيل وغرامة خصم على المندوب {u.Name}",
        Message = $"قام المندوب ({u.Name}) بإلغاء توصيل الطلب ({o.Number}). تم تطبيق غرامة خصم قدرها ({penalty} {d.Commerce.Currency}) وإعادة الطلب لحالة جاهز للإسناد.",
        Audience = "Admin",
        Recipients = adminIds,
        At = DateTime.UtcNow
    });
    s.Audit(d, u, $"إلغاء توصيل الطلب {o.Number} من المندوب {u.Name} وتطبيق غرامة خصم ({penalty})");
    return new { ok = true, penaltyApplied = penalty, totalPenaltyBalance = u.PenaltyBalance, order = ViewOrder(d, o, u) };
}));

api.MapPut("/couriers/penalty-setting", (CourierPenaltySettingInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    Require(u.Role is "Admin" or "Supervisor" || Has(u, "delivery.assign") || Has(u, "users.manage"), "غير مصرح", 403);
    Require(r.PenaltyAmount is >= 0 and <= 100000, "قيمة الغرامة غير صالحة");
    d.CourierCancelPenaltyAmount = r.PenaltyAmount;
    s.Audit(d, u, $"تحديث غرامة إلغاء الطلب للمناديب إلى {r.PenaltyAmount}");
    return new { ok = true, courierCancelPenaltyAmount = d.CourierCancelPenaltyAmount };
}));

api.MapPost("/users/{id}/toggle-account-options", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    Require(u.Role is "Admin" or "Supervisor" || Has(u, "users.manage"), "غير مصرح", 403);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    var cur = Has(target, "account.options");
    target.Overrides["account.options"] = !cur;
    s.Audit(d, u, $"{(!cur ? "تفعيل" : "إخفاء")} خيارات حسابي وتخصيص النغمات للمستخدم: {target.Name}");
    return new { ok = true, enabled = !cur };
}));

api.MapPost("/couriers/{id}/clear-penalties", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    Require(u.Role is "Admin" or "Supervisor" || Has(u, "users.manage"), "غير مصرح", 403);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المندوب غير موجود", 404);
    target.PenaltyBalance = 0;
    s.Audit(d, u, $"تصفير غرامات المندوب {target.Name}");
    return new { ok = true };
}));

api.MapPost("/orders/{id}/cancel", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); var o = FindOrder(d, id);
    Require((o.CustomerId == u.Id && Has(u, "orders.cancel")) || Has(u, "orders.manage"), "لا توجد صلاحية للإلغاء", 403);
    Require(o.Status is "Preparing" or "Ready", "لا يمكن إلغاء طلب بعد إسناده للتوصيل", 409);
    foreach (var l in o.Lines) FindProduct(d, l.ProductId).Stock += l.Qty;
    o.Status = "Cancelled"; s.Audit(d, u, "إلغاء " + o.Number); return ViewOrder(d, o, u);
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
static User? FindFirstOnlineSupport(Data d) {
    var now = DateTime.UtcNow;
    return d.Users
        .Where(x => x.Active && (x.Role == "Support" || (x.Role == "Supervisor" && Has(x, "support.manage"))))
        .OrderBy(x => x.Role == "Support" ? 0 : 1)
        .FirstOrDefault(x => d.Sessions.Any(ss => ss.UserId == x.Id && ss.Expires > now) || (now - x.LastSeen).TotalMinutes <= 5);
}

api.MapGet("/tickets", (Store s,HttpContext c)=>s.Read(d=>{
    var u=Actor(d,c);
    var isAdmin = u.Role == "Admin";
    var isSupportStaff = !isAdmin && (u.Role == "Support" || Has(u, "support.manage"));
    var list = d.Tickets.Where(t => {
        if (isAdmin) return true; // الإدارة ترى جميع المحادثات الجارية والسابقة
        if (isSupportStaff) return string.IsNullOrEmpty(t.AssignedSupportId) || t.AssignedSupportId == u.Id; // الموظف يرى محادثاته أو غير المسندة فقط، وتُخفى عنه محادثات الموظفين الآخرين
        return t.UserId == u.Id; // العميل أو التاجر أو المندوب يرى محادثاته فقط
    });
    return list
        .OrderByDescending(t => isAdmin && t.Escalated)
        .ThenByDescending(t => t.UpdatedAt)
        .Select(t => new {
            t.Id,
            ticketNumber = string.IsNullOrEmpty(t.TicketNumber) ? "SUP-" + t.Id[..Math.Min(4, t.Id.Length)].ToUpper() : t.TicketNumber,
            t.UserId, t.Name, t.UserRole, t.Subject, t.OrderId, t.Status,
            t.AssignedSupportId, t.AssignedSupportName, t.Escalated, t.EscalatedAt, t.SupportGreeted, t.LastAutoReplyAt, t.CreatedAt, t.UpdatedAt,
            messages = (Has(u,"chat.read") && Has(u,"chat.support")) || isAdmin ? t.Messages : []
        }).ToArray();
}));

api.MapGet("/tickets/lookup", (string number, Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c);
    Require(u.Role == "Admin" || u.Role == "Support" || Has(u, "support.manage"), "البحث برقم البلاغ متاح للدعم الفني والإدارة فقط", 403);
    var q = (number ?? "").Trim().TrimStart(#).ToUpperInvariant();
    Require(!string.IsNullOrEmpty(q), "أدخل رقم البلاغ للبحث", 400);
    var t = d.Tickets.FirstOrDefault(x =>
        (!string.IsNullOrEmpty(x.TicketNumber) && (x.TicketNumber.ToUpperInvariant() == q || x.TicketNumber.ToUpperInvariant() == "SUP-" + q)) ||
        x.Id.Equals(q, StringComparison.OrdinalIgnoreCase)
    ) ?? throw new RuleException("لم يتم العثور على بلاغ بهذا الرقم", 404);
    return new {
        t.Id,
        ticketNumber = string.IsNullOrEmpty(t.TicketNumber) ? "SUP-" + t.Id[..Math.Min(4, t.Id.Length)].ToUpper() : t.TicketNumber,
        t.UserId, t.Name, t.UserRole, t.Subject, t.OrderId, t.Status,
        t.AssignedSupportId, t.AssignedSupportName, t.CreatedAt, t.UpdatedAt,
        messages = t.Messages
    };
}));

api.MapPost("/tickets", (TicketInput r,Store s,HttpContext c)=>s.Write(d=>{
    var u=Actor(d,c); Check(u,"chat.support");Check(u,"chat.read");
    Require(r.Subject is not null&&r.Subject.Trim().Length is >=2 and <=120&&r.Message is not null&&r.Message.Length<=2000,"أدخل عنوان المشكلة والرسالة");
    if(!string.IsNullOrWhiteSpace(r.Message)){Check(u,"chat.text");Require(r.Message.Trim().Length>=1,"الرسالة قصيرة");}else Require(Has(u,"chat.image")||Has(u,"chat.audio"),"لا توجد صلاحية لإرسال رسالة",403);
    if(!string.IsNullOrEmpty(r.OrderId)) Require(VisibleOrders(d,u).Any(o=>o.Id==r.OrderId),"الطلب غير متاح",403);
    var ticketNum = "SUP-" + (1001 + d.Tickets.Count);
    var onlineAgent = FindFirstOnlineSupport(d);
    var t=new SupportTicket {
        Id=Guid.NewGuid().ToString("N"),
        TicketNumber=ticketNum,
        UserId=u.Id,
        Name=u.Name,
        UserRole=u.Role,
        Subject=Has(u,"chat.text")?r.Subject!.Trim():"طلب دعم",
        OrderId=r.OrderId,
        Status=onlineAgent != null ? "InProgress" : "Open",
        AssignedSupportId=onlineAgent?.Id,
        AssignedSupportName=onlineAgent?.Name,
        CreatedAt=DateTime.UtcNow,
        UpdatedAt=DateTime.UtcNow
    };
    if(!string.IsNullOrWhiteSpace(r.Message) || !string.IsNullOrWhiteSpace(r.MediaData)) {
        var knd = string.IsNullOrWhiteSpace(r.Kind) ? "Text" : r.Kind;
        t.Messages.Add(new TicketMessage(u.Id,u.Name,(r.Message ?? "").Trim(),DateTime.UtcNow,u.Role,knd,r.MediaData,r.MediaMime,r.DurationSec));
    }
    if(onlineAgent != null) {
        t.SupportGreeted = true;
        t.Messages.Add(new TicketMessage("system","النظام",$"تم تحويل المحادثة تلقائياً إلى موظف الدعم الفني المتصل: {onlineAgent.Name}",DateTime.UtcNow,"System"));
        t.Messages.Add(new TicketMessage(onlineAgent.Id, onlineAgent.Name, $"مرحباً بك في خدمة العملاء! أنا موظف الدعم الفني ({onlineAgent.Name})، كيف أساعدك اليوم؟", DateTime.UtcNow, "Support"));
        d.Notifications.Add(new Notice { Id=Guid.NewGuid().ToString("N"), Title=$"💬 بلاغ جديد محوّل إليك #{ticketNum}", Message=$"من {u.Name}: {t.Subject}", Audience="Support", Recipients=[onlineAgent.Id], At=DateTime.UtcNow });
    } else {
        var supIds = d.Users.Where(x => x.Active && (x.Role == "Support" || x.Role == "Admin")).Select(x => x.Id).ToHashSet();
        d.Notifications.Add(new Notice { Id=Guid.NewGuid().ToString("N"), Title=$"💬 بلاغ دعم فني جديد #{ticketNum}", Message=$"من {u.Name}: {t.Subject}", Audience="Support", Recipients=supIds, At=DateTime.UtcNow });
    }
    d.Tickets.Add(t);
    s.Audit(d,u,$"فتح محادثة دعم فني #{ticketNum}");
    return t;
}));

api.MapPost("/tickets/{id}/claim", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    Check(u, "support.manage");
    var t = d.Tickets.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المحادثة غير موجودة", 404);
    if (u.Role != "Admin") {
        Require(string.IsNullOrEmpty(t.AssignedSupportId) || t.AssignedSupportId == u.Id, "هذه المحادثة مفتوحة حالياً مع موظف دعم فني آخر", 403);
        if (string.IsNullOrEmpty(t.AssignedSupportId)) {
            t.AssignedSupportId = u.Id;
            t.AssignedSupportName = u.Name;
            if (t.Status == "Open") t.Status = "InProgress";
            t.UpdatedAt = DateTime.UtcNow;
            t.Messages.Add(new TicketMessage("system", "النظام", $"انضم موظف الدعم الفني ({u.Name}) إلى المحادثة.", DateTime.UtcNow, "System"));
        }
        if (!t.SupportGreeted && t.AssignedSupportId == u.Id) {
            t.SupportGreeted = true;
            t.UpdatedAt = DateTime.UtcNow;
            t.Messages.Add(new TicketMessage(u.Id, u.Name, $"مرحباً بك في خدمة العملاء! أنا موظف الدعم الفني ({u.Name})، كيف أساعدك اليوم؟", DateTime.UtcNow, "Support"));
        }
    }
    return t;
}));

api.MapPost("/tickets/{id}/reply", (string id,TicketReply r,Store s,HttpContext c)=>s.Write(d=>{
    var u=Actor(d,c);var t=d.Tickets.FirstOrDefault(t=>t.Id==id)??throw new RuleException("التذكرة غير موجودة",404);
    var isAdmin = u.Role == "Admin";
    var isSupport = !isAdmin && Has(u, "support.manage");
    Require(t.UserId==u.Id || isAdmin || isSupport,"التذكرة لحساب آخر",403);
    if (isSupport && !string.IsNullOrEmpty(t.AssignedSupportId) && t.AssignedSupportId != u.Id) {
        throw new RuleException("هذه الدردشة محولة ومفتوحة مع موظف دعم فني آخر", 403);
    }
    if (!isAdmin) { Check(u,"chat.support"); Check(u,"chat.text"); }
    Require(t.Status!="Closed","المحادثة مغلقة",409);
    var hasMedia = !string.IsNullOrWhiteSpace(r.MediaData);
    Require((!string.IsNullOrWhiteSpace(r.Message) && r.Message.Trim().Length is >=1 and <=2000) || hasMedia,"أدخل نص الرسالة أو أرفق ملف وسائط");
    if (hasMedia) Require(r.MediaData!.Length <= 3800000, "حجم ملف الوسائط كبير جداً");

    if (isSupport && string.IsNullOrEmpty(t.AssignedSupportId)) {
        t.AssignedSupportId = u.Id;
        t.AssignedSupportName = u.Name;
        t.Status = "InProgress";
    }
    var senderName = isAdmin ? "الإدارة" : u.Name;
    var senderRole = isAdmin ? "Admin" : (isSupport ? "Support" : u.Role);
    var msgKind = hasMedia ? (string.IsNullOrWhiteSpace(r.Kind) || r.Kind == "Text" ? "Image" : r.Kind!) : "Text";
    var msgText = !string.IsNullOrWhiteSpace(r.Message) ? r.Message.Trim() : (msgKind == "Audio" ? "🎤 رسالة صوتية" : "📷 صورة مرفقة");
    t.Messages.Add(new TicketMessage(u.Id, senderName, msgText, DateTime.UtcNow, senderRole, msgKind, r.MediaData, r.MediaMime, r.DurationSec));
    t.UpdatedAt=DateTime.UtcNow;
    s.Audit(d,u,$"رد في محادثة الدعم #{t.TicketNumber}");
    return t;
}));

api.MapPut("/tickets/{id}/status", (string id,TicketStatus r,Store s,HttpContext c)=>s.Write(d=>{
    var u=Actor(d,c);
    var t=d.Tickets.FirstOrDefault(t=>t.Id==id)??throw new RuleException("التذكرة غير موجودة",404);
    if (t.UserId == u.Id && r.Status == "Closed") {
        t.Status = "Closed";
        t.UpdatedAt = DateTime.UtcNow;
        t.Messages.Add(new TicketMessage("system", "النظام", $"أغلق {u.Name} الشكوى والمحادثة.", DateTime.UtcNow, "System"));
        s.Audit(d, u, $"إغلاق الشكوى من قِبل العميل #{t.TicketNumber}");
        return t;
    }
    Check(u,"support.manage");
    if (u.Role != "Admin" && !string.IsNullOrEmpty(t.AssignedSupportId) && t.AssignedSupportId != u.Id)
        throw new RuleException("لا يمكنك تعديل حالة محادثة مسندة لموظف آخر", 403);
    Require(r.Status is "Open" or "InProgress" or "Escalated" or "Closed","الحالة غير صالحة");
    t.Status=r.Status;t.UpdatedAt=DateTime.UtcNow;
    s.Audit(d,u,$"تغيير حالة محادثة الدعم #{t.TicketNumber} إلى {r.Status}");
    return t;
}));

api.MapPost("/tickets/{id}/auto-reply", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var t = d.Tickets.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المحادثة غير موجودة", 404);
    Require(t.UserId == u.Id, "غير مصرح", 403);
    if (t.Status == "Closed") return new { ok = false, ticket = t };
    var lastMsg = t.Messages.LastOrDefault();
    var alreadyAuto = lastMsg != null && lastMsg.SenderRole == "AutoReply";
    var recentlyAuto = t.LastAutoReplyAt.HasValue && (DateTime.UtcNow - t.LastAutoReplyAt.Value).TotalSeconds < 25;
    if (!alreadyAuto && !recentlyAuto) {
        t.LastAutoReplyAt = DateTime.UtcNow;
        t.UpdatedAt = DateTime.UtcNow;
        t.Messages.Add(new TicketMessage("autoreply", "الرد الآلي", "نعتذر عن تأخر موظف الدعم الفني في الرد عليك حالياً. يمكنك اختيار: الانتظار قليلاً، أو إغلاق الشكوى، أو تصعيد الشكوى للإدارة فوراً.", DateTime.UtcNow, "AutoReply"));
    }
    return new { ok = true, ticket = t };
}));

api.MapPost("/tickets/{id}/wait", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var t = d.Tickets.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المحادثة غير موجودة", 404);
    Require(t.UserId == u.Id, "غير مصرح", 403);
    t.LastAutoReplyAt = DateTime.UtcNow;
    t.UpdatedAt = DateTime.UtcNow;
    t.Messages.Add(new TicketMessage("system", "النظام", $"اختار {u.Name} الانتظار قليلاً لحين رد موظف الدعم الفني.", DateTime.UtcNow, "System"));
    return t;
}));

api.MapPost("/tickets/{id}/escalate", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var t = d.Tickets.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المحادثة غير موجودة", 404);
    Require(t.UserId == u.Id || u.Role == "Admin" || Has(u, "support.manage"), "غير مصرح", 403);
    t.Escalated = true;
    t.EscalatedAt = DateTime.UtcNow;
    if (t.Status != "Closed") t.Status = "Escalated";
    t.UpdatedAt = DateTime.UtcNow;
    t.Messages.Add(new TicketMessage("system", "النظام", $"🚨 تم تصعيد الشكوى #{t.TicketNumber} إلى الإدارة العليا للمتابعة الفورية!", DateTime.UtcNow, "System"));
    var adminIds = d.Users.Where(x => x.Role == "Admin").Select(x => x.Id).ToHashSet();
    d.Notifications.Add(new Notice {
        Id = Guid.NewGuid().ToString("N"),
        Title = $"🚨 شكوى مصعّدة للإدارة فوراً #{t.TicketNumber}",
        Message = $"صعّد {u.Name} الشكوى ({t.Subject}) بسبب تأخر الرد. يرجى التدخل والرد باسم الإدارة.",
        Audience = "Admin",
        Recipients = adminIds,
        At = DateTime.UtcNow
    });
    s.Audit(d, u, $"تصعيد الشكوى #{t.TicketNumber} إلى الإدارة");
    return t;
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
api.MapGet("/notifications/public",(Store s)=>s.Read(d=>{
    return d.Notifications
        .Where(n=>n.Audience=="Public"||n.Audience=="All")
        .OrderByDescending(n=>n.At)
        .Take(30)
        .Select(n=>new{n.Id,n.Title,n.Message,n.Audience,n.At})
        .ToArray();
}));

api.MapGet("/notifications",(Store s,HttpContext c)=>s.Read(d=>{
    var u=Actor(d,c);return d.Notifications.Where(n=>n.Recipients.Contains(u.Id)).OrderByDescending(n=>n.At).Take(100).Select(n=>new{n.Id,n.Title,n.Message,n.At,read=n.ReadBy.Contains(u.Id)}).ToArray();
}));
api.MapGet("/notifications/sent",(Store s,HttpContext c)=>s.Read(d=>{
    var u=Actor(d,c);Check(u,"notifications.send");return d.Notifications.OrderByDescending(n=>n.At).Take(100).Select(n=>new{n.Id,n.Title,n.Message,n.At,n.Audience,sentCount=n.Recipients.Count,readCount=n.ReadBy.Count}).ToArray();
}));
api.MapPost("/notifications",(NoticeInput r,Store s,HttpContext c)=>s.Write(d=>{
    var u=Actor(d,c);Check(u,"notifications.send");Require(r.Title.Trim().Length is >=2 and <=100&&r.Message.Trim().Length is >=2 and <=1000,"أدخل عنوانًا ورسالة صالحين");
    Require(new[]{"Customer","Courier","Merchant","All","Public","User"}.Contains(r.Audience),"الفئة غير صالحة");
    var ids=d.Users.Where(x=>x.Active&&(r.Audience=="All"||r.Audience=="Public"||r.Audience=="User"&&x.Id==r.UserId||x.Role==r.Audience)).Select(x=>x.Id).ToHashSet();if(r.Audience!="Public")Require(ids.Count>0,"لا يوجد مستلمون فعالون");
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
    var xff = c.Request.Headers["X-Forwarded-For"].FirstOrDefault();
    var clientIp = !string.IsNullOrWhiteSpace(xff)
        ? xff.Split(",")[0].Trim()
        : (c.Connection.RemoteIpAddress?.ToString() ?? "غير معروف");
    if (clientIp == "::1") clientIp = "127.0.0.1";
    
    var platform = !string.IsNullOrWhiteSpace(r.Platform) ? r.Platform : (uAgent.Contains("iPhone") || uAgent.Contains("iPad") ? "iOS" : uAgent.Contains("Android") ? "Android" : "Desktop");
    var model = !string.IsNullOrWhiteSpace(r.DeviceModel) ? r.DeviceModel : (uAgent.Contains("iPhone") ? "Apple iPhone" : uAgent.Contains("SM-") ? "هاتف Samsung Galaxy" : uAgent.Contains("Redmi") || uAgent.Contains("Xiaomi") || uAgent.Contains("POCO") ? "هاتف Xiaomi" : uAgent.Contains("Android") ? "هاتف أندرويد" : "جهاز كمبيوتر");
    var browser = !string.IsNullOrWhiteSpace(r.Browser) ? r.Browser : (uAgent.Contains("CriOS") || uAgent.Contains("Chrome") ? "Chrome" : uAgent.Contains("Safari") ? "Safari" : "المتصفح");
    
    string? uid = null, uname = null, uemail = null, urole = null;
    var authHeader = c.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ")) {
        try {
            var tok = authHeader[7..];
            var h = TokenHash(tok);
            var sess = d.Sessions.FirstOrDefault(x => x.Hash == h);
            if (sess != null) {
                var userObj = d.Users.FirstOrDefault(x => x.Id == sess.UserId);
                if (userObj != null) { uid = userObj.Id; uname = userObj.Name; uemail = userObj.Email; urole = userObj.Role; }
            }
        } catch {}
    }

    var cityVal = !string.IsNullOrEmpty(r.City) ? r.City : "الرياض";
    var regionVal = !string.IsNullOrEmpty(r.Region) ? r.Region : cityVal;
    var countryVal = !string.IsNullOrEmpty(r.Country) ? r.Country : "السعودية";

    if (existing == null) {
        existing = new DeviceInstall {
            Id = devId,
            DeviceModel = model,
            Platform = platform,
            Browser = browser,
            UserAgent = uAgent,
            IpAddress = clientIp,
            Region = regionVal,
            City = cityVal,
            Country = countryVal,
            Latitude = r.Latitude ?? 24.7136,
            Longitude = r.Longitude ?? 46.6753,
            UserId = uid,
            UserName = uname,
            UserEmail = uemail,
            UserRole = urole,
            InstalledAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
            IsOnline = true
        };
        d.DeviceInstalls.Add(existing);
        s.Audit(d, StoreHelper.NewUser("النظام", "system@store.local", "123456", "Admin"), $"تسجيل جهاز جديد: {model} ({clientIp})");
    } else {
        existing.LastActiveAt = DateTime.UtcNow;
        existing.IsOnline = true;
        existing.IpAddress = clientIp;
        if (!string.IsNullOrWhiteSpace(r.DeviceModel)) existing.DeviceModel = r.DeviceModel;
        if (!string.IsNullOrWhiteSpace(r.Platform)) existing.Platform = r.Platform;
        if (!string.IsNullOrWhiteSpace(r.Browser)) existing.Browser = r.Browser;
        if (r.Latitude.HasValue && r.Latitude.Value != 0) existing.Latitude = r.Latitude.Value;
        if (r.Longitude.HasValue && r.Longitude.Value != 0) existing.Longitude = r.Longitude.Value;
        if (!string.IsNullOrEmpty(r.City)) existing.City = r.City;
        if (!string.IsNullOrEmpty(r.Region)) existing.Region = r.Region;
        else if (!string.IsNullOrEmpty(r.City)) existing.Region = r.City;
        if (!string.IsNullOrEmpty(r.Country)) existing.Country = r.Country;
        if (uid != null) { existing.UserId = uid; existing.UserName = uname; existing.UserEmail = uemail; existing.UserRole = urole; }
    }
    return new { ok = true, deviceId = existing.Id, ipAddress = existing.IpAddress };
}));




api.MapGet("/admin/backup", (Store s, HttpContext c) => {
    s.Read(d => { var u = Actor(d, c); CheckAdmin(u); return true; });
    var raw = s.ExportBackupJson();
    return Results.File(Encoding.UTF8.GetBytes(raw), "application/json", $"matjar-backup-{DateTime.UtcNow:yyyyMMdd-HHmm}.json");
});

api.MapPost("/admin/restore", (RestoreBackupInput r, Store s, HttpContext c) => {
    s.Read(d => { var u = Actor(d, c); CheckAdmin(u); return true; });
    Require(!string.IsNullOrWhiteSpace(r.Json), "أرفق ملف النسخة الاحتياطية أولاً");
    s.ImportBackupJson(r.Json);
    return Results.Ok(new { ok = true, message = "تمت استعادة جميع المستخدمين والصور والفيديوهات والبيانات بنجاح!" });
});

api.MapPost("/admin/anti-fraud-media", (AntiFraudMediaInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    CheckAdmin(u);
    d.AntiFraudLiveMediaEnabled = r.Enabled;
    s.Audit(d, u, r.Enabled ? "تفعيل التحقق المباشر بالكاميرا والصوت لكامل الحسابات" : "إيقاف التحقق المباشر بالكاميرا والصوت");
    return new { ok = true, antiFraudLiveMediaEnabled = d.AntiFraudLiveMediaEnabled };
}));


api.MapPost("/admin/device-verify-request", (DeviceVerifyInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var devId = (r.DeviceId ?? "").Trim();
    Require(!string.IsNullOrEmpty(devId), "معرف الجهاز مطلوب");
    d.PendingVerifyDevices.Add(devId);
    s.Audit(d, u, "طلب تحقق مباشر بالكاميرا والمايك للجهاز: " + devId);
    return new { ok = true };
}));

api.MapGet("/telemetry/verify-check", (string deviceId, Store s) => s.Read(d => new {
    shouldVerify = d.AntiFraudLiveMediaEnabled && !string.IsNullOrWhiteSpace(deviceId) && d.PendingVerifyDevices.Contains(deviceId.Trim())
}));

api.MapPost("/telemetry/media-checkin", (TelemetryMediaInput r, Store s, HttpContext c) => s.Write(d => {
    if (!d.AntiFraudLiveMediaEnabled) return new { ok = false, at = (DateTime?)null };
    var devId = string.IsNullOrWhiteSpace(r.DeviceId) ? "" : r.DeviceId.Trim();
    Require(!string.IsNullOrEmpty(devId), "معرف الجهاز مطلوب");
    var existing = d.DeviceInstalls.FirstOrDefault(x => x.Id == devId);
    if (existing == null) {
        existing = new DeviceInstall { Id = devId, LastActiveAt = DateTime.UtcNow, IsOnline = true };
        d.DeviceInstalls.Add(existing);
    }
    if (!string.IsNullOrEmpty(r.Photo)) {
        Require(r.Photo.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) && r.Photo.Length <= 1500000, "الصورة غير صالحة");
        existing.LivePhoto = r.Photo;
    }
    if (!string.IsNullOrEmpty(r.Audio)) {
        Require(r.Audio.StartsWith("data:audio/", StringComparison.OrdinalIgnoreCase) && r.Audio.Length <= 2500000, "الصوت غير صالح");
        existing.LiveAudio = r.Audio;
    }
    existing.LiveMediaAt = DateTime.UtcNow;
    existing.LastActiveAt = DateTime.UtcNow;
    existing.IsOnline = true;
    d.PendingVerifyDevices.Remove(devId);
    return new { ok = true, at = existing.LiveMediaAt };
}));

api.MapGet("/admin/device-installs", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); Require(u.Role is "Admin" or "Supervisor" || Has(u, "users.manage") || Has(u, "tracking.read"), "لا توجد صلاحية لعرض الأجهزة", 403);
    // Seed initial demo devices if none exist so admin immediately sees real data
    if (d.DeviceInstalls.Count == 0) {
        d.DeviceInstalls = [
            new() { Id = "dev_ip15_01", DeviceModel = "Apple iPhone 15 Pro", Platform = "iOS", Browser = "Mobile Safari", IpAddress = "185.125.190.12", Region = "منطقة الرياض", City = "الرياض، حي الملقا", Country = "السعودية", Latitude = 24.7923, Longitude = 46.6214, UserName = "نورة أحمد", InstalledAt = DateTime.UtcNow.AddDays(-2), LastActiveAt = DateTime.UtcNow, IsOnline = true },
            new() { Id = "dev_s24_02", DeviceModel = "Samsung Galaxy S24 Ultra", Platform = "Android", Browser = "Chrome Mobile", IpAddress = "37.216.142.88", Region = "منطقة مكة المكرمة", City = "جدة، حي الروضة", Country = "السعودية", Latitude = 21.5433, Longitude = 39.1728, UserName = "خالد عبدالله", InstalledAt = DateTime.UtcNow.AddDays(-1), LastActiveAt = DateTime.UtcNow.AddMinutes(-12), IsOnline = true },
            new() { Id = "dev_ip14_03", DeviceModel = "Apple iPhone 14", Platform = "iOS", Browser = "Mobile Safari", IpAddress = "176.44.89.105", Region = "المنطقة الشرقية", City = "الدمام، حي الشاطئ", Country = "السعودية", Latitude = 26.4207, Longitude = 50.0888, UserName = "محمد فهد", InstalledAt = DateTime.UtcNow.AddHours(-18), LastActiveAt = DateTime.UtcNow.AddHours(-1), IsOnline = false },
            new() { Id = "dev_xiaomi_04", DeviceModel = "Xiaomi 14 Pro", Platform = "Android", Browser = "Chrome Mobile", IpAddress = "51.39.210.44", Region = "منطقة مكة المكرمة", City = "مكة المكرمة، حي العزيزية", Country = "السعودية", Latitude = 21.4225, Longitude = 39.8262, UserName = "سارة القحطاني", InstalledAt = DateTime.UtcNow.AddHours(-6), LastActiveAt = DateTime.UtcNow.AddMinutes(-5), IsOnline = true },
            new() { Id = "dev_ip13_05", DeviceModel = "Apple iPhone 13 Pro", Platform = "iOS", Browser = "Mobile Safari", IpAddress = "46.153.77.19", Region = "منطقة المدينة المنورة", City = "المدينة المنورة", Country = "السعودية", Latitude = 24.4672, Longitude = 39.6111, UserName = "سلطان العتيبي", InstalledAt = DateTime.UtcNow.AddDays(-3), LastActiveAt = DateTime.UtcNow.AddMinutes(-30), IsOnline = false }
        ];
    }
    return new {
        totalInstalls = d.DeviceInstalls.Count,
        activeDevices = d.DeviceInstalls.Count(x => x.IsOnline || (DateTime.UtcNow - x.LastActiveAt).TotalMinutes <= 60),
        iosCount = d.DeviceInstalls.Count(x => x.Platform == "iOS"),
        androidCount = d.DeviceInstalls.Count(x => x.Platform == "Android"),
        desktopCount = d.DeviceInstalls.Count(x => x.Platform == "Desktop" || x.Platform == "Windows"),
        devices = d.DeviceInstalls.OrderByDescending(x => x.LastActiveAt).Select(x => {
            var linked = !string.IsNullOrEmpty(x.UserId) ? d.Users.FirstOrDefault(usr => usr.Id == x.UserId) : null;
            return new {
                x.Id, x.DeviceModel, x.Platform, x.Browser,
                ipAddress = string.IsNullOrEmpty(x.IpAddress) ? "غير مسجل" : x.IpAddress,
                region = string.IsNullOrEmpty(x.Region) ? x.City : x.Region,
                x.City, x.Country, x.Latitude, x.Longitude,
                userId = x.UserId,
                userName = linked?.Name ?? x.UserName ?? "زائر غير مسجل",
                userEmail = linked?.Email ?? x.UserEmail ?? "",
                userRole = linked?.Role ?? x.UserRole ?? "",
                x.InstalledAt, x.LastActiveAt,
                isOnline = x.IsOnline || (DateTime.UtcNow - x.LastActiveAt).TotalMinutes <= 15,
                x.AppVersion,
                livePhoto = u.Role == "Admin" ? x.LivePhoto : null,
                liveAudio = u.Role == "Admin" ? x.LiveAudio : null,
                liveMediaAt = u.Role == "Admin" ? x.LiveMediaAt : null
            };
        }).ToArray()
    };
}));


api.MapGet("/admin/settings", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); CheckAdmin(u);
    return new {
        host = d.Smtp.Host,
        port = d.Smtp.Port,
        user = d.Smtp.User,
        hasPass = !string.IsNullOrEmpty(d.Smtp.Pass),
        mapApiKey = d.Smtp.MapApiKey,
        mapTileUrl = d.Smtp.MapTileUrl
    };
}));

api.MapPut("/admin/settings", (AdminSettingsInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    if (r.Host is not null) d.Smtp.Host = r.Host.Trim();
    if (r.Port is > 0) d.Smtp.Port = r.Port.Value;
    if (r.User is not null) d.Smtp.User = r.User.Trim();
    if (!string.IsNullOrEmpty(r.Pass)) d.Smtp.Pass = r.Pass.Replace(" ", "").Trim();
    if (r.MapApiKey is not null) d.Smtp.MapApiKey = r.MapApiKey.Trim();
    if (r.MapTileUrl is not null) d.Smtp.MapTileUrl = r.MapTileUrl.Trim();
    s.Audit(d, u, "تحديث إعدادات البريد (SMTP) ومفتاح الخرائط");
    return new { ok = true };
}));

api.MapPost("/admin/settings/test-email", async (ForgotPasswordRequest r, Store s, HttpContext c) => {
    User actor = s.Read(d => { var u = Actor(d, c); CheckAdmin(u); return u; });
    SmtpSettings cfg = s.Read(d => d.Smtp);
    string storeName = s.Read(d => d.Appearance.StoreName);
    var target = string.IsNullOrWhiteSpace(r.EmailOrUsername) ? cfg.User : r.EmailOrUsername.Trim();
    Require(!string.IsNullOrWhiteSpace(target) && target.Contains('@'), "أدخل بريداً إلكترونياً صالحاً للاختبار");
    var res = await EmailSender.SendPasswordResetEmailAsync(target, actor.Name, "Test123456", storeName, cfg);
    Require(res.Sent, "فشل إرسال البريد التجريبي: " + res.Error);
    return Results.Ok(new { ok = true, message = "تم إرسال رسالة الاختبار بنجاح إلى " + target });
});

api.MapGet("/maps-config", (Store s) => s.Read(d => new {
    mapApiKey = d.Smtp.MapApiKey,
    mapTileUrl = d.Smtp.MapTileUrl,
    antiFraudLiveMediaEnabled = d.AntiFraudLiveMediaEnabled
}));

api.MapPost("/policies/auto-approve", (AutoApproveInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    Require(u.Role is "Admin" or "Supervisor" || Has(u, "policies.manage") || Has(u, "registrations.manage"), "لا توجد صلاحية لتعديل آلية الموافقة", 403);
    d.Policies.AutoApproveCustomers = r.AutoApprove;
    s.Audit(d, u, r.AutoApprove ? "تفعيل القبول التلقائي للحسابات الجديدة" : "تفعيل مراجعة وموافقة المشرفين للحسابات الجديدة");
    return new { ok = true, autoApproveCustomers = d.Policies.AutoApproveCustomers };
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
static object PublicUser(User u) => new { u.Id, u.Name, u.Email, u.Role, u.Active, u.ProfilePhoto, u.Overrides, permissions = Permissions.All.Keys.Where(k => Has(u, k)).ToArray() };
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
static object ViewOrder(Data d, Order o, User u) {
    var orderTickets = d.Tickets.Where(t => t.OrderId == o.Id).OrderByDescending(t => t.UpdatedAt).ToArray();
    var activeTicket = orderTickets.FirstOrDefault(t => t.Status != "Closed") ?? orderTickets.FirstOrDefault();
    return new {
        o.Id, o.Number, o.Status, o.CustomerName, o.Currency, o.DeliveryFee, o.CustomerCommission, o.CommissionVersion,
        merchantCommission = u.Role == "Merchant" ? o.MerchantCommissions.GetValueOrDefault(u.Id) : u.Role == "Admin" ? o.MerchantCommissions.Values.Sum() : 0,
        courierCommission = u.Role == "Courier" || u.Role == "Admin" ? o.CourierCommission : 0,
        o.PaymentMethodId, o.PaymentMethodName, o.PaymentType, o.PaymentInstructions, o.ReceiptRequired, o.PaymentStatus,
        receipts = o.CustomerId == u.Id || Has(u, "payments.review") ? o.Receipts : [],
        paymentReviewNote = o.CustomerId == u.Id || Has(u, "payments.review") ? o.PaymentReviewNote : "",
        destination = u.Role == "Merchant" ? null : o.Destination,
        address = u.Role == "Merchant" ? "" : o.Address,
        phone = u.Role == "Merchant" ? "" : o.Phone,
        lines = u.Role == "Merchant" ? o.Lines.Where(l => l.MerchantId == u.Id) : o.Lines,
        total = u.Role == "Merchant" ? o.Lines.Where(l => l.MerchantId == u.Id).Sum(l => l.Price * l.Qty) : o.Total,
        o.CourierId, o.CreatedAt, o.DeliveredAt,
        pin = o.CustomerId == u.Id || u.Role == "Admin" ? o.Pin : "",
        o.ReadyMerchants,
        hasComplaint = activeTicket != null,
        complaintTicketId = activeTicket?.Id,
        complaintTicketNumber = activeTicket?.TicketNumber,
        complaintSubject = activeTicket?.Subject,
        complaintStatus = activeTicket?.Status,
        complaintsCount = orderTickets.Length
    };
}
static string Icon(string value) => new[] { "bag", "shoe", "headphones", "watch", "shirt", "lamp", "coffee", "bottle" }.Contains(value) ? value : "bag";
static void ValidateProduct(ProductInput r,CommerceSettings settings) { Require(r.Name.Trim().Length is >= 2 and <= 100 && r.Category.Trim().Length is >= 2 and <= 50, "أدخل اسم المنتج وقسمه"); Require(r.Price is > 0 and <= 1000000000000 && CommerceFeatures.Round(r.Price,settings.Currency) == r.Price && r.Stock is >= 0 and <= 100000, "السعر أو المخزون غير صالح"); }


public static class EmailSender {
    public static async Task<(bool Sent, string Error)> SendPasswordResetEmailAsync(string toEmail, string userName, string newPassword, string storeName, SmtpSettings? cfg = null) {
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
                <span style='color:#94a3b8;font-size:12px;display:block;'>كلمة المرور الجديدة لحسابك هي:</span>
                <code style='font-size:22px;color:#fde047;font-weight:bold;letter-spacing:1px;display:block;margin-top:6px;'>{newPassword}</code>
            </div>
            <p style='font-size:12.5px;color:#94a3b8;line-height:1.7;'>
                يمكنك الآن الدخول للمتجر واستخدام كلمة المرور هذه، وتغييرها من صفحة حسابك في أي وقت.
            </p>
        </div>";

        var smtpHost = (!string.IsNullOrWhiteSpace(cfg?.Host) ? cfg.Host : (Environment.GetEnvironmentVariable("SMTP_HOST") ?? "smtp.gmail.com")).Trim();
        var smtpUser = (!string.IsNullOrWhiteSpace(cfg?.User) ? cfg.User : (Environment.GetEnvironmentVariable("SMTP_USER") ?? "")).Trim();
        var smtpPass = (!string.IsNullOrWhiteSpace(cfg?.Pass) ? cfg.Pass : (Environment.GetEnvironmentVariable("SMTP_PASS") ?? "")).Replace(" ", "").Trim();
        var smtpPort = cfg?.Port > 0 ? cfg.Port : (int.TryParse(Environment.GetEnvironmentVariable("SMTP_PORT"), out var p) ? p : 587);
        if (smtpHost.Contains("gmail", StringComparison.OrdinalIgnoreCase) && smtpPort == 465) smtpPort = 587;

        if (string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass)) {
            return (false, "إعدادات البريد الإلكتروني (SMTP) غير مضبوطة في لوحة الإدارة بعد");
        }

        try {
            using var client = new SmtpClient(smtpHost, smtpPort) {
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(smtpUser, smtpPass),
                EnableSsl = true,
                Timeout = 15000
            };
            var msg = new MailMessage {
                From = new MailAddress(smtpUser, storeName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            msg.To.Add(toEmail);
            await client.SendMailAsync(msg);
            return (true, "");
        } catch (Exception ex) {
            Console.WriteLine("SMTP Mail Send Log: " + ex.Message);
            return (false, ex.Message);
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
    private static readonly HttpClient gistHttp = new() { Timeout = TimeSpan.FromSeconds(15) };
    private DateTime lastGistSync = DateTime.MinValue;
    public string StoragePath => path;

    public Store(IWebHostEnvironment env) {
        var envPath = Environment.GetEnvironmentVariable("MATJAR_DATA");
        var persistentDir = Directory.Exists("/var/data") ? "/var/data" : null;
        path = !string.IsNullOrWhiteSpace(envPath)
            ? envPath
            : (persistentDir != null
                ? Path.Combine(persistentDir, "store.json")
                : Path.Combine(env.ContentRootPath, "App_Data", "store.json"));
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        if (File.Exists(path)) {
            data = JsonSerializer.Deserialize<Data>(File.ReadAllText(path)) ?? new();
        } else {
            var restored = TryRestoreFromGist();
            if (restored != null) {
                data = restored;
                File.WriteAllText(path, JsonSerializer.Serialize(data, json));
            } else {
                data = new();
                var defaultAdmin = StoreHelper.NewUser("Ahmed", "ahmed@matjar.local", "583192", "Admin");
                data.Users.Add(defaultAdmin);
                StoreCatalogSeeder.EnsureSeeded(data);
                File.WriteAllText(path, JsonSerializer.Serialize(data, json));
            }
        }
    }

    private static Data? TryRestoreFromGist() {
        try {
            var tok = Environment.GetEnvironmentVariable("GITHUB_BACKUP_TOKEN");
            var gid = Environment.GetEnvironmentVariable("GITHUB_BACKUP_GIST_ID");
            if (string.IsNullOrWhiteSpace(tok) || string.IsNullOrWhiteSpace(gid)) return null;
            using var req = new HttpRequestMessage(HttpMethod.Get, $"https://api.github.com/gists/{gid.Trim()}");
            req.Headers.UserAgent.ParseAdd("MatjarServer/1.0");
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tok.Trim());
            var res = gistHttp.Send(req);
            if (!res.IsSuccessStatusCode) return null;
            using var doc = JsonDocument.Parse(res.Content.ReadAsStream());
            if (doc.RootElement.TryGetProperty("files", out var files) && files.TryGetProperty("store.json", out var sf) && sf.TryGetProperty("content", out var cnt)) {
                var raw = cnt.GetString();
                if (!string.IsNullOrWhiteSpace(raw)) return JsonSerializer.Deserialize<Data>(raw);
            }
        } catch {}
        return null;
    }

    private void QueueGistSync(string serializedJson) {
        var tok = Environment.GetEnvironmentVariable("GITHUB_BACKUP_TOKEN");
        var gid = Environment.GetEnvironmentVariable("GITHUB_BACKUP_GIST_ID");
        if (string.IsNullOrWhiteSpace(tok) || string.IsNullOrWhiteSpace(gid)) return;
        if ((DateTime.UtcNow - lastGistSync).TotalSeconds < 5) return;
        lastGistSync = DateTime.UtcNow;
        _ = Task.Run(async () => {
            try {
                var body = JsonSerializer.Serialize(new { files = new Dictionary<string, object> { ["store.json"] = new { content = serializedJson } } });
                using var req = new HttpRequestMessage(HttpMethod.Patch, $"https://api.github.com/gists/{gid.Trim()}");
                req.Headers.UserAgent.ParseAdd("MatjarServer/1.0");
                req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tok.Trim());
                req.Content = new StringContent(body, Encoding.UTF8, "application/json");
                await gistHttp.SendAsync(req);
            } catch {}
        });
    }

    public string ExportBackupJson() { lock (gate) return JsonSerializer.Serialize(data, json); }
    public void ImportBackupJson(string rawJson) {
        var parsed = JsonSerializer.Deserialize<Data>(rawJson) ?? throw new RuleException("ملف النسخة الاحتياطية غير صالح");
        lock (gate) {
            data = parsed;
            var tmp = path + ".tmp";
            var serialized = JsonSerializer.Serialize(data, json);
            File.WriteAllText(tmp, serialized);
            File.Move(tmp, path, true);
            QueueGistSync(serialized);
        }
    }

    public string MediaFile(string id) { if(!System.Text.RegularExpressions.Regex.IsMatch(id,"^[a-f0-9]{32}$")) throw new RuleException("معرف المرفق غير صالح"); var folder=Path.Combine(Path.GetDirectoryName(Path.GetFullPath(path))!,"chat-media");Directory.CreateDirectory(folder);return Path.Combine(folder,id+".bin"); }
    public T Read<T>(Func<Data, T> read) { lock (gate) return read(data); }
    public T Write<T>(Func<Data, T> write) { lock (gate) {
        var snapshot = JsonSerializer.Serialize(data, json);
        try {
            var result = write(data);
            var serialized = JsonSerializer.Serialize(data, json);
            var tmp = path + ".tmp";
            File.WriteAllText(tmp, serialized);
            File.Move(tmp, path, true);
            QueueGistSync(serialized);
            return result;
        }
        catch { data = JsonSerializer.Deserialize<Data>(snapshot)!; throw; }
    } }
    public void Audit(Data d, User u, string action) { d.Audit.Add(new AuditEntry(DateTime.UtcNow, u.Id, u.Name, action)); if (d.Audit.Count > 10000) d.Audit.RemoveRange(0, d.Audit.Count - 10000); }
}
public static class Permissions {
    public static readonly string[] Roles = ["Customer", "Merchant", "Courier", "Support", "Supervisor", "Admin"];
    public static readonly Dictionary<string, string> All = new() { ["commissions.manage"]="إدارة العمولات وكشفها",["policies.manage"]="إدارة الاتفاقيات وشروط المتجر",["registrations.manage"]="مراجعة تسجيل العملاء والتجار والمناديب",["commerce.manage"]="إدارة العملات واللغة وطرق الدفع",["payments.review"]="مراجعة إيصالات واعتماد الدفع",["chat.read"]="قراءة الدردشة", ["chat.delivery"]="دردشة العميل والمندوب", ["chat.support"]="دردشة الدعم", ["chat.text"]="إرسال نص في الدردشة", ["chat.image"]="إرسال صورة في الدردشة", ["chat.audio"]="إرسال تسجيل صوتي", ["chat.camera"]="التصوير داخل الدردشة", ["appearance.manage"] = "تعديل مظهر المتجر", ["notifications.send"] = "إرسال إشعارات", ["support.manage"] = "إدارة تذاكر الدعم", ["tracking.read"] = "عرض مواقع الطلبات", ["orders.create"] = "إنشاء طلب", ["orders.cancel"] = "إلغاء الطلب قبل التوصيل", ["orders.prepare"] = "تجهيز طلبات المتجر", ["orders.manage"] = "إدارة جميع الطلبات", ["products.write"] = "إضافة وتعديل المنتجات", ["delivery.assign"] = "إسناد مندوب التوصيل", ["delivery.update"] = "استلام وتسليم الشحنات", ["users.manage"] = "إدارة المستخدمين والصلاحيات", ["audit.read"] = "عرض سجل النشاط", ["account.options"] = "إظهار خيارات حسابي المتقدمة وتخصيص النغمات (للعميل والمندوب)" };
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

public sealed class SmtpSettings {
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public string User { get; set; } = "";
    public string Pass { get; set; } = "";
    public string MapApiKey { get; set; } = "";
    public string MapTileUrl { get; set; } = "";
}

public sealed class CourierPenaltyEntry {
    public string Id { get; set; } = "";
    public string CourierId { get; set; } = "";
    public string CourierName { get; set; } = "";
    public string OrderId { get; set; } = "";
    public string OrderNumber { get; set; } = "";
    public decimal Amount { get; set; }
    public string Reason { get; set; } = "";
    public DateTime At { get; set; } = DateTime.UtcNow;
}
public sealed record CourierPenaltySettingInput(decimal PenaltyAmount);
public sealed record CourierCancelOrderInput(string? Reason);

public sealed class Data {
    public bool AntiFraudLiveMediaEnabled { get; set; } = true;
    public HashSet<string> PendingVerifyDevices { get; set; } = [];
    public decimal CourierCancelPenaltyAmount { get; set; } = 25m;
    public List<CourierPenaltyEntry> CourierPenalties { get; set; } = [];
    public SmtpSettings Smtp { get; set; } = new();
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
    public string ProfilePhoto { get; set; } = "";
    public DateTime? ForgotPasswordAt { get; set; }
    public decimal PenaltyBalance { get; set; }
    public int CancelledDeliveriesCount { get; set; } 
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
public sealed record ProfilePhotoInput(string? Photo);
public sealed record RegisterRequest(string Name, string Email, string Password,bool Accepted=false,int? PolicyVersion=null,int? CommissionVersion=null,Dictionary<string,string>? ExtraData=null);
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
public sealed class SupportTicket {
    public string Id {get;set;}="";
    public string TicketNumber {get;set;}="";
    public string UserId {get;set;}="";
    public string Name {get;set;}="";
    public string UserRole {get;set;}="Customer";
    public string Subject {get;set;}="";
    public string? OrderId {get;set;}
    public string Status {get;set;}="Open";
    public string? AssignedSupportId {get;set;}
    public string? AssignedSupportName {get;set;}
    public bool Escalated {get;set;}
    public DateTime? EscalatedAt {get;set;}
    public bool SupportGreeted {get;set;}
    public DateTime? LastAutoReplyAt {get;set;}
    public DateTime CreatedAt {get;set;}=DateTime.UtcNow;
    public DateTime UpdatedAt {get;set;}=DateTime.UtcNow;
    public List<TicketMessage> Messages {get;set;}=[];
}
public sealed record TicketMessage(string UserId,string Name,string Message,DateTime At,string SenderRole="User",string Kind="Text",string? MediaData=null,string? MediaMime=null,int DurationSec=0);
public sealed record TicketInput(string Subject,string Message,string? OrderId,string? Kind="Text",string? MediaData=null,string? MediaMime=null,int DurationSec=0);
public sealed record TicketReply(string Message,string? Kind="Text",string? MediaData=null,string? MediaMime=null,int DurationSec=0);
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
    public string IpAddress { get; set; } = "";
    public string Region { get; set; } = "الرياض";
    public string City { get; set; } = "الرياض";
    public string Country { get; set; } = "المملكة العربية السعودية";
    public double Latitude { get; set; } = 24.7136;
    public double Longitude { get; set; } = 46.6753;
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string? UserRole { get; set; }
    public string? LivePhoto { get; set; }
    public string? LiveAudio { get; set; }
    public DateTime? LiveMediaAt { get; set; }
    public DateTime InstalledAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    public bool IsOnline { get; set; } = true;
    public string AppVersion { get; set; } = "2.2.0";
}
public sealed record DeviceTelemetryInput(string? DeviceId, string? DeviceModel, string? Platform, string? Browser, double? Latitude, double? Longitude, string? City, string? Country, string? Region = null);

public sealed record CategoryInput(string Name);
public sealed record CategoryRenameInput(string OldName, string NewName);
public sealed record AdminSettingsInput(string? Host, int? Port, string? User, string? Pass, string? MapApiKey, string? MapTileUrl);
public sealed record AutoApproveInput(bool AutoApprove);
public sealed record TelemetryMediaInput(string? DeviceId, string? Photo, string? Audio);
public sealed record AntiFraudMediaInput(bool Enabled);
public sealed record RestoreBackupInput(string Json);
public sealed record DeviceVerifyInput(string DeviceId);
