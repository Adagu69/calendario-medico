import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash, Upload } from "lucide-react";
import type { Doctor, DoctorFormData } from "@/types";

interface DoctorManagerProps {
  doctors: Doctor[];
  onAddDoctor: (doctor: Doctor) => void;
  onEditDoctor: (id: string, updatedDoctor: Doctor) => void;
  onDeleteDoctor: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function DoctorManager({
  doctors,
  onAddDoctor,
  onEditDoctor,
  onDeleteDoctor,
  isOpen,
  onClose,
}: DoctorManagerProps) {
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<DoctorFormData>({
    name: "",
    specialty: "",
    photo: "",
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, photo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.specialty.trim()) return;

    const defaultPhoto = formData.photo || generateDefaultAvatar(formData.name);
    
    if (editingDoctor) {
      // Editando doctor existente
      const updatedDoctor: Doctor = {
        ...editingDoctor,
        name: formData.name,
        specialty: formData.specialty,
        photo: defaultPhoto,
      };
      onEditDoctor(editingDoctor.id, updatedDoctor);
    } else {
      // Agregando nuevo doctor
      const newDoctor: Doctor = {
        id: generateDoctorId(formData.name),
        name: formData.name,
        specialty: formData.specialty,
        photo: defaultPhoto,
        shifts: [
          { id: "morning", label: "8:00 am – 2:00 pm", color: "bg-blue-500" }
        ],
        schedule: {},
      };
      onAddDoctor(newDoctor);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: "", specialty: "", photo: "" });
    setEditingDoctor(null);
    setIsAddingNew(false);
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      specialty: doctor.specialty,
      photo: doctor.photo,
    });
    setIsAddingNew(true);
  };

  const generateDoctorId = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const generateDefaultAvatar = (name: string) => {
    const initials = name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
    const color = colors[name.length % colors.length];

    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="60" fill="${color}"/>
        <text x="60" y="70" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">${initials}</text>
      </svg>
    `)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Gestionar Doctores</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lista de doctores existentes */}
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
              <h3 className="text-lg font-medium">Doctores Registrados ({doctors.length})</h3>
              <Button 
                onClick={() => setIsAddingNew(true)}
                className="gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Agregar Doctor
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {doctors.map((doctor) => (
                <Card key={doctor.id} className="p-4 hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4">
                      <img
                        src={doctor.photo}
                        alt={doctor.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{doctor.name}</h4>
                        <p className="text-sm text-gray-600 truncate">{doctor.specialty}</p>
                        <p className="text-xs text-gray-500">
                          {doctor.shifts.length} horario{doctor.shifts.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(doctor)}
                          title="Editar doctor"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {doctors.length > 1 && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onDeleteDoctor(doctor.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Eliminar doctor"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {doctors.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No hay doctores registrados</p>
                <p className="text-sm">Agrega el primer doctor para comenzar</p>
              </div>
            )}
          </div>

          {/* Formulario para agregar/editar */}
          {isAddingNew && (
            <Card className="p-6 border-2 border-dashed border-gray-300">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">
                    {editingDoctor ? 'Editar Doctor' : 'Agregar Nuevo Doctor'}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetForm}
                    className="text-gray-500"
                  >
                    ✕
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nombre completo *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Dr. Juan Pérez"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Especialidad *
                    </label>
                    <Input
                      value={formData.specialty}
                      onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                      placeholder="Cardiología"
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Foto del doctor
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label htmlFor="photo-upload">
                        <Button variant="outline" className="gap-2 cursor-pointer w-full sm:w-auto" asChild>
                          <span>
                            <Upload className="h-4 w-4" />
                            Subir Foto
                          </span>
                        </Button>
                      </label>
                    </div>
                    {(formData.photo || formData.name) && (
                      <div className="flex items-center gap-2">
                        <img
                          src={formData.photo || generateDefaultAvatar(formData.name)}
                          alt="Vista previa"
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        />
                        <span className="text-xs text-gray-500">Vista previa</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Si no subes una foto, se generará un avatar automáticamente con las iniciales
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.name.trim() || !formData.specialty.trim()}
                    className="w-full sm:w-auto"
                  >
                    {editingDoctor ? 'Guardar Cambios' : 'Agregar Doctor'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetForm}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
