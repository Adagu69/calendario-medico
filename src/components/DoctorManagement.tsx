import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Users, Clock, RotateCcw, UserCheck } from 'lucide-react';
import type { ExtendedDoctor, MedicalSection, ExtendedUser } from '../types/medical';
import { doctorService, userService } from '../services/medicalApi';
import { sectionsAPI } from '../services/api';

interface DoctorManagementProps {
  currentUser: ExtendedUser;
  selectedSection?: string;
  onDoctorChange?: () => void;
}

export const DoctorManagement: React.FC<DoctorManagementProps> = ({
  currentUser,
  selectedSection,
  onDoctorChange
}) => {
  const [sections, setSections] = useState<MedicalSection[]>([]);
  const [doctors, setDoctors] = useState<ExtendedDoctor[]>([]);
  const [activeSection, setActiveSection] = useState<string>(selectedSection || '');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Estados para el formulario de doctor
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    documentType: 'DNI' as const,
    documentNumber: '',
    profession: '',
    licenseNumber: '',
    email: '',
    phone: '',
    photo: '/default-avatar.png',
    sectionId: '',
    isChief: false
  });

  // Cargar secciones al iniciar
  useEffect(() => {
    loadSections();
  }, []);

  // Cargar doctores cuando cambia la sección
  useEffect(() => {
    if (activeSection) {
      loadDoctors();
    }
  }, [activeSection]);

  const loadSections = async () => {
    try {
      const sectionsResponse = await sectionsAPI.getAll();
      const sectionsData = sectionsResponse.data.success ? sectionsResponse.data.data : [];
      setSections(sectionsData);
      
      // Si el usuario es jefe de sección, establecer su sección por defecto
      if (currentUser.role === 'section_chief' && currentUser.sectionId) {
        setActiveSection(currentUser.sectionId);
      } else if (!activeSection && sectionsData.length > 0) {
        setActiveSection(sectionsData[0].id);
      }
    } catch (error) {
      console.error('Error loading sections:', error);
    }
  };

  const loadDoctors = async () => {
    setLoading(true);
    try {
      let doctorsData: ExtendedDoctor[];
      
      if (currentUser.role === 'super_admin') {
        // Super admin puede ver doctores de cualquier sección
        doctorsData = activeSection 
          ? await doctorService.getDoctorsBySection(activeSection)
          : await doctorService.getAllDoctors();
      } else if (currentUser.role === 'section_chief' && currentUser.sectionId) {
        // Jefe de sección solo ve doctores de su sección
        doctorsData = await doctorService.getDoctorsBySection(currentUser.sectionId);
      } else {
        doctorsData = [];
      }
      
      setDoctors(doctorsData);
    } catch (error) {
      console.error('Error loading doctors:', error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoctor = async () => {
    try {
      const newDoctor = await doctorService.createDoctor({
        ...formData,
        code: `DOC${Date.now()}`, // Generar código único
        fullName: `${formData.firstName} ${formData.lastName}`,
        sectionId: activeSection,
        isActive: true,
        joinDate: new Date().toISOString(),
        workSchedule: {
          doctorId: '',
          month: new Date().toISOString().slice(0, 7),
          shifts: [],
          totalHours: 0,
          isApproved: false,
          createdBy: currentUser.id,
          updatedBy: currentUser.id
        }
      });

      setDoctors([...doctors, newDoctor]);
      setShowCreateForm(false);
      resetForm();
      onDoctorChange?.();
    } catch (error) {
      console.error('Error creating doctor:', error);
      alert('Error al crear el doctor');
    }
  };

  const handleUpdateDoctor = async (id: string, updates: Partial<ExtendedDoctor>) => {
    try {
      const updatedDoctor = await doctorService.updateDoctor(id, updates);
      setDoctors(doctors.map(doc => doc.id === id ? updatedDoctor : doc));
      setIsEditing(null);
      onDoctorChange?.();
    } catch (error) {
      console.error('Error updating doctor:', error);
      alert('Error al actualizar el doctor');
    }
  };

  const handleDeactivateDoctor = async (id: string) => {
    if (confirm('¿Está seguro de desactivar este doctor? Podrá reactivarlo posteriormente.')) {
      try {
        await doctorService.deactivateDoctor(id);
        setDoctors(doctors.map(doc => 
          doc.id === id ? { ...doc, isActive: false } : doc
        ));
        onDoctorChange?.();
      } catch (error) {
        console.error('Error deactivating doctor:', error);
        alert('Error al desactivar el doctor');
      }
    }
  };

  const handleReactivateDoctor = async (id: string) => {
    try {
      await doctorService.reactivateDoctor(id);
      setDoctors(doctors.map(doc => 
        doc.id === id ? { ...doc, isActive: true } : doc
      ));
      onDoctorChange?.();
    } catch (error) {
      console.error('Error reactivating doctor:', error);
      alert('Error al reactivar el doctor');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      documentType: 'DNI',
      documentNumber: '',
      profession: '',
      licenseNumber: '',
      email: '',
      phone: '',
      photo: '/default-avatar.png',
      sectionId: '',
      isChief: false
    });
  };

  const canManageSection = (sectionId: string) => {
    return userService.hasPermission(currentUser, 'doctors', 'update', sectionId);
  };

  const activeDoctors = doctors.filter(doc => doc.isActive);
  const inactiveDoctors = doctors.filter(doc => !doc.isActive);
  const selectedSectionData = sections.find(s => s.id === activeSection);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Doctores</h2>
          <p className="text-gray-600">
            {selectedSectionData?.displayName || 'Todas las secciones'}
          </p>
        </div>
        
        {canManageSection(activeSection) && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar Doctor
          </button>
        )}
      </div>

      {/* Selector de sección (solo para super admin) */}
      {currentUser.role === 'super_admin' && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sección a gestionar:
          </label>
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las secciones</option>
            {sections.map(section => (
              <option key={section.id} value={section.id}>
                {section.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Doctores Activos</p>
              <p className="text-2xl font-semibold text-green-600">{activeDoctors.length}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Doctores Inactivos</p>
              <p className="text-2xl font-semibold text-gray-600">{inactiveDoctors.length}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Jefes de Sección</p>
              <p className="text-2xl font-semibold text-blue-600">
                {doctors.filter(doc => doc.isChief && doc.isActive).length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Doctores</p>
              <p className="text-2xl font-semibold text-gray-900">{doctors.length}</p>
            </div>
            <Users className="w-8 h-8 text-gray-900" />
          </div>
        </div>
      </div>

      {/* Lista de doctores activos */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Doctores Activos</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando doctores...</p>
          </div>
        ) : activeDoctors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay doctores activos en esta sección
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profesión</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeDoctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <img
                          src={doctor.photo}
                          alt={doctor.fullName}
                          className="w-10 h-10 rounded-full object-cover mr-3"
                          onError={(e) => {
                            e.currentTarget.src = '/default-avatar.png';
                          }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{doctor.fullName}</div>
                          <div className="text-sm text-gray-500">Código: {doctor.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{doctor.documentType}</div>
                      <div className="text-sm text-gray-500">{doctor.documentNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{doctor.profession}</div>
                      <div className="text-sm text-gray-500">Lic. {doctor.licenseNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        doctor.isChief 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {doctor.isChief ? 'Jefe de Sección' : 'Doctor'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{doctor.email}</div>
                      <div className="text-sm text-gray-500">{doctor.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManageSection(doctor.sectionId) && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setIsEditing(doctor.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeactivateDoctor(doctor.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Desactivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lista de doctores inactivos (si hay) */}
      {inactiveDoctors.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Doctores Inactivos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Ingreso</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inactiveDoctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-gray-50 opacity-60">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <img
                          src={doctor.photo}
                          alt={doctor.fullName}
                          className="w-10 h-10 rounded-full object-cover mr-3 grayscale"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{doctor.fullName}</div>
                          <div className="text-sm text-gray-500">Código: {doctor.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{doctor.documentType}</div>
                      <div className="text-sm text-gray-500">{doctor.documentNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-500">
                        {new Date(doctor.joinDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManageSection(doctor.sectionId) && (
                        <button
                          onClick={() => handleReactivateDoctor(doctor.id)}
                          className="text-green-600 hover:text-green-800"
                          title="Reactivar"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de crear doctor */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Agregar Nuevo Doctor</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({...formData, documentType: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CEX">CEX</option>
                    <option value="PAS">PAS</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Documento *
                  </label>
                  <input
                    type="text"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profesión *
                  </label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) => setFormData({...formData, profession: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Licencia *
                  </label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isChief}
                    onChange={(e) => setFormData({...formData, isChief: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Es jefe de sección
                  </span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateDoctor}
                  disabled={!formData.firstName || !formData.lastName || !formData.documentNumber}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crear Doctor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
