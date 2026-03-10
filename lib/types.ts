export type EmployeeStatus = "active" | "inactive" | "temporary_inactive";

export interface Employee {
  id: string;
  name: string;
  email: string;
  site: string | null;
  status: EmployeeStatus;
  auth_user_id: string | null;
  created_at: string;
  has_admin_access?: boolean;
}
