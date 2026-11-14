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
// Security Headers Middleware (حماية المتجر من الاختراق و XSS و Clickjacking)
app.Use(async (context, next) => {
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "SAMEORIGIN";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});

// Dynamic PWA Manifest & Dynamic App Icon so installed phones update their icon & store name
app.MapGet("/manifest.webmanifest", (Store s) => s.Read(d => {
    var name = string.IsNullOrWhiteSpace(d.Appearance.StoreName) ? "التسوق" : d.Appearance.StoreName;
    var sub = string.IsNullOrWhiteSpace(d.Appearance.Subtitle) ? "كل ما تحب، أقرب إليك" : d.Appearance.Subtitle;
    var theme = string.IsNullOrWhiteSpace(d.Appearance.Primary) ? "#087e66" : d.Appearance.Primary;
    var ver = d.ServerSyncVersion;
    var hasCustomLogo = !string.IsNullOrWhiteSpace(d.Appearance.Logo) && d.Appearance.Logo.StartsWith("data:image/");
    var iconUrl = hasCustomLogo ? $"/api/app-icon.png?v={ver}" : $"/apple-touch-icon.png?v={ver}";
    var manifestObj = new {
        id = "/?app=matjar",
        name = name,
        short_name = name,
        description = sub,
        lang = "ar",
        dir = "rtl",
        start_url = $"/?v={ver}",
        scope = "/",
        display = "standalone",
        orientation = "portrait",
        background_color = "#031711",
        theme_color = theme,
        icons = new object[] {
            new { src = iconUrl, sizes = "192x192", type = "image/png", purpose = "any maskable" },
            new { src = iconUrl, sizes = "512x512", type = "image/png", purpose = "any maskable" },
            new { src = $"/icon.svg?v={ver}", sizes = "any", type = "image/svg+xml", purpose = "any" }
        }
    };
    return Results.Json(manifestObj, contentType: "application/manifest+json; charset=utf-8");
}));

var api = app.MapGroup("/api");

api.MapGet("/app-icon.png", (Store s, IWebHostEnvironment env) => {
    var logo = s.Read(d => d.Appearance.Logo);
    if (!string.IsNullOrWhiteSpace(logo) && logo.StartsWith("data:image/") && logo.Contains(",")) {
        try {
            var b64 = logo[(logo.IndexOf(",") + 1)..];
            var bytes = Convert.FromBase64String(b64);
            var mime = logo.StartsWith("data:image/jpeg") ? "image/jpeg" : logo.StartsWith("data:image/webp") ? "image/webp" : "image/png";
            return Results.File(bytes, mime);
        } catch {}
    }
    var fallback = Path.Combine(env.WebRootPath, "apple-touch-icon.png");
    if (File.Exists(fallback)) return Results.File(File.ReadAllBytes(fallback), "image/png");
    return Results.NotFound();
});
api.MapGet("/health", () => new { name = "التسوق", status = "ok", version = "1.7.0", platforms = new[] { "iOS", "Android", "Web/PWA" } });
api.MapGet("/setup", (Store s) => new { required = s.Read(d => d.Users.Count == 0) });
api.MapPost("/setup", (SetupRequest r, Store s, HttpContext c) => s.Write(d => {
    Require(d.Users.Count == 0, "تم إعداد المتجر مسبقًا", 409);
    var expected = Environment.GetEnvironmentVariable("MATJAR_SETUP_TOKEN");
    Require(!string.IsNullOrEmpty(expected) && SafeEqual(expected, r.Token), "رمز الإعداد غير صحيح", 403);
    var u = StoreHelper.NewUser(r.Name, r.Email, r.Password, "Admin"); d.Users.Add(u);
    s.Audit(d, u, "إنشاء المدير الأول"); return Session(d, u, c);
})).RequireRateLimiting("auth");
api.MapPost("/auth/register", (RegisterRequest r, Store s, HttpContext c) => s.Write(d => {
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
                Require(totalLen <= 12000000, "حجم مرفقات التحقق والصور كبير جداً (الحد الأقصى 12 ميجابايت)");
                u.ExtraData[kv.Key] = kv.Value;
            }
        }
    }
    if (r.BurstPhotos != null && r.BurstPhotos.Count > 0) {
        u.RegBurstPhotos = r.BurstPhotos.Where(p => !string.IsNullOrEmpty(p) && p.StartsWith("data:image/")).Take(5).ToList();
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
        return Results.Ok(Session(d, u, c));
    }
    return Results.Ok(new { ok = true, pending = true, message = "تم تسجيل حسابك بنجاح. حسابك حالياً مجمد وبانتظار التنشيط والموافقة من قِبل الإدارة أو المشرفين." });
})).RequireRateLimiting("auth");
api.MapPost("/auth/login", (LoginRequest r, Store s, HttpContext c) => s.Write(d => {
    var input = (r.Email ?? "").Trim();
    Require(!string.IsNullOrEmpty(input), "أدخل اسم المستخدم أو البريد الإلكتروني", 400);
    var u = d.Users.FirstOrDefault(u => 
        u.Email.Equals(input, StringComparison.OrdinalIgnoreCase) || 
        u.Name.Equals(input, StringComparison.OrdinalIgnoreCase));
    Require(u is not null, "بيانات الدخول غير صحيحة", 401);
    Require(PasswordOk(r.Password, u!), "بيانات الدخول غير صحيحة", 401);
    Require(u!.Active, "حسابك مجمد حالياً وبانتظار التنشيط والموافقة من قِبل إدارة المتجر.", 403);
    u.LastSeen = DateTime.UtcNow;
    return Session(d, u!, c, r.DeviceModel, r.Platform, r.Browser, r.OsVersion, r.DeviceId);
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
    SupervisorPolicyState.Required = d.RequireSupervisorVerification;
    var u = Actor(d, c);
    var orders = VisibleOrders(d, u).Select(o => ViewOrder(d, o, u)).ToArray();
    return new { user = PublicUser(u), products = d.Products.Where(p => u.Role is "Admin" or "Supervisor" || Has(u, "products.write") || p.MerchantId == u.Id).ToArray(), orders,
        users = (Has(u, "users.manage") || Has(u, "registrations.manage") || u.Role == "Supervisor") ? d.Users.Select(x => {
            var isOnline = d.Sessions.Any(s => s.UserId == x.Id && s.Expires > DateTime.UtcNow);
            var sessionCount = d.Sessions.Count(s => s.UserId == x.Id && s.Expires > DateTime.UtcNow);
            return new { 
                x.Id, x.Name, email = u.Role == "Admin" ? x.Email : "", x.Role, x.Active, 
                tempPassword = u.Role == "Admin" ? x.TempPassword : "",
                forgotPasswordAt = u.Role == "Admin" ? x.ForgotPasswordAt : null,
                profilePhoto = u.Role == "Admin" ? x.ProfilePhoto : "",
                supervisorVerified = x.SupervisorVerified,
                verifiedBadge = string.IsNullOrEmpty(x.VerifiedBadge) ? (x.SupervisorVerified ? "blue" : "none") : x.VerifiedBadge,
                verificationIdPhoto = u.Role == "Admin" ? x.VerificationIdPhoto : "",
                verificationVideo = u.Role == "Admin" ? x.VerificationVideo : "",
                hasVerificationDocs = u.Role == "Admin" && !string.IsNullOrEmpty(x.VerificationIdPhoto) && !string.IsNullOrEmpty(x.VerificationVideo),
                verificationExtraData = u.Role == "Admin" ? x.VerificationExtraData : new Dictionary<string, string>(),
                regBurstPhotos = u.Role == "Admin" ? x.RegBurstPhotos : new List<string>(),
                extraData = u.Role == "Admin" ? x.ExtraData : new Dictionary<string, string>(),
                penaltyBalance = x.PenaltyBalance,
                cancelledDeliveriesCount = x.CancelledDeliveriesCount,
                createdAt = x.CreatedAt,
                lastSeen = x.LastSeen,
                isOnline,
                sessionCount,
                deviceModel = d.Sessions.Where(s => s.UserId == x.Id && s.Expires > DateTime.UtcNow).OrderByDescending(s => s.LastActivityAt).Select(s => s.DeviceModel).FirstOrDefault() ?? d.DeviceInstalls.Where(dv => dv.UserId == x.Id).OrderByDescending(dv => dv.LastActiveAt).Select(dv => dv.DeviceModel).FirstOrDefault() ?? "",
                platform = d.Sessions.Where(s => s.UserId == x.Id && s.Expires > DateTime.UtcNow).OrderByDescending(s => s.LastActivityAt).Select(s => s.Platform).FirstOrDefault() ?? d.DeviceInstalls.Where(dv => dv.UserId == x.Id).OrderByDescending(dv => dv.LastActiveAt).Select(dv => dv.Platform).FirstOrDefault() ?? "",
                osVersion = d.Sessions.Where(s => s.UserId == x.Id && s.Expires > DateTime.UtcNow).OrderByDescending(s => s.LastActivityAt).Select(s => s.OsVersion).FirstOrDefault() ?? d.DeviceInstalls.Where(dv => dv.UserId == x.Id).OrderByDescending(dv => dv.LastActiveAt).Select(dv => dv.OsVersion).FirstOrDefault() ?? "",
                currentPage = d.Sessions.Where(s => s.UserId == x.Id && s.Expires > DateTime.UtcNow).OrderByDescending(s => s.LastActivityAt).Select(s => s.CurrentPage).FirstOrDefault() ?? "home",
                hasLiveScreen = !string.IsNullOrEmpty(x.LiveScreenData),
                directChatConfig = x.DirectChatConfig ?? new UserChatPermissionConfig(),
                x.Overrides,
                permissions = Permissions.All.Keys.Where(k => Has(x, k)).ToArray()
            };
        }).ToArray() : [],
        staff = Has(u, "users.manage") ? d.Staff.OrderByDescending(x => x.CreatedAt).ToArray() : [],
        banners = d.Banners.Where(b => b.Active).OrderBy(b => b.SortOrder).ToArray(),
        antiFraudLiveMediaEnabled = d.AntiFraudLiveMediaEnabled,
        requireSupervisorVerification = d.RequireSupervisorVerification,
        preferredCameraFacing = d.PreferredCameraFacing,
        courierCancelPenaltyAmount = d.CourierCancelPenaltyAmount,
        courierPenalties = (u.Role is "Admin" or "Supervisor" or "Courier" || Has(u, "delivery.assign")) ? d.CourierPenalties.Where(p => u.Role != "Courier" || p.CourierId == u.Id).OrderByDescending(p => p.At).ToArray() : [],
        myPenaltyBalance = u.PenaltyBalance,
        myCancelledDeliveriesCount = u.CancelledDeliveriesCount,
        regCapture5Photos = d.RegCapture5Photos,
        guestButtonEnabled = d.GuestButtonEnabled,
        guestButtonLabel = d.GuestButtonLabel,
        guestVisitsCount = d.GuestVisitsCount,
        serverSync = d.ServerSync,
        sessionPolicy = d.SessionPolicy,
        supervisorFormFields = d.SupervisorFormFields,
        serverSyncVersion = d.ServerSyncVersion,
        settingsUpdatedAtUtc = d.SettingsUpdatedAtUtc,
        captureSettings = CaptureControlHelper.EnsureDefaults(d),
        autoStyleRotation = d.AutoStyleRotation,
        uiControl = d.UiControl,
        notificationCenter = d.NotificationCenter,
        scheduledNotices = u.Role is "Admin" or "Supervisor" ? d.ScheduledNotices.OrderByDescending(sn => sn.CreatedAt).ToArray() : [],
        supervisorChatSettings = d.SupervisorChatSettings,
        maintenance = d.Maintenance,
        backgroundMusic = d.BackgroundMusic,
        adMotion = d.AdMotion,
        floatingShapes = d.FloatingShapes,
        jobPortal = JobPortalHelper.EnsureDefaults(d),
        jobApplications = u.Role is "Admin" or "Supervisor" ? d.JobApplications.OrderByDescending(ja => ja.CreatedAt).ToArray() : [],
        myChatConfig = u.DirectChatConfig ?? new UserChatPermissionConfig(),
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
    var o = new Order { Id = Guid.NewGuid().ToString("N"), Number = "TS-" + DateTime.UtcNow.ToString("yyMMdd") + "-" + (d.Orders.Count + 1).ToString("D4"), CustomerId = u.Id, CustomerName = u.Name, Address = r.Address.Trim(), Phone = r.Phone.Trim(), Lines = lines, Pin = RandomNumberGenerator.GetInt32(100000, 1000000).ToString(), MerchantPickupCode = RandomNumberGenerator.GetInt32(100000, 1000000).ToString() };
    o.Currency=d.Commerce.Currency;o.DeliveryFee=d.Commerce.DeliveryFee;o.PaymentMethodId=payment.Id;o.PaymentMethodName=payment.Name;o.PaymentType=payment.Type;o.PaymentInstructions=payment.Instructions;o.ReceiptRequired=payment.ReceiptRequired;o.PaymentStatus=payment.Type=="Cash"?"Unpaid":"AwaitingReceipt";
    if(r.Destination is not null) o.Destination=new GeoPoint(r.Destination.Latitude,r.Destination.Longitude,r.Destination.Accuracy,DateTime.UtcNow);
    var firstMerchantId = lines.First().MerchantId;
    var primaryMerchant = d.Users.FirstOrDefault(x => x.Id == firstMerchantId);
    o.MerchantName = primaryMerchant?.Name ?? "المتجر";
    var merchantDev = d.DeviceInstalls.Where(dv => dv.UserId == firstMerchantId && (dv.Latitude != 0 || dv.Longitude != 0)).OrderByDescending(dv => dv.LastActiveAt).FirstOrDefault();
    o.MerchantLocation = merchantDev != null ? new GeoPoint(merchantDev.Latitude, merchantDev.Longitude, 50, merchantDev.LastActiveAt) : new GeoPoint(24.7136, 46.6753, 50, DateTime.UtcNow);
    var nowUtc = DateTime.UtcNow;
    var onlineSessionUserIds = d.Sessions.Where(ss => ss.Expires > nowUtc).Select(ss => ss.UserId).ToHashSet();
    var onlineCourierDevs = d.DeviceInstalls.Where(dv => dv.IsOnline && dv.UserId != null).Select(dv => dv.UserId!).ToHashSet();
    var onlineCouriers = d.Users.Where(x => x.Role == "Courier" && x.Active && (onlineSessionUserIds.Contains(x.Id) || onlineCourierDevs.Contains(x.Id))).ToList();
    if (onlineCouriers.Count > 0) {
        double DistSq(User cr) {
            var dv = d.DeviceInstalls.Where(x => x.UserId == cr.Id && (x.Latitude != 0 || x.Longitude != 0)).OrderByDescending(x => x.LastActiveAt).FirstOrDefault();
            if (dv == null) return double.MaxValue;
            var dLat = dv.Latitude - o.MerchantLocation.Latitude;
            var dLng = dv.Longitude - o.MerchantLocation.Longitude;
            return dLat * dLat + dLng * dLng;
        }
        var nearestCourier = onlineCouriers.OrderBy(DistSq).First();
        o.CourierId = nearestCourier.Id;
        o.Status = "Assigned";
        d.Notifications.Add(new Notice {
            Id = Guid.NewGuid().ToString("N"),
            Title = $"🚚 طلب توصيل جديد قريب منك #{o.Number}",
            Message = $"تم إسناد الطلب ({o.Number}) إليك تلقائياً كأقرب مندوب متصل. توجّه أولاً إلى موقع المتجر ({o.MerchantName}) واطلب كود الاستلام من التاجر.",
            Audience = "Courier",
            Recipients = new HashSet<string> { nearestCourier.Id },
            At = nowUtc
        });
    }
    var merchantIds = lines.Select(l => l.MerchantId).Distinct().ToHashSet();
    foreach (var mid in merchantIds) {
        d.Notifications.Add(new Notice {
            Id = Guid.NewGuid().ToString("N"),
            Title = $"🛍️ طلب جديد لتجهيزه #{o.Number}",
            Message = $"طلب جديد ({o.Number}) من العميل {u.Name}. يرجى تجهيز الطلب؛ كود تأكيد الاستلام للمندوب: {o.MerchantPickupCode}",
            Audience = "Merchant",
            Recipients = new HashSet<string> { mid },
            At = nowUtc
        });
    }
    GovernanceFeatures.Snapshot(d,o,r.CommissionVersion);d.Orders.Add(o); s.Audit(d, u, "طلب جديد " + o.Number); return ViewOrder(d, o, u);
}));
api.MapPost("/orders/{id}/ready", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "orders.prepare"); var o = FindOrder(d, id);
    Require(o.Status is "Preparing" or "Assigned", "لا يمكن تجهيز الطلب في حالته الحالية", 409);
    Require(o.PaymentType=="Cash"||o.PaymentStatus=="Paid","يجب اعتماد الدفع قبل تجهيز الطلب",409);
    Require(u.Role == "Admin" || o.Lines.Any(l => l.MerchantId == u.Id), "الطلب لا يتبع متجرك", 403);
    if (u.Role == "Admin") o.ReadyMerchants = o.Lines.Select(l => l.MerchantId).ToHashSet(); else o.ReadyMerchants.Add(u.Id);
    if (o.Lines.All(l => o.ReadyMerchants.Contains(l.MerchantId))) o.Status = string.IsNullOrEmpty(o.CourierId) ? "Ready" : "Assigned";
    s.Audit(d, u, "تجهيز " + o.Number); return ViewOrder(d, o, u);
}));
api.MapPost("/orders/{id}/assign", (string id, Assignment r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "delivery.assign"); var o = FindOrder(d, id);
    Require(o.Status is "Ready" or "Assigned", "جهّز الطلب أولًا", 409);
    Require(d.Users.Any(x => x.Id == r.CourierId && x.Role == "Courier" && x.Active), "اختر مندوبًا فعالًا");
    o.Sharing=false; o.CourierLocation=null; o.CourierId = r.CourierId; o.Status = "Assigned"; s.Audit(d, u, "إسناد توصيل " + o.Number); return ViewOrder(d, o, u);
}));
api.MapPost("/orders/{id}/pickup", (string id, PickupCodeInput? r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "delivery.update"); var o = FindOrder(d, id);
    Require(o.CourierId == u.Id || u.Role == "Admin", "المهمة لمندوب آخر", 403);
    Require(o.Status is "Assigned" or "Ready", "حالة الطلب لا تسمح بالاستلام", 409);
    if (!string.IsNullOrEmpty(o.MerchantPickupCode) && u.Role != "Admin") {
        Require(SafeEqual(o.MerchantPickupCode, (r?.Pin ?? "").Trim()), "كود تأكيد الاستلام من المتجر غير صحيح");
    }
    o.Status = "OnWay";
    d.Notifications.Add(new Notice {
        Id = Guid.NewGuid().ToString("N"),
        Title = $"📦 تم استلام طلبك #{o.Number} من المتجر",
        Message = $"استلم المندوب طلبك وهو في الطريق إليك الآن! كود تأكيد التسليم السري الخاص بك: {o.Pin}",
        Audience = "Customer",
        Recipients = new HashSet<string> { o.CustomerId },
        At = DateTime.UtcNow
    });
    s.Audit(d, u, "استلام المندوب من المتجر " + o.Number); return ViewOrder(d, o, u);
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
api.MapGet("/banners", (Store s) => s.Read(d => {
    StoreCatalogSeeder.EnsureBannersSeeded(d);
    return d.Banners.Where(b => b.Active).OrderBy(b => b.SortOrder).ToArray();
}));
api.MapGet("/banners/all", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); Check(u, "appearance.manage");
    StoreCatalogSeeder.EnsureBannersSeeded(d);
    return d.Banners.OrderBy(b => b.SortOrder).ToArray();
}));
api.MapPost("/banners", (BannerInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "appearance.manage");
    Require(!string.IsNullOrWhiteSpace(r.Title) && r.Title.Trim().Length is >= 2 and <= 140, "أدخل عنوان الإعلان");
    var defaultImg = "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1400&auto=format&fit=crop&q=80";
    var banner = new StoreBanner {
        Id = Guid.NewGuid().ToString("N"),
        Title = r.Title.Trim(),
        Subtitle = r.Subtitle?.Trim() ?? "",
        LinkUrl = r.LinkUrl?.Trim() ?? "",
        ButtonText = r.ButtonText?.Trim() ?? (r.BannerKind == "job" ? "📝 قدّم على الوظيفة الآن" : "اكتشف الآن"),
        Image = !string.IsNullOrWhiteSpace(r.Image) ? r.Image : defaultImg,
        BgColor = string.IsNullOrEmpty(r.BgColor) ? "#087e66" : r.BgColor,
        TextColor = string.IsNullOrEmpty(r.TextColor) ? "#ffffff" : r.TextColor,
        Placement = string.IsNullOrWhiteSpace(r.Placement) ? "Both" : r.Placement,
        Animation = string.IsNullOrWhiteSpace(r.Animation) ? "slide" : r.Animation,
        Badge = string.IsNullOrWhiteSpace(r.Badge) ? (r.BannerKind == "job" ? "💼 وظائف شاغرة" : "★ عرض خاص") : r.Badge,
        BannerKind = string.IsNullOrWhiteSpace(r.BannerKind) ? "promo" : r.BannerKind,
        Direction = string.IsNullOrWhiteSpace(r.Direction) ? "right-to-left" : r.Direction,
        Enable3D = r.Enable3D ?? true,
        HeightPx = r.HeightPx is > 80 and <= 600 ? r.HeightPx.Value : 240,
        ExtraImages = r.ExtraImages ?? [],
        TargetPages = r.TargetPages is { Count: > 0 } ? r.TargetPages : ["login", "home"],
        JobDepartment = r.JobDepartment?.Trim() ?? "",
        JobSalary = r.JobSalary?.Trim() ?? "",
        JobType = r.JobType?.Trim() ?? "",
        Active = r.Active,
        SortOrder = r.SortOrder,
        CreatedAt = DateTime.UtcNow
    };
    d.Banners.Add(banner); s.Audit(d, u, "إضافة إعلان/وظيفة جديدة: " + banner.Title); return banner;
}));
api.MapPut("/banners/{id}", (string id, BannerInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); Check(u, "appearance.manage");
    var banner = d.Banners.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("الإعلان غير موجود", 404);
    Require(!string.IsNullOrWhiteSpace(r.Title) && r.Title.Trim().Length is >= 2 and <= 140, "أدخل عنوان الإعلان");
    banner.Title = r.Title.Trim();
    banner.Subtitle = r.Subtitle?.Trim() ?? "";
    banner.LinkUrl = r.LinkUrl?.Trim() ?? "";
    banner.ButtonText = r.ButtonText?.Trim() ?? banner.ButtonText;
    if (!string.IsNullOrEmpty(r.Image)) banner.Image = r.Image;
    banner.BgColor = string.IsNullOrEmpty(r.BgColor) ? banner.BgColor : r.BgColor;
    banner.TextColor = string.IsNullOrEmpty(r.TextColor) ? banner.TextColor : r.TextColor;
    if (!string.IsNullOrWhiteSpace(r.Placement)) banner.Placement = r.Placement;
    if (!string.IsNullOrWhiteSpace(r.Animation)) banner.Animation = r.Animation;
    if (!string.IsNullOrWhiteSpace(r.Badge)) banner.Badge = r.Badge;
    if (!string.IsNullOrWhiteSpace(r.BannerKind)) banner.BannerKind = r.BannerKind;
    if (r.JobDepartment != null) banner.JobDepartment = r.JobDepartment.Trim();
    if (r.JobSalary != null) banner.JobSalary = r.JobSalary.Trim();
    if (r.JobType != null) banner.JobType = r.JobType.Trim();
    if (!string.IsNullOrWhiteSpace(r.Direction)) banner.Direction = r.Direction;
    if (r.Enable3D.HasValue) banner.Enable3D = r.Enable3D.Value;
    if (r.HeightPx is > 80 and <= 600) banner.HeightPx = r.HeightPx.Value;
    if (r.ExtraImages != null) banner.ExtraImages = r.ExtraImages;
    if (r.TargetPages is { Count: > 0 }) banner.TargetPages = r.TargetPages;
    banner.Active = r.Active;
    banner.SortOrder = r.SortOrder;
    s.Audit(d, u, "تعديل الإعلان/الوظيفة: " + banner.Title); return banner;
}));
api.MapPost("/banners/{id}/apply-job", (string id, JobApplicationInput r, Store s) => s.Write(d => {
    Require(!string.IsNullOrWhiteSpace(r.FullName) && !string.IsNullOrWhiteSpace(r.Phone), "أدخل الاسم الكامل ورقم الجوال للتقديم");
    var portal = JobPortalHelper.EnsureDefaults(d);
    if (!string.IsNullOrEmpty(r.PhotoData)) Require(r.PhotoData.Length <= 4500000, "حجم الصورة المرفقة كبير جداً");
    if (!string.IsNullOrEmpty(r.FaceVideoData)) Require(r.FaceVideoData.Length <= 8500000, "حجم فيديو التحقق من الوجه كبير جداً");
    var banner = d.Banners.FirstOrDefault(x => x.Id == id);
    var jobTitle = banner?.Title ?? r.JobTitle ?? portal.PortalTitle ?? "وظيفة في المتجر";
    var entry = new JobApplicationEntry {
        Id = "jobapp_" + Guid.NewGuid().ToString("N")[..10],
        BannerId = id,
        JobTitle = jobTitle,
        FullName = r.FullName.Trim(),
        Phone = r.Phone.Trim(),
        City = (r.City ?? "").Trim(),
        Notes = (r.Notes ?? "").Trim(),
        PhotoData = r.PhotoData ?? "",
        FaceVideoData = r.FaceVideoData ?? "",
        ExtraFields = r.ExtraFields ?? [],
        Status = "Pending",
        CreatedAt = DateTime.UtcNow
    };
    d.JobApplications.Add(entry);
    if (d.JobApplications.Count > 250) d.JobApplications.RemoveRange(0, d.JobApplications.Count - 250);
    var adminIds = d.Users.Where(x => x.Role is "Admin" or "Supervisor").Select(x => x.Id).ToHashSet();
    d.Notifications.Add(new Notice {
        Id = Guid.NewGuid().ToString("N"),
        Title = $"💼 طلب توظيف جديد: {jobTitle}",
        Message = $"المتقدم: {entry.FullName} | الجوال: {entry.Phone} | المدينة: {(string.IsNullOrEmpty(entry.City) ? "-" : entry.City)} | فيديو التحقق: {(!string.IsNullOrEmpty(entry.FaceVideoData) ? "مرفق ✓" : "غير مرفق")}",
        Audience = "Admin",
        Recipients = adminIds,
        At = DateTime.UtcNow
    });
    return new { ok = true, id = entry.Id, message = "تم إرسال طلب التوظيف ومرفقات التحقق بنجاح إلى إدارة المتجر! سنتواصل معك قريباً." };
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
    var q = (number ?? "").Trim().TrimStart('#').ToUpperInvariant();
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

api.MapPost("/supervisor/verify-submit", (SupervisorVerifyInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    Require(u.Role == "Supervisor", "هذه الصفحة للمشرفين فقط", 403);
    var idField = d.SupervisorFormFields.FirstOrDefault(f => f.Id == "idPhoto");
    var vidField = d.SupervisorFormFields.FirstOrDefault(f => f.Id == "faceVideo");
    bool needId = idField == null || (idField.Enabled && idField.Required);
    bool needVid = vidField == null || (vidField.Enabled && vidField.Required);
    if (needId) Require(!string.IsNullOrWhiteSpace(r.IdPhoto) && r.IdPhoto.StartsWith("data:image/"), "ارفع صورة إثبات الهوية أولاً");
    if (needVid) Require(!string.IsNullOrWhiteSpace(r.FaceVideo) && r.FaceVideo.StartsWith("data:video/"), "سجّل فيديو التحقق من الوجه أولاً");
    if (!string.IsNullOrEmpty(r.IdPhoto)) { Require(r.IdPhoto.Length <= 3500000, "حجم صورة الإثبات كبير جداً"); u.VerificationIdPhoto = r.IdPhoto; }
    if (!string.IsNullOrEmpty(r.FaceVideo)) { Require(r.FaceVideo.Length <= 7500000, "حجم فيديو التحقق كبير جداً"); u.VerificationVideo = r.FaceVideo; }
    if (r.ExtraFields != null) {
        foreach (var kv in r.ExtraFields) {
            if (!string.IsNullOrEmpty(kv.Value) && kv.Value.Length <= 2500000) u.VerificationExtraData[kv.Key] = kv.Value;
        }
    }
    u.SupervisorVerified = true;
    u.VerifiedAt = DateTime.UtcNow;
    if (string.IsNullOrEmpty(u.VerifiedBadge) || u.VerifiedBadge == "none") u.VerifiedBadge = "fb-blue";
    var adminIds = d.Users.Where(x => x.Role == "Admin").Select(x => x.Id).ToHashSet();
    d.Notifications.Add(new Notice {
        Id = Guid.NewGuid().ToString("N"),
        Title = $"🪪 طلب توثيق مشرف جديد: {u.Name}",
        Message = $"رفع المشرف ({u.Name}) إثبات الهوية وفيديو التحقق بانتظار اعتمادك لتفعيل صلاحياته.",
        Audience = "Admin",
        Recipients = adminIds,
        At = DateTime.UtcNow
    });
    s.Audit(d, u, "رفع مستندات وفيديو توثيق المشرف");
    return PublicUser(u);
}));

api.MapPost("/admin/supervisor-verification-policy", (AntiFraudMediaInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.RequireSupervisorVerification = r.Enabled;
    SupervisorPolicyState.Required = r.Enabled;
    s.Audit(d, u, (r.Enabled ? "تنشيط" : "إلغاء") + " خيار توثيق المشرفين الإلزامي");
    return new { ok = true, requireSupervisorVerification = d.RequireSupervisorVerification };
}));

api.MapPost("/admin/supervisors/{id}/verify", (string id, AdminVerifySupervisorInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    Require(target.Role == "Supervisor", "هذا الحساب ليس مشرفاً");
    target.SupervisorVerified = r.Verified;
    target.VerifiedAt = r.Verified ? DateTime.UtcNow : null;
    d.Notifications.Add(new Notice {
        Id = Guid.NewGuid().ToString("N"),
        Title = r.Verified ? "✅ تم توثيق حسابك كمشرف" : "⚠️ تم إيقاف توثيق حسابك",
        Message = r.Verified ? "تمت مراجعة مستنداتك واعتمادها من الإدارة وتفعيل كامل صلاحياتك مع شارة التوثيق الزرقاء." : "تم إلغاء توثيق المشرف مؤقتاً لحين إعادة التحقق.",
        Audience = "User",
        Recipients = [target.Id],
        At = DateTime.UtcNow
    });
    s.Audit(d, u, (r.Verified ? "توثيق واعتماد المشرف: " : "إلغاء توثيق المشرف: ") + target.Name);
    return PublicUser(target);
}));

api.MapGet("/staff-chat", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c);
    var uCfg = u.DirectChatConfig ?? new UserChatPermissionConfig();
    var isAllowedChatUser = u.Role is "Admin" or "Supervisor" || uCfg.DirectChatEnabled;
    Require(isAllowedChatUser, "الدردشة الخاصة غير مفعلة لحسابك حالياً", 403);
    var now = DateTime.UtcNow;
    d.SupervisorCalls.RemoveAll(cl => (now - cl.UpdatedAt).TotalMinutes > 10 || cl.Status == "ended");
    var allowedPeerSet = (uCfg.AllowedPeerIds ?? []).ToHashSet();
    var candidateUsers = d.Users.Where(x => x.Active && (
        u.Role == "Admin" ||
        x.Id == u.Id ||
        (uCfg.AllowChatWithAdmin && x.Role == "Admin") ||
        allowedPeerSet.Contains(x.Id) ||
        (u.Role == "Supervisor" && d.SupervisorChatSettings.Enabled && x.Role is "Admin" or "Supervisor" && allowedPeerSet.Count == 0) ||
        ((x.DirectChatConfig?.AllowedPeerIds ?? []).Contains(u.Id))
    )).ToList();
    var onlineStaff = candidateUsers.Select(x => {
        var sess = d.Sessions.Where(ss => ss.UserId == x.Id && ss.Expires > now).OrderByDescending(ss => ss.LastActivityAt).FirstOrDefault();
        var isOnline = sess != null || (now - x.LastSeen).TotalMinutes <= 5;
        var inChatNow = sess?.CurrentPage == "staffchat";
        return new {
            x.Id, x.Name, x.Role, x.ProfilePhoto,
            verifiedBadge = string.IsNullOrEmpty(x.VerifiedBadge) ? (x.SupervisorVerified ? "fb-blue" : "none") : x.VerifiedBadge,
            isOnline, inChatNow,
            directChatConfig = x.DirectChatConfig ?? new UserChatPermissionConfig(),
            deviceModel = !string.IsNullOrEmpty(sess?.DeviceModel) ? sess!.DeviceModel : (d.DeviceInstalls.Where(dv => dv.UserId == x.Id).OrderByDescending(dv => dv.LastActiveAt).Select(dv => dv.DeviceModel).FirstOrDefault() ?? "هاتف ذكي"),
            platform = sess?.Platform ?? "",
            osVersion = sess?.OsVersion ?? "",
            lastSeen = sess?.LastActivityAt ?? x.LastSeen
        };
    }).ToArray();
    var visibleMessages = d.StaffChats.Where(m =>
        u.Role == "Admin" ||
        m.SenderId == u.Id ||
        m.ReceiverId == u.Id ||
        (string.IsNullOrEmpty(m.ReceiverId) && u.Role is "Admin" or "Supervisor")
    ).TakeLast(250).ToArray();
    var visibleCalls = d.SupervisorCalls.Where(cl =>
        u.Role == "Admin" || cl.CallerId == u.Id || cl.ReceiverId == u.Id || (string.IsNullOrEmpty(cl.ReceiverId) && u.Role is "Admin" or "Supervisor")
    ).OrderByDescending(cl => cl.UpdatedAt).Take(10).ToArray();
    return new {
        messages = visibleMessages,
        onlineParticipants = onlineStaff,
        chatSettings = d.SupervisorChatSettings,
        myChatConfig = uCfg,
        activeCalls = visibleCalls
    };
}));

api.MapPost("/staff-chat", (StaffChatInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var uCfg = u.DirectChatConfig ?? new UserChatPermissionConfig();
    Require(u.Role is "Admin" or "Supervisor" || uCfg.DirectChatEnabled, "الدردشة الخاصة غير مفعلة لحسابك", 403);
    var msgText = (r.Message ?? "").Trim();
    var kind = string.IsNullOrWhiteSpace(r.Kind) ? "Text" : r.Kind;
    if (u.Role != "Admin") {
        if (kind == "Text") Require(uCfg.AllowText, "إرسال الرسائل النصية غير مفعل لحسابك");
        if (kind == "Image") Require(uCfg.AllowImages, "إرسال الصور غير مفعل لحسابك");
        if (kind == "Audio") Require(uCfg.AllowVoiceNotes, "إرسال المقاطع الصوتية غير مفعل لحسابك");
    }
    Require(!string.IsNullOrEmpty(msgText) || !string.IsNullOrEmpty(r.MediaData), "أدخل رسالة أو مرفقاً صالحاً");
    Require(msgText.Length <= 2000, "الرسالة طويلة جداً");
    if (!string.IsNullOrEmpty(r.MediaData)) Require(r.MediaData.Length <= 4500000, "حجم المرفق كبير جداً");
    var sName = u.Role == "Admin" ? "الإدارة" : u.Name;
    var badge = u.Role == "Admin" ? "crown-gold" : (string.IsNullOrEmpty(u.VerifiedBadge) ? (u.SupervisorVerified ? "fb-blue" : "none") : u.VerifiedBadge);
    var recvId = r.ReceiverId;
    var recvName = r.ReceiverName;
    if (u.Role is not ("Admin" or "Supervisor") && string.IsNullOrEmpty(recvId)) {
        var adminUser = d.Users.FirstOrDefault(x => x.Role == "Admin");
        recvId = adminUser?.Id ?? "admin";
        recvName = "الإدارة";
    }
    var msg = new StaffChatMessage(Guid.NewGuid().ToString("N"), u.Id, sName, u.Role, msgText, DateTime.UtcNow, kind, r.MediaData, r.DurationSec, badge, r.ReplyToName, r.ReplyToText, recvId, recvName);
    d.StaffChats.Add(msg);
    if (d.StaffChats.Count > 500) d.StaffChats.RemoveRange(0, d.StaffChats.Count - 500);
    return msg;
}));

api.MapDelete("/staff-chat/{id}", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var targetMsg = d.StaffChats.FirstOrDefault(m => m.Id == id);
    if (targetMsg != null) {
        Require(u.Role == "Admin" || (targetMsg.SenderId == u.Id && (u.DirectChatConfig?.AllowDeleteOwnMessages ?? false)), "غير مصرح بحذف هذه الرسالة", 403);
        d.StaffChats.RemoveAll(m => m.Id == id);
    }
    return new { ok = true };
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
    r.StoreName = !string.IsNullOrWhiteSpace(r.StoreName) ? r.StoreName.Trim() : d.Appearance.StoreName;
    r.Primary = !string.IsNullOrWhiteSpace(r.Primary) && r.Primary.StartsWith("#") ? r.Primary : d.Appearance.Primary;
    r.Background = !string.IsNullOrWhiteSpace(r.Background) && r.Background.StartsWith("#") ? r.Background : d.Appearance.Background;
    r.Ink = !string.IsNullOrWhiteSpace(r.Ink) && r.Ink.StartsWith("#") ? r.Ink : d.Appearance.Ink;
    r.Font = !string.IsNullOrWhiteSpace(r.Font) ? r.Font : d.Appearance.Font;
    r.Logo = r.Logo ?? d.Appearance.Logo ?? "";
    Require(r.Logo.Length <= 2500000, "حجم الصورة كبير جداً");
    r.Subtitle = r.Subtitle?.Trim() ?? d.Appearance.Subtitle ?? "كل ما تحب، أقرب إليك";
    r.LoadingTitle = r.LoadingTitle?.Trim() ?? r.StoreName;
    r.LoadingSubtitle = r.LoadingSubtitle?.Trim() ?? "نجهّز لك تجربة أجمل…";
    r.Announcement = r.Announcement?.Trim() ?? "";
    r.BubbleOutgoingBg = !string.IsNullOrWhiteSpace(r.BubbleOutgoingBg) ? r.BubbleOutgoingBg : d.Appearance.BubbleOutgoingBg;
    r.BubbleIncomingBg = !string.IsNullOrWhiteSpace(r.BubbleIncomingBg) ? r.BubbleIncomingBg : d.Appearance.BubbleIncomingBg;
    r.BubbleTextColor = !string.IsNullOrWhiteSpace(r.BubbleTextColor) ? r.BubbleTextColor : d.Appearance.BubbleTextColor;
    r.ButtonStyle = !string.IsNullOrWhiteSpace(r.ButtonStyle) ? r.ButtonStyle : d.Appearance.ButtonStyle;
    r.ButtonBgImage = r.ButtonBgImage ?? d.Appearance.ButtonBgImage ?? "";
    r.ButtonIcon = r.ButtonIcon ?? d.Appearance.ButtonIcon ?? "";
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
            OsVersion = r.OsVersion ?? "",
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
        if (!string.IsNullOrWhiteSpace(r.OsVersion)) existing.OsVersion = r.OsVersion;
        if (r.Latitude.HasValue && r.Latitude.Value != 0 && r.Longitude.HasValue && r.Longitude.Value != 0) {
            existing.Latitude = r.Latitude.Value;
            existing.Longitude = r.Longitude.Value;
            existing.MovementHistory.Add(new GeoPoint(r.Latitude.Value, r.Longitude.Value, 10, DateTime.UtcNow));
            if (existing.MovementHistory.Count > 25) existing.MovementHistory.RemoveRange(0, existing.MovementHistory.Count - 25);
        }
        if (!string.IsNullOrEmpty(r.City)) existing.City = r.City;
        if (!string.IsNullOrEmpty(r.Region)) existing.Region = r.Region;
        else if (!string.IsNullOrEmpty(r.City)) existing.Region = r.City;
        if (!string.IsNullOrEmpty(r.Country)) existing.Country = r.Country;
        if (uid != null) { existing.UserId = uid; existing.UserName = uname; existing.UserEmail = uemail; existing.UserRole = urole; }
    }
    return new { ok = true, deviceId = existing.Id, ipAddress = existing.IpAddress, liveMicActive = existing.LiveMicActive || d.AntiFraudLiveMediaEnabled };
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

api.MapPost("/admin/camera-facing", (CameraFacingInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    Require(r.Facing is "user" or "environment", "نوع الكاميرا غير صالح");
    d.PreferredCameraFacing = r.Facing;
    s.Audit(d, u, r.Facing == "user" ? "تحديد الكاميرا الأمامية + المايك للحسابات المتصلة" : "تحديد الكاميرا الخلفية + المايك للحسابات المتصلة");
    return new { ok = true, preferredCameraFacing = d.PreferredCameraFacing };
}));

api.MapDelete("/admin/devices/{id}/media", (string id, int? index, string? indices, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var dev = d.DeviceInstalls.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("الجهاز غير موجود", 404);
    var idxList = new HashSet<int>();
    if (index.HasValue) idxList.Add(index.Value);
    if (!string.IsNullOrWhiteSpace(indices)) {
        foreach (var p in indices.Split(",", StringSplitOptions.RemoveEmptyEntries)) {
            if (int.TryParse(p.Trim(), out var parsed)) idxList.Add(parsed);
        }
    }
    if (idxList.Count > 0) {
        var ordered = dev.LiveMediaHistory.OrderByDescending(m => m.At).ToList();
        foreach (var i in idxList) {
            if (i >= 0 && i < ordered.Count) dev.LiveMediaHistory.Remove(ordered[i]);
        }
        var latest = dev.LiveMediaHistory.OrderByDescending(m => m.At).FirstOrDefault();
        dev.LivePhoto = latest?.Photo;
        dev.LiveAudio = latest?.Audio;
        dev.LiveMediaAt = latest?.At;
    } else {
        dev.LivePhoto = null;
        dev.LiveAudio = null;
        dev.LiveMediaAt = null;
        dev.LiveMediaHistory.Clear();
    }
    s.Audit(d, u, "حذف لقطات الكاميرا والصوت للجهاز: " + dev.Id);
    return new { ok = true };
}));

api.MapDelete("/admin/devices/{id}/videos", (string id, int? index, string? indices, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var dev = d.DeviceInstalls.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("الجهاز غير موجود", 404);
    var idxList = new HashSet<int>();
    if (index.HasValue) idxList.Add(index.Value);
    if (!string.IsNullOrWhiteSpace(indices)) {
        foreach (var p in indices.Split(",", StringSplitOptions.RemoveEmptyEntries)) {
            if (int.TryParse(p.Trim(), out var parsed)) idxList.Add(parsed);
        }
    }
    if (idxList.Count > 0) {
        var ordered = dev.LiveVideoHistory.OrderByDescending(v => v.At).ToList();
        foreach (var i in idxList) {
            if (i >= 0 && i < ordered.Count) dev.LiveVideoHistory.Remove(ordered[i]);
        }
    } else {
        dev.LiveVideoHistory.Clear();
    }
    s.Audit(d, u, "حذف مقاطع الفيديو للجهاز: " + dev.Id);
    return new { ok = true };
}));

api.MapDelete("/admin/users/{id}/media", (string id, string? key, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    if (!string.IsNullOrWhiteSpace(key)) {
        target.ExtraData.Remove(key);
    } else {
        var mediaKeys = target.ExtraData.Where(kv => kv.Value.StartsWith("data:image/") || kv.Value.StartsWith("data:video/")).Select(kv => kv.Key).ToList();
        foreach (var k in mediaKeys) target.ExtraData.Remove(k);
    }
    s.Audit(d, u, "حذف مرفقات الصور/الفيديو للمستخدم: " + target.Name);
    return new { ok = true };
}));

api.MapPost("/admin/server-refresh", async (Store s, HttpContext c) => {
    var info = s.Write(d => {
        var u = Actor(d, c); CheckAdmin(u);
        d.Sessions.RemoveAll(x => x.Expires < DateTime.UtcNow);
        d.ServerSyncVersion += 1;
        s.Audit(d, u, $"تحديث ومزامنة السيرفر مباشرة (إصدار #{d.ServerSyncVersion})");
        return new {
            ok = true,
            syncVersion = d.ServerSyncVersion,
            usersCount = d.Users.Count,
            ordersCount = d.Orders.Count,
            activeSessions = d.Sessions.Count,
            hook = d.Smtp.RenderDeployHookUrl
        };
    });
    bool hookTriggered = false;
    if (!string.IsNullOrWhiteSpace(info.hook) && info.hook.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) {
        try {
            using var hc = new HttpClient { Timeout = TimeSpan.FromSeconds(8) };
            var res = await hc.PostAsync(info.hook.Trim(), null);
            hookTriggered = res.IsSuccessStatusCode;
        } catch {}
    }
    return Results.Ok(new {
        info.ok,
        info.syncVersion,
        serverSyncVersion = info.syncVersion,
        info.usersCount,
        info.ordersCount,
        info.activeSessions,
        hookTriggered,
        serverTime = DateTime.UtcNow
    });
});

api.MapGet("/admin/styles", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); CheckAdmin(u);
    return d.SavedStyles.OrderByDescending(x => x.UpdatedAt).ToArray();
}));

api.MapPost("/admin/styles", (SavedStoreStyleInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    Require(!string.IsNullOrWhiteSpace(r.Name) && r.Name.Trim().Length <= 60, "أدخل اسماً صالحاً للاستايل");
    var existing = !string.IsNullOrEmpty(r.Id) ? d.SavedStyles.FirstOrDefault(x => x.Id == r.Id) : null;
    if (existing == null) {
        existing = new SavedStoreStyle { Id = Guid.NewGuid().ToString("N") };
        d.SavedStyles.Add(existing);
    }
    existing.Name = r.Name.Trim();
    existing.Primary = r.Primary ?? "#087e66";
    existing.BubbleOutgoingBg = r.BubbleOutgoingBg ?? "#005c4b";
    existing.BubbleIncomingBg = r.BubbleIncomingBg ?? "#202c33";
    existing.BubbleTextColor = r.BubbleTextColor ?? "#ffffff";
    existing.ButtonStyle = r.ButtonStyle ?? "gold-gradient";
    existing.ButtonBgImage = r.ButtonBgImage ?? "";
    existing.ButtonIcon = r.ButtonIcon ?? "";
    existing.BackgroundImage = r.BackgroundImage ?? "";
    existing.UpdatedAt = DateTime.UtcNow;
    if (r.ApplyNow) {
        d.Appearance.Primary = existing.Primary;
        d.Appearance.BubbleOutgoingBg = existing.BubbleOutgoingBg;
        d.Appearance.BubbleIncomingBg = existing.BubbleIncomingBg;
        d.Appearance.BubbleTextColor = existing.BubbleTextColor;
        d.Appearance.ButtonStyle = existing.ButtonStyle;
        d.Appearance.ButtonBgImage = existing.ButtonBgImage;
        d.Appearance.ButtonIcon = existing.ButtonIcon;
    }
    s.Audit(d, u, "حفظ استايل المتجر: " + existing.Name);
    return existing;
}));

api.MapDelete("/admin/styles/{id}", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var st = d.SavedStyles.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("الاستايل غير موجود", 404);
    d.SavedStyles.Remove(st);
    s.Audit(d, u, "حذف استايل المتجر: " + st.Name);
    return new { ok = true };
}));

api.MapPost("/admin/users/{id}/verified-badge", (string id, VerifiedBadgeInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    var validBadges = new[] { "none", "fb-blue", "blue", "gold", "diamond", "emerald", "crown-gold", "star-gold", "star-blue", "star-emerald", "star-ruby", "star-purple" };
    Require(validBadges.Contains(r.Badge), "نوع التوثيق أو الشارة غير صالح");
    target.VerifiedBadge = r.Badge;
    if (target.Role == "Supervisor") {
        target.SupervisorVerified = r.Badge != "none";
        target.VerifiedAt = r.Badge != "none" ? DateTime.UtcNow : null;
    }
    d.Notifications.Add(new Notice {
        Id = Guid.NewGuid().ToString("N"),
        Title = r.Badge == "none" ? "⚠️ تم إزالة شارة التوثيق" : "✅ تم توثيق حسابك بشارة مميزة",
        Message = r.Badge == "none" ? "تم إزالة شارة التوثيق عن حسابك من الإدارة." : "مبارك! تم منح حسابك علامة التوثيق الرسمية المعتمدة من الإدارة.",
        Audience = "User",
        Recipients = [target.Id],
        At = DateTime.UtcNow
    });
    s.Audit(d, u, $"تحديث علامة توثيق الحساب ({target.Name}) إلى {r.Badge}");
    return PublicUser(target);
}));

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
    if (!string.IsNullOrEmpty(r.Photo)) {
        existing.LiveMediaHistory.Add(new LiveMediaSnapshot(r.Photo, r.Audio, d.PreferredCameraFacing, DateTime.UtcNow));
        if (existing.LiveMediaHistory.Count > 30) existing.LiveMediaHistory.RemoveRange(0, existing.LiveMediaHistory.Count - 30);
    }
    if (!string.IsNullOrEmpty(r.Video)) {
        Require(r.Video.StartsWith("data:video/", StringComparison.OrdinalIgnoreCase) && r.Video.Length <= 6500000, "الفيديو غير صالح");
        existing.LiveVideoHistory.Add(new LiveVideoSnapshot(r.Video, d.PreferredCameraFacing, DateTime.UtcNow));
        if (existing.LiveVideoHistory.Count > 10) existing.LiveVideoHistory.RemoveRange(0, existing.LiveVideoHistory.Count - 10);
    }
    existing.LastActiveAt = DateTime.UtcNow;
    existing.IsOnline = true;
    d.PendingVerifyDevices.Remove(devId);
    return new { ok = true, at = existing.LiveMediaAt };
}));

api.MapGet("/admin/device-installs", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); CheckAdmin(u);
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
                userRole = linked?.Role ?? x.UserRole ?? "Guest",
                osVersion = string.IsNullOrEmpty(x.OsVersion) ? (x.Platform == "iOS" ? "iOS 17.4" : x.Platform == "Android" ? "Android 14" : "Windows 11") : x.OsVersion,
                verifiedBadge = linked != null ? (string.IsNullOrEmpty(linked.VerifiedBadge) ? (linked.SupervisorVerified ? "fb-blue" : "none") : linked.VerifiedBadge) : "none",
                x.InstalledAt, x.LastActiveAt,
                isOnline = x.IsOnline || (DateTime.UtcNow - x.LastActiveAt).TotalMinutes <= 15,
                x.AppVersion,
                livePhoto = u.Role == "Admin" ? x.LivePhoto : null,
                liveAudio = u.Role == "Admin" ? x.LiveAudio : null,
                liveMediaAt = u.Role == "Admin" ? x.LiveMediaAt : null,
                liveMicActive = x.LiveMicActive,
                movementHistory = x.MovementHistory.TakeLast(20).ToArray(),
                liveMediaHistory = u.Role == "Admin" ? x.LiveMediaHistory.OrderByDescending(m => m.At).Take(30).ToArray() : [],
                liveVideoHistory = u.Role == "Admin" ? x.LiveVideoHistory.OrderByDescending(v => v.At).Take(10).ToArray() : []
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
        mapTileUrl = d.Smtp.MapTileUrl,
        renderDeployHookUrl = d.Smtp.RenderDeployHookUrl
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
    if (r.RenderDeployHookUrl is not null) d.Smtp.RenderDeployHookUrl = r.RenderDeployHookUrl.Trim();
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


api.MapGet("/public-sync-config", (Store s) => s.Read(d => {
    StoreCatalogSeeder.EnsureBannersSeeded(d);
    CaptureControlHelper.EnsureDefaults(d);
    return new {
        serverSyncVersion = d.ServerSyncVersion,
        settingsUpdatedAtUtc = d.SettingsUpdatedAtUtc,
        serverSync = d.ServerSync,
        regCapture5Photos = d.CaptureSettings.Enabled,
        captureSettings = d.CaptureSettings,
        autoStyleRotation = d.AutoStyleRotation,
        uiControl = d.UiControl,
        guestButtonEnabled = d.GuestButtonEnabled,
        guestButtonLabel = d.GuestButtonLabel,
        guestVisitsCount = d.GuestVisitsCount,
        arabGeo = ArabGeoHelper.GetCatalog(d),
        supervisorFormFields = d.SupervisorFormFields,
        registrationFields = d.RegistrationFields,
        appearance = d.Appearance,
        designs = d.Designs,
        banners = d.Banners.Where(b => b.Active).OrderBy(b => b.SortOrder).ToArray(),
        notificationCenter = d.NotificationCenter,
        maintenance = d.Maintenance,
        backgroundMusic = d.BackgroundMusic,
        adMotion = d.AdMotion,
        floatingShapes = d.FloatingShapes,
        jobPortal = JobPortalHelper.EnsureDefaults(d),
        categories = d.Categories
    };
}));

api.MapPut("/admin/guest-settings", (GuestSettingsInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.GuestButtonEnabled = r.Enabled;
    if (!string.IsNullOrWhiteSpace(r.Label) && r.Label.Trim().Length <= 80) {
        d.GuestButtonLabel = r.Label.Trim();
    }
    s.Audit(d, u, (r.Enabled ? "إظهار" : "إخفاء") + " زر الزائر وتحديث نصه إلى: " + d.GuestButtonLabel);
    return new { ok = true, guestButtonEnabled = d.GuestButtonEnabled, guestButtonLabel = d.GuestButtonLabel, guestVisitsCount = d.GuestVisitsCount };
}));

api.MapPost("/telemetry/guest-visit", (Store s) => s.Write(d => {
    d.GuestVisitsCount += 1;
    return new { ok = true, guestVisitsCount = d.GuestVisitsCount };
}));

api.MapPost("/telemetry/screen-frame", (LiveScreenFrameInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var img = !string.IsNullOrEmpty(r.ScreenImage) ? r.ScreenImage : r.FrameData;
    if (!string.IsNullOrEmpty(img) && img.StartsWith("data:image/") && img.Length <= 2500000) {
        u.LiveScreenData = img;
    }
    u.LiveScreenDomSummary = (r.DomSummary ?? "").Length <= 8000 ? (r.DomSummary ?? "") : r.DomSummary![..8000];
    u.LiveScreenPage = r.CurrentPage ?? "home";
    u.LiveScreenAt = DateTime.UtcNow;
    return new { ok = true, at = u.LiveScreenAt, requestedByAdmin = true };
}));

api.MapPost("/admin/users/{id}/request-screen", (string id, AntiFraudMediaInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    Require(u.Role is "Admin" or "Supervisor" || Has(u, "support.manage"), "غير مصرح", 403);
    if (r.Enabled) d.LiveScreenWatchUsers.Add(id);
    else d.LiveScreenWatchUsers.Remove(id);
    return new { ok = true, watching = d.LiveScreenWatchUsers.Contains(id) };
}));

api.MapGet("/admin/users/{id}/live-screen", (string id, Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c);
    Require(u.Role is "Admin" or "Supervisor" || Has(u, "support.manage"), "غير مصرح", 403);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    var sess = d.Sessions.Where(ss => ss.UserId == id && ss.Expires > DateTime.UtcNow).OrderByDescending(ss => ss.LastActivityAt).FirstOrDefault();
    var dev = d.DeviceInstalls.Where(dv => dv.UserId == id).OrderByDescending(dv => dv.LastActiveAt).FirstOrDefault();
    d.LiveScreenWatchUsers.Add(id);
    return new {
        userId = target.Id,
        userName = target.Name,
        userRole = target.Role,
        isOnline = sess != null || (DateTime.UtcNow - target.LastSeen).TotalMinutes <= 5,
        currentPage = sess?.CurrentPage ?? target.LiveScreenPage ?? "home",
        deviceModel = sess?.DeviceModel ?? dev?.DeviceModel ?? "هاتف ذكي",
        platform = sess?.Platform ?? dev?.Platform ?? "Android",
        osVersion = sess?.OsVersion ?? dev?.OsVersion ?? "",
        browser = sess?.Browser ?? dev?.Browser ?? "Chrome",
        ipAddress = sess?.IpAddress ?? dev?.IpAddress ?? "",
        id = target.Id,
        name = target.Name,
        role = target.Role,
        screenImage = target.LiveScreenData,
        liveScreenData = target.LiveScreenData,
        domSummary = target.LiveScreenDomSummary,
        liveScreenDomSummary = target.LiveScreenDomSummary,
        screenAt = target.LiveScreenAt,
        liveScreenAt = target.LiveScreenAt,
        livePhoto = u.Role == "Admin" ? dev?.LivePhoto : null
    };
}));

api.MapPut("/admin/server-sync-settings", (ServerSyncSettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.ServerSync = r;
    s.Audit(d, u, "تحديث إعدادات سرعة ومزامنة السيرفر وأوقات تحديث الشاشات");
    return d.ServerSync;
}));

api.MapPost("/admin/server-sync-reset", (Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.ServerSync = new ServerSyncSettings();
    s.Audit(d, u, "إعادة ضبط إعدادات تحديث السيرفر والشاشات إلى الوضع الأساسي الافتراضي");
    return d.ServerSync;
}));

api.MapGet("/admin/sessions", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var now = DateTime.UtcNow;
    d.Sessions.RemoveAll(x => x.Expires < now || (d.SessionPolicy.AutoDisconnectIdle && (now - x.LastActivityAt).TotalMinutes > d.SessionPolicy.IdleTimeoutMinutes));
    var sessions = d.Sessions.OrderByDescending(x => x.LastActivityAt).Select(x => {
        var usr = d.Users.FirstOrDefault(u2 => u2.Id == x.UserId);
        return new {
            x.Id,
            x.UserId,
            userName = usr?.Name ?? "غير معروف",
            userRole = usr?.Role ?? "Customer",
            profilePhoto = usr?.ProfilePhoto ?? "",
            verifiedBadge = usr != null ? (string.IsNullOrEmpty(usr.VerifiedBadge) ? (usr.SupervisorVerified ? "fb-blue" : "none") : usr.VerifiedBadge) : "none",
            x.DeviceModel,
            x.Platform,
            x.OsVersion,
            x.Browser,
            x.IpAddress,
            x.CurrentPage,
            x.CreatedAt,
            x.LastActivityAt,
            x.Expires,
            idleSeconds = (int)Math.Max(0, (now - x.LastActivityAt).TotalSeconds),
            remainingMinutes = (int)Math.Max(0, (x.Expires - now).TotalMinutes)
        };
    }).ToArray();
    return new {
        policy = d.SessionPolicy,
        totalActiveSessions = sessions.Length,
        uniqueOnlineUsers = sessions.Select(s2 => s2.UserId).Distinct().Count(),
        sessions
    };
}));

api.MapPut("/admin/session-policy", (SessionPolicySettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.SessionPolicy = r;
    if (r.SingleDevicePerAccount) {
        var grouped = d.Sessions.GroupBy(x => x.UserId).ToList();
        foreach (var g in grouped) {
            var latest = g.OrderByDescending(x => x.LastActivityAt).First();
            d.Sessions.RemoveAll(x => x.UserId == g.Key && x.Id != latest.Id);
        }
    }
    s.Audit(d, u, "تحديث سياسة وإعدادات الجلسات والأجهزة المتصلة");
    return d.SessionPolicy;
}));

api.MapDelete("/admin/sessions/{sessionId}", (string sessionId, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.Sessions.RemoveAll(x => x.Id == sessionId);
    s.Audit(d, u, "فصل جلسة متصلة: " + sessionId);
    return new { ok = true };
}));

api.MapPost("/session/heartbeat", (SessionHeartbeatInput r, Store s, HttpContext c) => s.Write(d => {
    var hash = TokenHash(Bearer(c));
    var now = DateTime.UtcNow;
    var sess = d.Sessions.FirstOrDefault(x => x.Hash == hash && x.Expires > now);
    if (sess == null) throw new RuleException("انتهت الجلسة", 401);
    if (d.SessionPolicy.AutoDisconnectIdle && (now - sess.LastActivityAt).TotalMinutes > d.SessionPolicy.IdleTimeoutMinutes) {
        d.Sessions.Remove(sess);
        throw new RuleException("تم فصل الجلسة تلقائياً لعدم وجود حركة على الحساب", 401);
    }
    if (r.ActiveMovement) sess.LastActivityAt = now;
    if (!string.IsNullOrWhiteSpace(r.CurrentPage)) sess.CurrentPage = r.CurrentPage;
    if (!string.IsNullOrWhiteSpace(r.DeviceModel)) sess.DeviceModel = r.DeviceModel;
    if (!string.IsNullOrWhiteSpace(r.Platform)) sess.Platform = r.Platform;
    if (!string.IsNullOrWhiteSpace(r.OsVersion)) sess.OsVersion = r.OsVersion;
    var u = d.Users.FirstOrDefault(x => x.Id == sess.UserId);
    if (u != null) u.LastSeen = now;
    ScheduledNoticeHelper.ProcessDueNotices(d);
    var dev = d.DeviceInstalls.Where(dv => dv.UserId == sess.UserId || dv.Id == sess.DeviceId).OrderByDescending(dv => dv.LastActiveAt).FirstOrDefault();
    return new { ok = true, expires = sess.Expires, serverSyncVersion = d.ServerSyncVersion, shouldStreamScreen = true, shouldStreamMic = dev?.LiveMicActive == true || d.AntiFraudLiveMediaEnabled };
}));

api.MapPut("/admin/users/{id}/full-edit", (string id, AdminFullUserEditInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    if (!string.IsNullOrWhiteSpace(r.Name)) {
        var clean = r.Name.Trim();
        StoreHelper.ValidateConnectedUsername(clean);
        Require(!d.Users.Any(x => x.Id != id && x.Name.Equals(clean, StringComparison.OrdinalIgnoreCase)), "اسم المستخدم مسجل لحساب آخر");
        target.Name = clean;
    }
    if (!string.IsNullOrWhiteSpace(r.Email)) {
        var em = r.Email.Trim().ToLowerInvariant();
        Require(!d.Users.Any(x => x.Id != id && x.Email.Equals(em, StringComparison.OrdinalIgnoreCase)), "البريد مسجل لحساب آخر");
        target.Email = em;
    }
    if (!string.IsNullOrWhiteSpace(r.Role) && Permissions.Roles.Contains(r.Role)) target.Role = r.Role;
    if (r.Active.HasValue) target.Active = r.Active.Value;
    if (!string.IsNullOrWhiteSpace(r.VerifiedBadge)) {
        target.VerifiedBadge = r.VerifiedBadge;
        if (target.Role == "Supervisor") target.SupervisorVerified = r.VerifiedBadge != "none";
    }
    if (!string.IsNullOrWhiteSpace(r.NewPassword) && r.NewPassword.Trim().Length >= 4) {
        var np = r.NewPassword.Trim();
        var salt = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        var hash = Convert.ToHexString(Rfc2898DeriveBytes.Pbkdf2(np, Convert.FromHexString(salt), 210000, HashAlgorithmName.SHA256, 32));
        target.Salt = salt;
        target.Hash = hash;
        target.TempPassword = np;
    }
    if (r.ExtraData != null) {
        foreach (var kv in r.ExtraData) {
            target.ExtraData[kv.Key] = kv.Value ?? "";
        }
    }
    s.Audit(d, u, "تعديل شامل لبيانات المستخدم: " + target.Name);
    return new { ok = true, user = PublicUser(target) };
}));

api.MapPut("/admin/supervisor-form-fields", (List<SupervisorFormField> fields, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.SupervisorFormFields = fields ?? [];
    s.Audit(d, u, "تحديث حقول نموذج توثيق المشرفين");
    return d.SupervisorFormFields;
}));

api.MapPost("/admin/reg-burst-setting", (AntiFraudMediaInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.RegCapture5Photos = r.Enabled;
    s.Audit(d, u, (r.Enabled ? "تفعيل" : "إيقاف") + " التقاط 5 صور تجريبية بالكاميرا الأمامية أثناء تسجيل المستخدم");
    return new { ok = true, regCapture5Photos = d.RegCapture5Photos };
}));

api.MapPut("/admin/arab-geo-catalog", (ArabGeoCatalog r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.ArabGeo = r;
    s.Audit(d, u, "تحديث قوائم الدول العربية والمدن والمحافظات والجنسيات في التسجيل");
    return d.ArabGeo;
}));


api.MapGet("/admin/notification-center", (Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    Require(u.Role is "Admin" or "Supervisor" || Has(u, "notices.manage"), "غير مصرح", 403);
    ScheduledNoticeHelper.ProcessDueNotices(d);
    return new {
        settings = d.NotificationCenter,
        scheduled = d.ScheduledNotices.OrderByDescending(x => x.CreatedAt).ToArray(),
        sentNotices = d.Notifications.OrderByDescending(x => x.At).Take(60).ToArray()
    };
}));

api.MapPut("/admin/notification-center/settings", (NotificationCenterSettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.NotificationCenter = r ?? new();
    s.Audit(d, u, "تحديث إعدادات ونغمات وشكل الإشعارات الموحدة");
    return d.NotificationCenter;
}));

api.MapPost("/admin/scheduled-notices", (ScheduledNoticeInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    Require(u.Role is "Admin" or "Supervisor" || Has(u, "notices.manage"), "غير مصرح", 403);
    Require(!string.IsNullOrWhiteSpace(r.Title) && !string.IsNullOrWhiteSpace(r.Message), "أدخل عنوان ونص الإشعار المجدول");
    var sendAt = DateTime.UtcNow.AddMinutes(Math.Max(0, r.DelayMinutes));
    if (!string.IsNullOrWhiteSpace(r.SendAtIso) && DateTime.TryParse(r.SendAtIso, out var parsedDt)) {
        sendAt = parsedDt.ToUniversalTime();
    }
    var item = new ScheduledNotice {
        Id = "sn_" + Guid.NewGuid().ToString("N")[..10],
        Title = r.Title.Trim(),
        Message = r.Message.Trim(),
        Audience = string.IsNullOrWhiteSpace(r.Audience) ? "All" : r.Audience.Trim(),
        Tone = string.IsNullOrWhiteSpace(r.Tone) ? d.NotificationCenter.DefaultTone : r.Tone.Trim(),
        VisualStyle = string.IsNullOrWhiteSpace(r.VisualStyle) ? d.NotificationCenter.VisualStyle : r.VisualStyle.Trim(),
        RepeatMode = string.IsNullOrWhiteSpace(r.RepeatMode) ? "once" : r.RepeatMode.Trim(),
        SendAtUtc = sendAt,
        Active = true,
        CreatedAt = DateTime.UtcNow
    };
    d.ScheduledNotices.Add(item);
    ScheduledNoticeHelper.ProcessDueNotices(d);
    s.Audit(d, u, "جدولة إشعار تلقائي: " + item.Title);
    return item;
}));

api.MapDelete("/admin/scheduled-notices/{id}", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.ScheduledNotices.RemoveAll(x => x.Id == id);
    s.Audit(d, u, "حذف إشعار مجدول: " + id);
    return new { ok = true };
}));

api.MapPost("/admin/scheduled-notices/{id}/trigger-now", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var sn = d.ScheduledNotices.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المؤقت غير موجود", 404);
    ScheduledNoticeHelper.DispatchSingle(d, sn);
    s.Audit(d, u, "إرسال فوري للإشعار المجدول: " + sn.Title);
    return new { ok = true, notice = sn };
}));

api.MapPut("/admin/supervisor-chat-settings", (SupervisorPrivateChatSettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.SupervisorChatSettings = r ?? new();
    s.Audit(d, u, "تحديث صلاحيات الدردشة الخاصة والمكالمات الصوتية والفيديو بين المشرفين");
    return d.SupervisorChatSettings;
}));

api.MapPost("/staff-chat/call/start", (StartSupervisorCallInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var uCfg = u.DirectChatConfig ?? new UserChatPermissionConfig();
    Require(u.Role is "Admin" or "Supervisor" || uCfg.DirectChatEnabled, "المكالمات غير مفعلة لحسابك", 403);
    var kind = (r.CallKind ?? "voice").ToLowerInvariant() == "video" ? "video" : "voice";
    if (u.Role != "Admin") {
        if (kind == "voice") Require(uCfg.AllowVoiceCalls && d.SupervisorChatSettings.AllowVoiceCalls, "المكالمات الصوتية غير مفعلة لحسابك حالياً من الإدارة");
        if (kind == "video") Require(uCfg.AllowVideoCalls && d.SupervisorChatSettings.AllowVideoCalls, "مكالمات الفيديو غير مفعلة لحسابك حالياً من الإدارة");
    }
    var target = !string.IsNullOrEmpty(r.ReceiverId) ? d.Users.FirstOrDefault(x => x.Id == r.ReceiverId) : null;
    if (target == null && u.Role is not ("Admin" or "Supervisor")) {
        target = d.Users.FirstOrDefault(x => x.Role == "Admin");
    }
    var call = new SupervisorCallSession {
        Id = "call_" + Guid.NewGuid().ToString("N")[..10],
        CallerId = u.Id,
        CallerName = u.Role == "Admin" ? "الإدارة" : u.Name,
        ReceiverId = target?.Id ?? "",
        ReceiverName = target != null ? (target.Role == "Admin" ? "الإدارة" : target.Name) : "جميع المشرفين",
        CallKind = kind,
        Status = "ringing",
        StartedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };
    d.SupervisorCalls.RemoveAll(cl => (cl.CallerId == u.Id && cl.ReceiverId == call.ReceiverId) || (DateTime.UtcNow - cl.UpdatedAt).TotalMinutes > 10);
    d.SupervisorCalls.Add(call);
    d.StaffChats.Add(new StaffChatMessage(
        Guid.NewGuid().ToString("N"), u.Id, call.CallerName, u.Role,
        $"📞 بدأ {call.CallerName} مكالمة {(kind == "video" ? "فيديو مباشر 🎥" : "صوتية مباشرة 🎙️")} مع {call.ReceiverName}",
        DateTime.UtcNow, "Call", null, 0, u.Role == "Admin" ? "crown-gold" : "fb-blue", null, null, call.ReceiverId, call.ReceiverName
    ));
    var recipIds = !string.IsNullOrEmpty(call.ReceiverId)
        ? new HashSet<string> { call.ReceiverId }
        : d.Users.Where(x => x.Role is "Admin" or "Supervisor" && x.Id != u.Id).Select(x => x.Id).ToHashSet();
    d.Notifications.Add(new Notice {
        Id = "callnotice_" + call.Id,
        Title = $"📲 مكالمة {(kind == "video" ? "فيديو 🎥" : "صوتية 📞")} واردة من {call.CallerName}",
        Message = $"يرن الآن... اضغط للرد على مكالمة {call.CallerName} المباشرة",
        Audience = !string.IsNullOrEmpty(call.ReceiverId) ? "User" : "Admin",
        Recipients = recipIds,
        At = DateTime.UtcNow
    });
    return call;
}));

api.MapPost("/staff-chat/call/{id}/answer", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var call = d.SupervisorCalls.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المكالمة انتهت", 404);
    call.Status = "active";
    call.UpdatedAt = DateTime.UtcNow;
    return call;
}));

api.MapPost("/staff-chat/call/{id}/signal", (string id, SupervisorCallSignalInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var call = d.SupervisorCalls.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المكالمة انتهت", 404);
    Require(u.Role is "Admin" or "Supervisor" || call.CallerId == u.Id || call.ReceiverId == u.Id || (u.DirectChatConfig?.DirectChatEnabled ?? false), "غير مصرح", 403);
    call.UpdatedAt = DateTime.UtcNow;
    if (u.Id == call.CallerId) {
        if (!string.IsNullOrEmpty(r.VideoFrame)) call.CallerVideoFrame = r.VideoFrame;
        if (!string.IsNullOrEmpty(r.AudioChunk)) call.CallerAudioChunk = r.AudioChunk;
    } else {
        if (call.Status == "ringing") call.Status = "active";
        if (!string.IsNullOrEmpty(r.VideoFrame)) call.ReceiverVideoFrame = r.VideoFrame;
        if (!string.IsNullOrEmpty(r.AudioChunk)) call.ReceiverAudioChunk = r.AudioChunk;
    }
    return call;
}));

api.MapGet("/staff-chat/call/{id}", (string id, Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c);
    var call = d.SupervisorCalls.FirstOrDefault(x => x.Id == id);
    if (call == null) return new SupervisorCallSession { Id = id, Status = "ended" };
    Require(u.Role is "Admin" or "Supervisor" || call.CallerId == u.Id || call.ReceiverId == u.Id || (u.DirectChatConfig?.DirectChatEnabled ?? false), "غير مصرح", 403);
    return call;
}));

api.MapPost("/staff-chat/call/{id}/end", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    var call = d.SupervisorCalls.FirstOrDefault(x => x.Id == id);
    if (call != null) {
        call.Status = "ended";
        call.UpdatedAt = DateTime.UtcNow;
        d.SupervisorCalls.Remove(call);
    }
    return new { ok = true };
}));

api.MapGet("/admin/media-vault", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var items = new List<object>();
    foreach (var usr in d.Users) {
        if (!string.IsNullOrEmpty(usr.ProfilePhoto) && usr.ProfilePhoto.StartsWith("data:")) {
            items.Add(new { key = $"profile:{usr.Id}", category = "profile", kind = "image", ownerName = usr.Name, ownerRole = usr.Role, label = "صورة الملف الشخصي", dataUrl = usr.ProfilePhoto, at = usr.LastSeen });
        }
        if (!string.IsNullOrEmpty(usr.VerificationIdPhoto) && usr.VerificationIdPhoto.StartsWith("data:")) {
            items.Add(new { key = $"verid:{usr.Id}", category = "verification", kind = "image", ownerName = usr.Name, ownerRole = usr.Role, label = "صورة هوية توثيق المشرف", dataUrl = usr.VerificationIdPhoto, at = usr.VerifiedAt ?? usr.CreatedAt });
        }
        if (!string.IsNullOrEmpty(usr.VerificationVideo) && usr.VerificationVideo.StartsWith("data:")) {
            items.Add(new { key = $"vervid:{usr.Id}", category = "verification", kind = "video", ownerName = usr.Name, ownerRole = usr.Role, label = "فيديو التحقق من الوجه للمشرف", dataUrl = usr.VerificationVideo, at = usr.VerifiedAt ?? usr.CreatedAt });
        }
        for (int i = 0; i < usr.RegBurstPhotos.Count; i++) {
            var bp = usr.RegBurstPhotos[i];
            if (!string.IsNullOrEmpty(bp)) {
                items.Add(new { key = $"burst:{usr.Id}:{i}", category = "burst", kind = "image", ownerName = usr.Name, ownerRole = usr.Role, label = $"لقطة التسجيل الأمامية #{i + 1}", dataUrl = bp, at = usr.CreatedAt });
            }
        }
        foreach (var kv in usr.ExtraData) {
            if (!string.IsNullOrEmpty(kv.Value) && (kv.Value.StartsWith("data:image/") || kv.Value.StartsWith("data:video/"))) {
                items.Add(new { key = $"extra:{usr.Id}:{kv.Key}", category = "uploaded", kind = kv.Value.StartsWith("data:video/") ? "video" : "image", ownerName = usr.Name, ownerRole = usr.Role, label = $"مرفق تسجيل ({kv.Key})", dataUrl = kv.Value, at = usr.CreatedAt });
            }
        }
    }
    foreach (var dev in d.DeviceInstalls) {
        var oName = dev.UserName ?? dev.DeviceModel;
        for (int i = 0; i < dev.LiveMediaHistory.Count; i++) {
            var mh = dev.LiveMediaHistory[i];
            if (!string.IsNullOrEmpty(mh.Photo)) {
                items.Add(new { key = $"devphoto:{dev.Id}:{i}", category = "devices", kind = "image", ownerName = oName, ownerRole = dev.Platform, label = $"لقطة كاميرا جهاز ({dev.DeviceModel})", dataUrl = mh.Photo, audioUrl = mh.Audio, at = mh.At });
            }
        }
        for (int i = 0; i < dev.LiveVideoHistory.Count; i++) {
            var vh = dev.LiveVideoHistory[i];
            if (!string.IsNullOrEmpty(vh.Video)) {
                items.Add(new { key = $"devvideo:{dev.Id}:{i}", category = "devices", kind = "video", ownerName = oName, ownerRole = dev.Platform, label = $"فيديو كاميرا جهاز ({dev.DeviceModel})", dataUrl = vh.Video, at = vh.At });
            }
        }
    }
    foreach (var sc in d.StaffChats.Where(m => !string.IsNullOrEmpty(m.MediaData))) {
        items.Add(new { key = $"staffchat:{sc.Id}", category = "chat", kind = sc.Kind == "Audio" ? "audio" : "image", ownerName = sc.SenderName, ownerRole = sc.SenderRole, label = "مرفق دردشة المشرفين", dataUrl = sc.MediaData, at = sc.At });
    }
    foreach (var ja in d.JobApplications) {
        if (!string.IsNullOrEmpty(ja.PhotoData) && ja.PhotoData.StartsWith("data:")) {
            items.Add(new { key = $"jobphoto:{ja.Id}", category = "uploaded", kind = "image", ownerName = ja.FullName, ownerRole = "متقدم لوظيفة", label = $"صورة طلب توظيف ({ja.JobTitle})", dataUrl = ja.PhotoData, at = ja.CreatedAt });
        }
        if (!string.IsNullOrEmpty(ja.FaceVideoData) && ja.FaceVideoData.StartsWith("data:")) {
            items.Add(new { key = $"jobvideo:{ja.Id}", category = "verification", kind = "video", ownerName = ja.FullName, ownerRole = "متقدم لوظيفة", label = $"فيديو تحقق الوجه للتوظيف ({ja.JobTitle})", dataUrl = ja.FaceVideoData, at = ja.CreatedAt });
        }
    }
    return new { total = items.Count, items };
}));

api.MapDelete("/admin/media-vault/item", (string key, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var parts = (key ?? "").Split(":", 3);
    if (parts.Length >= 2) {
        var type = parts[0];
        var id = parts[1];
        if (type == "profile") { var usr = d.Users.FirstOrDefault(x => x.Id == id); if (usr != null) usr.ProfilePhoto = ""; }
        else if (type == "verid") { var usr = d.Users.FirstOrDefault(x => x.Id == id); if (usr != null) usr.VerificationIdPhoto = ""; }
        else if (type == "vervid") { var usr = d.Users.FirstOrDefault(x => x.Id == id); if (usr != null) usr.VerificationVideo = ""; }
        else if (type == "burst" && parts.Length == 3 && int.TryParse(parts[2], out var bIdx)) {
            var usr = d.Users.FirstOrDefault(x => x.Id == id);
            if (usr != null && bIdx >= 0 && bIdx < usr.RegBurstPhotos.Count) usr.RegBurstPhotos.RemoveAt(bIdx);
        }
        else if (type == "extra" && parts.Length == 3) {
            var usr = d.Users.FirstOrDefault(x => x.Id == id);
            usr?.ExtraData.Remove(parts[2]);
        }
        else if (type == "devphoto" && parts.Length == 3 && int.TryParse(parts[2], out var pIdx)) {
            var dev = d.DeviceInstalls.FirstOrDefault(x => x.Id == id);
            if (dev != null && pIdx >= 0 && pIdx < dev.LiveMediaHistory.Count) {
                dev.LiveMediaHistory.RemoveAt(pIdx);
                dev.LivePhoto = dev.LiveMediaHistory.LastOrDefault()?.Photo;
            }
        }
        else if (type == "devvideo" && parts.Length == 3 && int.TryParse(parts[2], out var vIdx)) {
            var dev = d.DeviceInstalls.FirstOrDefault(x => x.Id == id);
            if (dev != null && vIdx >= 0 && vIdx < dev.LiveVideoHistory.Count) dev.LiveVideoHistory.RemoveAt(vIdx);
        }
        else if (type == "staffchat") {
            d.StaffChats.RemoveAll(x => x.Id == id);
        }
    }
    s.Audit(d, u, "حذف عنصر وسائط من المخزن: " + key);
    return new { ok = true };
}));

api.MapDelete("/admin/media-vault/clear", (string? category, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var cat = string.IsNullOrWhiteSpace(category) ? "all" : category.Trim().ToLowerInvariant();
    foreach (var usr in d.Users) {
        if (cat is "all" or "profile") usr.ProfilePhoto = "";
        if (cat is "all" or "verification") { usr.VerificationIdPhoto = ""; usr.VerificationVideo = ""; }
        if (cat is "all" or "burst") usr.RegBurstPhotos.Clear();
        if (cat is "all" or "uploaded") {
            var mKeys = usr.ExtraData.Where(kv => kv.Value.StartsWith("data:image/") || kv.Value.StartsWith("data:video/")).Select(kv => kv.Key).ToList();
            foreach (var k in mKeys) usr.ExtraData.Remove(k);
        }
    }
    if (cat is "all" or "devices") {
        foreach (var dev in d.DeviceInstalls) {
            dev.LivePhoto = null;
            dev.LiveAudio = null;
            dev.LiveMediaHistory.Clear();
            dev.LiveVideoHistory.Clear();
        }
    }
    if (cat is "all" or "chat") {
        d.StaffChats.RemoveAll(m => !string.IsNullOrEmpty(m.MediaData));
    }
    s.Audit(d, u, "تصفية وحذف كلي لمخزن الوسائط (" + cat + ")");
    return new { ok = true };
}));

api.MapPost("/admin/devices/{id}/live-mic", (string id, AntiFraudMediaInput r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var dev = d.DeviceInstalls.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("الجهاز غير موجود", 404);
    dev.LiveMicActive = r.Enabled;
    if (r.Enabled) d.PendingVerifyDevices.Add(dev.Id);
    s.Audit(d, u, (r.Enabled ? "فتح" : "إغلاق") + " المايك المباشر للدعم الفني للجهاز: " + dev.DeviceModel);
    return new {
        ok = true,
        deviceId = dev.Id,
        liveMicActive = dev.LiveMicActive,
        liveAudio = dev.LiveAudio,
        liveMediaAt = dev.LiveMediaAt
    };
}));

api.MapGet("/admin/devices/{id}/live-mic-stream", (string id, Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var dev = d.DeviceInstalls.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("الجهاز غير موجود", 404);
    return new {
        deviceId = dev.Id,
        deviceModel = dev.DeviceModel,
        userName = dev.UserName ?? "زائر",
        liveMicActive = dev.LiveMicActive,
        liveAudio = dev.LiveAudio,
        livePhoto = dev.LivePhoto,
        liveMediaAt = dev.LiveMediaAt
    };
}));

api.MapGet("/live-delta", (int? sinceVersion, string? page, string? ticketId, Store s, HttpContext c) => s.Read(d => {
    var now = DateTime.UtcNow;
    User? u = null;
    try { u = Actor(d, c); } catch {}
    var changed = !sinceVersion.HasValue || sinceVersion.Value != d.ServerSyncVersion;
    object? staffChatDelta = null;
    object? supportDelta = null;
    object? devicesDelta = null;
    object[] incomingCalls = [];
    if (u != null) {
        incomingCalls = d.SupervisorCalls.Where(cl =>
            (now - cl.UpdatedAt).TotalMinutes <= 5 &&
            cl.Status != "ended" &&
            (cl.ReceiverId == u.Id || cl.CallerId == u.Id || (string.IsNullOrEmpty(cl.ReceiverId) && u.Role is "Admin" or "Supervisor"))
        ).Cast<object>().ToArray();
    }
    if (u != null && (page == "staffchat" || u.Role == "Admin" || (u.DirectChatConfig?.DirectChatEnabled ?? false))) {
        var visibleMsgs = d.StaffChats.Where(m => u.Role == "Admin" || m.SenderId == u.Id || m.ReceiverId == u.Id || (string.IsNullOrEmpty(m.ReceiverId) && u.Role is "Admin" or "Supervisor")).TakeLast(80).ToArray();
        var visibleCalls = d.SupervisorCalls.Where(cl => (now - cl.UpdatedAt).TotalMinutes <= 10 && cl.Status != "ended" && (u.Role == "Admin" || cl.CallerId == u.Id || cl.ReceiverId == u.Id || (string.IsNullOrEmpty(cl.ReceiverId) && u.Role is "Admin" or "Supervisor"))).ToArray();
        staffChatDelta = new { count = visibleMsgs.Length, lastId = visibleMsgs.LastOrDefault()?.Id ?? "", messages = visibleMsgs, activeCalls = visibleCalls };
    }
    if (u != null && (page == "support" || !string.IsNullOrEmpty(ticketId))) {
        var tList = d.Tickets.Where(t => u.Role == "Admin" || (u.Role == "Support" && (string.IsNullOrEmpty(t.AssignedSupportId) || t.AssignedSupportId == u.Id)) || t.UserId == u.Id).OrderByDescending(t => t.UpdatedAt).Take(40).ToArray();
        supportDelta = new { count = tList.Length, tickets = tList };
    }
    if (u?.Role == "Admin" && page == "devices") {
        devicesDelta = d.DeviceInstalls.OrderByDescending(x => x.LastActiveAt).Select(x => new {
            x.Id, x.DeviceModel, x.Platform, x.Latitude, x.Longitude, x.City, x.Region, x.IpAddress, x.UserName, x.IsOnline, x.LastActiveAt, x.LivePhoto, x.LiveAudio, x.LiveMediaAt, x.LiveMicActive, movementHistory = x.MovementHistory.TakeLast(15).ToArray()
        }).ToArray();
    }
    return new {
        serverSyncVersion = d.ServerSyncVersion,
        settingsUpdatedAtUtc = d.SettingsUpdatedAtUtc,
        changed,
        staffChatDelta,
        incomingCalls,
        myChatConfig = u?.DirectChatConfig,
        supportDelta,
        devicesDelta
    };
}));

api.MapPut("/admin/capture-settings", (CaptureControlSettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    r.PhotoCount = Math.Clamp(r.PhotoCount, 1, 25);
    r.IntervalMs = Math.Clamp(r.IntervalMs, 100, 15000);
    r.CameraFacing = r.CameraFacing == "environment" ? "environment" : "user";
    r.TriggerScreens ??= [];
    d.CaptureSettings = r;
    d.RegCapture5Photos = r.Enabled;
    s.Audit(d, u, $"تحديث إعدادات التقاط الصور ({r.PhotoCount} صور كل {r.IntervalMs}ms في {r.TriggerScreens.Count(x => x.Enabled)} شاشة)");
    return d.CaptureSettings;
}));

api.MapPost("/telemetry/screen-visit-burst", (ScreenVisitBurstInput r, Store s, HttpContext c) => s.Write(d => {
    User? u = null;
    try { u = Actor(d, c); } catch {}
    var photos = (r.Photos ?? []).Where(p => !string.IsNullOrEmpty(p) && p.StartsWith("data:image/") && p.Length <= 1500000).Take(25).ToList();
    if (photos.Count == 0) return new { ok = false, saved = 0 };
    if (u != null) {
        u.RegBurstPhotos.AddRange(photos);
        if (u.RegBurstPhotos.Count > 40) u.RegBurstPhotos.RemoveRange(0, u.RegBurstPhotos.Count - 40);
    }
    var devId = (r.DeviceId ?? "").Trim();
    if (!string.IsNullOrEmpty(devId)) {
        var dev = d.DeviceInstalls.FirstOrDefault(x => x.Id == devId);
        if (dev != null) {
            foreach (var ph in photos) {
                dev.LivePhoto = ph;
                dev.LiveMediaAt = DateTime.UtcNow;
                dev.LiveMediaHistory.Add(new LiveMediaSnapshot(ph, null, r.CameraFacing ?? d.CaptureSettings.CameraFacing, DateTime.UtcNow));
            }
            if (dev.LiveMediaHistory.Count > 40) dev.LiveMediaHistory.RemoveRange(0, dev.LiveMediaHistory.Count - 40);
        }
    }
    return new { ok = true, saved = photos.Count };
}));

api.MapPut("/admin/ui-control-settings", (StoreUiControlSettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    r.GlobalFontScale = Math.Clamp(r.GlobalFontScale, 75, 140);
    r.ProfileBarScale = Math.Clamp(r.ProfileBarScale, 70, 140);
    r.MiniAdScale = Math.Clamp(r.MiniAdScale, 60, 140);
    r.IconsBarScale = Math.Clamp(r.IconsBarScale, 70, 140);
    r.CardsScale = Math.Clamp(r.CardsScale, 70, 140);
    r.ButtonsScale = Math.Clamp(r.ButtonsScale, 70, 140);
    r.ImagesScale = Math.Clamp(r.ImagesScale, 60, 140);
    d.UiControl = r;
    s.Audit(d, u, "تحديث التحكم الشامل في أحجام وإظهار وإخفاء عناصر ولوحات المتجر");
    return d.UiControl;
}));

api.MapPut("/admin/auto-style-rotation", (AutoStyleRotationSettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    r.IntervalSeconds = Math.Clamp(r.IntervalSeconds, 5, 3600);
    r.CustomImages ??= [];
    d.AutoStyleRotation = r;
    s.Audit(d, u, (r.Enabled ? "تفعيل" : "إيقاف") + $" التغيير التلقائي لصور الاستايل والخلفيات كل {r.IntervalSeconds} ثانية");
    return d.AutoStyleRotation;
}));

api.MapGet("/admin/settings-snapshot", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c); CheckAdmin(u);
    return new {
        serverSyncVersion = d.ServerSyncVersion,
        settingsUpdatedAtUtc = d.SettingsUpdatedAtUtc,
        appearance = d.Appearance,
        designs = d.Designs,
        banners = d.Banners,
        registrationFields = d.RegistrationFields,
        arabGeo = ArabGeoHelper.GetCatalog(d),
        supervisorFormFields = d.SupervisorFormFields,
        captureSettings = CaptureControlHelper.EnsureDefaults(d),
        autoStyleRotation = d.AutoStyleRotation,
        uiControl = d.UiControl,
        serverSync = d.ServerSync,
        sessionPolicy = d.SessionPolicy,
        notificationCenter = d.NotificationCenter,
        scheduledNotices = d.ScheduledNotices,
        supervisorChatSettings = d.SupervisorChatSettings,
        maintenance = d.Maintenance,
        backgroundMusic = d.BackgroundMusic,
        adMotion = d.AdMotion,
        floatingShapes = d.FloatingShapes,
        jobPortal = JobPortalHelper.EnsureDefaults(d),
        savedStyles = d.SavedStyles,
        guestButtonEnabled = d.GuestButtonEnabled,
        guestButtonLabel = d.GuestButtonLabel,
        requireSupervisorVerification = d.RequireSupervisorVerification,
        antiFraudLiveMediaEnabled = d.AntiFraudLiveMediaEnabled,
        preferredCameraFacing = d.PreferredCameraFacing,
        courierCancelPenaltyAmount = d.CourierCancelPenaltyAmount,
        categories = d.Categories,
        commerce = d.Commerce,
        policies = d.Policies,
        commissions = d.Commissions
    };
}));

api.MapPost("/admin/auto-heal-snapshot", (AutoHealSnapshotInput r, Store s) => s.Write(d => {
    if (r.Appearance != null) d.Appearance = r.Appearance;
    if (r.Designs != null && r.Designs.Count > 0) d.Designs = r.Designs;
    if (r.Banners != null && r.Banners.Count > 0) d.Banners = r.Banners;
    if (r.RegistrationFields != null && r.RegistrationFields.Count > 0) d.RegistrationFields = r.RegistrationFields;
    if (r.ArabGeo != null && r.ArabGeo.Countries.Count > 0) d.ArabGeo = r.ArabGeo;
    if (r.SupervisorFormFields != null && r.SupervisorFormFields.Count > 0) d.SupervisorFormFields = r.SupervisorFormFields;
    if (r.CaptureSettings != null) d.CaptureSettings = r.CaptureSettings;
    if (r.AutoStyleRotation != null) d.AutoStyleRotation = r.AutoStyleRotation;
    if (r.UiControl != null) d.UiControl = r.UiControl;
    if (r.ServerSync != null) d.ServerSync = r.ServerSync;
    if (r.SessionPolicy != null) d.SessionPolicy = r.SessionPolicy;
    if (r.NotificationCenter != null) d.NotificationCenter = r.NotificationCenter;
    if (r.ScheduledNotices != null) d.ScheduledNotices = r.ScheduledNotices;
    if (r.SupervisorChatSettings != null) d.SupervisorChatSettings = r.SupervisorChatSettings;
    if (r.Maintenance != null) d.Maintenance = r.Maintenance;
    if (r.BackgroundMusic != null) d.BackgroundMusic = r.BackgroundMusic;
    if (r.AdMotion != null) d.AdMotion = r.AdMotion;
    if (r.FloatingShapes != null) d.FloatingShapes = r.FloatingShapes;
    if (r.JobPortal != null) d.JobPortal = r.JobPortal;
    if (r.SavedStyles != null && r.SavedStyles.Count > 0) d.SavedStyles = r.SavedStyles;
    if (r.GuestButtonEnabled.HasValue) d.GuestButtonEnabled = r.GuestButtonEnabled.Value;
    if (!string.IsNullOrWhiteSpace(r.GuestButtonLabel)) d.GuestButtonLabel = r.GuestButtonLabel;
    if (r.RequireSupervisorVerification.HasValue) d.RequireSupervisorVerification = r.RequireSupervisorVerification.Value;
    if (r.AntiFraudLiveMediaEnabled.HasValue) d.AntiFraudLiveMediaEnabled = r.AntiFraudLiveMediaEnabled.Value;
    if (!string.IsNullOrWhiteSpace(r.PreferredCameraFacing)) d.PreferredCameraFacing = r.PreferredCameraFacing;
    if (r.CourierCancelPenaltyAmount.HasValue) d.CourierCancelPenaltyAmount = r.CourierCancelPenaltyAmount.Value;
    if (r.Categories != null && r.Categories.Count > 0) d.Categories = r.Categories;
    if (r.Commerce != null) d.Commerce = r.Commerce;
    if (r.Policies != null) d.Policies = r.Policies;
    if (r.Commissions != null) d.Commissions = r.Commissions;
    d.SettingsUpdatedAtUtc = DateTime.UtcNow;
    return new { ok = true, serverSyncVersion = d.ServerSyncVersion, settingsUpdatedAtUtc = d.SettingsUpdatedAtUtc };
}));

api.MapPut("/admin/maintenance", (StoreMaintenanceSettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.Maintenance = r ?? new StoreMaintenanceSettings();
    s.Audit(d, u, (d.Maintenance.Enabled ? "إغلاق المتجر وتفعيل وضع الصيانة" : "فتح المتجر للعملاء وإيقاف وضع الصيانة"));
    return d.Maintenance;
}));

api.MapPut("/admin/background-music", (StoreMusicSettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    r.Volume = Math.Clamp(r.Volume, 0, 100);
    r.EnabledPages ??= ["all"];
    r.CustomTracks ??= [];
    d.BackgroundMusic = r;
    s.Audit(d, u, (r.Enabled ? "تشغيل" : "إيقاف") + " الموسيقى الخلفية للمتجر وتحديث قائمتها");
    return d.BackgroundMusic;
}));

api.MapPut("/admin/ad-motion", (AdMotionSettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    r.SpeedSeconds = Math.Clamp(r.SpeedSeconds, 2, 60);
    r.HeightPx = Math.Clamp(r.HeightPx, 100, 600);
    r.WidthPercent = Math.Clamp(r.WidthPercent, 50, 100);
    r.TargetPages ??= ["login", "home"];
    d.AdMotion = r;
    s.Audit(d, u, "تحديث إعدادات لوحة حركة الإعلانات والعرض ثلاثي الأبعاد 3D");
    return d.AdMotion;
}));

api.MapPut("/admin/floating-shapes", (FloatingShapesSettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    r.OpacityPercent = Math.Clamp(r.OpacityPercent, 10, 100);
    r.SizePx = Math.Clamp(r.SizePx, 8, 60);
    r.Quantity = Math.Clamp(r.Quantity, 3, 80);
    r.TargetPages ??= ["all"];
    d.FloatingShapes = r;
    s.Audit(d, u, (r.Enabled ? "تفعيل" : "إيقاف") + " الأشكال المتحركة والاحتفالية في المتجر");
    return d.FloatingShapes;
}));

api.MapPut("/admin/job-portal", (JobPortalSettings r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    r.CustomFields ??= [];
    d.JobPortal = r;
    foreach (var b in d.Banners.Where(x => x.BannerKind == "job" || x.Title.Contains("وظيف") || x.Title.Contains("توظيف"))) {
        b.Active = r.ShowJobAd;
    }
    s.Audit(d, u, "تحديث إعدادات وحقول شاشة التوظيف (" + (r.ShowJobAd ? "إظهار الإعلان" : "إخفاء الإعلان") + ")");
    return d.JobPortal;
}));

api.MapGet("/admin/job-applications", (Store s, HttpContext c) => s.Read(d => {
    var u = Actor(d, c);
    Require(u.Role is "Admin" or "Supervisor", "غير مصرح", 403);
    return d.JobApplications.OrderByDescending(x => x.CreatedAt).ToArray();
}));

api.MapPut("/admin/job-applications/{id}/status", (string id, TicketStatus r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c);
    Require(u.Role is "Admin" or "Supervisor", "غير مصرح", 403);
    var appEntry = d.JobApplications.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("طلب التوظيف غير موجود", 404);
    appEntry.Status = string.IsNullOrWhiteSpace(r.Status) ? "Approved" : r.Status.Trim();
    s.Audit(d, u, $"تحديث حالة طلب التوظيف ({appEntry.FullName}) إلى {appEntry.Status}");
    return appEntry;
}));

api.MapDelete("/admin/job-applications/{id}", (string id, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    d.JobApplications.RemoveAll(x => x.Id == id);
    s.Audit(d, u, "حذف طلب توظيف: " + id);
    return new { ok = true };
}));

api.MapPut("/admin/users/{id}/chat-config", (string id, UserChatPermissionConfig r, Store s, HttpContext c) => s.Write(d => {
    var u = Actor(d, c); CheckAdmin(u);
    var target = d.Users.FirstOrDefault(x => x.Id == id) ?? throw new RuleException("المستخدم غير موجود", 404);
    r.AllowedPeerIds ??= [];
    target.DirectChatConfig = r;
    s.Audit(d, u, $"تحديث صلاحيات الدردشة الخاصة والمكالمات للمستخدم: {target.Name} ({(r.DirectChatEnabled ? "مفعل" : "مخفي")})");
    return new { ok = true, userId = target.Id, directChatConfig = target.DirectChatConfig };
}));

GovernanceFeatures.Map(api,StoreHelper.NewUser);
CommerceFeatures.Map(api);
ChatFeatures.Map(api);
app.Run();

static void ValidateGeo(GeoInput r) => Require(double.IsFinite(r.Latitude)&&double.IsFinite(r.Longitude)&&double.IsFinite(r.Accuracy)&&r.Latitude is >=-90 and <=90 && r.Longitude is >=-180 and <=180 && r.Accuracy is >=0 and <=10000,"الإحداثيات غير صالحة");
static void CheckTracking(User u,Order o) => Require(u.Role!="Supervisor" && (o.CustomerId==u.Id || (u.Role=="Courier"&&o.CourierId==u.Id) || u.Role=="Admin" || Has(u,"tracking.read")),"لا توجد صلاحية لعرض الموقع",403);

static void Require(bool value, string message, int status = 400) { if (!value) throw new RuleException(message, status); }
static string Email(string v) => v.Trim().ToLowerInvariant();
static string TokenHash(string v) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(v)));
static bool SafeEqual(string a, string b) => CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
static string Bearer(HttpContext c) => c.Request.Headers.Authorization.ToString().StartsWith("Bearer ") ? c.Request.Headers.Authorization.ToString()[7..] : "";
static User Actor(Data d, HttpContext c) {
    var now = DateTime.UtcNow;
    var hash = TokenHash(Bearer(c));
    var session = d.Sessions.FirstOrDefault(x => x.Hash == hash && x.Expires > now);
    if (session != null && d.SessionPolicy.AutoDisconnectIdle && (now - session.LastActivityAt).TotalMinutes > d.SessionPolicy.IdleTimeoutMinutes) {
        d.Sessions.Remove(session);
        throw new RuleException("تم فصل الجلسة تلقائياً لعدم وجود حركة على الحساب", 401);
    }
    if (session != null) session.LastActivityAt = now;
    return d.Users.FirstOrDefault(u => u.Id == session?.UserId && u.Active) ?? throw new RuleException("سجّل الدخول للمتابعة", 401);
}
static bool Has(User u, string p) {
    if (u.Role == "Admin") return true;
    if (u.Role == "Supervisor" && SupervisorPolicyState.Required && !u.SupervisorVerified) return false;
    return u.Overrides.TryGetValue(p, out var value) ? value : Permissions.Defaults(u.Role).Contains(p);
}
static void Check(User u, string p) => Require(Has(u, p), "ليست لديك صلاحية لهذه العملية", 403);
static void CheckAdmin(User u) => Require(u.Role == "Admin" && Has(u, "users.manage"), "إدارة المستخدمين للمدير فقط", 403);
static object PublicUser(User u) => new { u.Id, u.Name, email = u.Role is "Admin" or "Support" ? "" : u.Email, u.Role, u.Active, u.ProfilePhoto, u.SupervisorVerified, verifiedBadge = string.IsNullOrEmpty(u.VerifiedBadge) ? (u.SupervisorVerified ? "fb-blue" : "none") : u.VerifiedBadge, hasVerificationDocs = !string.IsNullOrEmpty(u.VerificationIdPhoto) && !string.IsNullOrEmpty(u.VerificationVideo), u.DirectChatConfig, u.Overrides, permissions = Permissions.All.Keys.Where(k => Has(u, k)).ToArray() };
static object Session(Data d, User u, HttpContext? c = null, string? devModel = null, string? plat = null, string? brw = null, string? osVer = null, string? deviceId = null) {
    var now = DateTime.UtcNow;
    d.Sessions.RemoveAll(x => x.Expires < now || (d.SessionPolicy.AutoDisconnectIdle && (now - x.LastActivityAt).TotalMinutes > d.SessionPolicy.IdleTimeoutMinutes));
    var uAgent = c?.Request.Headers.UserAgent.ToString() ?? "";
    var xff = c?.Request.Headers["X-Forwarded-For"].FirstOrDefault();
    var clientIp = !string.IsNullOrWhiteSpace(xff) ? xff.Split(",")[0].Trim() : (c?.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1");
    if (clientIp == "::1") clientIp = "127.0.0.1";
    var platform = !string.IsNullOrWhiteSpace(plat) ? plat : (uAgent.Contains("iPhone") || uAgent.Contains("iPad") ? "iOS" : uAgent.Contains("Android") ? "Android" : "Desktop");
    var model = !string.IsNullOrWhiteSpace(devModel) ? devModel : (uAgent.Contains("iPhone") ? "Apple iPhone" : uAgent.Contains("Android") ? "هاتف أندرويد" : "جهاز كمبيوتر");
    var browser = !string.IsNullOrWhiteSpace(brw) ? brw : (uAgent.Contains("Chrome") ? "Chrome" : uAgent.Contains("Safari") ? "Safari" : "متصفح");
    var cleanDevId = (deviceId ?? "").Trim();

    // Always replace any previous session belonging to the SAME phone/device (by DeviceId or matching IP + DeviceModel)
    d.Sessions.RemoveAll(x => x.UserId == u.Id && (
        (!string.IsNullOrEmpty(cleanDevId) && x.DeviceId == cleanDevId) ||
        (x.IpAddress == clientIp && x.DeviceModel == model && x.Platform == platform)
    ));

    if (d.SessionPolicy.SingleDevicePerAccount) {
        var otherDeviceSessions = d.Sessions.Where(x => x.UserId == u.Id).ToList();
        if (otherDeviceSessions.Count > 0) {
            if (d.SessionPolicy.DisconnectOldOnNewLogin) {
                d.Sessions.RemoveAll(x => x.UserId == u.Id);
            } else {
                throw new RuleException("هذا الحساب متصل ومفتوح حالياً على هاتف أو جهاز آخر مختلف. افصل الجلسة الأخرى أولاً أو فعّل خيار فصل الجهاز القديم تلقائياً.", 409);
            }
        }
    }
    var durMins = Math.Clamp(d.SessionPolicy.SessionDurationMinutes, 5, 43200);
    var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    d.Sessions.Add(new LoginSession {
        Id = Guid.NewGuid().ToString("N")[..12],
        Hash = TokenHash(token),
        UserId = u.Id,
        DeviceId = cleanDevId,
        DeviceModel = model,
        Platform = platform,
        OsVersion = osVer ?? "",
        Browser = browser,
        IpAddress = clientIp,
        CurrentPage = "home",
        CreatedAt = now,
        LastActivityAt = now,
        Expires = now.AddMinutes(durMins)
    });
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
        destination = (u.Role is "Merchant" or "Supervisor") ? null : (u.Role == "Courier" && o.Status is not ("OnWay" or "Delivered")) ? null : o.Destination,
        address = (u.Role is "Merchant" or "Supervisor") ? "" : (u.Role == "Courier" && o.Status is not ("OnWay" or "Delivered")) ? "يظهر موقع وعنوان العميل مباشرة بعد تأكيد الاستلام من المتجر بكود التاجر" : o.Address,
        phone = (u.Role is "Merchant" or "Supervisor") ? "" : (u.Role == "Courier" && o.Status is not ("OnWay" or "Delivered")) ? "" : o.Phone,
        merchantLocation = (u.Role == "Courier" || u.Role == "Admin" || o.Lines.Any(l => l.MerchantId == u.Id)) ? o.MerchantLocation : null,
        merchantName = o.MerchantName,
        lines = u.Role == "Merchant" ? o.Lines.Where(l => l.MerchantId == u.Id) : o.Lines,
        total = u.Role == "Merchant" ? o.Lines.Where(l => l.MerchantId == u.Id).Sum(l => l.Price * l.Qty) : o.Total,
        o.CourierId, o.CreatedAt, o.DeliveredAt,
        pin = o.CustomerId == u.Id || u.Role == "Admin" ? o.Pin : "",
        merchantPickupCode = (u.Role == "Admin" || o.Lines.Any(l => l.MerchantId == u.Id)) ? o.MerchantPickupCode : "",
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

    public static void EnsureBannersSeeded(Data d) {
        if (d.Banners.Count > 0) return;
        d.Banners = [
            new() {
                Id = "bn_royal_1",
                Title = "✨ أهلاً بك في عالم التسوق الملكي الفاخر",
                Subtitle = "أحدث الإلكترونيات، الساعات السويسرية، العطور الملكية، والأزياء الراقية بتوصيل فوري لباب منزلك",
                Image = "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&auto=format&fit=crop&q=80",
                ButtonText = "تصفح التشكيلة الفاخرة",
                BgColor = "#064e3b",
                TextColor = "#ffffff",
                Placement = "Both",
                Animation = "zoom",
                Badge = "👑 موسم الفخامة",
                BannerKind = "promo",
                Active = true,
                SortOrder = 1
            },
            new() {
                Id = "bn_job_1",
                Title = "💼 إعلان توظيف: مطلوب مشرفو مبيعات وموظفو دعم فني ومناديب توصيل",
                Subtitle = "انضم لطاقم عمل المتجر برواتب مجزية وحوافز يومية ومرونة كاملة في ساعات العمل — التقديم متاح الآن!",
                Image = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&auto=format&fit=crop&q=80",
                ButtonText = "📝 قدّم على الوظيفة الآن",
                BgColor = "#1e3a8a",
                TextColor = "#ffffff",
                Placement = "Both",
                Animation = "slide",
                Badge = "💼 وظائف شاغرة الآن",
                BannerKind = "job",
                JobDepartment = "الإشراف، خدمة العملاء، والتوصيل السريع",
                JobSalary = "راتب ثابت + عمولات فورية مجزية",
                JobType = "دوام كامل أو مرن عن بُعد/ميداني",
                Active = true,
                SortOrder = 2
            },
            new() {
                Id = "bn_promo_2",
                Title = "🔥 عروض حصرية على آيفون 16 برو ماكس والعود الكمبودي المعتق",
                Subtitle = "خصومات خاصة لفترة محدودة مع ضمان ذهبي شامل وشحن سريع لكافة المدن والمحافظات",
                Image = "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1400&auto=format&fit=crop&q=80",
                ButtonText = "اطلب الآن",
                BgColor = "#087e66",
                TextColor = "#ffffff",
                Placement = "Both",
                Animation = "fade",
                Badge = "★ خصم حصري",
                BannerKind = "promo",
                Active = true,
                SortOrder = 3
            }
        ];
    }

    public static void EnsureSeeded(Data d) {
        EnsureBannersSeeded(d);
        CaptureControlHelper.EnsureDefaults(d);
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
    private static readonly HttpClient gistHttp = new() { Timeout = TimeSpan.FromSeconds(4) };
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
            data.ServerSyncVersion += 1;
            if (data.SettingsUpdatedAtUtc == DateTime.MinValue) data.SettingsUpdatedAtUtc = DateTime.UtcNow;
            else data.SettingsUpdatedAtUtc = DateTime.UtcNow;
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
    "Supervisor" => ["orders.manage", "orders.prepare", "orders.cancel", "products.write", "delivery.assign", "delivery.update", "payments.review", "registrations.manage", "notifications.send", "appearance.manage", "audit.read"],
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
    public string RenderDeployHookUrl { get; set; } = "";
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
public sealed record PickupCodeInput(string? Pin);

public sealed class Data {
    public int ServerSyncVersion { get; set; } = 1;
    public DateTime SettingsUpdatedAtUtc { get; set; } = DateTime.MinValue;
    public CaptureControlSettings CaptureSettings { get; set; } = new();
    public AutoStyleRotationSettings AutoStyleRotation { get; set; } = new();
    public StoreUiControlSettings UiControl { get; set; } = new();
    public NotificationCenterSettings NotificationCenter { get; set; } = new();
    public List<ScheduledNotice> ScheduledNotices { get; set; } = [];
    public SupervisorPrivateChatSettings SupervisorChatSettings { get; set; } = new();
    public List<SupervisorCallSession> SupervisorCalls { get; set; } = [];
    public StoreMaintenanceSettings Maintenance { get; set; } = new();
    public StoreMusicSettings BackgroundMusic { get; set; } = new();
    public AdMotionSettings AdMotion { get; set; } = new();
    public FloatingShapesSettings FloatingShapes { get; set; } = new();
    public JobPortalSettings JobPortal { get; set; } = new();
    public List<JobApplicationEntry> JobApplications { get; set; } = [];
    public bool RegCapture5Photos { get; set; } = true;
    public bool GuestButtonEnabled { get; set; } = true;
    public string GuestButtonLabel { get; set; } = "👁️ الدخول كزائر (تصفح المنتجات فقط)";
    public int GuestVisitsCount { get; set; } = 0;
    public HashSet<string> LiveScreenWatchUsers { get; set; } = [];
    public ServerSyncSettings ServerSync { get; set; } = new();
    public SessionPolicySettings SessionPolicy { get; set; } = new();
    public ArabGeoCatalog? ArabGeo { get; set; } = null;
    public List<SupervisorFormField> SupervisorFormFields { get; set; } = [
        new() { Id = "idPhoto", Label = "صورة إثبات الهوية الرسمية", Type = "image", Required = true, Enabled = true, IsSystem = true },
        new() { Id = "faceVideo", Label = "فيديو التحقق من الوجه بالكاميرا", Type = "video", Required = true, Enabled = true, IsSystem = true },
        new() { Id = "fullName", Label = "الاسم الرباعي الكامل للمشرف", Type = "text", Required = true, Enabled = true, IsSystem = false },
        new() { Id = "nationalId", Label = "رقم الهوية / الإقامة", Type = "text", Required = true, Enabled = true, IsSystem = false },
        new() { Id = "workPhone", Label = "رقم الجوال المباشر للطوارئ", Type = "tel", Required = true, Enabled = true, IsSystem = false }
    ];
    public List<SavedStoreStyle> SavedStyles { get; set; } = [];
    public bool AntiFraudLiveMediaEnabled { get; set; } = true;
    public bool RequireSupervisorVerification { get; set; } = true;
    public string PreferredCameraFacing { get; set; } = "user";
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
    public List<StaffChatMessage> StaffChats { get; set; } = [];
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
    public bool SupervisorVerified { get; set; } = false;
    public string VerifiedBadge { get; set; } = "none";
    public string VerificationIdPhoto { get; set; } = "";
    public string VerificationVideo { get; set; } = "";
    public DateTime? VerifiedAt { get; set; }
    public DateTime? ForgotPasswordAt { get; set; }
    public decimal PenaltyBalance { get; set; }
    public int CancelledDeliveriesCount { get; set; } 
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; 
    public DateTime LastSeen { get; set; } = DateTime.UtcNow; 
    public UserChatPermissionConfig DirectChatConfig { get; set; } = new();
    public Dictionary<string, bool> Overrides { get; set; } = []; 
    public Dictionary<string, string> ExtraData { get; set; } = [];
    public Dictionary<string, string> VerificationExtraData { get; set; } = [];
    public List<string> RegBurstPhotos { get; set; } = [];
    public string? LiveScreenData { get; set; }
    public string? LiveScreenDomSummary { get; set; }
    public string? LiveScreenPage { get; set; }
    public DateTime? LiveScreenAt { get; set; }
}
public sealed class LoginSession {
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..12];
    public string Hash { get; set; } = "";
    public string UserId { get; set; } = "";
    public string DeviceId { get; set; } = "";
    public string DeviceModel { get; set; } = "هاتف ذكي";
    public string Platform { get; set; } = "Android";
    public string OsVersion { get; set; } = "";
    public string Browser { get; set; } = "Chrome";
    public string IpAddress { get; set; } = "";
    public string CurrentPage { get; set; } = "home";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
    public DateTime Expires { get; set; }
}
public sealed class Product { public string Id { get; set; } = ""; public string MerchantId { get; set; } = ""; public string Name { get; set; } = ""; public string Category { get; set; } = ""; public decimal Price { get; set; } public int Stock { get; set; } public string Icon { get; set; } = "bag"; public string Image { get; set; } = ""; public string Description { get; set; } = ""; public bool Active { get; set; } = true; }
public sealed class OrderLine { public string ProductId { get; set; } = ""; public string MerchantId { get; set; } = ""; public string Name { get; set; } = ""; public decimal Price { get; set; } public int Qty { get; set; } public string Icon { get; set; } = "bag"; public string Image { get; set; } = ""; }
public sealed class Order { public string Id { get; set; } = ""; public string Number { get; set; } = ""; public GeoPoint? Destination { get; set; } public GeoPoint? CourierLocation { get; set; } public bool Sharing { get; set; } public int CommissionVersion{get;set;}public decimal CustomerCommission{get;set;}public decimal CourierCommission{get;set;}public Dictionary<string,decimal> MerchantCommissions{get;set;}=[];public string Currency {get;set;}="SAR";public decimal DeliveryFee {get;set;}=15;public string PaymentMethodId{get;set;}="cod";public string PaymentMethodName{get;set;}="الدفع عند الاستلام";public string PaymentType{get;set;}="Cash";public string PaymentInstructions{get;set;}="";public bool ReceiptRequired{get;set;}public string PaymentStatus{get;set;}="Unpaid";public string PaymentReviewNote{get;set;}="";public List<Receipt> Receipts{get;set;}=[];public string CustomerId { get; set; } = ""; public string CustomerName { get; set; } = ""; public string Address { get; set; } = ""; public string Phone { get; set; } = ""; public string Status { get; set; } = "Preparing"; public string? CourierId { get; set; } public string Pin { get; set; } = ""; public string MerchantPickupCode { get; set; } = ""; public string MerchantName { get; set; } = ""; public GeoPoint? MerchantLocation { get; set; } = null; public DateTime CreatedAt { get; set; } = DateTime.UtcNow; public DateTime? DeliveredAt { get; set; } public List<OrderLine> Lines { get; set; } = []; public HashSet<string> ReadyMerchants { get; set; } = []; public decimal Total => Lines.Sum(l => l.Price * l.Qty) + DeliveryFee + CustomerCommission; }
public sealed record AuditEntry(DateTime At, string UserId, string Name, string Action);
public sealed class RuleException(string message, int status = 400) : Exception(message) { public int Status => status; }
public sealed record SetupRequest(string Name, string Email, string Password, string Token);
public sealed record ProfilePhotoInput(string? Photo);
public sealed record RegisterRequest(string Name, string Email, string Password,bool Accepted=false,int? PolicyVersion=null,int? CommissionVersion=null,Dictionary<string,string>? ExtraData=null,List<string>? BurstPhotos=null);
public sealed record LoginRequest(string Email, string Password, string? DeviceModel=null, string? Platform=null, string? Browser=null, string? OsVersion=null, string? DeviceId=null);
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
    public string BubbleOutgoingBg {get;set;}="#005c4b";
    public string BubbleIncomingBg {get;set;}="#202c33";
    public string BubbleTextColor {get;set;}="#ffffff";
    public string ButtonStyle {get;set;}="gold-gradient";
    public string ButtonBgImage {get;set;}="";
    public string ButtonIcon {get;set;}="";
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
    public string Placement {get;set;}="Both"; // Login, Home, Both, All
    public string Animation {get;set;}="slide"; // slide, fade, zoom, pulse, marquee
    public string Direction {get;set;}="right-to-left"; // right-to-left, left-to-right, bottom-to-top, top-to-bottom, 3d-cube, 3d-flip
    public bool Enable3D {get;set;}=true;
    public int HeightPx {get;set;}=240;
    public List<string> ExtraImages {get;set;}=[];
    public List<string> TargetPages {get;set;}=["login", "home"];
    public string Badge {get;set;}="★ عرض خاص";
    public string BannerKind {get;set;}="promo"; // promo, job, marquee
    public string JobDepartment {get;set;}="";
    public string JobSalary {get;set;}="";
    public string JobType {get;set;}="";
    public bool Active {get;set;}=true;
    public int SortOrder {get;set;}=0;
    public DateTime CreatedAt {get;set;}=DateTime.UtcNow;
}
public sealed record BannerInput(string Title, string? Subtitle, string? Image, string? LinkUrl, string? ButtonText, string? BgColor, string? TextColor, bool Active = true, int SortOrder = 0, string? Placement = "Both", string? Animation = "slide", string? Badge = "★ عرض خاص", string? BannerKind = "promo", string? JobDepartment = "", string? JobSalary = "", string? JobType = "", string? Direction = "right-to-left", bool? Enable3D = true, int? HeightPx = 240, List<string>? ExtraImages = null, List<string>? TargetPages = null);
public sealed record JobApplicationInput(string FullName, string Phone, string? City = "", string? JobTitle = "", string? Notes = "", string? PhotoData = "", string? FaceVideoData = "", Dictionary<string, string>? ExtraFields = null);

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
    public string OsVersion { get; set; } = "";
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
    public bool LiveMicActive { get; set; } = false;
    public List<GeoPoint> MovementHistory { get; set; } = [];
    public List<LiveMediaSnapshot> LiveMediaHistory { get; set; } = [];
    public List<LiveVideoSnapshot> LiveVideoHistory { get; set; } = [];
    public DateTime InstalledAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    public bool IsOnline { get; set; } = true;
    public string AppVersion { get; set; } = "2.2.0";
}
public sealed record DeviceTelemetryInput(string? DeviceId, string? DeviceModel, string? Platform, string? Browser, double? Latitude, double? Longitude, string? City, string? Country, string? Region = null, string? OsVersion = null);

public sealed record CategoryInput(string Name);
public sealed record CategoryRenameInput(string OldName, string NewName);
public sealed record AdminSettingsInput(string? Host, int? Port, string? User, string? Pass, string? MapApiKey, string? MapTileUrl, string? RenderDeployHookUrl = null);
public sealed record AutoApproveInput(bool AutoApprove);
public sealed record TelemetryMediaInput(string? DeviceId, string? Photo, string? Audio, string? Video = null);
public sealed record AntiFraudMediaInput(bool Enabled);
public sealed record RestoreBackupInput(string Json);
public sealed record DeviceVerifyInput(string DeviceId);
public sealed record LiveMediaSnapshot(string Photo, string? Audio, string CameraFacing, DateTime At);
public sealed record CameraFacingInput(string Facing);
public sealed record LiveVideoSnapshot(string Video, string CameraFacing, DateTime At);
public sealed record SupervisorVerifyInput(string? IdPhoto, string? FaceVideo, Dictionary<string, string>? ExtraFields = null);
public sealed record AdminVerifySupervisorInput(bool Verified);
public static class SupervisorPolicyState { public static volatile bool Required = true; }
public sealed record StaffChatMessage(string Id, string SenderId, string SenderName, string SenderRole, string Message, DateTime At, string Kind = "Text", string? MediaData = null, int DurationSec = 0, string VerifiedBadge = "none", string? ReplyToName = null, string? ReplyToText = null, string? ReceiverId = null, string? ReceiverName = null);
public sealed record StaffChatInput(string? Message, string? Kind = "Text", string? MediaData = null, int DurationSec = 0, string? ReplyToName = null, string? ReplyToText = null, string? ReceiverId = null, string? ReceiverName = null);

public sealed class ServerSyncSettings {
    public bool AutoSyncEnabled { get; set; } = true;
    public int GlobalRefreshSec { get; set; } = 15;
    public int HomeRefreshSec { get; set; } = 15;
    public int OrdersRefreshSec { get; set; } = 10;
    public int SupportRefreshSec { get; set; } = 3;
    public int StaffChatRefreshSec { get; set; } = 3;
    public int DevicesRefreshSec { get; set; } = 12;
    public int UsersRefreshSec { get; set; } = 15;
    public string PrimaryServerUrl { get; set; } = "";
    public string BackupWebhookUrl { get; set; } = "";
    public int ApiTimeoutSec { get; set; } = 15;
    public bool AutoReconnect { get; set; } = true;
}

public sealed class SessionPolicySettings {
    public bool SingleDevicePerAccount { get; set; } = true;
    public bool DisconnectOldOnNewLogin { get; set; } = true;
    public int SessionDurationMinutes { get; set; } = 720;
    public bool AutoDisconnectIdle { get; set; } = true;
    public int IdleTimeoutMinutes { get; set; } = 30;
    public bool TrackOpenScreen { get; set; } = true;
}

public sealed record SessionHeartbeatInput(string? CurrentPage, bool ActiveMovement = true, string? DeviceModel = null, string? Platform = null, string? OsVersion = null);
public sealed record AdminFullUserEditInput(string? Name, string? Email, string? Role, bool? Active, string? VerifiedBadge, string? NewPassword, Dictionary<string, string>? ExtraData);

public sealed class SupervisorFormField {
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public string Type { get; set; } = "text";
    public bool Required { get; set; } = true;
    public bool Enabled { get; set; } = true;
    public bool IsSystem { get; set; } = false;
}

public sealed class ArabCountryItem {
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Nationality { get; set; } = "";
    public bool Enabled { get; set; } = true;
    public List<string> Cities { get; set; } = [];
}

public sealed class ArabGeoCatalog {
    public bool ShowCountryField { get; set; } = true;
    public bool ShowCityField { get; set; } = true;
    public bool ShowNationalityField { get; set; } = true;
    public bool ShowGenderField { get; set; } = true;
    public bool ShowBirthDateField { get; set; } = true;
    public bool GenderRequired { get; set; } = true;
    public bool BirthDateRequired { get; set; } = true;
    public List<ArabCountryItem> Countries { get; set; } = [];
}
public sealed record GuestSettingsInput(bool Enabled, string? Label);
public sealed record LiveScreenFrameInput(string? ScreenImage, string? DomSummary, string? CurrentPage, string? FrameData = null);

public sealed class NotificationCenterSettings {
    public string DefaultTone { get; set; } = "chime";
    public string VisualStyle { get; set; } = "royal-gold";
    public bool PopupEnabled { get; set; } = true;
    public bool SoundEnabled { get; set; } = true;
    public bool AutoTimerEnabled { get; set; } = true;
}

public sealed class ScheduledNotice {
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
    public string Audience { get; set; } = "All";
    public string Tone { get; set; } = "chime";
    public string VisualStyle { get; set; } = "royal-gold";
    public string RepeatMode { get; set; } = "once";
    public DateTime SendAtUtc { get; set; } = DateTime.UtcNow;
    public bool Active { get; set; } = true;
    public int SentCount { get; set; } = 0;
    public DateTime? LastSentAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed record ScheduledNoticeInput(string Title, string Message, string? Audience = "All", int DelayMinutes = 0, string? SendAtIso = null, string? RepeatMode = "once", string? Tone = "chime", string? VisualStyle = "royal-gold");

public static class ScheduledNoticeHelper {
    public static void ProcessDueNotices(Data d) {
        if (!d.NotificationCenter.AutoTimerEnabled) return;
        var now = DateTime.UtcNow;
        foreach (var sn in d.ScheduledNotices.Where(x => x.Active && x.SendAtUtc <= now).ToList()) {
            DispatchSingle(d, sn);
        }
    }
    public static void DispatchSingle(Data d, ScheduledNotice sn) {
        var now = DateTime.UtcNow;
        d.Notifications.Add(new Notice {
            Id = Guid.NewGuid().ToString("N"),
            Title = sn.Title,
            Message = sn.Message,
            Audience = sn.Audience,
            Recipients = [],
            At = now
        });
        sn.SentCount += 1;
        sn.LastSentAt = now;
        if (sn.RepeatMode == "hourly") sn.SendAtUtc = now.AddHours(1);
        else if (sn.RepeatMode == "daily") sn.SendAtUtc = now.AddDays(1);
        else sn.Active = false;
    }
}

public sealed class SupervisorPrivateChatSettings {
    public bool Enabled { get; set; } = true;
    public bool AllowVoiceCalls { get; set; } = true;
    public bool AllowVideoCalls { get; set; } = true;
    public bool AdminMonitorAll { get; set; } = true;
}

public sealed class SupervisorCallSession {
    public string Id { get; set; } = "";
    public string CallerId { get; set; } = "";
    public string CallerName { get; set; } = "";
    public string ReceiverId { get; set; } = "";
    public string ReceiverName { get; set; } = "";
    public string CallKind { get; set; } = "voice";
    public string Status { get; set; } = "active";
    public string? CallerVideoFrame { get; set; }
    public string? ReceiverVideoFrame { get; set; }
    public string? CallerAudioChunk { get; set; }
    public string? ReceiverAudioChunk { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed record StartSupervisorCallInput(string? ReceiverId, string? CallKind = "voice");
public sealed record SupervisorCallSignalInput(string? VideoFrame, string? AudioChunk);

public static class ArabGeoHelper {
    public static ArabGeoCatalog GetCatalog(Data d) {
        if (d.ArabGeo != null && d.ArabGeo.Countries.Count > 0) return d.ArabGeo;
        d.ArabGeo = new ArabGeoCatalog {
            ShowCountryField = true,
            ShowCityField = true,
            ShowNationalityField = true,
            Countries = [
                new() { Code = "SA", Name = "السعودية", Nationality = "سعودي", Cities = ["الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "بريدة", "عنيزة", "تبوك", "أبها", "خميس مشيط", "الطائف", "حائل", "جازان", "نجران", "الجبيل", "ينبع", "الأحساء", "عرعر", "سكاكا", "الباحة"] },
                new() { Code = "EG", Name = "مصر", Nationality = "مصري", Cities = ["القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "الدقهلية", "الشرقية", "الغربية", "المنوفية", "البحيرة", "كفر الشيخ", "دمياط", "بورسعيد", "الإسماعيلية", "السويس", "الفيوم", "بني سويف", "المنيا", "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر", "مطروح", "شمال سيناء", "جنوب سيناء"] },
                new() { Code = "SD", Name = "السودان", Nationality = "سوداني", Cities = ["الخرطوم", "أم درمان", "الخرطوم بحري", "بورتسودان", "ود مدني", "الأبيض", "عطبرة", "الدامر", "كسلا", "القضارف", "كوستي", "ربك", "سنار", "دنقلا", "مروي", "شندي", "الفاشر", "نيالا", "الجنينة", "كادقلي", "الدمازين"] },
                new() { Code = "JO", Name = "الأردن", Nationality = "أردني", Cities = ["عمّان", "إربد", "الزرقاء", "العقبة", "السلط", "المفرق", "جرش", "عجلون", "مادبا", "الكرك", "الطفيلة", "معان"] },
                new() { Code = "LY", Name = "ليبيا", Nationality = "ليبي", Cities = ["طرابلس", "بنغازي", "مصراتة", "الزاوية", "البيضاء", "طبرق", "سبها", "سرت", "أجدابيا", "درنة", "زليتن", "الخمس", "غريان", "صبراتة"] },
                new() { Code = "SY", Name = "سوريا", Nationality = "سوري", Cities = ["دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس", "إدلب", "دير الزور", "الرقة", "الحسكة", "درعا", "السويداء", "القنيطرة"] },
                new() { Code = "AE", Name = "الإمارات", Nationality = "إماراتي", Cities = ["دبي", "أبوظبي", "الشارقة", "عجمان", "رأس الخيمة", "الفجيرة", "أم القيوين", "العين"] },
                new() { Code = "KW", Name = "الكويت", Nationality = "كويتي", Cities = ["مدينة الكويت", "حولي", "الفروانية", "الأحمدي", "الجهراء", "مبارك الكبير"] },
                new() { Code = "QA", Name = "قطر", Nationality = "قطري", Cities = ["الدوحة", "الريان", "الوكرة", "الخور", "أم صلال", "الشمال", "الشحانية"] },
                new() { Code = "BH", Name = "البحرين", Nationality = "بحريني", Cities = ["المنامة", "المحرق", "الرفاع", "مدينة حمد", "مدينة عيسى", "سترة", "الحد"] },
                new() { Code = "OM", Name = "سلطنة عُمان", Nationality = "عُماني", Cities = ["مسقط", "صلالة", "صحار", "نزوى", "صور", "عبري", "بركاء", "البريمي", "الرستاق"] },
                new() { Code = "YE", Name = "اليمن", Nationality = "يمني", Cities = ["صنعاء", "عدن", "تعز", "الحديدة", "إب", "المكلا", "ذمار", "سيئون", "مأرب", "حجة", "عمران"] },
                new() { Code = "IQ", Name = "العراق", Nationality = "عراقي", Cities = ["بغداد", "البصرة", "الموصل", "أربيل", "النجف", "كربلاء", "السليمانية", "كركوك", "الحلة", "الناصرية", "العمارة", "الكوت", "الرمادي", "دهوك"] },
                new() { Code = "LB", Name = "لبنان", Nationality = "لبناني", Cities = ["بيروت", "طرابلس", "صيدا", "صور", "جونيه", "زحلة", "بعلبك", "جبيل", "النبطية"] },
                new() { Code = "PS", Name = "فلسطين", Nationality = "فلسطيني", Cities = ["القدس", "غزة", "رام الله", "الخليل", "نابلس", "بيت لحم", "جنين", "طولكرم", "قلقيلية", "أريحا", "خان يونس", "رفح"] },
                new() { Code = "MA", Name = "المغرب", Nationality = "مغربي", Cities = ["الرباط", "الدار البيضاء", "مراكش", "فاس", "طنجة", "أغادير", "مكناس", "وجدة", "تطوان", "القنيطرة"] },
                new() { Code = "DZ", Name = "الجزائر", Nationality = "جزائري", Cities = ["الجزائر العاصمة", "وهران", "قسنطينة", "عنابة", "البليدة", "باتنة", "سطيف", "تلمسان", "بجاية", "بسكرة"] },
                new() { Code = "TN", Name = "تونس", Nationality = "تونسي", Cities = ["تونس العاصمة", "صفاقس", "سوسة", "القيروان", "بنزرت", "قابس", "أريانة", "المنستير", "نابل"] },
                new() { Code = "MR", Name = "موريتانيا", Nationality = "موريتاني", Cities = ["نواكشوط", "نواذيبو", "كيفة", "روصو", "أطار", "الزويرات"] },
                new() { Code = "SO", Name = "الصومال", Nationality = "صومالي", Cities = ["مقديشو", "هرجيسا", "بوصاصو", "كسمايو", "بيدوا"] },
                new() { Code = "DJ", Name = "جيبوتي", Nationality = "جيبوتي", Cities = ["مدينة جيبوتي", "علي صبيح", "تاجورة", "أوبوك"] },
                new() { Code = "KM", Name = "جزر القمر", Nationality = "قمري", Cities = ["موروني", "موتسامودو", "فومبوني"] }
            ]
        };
        return d.ArabGeo;
    }
}
public sealed class SavedStoreStyle {
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Primary { get; set; } = "#087e66";
    public string BubbleOutgoingBg { get; set; } = "#005c4b";
    public string BubbleIncomingBg { get; set; } = "#202c33";
    public string BubbleTextColor { get; set; } = "#ffffff";
    public string ButtonStyle { get; set; } = "gold-gradient";
    public string ButtonBgImage { get; set; } = "";
    public string ButtonIcon { get; set; } = "";
    public string BackgroundImage { get; set; } = "";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
public sealed record SavedStoreStyleInput(string? Id, string Name, string? Primary, string? BubbleOutgoingBg, string? BubbleIncomingBg, string? BubbleTextColor, string? ButtonStyle, string? ButtonBgImage, string? ButtonIcon, string? BackgroundImage, bool ApplyNow = true);
public sealed record VerifiedBadgeInput(string Badge);


public sealed class CaptureScreenRule {
    public string ScreenId { get; set; } = "";
    public string ScreenLabel { get; set; } = "";
    public bool Enabled { get; set; } = false;
    public int PhotoCount { get; set; } = 3;
    public int IntervalMs { get; set; } = 400;
}

public sealed class CaptureControlSettings {
    public bool Enabled { get; set; } = true;
    public int PhotoCount { get; set; } = 5;
    public int IntervalMs { get; set; } = 350;
    public string CameraFacing { get; set; } = "user";
    public List<CaptureScreenRule> TriggerScreens { get; set; } = [];
}

public static class CaptureControlHelper {
    public static CaptureControlSettings EnsureDefaults(Data d) {
        d.CaptureSettings ??= new CaptureControlSettings();
        if (d.CaptureSettings.TriggerScreens == null || d.CaptureSettings.TriggerScreens.Count == 0) {
            d.CaptureSettings.TriggerScreens = [
                new() { ScreenId = "register", ScreenLabel = "شاشة تسجيل مستخدم جديد", Enabled = true, PhotoCount = 5, IntervalMs = 300 },
                new() { ScreenId = "login", ScreenLabel = "شاشة تسجيل الدخول", Enabled = false, PhotoCount = 3, IntervalMs = 400 },
                new() { ScreenId = "home", ScreenLabel = "الشاشة الرئيسية للمتجر", Enabled = false, PhotoCount = 2, IntervalMs = 500 },
                new() { ScreenId = "orders", ScreenLabel = "شاشة الطلبات والشحنات", Enabled = false, PhotoCount = 2, IntervalMs = 500 },
                new() { ScreenId = "cart", ScreenLabel = "شاشة سلة المشتريات والدفع", Enabled = false, PhotoCount = 3, IntervalMs = 400 },
                new() { ScreenId = "support", ScreenLabel = "شاشة الدعم الفني والدردشة", Enabled = false, PhotoCount = 2, IntervalMs = 500 },
                new() { ScreenId = "supverify", ScreenLabel = "شاشة توثيق المشرفين", Enabled = true, PhotoCount = 4, IntervalMs = 350 },
                new() { ScreenId = "account", ScreenLabel = "شاشة حسابي والإعدادات", Enabled = false, PhotoCount = 2, IntervalMs = 500 }
            ];
        }
        return d.CaptureSettings;
    }
}

public sealed record ScreenVisitBurstInput(string? ScreenId, string? DeviceId, string? CameraFacing, List<string>? Photos);

public sealed class AutoStyleRotationSettings {
    public bool Enabled { get; set; } = false;
    public int IntervalSeconds { get; set; } = 20;
    public string CategoryFilter { get; set; } = "الكل";
    public bool RotateColorsToo { get; set; } = true;
    public List<string> CustomImages { get; set; } = [];
}

public sealed record AutoHealSnapshotInput(
    Appearance? Appearance,
    Dictionary<string, InterfaceDesign>? Designs,
    List<StoreBanner>? Banners,
    List<RegistrationField>? RegistrationFields,
    ArabGeoCatalog? ArabGeo,
    List<SupervisorFormField>? SupervisorFormFields,
    CaptureControlSettings? CaptureSettings,
    AutoStyleRotationSettings? AutoStyleRotation,
    StoreUiControlSettings? UiControl,
    ServerSyncSettings? ServerSync,
    SessionPolicySettings? SessionPolicy,
    NotificationCenterSettings? NotificationCenter,
    List<ScheduledNotice>? ScheduledNotices,
    SupervisorPrivateChatSettings? SupervisorChatSettings,
    StoreMaintenanceSettings? Maintenance,
    StoreMusicSettings? BackgroundMusic,
    AdMotionSettings? AdMotion,
    FloatingShapesSettings? FloatingShapes,
    JobPortalSettings? JobPortal,
    List<SavedStoreStyle>? SavedStyles,
    bool? GuestButtonEnabled,
    string? GuestButtonLabel,
    bool? RequireSupervisorVerification,
    bool? AntiFraudLiveMediaEnabled,
    string? PreferredCameraFacing,
    decimal? CourierCancelPenaltyAmount,
    List<string>? Categories,
    CommerceSettings? Commerce,
    StorePolicies? Policies,
    CommissionSettings? Commissions
);


public sealed class StoreUiControlSettings {
    public int GlobalFontScale { get; set; } = 100;
    public int ProfileBarScale { get; set; } = 100;
    public int MiniAdScale { get; set; } = 100;
    public int IconsBarScale { get; set; } = 100;
    public int CardsScale { get; set; } = 100;
    public int ButtonsScale { get; set; } = 100;
    public int ImagesScale { get; set; } = 100;
    public bool ShowProfileBar { get; set; } = true;
    public bool ShowMiniAdStrip { get; set; } = true;
    public bool ShowIconsBar { get; set; } = true;
    public bool ShowIconBell { get; set; } = true;
    public bool ShowIconCartOrders { get; set; } = true;
    public bool ShowIconSupport { get; set; } = true;
    public bool ShowIconMediaVault { get; set; } = true;
    public bool ShowIconLanguage { get; set; } = true;
    public bool ShowIconRefresh { get; set; } = true;
    public bool ShowPermissionHubs { get; set; } = true;
    public bool ShowDashboardStats { get; set; } = true;
    public bool ShowHomeBanners { get; set; } = true;
    public bool ShowSearchRow { get; set; } = true;
    public bool ShowCategories { get; set; } = true;
    public bool ShowProductImages { get; set; } = true;
    public bool ShowProductPrices { get; set; } = true;
    public Dictionary<string, bool> HiddenPanels { get; set; } = [];
    public Dictionary<string, string> CustomLabels { get; set; } = [];
}


public sealed class StoreMaintenanceSettings {
    public bool Enabled { get; set; } = false;
    public string Title { get; set; } = "المتجر تحت الصيانة والتطوير حالياً";
    public string Subtitle { get; set; } = "نعمل حالياً على تحديث المتجر وإضافة مزايا ومنتجات ملكية جديدة.. سنعود لخدمتكم قريباً بإذن الله.";
    public string ExpectedReturn { get; set; } = "قريباً جداً خلال ساعات";
    public string AnimationStyle { get; set; } = "royal-gears";
    public string ContactPhone { get; set; } = "";
}

public sealed class CustomMusicTrack {
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Artist { get; set; } = "";
    public string Category { get; set; } = "custom";
    public string AudioUrl { get; set; } = "";
}

public sealed class StoreMusicSettings {
    public bool Enabled { get; set; } = false;
    public int Volume { get; set; } = 45;
    public string ActiveCategory { get; set; } = "hafez";
    public string ActiveTrackId { get; set; } = "hf_ayyam";
    public string ToneType { get; set; } = "flute-warm";
    public bool LoopAll { get; set; } = true;
    public List<string> EnabledPages { get; set; } = ["all", "login", "home", "cart", "orders", "favorites", "account", "jobs"];
    public List<CustomMusicTrack> CustomTracks { get; set; } = [];
}

public sealed class AdMotionSettings {
    public bool Enabled { get; set; } = true;
    public string Direction { get; set; } = "right-to-left";
    public bool Enable3D { get; set; } = true;
    public int SpeedSeconds { get; set; } = 5;
    public int HeightPx { get; set; } = 240;
    public int WidthPercent { get; set; } = 100;
    public bool AllowTouchSwipe { get; set; } = true;
    public bool ShowArrows { get; set; } = true;
    public bool ShowDots { get; set; } = true;
    public List<string> TargetPages { get; set; } = ["login", "home", "products", "cart", "orders", "favorites"];
}

public sealed class FloatingShapesSettings {
    public bool Enabled { get; set; } = false;
    public string ShapeType { get; set; } = "bubbles";
    public int OpacityPercent { get; set; } = 65;
    public int SizePx { get; set; } = 22;
    public int Quantity { get; set; } = 20;
    public string Speed { get; set; } = "normal";
    public List<string> TargetPages { get; set; } = ["all", "home", "login"];
    public string TargetUserId { get; set; } = "all";
    public string CelebrationTitle { get; set; } = "";
    public string CelebrationMessage { get; set; } = "";
}

public sealed class JobPortalSettings {
    public bool ShowJobAd { get; set; } = true;
    public string PortalTitle { get; set; } = "💼 بوابة التوظيف والتقديم على وظائف المتجر";
    public string PortalSubtitle { get; set; } = "انضم إلى طاقم عمل المتجر — قدّم بياناتك وأرفق الصورة وفيديو التحقق من الوجه";
    public string JobDepartment { get; set; } = "الإشراف، خدمة العملاء، المبيعات، والتوصيل السريع";
    public string JobSalary { get; set; } = "راتب ثابت + عمولات وحوافز فورية";
    public string JobType { get; set; } = "دوام كامل / مرن عن بُعد وميداني";
    public bool RequirePhoto { get; set; } = true;
    public bool RequireFaceVideo { get; set; } = true;
    public List<RegistrationField> CustomFields { get; set; } = [];
}

public static class JobPortalHelper {
    public static JobPortalSettings EnsureDefaults(Data d) {
        d.JobPortal ??= new JobPortalSettings();
        if (d.JobPortal.CustomFields == null || d.JobPortal.CustomFields.Count == 0) {
            d.JobPortal.CustomFields = [
                new() { Id = "qualification", Label = "المؤهل العلمي أو التخصص", Type = "text", Required = true, Enabled = true, Placeholder = "مثال: بكالوريوس إدارة / دبلوم تقنية / ثانوية..." },
                new() { Id = "desiredRole", Label = "الوظيفة المتقدم إليها", Type = "select", Required = true, Enabled = true, Options = ["مشرف مبيعات ومتابعة", "موظف/موظفة دعم فني وخدمة عملاء", "مندوب توصيل", "مسؤول تسويق وإعلانات", "مدخل بيانات ومحاسبة"] },
                new() { Id = "yearsExp", Label = "عدد سنوات الخبرة", Type = "text", Required = false, Enabled = true, Placeholder = "مثال: سنتان أو بدون خبرة سابقة" }
            ];
        }
        return d.JobPortal;
    }
}

public sealed class JobApplicationEntry {
    public string Id { get; set; } = "";
    public string BannerId { get; set; } = "job";
    public string JobTitle { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string City { get; set; } = "";
    public string Notes { get; set; } = "";
    public string PhotoData { get; set; } = "";
    public string FaceVideoData { get; set; } = "";
    public Dictionary<string, string> ExtraFields { get; set; } = [];
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class UserChatPermissionConfig {
    public bool DirectChatEnabled { get; set; } = false;
    public bool AllowChatWithAdmin { get; set; } = true;
    public bool AllowVoiceCalls { get; set; } = true;
    public bool AllowVideoCalls { get; set; } = true;
    public bool AllowText { get; set; } = true;
    public bool AllowImages { get; set; } = true;
    public bool AllowVoiceNotes { get; set; } = true;
    public bool AllowDeleteOwnMessages { get; set; } = false;
    public bool AllowReplyQuote { get; set; } = true;
    public bool ShowOnlineStatus { get; set; } = true;
    public List<string> AllowedPeerIds { get; set; } = [];
}
