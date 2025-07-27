@echo off
echo 🔨 Building ObtaskAI Android APK (Verbose Mode)
echo ==============================================
echo.

cd /d "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android"

echo Running build with detailed error information...
echo.

call gradlew.bat assembleDebug --stacktrace

echo.
echo ========================================
echo Build completed. Check errors above.
echo ========================================
echo.
pause