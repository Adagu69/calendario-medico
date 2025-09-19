import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Save, X } from "lucide-react";
import type { CalendarEvent, User, Appointment, Specialty, Office, MedicalDoctor, TimeSlot } from "@/types";
import { dataService } from "@/services/dataService";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  user: User;
  onSave: (appointment: Appointment) => void;
  onDelete: (appointmentId: string) => void;
}

export default function AppointmentModal({
  isOpen,
  onClose,
  event,
  user,
  onSave,
  onDelete
}: AppointmentModalProps) {
  const [formData, setFormData] = useState({
    patientName: "",
    patientPhone: "",
    specialtyId: "",
    doctorId: "",
    officeId: "",
    timeSlotId: "",
    date: "",
    notes: ""
  });
  const [error, setError] = useState("");
  
  // Estados para datos del backend
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [doctors, setDoctors] = useState<MedicalDoctor[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar datos del backend cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadBackendData();
    }
  }, [isOpen]);

  const loadBackendData = async () => {
    try {
      setLoading(true);
      const [specialtiesData, officesData, doctorsData, timeSlotsData] = await Promise.all([
        dataService.getSpecialties(),
        dataService.getOffices(),
        dataService.getDoctors(),
        dataService.getTimeSlots()
      ]);
      
      console.log('Doctors data from backend:', doctorsData);
      console.log('Sample doctor structure:', doctorsData[0]);
      console.log('Time slots data from backend:', timeSlotsData);
      console.log('Sample time slot structure:', timeSlotsData[0]);
      
      setSpecialties(specialtiesData);
      setOffices(officesData);
      setDoctors(doctorsData as unknown as MedicalDoctor[]);
      setTimeSlots(timeSlotsData);
    } catch (error) {
      console.error('Error loading backend data:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (event && event.extendedProps) {
      setFormData({
        patientName: event.extendedProps.patientName || "",
        patientPhone: event.extendedProps.patientPhone || "",
        specialtyId: event.extendedProps.specialtyId || "",
        doctorId: event.extendedProps.doctorId || "",
        officeId: event.extendedProps.officeId || "",
        timeSlotId: event.extendedProps.timeSlotId || "",
        date: event.start ? new Date(event.start).toISOString().split('T')[0] : "",
        notes: event.extendedProps.notes || ""
      });
    } else {
      // Resetear formulario para nuevo turno
      setFormData({
        patientName: "",
        patientPhone: "",
        specialtyId: "",
        doctorId: "",
        officeId: "",
        timeSlotId: "",
        date: "",
        notes: ""
      });
    }
    setError("");
  }, [event, isOpen]);

  const isEditing = Boolean(event);
  const isReadOnly = user.role === "viewer";

  const availableSpecialties = user.role === "admin" 
    ? specialties
    : specialties.filter((s: Specialty) => user.specialtyAccess.includes(s.id));

  const availableDoctors = formData.specialtyId
    ? doctors.filter((d: any) => {
        // Intentar varias formas de acceder a las especialidades del doctor
        if (d.specialtyIds && Array.isArray(d.specialtyIds)) {
          return d.specialtyIds.includes(formData.specialtyId);
        }
        if (d.specialty_ids && Array.isArray(d.specialty_ids)) {
          return d.specialty_ids.includes(formData.specialtyId);
        }
        if (d.specialty && d.specialty === formData.specialtyId) {
          return true;
        }
        if (d.specialty_id && d.specialty_id === formData.specialtyId) {
          return true;
        }
        // Si no encontramos info de especialidad, mostrar todos
        return true;
      })
    : doctors;  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.patientName.trim()) {
      setError("El nombre del paciente es requerido");
      return;
    }
    if (!formData.specialtyId) {
      setError("La especialidad es requerida");
      return;
    }
    if (!formData.doctorId) {
      setError("El médico es requerido");
      return;
    }
    if (!formData.officeId) {
      setError("El consultorio es requerido");
      return;
    }
    if (!formData.timeSlotId) {
      setError("El horario es requerido");
      return;
    }
    if (!formData.date) {
      setError("La fecha es requerida");
      return;
    }

    const appointment: Appointment = {
      id: event?.id || `apt_${Date.now()}`,
      patientName: formData.patientName.trim(),
      patientPhone: formData.patientPhone.trim(),
      specialtyId: formData.specialtyId,
      doctorId: formData.doctorId,
      officeId: formData.officeId,
      timeSlotId: formData.timeSlotId,
      date: formData.date,
      notes: formData.notes.trim(),
      status: "scheduled",
      createdAt: event?.extendedProps?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(appointment);
  };

  const handleDelete = () => {
    if (event?.id && window.confirm("¿Está seguro de que desea eliminar este turno?")) {
      onDelete(event.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {isEditing ? "Detalles del Turno" : "Nuevo Turno"}
            {isEditing && !isReadOnly && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patientName">Nombre del Paciente *</Label>
              <Input
                id="patientName"
                value={formData.patientName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  patientName: e.target.value
                }))}
                disabled={isReadOnly}
                placeholder="Ingrese el nombre completo"
              />
            </div>

            <div>
              <Label htmlFor="patientPhone">Teléfono</Label>
              <Input
                id="patientPhone"
                value={formData.patientPhone}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  patientPhone: e.target.value
                }))}
                disabled={isReadOnly}
                placeholder="Número de contacto"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="specialtyId">Especialidad *</Label>
              <Select 
                value={formData.specialtyId} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  specialtyId: value,
                  doctorId: "" // Reset doctor when specialty changes
                }))}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar especialidad" />
                </SelectTrigger>
                <SelectContent>
                  {availableSpecialties.map(specialty => (
                    <SelectItem key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="doctorId">Médico *</Label>
              <Select 
                value={formData.doctorId} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  doctorId: value
                }))}
                disabled={isReadOnly || !formData.specialtyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar médico" />
                </SelectTrigger>
                <SelectContent>
                  {availableDoctors.map((doctor: any) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.name || doctor.first_name + ' ' + doctor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="officeId">Consultorio *</Label>
              <Select 
                value={formData.officeId} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  officeId: value
                }))}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar consultorio" />
                </SelectTrigger>
                <SelectContent>
                  {offices.map((office: Office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="timeSlotId">Horario *</Label>
              <Select 
                value={formData.timeSlotId} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  timeSlotId: value
                }))}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar horario" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot: any) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.name || `${slot.start_time || slot.startTime} - ${slot.end_time || slot.endTime}`}
                      {slot.start_time && slot.end_time && ` (${slot.start_time} - ${slot.end_time})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  date: e.target.value
                }))}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              disabled={isReadOnly}
              placeholder="Observaciones adicionales..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              {isReadOnly ? "Cerrar" : "Cancelar"}
            </Button>
            {!isReadOnly && (
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? "Actualizar" : "Guardar"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
