@echo off
REM Consolidate duplicate folders into src/
echo ========================================
echo Consolidating Root Folders
echo ========================================
echo.

REM Step 1: Merge components/ into src/components/
echo [1/5] Merging components/...
xcopy components\*.* src\components\ /E /I /Y 2>nul
if %errorlevel%==0 (
  echo Components merged successfully
  rmdir /s /q components 2>nul
) else (
  echo No files to merge in components/
)
echo.

REM Step 2: Merge screens/ into src/screens/
echo [2/5] Merging screens/...
xcopy screens\*.* src\screens\ /E /I /Y 2>nul
if %errorlevel%==0 (
  echo Screens merged successfully
  rmdir /s /q screens 2>nul
) else (
  echo No files to merge in screens/
)
echo.

REM Step 3: Merge services/ into src/services/
echo [3/5] Merging services/...
xcopy services\*.* src\services\ /E /I /Y 2>nul
if %errorlevel%==0 (
  echo Services merged successfully
  rmdir /s /q services 2>nul
) else (
  echo No files to merge in services/
)
echo.

REM Step 4: Merge hooks/ into src/hooks/
echo [4/5] Merging hooks/...
xcopy hooks\*.* src\hooks\ /E /I /Y 2>nul
if %errorlevel%==0 (
  echo Hooks merged successfully
  rmdir /s /q hooks 2>nul
) else (
  echo No files to merge in hooks/
)
echo.

REM Step 5: Move api/ to server/api/
echo [5/5] Moving api/ to server/api/...
if exist api\ (
  xcopy api\*.* server\api\ /E /I /Y 2>nul
  if %errorlevel%==0 (
    echo API moved to server/api/
    rmdir /s /q api 2>nul
  )
) else (
  echo No api/ folder found
)
echo.

echo ========================================
echo Consolidation Complete!
echo ========================================
echo.
echo Folders consolidated:
echo - components/ -^> src/components/
echo - screens/ -^> src/screens/
echo - services/ -^> src/services/
echo - hooks/ -^> src/hooks/
echo - api/ -^> server/api/
echo.
echo Kept separate:
echo - server/ (backend code)
echo - admin/ (admin-specific code)
echo.
pause
