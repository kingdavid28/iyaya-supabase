# Step-by-Step Supabase Migration

## Prerequisites
1. Create Supabase account at [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL, anon key, and service role key

## Step 1: Install Dependencies
```bash
npm install @supabase/supabase-js
npm uninstall firebase @react-native-firebase/app
```

## Step 2: Setup Environment
1. Copy `.env.supabase` to `.env`
2. Replace placeholder values with your Supabase credentials

## Step 3: Create Database Schema
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste contents of `supabase-schema.sql`
3. Run the SQL script

## Step 4: Update App Configuration
1. Replace `src/config/firebase.js` with `src/config/supabase.js`
2. Replace `src/contexts/AuthContext.js` with `src/contexts/SupabaseAuthContext.js`
3. Update imports in your screens

## Step 5: Update Services
1. Replace Firebase service calls with Supabase service calls
2. Use `src/services/supabaseService.js` as reference
3. Update all API calls in your screens

## Step 6: Migrate Data (Optional)
If you have existing data:
```bash
node scripts/migrateToSupabase.js
```

## Step 7: Update Authentication Screens
Replace Firebase auth calls:

### Before (Firebase):
```javascript
import { signInWithEmailAndPassword } from 'firebase/auth'
await signInWithEmailAndPassword(auth, email, password)
```

### After (Supabase):
```javascript
import { useAuth } from '../contexts/SupabaseAuthContext'
const { signIn } = useAuth()
await signIn(email, password)
```

## Step 8: Update Real-time Features
Replace Firebase Realtime Database with Supabase Realtime:

### Before (Firebase):
```javascript
import { onValue, ref } from 'firebase/database'
onValue(ref(database, 'messages'), callback)
```

### After (Supabase):
```javascript
import { supabaseService } from '../services/supabaseService'
const subscription = supabaseService.subscribeToMessages(conversationId, callback)
```

## Step 9: Test Migration
1. Test authentication (login/signup/logout)
2. Test job posting and browsing
3. Test messaging functionality
4. Test profile management
5. Test booking system

## Step 10: Deploy
1. Update environment variables in production
2. Deploy updated app
3. Monitor for any issues

## Key Changes Summary

### Authentication
- Firebase Auth → Supabase Auth
- JWT tokens handled automatically
- Built-in email verification
- Social login support (Google, Facebook)

### Database
- MongoDB → PostgreSQL
- NoSQL documents → Relational tables
- Better data consistency and relationships
- Built-in Row Level Security

### Real-time
- Firebase Realtime Database → Supabase Realtime
- WebSocket connections
- Real-time subscriptions to database changes

### File Storage
- Firebase Storage → Supabase Storage
- Built-in CDN
- Automatic image optimization

### Backend
- Express.js server → Supabase Edge Functions (optional)
- Reduced server maintenance
- Auto-scaling

## Benefits After Migration
1. **Simplified Architecture**: No separate backend needed
2. **Better Performance**: PostgreSQL + built-in caching
3. **Real-time by Default**: All tables support real-time subscriptions
4. **Better Security**: Row Level Security at database level
5. **Cost Effective**: Pay only for what you use
6. **Developer Experience**: Auto-generated APIs and TypeScript support


knoockk28a iyayaSupa

anon: 
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15aXlybWlpeXd3Z2lzbWNwaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MDgzNDYsImV4cCI6MjA3NTM4NDM0Nn0.DGRKcZmPvatheWOlukc7sjGU8ufYlSiW03L47Q_YWyI

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15aXlybWlpeXd3Z2lzbWNwaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MDgzNDYsImV4cCI6MjA3NTM4NDM0Nn0.DGRKcZmPvatheWOlukc7sjGU8ufYlSiW03L47Q_YWyI

url: 
https://myiyrmiiywwgismcpith.supabase.co

service role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15aXlybWlpeXd3Z2lzbWNwaXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTgwODM0NiwiZXhwIjoyMDc1Mzg0MzQ2fQ.WWqfmf8hai5mVBC4iZcfjjlpNfkdd_IHk9NNju2Ehjc

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15aXlybWlpeXd3Z2lzbWNwaXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTgwODM0NiwiZXhwIjoyMDc1Mzg0MzQ2fQ.WWqfmf8hai5mVBC4iZcfjjlpNfkdd_IHk9NNju2Ehjc