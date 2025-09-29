import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, Calendar, Save } from 'lucide-react';
import type { DayPopoverProps, SGHTimeSlot } from '@/types/sgh-types';

const DayPopover: React.FC<DayPopoverProps> = ({
  day,
  monthData,
  timeSlots,
  selectedSlots,
  onSlotsChange,
  onClose,
  isOpen
}) => {
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>(selectedSlots);
  const [notes, setNotes] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Cargar datos iniciales cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedSlotIds(selectedSlots);
      // TODO: Cargar notes del día desde el store
      setNotes('');
      setHasChanges(false);
    }
  }, [isOpen, selectedSlots]);
  
  // Detectar cambios
  useEffect(() => {
    const slotsChanged = JSON.stringify(selectedSlotIds.sort()) !== JSON.stringify(selectedSlots.sort());
    setHasChanges(slotsChanged);
  }, [selectedSlotIds, selectedSlots]);
  
  const handleSlotToggle = (slotId: number, checked: boolean) => {
    setSelectedSlotIds(prev => {
      if (checked) {
        return [...prev, slotId];
      } else {
        return prev.filter(id => id !== slotId);
      }
    });
  };
  
  const handleSave = () => {
    onSlotsChange(selectedSlotIds);
    setHasChanges(false);
    onClose();
  };
  
  const handleCancel = () => {
    setSelectedSlotIds(selectedSlots);
    setNotes('');
    setHasChanges(false);
    onClose();
  };
  
  const getSelectedSlots = (): SGHTimeSlot[] => {
    return timeSlots.filter(slot => selectedSlotIds.includes(slot.id));
  };
  
  const formatDayName = (day: number, month: number, year: number): string => {
    const date = new Date(year, month - 1, day);
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dayNames[date.getDay()];
  };
  
  const sortedTimeSlots = [...timeSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const selectedSlotsData = getSelectedSlots();
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            {formatDayName(day, monthData.month, monthData.year)} {day}
          </DialogTitle>
          <DialogDescription>
            Selecciona los horarios para el {day} de {monthData.month}/{monthData.year}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Lista de horarios disponibles */}
          <div>
            <Label className="text-sm font-medium">Horarios disponibles:</Label>
            <div className="mt-2 space-y-3 max-h-60 overflow-y-auto">
              {sortedTimeSlots.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay horarios definidos para este mes</p>
                  <p className="text-xs">Configura horarios primero</p>
                </div>
              ) : (
                sortedTimeSlots.map(slot => {
                  const isSelected = selectedSlotIds.includes(slot.id);
                  
                  return (
                    <div
                      key={slot.id}
                      className={`
                        flex items-center space-x-3 p-3 rounded-lg border transition-all
                        ${isSelected 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Checkbox
                        id={`slot-${slot.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked: boolean) => handleSlotToggle(slot.id, checked)}
                      />
                      
                      <div className="flex-1">
                        <Label 
                          htmlFor={`slot-${slot.id}`} 
                          className="cursor-pointer flex items-center gap-2"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: slot.color }}
                          />
                          <span className="font-medium">{slot.name}</span>
                          <span className="text-sm text-gray-500">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </Label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Horarios seleccionados */}
          {selectedSlotsData.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Horarios seleccionados:</Label>
              <div className="mt-3 flex flex-wrap gap-3">
                {selectedSlotsData.map(slot => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleSlotToggle(slot.id, false)}
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: slot.color }}
                    title={`${slot.name} (${slot.startTime} - ${slot.endTime})`}
                    aria-label={`Quitar horario ${slot.name}`}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Notas */}
          <div>
            <Label htmlFor="day-notes" className="text-sm font-medium">
              Notas del día (opcional):
            </Label>
            <Textarea
              id="day-notes"
              placeholder="Agregar notas o comentarios para este día..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <div className="flex items-center text-sm text-gray-500">
            {hasChanges && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                Cambios sin guardar
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DayPopover;
