// **CORRECCIÓN: Se importa también la función dropTables**
import { createTables, dropTables } from './sgh-schema';
import { seedDatabase } from './seed';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  try {
    console.log('🔥 Starting database reset and migration...');
    
    await dropTables();
    
    await createTables();

    await seedDatabase();

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
