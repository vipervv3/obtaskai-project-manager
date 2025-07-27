@echo off
echo 🚀 Starting ObtaskAI Server for Mobile Testing
echo =====================================
echo.
echo Your IP Address: 192.168.1.185
echo Server will be available at: http://192.168.1.185:5000
echo.
echo Make sure:
echo ✅ Your phone is on the same WiFi network
echo ✅ Windows Firewall allows port 5000
echo ✅ OpenAI API rate limits have reset
echo.

cd "C:\Users\viper\OneDrive\Desktop\Claude\obtaskai\server"

echo Starting server...
npm run dev

pause