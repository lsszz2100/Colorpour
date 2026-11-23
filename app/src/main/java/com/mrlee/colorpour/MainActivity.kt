package com.mrlee.colorpour

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

/**
 * Color Pour: 볼 정렬 퍼즐
 *
 * - 게임 본체는 assets/ 안의 오프라인 HTML5(Canvas) 게임이며 https://appassets.androidplatform.net
 *   (WebViewAssetLoader)로만 로드한다. 파일 접근/외부 탐색은 차단한다.
 * - 광고는 AdMob 배너(하단 고정)·전면(레벨 전환 시)·보상형(되돌리기/힌트/튜브 추가)만 사용하며,
 *   광고 초기화 전에 Google UMP 동의 흐름을 거친다.
 */
class MainActivity : ComponentActivity() {

    companion object {
        // AdMob 광고 단위 ID (앱 ID는 AndroidManifest 의 meta-data)
        private const val AD_UNIT_BANNER = "ca-app-pub-8038365558937817/4696401169"
        private const val AD_UNIT_INTERSTITIAL = "ca-app-pub-8038365558937817/1657680992"
        private const val AD_UNIT_REWARDED = "ca-app-pub-8038365558937817/4615016822"

        // 전면 광고 최소 간격 (정책: 과도한 노출 금지)
        private const val INTERSTITIAL_MIN_INTERVAL_MS = 45_000L
        private const val BG_COLOR = 0xFF0B0A1F.toInt()
        private const val REWARD_HINT = "hint"
        private const val REWARD_UNDO = "undo"
        private const val REWARD_TUBE = "tube"

        private const val APP_ASSETS_HOST = "appassets.androidplatform.net"
        private const val PRIVACY_URL = "https://lsszz2100.github.io/colorpour-privacy/"
    }

    private lateinit var webView: WebView
    private lateinit var adContainer: FrameLayout
    private var bannerAd: AdView? = null

    private lateinit var consentInformation: ConsentInformation
    private var adsInitialised = false

    @Volatile
    private var interstitialAd: InterstitialAd? = null

    @Volatile
    private var rewardedAd: RewardedAd? = null

    @Volatile
    private var interstitialLoading = false

    @Volatile
    private var rewardedLoading = false

    @Volatile
    private var lastInterstitialShownAt = 0L

    @Volatile
    private var rewardKind: String = REWARD_HINT

    @Volatile
    private var rewardEarned = false

    private var recoveringRenderer = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(BG_COLOR)
        }
        val webContainer = FrameLayout(this).apply { setBackgroundColor(BG_COLOR) }
        adContainer = FrameLayout(this).apply { setBackgroundColor(BG_COLOR) }

        root.addView(
            webContainer,
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f)
        )
        root.addView(
            adContainer,
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        )
        setContentView(root)

        applyWindowInsets(webContainer, adContainer)

        webView = WebView(this).apply {
            setBackgroundColor(BG_COLOR)
            overScrollMode = WebView.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
        }
        webContainer.addView(
            webView,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        )
        configureWebView()

        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        } else {
            WebView.setWebContentsDebuggingEnabled(false)
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("window.onAndroidBack ? window.onAndroidBack() : false") { result ->
                    if (result == null || result == "false" || result == "null") {
                        moveTaskToBack(true)
                    }
                }
            }
        })

        requestConsentThenLoadAds()
    }

    // ---------------------------------------------------------------- 동의(UMP)

    /**
     * Google UMP 동의 흐름. EEA/영국 등 동의가 필요한 지역에서만 양식이 뜨고,
     * 그 밖의 지역에서는 곧바로 광고를 초기화한다. 동의를 거부해도 앱은 그대로
     * 동작하며 개인화 광고만 사용하지 않는다.
     */
    private fun requestConsentThenLoadAds() {
        consentInformation = UserMessagingPlatform.getConsentInformation(this)
        val params = ConsentRequestParameters.Builder()
            .setTagForUnderAgeOfConsent(false)
            .build()
        consentInformation.requestConsentInfoUpdate(
            this,
            params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(this) {
                    if (consentInformation.canRequestAds()) startAds()
                }
            },
            {
                // 정보 갱신 실패: 허용된 경우에만 광고를 시작한다.
                if (consentInformation.canRequestAds()) startAds()
            }
        )
    }

    private fun startAds() {
        if (adsInitialised) return
        adsInitialised = true
        initAds()
    }

    private fun applyWindowInsets(web: FrameLayout, ad: FrameLayout) {
        ViewCompat.setOnApplyWindowInsetsListener(web) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            v.setPadding(bars.left, bars.top, bars.right, 0)
            insets
        }
        ViewCompat.setOnApplyWindowInsetsListener(ad) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(bars.left, 0, bars.right, bars.bottom)
            insets
        }
        WindowCompatSetDecorFits()
    }

    private fun WindowCompatSetDecorFits() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
    }

    private fun configureWebView() {
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = false
            allowFileAccess = false
            allowContentAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            setGeolocationEnabled(false)
            setSupportMultipleWindows(false)
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            saveFormData = false
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = "$userAgentString ColorPour/1.1"
        }

        webView.webViewClient = object : WebViewClient() {
            // 앱 자산(appassets) 외의 요청은 네트워크로 나가지 않도록 차단한다.
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                val url = request.url
                val scheme = url.scheme ?: ""
                if (scheme == "https" || scheme == "http") {
                    if (url.host != APP_ASSETS_HOST) {
                        return WebResourceResponse(
                            "text/plain", "utf-8", 403, "Forbidden",
                            mapOf("Cache-Control" to "no-store"), null
                        )
                    }
                    return assetLoader.shouldInterceptRequest(url)
                }
                return null
            }

            // 앱 자산 외의 페이지로는 이동하지 않는다 (외부 링크/리다이렉트 차단)
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean = true

            // 렌더러가 죽어도 앱이 함께 죽지 않도록 화면을 다시 만든다.
            override fun onRenderProcessGone(
                view: WebView?,
                detail: RenderProcessGoneDetail?
            ): Boolean {
                if (recoveringRenderer) {
                    finish()
                    return true
                }
                recoveringRenderer = true
                view?.destroy()
                recreate()
                return true
            }
        }

        webView.addJavascriptInterface(Bridge(), "AndroidHost")
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    // ---------------------------------------------------------------- 광고

    private fun initAds() {
        MobileAds.initialize(this) {
            runOnUiThread {
                loadBanner()
                loadInterstitial()
                loadRewarded()
            }
        }
    }

    private fun loadBanner() {
        if (bannerAd != null) return
        val adView = AdView(this)
        adView.setAdSize(AdSize.BANNER)
        adView.adUnitId = AD_UNIT_BANNER
        adView.loadAd(AdRequest.Builder().build())
        adContainer.addView(adView)
        bannerAd = adView
    }

    private fun loadInterstitial() {
        if (interstitialAd != null || interstitialLoading) return
        interstitialLoading = true
        InterstitialAd.load(
            this,
            AD_UNIT_INTERSTITIAL,
            AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialLoading = false
                    interstitialAd = ad
                    ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                        override fun onAdDismissedFullScreenContent() {
                            interstitialAd = null
                            loadInterstitial()
                            notifyJs("window.onInterstitialClosed && window.onInterstitialClosed();")
                        }

                        override fun onAdFailedToShowFullScreenContent(error: AdError) {
                            interstitialAd = null
                            loadInterstitial()
                            notifyJs("window.onInterstitialClosed && window.onInterstitialClosed();")
                        }
                    }
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitialLoading = false
                    interstitialAd = null
                }
            }
        )
    }

    private fun loadRewarded() {
        if (rewardedAd != null || rewardedLoading) return
        rewardedLoading = true
        RewardedAd.load(
            this,
            AD_UNIT_REWARDED,
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    rewardedLoading = false
                    rewardedAd = ad
                    ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                        override fun onAdDismissedFullScreenContent() {
                            rewardedAd = null
                            loadRewarded()
                            if (rewardEarned) {
                                notifyJs("window.onRewardedEarned && window.onRewardedEarned();")
                            } else {
                                notifyJs("window.onRewardedFailed && window.onRewardedFailed();")
                            }
                            rewardEarned = false
                        }

                        override fun onAdFailedToShowFullScreenContent(error: AdError) {
                            rewardedAd = null
                            rewardEarned = false
                            loadRewarded()
                            notifyJs("window.onRewardedFailed && window.onRewardedFailed();")
                        }
                    }
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    rewardedLoading = false
                    rewardedAd = null
                }
            }
        )
    }

    private fun notifyJs(script: String) {
        runOnUiThread {
            if (!isFinishing && ::webView.isInitialized) {
                webView.evaluateJavascript(script, null)
            }
        }
    }

    // ---------------------------------------------------------------- JS 브리지

    inner class Bridge {

        /** 레벨 전환 시 전면 광고. 표시되면 true(닫힐 때 onInterstitialClosed 콜백). */
        @JavascriptInterface
        fun tryShowInterstitial(): Boolean {
            val ad = interstitialAd ?: return false
            val now = System.currentTimeMillis()
            if (now - lastInterstitialShownAt < INTERSTITIAL_MIN_INTERVAL_MS) return false
            lastInterstitialShownAt = now
            interstitialAd = null
            runOnUiThread {
                if (!isFinishing && !isDestroyed) {
                    ad.show(this@MainActivity)
                } else {
                    notifyJs("window.onInterstitialClosed && window.onInterstitialClosed();")
                }
            }
            return true
        }

        /** 보상형 광고 표시. kind 는 hint / undo / tube 만 허용. */
        @JavascriptInterface
        fun tryShowRewarded(kind: String?): Boolean {
            if (kind != REWARD_HINT && kind != REWARD_UNDO && kind != REWARD_TUBE) return false
            val ad = rewardedAd ?: return false
            rewardedAd = null
            rewardKind = kind
            rewardEarned = false
            runOnUiThread {
                if (isFinishing || isDestroyed) {
                    notifyJs("window.onRewardedFailed && window.onRewardedFailed();")
                    return@runOnUiThread
                }
                ad.show(this@MainActivity) {
                    rewardEarned = true
                }
            }
            return true
        }

        /** 짧은 진동. 허용 범위 밖 값은 무시한다. */
        @JavascriptInterface
        fun vibrate(ms: Int) {
            if (ms <= 0 || ms > 200) return
            val vibrator = getSystemService(VIBRATOR_SERVICE) as? android.os.Vibrator ?: return
            if (!vibrator.hasVibrator()) return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(android.os.VibrationEffect.createOneShot(ms.toLong(), 80))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(ms.toLong())
            }
        }

        /** 광고 동의를 다시 설정하는 UMP 양식을 연다. */
        @JavascriptInterface
        fun showPrivacyOptions(): Boolean {
            if (!::consentInformation.isInitialized) return false
            runOnUiThread {
                UserMessagingPlatform.showPrivacyOptionsForm(this@MainActivity) { }
            }
            return true
        }

        /** 이 지역/설정에서 동의 재설정 항목이 필요한지. */
        @JavascriptInterface
        fun isPrivacyOptionsRequired(): Boolean {
            if (!::consentInformation.isInitialized) return false
            return consentInformation.privacyOptionsRequirementStatus ==
                ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
        }

        /** 개인정보처리방침 페이지를 기본 브라우저로 연다. */
        @JavascriptInterface
        fun openPrivacyPolicy() {
            runOnUiThread {
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_URL)))
                } catch (e: ActivityNotFoundException) {
                    // 브라우저가 없는 기기: 조용히 무시
                }
            }
        }

        @JavascriptInterface
        fun exitApp() {
            runOnUiThread { finish() }
        }
    }

    // ---------------------------------------------------------------- 생명주기

    override fun onPause() {
        webView.onPause()
        bannerAd?.pause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        bannerAd?.resume()
    }

    override fun onDestroy() {
        bannerAd?.destroy()
        bannerAd = null
        adContainer.removeAllViews()
        webView.loadUrl("about:blank")
        webView.removeJavascriptInterface("AndroidHost")
        webView.destroy()
        super.onDestroy()
    }
}
