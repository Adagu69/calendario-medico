import { useState, useMemo, useRef, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  parse,
  differenceInHours,
} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Plus, Trash, Palette, RotateCcw, Clock, Save } from "lucide-react";
import html2canvas from "html2canvas";
import { saveToLocalStorage, loadFromLocalStorage } from "@/lib/storage";
import { scheduleService } from "../services/medicalApi";
import type { DesignSettings, User, Shift } from "@/types";
import type { ExtendedDoctor } from "../types/medical";
import "./ExportStyles.css";

// This combines the new API response with the legacy fields the component UI needs
interface ComponentDoctor extends ExtendedDoctor {
  name: string;
  specialty: string;
  shifts: Shift[];
  schedule: { [date: string]: string[] };
}

/** Logo de la clínica (reemplaza con tu recurso real) */
const CLINIC_LOGO = "/images/logito1.png";

/** Paleta disponible para nuevos turnos */
const COLOR_OPTIONS = [
  "bg-yellow-400",
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-400",
];

const FONT_OPTIONS = [
  { value: "'Montserrat', sans-serif", label: "Montserrat" },
  { value: "'Lato', sans-serif", label: "Lato" },
  { value: "'Roboto', sans-serif", label: "Roboto" },
  { value: "'Open Sans', sans-serif", label: "Open Sans" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
];

const DEFAULT_DESIGN_SETTINGS: DesignSettings = {
  fontFamily: "'Montserrat', sans-serif",
  backgroundColor: "#ffffff",
  textColor: "#374151",
  dayCellColor: "#f9fafb",
  doctorPhotoSize: 128,
  clinicLogoSize: 112,
  headerColor: "#be185d", // Default to a rose color
  accentColor: "#be185d",
  doctorNameSize: 20,
  specialtySize: 14,
};

/** Función para convertir mes en inglés a español */
const getSpanishMonth = (date: Date): string => {
  const months = {
    'January': 'ENERO',
    'February': 'FEBRERO', 
    'March': 'MARZO',
    'April': 'ABRIL',
    'May': 'MAYO',
    'June': 'JUNIO',
    'July': 'JULIO',
    'August': 'AGOSTO',
    'September': 'SEPTIEMBRE',
    'October': 'OCTUBRE',
    'November': 'NOVIEMBRE',
    'December': 'DICIEMBRE'
  };
  const englishMonth = format(date, 'MMMM');
  return months[englishMonth as keyof typeof months] || englishMonth.toUpperCase();
 };

const generateDefaultAvatar = (name: string) => {
  const initials = name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  const color = colors[name.length % colors.length];

  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="60" fill="${color}"/>
      <text x="60" y="70" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">${initials}</text>
    </svg>
  `)}`;
};

/******************** UTILS ************************/
const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const slugify = (str: string): string =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

function getNextShiftState(current: string[], orderedIds: string[]): string[] {
  const states = [[], ...orderedIds.map((id) => [id]), orderedIds];
  const idx = states.findIndex((s) => arraysEqual(s, current));
  return states[(idx + 1) % states.length];
}

interface DoctorCalendarProps {
  user: User;
  doctors: ExtendedDoctor[];
  onChangesDetected?: () => void;
}

export default function DoctorCalendar({ user, doctors: initialDoctors, onChangesDetected }: DoctorCalendarProps) {
  const [doctors, setDoctors] = useState<ComponentDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [designSettings, setDesignSettings] = useState<DesignSettings>(DEFAULT_DESIGN_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const adaptedDoctors: ComponentDoctor[] = initialDoctors.map((d) => ({
      ...d,
      name: d.name,
      specialty: d.specialties?.map(s => s.name).join(', ') || 'Sin especialidad',
      shifts: [],
      schedule: {},
    }));
    setDoctors(adaptedDoctors);

    if (initialDoctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(String(initialDoctors[0].id));
    }

  }, [initialDoctors]);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!selectedDoctorId) return;

      setIsLoading(true);
      try {
        const monthStr = format(currentMonth, "yyyy-MM");
        const schedule = await scheduleService.getDoctorSchedule(Number(selectedDoctorId), monthStr);
        if (schedule) {
          setDoctors(prevDoctors => prevDoctors.map(doc => {
            if (String(doc.id) === selectedDoctorId) {
              const newSchedule = (schedule.shifts as any).reduce((acc: { [x: string]: any; }, shift: { date: string | number | Date; time_slot_ids: any; }) => {
                const dateKey = format(new Date(shift.date), 'yyyy-MM-dd');
                acc[dateKey] = shift.time_slot_ids;
                return acc;
              }, {} as { [key: string]: string[] });

              return { ...doc, shifts: (schedule as any).time_slots || [], schedule: newSchedule };
            }
            return doc;
          }));
        }
      } catch (error) {
        console.error("Error fetching schedule data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();

    const savedSettings = loadFromLocalStorage<DesignSettings>("designSettings");
    if (savedSettings) {
      setDesignSettings({ ...DEFAULT_DESIGN_SETTINGS, ...savedSettings });
    }
  }, [currentMonth, selectedDoctorId]);

  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [openShiftEditor, setOpenShiftEditor] = useState(false);
  const [isDesignStudioOpen, setDesignStudioOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveToLocalStorage("designSettings", designSettings);
  }, [designSettings]);

  const selectedDoctor = doctors.find((d) => String(d.id) === selectedDoctorId) || doctors[0];

  const weeks = useMemo(() => {
    if (!selectedDoctor) return [];
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows = [];
    let day = startDate;
    while (day <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const iso = format(day, "yyyy-MM-dd");
        week.push({
          date: day,
          iso,
          shifts: selectedDoctor.schedule[iso] || [],
          disabled: !isSameMonth(day, monthStart),
        });
        day = addDays(day, 1);
      }
      rows.push(week);
    }
    return rows;
  }, [currentMonth, selectedDoctor]);

  const totalHours = useMemo(() => {
    if (!selectedDoctor) return 0;

    return Object.entries(selectedDoctor.schedule).reduce((total, [, shiftIds]) => {
      const dayHours = shiftIds.reduce((dayTotal, shiftId) => {
        const shift = selectedDoctor.shifts.find(s => s.id === shiftId);
        if (shift && shift.start_time && shift.end_time) {
          try {
            const start = parse(shift.start_time, 'HH:mm', new Date());
            const end = parse(shift.end_time, 'HH:mm', new Date());
            return dayTotal + differenceInHours(end, start);
          } catch (e) {
            return dayTotal;
          }
        }
        return dayTotal;
      }, 0);
      return total + dayHours;
    }, 0);
  }, [selectedDoctor]);

  if (!selectedDoctor) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          {isLoading ? 'Cargando...' : 'No hay doctores en esta sección.'}
        </p>
      </div>
    );
  }

  const orderedShiftIds = selectedDoctor.shifts.map((s) => s.id);

  const handleDayClick = (isoDate: string) => {
    if (!selectedDoctorId) return;

    const currentShifts = selectedDoctor.schedule[isoDate] || [];
    const nextShifts = getNextShiftState(currentShifts, orderedShiftIds);

    setDoctors((prev) =>
      prev.map((d) =>
        String(d.id) === selectedDoctorId
          ? { ...d, schedule: { ...d.schedule, [isoDate]: nextShifts } }
          : d
      )
    );

    if (onChangesDetected) onChangesDetected();
  };

  const handleSaveAll = async () => {
    if (!selectedDoctorId || !selectedDoctor) return;

    try {
      const monthStr = format(currentMonth, "yyyy-MM");
      
      const schedulePayload = {
        doctor_id: Number(selectedDoctorId),
        month: monthStr,
        section_id: selectedDoctor.section_id,
        theme_config: designSettings,
        time_slots: selectedDoctor.shifts.map(s => ({ name: s.label, start_time: s.start_time, end_time: s.end_time, color: s.color, id: s.id })),
        shifts: Object.entries(selectedDoctor.schedule).map(([date, time_slot_ids]) => ({
          date,
          time_slot_ids,
        })),
      };

      await scheduleService.saveSchedule(schedulePayload as any);
      alert("Calendario guardado con éxito");
    } catch (error) {
      console.error("Error saving calendar:", error);
      alert("Error al guardar el calendario. Por favor, inténtalo de nuevo.");
    }
  };

  const handleExport = async () => {
    if (!containerRef.current) return;
    
    try {
      const cloneElement = containerRef.current.cloneNode(true) as HTMLElement;
      cloneElement.className = `${containerRef.current.className} exporting`;
      document.body.appendChild(cloneElement);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(cloneElement, { 
        background: designSettings.backgroundColor,
        useCORS: true,
        allowTaint: false,
      });
      
      document.body.removeChild(cloneElement);
      
      const dataUrl = canvas.toDataURL(`image/${exportFormat}`, 0.98);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${selectedDoctor.name.replace(/\s+/g, "_")}_${getSpanishMonth(currentMonth)}_${format(currentMonth, "yyyy")}.${exportFormat}`;
      link.click();
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar el calendario. Inténtalo de nuevo.');
    }
  };

  const updateDoctorShifts = (newShifts: typeof selectedDoctor.shifts) => {
    setDoctors((prev) =>
      prev.map((d) => (String(d.id) === selectedDoctorId ? { ...d, shifts: newShifts } : d))
    );
  };

  return (
    <>
      <div className="max-w-[900px] mx-auto mb-4 export-hidden">
        <div className="flex flex-wrap gap-3 justify-center items-center bg-white p-4 rounded-lg shadow-md border">
          <Select value={selectedDoctorId ?? undefined} onValueChange={setSelectedDoctorId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Selecciona doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {`${d.name} – ${d.specialty}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="secondary" 
            onClick={() => setOpenShiftEditor(true)}
          >
            Horarios
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => setDesignStudioOpen(true)}
            className="gap-1"
          >
            <Palette className="h-4 w-4" /> Diseño
          </Button>

          <Button onClick={handleSaveAll} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="h-4 w-4" /> Guardar Calendario
          </Button>
          
          <div className="flex items-center gap-2 ml-auto">
            <Select value={exportFormat} onValueChange={(value: "png" | "jpeg") => setExportFormat(value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpeg">JPG</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} className="gap-1 bg-green-600 hover:bg-green-700">
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </div>
        </div>
      </div>

      <Card 
        ref={containerRef} 
        className="max-w-[900px] mx-auto p-0 overflow-hidden shadow-xl"
        style={{ backgroundColor: designSettings.backgroundColor, fontFamily: designSettings.fontFamily }}
        data-export-calendar="true"
      >
        <div className={`text-white flex items-center justify-between p-6 relative`} style={{ backgroundColor: designSettings.headerColor }}>
          <img src={CLINIC_LOGO} alt="logo clínica" className="w-auto" style={{ height: `${designSettings.clinicLogoSize}px` }}/>
          <div className="text-center flex-1">
            <h1 className="font-semibold text-white" style={{ fontSize: `${designSettings.doctorNameSize}px` }}>
              {selectedDoctor.name}
            </h1>
            <p className="opacity-90 text-white" style={{ fontSize: `${designSettings.specialtySize}px` }}>
              {selectedDoctor.specialty}
            </p>
          </div>
          <img 
            src={selectedDoctor.avatar_url || generateDefaultAvatar(selectedDoctor.name)} 
            alt="doctor" 
            className="rounded-full border-4 border-white object-cover shadow-lg"
            style={{ width: `${designSettings.doctorPhotoSize}px`, height: `${designSettings.doctorPhotoSize}px` }}
          />
        </div>

        <CardContent className="p-6 pb-4">
          <div className="flex items-center justify-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((d) => subMonths(d, 1))} className="export-hidden hover:bg-gray-100">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className={`text-2xl md:text-3xl font-bold text-center select-none px-6`} style={{ color: designSettings.accentColor }}>
              {`ROL DE ${getSpanishMonth(currentMonth)} ${format(currentMonth, "yyyy")}`}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((d) => addMonths(d, 1))} className="export-hidden hover:bg-gray-100">
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="grid grid-cols-7 gap-3 text-center">
              {["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"].map((d) => (
                <div key={d} className={`font-bold py-3 text-sm tracking-wide`} style={{ color: designSettings.accentColor }}>
                  {d}
                </div>
              ))}
              {weeks.flat().map((day) => (
                <div
                  key={day.iso}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer border-2 transition-all duration-200 hover:shadow-md p-1`}
                  style={{ 
                    backgroundColor: day.disabled ? '#f9fafb' : designSettings.dayCellColor,
                    borderColor: day.disabled ? '#f3f4f6' : '#e5e7eb',
                    color: day.disabled ? '#d1d5db' : designSettings.textColor
                  }}
                  onClick={() => !day.disabled && handleDayClick(day.iso)}
                >
                  <span className={`text-lg font-semibold mb-1 select-none`}
                    style={{ color: isSameDay(day.date, new Date()) ? designSettings.accentColor : designSettings.textColor }}
                  >
                    {format(day.date, "d")}
                  </span>
                  <div className="flex justify-center gap-1 flex-wrap">
                    {day.shifts.map((id: string) => {
                      const shift = selectedDoctor.shifts.find((s) => s.id === id);
                      return shift ? (
                        <span
                          key={id}
                          className={`w-3 h-3 rounded-full border border-white shadow-sm ${shift.color}`}
                          title={`${shift.label} (${shift.start_time} - ${shift.end_time})`}
                        />
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-lg p-6 mt-8`} style={{ backgroundColor: designSettings.dayCellColor }}>
            <div className="flex justify-between items-center">
                <div className="flex-1">
                    <h3 className={`text-center text-lg font-semibold mb-4`} style={{ color: designSettings.accentColor }}>
                    HORARIOS DE ATENCIÓN
                    </h3>
                    <div className="flex flex-wrap justify-center gap-8 text-base">
                        {selectedDoctor.shifts.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm">
                            <span className={`w-4 h-4 rounded-full ${s.color} shadow-sm`} />
                            <span className="font-medium text-gray-700">{s.label} ({s.start_time} - {s.end_time})</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="text-center px-6 border-l">
                    <h4 className="text-lg font-semibold" style={{ color: designSettings.accentColor }}>Total Horas</h4>
                    <p className="text-3xl font-bold">{totalHours}</p>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog 
        open={openShiftEditor} 
        onOpenChange={setOpenShiftEditor}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestionar Turnos de {selectedDoctor.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            {selectedDoctor.shifts.map((s, idx) => (
              <div key={s.id} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-2">
                    <Select
                    value={s.color}
                    onValueChange={(val) => {
                        const newShifts = [...selectedDoctor.shifts];
                        newShifts[idx] = { ...s, color: val };
                        updateDoctorShifts(newShifts);
                    }}
                    >
                        <SelectTrigger className="w-full h-9">
                            <span className={`w-4 h-4 inline-block rounded-full mr-1 align-middle ${s.color}`} />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {COLOR_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                                <span className={`w-4 h-4 inline-block rounded-full mr-2 ${c}`} />
                                {c.replace("bg-", "")}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="col-span-4">
                    <Input
                    value={s.label}
                    onChange={(e) => {
                        const newShifts = [...selectedDoctor.shifts];
                        newShifts[idx] = { ...s, label: e.target.value };
                        updateDoctorShifts(newShifts);
                    }}
                    />
                </div>
                <div className="col-span-2">
                    <Input type="time" value={s.start_time} onChange={e => {
                        const newShifts = [...selectedDoctor.shifts];
                        newShifts[idx] = { ...s, start_time: e.target.value };
                        updateDoctorShifts(newShifts);
                    }} />
                </div>
                <div className="col-span-2">
                    <Input type="time" value={s.end_time} onChange={e => {
                        const newShifts = [...selectedDoctor.shifts];
                        newShifts[idx] = { ...s, end_time: e.target.value };
                        updateDoctorShifts(newShifts);
                    }} />
                </div>
                <div className="col-span-2 flex justify-end">
                    {selectedDoctor.shifts.length > 1 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                        const newShifts = selectedDoctor.shifts.filter((sh) => sh.id !== s.id);
                        const cleanedSchedule: { [date: string]: string[] } = Object.fromEntries(
                            Object.entries(selectedDoctor.schedule).map(([date, ids]) => [
                            date,
                            ids.filter((id: string) => id !== s.id),
                            ])
                        );
                        updateDoctorShifts(newShifts);
                        setDoctors((prev) =>
                            prev.map((d) =>
                            String(d.id) === selectedDoctorId ? { ...d, schedule: cleanedSchedule } : d
                            )
                        );
                        }}
                    >
                        <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                    )}
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              className="w-full gap-1"
              onClick={() => {
                const newLabel = "Nuevo Turno";
                const newColor = COLOR_OPTIONS.find((c) => !selectedDoctor.shifts.some((s) => s.color === c)) || COLOR_OPTIONS[0];
                const newId = slugify(`${newLabel}_${Date.now()}`);
                updateDoctorShifts([
                  ...selectedDoctor.shifts,
                  { id: newId, label: newLabel, color: newColor, start_time: '08:00', end_time: '12:00' },
                ]);
              }}
            >
              <Plus className="h-4 w-4" /> Agregar Turno
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpenShiftEditor(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDesignStudioOpen} onOpenChange={setDesignStudioOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Estudio de Diseño</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipografía</label>
              <Select
                value={designSettings.fontFamily}
                onValueChange={(value) => setDesignSettings(d => ({ ...d, fontFamily: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(font => (
                    <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <label className="text-sm font-medium">Color Encabezado</label>
                <Input type="color" value={designSettings.headerColor} onChange={(e) => setDesignSettings(d => ({ ...d, headerColor: e.target.value }))} className="w-full p-1" />
              </div>
               <div className="space-y-2">
                <label className="text-sm font-medium">Color Acento</label>
                <Input type="color" value={designSettings.accentColor} onChange={(e) => setDesignSettings(d => ({ ...d, accentColor: e.target.value }))} className="w-full p-1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fondo</label>
                <Input type="color" value={designSettings.backgroundColor} onChange={(e) => setDesignSettings(d => ({ ...d, backgroundColor: e.target.value }))} className="w-full p-1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Texto (Días)</label>
                <Input type="color" value={designSettings.textColor} onChange={(e) => setDesignSettings(d => ({ ...d, textColor: e.target.value }))} className="w-full p-1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Celda (Día)</label>
                <Input type="color" value={designSettings.dayCellColor} onChange={(e) => setDesignSettings(d => ({ ...d, dayCellColor: e.target.value }))} className="w-full p-1" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Ajustes de Tamaño</label>
              <div className="space-y-2">
                <div className="flex justify-between items-center"><span className="text-xs">Foto Doctor</span><span className="text-xs font-semibold">{designSettings.doctorPhotoSize}px</span></div>
                <input type="range" min="60" max="200" value={designSettings.doctorPhotoSize} onChange={e => setDesignSettings(d => ({ ...d, doctorPhotoSize: Number(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center"><span className="text-xs">Logo Clínica</span><span className="text-xs font-semibold">{designSettings.clinicLogoSize}px</span></div>
                <input type="range" min="40" max="180" value={designSettings.clinicLogoSize} onChange={e => setDesignSettings(d => ({ ...d, clinicLogoSize: Number(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center"><span className="text-xs">Nombre Doctor</span><span className="text-xs font-semibold">{designSettings.doctorNameSize}px</span></div>
                <input type="range" min="12" max="36" value={designSettings.doctorNameSize} onChange={e => setDesignSettings(d => ({ ...d, doctorNameSize: Number(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center"><span className="text-xs">Especialidad</span><span className="text-xs font-semibold">{designSettings.specialtySize}px</span></div>
                <input type="range" min="10" max="24" value={designSettings.specialtySize} onChange={e => setDesignSettings(d => ({ ...d, specialtySize: Number(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>

          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
             <Button variant="ghost" onClick={() => setDesignSettings(DEFAULT_DESIGN_SETTINGS)} className="gap-1">
              <RotateCcw className="h-4 w-4"/>
              Restaurar
            </Button>
            <Button onClick={() => setDesignStudioOpen(false)} className="flex-1">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
