# Supabase Migration Guide for Iyaya App

## Overview
This guide will help you migrate from Firebase/MongoDB to Supabase, replacing:
- Firebase Auth → Supabase Auth
- MongoDB → Supabase PostgreSQL
- Node.js/Express Backend → Supabase Edge Functions (optional)
- Firebase Realtime Database → Supabase Realtime

## Phase 1: Supabase Project Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note down:
   - Project URL
   - Anon Key
   - Service Role Key

### 1.2 Install Supabase Dependencies
```bash
npm install @supabase/supabase-js
npm uninstall firebase @react-native-firebase/app
```

### 1.3 Environment Configuration
Create `.env` with Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Phase 2: Database Schema Migration

### 2.1 Create PostgreSQL Tables
Execute these SQL commands in Supabase SQL Editor:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (replaces MongoDB User model)
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) CHECK (role IN ('parent', 'caregiver')) DEFAULT 'parent',
  name VARCHAR(100) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  middle_initial VARCHAR(1),
  birth_date DATE,
  phone VARCHAR(20),
  profile_image TEXT,
  auth_provider VARCHAR(20) DEFAULT 'supabase',
  facebook_id VARCHAR(255),
  google_id VARCHAR(255),
  address JSONB,
  status VARCHAR(20) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT false,
  background_check_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Children table (normalized from User.children array)
CREATE TABLE children (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  birthdate DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_name VARCHAR(100) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  number_of_children INTEGER DEFAULT 1,
  children_ages VARCHAR(255),
  requirements TEXT[],
  urgent BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  message TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  payment_proof TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table (replaces Firebase Realtime)
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_1 UUID REFERENCES users(id) ON DELETE CASCADE,
  participant_2 UUID REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_caregiver_id ON applications(caregiver_id);
CREATE INDEX idx_bookings_parent_id ON bookings(parent_id);
CREATE INDEX idx_bookings_caregiver_id ON bookings(caregiver_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

### 2.2 Enable Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Children policies
CREATE POLICY "Parents can manage their children" ON children
  FOR ALL USING (auth.uid() = parent_id);

-- Jobs policies
CREATE POLICY "Anyone can view active jobs" ON jobs
  FOR SELECT USING (status = 'active');

CREATE POLICY "Parents can manage their jobs" ON jobs
  FOR ALL USING (auth.uid() = client_id);

-- Applications policies
CREATE POLICY "Caregivers can view/create applications" ON applications
  FOR SELECT USING (auth.uid() = caregiver_id);

CREATE POLICY "Caregivers can create applications" ON applications
  FOR INSERT WITH CHECK (auth.uid() = caregiver_id);

CREATE POLICY "Job owners can view applications" ON applications
  FOR SELECT USING (
    auth.uid() IN (
      SELECT client_id FROM jobs WHERE jobs.id = applications.job_id
    )
  );

-- Bookings policies
CREATE POLICY "Users can view their bookings" ON bookings
  FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = caregiver_id);

CREATE POLICY "Parents can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- Messages policies
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Conversations policies
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
```

## Phase 3: Frontend Migration

### 3.1 Create Supabase Configuration
```javascript
// src/config/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### 3.2 Update AuthContext
Replace Firebase auth with Supabase auth:

```javascript
// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../config/supabase'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    
    if (error) throw error
    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### 3.3 Create Supabase Services
Replace your existing services with Supabase equivalents:

```javascript
// src/services/supabaseService.js
import { supabase } from '../config/supabase'

export const supabaseService = {
  // Users
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Jobs
  async getJobs(filters = {}) {
    let query = supabase.from('jobs').select('*')
    
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createJob(jobData) {
    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateJob(jobId, updates) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Applications
  async applyToJob(jobId, caregiverId, message) {
    const { data, error } = await supabase
      .from('applications')
      .insert([{
        job_id: jobId,
        caregiver_id: caregiverId,
        message
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getApplications(userId, role) {
    let query = supabase.from('applications').select(`
      *,
      jobs(*),
      users(*)
    `)
    
    if (role === 'caregiver') {
      query = query.eq('caregiver_id', userId)
    } else {
      query = query.eq('jobs.client_id', userId)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Messages (Real-time)
  async sendMessage(conversationId, senderId, recipientId, content) {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        content
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getMessages(conversationId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Real-time subscriptions
  subscribeToMessages(conversationId, callback) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, callback)
      .subscribe()
  },

  // Children
  async getChildren(parentId) {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', parentId)
    
    if (error) throw error
    return data
  },

  async addChild(parentId, childData) {
    const { data, error } = await supabase
      .from('children')
      .insert([{ ...childData, parent_id: parentId }])
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}
```

## Phase 4: Update Package.json

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    // Remove Firebase dependencies
    // "firebase": "^12.3.0",
    // "@react-native-firebase/app": "^23.3.1",
    // Keep other dependencies...
  }
}
```

## Phase 5: Data Migration Script

Create a script to migrate existing data:

```javascript
// scripts/migrateData.js
const { createClient } = require('@supabase/supabase-js')
const mongoose = require('mongoose')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function migrateUsers() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI)
  
  const User = require('../iyaya-backend/models/User')
  const users = await User.find({})
  
  for (const user of users) {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone,
        // ... map other fields
      }])
    
    if (error) {
      console.error('Error migrating user:', error)
    } else {
      console.log('Migrated user:', user.email)
    }
  }
}

// Run migration
migrateUsers().catch(console.error)
```

## Phase 6: Update Authentication Screens

Replace Firebase auth calls with Supabase:

```javascript
// Example: Update login screen
const handleLogin = async () => {
  try {
    await signIn(email, password)
    // Navigation handled by AuthContext
  } catch (error) {
    setError(error.message)
  }
}
```

## Phase 7: Enable Realtime Features

```javascript
// Real-time messaging example
useEffect(() => {
  const subscription = supabaseService.subscribeToMessages(
    conversationId,
    (payload) => {
      setMessages(prev => [...prev, payload.new])
    }
  )

  return () => {
    subscription.unsubscribe()
  }
}, [conversationId])
```

## Benefits of Migration

1. **Simplified Architecture**: No separate backend needed
2. **Built-in Auth**: Email, social login, MFA support
3. **Real-time**: Built-in real-time subscriptions
4. **PostgreSQL**: More powerful than MongoDB for relational data
5. **Row Level Security**: Database-level security
6. **Auto-generated APIs**: No need to write CRUD endpoints
7. **File Storage**: Built-in file storage for profile images
8. **Edge Functions**: Serverless functions when needed

## Migration Timeline

- **Week 1**: Setup Supabase, create schema, migrate auth
- **Week 2**: Migrate core features (jobs, applications)
- **Week 3**: Implement real-time messaging
- **Week 4**: Data migration and testing
- **Week 5**: Production deployment

This migration will significantly simplify your architecture while providing better performance and developer experience.