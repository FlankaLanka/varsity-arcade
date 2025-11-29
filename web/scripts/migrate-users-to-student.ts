/**
 * Migration Script: Set all existing users to accountType: 'student'
 * 
 * This script migrates existing users in Firestore who don't have an accountType
 * field to be set as 'student' (the default account type).
 * 
 * Usage:
 *   1. Ensure you have Firebase Admin SDK credentials set up
 *   2. Run: npx ts-node scripts/migrate-users-to-student.ts
 * 
 * OR run directly in Firebase Console using Cloud Shell:
 *   1. Go to Firebase Console -> Firestore
 *   2. Use the Cloud Shell to run this as a Firebase Function
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin (ensure you have service account credentials)
// If running locally, set GOOGLE_APPLICATION_CREDENTIALS env variable
// pointing to your service account key JSON file

const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : null;

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // When running in Firebase environment, default credentials are used
    admin.initializeApp();
  }
}

const db = admin.firestore();

interface MigrationResult {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
}

async function migrateUsersToStudent(): Promise<MigrationResult> {
  console.log('Starting migration: Setting accountType to "student" for existing users...\n');

  const result: MigrationResult = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  try {
    // Get all users from the 'users' collection
    const usersSnapshot = await db.collection('users').get();
    result.total = usersSnapshot.size;

    console.log(`Found ${result.total} users to process.\n`);

    // Process users in batches for better performance
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore limit

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      // Skip if accountType is already set
      if (userData.accountType) {
        console.log(`  [SKIP] ${doc.id} - already has accountType: ${userData.accountType}`);
        result.skipped++;
        continue;
      }

      // Add update to batch
      const docRef = db.collection('users').doc(doc.id);
      batch.update(docRef, { accountType: 'student' });
      batchCount++;
      result.updated++;

      console.log(`  [UPDATE] ${doc.id} - setting accountType to "student"`);

      // Commit batch when it reaches the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`\n  Committed batch of ${batchCount} updates.\n`);
        batchCount = 0;
      }
    }

    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n  Committed final batch of ${batchCount} updates.\n`);
    }

  } catch (error) {
    console.error('Migration error:', error);
    result.errors++;
  }

  console.log('\n--- Migration Complete ---');
  console.log(`Total users: ${result.total}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Skipped (already had accountType): ${result.skipped}`);
  console.log(`Errors: ${result.errors}`);

  return result;
}

// Alternative: One-time callable Cloud Function version
export const migrateUsersToStudentFunction = async () => {
  return migrateUsersToStudent();
};

// Run if executed directly
if (require.main === module) {
  migrateUsersToStudent()
    .then((result) => {
      console.log('\nMigration finished successfully.');
      process.exit(result.errors > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateUsersToStudent };

