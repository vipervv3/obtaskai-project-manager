@echo off
echo 🔧 Fixing Android SDK Issues
echo ============================
echo.

cd /d "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android"

echo Step 1: Accepting all Android licenses...
echo y | "%USERPROFILE%\AppData\Local\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" --licenses

echo.
echo Step 2: Installing required SDK components...
"%USERPROFILE%\AppData\Local\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools" "platforms;android-33" "build-tools;33.0.0"

echo.
echo Step 3: Cleaning previous build...
call gradlew.bat clean

echo.
echo Step 4: Trying build again...
call gradlew.bat assembleDebug

echo.
pause