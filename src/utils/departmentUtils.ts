import { Department } from '../types';

export const getSubDepartmentIds = (deptId: string, departments: Department[]): string[] => {
  const subDepts = departments.filter(d => d.parentId === deptId);
  let ids = [deptId];
  subDepts.forEach(sd => {
    ids = [...ids, ...getSubDepartmentIds(sd.id, departments)];
  });
  return ids;
};

export const getDeptBreadcrumb = (deptId: string | null, departments: Department[]): string => {
  if (!deptId) return '無';
  const path: string[] = [];
  let currentId: string | null = deptId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const dept = departments.find(d => d.id === currentId);
    if (dept) {
      path.unshift(dept.name);
      currentId = dept.parentId;
    } else {
      break;
    }
  }
  return path.join(' > ');
};
