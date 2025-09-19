import type { 
  Specialty, 
  Office, 
  TimeSlot, 
  MedicalDoctor, 
  Appointment,
  CalendarEvent 
} from "@/types";

// === ESPECIALIDADES ===
export const MOCK_SPECIALTIES: Specialty[] = [
  { id: "pediatria", name: "PEDIATRÍA", color: "#10B981", description: "Atención infantil" },
  { id: "urologia", name: "UROLOGÍA PEDS", color: "#3B82F6", description: "Urología pediátrica" },
  { id: "emg", name: "EMG", color: "#8B5CF6", description: "Electromiografía" },
  { id: "nutricion", name: "NUTRICIÓN", color: "#F59E0B", description: "Nutrición clínica" },
  { id: "cardiologia", name: "CARDIOLOGÍA", color: "#EF4444", description: "Cardiología pediátrica" },
  { id: "neurologia", name: "NEUROLOGÍA", color: "#6366F1", description: "Neurología infantil" },
  { id: "endocrinologia", name: "ENDOCRINOLOGÍA", color: "#EC4899", description: "Endocrinología pediátrica" },
];

// === CONSULTORIOS ===
export const MOCK_OFFICES: Office[] = [
  { id: "c1", name: "C1", type: "consultorio" },
  { id: "c2", name: "C2", type: "consultorio" },
  { id: "c3", name: "C3", type: "consultorio" },
  { id: "c4", name: "C4", type: "consultorio" },
  { id: "espirometria", name: "Espirometría", type: "procedimiento", equipment: ["Espirómetro", "Oxímetro"] },
  { id: "ecg", name: "ECG", type: "procedimiento", equipment: ["Electrocardiógrafo"] },
  { id: "emg_sala", name: "Sala EMG", type: "procedimiento", equipment: ["Electromiógrafo"] },
];

// === FRANJAS HORARIAS ===
export const MOCK_TIMESLOTS: TimeSlot[] = [
  { id: "morning1", name: "Mañana 1", startTime: "08:00", endTime: "11:00", period: "morning" },
  { id: "morning2", name: "Mañana 2", startTime: "11:00", endTime: "14:00", period: "morning" },
  { id: "afternoon1", name: "Tarde 1", startTime: "14:00", endTime: "17:00", period: "afternoon" },
  { id: "afternoon2", name: "Tarde 2", startTime: "17:00", endTime: "20:00", period: "afternoon" },
  { id: "night", name: "Noche", startTime: "20:00", endTime: "23:00", period: "night" },
];

// === MÉDICOS ===
export const MOCK_DOCTORS: MedicalDoctor[] = [
  {
    id: "doc1",
    name: "Dr. Jorge Gudiel",
    specialties: ["pediatria"],
    specialtyIds: ["pediatria"],
    email: "j.gudiel@clinica.com",
    phone: "+54 11 1234-5678",
    license: "MN 12345",
    photo: "/images/doctor-ejemplo.svg"
  },
  {
    id: "doc2",
    name: "Dra. Carla Valdez",
    specialties: ["cardiologia", "pediatria"],
    specialtyIds: ["cardiologia", "pediatria"],
    email: "c.valdez@clinica.com",
    phone: "+54 11 2345-6789",
    license: "MN 23456",
    photo: "/images/doctora-ejemplo.svg"
  },
  {
    id: "doc3",
    name: "Dr. Luis Martínez",
    specialties: ["neurologia"],
    specialtyIds: ["neurologia"],
    email: "l.martinez@clinica.com",
    phone: "+54 11 3456-7890",
    license: "MN 34567",
    photo: "/images/doctor-ejemplo.svg"
  },
  {
    id: "doc4",
    name: "Dra. Ana García",
    specialties: ["urologia"],
    specialtyIds: ["urologia"],
    email: "a.garcia@clinica.com",
    phone: "+54 11 4567-8901",
    license: "MN 45678",
    photo: "/images/doctora-ejemplo.svg"
  },
  {
    id: "doc5",
    name: "Lic. María Rodriguez",
    specialties: ["nutricion"],
    specialtyIds: ["nutricion"],
    email: "m.rodriguez@clinica.com",
    phone: "+54 11 5678-9012",
    license: "MN 56789",
    photo: "/images/doctora-ejemplo.svg"
  },
  {
    id: "doc6",
    name: "Dr. Roberto Silva",
    specialties: ["emg", "neurologia"],
    specialtyIds: ["emg", "neurologia"],
    email: "r.silva@clinica.com",
    phone: "+54 11 6789-0123",
    license: "MN 67890",
    photo: "/images/doctor-ejemplo.svg"
  },
  {
    id: "doc7",
    name: "Dra. Laura Pérez",
    specialties: ["endocrinologia", "pediatria"],
    specialtyIds: ["endocrinologia", "pediatria"],
    email: "l.perez@clinica.com",
    phone: "+54 11 7890-1234",
    license: "MN 78901",
    photo: "/images/doctora-ejemplo.svg"
  }
];

// === TURNOS DE EJEMPLO ===
export const MOCK_APPOINTMENTS: Appointment[] = [
  // Julio 2025
  {
    id: "apt1",
    patientName: "María González",
    patientPhone: "+54 11 9876-5432",
    doctorId: "doc1",
    specialtyId: "pediatria",
    officeId: "c1",
    timeSlotId: "morning1",
    date: "2025-07-15",
    status: "scheduled",
    notes: "Control rutinario",
    createdAt: "2025-07-01T10:00:00Z",
    updatedAt: "2025-07-01T10:00:00Z"
  },
  {
    id: "apt2",
    patientName: "Carlos Rodríguez",
    patientPhone: "+54 11 8765-4321",
    doctorId: "doc1",
    specialtyId: "pediatria",
    officeId: "c1",
    timeSlotId: "afternoon1",
    date: "2025-07-15",
    status: "scheduled",
    notes: "Vacunación",
    createdAt: "2025-07-02T14:00:00Z",
    updatedAt: "2025-07-02T14:00:00Z"
  },
  {
    id: "apt3",
    patientName: "Ana Fernández",
    patientPhone: "+54 11 7654-3210",
    doctorId: "doc2",
    specialtyId: "cardiologia",
    officeId: "c2",
    timeSlotId: "morning1",
    date: "2025-07-16",
    status: "scheduled",
    notes: "Electrocardiograma",
    createdAt: "2025-07-03T09:00:00Z",
    updatedAt: "2025-07-03T09:00:00Z"
  },
  {
    id: "apt4",
    patientName: "Roberto López",
    patientPhone: "+54 11 6543-2109",
    doctorId: "doc4",
    specialtyId: "urologia",
    officeId: "c3",
    timeSlotId: "morning2",
    date: "2025-07-17",
    status: "scheduled",
    notes: "Consulta de control",
    createdAt: "2025-07-04T11:00:00Z",
    updatedAt: "2025-07-04T11:00:00Z"
  },
  {
    id: "apt5",
    patientName: "Elena Martín",
    patientPhone: "+54 11 5432-1098",
    doctorId: "doc5",
    specialtyId: "nutricion",
    officeId: "c4",
    timeSlotId: "afternoon1",
    date: "2025-07-18",
    status: "scheduled",
    notes: "Plan nutricional",
    createdAt: "2025-07-05T15:00:00Z",
    updatedAt: "2025-07-05T15:00:00Z"
  },
  {
    id: "apt6",
    patientName: "Diego Silva",
    patientPhone: "+54 11 4321-0987",
    doctorId: "doc6",
    specialtyId: "emg",
    officeId: "emg_sala",
    timeSlotId: "morning1",
    date: "2025-07-19",
    status: "scheduled",
    notes: "Electromiografía",
    createdAt: "2025-07-06T08:00:00Z",
    updatedAt: "2025-07-06T08:00:00Z"
  },
  {
    id: "apt7",
    patientName: "Lucía Romero",
    patientPhone: "+54 11 3210-9876",
    doctorId: "doc3",
    specialtyId: "neurologia",
    officeId: "c2",
    timeSlotId: "afternoon2",
    date: "2025-07-20",
    status: "scheduled",
    notes: "Consulta neurológica",
    createdAt: "2025-07-07T16:00:00Z",
    updatedAt: "2025-07-07T16:00:00Z"
  },
  {
    id: "apt8",
    patientName: "Miguel Torres",
    patientPhone: "+54 11 2109-8765",
    doctorId: "doc7",
    specialtyId: "endocrinologia",
    officeId: "c1",
    timeSlotId: "morning2",
    date: "2025-07-21",
    status: "scheduled",
    notes: "Control diabético",
    createdAt: "2025-07-08T10:00:00Z",
    updatedAt: "2025-07-08T10:00:00Z"
  },
  // Más turnos para agosto
  {
    id: "apt9",
    patientName: "Sofía Vega",
    patientPhone: "+54 11 1098-7654",
    doctorId: "doc1",
    specialtyId: "pediatria",
    officeId: "c1",
    timeSlotId: "morning1",
    date: "2025-08-05",
    status: "scheduled",
    notes: "Control mensual",
    createdAt: "2025-07-25T09:00:00Z",
    updatedAt: "2025-07-25T09:00:00Z"
  },
  {
    id: "apt10",
    patientName: "Andrés Morales",
    patientPhone: "+54 11 0987-6543",
    doctorId: "doc2",
    specialtyId: "cardiologia",
    officeId: "ecg",
    timeSlotId: "afternoon1",
    date: "2025-08-06",
    status: "scheduled",
    notes: "Ecocardiograma",
    createdAt: "2025-07-26T14:00:00Z",
    updatedAt: "2025-07-26T14:00:00Z"
  }
];

// === FUNCIÓN PARA GENERAR EVENTOS DEL CALENDARIO ===
export const generateCalendarEvents = (
  appointments: Appointment[],
  doctors: MedicalDoctor[],
  specialties: Specialty[],
  offices: Office[],
  timeSlots: TimeSlot[]
): CalendarEvent[] => {
  return appointments.map(appointment => {
    const doctor = doctors.find(d => d.id === appointment.doctorId);
    const specialty = specialties.find(s => s.id === appointment.specialtyId);
    const office = offices.find(o => o.id === appointment.officeId);
    const timeSlot = timeSlots.find(t => t.id === appointment.timeSlotId);

    if (!doctor || !specialty || !office || !timeSlot) {
      throw new Error(`Missing data for appointment ${appointment.id}`);
    }

    const startDateTime = `${appointment.date}T${timeSlot.startTime}:00`;
    const endDateTime = `${appointment.date}T${timeSlot.endTime}:00`;

    return {
      id: appointment.id,
      title: `${doctor.name.split(' ').slice(-1)[0]} - ${office.name}`,
      start: startDateTime,
      end: endDateTime,
      backgroundColor: specialty.color,
      borderColor: specialty.color,
      textColor: '#FFFFFF',
      extendedProps: {
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialtyId: specialty.id,
        specialtyName: specialty.name,
        officeId: office.id,
        officeName: office.name,
        timeSlotId: timeSlot.id,
        appointment
      }
    };
  });
};

// === FUNCIONES DE BÚSQUEDA ===
export const getSpecialtyById = (id: string) => 
  MOCK_SPECIALTIES.find(s => s.id === id);

export const getOfficeById = (id: string) => 
  MOCK_OFFICES.find(o => o.id === id);

export const getDoctorById = (id: string) => 
  MOCK_DOCTORS.find(d => d.id === id);

export const getTimeSlotById = (id: string) => 
  MOCK_TIMESLOTS.find(t => t.id === id);

export const getDoctorsBySpecialty = (specialtyId: string) =>
  MOCK_DOCTORS.filter(d => d.specialties.includes(specialtyId));
