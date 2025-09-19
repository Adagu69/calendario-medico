export interface Section {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: "super_admin" | "section_chief" | "viewer" | "doctor";
  sectionId?: number;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  password: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  sectionId: number;
  isActive: boolean;
}

export const sections: Section[] = [
  {
    id: 1,
    name: "Cardiología",
    description: "Especialidad médica del corazón",
    isActive: true
  },
  {
    id: 2,
    name: "Neurología",
    description: "Especialidad del sistema nervioso",
    isActive: true
  },
  {
    id: 3,
    name: "Pediatría",
    description: "Especialidad médica infantil",
    isActive: true
  }
];

export let users: User[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@tuasusalud.com",
    role: "super_admin",
    firstName: "Administrador",
    lastName: "Sistema",
    phone: "+57 300 123 4567",
    isActive: true,
    password: "admin123",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  }
];

export const doctors: Doctor[] = [
  {
    id: 1,
    name: "Dr. Juan Rodríguez",
    specialty: "Cardiología",
    phone: "+57 301 234 5678",
    email: "rodriguez@tuasusalud.com",
    sectionId: 1,
    isActive: true
  }
];

export const getNextUserId = (): number => {
  return Math.max(...users.map(u => u.id)) + 1;
};

export const addUser = (user: Omit<User, "id">): User => {
  const newUser: User = { ...user, id: getNextUserId() };
  users.push(newUser);
  return newUser;
};

export const updateUser = (id: number, updates: Partial<User>): User | null => {
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) return null;
  users[userIndex] = { ...users[userIndex], ...updates, updatedAt: new Date().toISOString() };
  return users[userIndex];
};

export const deleteUser = (id: number): boolean => {
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) return false;
  users[userIndex].isActive = false;
  users[userIndex].updatedAt = new Date().toISOString();
  return true;
};

export const getUserByEmailOrUsername = (emailOrUsername: string): User | null => {
  return users.find(u => (u.email === emailOrUsername || u.username === emailOrUsername) && u.isActive) || null;
};

export const isEmailTaken = (email: string, excludeId?: number): boolean => {
  return users.some(u => u.email === email && u.isActive && u.id !== excludeId);
};

export const isUsernameTaken = (username: string, excludeId?: number): boolean => {
  return users.some(u => u.username === username && u.isActive && u.id !== excludeId);
};
