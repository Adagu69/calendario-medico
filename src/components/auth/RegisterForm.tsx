import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus } from 'lucide-react';
import { authAPI } from '@/services/api';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onRegisterSuccess: (message: string) => void;
}

export default function RegisterForm({ onSwitchToLogin, onRegisterSuccess }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    
    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await authAPI.register(registerData);

      if (response.data.success) {
        onRegisterSuccess(response.data.message);
      } else {
        setError(response.data.error || 'Ocurrió un error en el registro.');
      }
    } catch (err: any) {
      console.error('Register error:', err);
      setError(err.response?.data?.error || 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-800">Crear una Cuenta</CardTitle>
        <p className="text-gray-600">El primer usuario será el Administrador.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input name="first_name" placeholder="Nombres" value={formData.first_name} onChange={handleChange} required />
            <Input name="last_name" placeholder="Apellidos" value={formData.last_name} onChange={handleChange} required />
          </div>
          <Input name="username" placeholder="Nombre de usuario" value={formData.username} onChange={handleChange} required />
          <Input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
          <Input name="password" type="password" placeholder="Contraseña (mín. 6 caracteres)" value={formData.password} onChange={handleChange} required />
          <Input name="confirmPassword" type="password" placeholder="Confirmar contraseña" value={formData.confirmPassword} onChange={handleChange} required />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2" />}
            {loading ? 'Registrando...' : 'Registrar'}
          </Button>

          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <Button variant="link" type="button" onClick={onSwitchToLogin} className="p-0 h-auto">
              Inicia sesión
            </Button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}