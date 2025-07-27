@echo off
echo 🔧 Fixing Gradle Issues
echo =======================
echo.

cd "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\client\android"

echo Cleaning previous builds...
if exist ".gradle" rmdir /s /q ".gradle"
if exist "app\build" rmdir /s /q "app\build"
if exist "build" rmdir /s /q "build"

echo.
echo Downloading dependencies (may take time)...
gradlew.bat clean

echo.
echo Starting fresh build...
gradlew.bat assembleDebug

pause