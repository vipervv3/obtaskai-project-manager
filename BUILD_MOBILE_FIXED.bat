@echo off
echo 📱 Building Fixed Mobile APK for ObtaskAI
echo ==========================================
echo.
echo Server IP: 192.168.1.185:5000
echo.

echo [1/4] Building React app...
cd "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client"
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: React build failed
    pause
    exit /b 1
)

echo.
echo [2/4] Syncing to Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed
    pause
    exit /b 1
)

echo.
echo [3/4] Building APK...
cd android
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo ERROR: APK build failed
    pause
    exit /b 1
)

echo.
echo [4/4] Copying APK to Desktop...
copy "app\release\app-release.apk" "%USERPROFILE%\Desktop\ObtaskAI-Fixed.apk"

echo.
echo ====================================
echo ✅ SUCCESS! 
echo ====================================
echo.
echo APK Location: %USERPROFILE%\Desktop\ObtaskAI-Fixed.apk
echo Server IP: 192.168.1.185:5000
echo.
echo Make sure your server is running:
echo cd server && npm start
echo.
echo Then install the APK on your phone!
echo.
pause