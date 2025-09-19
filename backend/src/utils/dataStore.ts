import fs from 'fs';
import path from 'path';
import type { ExtendedUser, MedicalSection, ExtendedDoctor } from '../types/medical';

const DATA_DIR = path.join(__dirname, '..', 'data', 'store');

// Asegurar que el directorio existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Rutas de archivos
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SECTIONS_FILE = path.join(DATA_DIR, 'sections.json');
const DOCTORS_FILE = path.join(DATA_DIR, 'doctors.json');

// Funciones para cargar datos
export function loadUsers(): ExtendedUser[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return [];
}

export function loadSections(): MedicalSection[] {
  try {
    if (fs.existsSync(SECTIONS_FILE)) {
      const data = fs.readFileSync(SECTIONS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading sections:', error);
  }
  return [];
}

export function loadDoctors(): ExtendedDoctor[] {
  try {
    if (fs.existsSync(DOCTORS_FILE)) {
      const data = fs.readFileSync(DOCTORS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading doctors:', error);
  }
  return [];
}

// Funciones para guardar datos
export function saveUsers(users: ExtendedUser[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('✅ Users saved to file');
  } catch (error) {
    console.error('❌ Error saving users:', error);
  }
}

export function saveSections(sections: MedicalSection[]): void {
  try {
    fs.writeFileSync(SECTIONS_FILE, JSON.stringify(sections, null, 2));
    console.log('✅ Sections saved to file');
  } catch (error) {
    console.error('❌ Error saving sections:', error);
  }
}

export function saveDoctors(doctors: ExtendedDoctor[]): void {
  try {
    fs.writeFileSync(DOCTORS_FILE, JSON.stringify(doctors, null, 2));
    console.log('✅ Doctors saved to file');
  } catch (error) {
    console.error('❌ Error saving doctors:', error);
  }
}

// Función para inicializar datos desde mockData si no existen
export function initializeDataStore() {
  // Importar datos mock
  const mockData = require('../data/mockData');
  
  if (!fs.existsSync(USERS_FILE)) {
    saveUsers(mockData.users);
  }
  
  if (!fs.existsSync(SECTIONS_FILE)) {
    saveSections(mockData.sections);
  }
  
  if (!fs.existsSync(DOCTORS_FILE)) {
    saveDoctors(mockData.doctors);
  }
}