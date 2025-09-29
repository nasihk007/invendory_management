// Staff Management Types

export interface Staff {
  id: number;
  username: string;
  email: string;
  role: 'staff';
  status: 'active' | 'inactive';
  member_since: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    department?: string;
    position?: string;
  };
}

export interface StaffSummary {
  total_staff: number;
  active_staff: number;
  inactive_staff?: number;
  new_this_month: number;
  staff_with_recent_activity?: number;
}

export interface StaffListResponse {
  staff_members: Staff[];
  summary: StaffSummary;
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface CreateStaffRequest {
  username: string;
  email: string;
  password: string;
  // role is automatically set to 'staff' in the backend
}

export interface CreateStaffResponse {
  success: boolean;
  message: string;
  data: {
    user: Staff;
    temporary_password?: string; // If password is auto-generated
  };
}

export interface StaffFilters {
  search?: string;
  status?: 'active' | 'inactive';
  limit?: number;
  offset?: number;
  sortBy?: 'username' | 'email' | 'created_at' | 'last_login';
  sortOrder?: 'asc' | 'desc';
}

export interface StaffStats {
  total_actions: number;
  products_managed: number;
  recent_activity: string;
  productivity_score: number;
  last_activity: string;
}
