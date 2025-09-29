import pool from './connection';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding database...');

    // 1. Seed Sections
    console.log('Seeding sections...');
    const sectionsResult = await client.query(`
      INSERT INTO sgh_sections (name, description) VALUES
      ('Pediatría', 'Atención médica para bebés, niños y adolescentes.'),
      ('Ginecología y Obstetricia', 'Salud del sistema reproductivo femenino y atención durante el embarazo.'),
      ('Medicina General', 'Atención primaria y diagnóstico general para adultos.'),
      ('Cardiología', 'Enfermedades del corazón y del sistema circulatorio.')
      RETURNING id, name;
    `);
    const sections: { [key: string]: number } = sectionsResult.rows.reduce((acc, row) => {
        acc[row.name] = row.id;
        return acc;
    }, {});
    console.log('✅ Sections seeded.');

    // 2. Seed Specialties
    console.log('Seeding specialties...');
    const specialtiesResult = await client.query(`
      INSERT INTO sgh_specialties (name, description) VALUES
      ('Neumología Pediátrica', 'Enfermedades respiratorias en niños.'),
      ('Cardiología Pediátrica', 'Problemas del corazón en niños.'),
      ('Ginecología Oncológica', 'Cáncer del sistema reproductivo femenino.'),
      ('Medicina Fetal', 'Salud del feto durante el embarazo.'),
      ('Cardiología Intervencionista', 'Procedimientos para tratar enfermedades cardíacas estructurales.')
      RETURNING id, name;
    `);
    const specialties: { [key: string]: number } = specialtiesResult.rows.reduce((acc, row) => {
        acc[row.name] = row.id;
        return acc;
    }, {});
    console.log('✅ Specialties seeded.');

    // 3. Seed Users (including doctors)
    console.log('Seeding users...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    const usersResult = await client.query(`
      INSERT INTO sgh_users (username, email, password, first_name, last_name, role)
      VALUES
      ('admin', 'admin@clinica.com', $1, 'Admin', 'User', 'admin'),
      ('jefe.pediatria', 'jefe.pediatria@clinica.com', $1, 'Roberto', 'Gomez', 'jefe'),
      ('ana.gomez', 'ana.gomez@clinica.com', $1, 'Ana', 'Gomez', 'doctor'),
      ('carlos.diaz', 'carlos.diaz@clinica.com', $1, 'Carlos', 'Diaz', 'doctor'),
      ('lucia.fernandez', 'lucia.fernandez@clinica.com', $1, 'Lucia', 'Fernandez', 'doctor')
      RETURNING id, username;
    `, [hashedPassword]);
    const users: { [key: string]: number } = usersResult.rows.reduce((acc, row) => {
        acc[row.username] = row.id;
        return acc;
    }, {});
    console.log('✅ Users seeded.');

    // 4. Seed Doctors
    console.log('Seeding doctors...');
    const doctorsResult = await client.query(`
      INSERT INTO sgh_doctors (user_id, section_id, name, email, license)
      VALUES
      ($1, $2, 'Ana Gomez', 'ana.gomez@clinica.com', 'DOC001'),
      ($3, $4, 'Carlos Diaz', 'carlos.diaz@clinica.com', 'DOC002'),
      ($5, $6, 'Lucia Fernandez', 'lucia.fernandez@clinica.com', 'DOC003')
      RETURNING id, name;
    `, [users['ana.gomez'], sections['Pediatría'], users['carlos.diaz'], sections['Cardiología'], users['lucia.fernandez'], sections['Ginecología y Obstetricia']]);
    const doctors: { [key: string]: number } = doctorsResult.rows.reduce((acc, row) => {
        acc[row.name] = row.id;
        return acc;
    }, {});
    console.log('✅ Doctors seeded.');

    // 5. Seed Doctor-Specialty relationships
    console.log('Seeding doctor-specialty links...');
    await client.query(`
      INSERT INTO sgh_doctor_specialties (doctor_id, specialty_id) VALUES
      ($1, $2),
      ($1, $3),
      ($4, $5)
    `, [doctors['Ana Gomez'], specialties['Neumología Pediátrica'], specialties['Cardiología Pediátrica'], doctors['Lucia Fernandez'], specialties['Ginecología Oncológica']]);
    console.log('✅ Doctor-Specialty links seeded.');

    // 6. Assign section chiefs
    console.log('Assigning section chiefs...');
    await client.query(
      `INSERT INTO sgh_user_sections (user_id, section_id, role)
       VALUES ($1, $2, 'jefe')
       ON CONFLICT (user_id, section_id) DO NOTHING`,
      [users['jefe.pediatria'], sections['Pediatría']]
    );
    console.log('✅ Section chiefs assigned.');

    console.log('🌱 Database seeding complete.');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
};
