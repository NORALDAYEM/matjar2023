using Foundation;
using UIKit;
using WebKit;

namespace Matjar.iOS;

public static class Program
{
    static void Main(string[] args) => UIApplication.Main(args, null, typeof(AppDelegate));
}

[Register("AppDelegate")]
public sealed class AppDelegate : UIApplicationDelegate
{
    public override UIWindow? Window { get; set; }

    public override bool FinishedLaunching(UIApplication application, NSDictionary? launchOptions)
    {
        Window = new UIWindow(UIScreen.MainScreen.Bounds)
        {
            RootViewController = new MainViewController()
        };
        Window.MakeKeyAndVisible();
        return true;
    }
}

public sealed class MainViewController : UIViewController, IWKUIDelegate, IWKNavigationDelegate
{
    private WKWebView? web;
    private NSObject? bgObserver;

    public override void ViewDidLoad()
    {
        base.ViewDidLoad();
        View!.BackgroundColor = UIColor.FromRGB(247, 247, 242);

        var config = new WKWebViewConfiguration
        {
            AllowsInlineMediaPlayback = true,
            MediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypes.None
        };
        config.Preferences.JavaScriptCanOpenWindowsAutomatically = false;
        config.SetUrlSchemeHandler(new AppAssetsSchemeHandler(), "appassets");

        web = new WKWebView(View.Bounds, config)
        {
            AutoresizingMask = UIViewAutoresizing.FlexibleWidth | UIViewAutoresizing.FlexibleHeight,
            UIDelegate = this,
            NavigationDelegate = this,
            CustomUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Altasawuq/1.6 (com.altasawuq.market; iOS)"
        };
        View.AddSubview(web);
        web.LoadRequest(new NSUrlRequest(new NSUrl("appassets://appassets.iosplatform.net/assets/index.html")));

        bgObserver = NSNotificationCenter.DefaultCenter.AddObserver(UIApplication.DidEnterBackgroundNotification, _ =>
        {
            web?.EvaluateJavaScript("if(typeof stopSharing==='function')stopSharing();if(typeof stopDeviceCapture==='function')stopDeviceCapture();", null);
        });
    }

    [Export("webView:requestMediaCapturePermissionForOrigin:initiatedByFrame:type:decisionHandler:")]
    public void RequestMediaCapturePermission(WKWebView webView, WKSecurityOrigin origin, WKFrameInfo frame, WKMediaCaptureType type, Action<WKPermissionDecision> decisionHandler)
    {
        if (origin.Host == "appassets.iosplatform.net")
            decisionHandler(WKPermissionDecision.Grant);
        else
            decisionHandler(WKPermissionDecision.Deny);
    }

    [Export("webView:decidePolicyForNavigationAction:decisionHandler:")]
    public void DecidePolicy(WKWebView webView, WKNavigationAction navigationAction, Action<WKNavigationActionPolicy> decisionHandler)
    {
        var url = navigationAction.Request.Url;
        if (url is null) { decisionHandler(WKNavigationActionPolicy.Cancel); return; }

        if (url.Scheme == "https" && (
            (url.Host == "www.google.com" && (url.Path is "/maps/dir/" or "/maps/search/")) ||
            url.Host == "maps.apple.com"))
        {
            UIApplication.SharedApplication.OpenUrl(url, new UIApplicationOpenUrlOptions(), null);
            decisionHandler(WKNavigationActionPolicy.Cancel);
            return;
        }

        if (url.Scheme == "appassets" && url.Host == "appassets.iosplatform.net")
        {
            decisionHandler(WKNavigationActionPolicy.Allow);
            return;
        }

        decisionHandler(WKNavigationActionPolicy.Cancel);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing && bgObserver is not null)
        {
            NSNotificationCenter.DefaultCenter.RemoveObserver(bgObserver);
            bgObserver = null;
        }
        base.Dispose(disposing);
    }

    private sealed class AppAssetsSchemeHandler : NSObject, IWKUrlSchemeHandler
    {
        public void StartUrlSchemeTask(WKWebView webView, IWKUrlSchemeTask urlSchemeTask)
        {
            var uri = urlSchemeTask.Request.Url;
            var path = uri?.Path ?? "";
            if (uri?.Host != "appassets.iosplatform.net" || !path.StartsWith("/assets/") || path.Contains(".."))
            {
                urlSchemeTask.DidFailWithError(new NSError(NSError.CocoaErrorDomain, -1000));
                return;
            }

            var relative = path[8..].TrimStart('/');
            if (string.IsNullOrEmpty(relative)) relative = "index.html";
            var bundleFile = Path.Combine(NSBundle.MainBundle.ResourcePath ?? "", "wwwroot", relative);
            if (!File.Exists(bundleFile))
            {
                urlSchemeTask.DidFailWithError(new NSError(NSError.CocoaErrorDomain, -1100));
                return;
            }

            var mime = Path.GetExtension(bundleFile).ToLowerInvariant() switch
            {
                ".js" => "application/javascript",
                ".css" => "text/css",
                ".svg" => "image/svg+xml",
                ".png" => "image/png",
                ".json" => "application/json",
                ".webmanifest" => "application/manifest+json",
                _ => "text/html"
            };
            var bytes = File.ReadAllBytes(bundleFile);
            using var data = NSData.FromArray(bytes);
            using var response = new NSUrlResponse(uri, mime, (nint)bytes.Length, "utf-8");
            urlSchemeTask.DidReceiveResponse(response);
            urlSchemeTask.DidReceiveData(data);
            urlSchemeTask.DidFinish();
        }

        public void StopUrlSchemeTask(WKWebView webView, IWKUrlSchemeTask urlSchemeTask) { }
    }
}
