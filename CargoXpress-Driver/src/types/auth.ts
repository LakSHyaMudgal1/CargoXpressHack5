export interface DriverProfile {
  _id: string;
  name: string;
  emailId: string;
  phone: string;
  licenseNumber: string;
  status: 'active' | 'disabled' | 'on_duty' | 'off_duty';
  companyId: string;
  photoUrl?: string;
  assignedTruck?: {
    assignmentId: string;
    truckId: string;
    licensePlate: string;
    assignedAt: string;
  } | null;
}

export interface LoginCredentials {
  emailId?: string;
  phone?: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  driver: DriverProfile;
}

export interface AuthContextType {
  driver: DriverProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
