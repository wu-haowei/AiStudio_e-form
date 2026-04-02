export type Role = 'super_admin' | 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  departmentId: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
}

export interface FormResponse {
  id: string;
  responseUrl: string;
  responseName: string;
  responderUid: string;
  responderName: string;
  responderDepartmentId: string;
  respondedAt: string;
  isVoided?: boolean;
  voidedAt?: string;
}

export interface FormLog {
  id: string;
  action: 'create' | 'edit' | 'delete' | 'approve' | 'reject' | 'respond' | 'void';
  userId: string;
  userName: string;
  timestamp: string;
  details?: string;
}

export interface Form {
  id?: string;
  title: string;
  content: string;
  authorUid: string;
  authorName: string;
  departmentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  attachmentUrl?: string;
  attachmentName?: string;
  responses?: FormResponse[];
  targetDepartmentIds?: string[];
  isPublic?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  isVoided?: boolean;
  voidedAt?: string;
  logs?: FormLog[];
  createdAt: string;
  publishStartTime?: string;
  publishEndTime?: string;
  // Approval Workflow
  approvals?: { [deptId: string]: boolean }; // Track approvals from target departments
  deptManagerApproved?: boolean; // Approval from the author's department manager
  superAdminApproved?: boolean; // Approval from the Super Admin
  approvalStep?: 'dept_manager' | 'target_managers' | 'super_admin' | 'completed';
}
