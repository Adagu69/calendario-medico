import pool from './connection';

export const createTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating SGH database tables...');
    
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sgh_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'gerencia', 'jefe', 'doctor')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sgh_sections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sgh_user_sections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES sgh_users(id) ON DELETE CASCADE,
        section_id INTEGER REFERENCES sgh_sections(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL CHECK (role IN ('jefe', 'member')),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, section_id)
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sgh_specialties (
        id SERIAL PRIMARY KEY,
        section_id INTEGER REFERENCES sgh_sections(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sgh_doctors (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES sgh_users(id) ON DELETE SET NULL,
        specialty_id INTEGER REFERENCES sgh_specialties(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        license VARCHAR(100),
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sgh_months (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES sgh_doctors(id) ON DELETE CASCADE,
        specialty_id INTEGER REFERENCES sgh_specialties(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        theme_config JSONB DEFAULT '{}',
        published_at TIMESTAMP,
        published_by INTEGER REFERENCES sgh_users(id),
        created_by INTEGER REFERENCES sgh_users(id) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(doctor_id, specialty_id, year, month)
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sgh_time_slots (
        id SERIAL PRIMARY KEY,
        month_id INTEGER REFERENCES sgh_months(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        color VARCHAR(7) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_time_order CHECK (start_time < end_time)
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sgh_month_days (
        id SERIAL PRIMARY KEY,
        month_id INTEGER REFERENCES sgh_months(id) ON DELETE CASCADE,
        day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
        time_slot_ids INTEGER[] DEFAULT '{}',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(month_id, day)
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sgh_change_requests (
        id SERIAL PRIMARY KEY,
        month_id INTEGER REFERENCES sgh_months(id) ON DELETE CASCADE,
        requested_by INTEGER REFERENCES sgh_users(id) ON DELETE CASCADE,
        day INTEGER,
        time_slot_id INTEGER REFERENCES sgh_time_slots(id),
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
        reviewed_by INTEGER REFERENCES sgh_users(id),
        reviewed_at TIMESTAMP,
        review_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sgh_audit_log (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
        old_values JSONB,
        new_values JSONB,
        changed_by INTEGER REFERENCES sgh_users(id),
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // New sgh_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sgh_settings (
        id SERIAL PRIMARY KEY,
        clinic_name VARCHAR(255) NOT NULL DEFAULT 'TUASUSALUD',
        logo_url TEXT,
        background_color VARCHAR(7) NOT NULL DEFAULT '#ffffff',
        accent_color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
        header_color VARCHAR(7) NOT NULL DEFAULT '#1f2937',
        font_family VARCHAR(255) NOT NULL DEFAULT 'Inter',
        doctor_photo_size INTEGER NOT NULL DEFAULT 50,
        doctor_name_size INTEGER NOT NULL DEFAULT 14,
        specialty_size INTEGER NOT NULL DEFAULT 12,
        clinic_logo_size INTEGER NOT NULL DEFAULT 40,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES sgh_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_months_doctor_year_month ON sgh_months(doctor_id, year, month)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_months_status ON sgh_months(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_time_slots_month ON sgh_time_slots(month_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_month_days_month_day ON sgh_month_days(month_id, day)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_change_requests_status ON sgh_change_requests(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON sgh_audit_log(table_name, record_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON sgh_audit_log(created_at)');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    const tables = [
      'sgh_users', 'sgh_sections', 'sgh_specialties', 'sgh_doctors', 
      'sgh_months', 'sgh_time_slots', 'sgh_month_days', 'sgh_change_requests',
      'sgh_audit_log', 'sgh_settings' // Added sgh_settings
    ];
    
    for (const table of tables) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at 
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
      `);
    }
    
    console.log('✅ Database tables created successfully');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const dropTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Dropping database tables...');
    
    const tables = [
      'sgh_audit_log', 'sgh_change_requests', 'sgh_month_days', 'sgh_time_slots',
      'sgh_months', 'sgh_doctors', 'sgh_specialties', 'sgh_user_sections', 
      'sgh_sections', 'sgh_users', 'sgh_settings' // Added sgh_settings
    ];
    
    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    
    console.log('✅ Database tables dropped successfully');
    
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  } finally {
    client.release();
  }
};