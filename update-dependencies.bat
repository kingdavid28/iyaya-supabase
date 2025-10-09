@echo off
echo Installing Supabase dependencies...
npm install @supabase/supabase-js

echo Removing Firebase dependencies...
npm uninstall firebase @react-native-firebase/app

echo Dependencies updated successfully!
pause