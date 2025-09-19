import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Plus } from 'lucide-react';
import type { 
  CalendarGridProps, 
  CalendarMonth, 
  CalendarWeek, 
  CalendarDay,
  SGHTimeSlot 
} from '@/types/sgh-types';

// Utilidad para generar el calendario
const generateCalendarMonth = (
  year: number, 
  month: number, 
  timeSlots: SGHTimeSlot[], 
  days: { [day: number]: any }
): CalendarMonth => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay()); // Comenzar en domingo
  
  const weeks: CalendarWeek[] = [];
  let currentWeek: CalendarDay[] = [];
  let weekNumber = 1;
  
  // Generar 6 semanas para cubrir todo el mes
  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const dayNumber = currentDate.getDate();
    const isCurrentMonth = currentDate.getMonth() === month - 1;
    const isToday = currentDate.toDateString() === new Date().toDateString();
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    
    // Obtener slots del día si está en el mes actual
    const dayData = isCurrentMonth ? days[dayNumber] : null;
    const daySlots = dayData ? 
      timeSlots.filter(slot => dayData.timeSlotIds.includes(slot.id)) : [];
    
    const calendarDay: CalendarDay = {
      day: dayNumber,
      isCurrentMonth,
      isToday,
      isWeekend,
      slots: daySlots,
      hasContent: daySlots.length > 0
    };
    
    currentWeek.push(calendarDay);
    
    // Completar semana
    if (currentWeek.length === 7) {
      weeks.push({
        days: currentWeek,
        weekNumber
      });
      currentWeek = [];
      weekNumber++;
    }
  }
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  return {
    year,
    month,
    weeks,
    monthName: monthNames[month - 1]
  };
};

const CalendarGrid: React.FC<CalendarGridProps> = ({ 
  monthData, 
  timeSlots, 
  days, 
  onDayClick, 
  onDayUpdate, 
  isReadOnly = false 
}) => {
  const calendarMonth = useMemo(() => 
    generateCalendarMonth(monthData.year, monthData.month, timeSlots, days),
    [monthData.year, monthData.month, timeSlots, days]
  );
  
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const renderTimeSlotBadges = (slots: SGHTimeSlot[]) => {
    if (slots.length === 0) return null;
    
    if (slots.length === 1) {
      const slot = slots[0];
      return (
        <Badge 
          variant="secondary" 
          className="text-xs truncate w-full justify-center"
          style={{ 
            backgroundColor: slot.color + '20', 
            borderColor: slot.color,
            color: slot.color 
          }}
        >
          {slot.name}
        </Badge>
      );
    }
    
    // Múltiples slots - mostrar indicadores de color
    return (
      <div className="flex gap-1 flex-wrap">
        {slots.slice(0, 3).map((slot, index) => (
          <div
            key={slot.id}
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: slot.color }}
            title={`${slot.name} (${slot.startTime}-${slot.endTime})`}
          />
        ))}
        {slots.length > 3 && (
          <div className="w-3 h-3 rounded-full bg-gray-400 flex items-center justify-center">
            <span className="text-xs text-white">+</span>
          </div>
        )}
      </div>
    );
  };
  
  const handleDayClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth || isReadOnly) return;
    onDayClick(day.day);
  };
  
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">
            {calendarMonth.monthName} {calendarMonth.year}
          </h2>
          <Badge variant={monthData.status === 'published' ? 'default' : 'secondary'}>
            {monthData.status === 'published' ? 'Publicado' : 'Borrador'}
          </Badge>
        </div>
        
        {!isReadOnly && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Clock className="w-4 h-4 mr-2" />
              Horarios
            </Button>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Copiar mes anterior
            </Button>
          </div>
        )}
      </div>
      
      {/* Encabezado de días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendario */}
      <div className="space-y-1">
        {calendarMonth.weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.days.map((day, dayIndex) => {
              const dayKey = `${weekIndex}-${dayIndex}`;
              
              return (
                <div
                  key={dayKey}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[80px] p-2 border rounded-lg transition-all cursor-pointer
                    ${day.isCurrentMonth 
                      ? 'bg-white hover:bg-blue-50 border-gray-200' 
                      : 'bg-gray-50 border-gray-100 text-gray-400'
                    }
                    ${day.isToday ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                    ${day.isWeekend && day.isCurrentMonth ? 'bg-gray-50' : ''}
                    ${day.hasContent ? 'border-blue-300' : ''}
                    ${!day.isCurrentMonth || isReadOnly ? 'cursor-default' : 'hover:shadow-sm'}
                  `}
                >
                  <div className="flex flex-col h-full">
                    {/* Número del día */}
                    <div className="flex justify-between items-start mb-1">
                      <span className={`
                        text-sm font-medium
                        ${day.isToday ? 'text-blue-600 font-bold' : ''}
                        ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                      `}>
                        {day.day}
                      </span>
                      
                      {/* Indicador de contenido */}
                      {day.hasContent && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    
                    {/* Slots del día */}
                    <div className="flex-1 flex flex-col gap-1">
                      {day.isCurrentMonth && renderTimeSlotBadges(day.slots)}
                    </div>
                    
                    {/* Nota si hay notas */}
                    {day.isCurrentMonth && days[day.day]?.notes && (
                      <div className="mt-1 text-xs text-gray-500 truncate" title={days[day.day].notes}>
                        📝 {days[day.day].notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Leyenda */}
      {timeSlots.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Horarios:</h4>
          <div className="flex flex-wrap gap-2">
            {timeSlots.map(slot => (
              <Badge
                key={slot.id}
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: slot.color,
                  color: slot.color,
                  backgroundColor: slot.color + '10'
                }}
              >
                {slot.name} ({slot.startTime}-{slot.endTime})
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Estado de guardado */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>Dr. {monthData.doctor?.name || 'Sin asignar'}</span>
          <span>•</span>
          <span>{monthData.specialty?.name || 'Sin especialidad'}</span>
        </div>
        
        {monthData.updatedAt && (
          <span>
            Última actualización: {new Date(monthData.updatedAt).toLocaleString()}
          </span>
        )}
      </div>
    </Card>
  );
};

export default CalendarGrid;