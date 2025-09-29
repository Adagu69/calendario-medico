import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, AlertTriangle, Upload, Check } from 'lucide-react';
import type { ExtendedDoctor, MedicalSection, ExtendedUser, Specialty } from '../types/medical';
import { doctorService } from '../services/medicalApi';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Checkbox } from './ui/checkbox';

interface DoctorManagementProps {
  currentUser: ExtendedUser;
  selectedSection: string;
  sections: MedicalSection[];
  specialties: Specialty[];
  onDoctorChange?: () => void;
}

interface DoctorFormData {
  name: string;
  email: string;
  phone: string;
  license: string;
  section_id: number | undefined;
  specialty_ids: number[];
  avatar_url: string;
}

const DOCTOR_FORM_INITIAL_STATE: DoctorFormData = {
  name: '',
  email: '',
  phone: '',
  license: '',
  section_id: undefined,
  specialty_ids: [],
  avatar_url: '',
};

const generateDefaultAvatar = (name: string) => {
  const initials = name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  const color = colors[name.length % colors.length];
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="60" fill="${color}"/>
      <text x="60" y="70" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">${initials}</text>
    </svg>
  `)}`;
};

export const DoctorManagement: React.FC<DoctorManagementProps> = ({
  currentUser,
  selectedSection,
  sections,
  specialties,
  onDoctorChange
}) => {
  const [doctors, setDoctors] = useState<ExtendedDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<ExtendedDoctor | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>(DOCTOR_FORM_INITIAL_STATE);

  useEffect(() => {
    if (selectedSection) {
      loadDoctors(selectedSection);
    }
  }, [selectedSection]);

  const loadDoctors = async (sectionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const doctorsData = await doctorService.getDoctorsBySection(sectionId);
      setDoctors(doctorsData.filter(doc => doc.is_active));
    } catch (err) {
      console.error('Error loading doctors:', err);
      setError('Failed to load doctors for this section.');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (doctor: ExtendedDoctor | null = null) => {
    if (doctor) {
      setEditingDoctor(doctor);
      setFormData({
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone || '',
        license: doctor.license || '',
        section_id: doctor.section_id,
        specialty_ids: doctor.specialties?.map(s => s.id) || [],
        avatar_url: doctor.avatar_url || '',
      });
    } else {
      setEditingDoctor(null);
      setFormData({
        ...DOCTOR_FORM_INITIAL_STATE,
        section_id: Number(selectedSection)
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDoctor(null);
    setFormData(DOCTOR_FORM_INITIAL_STATE);
  };

  const handleSpecialtyChange = (specialtyId: number) => {
    setFormData(prev => {
      const newSpecialtyIds = prev.specialty_ids.includes(specialtyId)
        ? prev.specialty_ids.filter(id => id !== specialtyId)
        : [...prev.specialty_ids, specialtyId];
      return { ...prev, specialty_ids: newSpecialtyIds };
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, avatar_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDoctor = async () => {
    if (!formData.name || !formData.section_id) {
      setError("Name and section are required.");
      return;
    }

    const payload = {
      ...formData,
      avatar_url: formData.avatar_url || generateDefaultAvatar(formData.name),
    };

    try {
      if (editingDoctor) {
        await doctorService.updateDoctor(editingDoctor.id, payload);
      } else {
        await doctorService.createDoctor(payload);
      }
      
      handleCloseModal();
      loadDoctors(selectedSection);
      onDoctorChange?.();

    } catch (err) {
      console.error('Error saving doctor:', err);
      setError((err as Error).message || 'Failed to save doctor.');
    }
  };

  const handleDeactivate = async (doctorId: number) => {
    if (window.confirm('Are you sure you want to deactivate this doctor?')) {
      try {
        await doctorService.deactivateDoctor(doctorId);
        loadDoctors(selectedSection);
        onDoctorChange?.();
      } catch (err) {
        console.error('Error deactivating doctor:', err);
        setError('Failed to deactivate doctor.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Gestión de Doctores</h3>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> Agregar Doctor
        </Button>
      </div>

      {error && (
        <div className="flex items-center p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
          <AlertTriangle className="mr-2 h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Cargando doctores...</div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No hay doctores para esta sección.</p>
          <p className="text-sm">Click en "Agregar Doctor" para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map(doctor => (
            <Card key={doctor.id}>
              <CardContent className="p-4 flex flex-col items-center text-center">
                <img
                  src={doctor.avatar_url || generateDefaultAvatar(doctor.name)}
                  alt={doctor.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 mb-4"
                />
                <h4 className="font-bold text-lg truncate">{doctor.name}</h4>
                <p className="text-sm text-gray-600 truncate">{doctor.specialties?.map(s => s.name).join(', ') || 'Sin especialidad'}</p>
                <p className="text-xs text-gray-500 mt-1">{doctor.email}</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => handleOpenModal(doctor)}>
                    <Edit className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeactivate(doctor.id)}>
                    <Trash className="h-4 w-4 mr-1" /> Desactivar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDoctor ? 'Editar Doctor' : 'Agregar Nuevo Doctor'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            
            <div className="flex items-center gap-4">
                <div className="relative">
                    <img
                        src={formData.avatar_url || generateDefaultAvatar(formData.name || 'A')}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover border-2"
                    />
                    <label htmlFor="photo-upload" className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full border cursor-pointer hover:bg-gray-100">
                        <Upload className="h-4 w-4 text-gray-600" />
                        <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
                <div className="flex-1 space-y-1">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Dr. Juan Pérez" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="juan.perez@example.com" />
                </div>
                <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+54 9 11 1234-5678" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="license">Nro. de Licencia</Label>
                    <Input id="license" value={formData.license} onChange={(e) => setFormData({...formData, license: e.target.value})} placeholder="A-12345" />
                </div>
                <div>
                    <Label htmlFor="section">Sección</Label>
                    <Select
                        value={formData.section_id?.toString()}
                        onValueChange={(value) => setFormData({...formData, section_id: Number(value)})}
                    >
                        <SelectTrigger>
                        <SelectValue placeholder="Seleccione una sección" />
                        </SelectTrigger>
                        <SelectContent>
                        {sections.map(sec => (
                            <SelectItem key={sec.id} value={sec.id.toString()}>
                            {sec.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
              <Label>Especialidades</Label>
              <Card className="mt-2">
                <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 max-h-48 overflow-y-auto">
                  {specialties.map(spec => (
                    <div key={spec.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`spec-${spec.id}`} 
                        checked={formData.specialty_ids.includes(spec.id)}
                        onCheckedChange={() => handleSpecialtyChange(spec.id)}
                      />
                      <Label htmlFor={`spec-${spec.id}`} className="font-normal">{spec.name}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>Cancelar</Button>
            <Button onClick={handleSaveDoctor}>
                {editingDoctor ? 'Guardar Cambios' : 'Crear Doctor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};