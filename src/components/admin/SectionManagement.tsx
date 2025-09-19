import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';
import { sectionsAPI } from '@/services/api';

interface Section {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export function SectionManagement() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      setLoading(true);
      const response = await sectionsAPI.getAll();
      if (response.data.success) {
        setSections(response.data.data);
      } else {
        setError(response.data.error || 'Error al cargar secciones');
      }
    } catch (err) {
      setError('No se pudieron cargar las secciones. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', is_active: true });
    setEditingSection(null);
  };

  const handleOpenDialog = (section: Section | null = null) => {
    setError('');
    setSuccessMessage('');
    if (section) {
      setEditingSection(section);
      setFormData({ name: section.name, description: section.description, is_active: section.is_active });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre de la sección es requerido.');
      return;
    }

    try {
      let response;
      if (editingSection) {
        response = await sectionsAPI.update(editingSection.id, formData);
      } else {
        response = await sectionsAPI.create(formData);
      }

      if (response.data.success) {
        setSuccessMessage(response.data.message);
        setIsDialogOpen(false);
        loadSections();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.error || 'Ocurrió un error.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar la sección.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta sección? Esta acción no se puede deshacer.')) return;

    try {
      const response = await sectionsAPI.delete(id);
      if (response.data.success) {
        setSuccessMessage(response.data.message);
        loadSections();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.error || 'Error al eliminar.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar la sección.');
    }
  };

  const filteredSections = sections.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Secciones</h2>
        <Button onClick={() => handleOpenDialog()}><Plus className="h-4 w-4 mr-2" /> Nueva Sección</Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {successMessage && <Alert className="border-green-500 text-green-700"><AlertDescription>{successMessage}</AlertDescription></Alert>}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Secciones</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input placeholder="Buscar sección..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
              ) : filteredSections.length > 0 ? (
                filteredSections.map(section => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell>{section.description}</TableCell>
                    <TableCell>
                      {section.is_active ? 
                        <span className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1"/> Activo</span> : 
                        <span className="flex items-center text-red-600"><XCircle className="h-4 w-4 mr-1"/> Inactivo</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(section)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="sm" className="ml-2" onClick={() => handleDelete(section.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center">No se encontraron secciones.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? 'Editar Sección' : 'Nueva Sección'}</DialogTitle>
            <DialogDescription>Completa los detalles de la sección.</DialogDescription>
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
            {editingSection && (
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                <label htmlFor="is_active">Activo</label>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingSection ? 'Guardar Cambios' : 'Crear Sección'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
