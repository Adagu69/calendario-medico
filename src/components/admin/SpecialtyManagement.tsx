import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';
import { specialtiesAPI } from '@/services/api';

interface Specialty {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export function SpecialtyManagement() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });

  useEffect(() => {
    loadSpecialties();
  }, []);

  const loadSpecialties = async () => {
    try {
      setLoading(true);
      const response = await specialtiesAPI.getAll();
      if (response.data.success) {
        setSpecialties(response.data.data);
      } else {
        setError(response.data.message || 'Error al cargar especialidades');
      }
    } catch (err) {
      setError('No se pudieron cargar las especialidades. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', is_active: true });
    setEditingSpecialty(null);
  };

  const handleOpenDialog = (specialty: Specialty | null = null) => {
    setError('');
    setSuccessMessage('');
    if (specialty) {
      setEditingSpecialty(specialty);
      setFormData({ name: specialty.name, description: specialty.description, is_active: specialty.is_active });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre de la especialidad es requerido.');
      return;
    }

    try {
      let response;
      if (editingSpecialty) {
        response = await specialtiesAPI.update(editingSpecialty.id, formData);
      } else {
        response = await specialtiesAPI.create(formData);
      }

      if (response.data.success) {
        setSuccessMessage(response.data.message);
        setIsDialogOpen(false);
        loadSpecialties();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Ocurrió un error.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar la especialidad.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar esta especialidad?')) return;

    try {
      const response = await specialtiesAPI.delete(id);
      if (response.data.success) {
        setSuccessMessage(response.data.message);
        loadSpecialties();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Error al eliminar.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al desactivar la especialidad.');
    }
  };

  const filteredSpecialties = specialties.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Especialidades</h2>
        <Button onClick={() => handleOpenDialog()}><Plus className="h-4 w-4 mr-2" /> Nueva Especialidad</Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {successMessage && <Alert className="border-green-500 text-green-700"><AlertDescription>{successMessage}</AlertDescription></Alert>}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Especialidades</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input placeholder="Buscar especialidad..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow>
              ) : filteredSpecialties.length > 0 ? (
                filteredSpecialties.map(specialty => (
                  <TableRow key={specialty.id}>
                    <TableCell className="font-medium">{specialty.name}</TableCell>
                    <TableCell>{specialty.description}</TableCell>
                    <TableCell>
                      {specialty.is_active ? 
                        <span className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1"/> Activo</span> : 
                        <span className="flex items-center text-red-600"><XCircle className="h-4 w-4 mr-1"/> Inactivo</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(specialty)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="sm" className="ml-2" onClick={() => handleDelete(specialty.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center">No se encontraron especialidades.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSpecialty ? 'Editar Especialidad' : 'Nueva Especialidad'}</DialogTitle>
            <DialogDescription>Completa los detalles de la especialidad.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name">Nombre</label>
              <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label htmlFor="description">Descripción</label>
              <Input id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            {editingSpecialty && (
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                <label htmlFor="is_active">Activo</label>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingSpecialty ? 'Guardar Cambios' : 'Crear Especialidad'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
