export const verifyCollegeOwnership = (
  resource: { collegeId?: unknown } | null | undefined,
  collegeId: unknown
): boolean => {
  if (!resource || !resource.collegeId || !collegeId) return false;
  return String(resource.collegeId) === String(collegeId);
};
