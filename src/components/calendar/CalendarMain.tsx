import React, { useState, useEffect } from 'react';
import { useCalendarStore } from '@/store/calendar-store';
import HeaderPicker from './HeaderPicker';
import CalendarGrid from './CalendarGrid';
import DayPopover from './DayPopover';
import SlotsModal from './SlotsModal';
import ThemeModal from './ThemeModal';
import type { SGHDoctor, SGHSpecialty, SGHMonth } from '@/types/sgh-types';

interface CalendarMainProps {
  doctors: SGHDoctor[];
  specialties: SGHSpecialty[];
  defaultDoctorId?: number;
  defaultSpecialtyId?: number;
}

const CalendarMain: React.FC<CalendarMainProps> = ({
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
    currentMonth,
    timeSlots,
    error,
    isSaving,
    loadMonth,
    updateDay,
    setTimeSlots,
    updateTheme
  } = useCalendarStore();
  
  // Cargar datos cuando cambian doctor, especialidad, mes o año
  useEffect(() => {
    if (selectedDoctorId && selectedSpecialtyId) {
      loadMonth(selectedDoctorId, selectedSpecialtyId, currentYear, currentMonth);
    }
  }, [selectedDoctorId, selectedSpecialtyId, currentYear, currentMonth, loadMonth]);
  
  // Manejadores del header
  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
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
    if (selectedDay && currentMonthData) {
      updateDaySlots(currentMonthData.id, selectedDay, slotIds);
    }
  };
  
  // Manejadores de modales
  const handleSlotsManage = () => {
    setIsSlotsModalOpen(true);
  };
  
  const handleThemeCustomize = () => {
    setIsThemeModalOpen(true);
  };
  
  const handleSlotsUpdate = (slots: typeof timeSlots) => {
    if (currentMonthData) {
      updateTimeSlots(currentMonthData.id, slots);
    }
  };
  
  const handleThemeUpdate = (theme: SGHMonth['themeConfig']) => {
    if (currentMonthData) {
      updateTheme(currentMonthData.id, theme);
    }
  };
  
  // Obtener slots para el día seleccionado
  const getSelectedDaySlots = (): number[] => {
    if (!selectedDay || !currentMonthData?.days) return [];
    
    const dayData = currentMonthData.days.find(d => d.day === selectedDay);
    return dayData?.timeSlotIds || [];
  };
  
  // Validar que hay doctor y especialidad seleccionados
  const hasValidSelection = selectedDoctorId && selectedSpecialtyId;
  
  if (!hasValidSelection) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando calendario...</p>
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
        currentMonth={currentMonth}
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
        monthStatus={currentMonthData?.status}
      />
      
      {/* Calendario Principal */}
      <div className="flex-1 p-4">
        {currentMonthData ? (
          <CalendarGrid
            monthData={currentMonthData}
            timeSlots={timeSlots}
            onDayClick={handleDayClick}
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
      {selectedDay && currentMonthData && (
        <DayPopover
          day={selectedDay}
          monthData={currentMonthData}
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
      {currentMonthData && (
        <SlotsModal
          monthData={currentMonthData}
          timeSlots={timeSlots}
          onSlotsUpdate={handleSlotsUpdate}
          onClose={() => setIsSlotsModalOpen(false)}
          isOpen={isSlotsModalOpen}
        />
      )}
      
      {/* Modal de Tema */}
      {currentMonthData && (
        <ThemeModal
          currentTheme={currentMonthData.themeConfig}
          onThemeUpdate={handleThemeUpdate}
          onClose={() => setIsThemeModalOpen(false)}
          isOpen={isThemeModalOpen}
        />
      )}
    </div>
  );
};

export default CalendarMain;