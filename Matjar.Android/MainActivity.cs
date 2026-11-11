using Android.App;
using Android.OS;
using Android.Webkit;
using Android.Content;

namespace Matjar.Android;

[Activity(Label = "التسوق", MainLauncher = true, Exported = true, Theme = "@style/AppTheme", ConfigurationChanges = global::Android.Content.PM.ConfigChanges.Orientation | global::Android.Content.PM.ConfigChanges.ScreenSize)]
public sealed class MainActivity : Activity
{
    private WebView? web;
    private GeolocationPermissions.ICallback? geoCallback;
    private string? geoOrigin;
    private PermissionRequest? mediaRequest;
    private IValueCallback? fileCallback;
    private bool fileAllowsPdf;
    protected override void OnCreate(Bundle? savedInstanceState)
    {
        base.OnCreate(savedInstanceState);
        web = new WebView(this);
        web.Settings.JavaScriptEnabled = true;
        web.Settings.DomStorageEnabled = true;
        web.Settings.AllowFileAccess = false;
        web.Settings.AllowContentAccess = true;
        web.Settings.MixedContentMode = MixedContentHandling.NeverAllow;
        web.Settings.SetGeolocationEnabled(true);
        web.Settings.UserAgentString += " Altasawuq/1.6 (com.altasawuq.market; Android)";
        web.SetWebChromeClient(new LocationChrome(this));
        web.SetWebViewClient(new SafeClient());
        SetContentView(web);
        web.LoadUrl("https://appassets.androidplatform.net/assets/index.html");
        var prefs=GetSharedPreferences("device-permissions",FileCreationMode.Private)!;
        if(!prefs.GetBoolean("intro-shown",false))new AlertDialog.Builder(this)!
            .SetTitle("تهيئة أذونات التسوق")!
            .SetMessage("الكاميرا لصور الدردشة، والمايك لتسجيل رسالة صوتية، والموقع للتوصيل وخرائط Google. لا يبدأ تصوير أو تسجيل تلقائيًا. يمكنك رفض أي إذن والمتابعة.")!
            .SetPositiveButton("طلب الأذونات",(_,_)=>{prefs.Edit()!.PutBoolean("intro-shown",true)!.Apply();RequestPermissions([global::Android.Manifest.Permission.Camera,global::Android.Manifest.Permission.RecordAudio,global::Android.Manifest.Permission.AccessFineLocation,global::Android.Manifest.Permission.AccessCoarseLocation],2403);})!
            .SetNegativeButton("لاحقًا",(_,_)=>prefs.Edit()!.PutBoolean("intro-shown",true)!.Apply())!.Show();
    }
    protected override void OnPause() { web?.EvaluateJavascript("if(typeof stopSharing==='function')stopSharing();if(typeof stopDeviceCapture==='function')stopDeviceCapture();", null); base.OnPause(); }
    public override void OnBackPressed()
    {
        if (web is not null)
        {
            web.EvaluateJavascript("(function(){const m=document.getElementById('modal');if(m&&m.open){m.close();return 'modal';}if(typeof page!=='undefined'&&page!=='home'&&typeof user!=='undefined'&&user){page='home';render();return 'home';}return 'exit';})()", new BackCallback(this));
            return;
        }
        base.OnBackPressed();
    }
    private void PerformDefaultBack() => base.OnBackPressed();
    private sealed class BackCallback(MainActivity activity) : Java.Lang.Object, IValueCallback
    {
        public void OnReceiveValue(Java.Lang.Object? value)
        {
            if (value?.ToString()?.Trim('"') == "exit") activity.RunOnUiThread(activity.PerformDefaultBack);
        }
    }
    private void RequestMedia(PermissionRequest request)
    {
        if(request.Origin?.ToString()?.TrimEnd('/')!="https://appassets.androidplatform.net"){request.Deny();return;}
        mediaRequest?.Deny();mediaRequest=request;
        var permissions=new List<string>();
        foreach(var resource in request.GetResources()??[]){var permission=resource switch {"android.webkit.resource.AUDIO_CAPTURE"=>global::Android.Manifest.Permission.RecordAudio,"android.webkit.resource.VIDEO_CAPTURE"=>global::Android.Manifest.Permission.Camera,_=>null};if(permission is not null && CheckSelfPermission(permission)!=global::Android.Content.PM.Permission.Granted)permissions.Add(permission);}
        if(permissions.Count>0)RequestPermissions(permissions.Distinct().ToArray(),2402);else CompleteMedia();
    }
    private void CompleteMedia()
    {
        var request=mediaRequest;mediaRequest=null;if(request is null)return;
        var allowed=(request.GetResources()??[]).Where(resource=>resource switch {"android.webkit.resource.AUDIO_CAPTURE"=>CheckSelfPermission(global::Android.Manifest.Permission.RecordAudio)==global::Android.Content.PM.Permission.Granted,"android.webkit.resource.VIDEO_CAPTURE"=>CheckSelfPermission(global::Android.Manifest.Permission.Camera)==global::Android.Content.PM.Permission.Granted,_=>false}).ToArray();
        if(allowed.Length>0)request.Grant(allowed);else request.Deny();
    }
    private void RequestLocation(string origin, GeolocationPermissions.ICallback callback)
    {
        if(origin.TrimEnd('/')!="https://appassets.androidplatform.net"){callback.Invoke(origin,false,false);return;}
        if(CheckSelfPermission(global::Android.Manifest.Permission.AccessCoarseLocation)==global::Android.Content.PM.Permission.Granted || CheckSelfPermission(global::Android.Manifest.Permission.AccessFineLocation)==global::Android.Content.PM.Permission.Granted){callback.Invoke(origin,true,false);return;}
        geoCallback?.Invoke(geoOrigin!,false,false);geoCallback=callback;geoOrigin=origin;
        RequestPermissions([global::Android.Manifest.Permission.AccessFineLocation,global::Android.Manifest.Permission.AccessCoarseLocation],2401);
    }
    public override void OnRequestPermissionsResult(int requestCode,string[] permissions,global::Android.Content.PM.Permission[] grantResults)
    {
        base.OnRequestPermissionsResult(requestCode,permissions,grantResults);
        if(requestCode==2401){geoCallback?.Invoke(geoOrigin!,grantResults.Any(x=>x==global::Android.Content.PM.Permission.Granted),false);geoCallback=null;geoOrigin=null;}
        if(requestCode==2402)CompleteMedia();
    }
    protected override void OnActivityResult(int requestCode,Result resultCode,Intent? data)
    {
        base.OnActivityResult(requestCode,resultCode,data);if(requestCode!=2404)return;
        var callback=fileCallback;fileCallback=null;var uri=resultCode==Result.Ok?data?.Data:null;
        var mime=uri is not null?ContentResolver?.GetType(uri):null;
        if(uri is not null&&(mime?.StartsWith("image/")==true||fileAllowsPdf&&mime=="application/pdf"))callback?.OnReceiveValue(new global::Android.Net.Uri[]{uri});else callback?.OnReceiveValue(null);
    }
    private sealed class LocationChrome(MainActivity activity):WebChromeClient
    {
        public override void OnGeolocationPermissionsShowPrompt(string? origin,GeolocationPermissions.ICallback? callback)
        {if(origin is not null && callback is not null)activity.RequestLocation(origin,callback);}
        public override void OnPermissionRequest(PermissionRequest? request){if(request is not null)activity.RunOnUiThread(()=>activity.RequestMedia(request));}
        public override void OnPermissionRequestCanceled(PermissionRequest? request){if(activity.mediaRequest==request)activity.mediaRequest=null;}
        public override bool OnShowFileChooser(WebView? webView,IValueCallback? filePathCallback,FileChooserParams? fileChooserParams)
        {
            if(webView?.Url?.StartsWith("https://appassets.androidplatform.net/")!=true || filePathCallback is null)return false;
            activity.fileCallback?.OnReceiveValue(null);activity.fileCallback=filePathCallback;
            activity.fileAllowsPdf=fileChooserParams?.GetAcceptTypes()?.Any(t=>t?.Contains("application/pdf")==true)==true;
            try {var intent=new Intent(Intent.ActionOpenDocument);intent.AddCategory(Intent.CategoryOpenable);intent.SetType(activity.fileAllowsPdf?"*/*":"image/*");if(activity.fileAllowsPdf)intent.PutExtra(Intent.ExtraMimeTypes,new[]{"image/png","image/jpeg","image/webp","application/pdf"});activity.StartActivityForResult(Intent.CreateChooser(intent,"اختر صورة أو إيصال"),2404);}catch(ActivityNotFoundException){activity.fileCallback=null;filePathCallback.OnReceiveValue(null);}return true;
        }
    }
    private sealed class SafeClient : WebViewClient
    {
        public override WebResourceResponse? ShouldInterceptRequest(WebView? view, IWebResourceRequest? request)
        {
            var uri = request?.Url;
            if (uri?.Host != "appassets.androidplatform.net") return base.ShouldInterceptRequest(view, request);
            var path = uri.Path ?? "";
            if (!path.StartsWith("/assets/") || path.Contains("..")) return new WebResourceResponse("text/plain", "utf-8", new MemoryStream());
            try
            {
                var asset = path[8..];
                var type = Path.GetExtension(asset) switch { ".js" => "application/javascript", ".css" => "text/css", ".svg" => "image/svg+xml", ".png" => "image/png", ".json" => "application/json", ".webmanifest" => "application/manifest+json", _ => "text/html" };
                return new WebResourceResponse(type, "utf-8", view!.Context!.Assets!.Open(asset));
            }
            catch { return new WebResourceResponse("text/plain", "utf-8", new MemoryStream()); }
        }
        public override bool ShouldOverrideUrlLoading(WebView? view, IWebResourceRequest? request)
        {
            if(request?.Url?.Scheme=="https" && ((request.Url.Host=="www.google.com" && request.Url.Path is "/maps/dir/" or "/maps/search/") || request.Url.Host=="maps.apple.com")){
                try {view?.Context?.StartActivity(new Intent(Intent.ActionView,request.Url));}catch(ActivityNotFoundException){}
                return true;
            }
            return request?.Url?.Host != "appassets.androidplatform.net";
        }
    }
}
