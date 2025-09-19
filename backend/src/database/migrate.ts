import { createTables } from './schema';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  try {
    console.log('🔧 Starting database migration...');
    await createTables();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
