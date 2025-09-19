import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import pool from '../database/connection';
import { ApiResponse } from '../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all specialties
router.get('/specialties', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM specialties WHERE is_active = true ORDER BY name');
      res.json({
        success: true,
        data: result.rows
      } as ApiResponse);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get specialties error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    } as ApiResponse);
  }
});

// Get all offices
router.get('/offices', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM offices WHERE is_active = true ORDER BY name');
      res.json({
        success: true,
        data: result.rows
      } as ApiResponse);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get offices error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    } as ApiResponse);
  }
});

// Get all time slots
router.get('/time-slots', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM time_slots WHERE is_active = true ORDER BY start_time');
      res.json({
        success: true,
        data: result.rows
      } as ApiResponse);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get time slots error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    } as ApiResponse);
  }
});

// Get all doctors
router.get('/doctors', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM doctors WHERE is_active = true ORDER BY name');
      res.json({
        success: true,
        data: result.rows
      } as ApiResponse);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    } as ApiResponse);
  }
});

export default router;
