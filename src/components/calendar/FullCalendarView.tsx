import { useState, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
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
  Filter, 
  Plus, 
  LogOut, 
  Settings,
  Users,
  Building,
  Clock,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { 
  User, 
  CalendarEvent, 
  CalendarFilters,
  Specialty,
  Office,
  MedicalDoctor
} from "@/types";
import { dataService, appointmentService } from "@/services/dataService";
import AppointmentModal from "./AppointmentModal";
import "./FullCalendarStyles.css";

interface FullCalendarViewProps {
  user: User;
  onLogout: () => void;
}

export default function FullCalendarView({ user, onLogout }: FullCalendarViewProps) {
  const [view, setView] = useState("dayGridMonth");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CalendarFilters>({
    specialties: user.role === "admin" ? [] : user.specialtyAccess,
    offices: [],
    doctors: []
  });

  // Estados para datos del backend
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [doctors, setDoctors] = useState<MedicalDoctor[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Limpiar caché para obtener datos frescos
        dataService.clearCache();

        // Cargar datos en paralelo
        const [specialtiesData, officesData, doctorsData, eventsData] = await Promise.all([
          dataService.getSpecialties(),
          dataService.getOffices(),
          dataService.getDoctors(),
          appointmentService.getCalendarEvents()
        ]);

        setSpecialties(specialtiesData);
        setOffices(officesData);
        setDoctors(doctorsData);
        setCalendarEvents(eventsData);

        console.log('FullCalendar - Specialties loaded:', specialtiesData);
        console.log('FullCalendar - Offices loaded:', officesData);
        console.log('FullCalendar - Doctors loaded:', doctorsData);
        console.log('FullCalendar - Events loaded:', eventsData);

      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error al cargar los datos. Verifica que el backend esté funcionando.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filtrar especialidades según el rol del usuario
  const availableSpecialties = useMemo(() => {
    if (user.role === "admin") {
      return specialties;
    }
    return specialties.filter(s => user.specialtyAccess.includes(s.id));
  }, [user, specialties]);

  // Eventos del calendario filtrados
  const filteredEvents = useMemo(() => {
    let events = calendarEvents;
    console.log('Filtering events. Total events:', events.length);
    console.log('Current filters:', filters);

    // Filtrar por especialidades
    if (filters.specialties.length > 0) {
      const beforeCount = events.length;
      events = events.filter(event => 
        event.extendedProps.appointment?.specialtyId && 
        filters.specialties.includes(event.extendedProps.appointment.specialtyId)
      );
      console.log(`Specialty filter: ${beforeCount} -> ${events.length}`);
    }

    // Filtrar por consultorios
    if (filters.offices.length > 0) {
      const beforeCount = events.length;
      events = events.filter(event => 
        event.extendedProps.appointment?.officeId && 
        filters.offices.includes(event.extendedProps.appointment.officeId)
      );
      console.log(`Office filter: ${beforeCount} -> ${events.length}`);
    }

    // Filtrar por doctores
    if (filters.doctors.length > 0) {
      const beforeCount = events.length;
      events = events.filter(event => 
        event.extendedProps.appointment?.doctorId && 
        filters.doctors.includes(event.extendedProps.appointment.doctorId)
      );
      console.log(`Doctor filter: ${beforeCount} -> ${events.length}`);
    }

    console.log('Final filtered events:', events.length);
    return events;
  }, [calendarEvents, filters]);

  const handleEventClick = (clickInfo: any) => {
    const event: CalendarEvent = {
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.start.toISOString(),
      end: clickInfo.event.end.toISOString(),
      backgroundColor: clickInfo.event.backgroundColor,
      borderColor: clickInfo.event.borderColor,
      textColor: clickInfo.event.textColor,
      extendedProps: clickInfo.event.extendedProps
    };
    
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleDateClick = () => {
    if (user.role === "admin") {
      // Solo admin puede crear nuevos turnos
      setSelectedEvent(null);
      setIsModalOpen(true);
    }
  };

  const handleFilterChange = (filterType: keyof CalendarFilters, values: string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values
    }));
  };

  const handleSaveAppointment = async (appointmentData: any) => {
    try {
      if (selectedEvent) {
        // Actualizar cita existente
        await appointmentService.updateAppointment(selectedEvent.id, appointmentData);
      } else {
        // Crear nueva cita
        await appointmentService.createAppointment({
          ...appointmentData,
          appointment_date: appointmentData.date
        });
      }
      
      // Recargar eventos
      const newEvents = await appointmentService.getCalendarEvents();
      setCalendarEvents(newEvents);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving appointment:', error);
      // Aquí podrías mostrar un toast de error
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      await appointmentService.deleteAppointment(appointmentId);
      
      // Recargar eventos
      const newEvents = await appointmentService.getCalendarEvents();
      setCalendarEvents(newEvents);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      // Aquí podrías mostrar un toast de error
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando sistema de turnos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
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
                Sistema de Turnos Médicos
              </h1>
            </div>
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role === "admin" ? "Administrador" : "Visualizador"}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar con filtros */}
        <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Vista del calendario */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Vista
              </h3>
              <Select value={view} onValueChange={setView}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dayGridMonth">Mes</SelectItem>
                  <SelectItem value="timeGridWeek">Semana</SelectItem>
                  <SelectItem value="timeGridDay">Día</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtros por especialidad */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Especialidades
              </h3>
              <div className="space-y-2">
                {availableSpecialties.map(specialty => (
                  <label key={specialty.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.specialties.includes(specialty.id)}
                      onChange={(e) => {
                        const newSpecialties = e.target.checked
                          ? [...filters.specialties, specialty.id]
                          : filters.specialties.filter(id => id !== specialty.id);
                        handleFilterChange("specialties", newSpecialties);
                      }}
                      className="rounded"
                      disabled={user.role === "viewer"}
                    />
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: specialty.color }}
                      />
                      <span className="text-sm">{specialty.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtros por consultorio */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Consultorios
              </h3>
              <div className="space-y-2">
                {offices.map(office => (
                  <label key={office.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.offices.includes(office.id)}
                      onChange={(e) => {
                        const newOffices = e.target.checked
                          ? [...filters.offices, office.id]
                          : filters.offices.filter(id => id !== office.id);
                        handleFilterChange("offices", newOffices);
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{office.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtros por médico */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Médicos
              </h3>
              <div className="space-y-2">
                {doctors.map((doctor: any) => (
                  <label key={doctor.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.doctors.includes(doctor.id)}
                      onChange={(e) => {
                        const newDoctors = e.target.checked
                          ? [...filters.doctors, doctor.id]
                          : filters.doctors.filter(id => id !== doctor.id);
                        handleFilterChange("doctors", newDoctors);
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Estadísticas */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Resumen</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Turnos visibles: {filteredEvents.length}</p>
                <p>Especialidades: {filters.specialties.length || "Todas"}</p>
                <p>Consultorios: {filters.offices.length || "Todos"}</p>
              </div>
            </div>

            {user.role === "admin" && (
              <Button className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Turno
              </Button>
            )}
          </div>
        </div>

        {/* Área principal del calendario */}
        <div className="flex-1 p-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Calendario de Turnos
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)]">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                initialView={view}
                editable={user.role === "admin"}
                selectable={user.role === "admin"}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                events={filteredEvents}
                eventClick={handleEventClick}
                select={handleDateClick}
                height="100%"
                locale="es"
                timeZone="America/Argentina/Buenos_Aires"
                slotMinTime="08:00:00"
                slotMaxTime="23:00:00"
                allDaySlot={false}
                eventDisplay="block"
                displayEventTime={true}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para ver/editar turnos */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={selectedEvent}
        user={user}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
      />
    </div>
  );
}
