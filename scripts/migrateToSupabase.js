const { createClient } = require('@supabase/supabase-js')
const mongoose = require('mongoose')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function migrateUsers() {
  console.log('Starting user migration...')
  
  await mongoose.connect(process.env.MONGODB_URI)
  const User = require('../iyaya-backend/models/User')
  
  const users = await User.find({})
  console.log(`Found ${users.length} users to migrate`)
  
  for (const user of users) {
    try {
      const userData = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        first_name: user.firstName,
        last_name: user.lastName,
        middle_initial: user.middleInitial,
        birth_date: user.birthDate,
        phone: user.phone,
        profile_image: user.profileImage,
        auth_provider: user.authProvider || 'local',
        facebook_id: user.facebookId,
        google_id: user.googleId,
        address: user.address,
        status: user.status,
        email_verified: user.verification?.emailVerified || false,
        background_check_verified: user.verification?.backgroundCheckVerified || false,
        last_login: user.lastLogin,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }

      const { error } = await supabase
        .from('users')
        .insert([userData])

      if (error) {
        console.error(`Error migrating user ${user.email}:`, error)
      } else {
        console.log(`✅ Migrated user: ${user.email}`)
      }
    } catch (err) {
      console.error(`Error processing user ${user.email}:`, err)
    }
  }
}

async function migrateChildren() {
  console.log('Starting children migration...')
  
  const User = require('../iyaya-backend/models/User')
  const users = await User.find({ children: { $exists: true, $ne: [] } })
  
  for (const user of users) {
    for (const child of user.children) {
      try {
        const childData = {
          parent_id: user._id.toString(),
          name: child.name,
          birthdate: child.birthdate,
          notes: child.notes
        }

        const { error } = await supabase
          .from('children')
          .insert([childData])

        if (error) {
          console.error(`Error migrating child ${child.name}:`, error)
        } else {
          console.log(`✅ Migrated child: ${child.name}`)
        }
      } catch (err) {
        console.error(`Error processing child ${child.name}:`, err)
      }
    }
  }
}

async function migrateJobs() {
  console.log('Starting jobs migration...')
  
  const Job = require('../iyaya-backend/models/Job')
  const jobs = await Job.find({})
  
  for (const job of jobs) {
    try {
      const jobData = {
        id: job._id.toString(),
        client_id: job.clientId.toString(),
        client_name: job.clientName,
        title: job.title,
        description: job.description,
        location: job.location,
        date: job.date,
        start_time: job.startTime,
        end_time: job.endTime,
        hourly_rate: job.hourlyRate,
        number_of_children: job.numberOfChildren,
        children_ages: job.childrenAges,
        requirements: job.requirements,
        urgent: job.urgent,
        status: job.status,
        created_at: job.createdAt,
        updated_at: job.updatedAt
      }

      const { error } = await supabase
        .from('jobs')
        .insert([jobData])

      if (error) {
        console.error(`Error migrating job ${job.title}:`, error)
      } else {
        console.log(`✅ Migrated job: ${job.title}`)
      }
    } catch (err) {
      console.error(`Error processing job ${job.title}:`, err)
    }
  }
}

async function runMigration() {
  try {
    await migrateUsers()
    await migrateChildren()
    await migrateJobs()
    console.log('Migration completed!')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await mongoose.disconnect()
  }
}

runMigration()