import React, { useState } from 'react';
import { useCalendarStore } from '@/store/calendar-store';
import HeaderPicker from './HeaderPicker';
import CalendarGrid from './CalendarGrid';
import DayPopover from './DayPopover';
import SlotsModal from './SlotsModal';
import ThemeModal from './ThemeModal';
import type { SGHDoctor, SGHSpecialty } from '@/types/sgh-types';

interface CalendarAppProps {
  doctors: SGHDoctor[];
  specialties: SGHSpecialty[];
  defaultDoctorId?: number;
  defaultSpecialtyId?: number;
}

const CalendarApp: React.FC<CalendarAppProps> = ({
  doctors,
  specialties,
  defaultDoctorId,
  defaultSpecialtyId
}) => {
  // Estado del calendario
  const [currentMonthNum, setCurrentMonthNum] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(defaultDoctorId);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | undefined>(defaultSpecialtyId);
  
  // Estado de modales
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isDayPopoverOpen, setIsDayPopoverOpen] = useState(false);
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  
  // Zustand store
  const {
    currentMonth: monthData,
    timeSlots,
    error,
    updateDay,
    setTimeSlots,
    updateTheme,
    getDaySlots
  } = useCalendarStore();
  
  // Manejadores del header
  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonthNum(month);
    setCurrentYear(year);
  };
  
  const handleYearChange = (year: number) => {
    setCurrentYear(year);
  };
  
  const handleDoctorChange = (doctor: SGHDoctor) => {
    setSelectedDoctorId(doctor.id);
  };
  
  const handleSpecialtyChange = (specialty: SGHSpecialty) => {
    setSelectedSpecialtyId(specialty.id);
  };
  
  // Manejadores del calendario
  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setIsDayPopoverOpen(true);
  };
  
  const handleDaySlotChange = (slotIds: number[]) => {
    if (selectedDay) {
      updateDay(selectedDay, slotIds);
    }
  };
  
  const handleDayUpdate = (day: number, slotIds: number[]) => {
    updateDay(day, slotIds);
  };
  
  // Manejadores de modales
  const handleSlotsManage = () => {
    setIsSlotsModalOpen(true);
  };
  
  const handleThemeCustomize = () => {
    setIsThemeModalOpen(true);
  };
  
  const handleSlotsUpdate = (slots: typeof timeSlots) => {
    setTimeSlots(slots);
  };
  
  const handleThemeUpdate = (theme: typeof monthData.themeConfig) => {
    updateTheme(theme);
  };
  
  // Obtener slots para el día seleccionado
  const getSelectedDaySlots = (): number[] => {
    if (!selectedDay) return [];
    return getDaySlots(selectedDay).map(slot => slot.id);
  };
  
  // Generar días para el grid del calendario
  const generateCalendarDays = () => {
    const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonthNum - 1, 1).getDay();
    
    const days = [];
    
    // Días del mes anterior (espacios vacíos)
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const daySlots = getDaySlots(day);
      days.push({
        day,
        date: new Date(currentYear, currentMonthNum - 1, day),
        isToday: new Date().toDateString() === new Date(currentYear, currentMonthNum - 1, day).toDateString(),
        isWeekend: [0, 6].includes(new Date(currentYear, currentMonthNum - 1, day).getDay()),
        slots: daySlots,
        hasContent: daySlots.length > 0
      });
    }
    
    return days;
  };
  
  // Validar que hay doctor y especialidad seleccionados
  const hasValidSelection = selectedDoctorId && selectedSpecialtyId;
  
  if (!hasValidSelection) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Selecciona Doctor y Especialidad
          </h3>
          <p className="text-gray-600 max-w-md">
            Para comenzar a gestionar el calendario mensual, primero selecciona un doctor y su especialidad correspondiente.
          </p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Error al cargar el calendario
          </h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <HeaderPicker
        currentMonth={currentMonthNum}
        currentYear={currentYear}
        doctors={doctors}
        specialties={specialties}
        selectedDoctorId={selectedDoctorId}
        selectedSpecialtyId={selectedSpecialtyId}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
        onDoctorChange={handleDoctorChange}
        onSpecialtyChange={handleSpecialtyChange}
        onSlotsManage={handleSlotsManage}
        onThemeCustomize={handleThemeCustomize}
        monthStatus={monthData?.status}
      />
      
      {/* Calendario Principal */}
      <div className="flex-1 p-4">
        {monthData ? (
          <CalendarGrid
            monthData={monthData}
            timeSlots={timeSlots}
            days={{}}
            onDayClick={handleDayClick}
            onDayUpdate={handleDayUpdate}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p>No hay datos para este mes</p>
              <p className="text-sm mt-1">Los datos se crearán automáticamente al agregar horarios</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Día */}
      {selectedDay && monthData && (
        <DayPopover
          day={selectedDay}
          monthData={monthData}
          timeSlots={timeSlots}
          selectedSlots={getSelectedDaySlots()}
          onSlotsChange={handleDaySlotChange}
          onClose={() => {
            setIsDayPopoverOpen(false);
            setSelectedDay(null);
          }}
          isOpen={isDayPopoverOpen}
        />
      )}
      
      {/* Modal de Horarios */}
      {monthData && (
        <SlotsModal
          monthData={monthData}
          timeSlots={timeSlots}
          onSlotsUpdate={handleSlotsUpdate}
          onClose={() => setIsSlotsModalOpen(false)}
          isOpen={isSlotsModalOpen}
        />
      )}
      
      {/* Modal de Tema */}
      {monthData && (
        <ThemeModal
          currentTheme={monthData.themeConfig}
          onThemeUpdate={handleThemeUpdate}
          onClose={() => setIsThemeModalOpen(false)}
          isOpen={isThemeModalOpen}
        />
      )}
    </div>
  );
};

export default CalendarApp;