import { UserProfile, Form } from './types';

const USERS_KEY = 'app_users';
const FORMS_KEY = 'app_forms';

export const localDb = {
  saveToStorage: (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new Event('local-db-update'));
    } catch (e) {
      if (e instanceof DOMException && (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError')) {
        throw new Error('瀏覽器儲存空間已滿 (localStorage 額度已達上限)。\n由於本系統目前使用瀏覽器本地儲存，包含附件在內的總容量限制約為 5MB。\n請嘗試刪除舊表單或清除瀏覽器快取。');
      } else {
        console.error('Storage error:', e);
        throw e;
      }
    }
  },

  // Users
  getUsers: (): UserProfile[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },
  getUser: (uid: string): UserProfile | null => {
    const users = localDb.getUsers();
    return users.find(u => u.uid === uid) || null;
  },
  saveUser: (user: UserProfile) => {
    const users = localDb.getUsers();
    const index = users.findIndex(u => u.uid === user.uid);
    if (index > -1) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localDb.saveToStorage(USERS_KEY, users);
  },

  // Forms
  getForms: (): Form[] => {
    const data = localStorage.getItem(FORMS_KEY);
    return data ? JSON.parse(data) : [];
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
  addForm: (form: Omit<Form, 'id'>, user: { uid: string, displayName: string }): string => {
    const forms = localDb.getForms();
    const id = Math.random().toString(36).substr(2, 9);
    const newForm = { ...form, id, logs: [] } as Form;
    localDb.logAction(newForm, 'create', user);
    forms.push(newForm);
    localDb.saveToStorage(FORMS_KEY, forms);
    return id;
  },
  updateForm: (id: string, updates: Partial<Form>, user: { uid: string, displayName: string }, action: any = 'edit') => {
    const forms = localDb.getForms();
    const index = forms.findIndex(f => f.id === id);
    if (index > -1) {
      const form = forms[index];
      localDb.logAction(form, action, user);
      forms[index] = { ...form, ...updates };
      localDb.saveToStorage(FORMS_KEY, forms);
    }
  },
  deleteForm: (id: string, user: { uid: string, displayName: string }) => {
    const forms = localDb.getForms();
    const index = forms.findIndex(f => f.id === id);
    if (index > -1) {
      const form = { ...forms[index] };
      form.isDeleted = true;
      form.deletedAt = new Date().toISOString();
      localDb.logAction(form, 'delete', user);
      forms[index] = form;
      localDb.saveToStorage(FORMS_KEY, forms);
    }
  },
  voidForm: (id: string, user: { uid: string, displayName: string }) => {
    const forms = localDb.getForms();
    const index = forms.findIndex(f => f.id === id);
    if (index > -1) {
      const form = { ...forms[index] };
      form.isVoided = true;
      form.voidedAt = new Date().toISOString();
      localDb.logAction(form, 'void', user);
      forms[index] = form;
      localDb.saveToStorage(FORMS_KEY, forms);
    }
  },
  voidResponse: (formId: string, responseId: string, user: { uid: string, displayName: string }) => {
    const forms = localDb.getForms();
    const index = forms.findIndex(f => f.id === formId);
    if (index > -1) {
      const form = forms[index];
      if (form.responses) {
        const rIndex = form.responses.findIndex(r => r.id === responseId);
        if (rIndex > -1) {
          form.responses[rIndex].isVoided = true;
          form.responses[rIndex].voidedAt = new Date().toISOString();
          localDb.logAction(form, 'void_response', user, `作廢回傳檔案: ${form.responses[rIndex].responseName}`);
          localDb.saveToStorage(FORMS_KEY, forms);
        }
      }
    }
  },
  addResponse: (formId: string, response: any, user: { uid: string, displayName: string }) => {
    const forms = localDb.getForms();
    const index = forms.findIndex(f => f.id === formId);
    if (index > -1) {
      const form = forms[index];
      if (!form.responses) form.responses = [];
      form.responses.push({
        id: Math.random().toString(36).substr(2, 9),
        ...response,
        respondedAt: new Date().toISOString()
      });
      localDb.logAction(form, 'respond', user);
      localDb.saveToStorage(FORMS_KEY, forms);
    }
  },

  clearAllData: () => {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(FORMS_KEY);
    localStorage.removeItem('mock_user');
    window.dispatchEvent(new Event('local-db-update'));
  },

  // File "Upload" (Base64)
  uploadFile: async (file: File): Promise<{ url: string, name: string }> => {
    // Limit file size to 1MB to prevent filling up localStorage too quickly
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('檔案太大 (限制為 1MB)。由於目前使用瀏覽器本地儲存，請上傳較小的檔案。');
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
