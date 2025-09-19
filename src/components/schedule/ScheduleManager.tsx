import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Download, 
  Mail, 
  Users, 
  Clock,
  Plus
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import html2canvas from 'html2canvas';
import type { 
  User, 
  Specialty,
  MedicalDoctor,
  TimeSlot
} from "@/types";
import { dataService } from "@/services/dataService";

interface ScheduleManagerProps {
  user: User;
  onLogout: () => void;
  onSwitchToCalendar?: () => void;
}

interface ScheduleSlot {
  id: string;
  timeSlotId: string;
  doctorId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  isActive: boolean;
}

export default function ScheduleManager({ user, onLogout, onSwitchToCalendar }: ScheduleManagerProps) {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<MedicalDoctor[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const daysOfWeek = [
    { id: 1, name: "Lunes", short: "L" },
    { id: 2, name: "Martes", short: "M" },
    { id: 3, name: "Miércoles", short: "X" },
    { id: 4, name: "Jueves", short: "J" },
    { id: 5, name: "Viernes", short: "V" },
    { id: 6, name: "Sábado", short: "S" }
  ];

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [specialtiesData, doctorsData, timeSlotsData] = await Promise.all([
          dataService.getSpecialties(),
          dataService.getDoctors(),
          dataService.getTimeSlots()
        ]);

        setSpecialties(specialtiesData);
        setDoctors(doctorsData);
        setTimeSlots(timeSlotsData);

        // Seleccionar primera especialidad por defecto
        if (specialtiesData.length > 0) {
          setSelectedSpecialty(specialtiesData[0].id);
        }

      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error al cargar los datos del sistema.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filtrar doctores por especialidad seleccionada
  const filteredDoctors = doctors.filter((doctor: any) => {
    if (!selectedSpecialty) return false;
    
    // Verificar si el doctor tiene esta especialidad
    if (doctor.specialties && Array.isArray(doctor.specialties)) {
      return doctor.specialties.includes(selectedSpecialty);
    }
    if (doctor.specialty_ids && Array.isArray(doctor.specialty_ids)) {
      return doctor.specialty_ids.includes(selectedSpecialty);
    }
    if (doctor.specialty_id === selectedSpecialty) {
      return true;
    }
    
    return false;
  });

  // Obtener especialidad seleccionada
  const currentSpecialty = specialties.find(s => s.id === selectedSpecialty);

  // Generar horario automáticamente
  const generateSchedule = () => {
    if (!selectedSpecialty || filteredDoctors.length === 0 || timeSlots.length === 0) {
      setError("Selecciona una especialidad con doctores y horarios disponibles");
      return;
    }

    const newSchedule: ScheduleSlot[] = [];
    
    // Distribuir doctores en los días y horarios
    filteredDoctors.forEach((doctor: any, doctorIndex) => {
      timeSlots.forEach((timeSlot: any) => {
        // Asignar cada doctor a días específicos (rotación)
        const assignedDays = daysOfWeek.filter((_, dayIndex) => 
          (doctorIndex + dayIndex) % filteredDoctors.length === doctorIndex % 2
        );

        assignedDays.forEach(day => {
          newSchedule.push({
            id: `${doctor.id}-${timeSlot.id}-${day.id}`,
            timeSlotId: timeSlot.id,
            doctorId: doctor.id,
            dayOfWeek: day.id,
            isActive: true
          });
        });
      });
    });

    setScheduleSlots(newSchedule);
  };

  // Exportar como imagen
  const exportAsImage = async () => {
    if (!scheduleRef.current) return;

    try {
      const canvas = await html2canvas(scheduleRef.current, {
        useCORS: true
      });
      
      const link = document.createElement('a');
      link.download = `horario-${currentSpecialty?.name || 'especialidad'}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error al exportar imagen:', error);
      setError('Error al exportar la imagen');
    }
  };

  // Enviar por correo
  const sendByEmail = () => {
    const specialtyName = currentSpecialty?.name || 'Especialidad';
    const subject = `Horario Médico - ${specialtyName}`;
    const body = `
Horario de la especialidad: ${specialtyName}
Fecha de generación: ${new Date().toLocaleDateString()}

Doctores asignados:
${filteredDoctors.map((d: any) => `- Dr. ${d.name}`).join('\n')}

Este horario fue generado automáticamente por el Sistema de Gestión Médica.
    `.trim();

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
  };

  // Obtener doctor por ID
  const getDoctorById = (doctorId: string) => {
    return filteredDoctors.find((d: any) => d.id === doctorId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando sistema de horarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">
                Gestión de Horarios Médicos
              </h1>
            </div>
            <Badge variant="default">Administrador</Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLogout}
              className="gap-2"
            >
              Salir
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Selector de especialidad */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Especialidad
              </h3>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar especialidad" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map(specialty => (
                    <SelectItem key={specialty.id} value={specialty.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: specialty.color }}
                        />
                        {specialty.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Información de la especialidad */}
            {currentSpecialty && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: currentSpecialty.color }}
                    />
                    {currentSpecialty.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">{currentSpecialty.description}</p>
                  <p className="text-sm"><strong>Doctores:</strong> {filteredDoctors.length}</p>
                  <div className="mt-2">
                    {filteredDoctors.map((doctor: any) => (
                      <Badge key={doctor.id} variant="secondary" className="mr-1 mb-1">
                        Dr. {doctor.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Acciones */}
            <div className="space-y-3">
              <Button 
                onClick={generateSchedule}
                className="w-full gap-2"
                disabled={!selectedSpecialty || filteredDoctors.length === 0}
              >
                <Plus className="w-4 h-4" />
                Generar Horario
              </Button>
              
              {scheduleSlots.length > 0 && (
                <>
                  <Button 
                    onClick={exportAsImage}
                    variant="outline" 
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportar PNG
                  </Button>
                  
                  <Button 
                    onClick={sendByEmail}
                    variant="outline" 
                    className="w-full gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Enviar por Email
                  </Button>
                </>
              )}
            </div>

            {/* Estadísticas */}
            {scheduleSlots.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Estadísticas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Turnos asignados: {scheduleSlots.length}</p>
                    <p>Doctores: {filteredDoctors.length}</p>
                    <p>Horarios: {timeSlots.length}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Área principal - Horario */}
        <div className="flex-1 p-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horario: {currentSpecialty?.name || 'Selecciona una especialidad'}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)] overflow-auto">
              {error && (
                <Alert className="mb-4" variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {scheduleSlots.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">No hay horario generado</p>
                    <p className="text-sm">Selecciona una especialidad y genera un horario</p>
                  </div>
                </div>
              ) : (
                <div ref={scheduleRef} className="bg-white p-6 rounded-lg">
                  {/* Encabezado del horario */}
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">
                      Horario Médico - {currentSpecialty?.name}
                    </h2>
                    <p className="text-gray-600">
                      Generado el {new Date().toLocaleDateString()}
                    </p>
                  </div>

                  {/* Tabla de horarios */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-3 text-left font-semibold">
                            Horario
                          </th>
                          {daysOfWeek.map(day => (
                            <th key={day.id} className="border border-gray-300 p-3 text-center font-semibold">
                              {day.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map((timeSlot: any) => (
                          <tr key={timeSlot.id}>
                            <td className="border border-gray-300 p-3 font-medium bg-gray-50">
                              {timeSlot.name || `${timeSlot.start_time} - ${timeSlot.end_time}`}
                            </td>
                            {daysOfWeek.map(day => {
                              const slot = scheduleSlots.find(s => 
                                s.timeSlotId === timeSlot.id && s.dayOfWeek === day.id
                              );
                              const doctor = slot ? getDoctorById(slot.doctorId) : null;
                              
                              return (
                                <td key={day.id} className="border border-gray-300 p-3 text-center">
                                  {doctor ? (
                                    <div className="text-sm">
                                      <div className="font-medium">Dr. {doctor.name}</div>
                                      {doctor.phone && (
                                        <div className="text-gray-500 text-xs">{doctor.phone}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pie del horario */}
                  <div className="mt-6 text-center text-sm text-gray-500">
                    <p>Sistema de Gestión de Horarios Médicos</p>
                    <p>Clínica Médica - {new Date().getFullYear()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
