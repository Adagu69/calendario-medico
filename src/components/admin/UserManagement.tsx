import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  UserCheck,
  UserX,
  Mail,
  User,
  Users
} from 'lucide-react';
import { usersAPI } from '@/services/api';

// Corrected UserType to match backend snake_case
interface UserType {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'gerencia' | 'jefe' | 'doctor';
  section_id?: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

// This interface should align with the MedicalSection type from the API
interface Section {
  id: string;
  name: string;
  display_name: string;
}

interface UserManagementProps {
  sections: Section[];
}

export default function UserManagement({ sections }: UserManagementProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '', 
    first_name: '',
    last_name: '',
    role: 'jefe' as 'admin' | 'gerencia' | 'jefe' | 'doctor',
    section_id: 'none'
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await usersAPI.getAll();
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        setError(response.data.error || 'Error al cargar usuarios');
      }
    } catch (err: any) {
      console.error('Error cargando usuarios:', err);
      if (err.response?.status === 401) {
        setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Error al cargar usuarios. Verifica tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'jefe',
      section_id: 'none'
    });
    setError('');
    setSuccessMessage('');
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      section_id: user.section_id || 'none'
    });
    setError('');
    setSuccessMessage('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      if (!formData.username.trim()) {
        setError('El nombre de usuario es requerido');
        setFormLoading(false);
        return;
      }

      const submitData: any = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        section_id: formData.section_id === 'none' ? null : formData.section_id,
      };

      if (editingUser) {
        const response = await usersAPI.update(editingUser.id, submitData);
        if (response.data.success) {
          await loadUsers();
          setIsDialogOpen(false);
          setSuccessMessage('Usuario actualizado exitosamente');
        } else {
          setError(response.data.error || 'Error al actualizar usuario');
        }
      } else {
        if (!formData.password || formData.password.length < 6) {
          setError('La contraseña es requerida y debe tener al menos 6 caracteres');
          setFormLoading(false);
          return;
        }
        submitData.password = formData.password;
        const response = await usersAPI.create(submitData);
        if (response.data.success) {
          await loadUsers();
          setIsDialogOpen(false);
          setSuccessMessage('Usuario creado exitosamente');
        } else {
          setError(response.data.error || 'Error al crear usuario');
        }
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('❌ Error en la operación:', err);
      const errorMsg = err.response?.data?.error || (err.response?.data?.details?.[0]?.msg) || 'Error al procesar la solicitud.';
      setError(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (user: UserType) => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.id === user.id) {
      setError('No puedes eliminar tu propio usuario');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas desactivar al usuario "${user.username}"?`)) {
      return;
    }

    try {
      setError('');
      const response = await usersAPI.delete(user.id);
      if (response.data.success) {
        await loadUsers();
        setSuccessMessage(`Usuario ${user.username} desactivado exitosamente`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.error || 'Error al eliminar usuario');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar usuario.');
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: { [key: string]: { label: string; className: string } } = {
      admin: { label: 'Admin', className: 'bg-red-100 text-red-800' },
      jefe: { label: 'Jefe de Sección', className: 'bg-blue-100 text-blue-800' },
      gerencia: { label: 'Gerencia', className: 'bg-yellow-100 text-yellow-800' },
      doctor: { label: 'Doctor', className: 'bg-purple-100 text-purple-800' }
    };
    const config = roleConfig[role] || { label: role, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getSectionName = (sectionId?: string) => {
    if (!sectionId) return 'N/A';
    const section = sections.find(s => s.id === sectionId);
    return section?.display_name || sectionId;
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <p className="text-gray-600 mt-1">Administra los usuarios del sistema</p>
        </div>
        <Button onClick={handleCreateUser} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Usuarios
            </CardTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando usuarios...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Sección</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {user.username}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>{`${user.first_name} ${user.last_name}`}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getSectionName(user.section_id)}</TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <UserCheck className="h-4 w-4" />
                          Activo
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <UserX className="h-4 w-4" />
                          Inactivo
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString('es-ES')
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Modifica los datos del usuario seleccionado.'
                : 'Completa el formulario para crear un nuevo usuario.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de Usuario
              </label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Ingresa el nombre de usuario"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ingresa el email"
                required
              />
            </div>

            {!editingUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Nombre"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido
                </label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Apellido"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="jefe">Jefe de Sección</SelectItem>
                  <SelectItem value="gerencia">Gerencia</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.role === 'jefe' || formData.role === 'doctor') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sección
                </label>
                <Select
                  value={formData.section_id}
                  onValueChange={(value) => setFormData({ ...formData, section_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sección" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sección asignada</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setError('');
                }}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}