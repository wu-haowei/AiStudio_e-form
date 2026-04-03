import { DEPARTMENTS } from '../constants/departments';

export const getSubDepartmentIds = (deptId: string): string[] => {
  const subDepts = DEPARTMENTS.filter(d => d.parentId === deptId);
  let ids = [deptId];
  subDepts.forEach(sd => {
    ids = [...ids, ...getSubDepartmentIds(sd.id)];
  });
  return ids;
};
