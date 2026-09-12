import { IGradingScheme } from '../models/Exam.js';
import { IMarkComponent } from '../models/Marks.js';

/**
 * Calculate total marks from individual components
 */
export const calculateTotalMarks = (components: IMarkComponent[]): number => {
  return components.reduce((total, component) => total + component.obtainedMarks, 0);
};

/**
 * Calculate grade based on marks and grading scheme
 */
export const calculateGrade = (
  marks: number,
  totalMaxMarks: number,
  gradingScheme: IGradingScheme[]
): { grade: string; gradePoint: number } => {
  // Convert marks to percentage-equivalent if needed, or use absolute values
  // In our case, the grading scheme is based on actual marks within the range
  
  const scheme = gradingScheme.find(
    (s) => marks >= s.minMarks && marks <= s.maxMarks
  );

  if (scheme) {
    return {
      grade: scheme.grade,
      gradePoint: scheme.gradePoint,
    };
  }

  // Fallback to 'F' if no scheme matches (e.g., marks are very low)
  return {
    grade: 'F',
    gradePoint: 0,
  };
};

/**
 * Calculate CGPA based on grades and subject weights (optional)
 */
export const calculateCGPA = (
  results: { gradePoint: number; creditWeight?: number }[]
): number => {
  if (results.length === 0) return 0;

  const totalPoints = results.reduce(
    (acc, curr) => acc + curr.gradePoint * (curr.creditWeight || 1),
    0
  );
  
  const totalCredits = results.reduce(
    (acc, curr) => acc + (curr.creditWeight || 1),
    0
  );

  return parseFloat((totalPoints / totalCredits).toFixed(2));
};
