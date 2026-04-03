import { Department } from '../types';

export const DEPARTMENTS: Department[] = [
  { id: 'mgmt', name: '管理部', parentId: null, level: 1 },
  { id: 'project', name: '專案組', parentId: 'mgmt', level: 2 },
  { id: 'sales', name: '業務部', parentId: 'mgmt', level: 2 },
  { id: 'rd', name: '研發部', parentId: 'mgmt', level: 2 },
  { id: 'group-a', name: 'A組', parentId: 'project', level: 3 },
  { id: 'group-b', name: 'B組', parentId: 'project', level: 3 },
];
