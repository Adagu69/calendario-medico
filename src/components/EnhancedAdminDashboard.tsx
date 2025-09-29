import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Settings, 
  FileText, 
  Save, 
  Download, 
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  UserCog,
  ClipboardList,
  Building // Icon for Sections
} from 'lucide-react';
import DoctorCalendar from './DoctorCalendar';
import { DoctorManagement } from './DoctorManagement';
import UserManagement from './admin/UserManagement';
import { SectionManagement } from './admin/SectionManagement';
import { SpecialtyManagement } from './admin/SpecialtyManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { sectionService, doctorService, settingsService, specialtyService, reportService } from '../services/medicalApi';
import { usersAPI } from '../services/api';
import type { ExtendedUser, MedicalSection, ExtendedDoctor, SystemSettings, Specialty } from '../types/medical';

interface EnhancedAdminDashboardProps {
  user: ExtendedUser;
  onLogout: () => void;
}

export const EnhancedAdminDashboard: React.FC<EnhancedAdminDashboardProps> = ({
  user, 
  onLogout 
}) => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [activeSection, setActiveSection] = useState<string>('');
  const [sections, setSections] = useState<MedicalSection[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]); // Keep specialties for forms
  const [doctors, setDoctors] = useState<ExtendedDoctor[]>([]);
  const [sectionChiefCount, setSectionChiefCount] = useState<number>(user.role === 'jefe' ? 1 : 0);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeSection) {
      loadSectionDoctors();
      loadSectionChiefCount(activeSection);
    }
  }, [activeSection]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [sectionsData, specialtiesData] = await Promise.all([
        sectionService.getAllSections(),
        specialtyService.getAllSpecialties()
      ]);
      
      setSections(sectionsData);
      setSpecialties(specialtiesData);
      
      if (user.role === 'jefe' && user.section_id) {
        setActiveSection(String(user.section_id));
      } else if (sectionsData.length > 0) {
        setActiveSection(String(sectionsData[0].id));
      }
      
      try {
        const settings = await settingsService.getSettings();
        setSystemSettings(settings);
      } catch (error) {
        console.log('No settings found, using defaults');
      }
      
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSectionDoctors = async () => {
    const sectionId = user.role === 'admin' ? activeSection : user.section_id;

    if (!sectionId) {
      setDoctors([]);
      return;
    }

    try {
      const doctorsData = await doctorService.getDoctorsBySection(sectionId);
      setDoctors(doctorsData);
    } catch (error) {
      console.error('Error loading doctors:', error);
      setDoctors([]);
    }
  };

  const loadSectionChiefCount = async (sectionId: string) => {
    if (user.role === 'jefe') {
      setSectionChiefCount(1);
      return;
    }

    if (!sectionId || user.role !== 'admin') {
      setSectionChiefCount(0);
      return;
    }

    try {
      const response = await usersAPI.getAll();
      if (response.data?.success && Array.isArray(response.data.data)) {
        const chiefs = (response.data.data as ExtendedUser[]).filter((u) => {
          if (u.role !== 'jefe') return false;

          if (!sectionId) return true;

          if (typeof u.section_id === 'number') {
            return String(u.section_id) === sectionId;
          }

          // If the API doesn't provide section info, count the chief for global visibility
          return true;
        });

        setSectionChiefCount(chiefs.length);
      } else {
        setSectionChiefCount(0);
      }
    } catch (error) {
      console.error('Error loading section chiefs:', error);
      setSectionChiefCount(user.role === 'jefe' ? 1 : 0);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasUnsavedChanges(false);
      setLastSaved(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCalendarChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleExportExcel = async () => {
    if (!selectedMonth) return;

    try {
      setReportError(null);
      setIsGeneratingReport(true);

      const blob = await reportService.downloadMonthlySchedule({ month: selectedMonth });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-turnos-${selectedMonth}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error exporting report:', error);
      const message =
        error?.response?.data?.message ||
        'No se pudo generar el reporte. Verifica que existan turnos para los filtros seleccionados.';
      setReportError(message);
      alert(message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getSectionDisplayName = (sectionId: string) => {
    const section = sections.find(s => String(s.id) === sectionId);
    return section?.name || 'Sección no encontrada';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                TUASUSALUD - Panel de Administración
              </h1>
              <div className="ml-4 text-sm text-gray-600">
                {user.role === 'admin' ? 'Administrador General' : 'Jefe de Sección'}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {hasUnsavedChanges && (
                <div className="flex items-center text-amber-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Cambios sin guardar
                </div>
              )}
              {lastSaved && (
                <div className="flex items-center text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Guardado: {lastSaved}
                </div>
              )}
              <button
                onClick={handleSaveChanges}
                disabled={!hasUnsavedChanges || isSaving}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                  hasUnsavedChanges
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <div className="flex items-center text-sm text-gray-700">
                <span className="mr-2">{user.first_name} {user.last_name}</span>
                <button
                  onClick={onLogout}
                  className="text-red-600 hover:text-red-800"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {user.role === 'admin' && (
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Sección Activa</h3>
                <p className="text-sm text-gray-600">
                  Selecciona la sección médica que deseas administrar
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">
                  {doctors.length} doctores activos
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{doctors.length}</div>
              <div className="text-sm text-gray-600">Doctores Activos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {sectionChiefCount}
              </div>
              <div className="text-sm text-gray-600">Jefes de Sección</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {selectedMonth}
              </div>
              <div className="text-sm text-gray-600">Mes Actual</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {getSectionDisplayName(activeSection)}
              </div>
              <div className="text-sm text-gray-600">Sección</div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="calendar" className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="doctors" className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Gestión de Doctores
            </TabsTrigger>
            {user.role === 'admin' && (
              <TabsTrigger value="sections" className="flex items-center">
                <Building className="w-4 h-4 mr-2" />
                Secciones
              </TabsTrigger>
            )}
            {user.role === 'admin' && (
              <TabsTrigger value="specialties" className="flex items-center">
                <ClipboardList className="w-4 h-4 mr-2" />
                Especialidades
              </TabsTrigger>
            )}
            {user.role === 'admin' && (
              <TabsTrigger value="users" className="flex items-center">
                <UserCog className="w-4 h-4 mr-2" />
                Usuarios
              </TabsTrigger>
            )}
            <TabsTrigger value="reports" className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Reportes
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Calendario de Horarios - {getSectionDisplayName(activeSection)}
                </h3>
                <div className="flex items-center space-x-3">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(i);
                      const value = date.toISOString().slice(0, 7);
                      return (
                        <option key={value} value={value}>
                          {date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={handleExportExcel}
                    disabled={isGeneratingReport}
                    className={`bg-green-600 text-white px-4 py-2 rounded-md flex items-center text-sm transition-colors ${
                      isGeneratingReport ? 'opacity-60 cursor-not-allowed' : 'hover:bg-green-700'
                    }`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isGeneratingReport ? 'Generando...' : 'Exportar Excel'}
                  </button>
                </div>
              </div>
              
              <DoctorCalendar
                user={{
                  id: String(user.id),
                  username: user.username,
                  email: user.email,
                  role: user.role === 'admin' ? 'admin' : 'viewer',
                  specialtyAccess: user.section_id ? [String(user.section_id)] : [],
                  name: `${user.first_name} ${user.last_name}`
                }}
                doctors={doctors}
                onChangesDetected={handleCalendarChange}
              />
            </div>
          </TabsContent>

          <TabsContent value="doctors" className="space-y-4">
            <DoctorManagement
              currentUser={user}
              selectedSection={activeSection}
              sections={sections}
              specialties={specialties}
              onDoctorChange={loadSectionDoctors}
            />
          </TabsContent>

          {user.role === 'admin' && (
            <TabsContent value="sections" className="space-y-4">
              <SectionManagement onSectionsUpdate={loadInitialData} />
            </TabsContent>
          )}

          {user.role === 'admin' && (
            <TabsContent value="specialties" className="space-y-4">
              <SpecialtyManagement />
            </TabsContent>
          )}

          {user.role === 'admin' && (
            <TabsContent value="users" className="space-y-4">
              <UserManagement sections={sections} />
            </TabsContent>
          )}

          <TabsContent value="reports" className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reportes y Estadísticas
              </h3>
              {reportError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {reportError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
                    <h4 className="font-medium">Reporte Mensual</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Estadísticas de horarios y asistencia del mes
                  </p>
                  <button
                    onClick={handleExportExcel}
                    disabled={isGeneratingReport}
                    className={`w-full bg-blue-100 text-blue-700 py-2 px-3 rounded-md text-sm transition-colors ${
                      isGeneratingReport ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-200'
                    }`}
                  >
                    {isGeneratingReport ? 'Generando...' : 'Generar Reporte'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Clock className="w-5 h-5 text-amber-600 mr-2" />
                    <h4 className="font-medium">Horarios Pendientes</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Horarios que requieren aprobación
                  </p>
                  <button className="w-full bg-amber-100 text-amber-200 py-2 px-3 rounded-md text-sm hover:bg-amber-200">
                    Ver Pendientes
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Download className="w-5 h-5 text-green-600 mr-2" />
                    <h4 className="font-medium">Exportar Datos</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Exportar horarios en formato Excel
                  </p>
                  <button
                    onClick={handleExportExcel}
                    disabled={isGeneratingReport}
                    className={`w-full bg-green-100 text-green-700 py-2 px-3 rounded-md text-sm transition-colors ${
                      isGeneratingReport ? 'opacity-60 cursor-not-allowed' : 'hover:bg-green-200'
                    }`}
                  >
                    {isGeneratingReport ? 'Generando...' : 'Exportar Excel'}
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuración del Sistema
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Clínica
                  </label>
                  <input
                    type="text"
                    value={systemSettings?.clinic_name || 'TUASUSALUD'}
                    onChange={(e) => setSystemSettings(prev => 
                      prev ? { ...prev, clinic_name: e.target.value } : null
                    )}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color de Fondo
                  </label>
                  <input
                    type="color"
                    value={systemSettings?.background_color || '#ffffff'}
                    onChange={(e) => setSystemSettings(prev => 
                      prev ? { ...prev, background_color: e.target.value } : null
                    )}
                    className="w-20 h-10 border border-gray-300 rounded-md"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (systemSettings) {
                      try {
                        await settingsService.saveSettings(systemSettings);
                        alert('Configuración guardada correctamente');
                      } catch (error) {
                        alert('Error al guardar la configuración');
                      }
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Guardar Configuración
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
