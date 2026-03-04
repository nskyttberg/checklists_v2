export interface Employee {
  id: string;
  name: string;
  email: string;
  site: string | null;
  is_admin: boolean;
  auth_user_id: string | null;
  active: boolean;
  created_at: string;
}
