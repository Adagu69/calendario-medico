import { useState } from 'react'
import CalendarApp from '@/components/calendar/CalendarApp'
import DoctorCalendar from '@/components/DoctorCalendar'
import { EnhancedAdminDashboard } from '@/components/EnhancedAdminDashboard'
import LoginForm from '@/components/auth/LoginForm'
import { Button } from '@/components/ui/button'
import type { User } from '@/types'
import type { ExtendedUser } from '@/types/medical'
import type { SGHDoctor, SGHSpecialty } from '@/types/sgh-types'
import './App.css'

type SystemView = 'login' | 'dashboard' | 'calendar';

// Datos de ejemplo para el nuevo calendario SGH
const mockDoctors: SGHDoctor[] = [
  {
    id: 1,
    specialtyId: 1,
    name: 'Dr. Juan Pérez',
    email: 'juan.perez@sgh.com',
    phone: '555-0001',
    license: 'LIC001',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    specialtyId: 2,
    name: 'Dra. María González',
    email: 'maria.gonzalez@sgh.com',
    phone: '555-0002',
    license: 'LIC002',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockSpecialties: SGHSpecialty[] = [
  {
    id: 1,
    sectionId: 1,
    name: 'Cardiología',
    description: 'Especialidad en problemas del corazón',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    sectionId: 1,
    name: 'Neurología',
    description: 'Especialidad en problemas del sistema nervioso',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

function App() {
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null);
  // El sistema inicia en 'login' siempre
  const [activeSystem, setActiveSystem] = useState<SystemView>('login');

  // Tras login, todos ven el sistema principal
  const handleLogin = (user: User) => {
    // Convertir User a ExtendedUser (simulado)
    const extendedUser: ExtendedUser = {
      id: user.id || 'user_001',
      username: user.name,
      email: user.name + '@tuasusalud.com',
      firstName: user.name.split(' ')[0] || 'Usuario',
      lastName: user.name.split(' ')[1] || 'Sistema',
      role: user.role === 'admin' ? 'super_admin' : 'section_chief',
      sectionId: user.role === 'admin' ? undefined : 'pediatria',
      permissions: [],
      isActive: true,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    setCurrentUser(extendedUser);
    setActiveSystem('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveSystem('login');
  };


  // Siempre mostrar login si no hay usuario autenticado
  if (!currentUser || activeSystem === 'login') {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md border">
          <h1 className="text-2xl font-bold mb-6 text-center">Sistema de Gestión Médica</h1>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }


  // Sistema principal tras autenticación
  if (activeSystem === 'dashboard' && currentUser) {
    return <EnhancedAdminDashboard user={currentUser} onLogout={handleLogout} />;
  }
  
  // Nuevo sistema de calendario SGH
  if (activeSystem === 'calendar' && currentUser) {
    return (
      <div className="h-screen bg-gray-100">
        <div className="h-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg h-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Sistema de Gestión Hospitalaria - Calendario
                </h1>
                <p className="text-gray-600 mt-1">
                  Gestiona los horarios mensuales de doctores por especialidad
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActiveSystem('dashboard')}>
                  Dashboard
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </div>
            </div>
            
            <CalendarApp
              doctors={mockDoctors}
              specialties={mockSpecialties}
              defaultDoctorId={1}
              defaultSpecialtyId={1}
            />
          </div>
        </div>
      </div>
    );
  }
  // Sistema de calendario original (solo si no hay usuario autenticado)
  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <h1 className="text-xl font-bold">Calendario de Doctores</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveSystem('login')}>
            Iniciar Sesión
          </Button>
        </div>
      </div>
      <div className="p-6 text-center">
        <p>Por favor, inicia sesión para acceder al sistema.</p>
      </div>
    </div>
  );
}

export default App
