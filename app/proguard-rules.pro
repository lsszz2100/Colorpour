# WebView JS 브리지 메서드는 난독화에서 제외 (이름으로 호출됨)
-keepclassmembers class com.mrlee.colorpour.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# AdMob / Google Mobile Ads
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# Kotlin 메타데이터 유지
-keepattributes *Annotation*, InnerClasses, Signature
