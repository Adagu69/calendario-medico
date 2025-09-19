import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Save, Users, Clock, FileSpreadsheet, Settings } from 'lucide-react';
import DoctorCalendar from './DoctorCalendar';
import type { User } from '@/types';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');

  const handleSaveChanges = async () => {
    try {
      // Aquí llamarías a la API para guardar todos los cambios
      console.log('Guardando cambios...');
      setHasUnsavedChanges(false);
      // Mostrar toast de éxito
    } catch (error) {
      console.error('Error al guardar:', error);
      // Mostrar toast de error
    }
  };

  const handleExportExcel = () => {
    // Implementar exportación Excel formato TUASUSALUD
    console.log('Exportando a Excel...');
  };

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header del Dashboard */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Sistema de Gestión de Horarios
            </h1>
            <Badge variant="secondary" className="ml-2">
              {user.role === 'admin' ? 'Administrador' : 'Usuario'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Indicador de cambios sin guardar */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-amber-600">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Cambios sin guardar</span>
              </div>
            )}
            
            {/* Botón Guardar */}
            <Button 
              onClick={handleSaveChanges}
              disabled={!hasUnsavedChanges}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </Button>
            
            {/* Botón Exportar Excel */}
            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={handleExportExcel}
                className="gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </Button>
            )}
            
            <Button variant="outline" onClick={onLogout}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="p-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Panel Lateral Izquierdo - Herramientas */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Panel de Control
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="filters">Filtros</TabsTrigger>
                    <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="filters" className="mt-4 space-y-4">
                    {/* Filtros del calendario */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Especialidad</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>Todas las especialidades</option>
                        <option>Pediatría</option>
                        <option>Ginecología</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Servicio</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>Todos los servicios</option>
                        <option>UPSS - CONSULTA EXTERNA</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Doctor</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>Todos los doctores</option>
                      </select>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="stats" className="mt-4 space-y-4">
                    {/* Estadísticas rápidas */}
                    <div className="space-y-3">
                      <div className="bg-blue-50 p-3 rounded-md">
                        <div className="text-sm text-blue-600 font-medium">Horas este mes</div>
                        <div className="text-2xl font-bold text-blue-900">248.5h</div>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-md">
                        <div className="text-sm text-green-600 font-medium">Doctores activos</div>
                        <div className="text-2xl font-bold text-green-900">12</div>
                      </div>
                      
                      <div className="bg-orange-50 p-3 rounded-md">
                        <div className="text-sm text-orange-600 font-medium">Turnos pendientes</div>
                        <div className="text-2xl font-bold text-orange-900">3</div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Acciones Rápidas */}
            {isAdmin && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Acciones Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Users className="w-4 h-4" />
                    Gestionar Doctores
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Clock className="w-4 h-4" />
                    Configurar Horarios
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Generar Reportes
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Área Principal - Calendario */}
          <div className="col-span-9">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Calendario de Horarios - {new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Aquí va el calendario existente */}
                <DoctorCalendar 
                  user={user} 
                  onChangesDetected={() => setHasUnsavedChanges(true)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
