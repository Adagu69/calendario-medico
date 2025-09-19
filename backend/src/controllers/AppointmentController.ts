import { Request, Response } from 'express';
import { AppointmentModel } from '../models/Appointment';
import { ApiResponse, AppointmentFilters, CalendarEvent } from '../types';
import pool from '../database/connection';

export class AppointmentController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      
      // Transform camelCase to snake_case for database compatibility
      const appointmentData = {
        patient_name: req.body.patientName,
        patient_phone: req.body.patientPhone,
        patient_email: req.body.patientEmail,
        specialty_id: req.body.specialtyId,
        doctor_id: req.body.doctorId,
        office_id: req.body.officeId,
        time_slot_id: req.body.timeSlotId,
        appointment_date: req.body.date,
        notes: req.body.notes,
        status: req.body.status || 'scheduled',
        created_by: userId
      };
      
      // Debug logging
      console.log('Received body:', req.body);
      console.log('Transformed data:', appointmentData);
      
      // Validate required fields
      if (!appointmentData.patient_name) {
        res.status(400).json({
          success: false,
          error: 'El nombre del paciente es requerido'
        } as ApiResponse);
        return;
      }
      
      // Validate UUID format for IDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(appointmentData.specialty_id)) {
        res.status(400).json({
          success: false,
          error: 'ID de especialidad inválido. Por favor, selecciona una especialidad válida.'
        } as ApiResponse);
        return;
      }
      
      if (!uuidRegex.test(appointmentData.doctor_id)) {
        res.status(400).json({
          success: false,
          error: 'ID de doctor inválido. Por favor, selecciona un doctor válido.'
        } as ApiResponse);
        return;
      }
      
      if (!uuidRegex.test(appointmentData.office_id)) {
        res.status(400).json({
          success: false,
          error: 'ID de consultorio inválido. Por favor, selecciona un consultorio válido.'
        } as ApiResponse);
        return;
      }
      
      if (!uuidRegex.test(appointmentData.time_slot_id)) {
        res.status(400).json({
          success: false,
          error: 'ID de horario inválido. Por favor, selecciona un horario válido.'
        } as ApiResponse);
        return;
      }
      
      // Check for conflicts
      const hasConflict = await AppointmentModel.checkConflict(
        appointmentData.doctor_id,
        appointmentData.office_id,
        appointmentData.time_slot_id,
        new Date(appointmentData.appointment_date)
      );
      
      if (hasConflict) {
        res.status(409).json({
          success: false,
          error: 'Ya existe una cita en ese horario y consultorio'
        } as ApiResponse);
        return;
      }
      
      const appointment = await AppointmentModel.create(appointmentData);
      
      res.status(201).json({
        success: true,
        data: appointment,
        message: 'Cita creada exitosamente'
      } as ApiResponse);
      
    } catch (error) {
      console.error('Create appointment error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      } as ApiResponse);
    }
  }
  
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const filters: AppointmentFilters = req.query as any;
      const appointments = await AppointmentModel.findAll(filters);
      
      res.status(200).json({
        success: true,
        data: appointments
      } as ApiResponse);
      
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      } as ApiResponse);
    }
  }
  
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await AppointmentModel.findById(id);
      
      if (!appointment) {
        res.status(404).json({
          success: false,
          error: 'Cita no encontrada'
        } as ApiResponse);
        return;
      }
      
      res.status(200).json({
        success: true,
        data: appointment
      } as ApiResponse);
      
    } catch (error) {
      console.error('Get appointment error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      } as ApiResponse);
    }
  }
  
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Transform camelCase to snake_case for database compatibility
      const updateData = {
        patient_name: req.body.patientName,
        patient_phone: req.body.patientPhone,
        patient_email: req.body.patientEmail,
        specialty_id: req.body.specialtyId,
        doctor_id: req.body.doctorId,
        office_id: req.body.officeId,
        time_slot_id: req.body.timeSlotId,
        appointment_date: req.body.date,
        notes: req.body.notes,
        status: req.body.status
      };
      
      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });
      
      // Check for conflicts if scheduling details are being updated
      if (updateData.doctor_id || updateData.office_id || updateData.time_slot_id || updateData.appointment_date) {
        const appointment = await AppointmentModel.findById(id);
        if (!appointment) {
          res.status(404).json({
            success: false,
            error: 'Cita no encontrada'
          } as ApiResponse);
          return;
        }
        
        const hasConflict = await AppointmentModel.checkConflict(
          updateData.doctor_id || appointment.doctor_id,
          updateData.office_id || appointment.office_id,
          updateData.time_slot_id || appointment.time_slot_id,
          new Date(updateData.appointment_date || appointment.appointment_date),
          id
        );
        
        if (hasConflict) {
          res.status(409).json({
            success: false,
            error: 'Ya existe una cita en ese horario y consultorio'
          } as ApiResponse);
          return;
        }
      }
      
      const updatedAppointment = await AppointmentModel.update(id, updateData);
      
      if (!updatedAppointment) {
        res.status(404).json({
          success: false,
          error: 'Cita no encontrada'
        } as ApiResponse);
        return;
      }
      
      res.status(200).json({
        success: true,
        data: updatedAppointment,
        message: 'Cita actualizada exitosamente'
      } as ApiResponse);
      
    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      } as ApiResponse);
    }
  }
  
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const deleted = await AppointmentModel.delete(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Cita no encontrada'
        } as ApiResponse);
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Cita eliminada exitosamente'
      } as ApiResponse);
      
    } catch (error) {
      console.error('Delete appointment error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      } as ApiResponse);
    }
  }
  
  static async getCalendarEvents(req: Request, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;
      
      let appointments;
      if (start && end) {
        appointments = await AppointmentModel.findByDateRange(
          new Date(start as string),
          new Date(end as string)
        );
      } else {
        appointments = await AppointmentModel.findAll();
      }
      
      // Get related data to build calendar events
      const client = await pool.connect();
      try {
        const calendarEvents: CalendarEvent[] = [];
        
        for (const appointment of appointments) {
          // Get specialty, doctor, office, and time slot info
          const [specialtyResult, doctorResult, officeResult, timeSlotResult] = await Promise.all([
            client.query('SELECT * FROM specialties WHERE id = $1', [appointment.specialty_id]),
            client.query('SELECT * FROM doctors WHERE id = $1', [appointment.doctor_id]),
            client.query('SELECT * FROM offices WHERE id = $1', [appointment.office_id]),
            client.query('SELECT * FROM time_slots WHERE id = $1', [appointment.time_slot_id])
          ]);
          
          const specialty = specialtyResult.rows[0];
          const doctor = doctorResult.rows[0];
          const office = officeResult.rows[0];
          const timeSlot = timeSlotResult.rows[0];
          
          if (specialty && doctor && office && timeSlot) {
            const appointmentDate = new Date(appointment.appointment_date);
            const [startHour, startMinute] = timeSlot.start_time.split(':');
            const [endHour, endMinute] = timeSlot.end_time.split(':');
            
            const startDateTime = new Date(appointmentDate);
            startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
            
            const endDateTime = new Date(appointmentDate);
            endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
            
            const calendarEvent: CalendarEvent = {
              id: appointment.id,
              title: `${appointment.patient_name} - ${doctor.name}`,
              start: startDateTime.toISOString(),
              end: endDateTime.toISOString(),
              backgroundColor: specialty.color,
              borderColor: specialty.color,
              textColor: '#ffffff',
              extendedProps: {
                appointment,
                patientName: appointment.patient_name,
                patientPhone: appointment.patient_phone,
                specialtyName: specialty.name,
                doctorName: doctor.name,
                officeName: office.name,
                timeSlotName: timeSlot.name,
                notes: appointment.notes
              }
            };
            
            calendarEvents.push(calendarEvent);
          }
        }
        
        res.status(200).json({
          success: true,
          data: calendarEvents
        } as ApiResponse<CalendarEvent[]>);
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Get calendar events error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      } as ApiResponse);
    }
  }
}
