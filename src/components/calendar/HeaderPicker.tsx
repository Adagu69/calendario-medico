import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Settings,
  Clock,
  Palette,
  User
} from 'lucide-react';
import type { HeaderPickerProps } from '@/types/sgh-types';

const HeaderPicker: React.FC<HeaderPickerProps> = ({
  currentMonth,
  currentYear,
  doctors,
  specialties,
  selectedDoctorId,
  selectedSpecialtyId,
  onMonthChange,
  onYearChange,
  onDoctorChange,
  onSpecialtyChange,
  onSlotsManage,
  onThemeCustomize,
  monthStatus = 'draft'
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const currentDate = new Date();
  const currentDateMonth = currentDate.getMonth() + 1;
  const currentDateYear = currentDate.getFullYear();
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 1) {
        onMonthChange(12, currentYear - 1);
      } else {
        onMonthChange(currentMonth - 1, currentYear);
      }
    } else {
      if (currentMonth === 12) {
        onMonthChange(1, currentYear + 1);
      } else {
        onMonthChange(currentMonth + 1, currentYear);
      }
    }
  };
  
  const goToToday = () => {
    onMonthChange(currentDateMonth, currentDateYear);
  };
  
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
  const selectedSpecialty = specialties.find(s => s.id === selectedSpecialtyId);
  
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { 
        label: 'Borrador', 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: '✏️'
      },
      published: { 
        label: 'Publicado', 
        className: 'bg-green-100 text-green-800 border-green-300',
        icon: '✅'
      }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        {config.icon} {config.label}
      </span>
    );
  };
  
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Navegación de Fecha */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-lg text-gray-900">
                  {monthNames[currentMonth - 1]} {currentYear}
                </span>
              </button>
              
              {isDatePickerOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mes
                      </label>
                      <Select
                        value={currentMonth.toString()}
                        onValueChange={(value) => onMonthChange(parseInt(value), currentYear)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {monthNames.map((month, index) => (
                            <SelectItem key={index} value={(index + 1).toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Año
                      </label>
                      <Input
                        type="number"
                        min="2020"
                        max="2030"
                        value={currentYear}
                        onChange={(e) => onYearChange(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToToday}
                    >
                      Hoy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDatePickerOpen(false)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {getStatusBadge(monthStatus)}
          </div>
        </div>
        
        {/* Selectores de Doctor y Especialidad */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <Select
              value={selectedDoctorId?.toString() || ''}
              onValueChange={(value) => {
                const doctor = doctors.find(d => d.id === parseInt(value));
                if (doctor) onDoctorChange(doctor);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(doctor => (
                  <SelectItem key={doctor.id} value={doctor.id.toString()}>
                    Dr. {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Especialidad:</span>
            <Select
              value={selectedSpecialtyId?.toString() || ''}
              onValueChange={(value) => {
                const specialty = specialties.find(s => s.id === parseInt(value));
                if (specialty) onSpecialtyChange(specialty);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar especialidad" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map(specialty => (
                  <SelectItem key={specialty.id} value={specialty.id.toString()}>
                    {specialty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Botones de Acción */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSlotsManage}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Horarios
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onThemeCustomize}
            className="flex items-center gap-2"
          >
            <Palette className="w-4 h-4" />
            Tema
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Más
          </Button>
        </div>
      </div>
      
      {/* Información del Doctor/Especialidad Seleccionado */}
      {(selectedDoctor || selectedSpecialty) && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            {selectedDoctor && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {selectedDoctor.name[0]}{selectedDoctor.name[1] || 'D'}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    Dr. {selectedDoctor.name}
                  </div>
                  {selectedSpecialty && (
                    <div className="text-sm text-gray-600">
                      {selectedSpecialty.name}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderPicker;