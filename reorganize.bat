@echo off
REM Folder Reorganization Script for iYaya
REM Run this from the project root directory

echo ========================================
echo iYaya Folder Reorganization
echo ========================================
echo.

REM Step 1: Create new folder structure
echo [1/7] Creating folder structure...
mkdir docs\guides 2>nul
mkdir docs\reference 2>nul
mkdir docs\quick-start 2>nul
mkdir docs\deployment 2>nul
mkdir database\migrations 2>nul
mkdir database\scripts 2>nul
mkdir scripts\test 2>nul
mkdir scripts\setup 2>nul
mkdir scripts\server 2>nul
mkdir scripts\utils 2>nul
echo Done!
echo.

REM Step 2: Move documentation
echo [2/7] Moving documentation files...
move START_HERE.txt docs\quick-start\ 2>nul
move QUICK_START.txt docs\quick-start\ 2>nul
move ACTION_NOW.md docs\quick-start\ 2>nul
move README_IMMEDIATE_TASKS.md docs\quick-start\ 2>nul
move MIGRATION_GUIDE.md docs\guides\ 2>nul
move IMMEDIATE_CHECKLIST.md docs\guides\ 2>nul
move CONTRACT_WALLET_PAYMENT_FLOW.md docs\guides\ 2>nul
move ROLE_MAPPING_FIX_SUMMARY.md docs\reference\ 2>nul
move FLOW_DIAGRAM.md docs\reference\ 2>nul
move INDEX.md docs\reference\ 2>nul
move DEPLOY_SOLANA_ENDPOINT.md docs\deployment\ 2>nul
move WALLET_SETUP_FIX.md docs\deployment\ 2>nul
echo Done!
echo.

REM Step 3: Move database files
echo [3/7] Moving database files...
xcopy migrations database\migrations\ /E /I /Y 2>nul
rmdir /s /q migrations 2>nul
move check-auth-schema.sql database\scripts\ 2>nul
move check-database-health.sql database\scripts\ 2>nul
move check-handle-new-user-function.sql database\scripts\ 2>nul
move create-missing-user-profiles.sql database\scripts\ 2>nul
move fix_rls_policies.sql database\scripts\ 2>nul
move fix-auth-trigger.sql database\scripts\ 2>nul
move fix-database-triggers.sql database\scripts\ 2>nul
move fix-users-rls-policies.sql database\scripts\ 2>nul
move recreate-handle-new-user-function.sql database\scripts\ 2>nul
echo Done!
echo.

REM Step 4: Move test files
echo [4/7] Moving test files...
move test-auth.js scripts\test\ 2>nul
move test-login-vs-signup.js scripts\test\ 2>nul
move test-payment-flow.ts scripts\test\ 2>nul
move test-points.ts scripts\test\ 2>nul
move test-profile-creation.js scripts\test\ 2>nul
move test-realistic-signup.js scripts\test\ 2>nul
move test-role-specific-signup.js scripts\test\ 2>nul
move test-solana-deployed.js scripts\test\ 2>nul
move test-supabase-direct.js scripts\test\ 2>nul
move test-wallet-save.js scripts\test\ 2>nul
echo Done!
echo.

REM Step 5: Move server/setup scripts
echo [5/7] Moving server and setup scripts...
move serve-app.js scripts\server\ 2>nul
move server-simple.js scripts\server\ 2>nul
move minimal-payment-endpoint.js scripts\server\ 2>nul
move solana-payment-endpoint.js scripts\server\ 2>nul
move solana-endpoint-for-production.js scripts\server\ 2>nul
move install-solana.sh scripts\setup\ 2>nul
move run-migration.js scripts\setup\ 2>nul
echo Done!
echo.

REM Step 6: Move utility scripts
echo [6/7] Moving utility scripts...
move check-triggers.js scripts\utils\ 2>nul
move check-users-table.js scripts\utils\ 2>nul
move diagnose-signup-issue.js scripts\utils\ 2>nul
move create-users-table.js scripts\utils\ 2>nul
echo Done!
echo.

REM Step 7: Clean up old files
echo [7/7] Cleaning up...
del app.json.backup 2>nul
del build.log 2>nul
del test-scripts.json 2>nul
del rn-dependencies.json 2>nul
echo Done!
echo.
echo WARNING: Root folders (components/, screens/, etc.) were NOT deleted
echo They contain working code and should stay!
echo.

echo ========================================
echo Reorganization Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Review the new folder structure
echo 2. Update any hardcoded paths in your code
echo 3. Test the application
echo 4. Commit changes to git
echo.
echo See REORGANIZATION_PLAN.md for details
echo.
pause
