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
import { ChevronLeft, ChevronRight, Download, Plus, Trash, Users, Palette, RotateCcw, Save, Clock } from "lucide-react";
import html2canvas from "html2canvas";
import DoctorManager from "./DoctorManager";
import { saveToLocalStorage, loadFromLocalStorage } from "@/lib/storage";
import { scheduleService, settingsService, doctorService } from "../services/medicalApi";
import type { Doctor, DesignSettings, User } from "@/types";
import type { ExtendedDoctor, ExtendedUser, SystemSettings, DoctorSchedule } from "../types/medical";
import "./ExportStyles.css";

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

/** Ejemplo de datos iniciales */
const INITIAL_DOCTORS: Doctor[] = [
  {
    id: "gudiel",
    name: "Dr. Jorge Gudiel",
    specialty: "Pediatría",
    photo: "/images/doctor-ejemplo.svg",
    shifts: [
      { id: "morning", label: "8:00 am – 2:00 pm", color: "bg-yellow-400" },
      { id: "afternoon", label: "4:00 pm – 8:00 pm", color: "bg-red-500" },
    ],
    schedule: {
      "2025-07-01": ["morning", "afternoon"],
      "2025-07-02": ["morning"],
      "2025-07-03": ["afternoon"],
      "2025-07-05": ["morning", "afternoon"],
      "2025-07-07": ["morning"],
      "2025-07-10": ["afternoon"],
      "2025-07-14": ["morning"],
      "2025-07-16": ["afternoon"],
      "2025-07-21": ["morning", "afternoon"],
      "2025-07-28": ["morning"],
    },
  },
  {
    id: "valdez",
    name: "Dra. Carla Valdez",
    specialty: "Cardiología",
    photo: "/images/doctora-ejemplo.svg",
    shifts: [
      { id: "morning", label: "9:00 am – 1:00 pm", color: "bg-blue-500" },
      { id: "afternoon", label: "3:00 pm – 7:00 pm", color: "bg-green-500" },
    ],
    schedule: {
      "2025-07-02": ["morning"],
      "2025-07-05": ["morning", "afternoon"],
      "2025-07-08": ["morning"],
      "2025-07-12": ["morning"],
      "2025-07-15": ["afternoon"],
      "2025-07-18": ["morning"],
      "2025-07-22": ["morning", "afternoon"],
      "2025-07-25": ["afternoon"],
      "2025-07-29": ["morning"],
    },
  },
  {
    id: "martinez",
    name: "Dr. Luis Martínez",
    specialty: "Neurología",
    photo: "/images/doctor-ejemplo.svg",
    shifts: [
      { id: "morning", label: "7:00 am – 1:00 pm", color: "bg-purple-500" },
    ],
    schedule: {
      "2025-07-04": ["morning"],
      "2025-07-06": ["morning"],
      "2025-07-11": ["morning"],
      "2025-07-13": ["morning"],
      "2025-07-17": ["morning"],
      "2025-07-20": ["morning"],
      "2025-07-24": ["morning"],
      "2025-07-27": ["morning"],
      "2025-07-31": ["morning"],
    },
  },
];

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
  onChangesDetected?: () => void;
}

export default function DoctorCalendar({ user, onChangesDetected }: DoctorCalendarProps) {
  // Permisos según el rol
  const isAdmin = user.role === 'admin';
  const isViewer = user.role === 'viewer';
    // Cargar datos iniciales de forma más eficiente
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(INITIAL_DOCTORS[0].id);
  const [designSettings, setDesignSettings] = useState<DesignSettings>(DEFAULT_DESIGN_SETTINGS);

  useEffect(() => {
    const savedDoctors = loadFromLocalStorage<Doctor[]>("doctors");
    if (savedDoctors && savedDoctors.length > 0) {
      setDoctors(savedDoctors);
      setSelectedDoctorId(savedDoctors[0].id);
    }

    const savedSettings = loadFromLocalStorage<DesignSettings>("designSettings");
    if (savedSettings) {
      setDesignSettings({ ...DEFAULT_DESIGN_SETTINGS, ...savedSettings });
    }
  }, []);
  
  const [currentMonth, setCurrentMonth] = useState(new Date("2025-07-01"));
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [openShiftEditor, setOpenShiftEditor] = useState(false);
  const [openDoctorManager, setOpenDoctorManager] = useState(false);
  // const [isExporting, setIsExporting] = useState(false);
  const [isDesignStudioOpen, setDesignStudioOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persistir cambios cuando doctors cambie
  useEffect(() => {
    saveToLocalStorage("doctors", doctors);
  }, [doctors]);

  useEffect(() => {
    saveToLocalStorage("designSettings", designSettings);
  }, [designSettings]);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];
  const orderedShiftIds = selectedDoctor.shifts.map((s) => s.id);

  /** Matriz de semanas/días para la vista */
  const weeks = useMemo(() => {
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
  }, [currentMonth, selectedDoctor.schedule, selectedDoctorId]);

  /** Maneja click en día del calendario */
  const handleDayClick = (isoDate: string) => {
    const currentShifts = selectedDoctor.schedule[isoDate] || [];
    const nextShifts = getNextShiftState(currentShifts, orderedShiftIds);
    
    setDoctors((prev) =>
      prev.map((d) =>
        d.id === selectedDoctorId
          ? {
              ...d,
              schedule: { ...d.schedule, [isoDate]: nextShifts },
            }
          : d
      )
    );
    
    // Notificar cambios detectados
    if (onChangesDetected) {
      onChangesDetected();
    }
  };  /** Exporta calendario visible */
  const handleExport = async () => {
    if (!containerRef.current) return;
    
    try {
      const originalElement = containerRef.current;
      
      // Crear un clon del elemento para exportación
      const cloneElement = originalElement.cloneNode(true) as HTMLElement;
      
      // Configurar el clon para exportación
      cloneElement.className = `${originalElement.className} exporting`;
      cloneElement.style.position = 'absolute';
      cloneElement.style.top = '-9999px';
      cloneElement.style.left = '0';
      cloneElement.style.width = 'auto';
      cloneElement.style.height = 'auto';
      cloneElement.style.maxWidth = 'none';
      cloneElement.style.transform = 'none';
      cloneElement.style.backgroundColor = designSettings.backgroundColor;
      cloneElement.style.fontFamily = designSettings.fontFamily;
      
      // Añadir el clon al DOM temporalmente
      document.body.appendChild(cloneElement);
      
      // Esperar a que se renderice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Obtener las dimensiones del clon
      const rect = cloneElement.getBoundingClientRect();
      
      // Capturar el clon
      const canvas = await html2canvas(cloneElement, { 
        background: designSettings.backgroundColor,
        width: rect.width || 900,
        height: rect.height || 600,
        useCORS: true,
        allowTaint: false,
        logging: false
      });
      
      // Eliminar el clon del DOM
      document.body.removeChild(cloneElement);
      
      // Crear y descargar la imagen
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

  /** Actualiza shifts del doctor en estado global */
  const updateDoctorShifts = (newShifts: typeof selectedDoctor.shifts) => {
    setDoctors((prev) =>
      prev.map((d) => (d.id === selectedDoctorId ? { ...d, shifts: newShifts } : d))
    );
  };

  /** Funciones para gestión de doctores */
  const handleAddDoctor = (newDoctor: Doctor) => {
    setDoctors(prev => [...prev, newDoctor]);
    setSelectedDoctorId(newDoctor.id);
    setOpenDoctorManager(false);
  };

  const handleEditDoctor = (id: string, updatedDoctor: Doctor) => {
    setDoctors(prev => prev.map(d => d.id === id ? updatedDoctor : d));
    if (id === selectedDoctorId) {
      setSelectedDoctorId(updatedDoctor.id);
    }
  };

  const handleDeleteDoctor = (id: string) => {
    if (doctors.length <= 1) {
      alert("No puedes eliminar el último doctor. Debe haber al menos uno.");
      return;
    }
    
    const confirmed = confirm("¿Estás seguro de que deseas eliminar este doctor? Se perderán todos sus horarios y turnos asignados.");
    if (!confirmed) return;
    
    setDoctors(prev => prev.filter(d => d.id !== id));
    
    if (selectedDoctorId === id) {
      const remainingDoctors = doctors.filter(d => d.id !== id);
      if (remainingDoctors.length > 0) {
        setSelectedDoctorId(remainingDoctors[0].id);
      }
    }
  };

  /*************** RENDER ****************/ 
  return (
    <>
      {/* Controles de gestión - FUERA del calendario */}
      <div className="max-w-[900px] mx-auto mb-4 export-hidden">
        <div className="flex flex-wrap gap-3 justify-center items-center bg-white p-4 rounded-lg shadow-md border">
          {/* Doctor selector */}
          <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Selecciona doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {`${d.name} – ${d.specialty}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Botones de gestión */}
          <Button 
            variant="outline" 
            onClick={() => setOpenDoctorManager(true)}
            className="gap-1"
          >
            <Users className="h-4 w-4" /> Gestionar
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => setOpenShiftEditor(true)}
          >
            Horarios
          </Button>
          
          {/* Botón de Diseño */}
          <Button 
            variant="secondary" 
            onClick={() => setDesignStudioOpen(true)}
            className="gap-1"
          >
            <Palette className="h-4 w-4" /> Diseño
          </Button>
          
          {/* Exportación */}
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

      {/* Calendario principal - LIMPIO para redes sociales */}
      <Card 
        ref={containerRef} 
        className="max-w-[900px] mx-auto p-0 overflow-hidden shadow-xl"
        style={{ backgroundColor: designSettings.backgroundColor, fontFamily: designSettings.fontFamily }}
        data-export-calendar="true"
      >
        {/* Header */}
        <div className={`text-white flex items-center justify-between p-6 relative`} style={{ backgroundColor: designSettings.headerColor }}>
          <img 
            src={CLINIC_LOGO} 
            alt="logo clínica" 
            className="w-auto" 
            style={{ height: `${designSettings.clinicLogoSize}px` }}
          />
          <div className="text-center flex-1">
            <h1 
              className="font-semibold text-white"
              style={{ fontSize: `${designSettings.doctorNameSize}px` }}
            >
              {selectedDoctor.name}
            </h1>
            <p 
              className="opacity-90 text-white"
              style={{ fontSize: `${designSettings.specialtySize}px` }}
            >
              {selectedDoctor.specialty}
            </p>
          </div>
          <img 
            src={selectedDoctor.photo} 
            alt="doctor" 
            className="rounded-full border-4 border-white object-cover shadow-lg"
            style={{
              width: `${designSettings.doctorPhotoSize}px`,
              height: `${designSettings.doctorPhotoSize}px`,
            }}
          />
        </div>

        <CardContent className="p-6 pb-4">
          {/* Solo navegación del mes - CENTRADA */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
              className="export-hidden hover:bg-gray-100"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className={`text-2xl md:text-3xl font-bold text-center select-none px-6`} style={{ color: designSettings.accentColor }}>
              {`ROL DE ${getSpanishMonth(currentMonth)} ${format(currentMonth, "yyyy")}`}
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
              className="export-hidden hover:bg-gray-100"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Calendario - Mejorado estéticamente */}
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
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer border-2 transition-all duration-200 hover:shadow-md`}
                  style={{ 
                    backgroundColor: day.disabled ? '#f9fafb' : designSettings.dayCellColor,
                    borderColor: day.disabled ? '#f3f4f6' : '#e5e7eb',
                    color: day.disabled ? '#d1d5db' : designSettings.textColor
                  }}
                  onClick={() => !day.disabled && handleDayClick(day.iso)}
                >
                  <span className={`text-lg font-semibold mb-2 select-none`}
                    style={{ color: isSameDay(day.date, new Date()) ? designSettings.accentColor : designSettings.textColor }}
                  >
                    {format(day.date, "d")}
                  </span>
                  <div className="flex flex-wrap justify-center gap-1">
                    {day.shifts.map((id: string) => {
                      const shift = selectedDoctor.shifts.find((s) => s.id === id);
                      return shift ? (
                        <span 
                          key={id} 
                          className={`w-3 h-3 rounded-full ${shift.color} shadow-sm`} 
                        />
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LEGEND - Más estética */}
          <div className={`rounded-lg p-6 mt-8`} style={{ backgroundColor: designSettings.dayCellColor }}>
            <h3 className={`text-center text-lg font-semibold mb-4`} style={{ color: designSettings.accentColor }}>
              HORARIOS DE ATENCIÓN
            </h3>
            <div className="flex flex-wrap justify-center gap-8 text-base">
              {selectedDoctor.shifts.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className={`w-4 h-4 rounded-full ${s.color} shadow-sm`} />
                  <span className="font-medium text-gray-700">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shift Editor Dialog */}
      <Dialog open={openShiftEditor} onOpenChange={setOpenShiftEditor}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar horarios de {selectedDoctor.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            {selectedDoctor.shifts.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2">
                <Select
                  value={s.color}
                  onValueChange={(val) => {
                    const newShifts = [...selectedDoctor.shifts];
                    newShifts[idx] = { ...s, color: val };
                    updateDoctorShifts(newShifts);
                  }}
                >
                  <SelectTrigger className="w-32 h-9">
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
                <Input
                  value={s.label}
                  onChange={(e) => {
                    const newShifts = [...selectedDoctor.shifts];
                    newShifts[idx] = { ...s, label: e.target.value };
                    updateDoctorShifts(newShifts);
                  }}
                  className="flex-1"
                />
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
                          d.id === selectedDoctorId ? { ...d, schedule: cleanedSchedule } : d
                        )
                      );
                    }}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="secondary"
              className="w-full gap-1"
              onClick={() => {
                const newLabel = "Nuevo horario";
                const newColor = COLOR_OPTIONS.find(
                  (c) => !selectedDoctor.shifts.some((s) => s.color === c)
                ) || COLOR_OPTIONS[0];
                const newIdBase = slugify(newLabel);
                let newId = newIdBase;
                let counter = 1;
                while (selectedDoctor.shifts.some((s) => s.id === newId)) {
                  newId = `${newIdBase}_${counter++}`;
                }
                updateDoctorShifts([
                  ...selectedDoctor.shifts,
                  { id: newId, label: newLabel, color: newColor },
                ]);
              }}
            >
              <Plus className="h-4 w-4" /> Agregar horario
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpenShiftEditor(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Design Studio Dialog */}
      <Dialog open={isDesignStudioOpen} onOpenChange={setDesignStudioOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Estudio de Diseño</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <label htmlFor="font-family" className="text-sm font-medium">Tipografía</label>
              <Select
                value={designSettings.fontFamily}
                onValueChange={(value) => setDesignSettings(d => ({ ...d, fontFamily: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar fuente" />
                </SelectTrigger>
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
                <label htmlFor="header-color" className="text-sm font-medium">Color Encabezado</label>
                <Input
                  id="header-color"
                  type="color"
                  value={designSettings.headerColor}
                  onChange={(e) => setDesignSettings(d => ({ ...d, headerColor: e.target.value }))}
                  className="w-full p-1"
                />
              </div>
               <div className="space-y-2">
                <label htmlFor="accent-color" className="text-sm font-medium">Color Acento</label>
                <Input
                  id="accent-color"
                  type="color"
                  value={designSettings.accentColor}
                  onChange={(e) => setDesignSettings(d => ({ ...d, accentColor: e.target.value }))}
                  className="w-full p-1"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="background-color" className="text-sm font-medium">Fondo</label>
                <Input
                  id="background-color"
                  type="color"
                  value={designSettings.backgroundColor}
                  onChange={(e) => setDesignSettings(d => ({ ...d, backgroundColor: e.target.value }))}
                  className="w-full p-1"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="text-color" className="text-sm font-medium">Texto (Días)</label>
                <Input
                  id="text-color"
                  type="color"
                  value={designSettings.textColor}
                  onChange={(e) => setDesignSettings(d => ({ ...d, textColor: e.target.value }))}
                  className="w-full p-1"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="day-cell-color" className="text-sm font-medium">Celda (Día)</label>
                <Input
                  id="day-cell-color"
                  type="color"
                  value={designSettings.dayCellColor}
                  onChange={(e) => setDesignSettings(d => ({ ...d, dayCellColor: e.target.value }))}
                  className="w-full p-1"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Ajustes de Tamaño</label>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Foto Doctor</span>
                  <span className="text-xs font-semibold">{designSettings.doctorPhotoSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="60" 
                  max="200" 
                  value={designSettings.doctorPhotoSize}
                  onChange={e => setDesignSettings(d => ({ ...d, doctorPhotoSize: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Logo Clínica</span>
                  <span className="text-xs font-semibold">{designSettings.clinicLogoSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="40" 
                  max="180" 
                  value={designSettings.clinicLogoSize}
                  onChange={e => setDesignSettings(d => ({ ...d, clinicLogoSize: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Nombre Doctor</span>
                  <span className="text-xs font-semibold">{designSettings.doctorNameSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="12" 
                  max="36" 
                  value={designSettings.doctorNameSize}
                  onChange={e => setDesignSettings(d => ({ ...d, doctorNameSize: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Especialidad</span>
                  <span className="text-xs font-semibold">{designSettings.specialtySize}px</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="24" 
                  value={designSettings.specialtySize}
                  onChange={e => setDesignSettings(d => ({ ...d, specialtySize: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
             <Button 
              variant="ghost" 
              onClick={() => setDesignSettings(DEFAULT_DESIGN_SETTINGS)}
              className="gap-1"
            >
              <RotateCcw className="h-4 w-4"/>
              Restaurar
            </Button>
            <Button onClick={() => setDesignStudioOpen(false)} className="flex-1">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Doctor Manager Dialog */}
      <DoctorManager
        doctors={doctors}
        onAddDoctor={handleAddDoctor}
        onEditDoctor={handleEditDoctor}
        onDeleteDoctor={handleDeleteDoctor}
        isOpen={openDoctorManager}
        onClose={() => setOpenDoctorManager(false)}
      />
    </>
  );
}
