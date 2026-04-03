import { openDB, IDBPDatabase } from 'idb';
import { UserProfile, Form } from './types';

const DB_NAME = 'app_database';
const DB_VERSION = 1;
const USERS_STORE = 'users';
const FORMS_STORE = 'forms';
const SESSION_STORE = 'session';

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(USERS_STORE)) {
          db.createObjectStore(USERS_STORE, { keyPath: 'uid' });
        }
        if (!db.objectStoreNames.contains(FORMS_STORE)) {
          db.createObjectStore(FORMS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SESSION_STORE)) {
          db.createObjectStore(SESSION_STORE);
        }
      },
    });
  }
  return dbPromise;
};

const notifyUpdate = () => {
  window.dispatchEvent(new Event('local-db-update'));
};

export const localDb = {
  // Session
  getMockUser: async () => {
    const db = await getDb();
    return db.get(SESSION_STORE, 'mock_user');
  },
  setMockUser: async (user: any) => {
    const db = await getDb();
    await db.put(SESSION_STORE, user, 'mock_user');
  },
  clearMockUser: async () => {
    const db = await getDb();
    await db.delete(SESSION_STORE, 'mock_user');
  },

  // Users
  getUsers: async (): Promise<UserProfile[]> => {
    const db = await getDb();
    return db.getAll(USERS_STORE);
  },
  getUser: async (uid: string): Promise<UserProfile | null> => {
    const db = await getDb();
    return (await db.get(USERS_STORE, uid)) || null;
  },
  saveUser: async (user: UserProfile) => {
    const db = await getDb();
    await db.put(USERS_STORE, user);
    notifyUpdate();
  },

  // Forms
  getForms: async (): Promise<Form[]> => {
    const db = await getDb();
    return db.getAll(FORMS_STORE);
  },
  logAction: (form: Form, action: any, user: { uid: string, displayName: string }, details?: string) => {
    if (!form.logs) form.logs = [];
    form.logs.push({
      id: Math.random().toString(36).substr(2, 9),
      action,
      userId: user.uid,
      userName: user.displayName,
      timestamp: new Date().toISOString(),
      details
    });
  },
  // Helper to calculate initial approval state
  calculateApprovalState: (form: Partial<Form>, user: { role: any, departmentId: string }) => {
    let status: Form['status'] = 'pending';
    let approvalStep: Form['approvalStep'] = 'dept_manager';
    const approvals: { [deptId: string]: boolean } = {};

    // If custom workflow is provided, use it
    if (form.workflow && form.workflow.length > 0) {
      return {
        ...form,
        status: 'pending' as const,
        approvalStep: 'custom' as any,
        currentWorkflowStepIndex: 0,
        approvals: {},
        deptManagerApproved: false,
        superAdminApproved: false
      };
    }

    if (user.role === 'super_admin') {
      status = 'approved';
      approvalStep = 'completed';
    } else if (user.role === 'admin') {
      if (form.isPublic) {
        approvalStep = 'super_admin';
      } else if (form.targetDepartmentIds && form.targetDepartmentIds.length > 0) {
        approvalStep = 'target_managers';
        form.targetDepartmentIds.forEach(tid => approvals[tid] = false);
      } else {
        status = 'approved';
        approvalStep = 'completed';
      }
    } else {
      approvalStep = 'dept_manager';
      if (form.targetDepartmentIds) {
        form.targetDepartmentIds.forEach(tid => approvals[tid] = false);
      }
    }

    return {
      status,
      approvalStep,
      approvals,
      deptManagerApproved: user.role === 'admin' || user.role === 'super_admin',
      superAdminApproved: user.role === 'super_admin'
    };
  },

  addForm: async (form: Omit<Form, 'id'>, user: { uid: string, displayName: string, role: any, departmentId: string }): Promise<string> => {
    const db = await getDb();
    const id = Math.random().toString(36).substr(2, 9);
    
    const approvalState = localDb.calculateApprovalState(form, user);

    const newForm = { 
      ...form, 
      id, 
      logs: [], 
      ...approvalState
    } as Form;

    localDb.logAction(newForm, 'create', user);
    await db.put(FORMS_STORE, newForm);
    notifyUpdate();
    return id;
  },
  approveForm: async (id: string, user: { uid: string, displayName: string, role: any, departmentId: string }, answers?: { [fieldId: string]: any }) => {
    const db = await getDb();
    const form = await db.get(FORMS_STORE, id);
    if (!form || (form.status !== 'pending' && form.status !== 'approved')) return;

    const dataToCheck = answers || form.initialAnswers || {};

    if (form.approvalStep === ('custom' as any)) {
      const currentStep = form.workflow?.[form.currentWorkflowStepIndex || 0];
      if (!currentStep) return;

      // Check if this user is authorized to approve this step
      let authorized = false;
      if (currentStep.approverType === 'super_admin' && user.role === 'super_admin') authorized = true;
      if (currentStep.approverType === 'dept_manager' && user.role === 'admin' && user.departmentId === form.departmentId) authorized = true;
      if (currentStep.approverType === 'user' && user.uid === currentStep.approverId) authorized = true;

      if (authorized) {
        // Move to next step
        let nextIndex = (form.currentWorkflowStepIndex || 0) + 1;
        
        // Skip steps if condition is not met
        while (nextIndex < (form.workflow?.length || 0)) {
          const nextStep = form.workflow![nextIndex];
          if (nextStep.condition) {
            const val = dataToCheck[nextStep.condition.fieldId] || '';
            let met = false;
            const condVal = nextStep.condition.value;
            if (nextStep.condition.operator === '==') met = String(val) === String(condVal);
            if (nextStep.condition.operator === '!=') met = String(val) !== String(condVal);
            if (nextStep.condition.operator === '>') met = Number(val) > Number(condVal);
            if (nextStep.condition.operator === '<') met = Number(val) < Number(condVal);
            if (nextStep.condition.operator === 'contains') met = String(val).includes(String(condVal));
            if (nextStep.condition.operator === 'exists') met = !!val;
            if (nextStep.condition.operator === 'not_exists') met = !val;
            
            if (!met) {
              nextIndex++;
              continue;
            }
          }
          break;
        }

        if (nextIndex >= (form.workflow?.length || 0)) {
          form.status = 'approved';
          form.approvalStep = 'completed';
        } else {
          form.currentWorkflowStepIndex = nextIndex;
        }
        localDb.logAction(form, 'approve', user, `核准流程步驟: ${currentStep.label}`);
      }
    } else if (user.role === 'super_admin') {
      form.status = 'approved';
      form.approvalStep = 'completed';
      form.superAdminApproved = true;
      localDb.logAction(form, 'approve', user, '總管理者核准 (一鍵通過)');
    } else if (user.role === 'admin') {
      if (form.approvalStep === 'dept_manager' && user.departmentId === form.departmentId) {
        form.deptManagerApproved = true;
        if (form.isPublic) {
          form.approvalStep = 'super_admin';
        } else if (form.targetDepartmentIds && form.targetDepartmentIds.length > 0) {
          form.approvalStep = 'target_managers';
        } else {
          form.status = 'approved';
          form.approvalStep = 'completed';
        }
        localDb.logAction(form, 'approve', user, '單位主管核准');
      } else if (form.approvalStep === 'target_managers' && form.targetDepartmentIds?.includes(user.departmentId)) {
        if (!form.approvals) form.approvals = {};
        form.approvals[user.departmentId] = true;
        
        // Check if all target managers approved
        const allApproved = form.targetDepartmentIds.every(tid => form.approvals?.[tid]);
        if (allApproved) {
          form.status = 'approved';
          form.approvalStep = 'completed';
        }
        localDb.logAction(form, 'approve', user, `目標單位主管核准`);
      } else if (form.approvalStep === 'super_admin' && user.role === 'super_admin') {
        // This is handled by the first if, but just in case
        form.status = 'approved';
        form.approvalStep = 'completed';
        form.superAdminApproved = true;
        localDb.logAction(form, 'approve', user, '總管理者核准');
      }
    }

    await db.put(FORMS_STORE, form);
    notifyUpdate();
  },
  rejectForm: async (id: string, user: { uid: string, displayName: string, role: any }, reason: string) => {
    const db = await getDb();
    const form = await db.get(FORMS_STORE, id);
    if (!form || form.status !== 'pending') return;

    form.status = 'rejected';
    form.approvalStep = 'completed';
    localDb.logAction(form, 'reject', user, `駁回原因: ${reason}`);
    
    await db.put(FORMS_STORE, form);
    notifyUpdate();
  },
  updateForm: async (id: string, updates: Partial<Form>, user: { uid: string, displayName: string, role: any, departmentId: string }, action: any = 'edit') => {
    const db = await getDb();
    const form = await db.get(FORMS_STORE, id);
    if (form) {
      localDb.logAction(form, action, user);
      
      let finalUpdates = { ...updates };
      
      // If editing, reset approval workflow
      if (action === 'edit') {
        const newApprovalState = localDb.calculateApprovalState({ ...form, ...updates }, user);
        finalUpdates = { ...finalUpdates, ...newApprovalState };
      }
      
      const updatedForm = { ...form, ...finalUpdates };
      await db.put(FORMS_STORE, updatedForm);
      notifyUpdate();
    }
  },
  deleteForm: async (id: string, user: { uid: string, displayName: string }) => {
    const db = await getDb();
    const form = await db.get(FORMS_STORE, id);
    if (form) {
      form.isDeleted = true;
      form.deletedAt = new Date().toISOString();
      localDb.logAction(form, 'delete', user);
      await db.put(FORMS_STORE, form);
      notifyUpdate();
    }
  },
  voidForm: async (id: string, user: { uid: string, displayName: string }) => {
    const db = await getDb();
    const form = await db.get(FORMS_STORE, id);
    if (form) {
      form.isVoided = true;
      form.voidedAt = new Date().toISOString();
      localDb.logAction(form, 'void', user);
      await db.put(FORMS_STORE, form);
      notifyUpdate();
    }
  },
  voidResponse: async (formId: string, responseId: string, user: { uid: string, displayName: string }) => {
    const db = await getDb();
    const form = await db.get(FORMS_STORE, formId);
    if (form && form.responses) {
      const rIndex = form.responses.findIndex((r: any) => r.id === responseId);
      if (rIndex > -1) {
        form.responses[rIndex].isVoided = true;
        form.responses[rIndex].voidedAt = new Date().toISOString();
        localDb.logAction(form, 'void_response', user, `作廢回傳檔案: ${form.responses[rIndex].responseName}`);
        await db.put(FORMS_STORE, form);
        notifyUpdate();
      }
    }
  },
  addResponse: async (formId: string, response: any, user: { uid: string, displayName: string, departmentId: string }) => {
    const db = await getDb();
    const form = await db.get(FORMS_STORE, formId);
    if (form) {
      if (!form.responses) form.responses = [];
      
      const responseId = Math.random().toString(36).substr(2, 9);
      const newResponse: any = {
        id: responseId,
        ...response,
        responderDepartmentId: user.departmentId,
        respondedAt: new Date().toISOString(),
        status: 'pending',
        workflow: form.responseWorkflow || [],
        currentWorkflowStepIndex: 0,
        approvals: {},
        logs: []
      };

      // Handle initial step skip if condition not met
      if (newResponse.workflow && newResponse.workflow.length > 0) {
        let currentIndex = 0;
        const answers = response.answers || {};
        
        while (currentIndex < newResponse.workflow.length) {
          const step = newResponse.workflow[currentIndex];
          if (step.condition) {
            const val = answers[step.condition.fieldId] || '';
            let met = false;
            const condVal = step.condition.value;
            if (step.condition.operator === '==') met = String(val) === String(condVal);
            if (step.condition.operator === '!=') met = String(val) !== String(condVal);
            if (step.condition.operator === '>') met = Number(val) > Number(condVal);
            if (step.condition.operator === '<') met = Number(val) < Number(condVal);
            if (step.condition.operator === 'contains') met = String(val).includes(String(condVal));
            if (step.condition.operator === 'exists') met = !!val;
            if (step.condition.operator === 'not_exists') met = !val;
            
            if (!met) {
              currentIndex++;
              continue;
            }
          }
          break;
        }
        
        if (currentIndex >= newResponse.workflow.length) {
          newResponse.status = 'approved';
        } else {
          newResponse.currentWorkflowStepIndex = currentIndex;
        }
      } else {
        newResponse.status = 'approved';
      }

      form.responses.push(newResponse);
      localDb.logAction(form, 'respond', user);
      await db.put(FORMS_STORE, form);
      notifyUpdate();
    }
  },

  approveResponse: async (formId: string, responseId: string, user: { uid: string, displayName: string, role: any, departmentId: string }) => {
    const db = await getDb();
    const form = await db.get(FORMS_STORE, formId);
    if (!form || !form.responses) return;

    const responseIndex = form.responses.findIndex((r: any) => r.id === responseId);
    if (responseIndex === -1) return;
    const response = form.responses[responseIndex];
    if (response.status !== 'pending') return;

    const currentStep = response.workflow?.[response.currentWorkflowStepIndex || 0];
    if (!currentStep) return;

    // Check if this user is authorized to approve this step
    let authorized = false;
    if (currentStep.approverType === 'super_admin' && user.role === 'super_admin') authorized = true;
    if (currentStep.approverType === 'dept_manager' && user.role === 'admin' && user.departmentId === response.responderDepartmentId) authorized = true;
    if (currentStep.approverType === 'user' && user.uid === currentStep.approverId) authorized = true;

    if (authorized) {
      // Move to next step
      let nextIndex = (response.currentWorkflowStepIndex || 0) + 1;
      const answers = response.answers || {};
      
      // Skip steps if condition is not met
      while (nextIndex < (response.workflow?.length || 0)) {
        const nextStep = response.workflow![nextIndex];
        if (nextStep.condition) {
          const val = answers[nextStep.condition.fieldId] || '';
          let met = false;
          const condVal = nextStep.condition.value;
          if (nextStep.condition.operator === '==') met = String(val) === String(condVal);
          if (nextStep.condition.operator === '!=') met = String(val) !== String(condVal);
          if (nextStep.condition.operator === '>') met = Number(val) > Number(condVal);
          if (nextStep.condition.operator === '<') met = Number(val) < Number(condVal);
          if (nextStep.condition.operator === 'contains') met = String(val).includes(String(condVal));
          if (nextStep.condition.operator === 'exists') met = !!val;
          if (nextStep.condition.operator === 'not_exists') met = !val;
          
          if (!met) {
            nextIndex++;
            continue;
          }
        }
        break;
      }

      if (nextIndex >= (response.workflow?.length || 0)) {
        response.status = 'approved';
      } else {
        response.currentWorkflowStepIndex = nextIndex;
      }
      
      if (!response.logs) response.logs = [];
      response.logs.push({
        id: Math.random().toString(36).substr(2, 9),
        action: 'approve',
        userId: user.uid,
        userName: user.displayName,
        timestamp: new Date().toISOString(),
        details: `核准流程步驟: ${currentStep.label}`
      });

      await db.put(FORMS_STORE, form);
      notifyUpdate();
    }
  },

  rejectResponse: async (formId: string, responseId: string, user: { uid: string, displayName: string, role: any }, reason: string) => {
    const db = await getDb();
    const form = await db.get(FORMS_STORE, formId);
    if (!form || !form.responses) return;

    const responseIndex = form.responses.findIndex((r: any) => r.id === responseId);
    if (responseIndex === -1) return;
    const response = form.responses[responseIndex];
    if (response.status !== 'pending') return;

    response.status = 'rejected';
    
    if (!response.logs) response.logs = [];
    response.logs.push({
      id: Math.random().toString(36).substr(2, 9),
      action: 'reject',
      userId: user.uid,
      userName: user.displayName,
      timestamp: new Date().toISOString(),
      details: `駁回原因: ${reason}`
    });
    
    await db.put(FORMS_STORE, form);
    notifyUpdate();
  },

  clearAllData: async () => {
    const db = await getDb();
    await db.clear(USERS_STORE);
    await db.clear(FORMS_STORE);
    await db.clear(SESSION_STORE);
    notifyUpdate();
  },

  // File "Upload" (Base64)
  uploadFile: async (file: File): Promise<{ url: string, name: string }> => {
    // IndexedDB has much higher limits than localStorage (usually 50% of disk space)
    // So we can increase the limit or remove it. Let's keep a reasonable limit for performance.
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('檔案太大 (限制為 10MB)。');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          name: file.name
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
