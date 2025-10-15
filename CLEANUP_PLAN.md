# App Cleanup & Organization Plan

## 🎯 Objectives
- Remove duplicate code and files
- Consolidate similar functionality
- Improve folder structure
- Maintain 100% functionality
- Zero breaking changes

## 📁 Current Issues Identified

### 1. **Duplicate Folders & Files**
```
❌ DUPLICATES TO CLEAN:
- /app/ vs /core/ (similar structure)
- /components/ vs /shared/ui/ (UI components)
- /contexts/ vs /core/contexts/ (React contexts)
- /services/ vs /services/backup/ (service files)
- Multiple auth files across folders
- Duplicate utility functions
```

### 2. **Inconsistent Structure**
```
❌ INCONSISTENT:
- Mixed file extensions (.js, .jsx)
- Inconsistent naming conventions
- Scattered style files
- Multiple config folders
```

## 🔧 Cleanup Actions

### Phase 1: Remove Obvious Duplicates (SAFE)
1. **Delete backup folders**:
   - `/services/backup/` → Keep main `/services/`
   - Remove `.backup` files
   
2. **Consolidate contexts**:
   - Keep `/contexts/` → Remove `/core/contexts/`
   
3. **Remove unused files**:
   - Empty index.js files
   - Test files not being used

### Phase 2: Consolidate Structure
1. **Merge UI components**:
   - `/components/ui/` → `/shared/ui/`
   - `/components/common/` → `/shared/ui/`
   
2. **Standardize services**:
   - Keep `/services/` structure
   - Remove `/core/api/` (use main services)
   
3. **Organize utilities**:
   - Merge `/utils/` and `/shared/utils/`

### Phase 3: File Organization
1. **Standardize extensions**: All React components → `.jsx`
2. **Consistent naming**: camelCase for files, PascalCase for components
3. **Group related files**: Move styles closer to components

## 🚀 Implementation Steps

### Step 1: Safe Deletions (No Risk)
```bash
# Remove backup folders
rm -rf src/services/backup/
rm -rf src/core/
rm -f src/contexts/*.backup
rm -f src/config/*.backup
```

### Step 2: Consolidate Duplicates
- Merge duplicate utility functions
- Consolidate similar components
- Remove unused imports

### Step 3: Restructure
- Move files to logical locations
- Update import paths
- Test functionality

## 📋 Validation Checklist
- [ ] All screens still render
- [ ] Navigation works
- [ ] API calls function
- [ ] Authentication flows work
- [ ] No console errors
- [ ] Build succeeds

## 🎯 Target Structure
```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
├── services/           # API & business logic
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── utils/              # Utility functions
├── config/             # App configuration
├── constants/          # App constants
└── types/              # TypeScript types
```

## ⚠️ Safety Measures
1. **Git branch**: Create cleanup branch
2. **Incremental**: Small, testable changes
3. **Validation**: Test after each phase
4. **Rollback**: Keep original structure until verified