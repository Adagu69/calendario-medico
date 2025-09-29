import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import type { User } from '@/types';
import { authAPI } from '@/services/api';

interface LoginFormProps {
  onLogin: (user: User) => void;
  onSwitchToRegister: () => void;
  successMessage?: string;
}

export default function LoginForm({ onLogin, onSwitchToRegister, successMessage }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(identifier, password);
      
      if (response.data.success) {
        const { user, token } = response.data.data;

        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));

        onLogin(user);
      } else {
        setError(response.data.error || 'Error al iniciar sesión');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      // **CORRECCIÓN: Manejo de errores mejorado**
      if (err.response?.data?.error) {
        // Captura errores generales del backend (ej: "Credenciales inválidas")
        setError(err.response.data.error);
      } else if (err.response?.data?.details) {
        // Captura errores de validación específicos (ej: "La contraseña es requerida")
        setError(err.response.data.details[0].msg);
      } else if (err.code === 'ECONNREFUSED' || err.message === 'Network Error') {
        setError('No se puede conectar al servidor. Verifica que el backend esté ejecutándose.');
      } else {
        setError('Ha ocurrido un error inesperado. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.2),_transparent_60%)]" aria-hidden="true" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border border-blue-100/60 bg-white/90 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-semibold text-slate-900">
              Bienvenido a TUASUSALUD
            </CardTitle>
            <p className="text-sm text-slate-500">
              Inicia sesión para gestionar el calendario y los turnos de tu equipo médico.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {successMessage && (
              <Alert className="rounded-xl border border-green-200 bg-emerald-50/90 text-emerald-700">
                <AlertDescription className="text-sm font-medium">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-600">
                  Usuario o Email
                </label>
                <Input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ej. admin@clinica.com"
                  required
                  className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                  <span>Contraseña</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="h-4 w-4" /> Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" /> Mostrar
                      </>
                    )}
                  </button>
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  required
                  className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500"
                />
              </div>

              {error && (
                <Alert className="rounded-xl border border-red-200 bg-red-50/90">
                  <AlertDescription className="text-sm text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 hover:shadow-blue-500/30"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Ingresar al panel
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500">
              ¿No tienes una cuenta?
              <Button
                variant="link"
                type="button"
                onClick={onSwitchToRegister}
                className="ml-1 h-auto p-0 text-blue-600 hover:text-blue-700"
              >
                Regístrate
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
