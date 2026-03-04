# 📁 Root Folder Reorganization Plan

## 🎯 Current Issues
- Too many files in root (50+ files)
- Documentation scattered
- Test files mixed with source
- SQL files not organized
- Duplicate folders (components/, screens/ vs src/)

## ✅ Best Practice Structure

```
iyayaSupa/
├── 📄 README.md                    ← Main project README
├── 📄 package.json
├── 📄 package-lock.json
├── 📄 app.config.js
├── 📄 babel.config.js
├── 📄 metro.config.js
├── 📄 tsconfig.json
├── 📄 eas.json
├── 📄 vercel.json
├── 📄 .gitignore
├── 📄 .env.example
├── 📄 .npmrc
├── 📄 .nvmrc
├── 📄 App.js
│
├── 📁 docs/                        ← All documentation
│   ├── 📁 guides/
│   │   ├── MIGRATION_GUIDE.md
│   │   ├── IMMEDIATE_CHECKLIST.md
│   │   └── CONTRACT_WALLET_PAYMENT_FLOW.md
│   ├── 📁 reference/
│   │   ├── ROLE_MAPPING_FIX_SUMMARY.md
│   │   ├── FLOW_DIAGRAM.md
│   │   └── INDEX.md
│   ├── 📁 quick-start/
│   │   ├── START_HERE.txt
│   │   ├── QUICK_START.txt
│   │   ├── ACTION_NOW.md
│   │   └── README_IMMEDIATE_TASKS.md
│   └── 📁 deployment/
│       ├── DEPLOY_SOLANA_ENDPOINT.md
│       └── WALLET_SETUP_FIX.md
│
├── 📁 src/                         ← Application source code
│   ├── app/
│   ├── components/
│   ├── config/
│   ├── contexts/
│   ├── hooks/
│   ├── screens/
│   ├── services/
│   ├── utils/
│   └── ...
│
├── 📁 database/                    ← Database related files
│   ├── 📁 migrations/
│   │   ├── 001_initial_setup.sql
│   │   ├── 002_fix_schema.sql
│   │   ├── ...
│   │   ├── 013_cleanup_duplicate_policies.sql
│   │   ├── README.md
│   │   └── VERIFY_MIGRATIONS.sql
│   ├── 📁 scripts/
│   │   ├── check-auth-schema.sql
│   │   ├── check-database-health.sql
│   │   ├── fix_rls_policies.sql
│   │   └── create-missing-user-profiles.sql
│   └── 📁 functions/
│       └── (RPC functions if any)
│
├── 📁 supabase/                    ← Supabase config
│   ├── functions/
│   ├── migrations/
│   ├── config.toml
│   └── .gitignore
│
├── 📁 scripts/                     ← Development scripts
│   ├── 📁 test/
│   │   ├── test-auth.js
│   │   ├── test-profile-creation.js
│   │   ├── test-wallet-save.js
│   │   └── ...
│   ├── 📁 setup/
│   │   ├── install-solana.sh
│   │   └── run-migration.js
│   ├── 📁 server/
│   │   ├── serve-app.js
│   │   ├── server-simple.js
│   │   └── minimal-payment-endpoint.js
│   └── 📁 utils/
│       ├── check-triggers.js
│       ├── check-users-table.js
│       └── diagnose-signup-issue.js
│
├── 📁 tests/                       ← Test files
│   ├── __tests__/
│   ├── integration/
│   └── e2e/
│
├── 📁 assets/                      ← Static assets
│   ├── fonts/
│   ├── images/
│   └── icons/
│
├── 📁 public/                      ← Web public files
│   ├── auth/
│   ├── 404.html
│   └── fallback.html
│
├── 📁 .expo/                       ← Expo cache
├── 📁 .vercel/                     ← Vercel config
├── 📁 .backup/                     ← Backup files
├── 📁 node_modules/                ← Dependencies
└── 📁 web-build/                   ← Build output
```

## 🔄 Migration Commands

### Step 1: Create New Folders
```bash
mkdir -p docs/guides docs/reference docs/quick-start docs/deployment
mkdir -p database/migrations database/scripts database/functions
mkdir -p scripts/test scripts/setup scripts/server scripts/utils
```

### Step 2: Move Documentation
```bash
# Quick start docs
move START_HERE.txt docs/quick-start/
move QUICK_START.txt docs/quick-start/
move ACTION_NOW.md docs/quick-start/
move README_IMMEDIATE_TASKS.md docs/quick-start/

# Guides
move MIGRATION_GUIDE.md docs/guides/
move IMMEDIATE_CHECKLIST.md docs/guides/
move CONTRACT_WALLET_PAYMENT_FLOW.md docs/guides/

# Reference
move ROLE_MAPPING_FIX_SUMMARY.md docs/reference/
move FLOW_DIAGRAM.md docs/reference/
move INDEX.md docs/reference/

# Deployment
move DEPLOY_SOLANA_ENDPOINT.md docs/deployment/
move WALLET_SETUP_FIX.md docs/deployment/
```

### Step 3: Move Database Files
```bash
# Migrations (already in migrations/ folder - just move the folder)
move migrations database/

# SQL scripts
move check-auth-schema.sql database/scripts/
move check-database-health.sql database/scripts/
move check-handle-new-user-function.sql database/scripts/
move create-missing-user-profiles.sql database/scripts/
move fix_rls_policies.sql database/scripts/
move fix-auth-trigger.sql database/scripts/
move fix-database-triggers.sql database/scripts/
move fix-users-rls-policies.sql database/scripts/
move recreate-handle-new-user-function.sql database/scripts/
```

### Step 4: Move Test Files
```bash
move test-auth.js scripts/test/
move test-login-vs-signup.js scripts/test/
move test-payment-flow.ts scripts/test/
move test-points.ts scripts/test/
move test-profile-creation.js scripts/test/
move test-realistic-signup.js scripts/test/
move test-role-specific-signup.js scripts/test/
move test-solana-deployed.js scripts/test/
move test-supabase-direct.js scripts/test/
move test-wallet-save.js scripts/test/
```

### Step 5: Move Server/Setup Scripts
```bash
move serve-app.js scripts/server/
move server-simple.js scripts/server/
move minimal-payment-endpoint.js scripts/server/
move solana-payment-endpoint.js scripts/server/
move solana-endpoint-for-production.js scripts/server/

move install-solana.sh scripts/setup/
move run-migration.js scripts/setup/
```

### Step 6: Move Utility Scripts
```bash
move check-triggers.js scripts/utils/
move check-users-table.js scripts/utils/
move diagnose-signup-issue.js scripts/utils/
move create-users-table.js scripts/utils/
```

### Step 7: Clean Up Root
```bash
# ⚠️ ONLY delete these specific old/backup files:
del app.json.backup 2>nul
del build.log 2>nul
del test-scripts.json 2>nul
del rn-dependencies.json 2>nul

# ⚠️ DO NOT DELETE these folders - they contain working code:
# - components/ (has working components)
# - screens/ (has working screens)
# - services/ (has working services)
# - hooks/ (has working hooks)
# - admin/ (has admin features)
# - api/ (has API routes)
# - server/ (has server code)
```

## 📝 Create New README.md

Create a clean root README.md that links to all documentation:

```markdown
# iYaya - Caregiver Booking Platform

## 🚀 Quick Start
- [Start Here](docs/quick-start/START_HERE.txt)
- [Quick Reference](docs/quick-start/QUICK_START.txt)
- [Immediate Actions](docs/quick-start/ACTION_NOW.md)

## 📚 Documentation
- [Migration Guide](docs/guides/MIGRATION_GUIDE.md)
- [Contract & Payment Flow](docs/guides/CONTRACT_WALLET_PAYMENT_FLOW.md)
- [Complete Index](docs/reference/INDEX.md)

## 🗄️ Database
- [Migrations](database/migrations/)
- [SQL Scripts](database/scripts/)

## 🧪 Testing
- [Test Scripts](scripts/test/)

## 🛠️ Development
```bash
npm install
npm start
```

## 📖 Full Documentation
See [docs/](docs/) folder for complete documentation.
```

## ✅ Benefits

1. **Clean Root** - Only essential config files
2. **Organized Docs** - Easy to find documentation
3. **Clear Structure** - Follows industry standards
4. **Better Navigation** - Logical folder hierarchy
5. **Easier Maintenance** - Everything has its place

## 🎯 Priority Order

1. ✅ Create folder structure
2. ✅ Move documentation (most important)
3. ✅ Move database files
4. ✅ Move test files
5. ✅ Move scripts
6. ✅ Clean up root
7. ✅ Create new README.md
8. ✅ Update import paths (if needed)

## ⚠️ Important Notes

- Keep `.env` files in root (security best practice)
- Keep config files in root (required by tools)
- Update any hardcoded paths in code
- Test after reorganization
- Commit changes incrementally

---

**Ready to reorganize?** Run the commands in order! 🚀
