import pool from '../database/connection';
import { Appointment, AppointmentFilters } from '../types';

export class AppointmentModel {
  static async create(appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO appointments (
          patient_name, patient_phone, patient_email, specialty_id, 
          doctor_id, office_id, time_slot_id, appointment_date, 
          notes, status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        appointmentData.patient_name,
        appointmentData.patient_phone,
        appointmentData.patient_email,
        appointmentData.specialty_id,
        appointmentData.doctor_id,
        appointmentData.office_id,
        appointmentData.time_slot_id,
        appointmentData.appointment_date,
        appointmentData.notes,
        appointmentData.status || 'scheduled',
        appointmentData.created_by
      ];
      
      const result = await client.query(query, values);
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }
  
  static async findById(id: string): Promise<Appointment | null> {
    const client = await pool.connect();
    
    try {
      const query = 'SELECT * FROM appointments WHERE id = $1';
      const result = await client.query(query, [id]);
      
      return result.rows[0] || null;
      
    } finally {
      client.release();
    }
  }
  
  static async findAll(filters?: AppointmentFilters): Promise<Appointment[]> {
    const client = await pool.connect();
    
    try {
      let query = 'SELECT * FROM appointments WHERE 1=1';
      const values: any[] = [];
      let paramCount = 1;
      
      if (filters) {
        if (filters.specialty_id) {
          query += ` AND specialty_id = $${paramCount}`;
          values.push(filters.specialty_id);
          paramCount++;
        }
        
        if (filters.doctor_id) {
          query += ` AND doctor_id = $${paramCount}`;
          values.push(filters.doctor_id);
          paramCount++;
        }
        
        if (filters.office_id) {
          query += ` AND office_id = $${paramCount}`;
          values.push(filters.office_id);
          paramCount++;
        }
        
        if (filters.status) {
          query += ` AND status = $${paramCount}`;
          values.push(filters.status);
          paramCount++;
        }
        
        if (filters.date_from) {
          query += ` AND appointment_date >= $${paramCount}`;
          values.push(filters.date_from);
          paramCount++;
        }
        
        if (filters.date_to) {
          query += ` AND appointment_date <= $${paramCount}`;
          values.push(filters.date_to);
          paramCount++;
        }
        
        if (filters.patient_name) {
          query += ` AND patient_name ILIKE $${paramCount}`;
          values.push(`%${filters.patient_name}%`);
          paramCount++;
        }
      }
      
      query += ' ORDER BY appointment_date DESC, created_at DESC';
      
      const result = await client.query(query, values);
      return result.rows;
      
    } finally {
      client.release();
    }
  }
  
  static async update(id: string, appointmentData: Partial<Appointment>): Promise<Appointment | null> {
    const client = await pool.connect();
    
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      Object.entries(appointmentData).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });
      
      if (fields.length === 0) {
        return this.findById(id);
      }
      
      values.push(id);
      
      const query = `
        UPDATE appointments 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      return result.rows[0] || null;
      
    } finally {
      client.release();
    }
  }
  
  static async delete(id: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = 'DELETE FROM appointments WHERE id = $1';
      const result = await client.query(query, [id]);
      
      return (result.rowCount ?? 0) > 0;
      
    } finally {
      client.release();
    }
  }
  
  static async findByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM appointments 
        WHERE appointment_date BETWEEN $1 AND $2
        ORDER BY appointment_date, time_slot_id
      `;
      
      const result = await client.query(query, [startDate, endDate]);
      return result.rows;
      
    } finally {
      client.release();
    }
  }
  
  static async checkConflict(
    doctorId: string, 
    officeId: string, 
    timeSlotId: string, 
    appointmentDate: Date,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT COUNT(*) FROM appointments 
        WHERE (doctor_id = $1 OR office_id = $2) 
        AND time_slot_id = $3 
        AND appointment_date = $4
        AND status NOT IN ('cancelled', 'no_show')
      `;
      
      const values = [doctorId, officeId, timeSlotId, appointmentDate];
      
      if (excludeAppointmentId) {
        query += ' AND id != $5';
        values.push(excludeAppointmentId);
      }
      
      const result = await client.query(query, values);
      return parseInt(result.rows[0].count) > 0;
      
    } finally {
      client.release();
    }
  }
}
