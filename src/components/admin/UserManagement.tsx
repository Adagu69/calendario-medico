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
import { usersAPI } from '@/services/api'; // Assuming usersAPI exists and is correctly typed
import type { ExtendedUser, MedicalSection } from '../../types/medical';

interface UserManagementProps {
  sections: MedicalSection[];
}

interface FormData {
  username: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'gerencia' | 'jefe' | 'doctor' | 'viewer';
  section_id: string | 'none';
}

const INITIAL_FORM: FormData = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  role: 'jefe',
  section_id: 'none'
};

export default function UserManagement({ sections }: UserManagementProps) {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [confirmPassword, setConfirmPassword] = useState('');
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
        setError(response.data.error || 'Error loading users');
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError('Error loading users. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setConfirmPassword('');
    setError('');
    setSuccessMessage('');
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: ExtendedUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      section_id: user.section_id?.toString() || 'none'
    });
    setConfirmPassword('');
    setError('');
    setSuccessMessage('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const trimmedPassword = formData.password?.trim() || '';
      const trimmedConfirm = confirmPassword.trim();

      const submitData: any = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        section_id: formData.section_id === 'none' ? null : Number(formData.section_id),
      };

      if (editingUser) {
        if (trimmedPassword.length > 0) {
          if (trimmedPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            setFormLoading(false);
            return;
          }
          if (trimmedPassword !== trimmedConfirm) {
            setError('Passwords do not match');
            setFormLoading(false);
            return;
          }
          submitData.password = trimmedPassword;
        }
        const response = await usersAPI.update(String(editingUser.id), submitData);
        if (response.data.success) {
          await loadUsers();
          setIsDialogOpen(false);
          setEditingUser(null);
          setFormData(INITIAL_FORM);
          setConfirmPassword('');
          setSuccessMessage('User updated successfully');
        } else {
          setError(response.data.error || 'Error updating user');
        }
      } else {
        if (trimmedPassword.length < 6) {
          setError('Password is required and must be at least 6 characters long');
          setFormLoading(false);
          return;
        }
        if (trimmedPassword !== trimmedConfirm) {
          setError('Passwords do not match');
          setFormLoading(false);
          return;
        }
        submitData.password = trimmedPassword;
        const response = await usersAPI.create(submitData);
        if (response.data.success) {
          await loadUsers();
          setIsDialogOpen(false);
          setEditingUser(null);
          setFormData(INITIAL_FORM);
          setConfirmPassword('');
          setSuccessMessage('User created successfully');
        } else {
          setError(response.data.error || 'Error creating user');
        }
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('❌ Operation error:', err);
      const errorMsg = err.response?.data?.error || 'Error processing request.';
      setError(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (user: ExtendedUser) => {
    // Logic to prevent self-deletion should be handled carefully
    if (!confirm(`Are you sure you want to deactivate user "${user.username}"?`)) {
      return;
    }

    try {
      setError('');
      const response = await usersAPI.delete(String(user.id));
      if (response.data.success) {
        await loadUsers();
        setSuccessMessage(`User ${user.username} deactivated successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.error || 'Error deleting user');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error deleting user.');
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: { [key: string]: { label: string; className: string } } = {
      admin: { label: 'Admin', className: 'bg-red-100 text-red-800' },
      jefe: { label: 'Section Chief', className: 'bg-blue-100 text-blue-800' },
      gerencia: { label: 'Management', className: 'bg-yellow-100 text-yellow-800' },
      doctor: { label: 'Doctor', className: 'bg-purple-100 text-purple-800' }
    };
    const config = roleConfig[role] || { label: role, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getSectionName = (sectionId?: number) => {
    if (!sectionId) return 'N/A';
    const section = sections.find(s => s.id === sectionId);
    return String(section?.name || sectionId);
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
       {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Administer system users</p>
        </div>
        <Button onClick={handleCreateUser} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New User
        </Button>
      </div>

      {/* Alerts */}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {successMessage && <Alert className="border-green-200 bg-green-50 text-green-700"><AlertDescription>{successMessage}</AlertDescription></Alert>}

      {/* User List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />User List</CardTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{`${user.first_name} ${user.last_name}`}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getSectionName(user.section_id)}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'destructive'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingUser(null);
            setFormData(INITIAL_FORM);
            setConfirmPassword('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'New User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Modify the selected user\'s data.' : 'Complete the form to create a new user.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <label htmlFor="username">Username</label>
                <Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="email">Email</label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="flex items-center justify-between">
                  <span>Password {editingUser ? '(optional)' : ''}</span>
                  {editingUser && <span className="text-xs text-gray-500">Deja en blanco para mantenerla</span>}
                </label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm_password">Confirm Password {(!editingUser || (formData.password?.trim().length ?? 0) > 0) && <span className="text-red-500">*</span>}</label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!editingUser || (formData.password?.trim().length ?? 0) > 0}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="first_name">First Name</label>
                  <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="last_name">Last Name</label>
                  <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="role">Role</label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as FormData['role'] })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gerencia">Management</SelectItem>
                    <SelectItem value="jefe">Section Chief</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="section_id">Section</label>
                <Select value={formData.section_id} onValueChange={(value) => setFormData({ ...formData, section_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {sections.map(section => (
                      <SelectItem key={section.id} value={String(section.id)}>{section.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formLoading && <div className="text-center">Saving...</div>}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={formLoading}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save User'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
