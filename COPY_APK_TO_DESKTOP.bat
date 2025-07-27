@echo off
echo 📁 Copying APK to Desktop
echo =========================
echo.

echo Source: client\android\app\release\app-release.apk
echo Destination: Desktop\ObtaskAI-Ready.apk
echo.

copy "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android\app\release\app-release.apk" "C:\Users\viper\Desktop\ObtaskAI-Ready.apk"

if exist "C:\Users\viper\Desktop\ObtaskAI-Ready.apk" (
    echo ✅ SUCCESS! APK copied to Desktop
    echo.
    echo File: ObtaskAI-Ready.apk
    echo Location: C:\Users\viper\Desktop\
    echo.
    echo Ready to install on your phone!
) else (
    echo ❌ Copy failed. APK location:
    echo C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android\app\release\app-release.apk
)

echo.
pause