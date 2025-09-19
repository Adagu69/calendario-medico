import pool from '../database/connection';
import bcrypt from 'bcryptjs';
import { User } from '../types';

export class UserModel {
  // Note: This create method is based on the sgh_users schema.
  // The original file had a different structure.
  static async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const client = await pool.connect();
    
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const query = `
        INSERT INTO sgh_users (username, email, password, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        userData.username,
        userData.email,
        hashedPassword,
        userData.first_name,
        userData.last_name,
        userData.role,
      ];
      
      const result = await client.query(query, values);
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }
  
  static async findByIdentifier(identifier: string): Promise<User | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          u.*,
          s.name as section_name,
          us.section_id
        FROM sgh_users u
        LEFT JOIN sgh_user_sections us ON u.id = us.user_id
        LEFT JOIN sgh_sections s ON us.section_id = s.id
        WHERE (u.email = $1 OR u.username = $1) AND u.is_active = true
      `;
      const result = await client.query(query, [identifier]);
      
      return result.rows[0] || null;
      
    } finally {
      client.release();
    }
  }
  
  static async findById(id: string): Promise<User | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          u.*,
          s.name as section_name,
          us.section_id
        FROM sgh_users u
        LEFT JOIN sgh_user_sections us ON u.id = us.user_id
        LEFT JOIN sgh_sections s ON us.section_id = s.id
        WHERE u.id = $1 AND u.is_active = true
      `;
      const result = await client.query(query, [id]);
      
      return result.rows[0] || null;
      
    } finally {
      client.release();
    }
  }
  
  static async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}