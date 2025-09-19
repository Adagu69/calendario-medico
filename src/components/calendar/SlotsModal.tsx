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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Edit, Clock, Palette, Save, X } from 'lucide-react';
import type { SlotsModalProps, SGHTimeSlot, TimeSlotForm } from '@/types/sgh-types';

const SlotsModal: React.FC<SlotsModalProps> = ({
  monthData,
  timeSlots,
  onSlotsUpdate,
  onClose,
  isOpen
}) => {
  const [slots, setSlots] = useState<SGHTimeSlot[]>([]);
  const [editingSlot, setEditingSlot] = useState<SGHTimeSlot | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<TimeSlotForm>({
    name: '',
    startTime: '',
    endTime: '',
    color: '#3B82F6'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Cargar slots cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setSlots([...timeSlots]);
      setEditingSlot(null);
      setIsCreating(false);
      resetForm();
    }
  }, [isOpen, timeSlots]);
  
  const resetForm = () => {
    setFormData({
      name: '',
      startTime: '',
      endTime: '',
      color: '#3B82F6'
    });
    setErrors({});
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Hora de inicio requerida';
    }
    
    if (!formData.endTime) {
      newErrors.endTime = 'Hora de fin requerida';
    }
    
    if (formData.startTime && formData.endTime) {
      if (formData.startTime >= formData.endTime) {
        newErrors.endTime = 'La hora de fin debe ser posterior a la de inicio';
      }
      
      // Verificar overlaps con otros slots
      const otherSlots = slots.filter(slot => 
        editingSlot ? slot.id !== editingSlot.id : true
      );
      
      const hasOverlap = otherSlots.some(slot => {
        return (
          (formData.startTime >= slot.startTime && formData.startTime < slot.endTime) ||
          (formData.endTime > slot.startTime && formData.endTime <= slot.endTime) ||
          (formData.startTime <= slot.startTime && formData.endTime >= slot.endTime)
        );
      });
      
      if (hasOverlap) {
        newErrors.startTime = 'Este horario se superpone con otro existente';
      }
    }
    
    if (!formData.color.match(/^#[0-9A-Fa-f]{6}$/)) {
      newErrors.color = 'Color debe ser en formato hexadecimal (#RRGGBB)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSaveSlot = () => {
    if (!validateForm()) return;
    
    if (editingSlot) {
      // Editar slot existente
      setSlots(prev => prev.map(slot => 
        slot.id === editingSlot.id 
          ? { ...slot, ...formData }
          : slot
      ));
      setEditingSlot(null);
    } else {
      // Crear nuevo slot
      const newSlot: SGHTimeSlot = {
        id: Date.now(), // ID temporal
        monthId: monthData.id,
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        color: formData.color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setSlots(prev => [...prev, newSlot]);
      setIsCreating(false);
    }
    
    resetForm();
  };
  
  const handleEditSlot = (slot: SGHTimeSlot) => {
    setEditingSlot(slot);
    setFormData({
      name: slot.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      color: slot.color
    });
    setIsCreating(false);
  };
  
  const handleDeleteSlot = (slotId: number) => {
    setSlots(prev => prev.filter(slot => slot.id !== slotId));
    if (editingSlot?.id === slotId) {
      setEditingSlot(null);
      resetForm();
    }
  };
  
  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingSlot(null);
    resetForm();
  };
  
  const handleCancelEdit = () => {
    setEditingSlot(null);
    setIsCreating(false);
    resetForm();
  };
  
  const handleSave = () => {
    onSlotsUpdate(slots);
    onClose();
  };
  
  const handleCancel = () => {
    setSlots([...timeSlots]);
    resetForm();
    setEditingSlot(null);
    setIsCreating(false);
    onClose();
  };
  
  const sortedSlots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const isFormVisible = isCreating || !!editingSlot;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Gestionar Horarios - {monthData.month}/{monthData.year}
          </DialogTitle>
          <DialogDescription>
            Configura los horarios disponibles para este mes
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Lista de horarios */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Horarios configurados:</Label>
              <Button
                size="sm"
                onClick={handleCreateNew}
                className="flex items-center gap-2"
                disabled={isFormVisible}
              >
                <Plus className="w-4 h-4" />
                Nuevo horario
              </Button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sortedSlots.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No hay horarios configurados</p>
                  <p className="text-xs">Crea el primer horario</p>
                </div>
              ) : (
                sortedSlots.map(slot => (
                  <div
                    key={slot.id}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border
                      ${editingSlot?.id === slot.id 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-gray-50 border-gray-200'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: slot.color }}
                      />
                      <div>
                        <div className="font-medium">{slot.name}</div>
                        <div className="text-sm text-gray-500">
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditSlot(slot)}
                        disabled={isFormVisible}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteSlot(slot.id)}
                        disabled={isFormVisible}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Formulario de edición/creación */}
          {isFormVisible && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-blue-600" />
                <Label className="font-medium">
                  {editingSlot ? 'Editar horario' : 'Nuevo horario'}
                </Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="slot-name">Nombre del horario</Label>
                  <Input
                    id="slot-name"
                    placeholder="ej: Mañana, Tarde, Noche..."
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={errors.name ? 'border-red-300' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="start-time">Hora de inicio</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className={errors.startTime ? 'border-red-300' : ''}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-red-600 mt-1">{errors.startTime}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="end-time">Hora de fin</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className={errors.endTime ? 'border-red-300' : ''}
                  />
                  {errors.endTime && (
                    <p className="text-sm text-red-600 mt-1">{errors.endTime}</p>
                  )}
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="slot-color">Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="slot-color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      placeholder="#3B82F6"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className={`flex-1 ${errors.color ? 'border-red-300' : ''}`}
                    />
                  </div>
                  {errors.color && (
                    <p className="text-sm text-red-600 mt-1">{errors.color}</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveSlot}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingSlot ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between">
          <div className="flex items-center text-sm text-gray-500">
            {slots.length !== timeSlots.length && (
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
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Guardar cambios
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SlotsModal;