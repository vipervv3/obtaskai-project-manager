@echo off
echo 🔨 Building ObtaskAI Android APK
echo ================================
echo.

cd "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android"

echo Checking Java version...
java -version
echo.

echo Starting Gradle build...
echo This may take 5-15 minutes on first build...
echo.

gradlew.bat assembleDebug

echo.
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo ✅ SUCCESS! APK built successfully!
    echo.
    echo APK Location: app\build\outputs\apk\debug\app-debug.apk
    echo File Size: 
    dir "app\build\outputs\apk\debug\app-debug.apk"
    echo.
    echo Ready to install on your phone! 📱
) else (
    echo ❌ Build failed. Check errors above.
)

echo.
pause