import { useState } from 'react';
import { EnhancedAdminDashboard } from '@/components/EnhancedAdminDashboard';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import type { User } from '@/types';
import type { ExtendedUser } from '@/types/medical';
import './App.css';

// Define si se muestra el login o el registro
type AuthView = 'login' | 'register';

function App() {
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [successMessage, setSuccessMessage] = useState('');

  // Maneja el login exitoso
  const handleLogin = (user: User) => {
    setSuccessMessage('');
    const fullNameParts = user.name?.trim().split(' ') ?? [];
    const firstName = fullNameParts[0] || user.username;
    const lastName = fullNameParts.length > 1 ? fullNameParts.slice(1).join(' ') : '';
    const sectionId = typeof user.section_id === 'number'
      ? user.section_id
      : user.specialtyAccess?.[0]
        ? Number(user.specialtyAccess[0])
        : undefined;

    const extendedUser: ExtendedUser = {
      id: typeof user.id === 'string' ? Number(user.id) : user.id,
      username: user.username,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      role: user.role,
      section_id: sectionId,
      section_name: user.section_name || undefined,
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    setCurrentUser(extendedUser);
  };

  // Maneja el logout
  const handleLogout = () => {
    setCurrentUser(null);
    setAuthView('login');
    setSuccessMessage(''); // Limpia cualquier mensaje al salir
  };
  
  // Maneja el registro exitoso
  const handleRegisterSuccess = (message: string) => {
    setSuccessMessage(message);
    setAuthView('login'); // Vuelve al login para que el usuario inicie sesión
  };

  if (!currentUser) {
    if (authView === 'login') {
      return (
        <LoginForm
          onLogin={handleLogin}
          onSwitchToRegister={() => {
            setSuccessMessage('');
            setAuthView('register');
          }}
          successMessage={successMessage}
        />
      );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Sistema de Gestión Médica</h1>
        <RegisterForm 
          onSwitchToLogin={() => setAuthView('login')} 
          onRegisterSuccess={handleRegisterSuccess} 
        />
      </div>
    );
  }

  // Si hay un usuario, muestra el dashboard principal
  return <EnhancedAdminDashboard user={currentUser} onLogout={handleLogout} />;
}

export default App;
