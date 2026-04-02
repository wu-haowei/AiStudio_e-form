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

export type FieldType = 'text' | 'number' | 'date' | 'radio' | 'checkbox' | 'textarea' | 'select';

export interface FormFieldRule {
  id: string;
  conditionFieldId: string;
  conditionValue: any;
  effect: 'hide' | 'show' | 'require' | 'optional';
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  maxSelections?: number;
  rules?: FormFieldRule[];
}

export interface WorkflowStep {
  id: string;
  label: string;
  approverType: 'user' | 'dept_manager' | 'super_admin';
  approverId?: string; // Specific user UID if type is 'user'
  condition?: {
    fieldId: string;
    operator: '>' | '<' | '==' | 'contains';
    value: any;
  };
}

export interface FormResponse {
  id: string;
  responseUrl: string;
  responseName: string;
  responderUid: string;
  responderName: string;
  responderDepartmentId: string;
  respondedAt: string;
  answers?: { [fieldId: string]: any };
  isVoided?: boolean;
  voidedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  workflow?: WorkflowStep[];
  currentWorkflowStepIndex?: number;
  approvals?: { [uid: string]: boolean };
  logs?: FormLog[];
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
  fields?: FormField[];
  initialAnswers?: { [fieldId: string]: any };
  workflow?: WorkflowStep[];
  responseWorkflow?: WorkflowStep[];
  currentWorkflowStepIndex?: number;
  createdAt: string;
  publishStartTime?: string;
  publishEndTime?: string;
  // Approval Workflow
  approvals?: { [deptId: string]: boolean }; // Track approvals from target departments
  deptManagerApproved?: boolean; // Approval from the author's department manager
  superAdminApproved?: boolean; // Approval from the Super Admin
  approvalStep?: 'dept_manager' | 'target_managers' | 'super_admin' | 'completed';
}
