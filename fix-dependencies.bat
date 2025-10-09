@echo off
echo Fixing dependencies for Supabase migration...

echo.
echo Installing Supabase...
npm install @supabase/supabase-js

echo.
echo Removing Firebase dependencies...
npm uninstall firebase @react-native-firebase/app

echo.
echo Clearing npm cache...
npm cache clean --force

echo.
echo Dependencies fixed!
echo You can now run: npm start
pause