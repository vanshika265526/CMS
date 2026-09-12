import { z } from 'zod';

export const createPlacementSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100, 'Company name cannot exceed 100 characters'),
  role: z.string().min(1, 'Role is required').max(100, 'Role cannot exceed 100 characters'),
  package: z.number().min(0, 'Package must be positive').optional().default(0),
  deadline: z.string().or(z.date()).refine((val) => new Date(val) > new Date(), {
    message: 'Deadline must be in the future',
  }),
  eligibilityGPA: z.number().min(0, 'CGPA cannot be negative').max(10, 'CGPA cannot exceed 10').optional().default(0),
  eligibilityBacklogs: z.number().min(0, 'Backlogs cannot be negative').optional().default(0),
  description: z.string().min(1, 'Description is required').max(5000, 'Description cannot exceed 5000 characters'),
  
  applicationLink: z.string().url('Must be a valid URL').refine(val => val.startsWith('https://'), {
    message: 'HTTPS is preferred/required for application links',
  }).optional().or(z.literal('')),
  
  location: z.string().max(200, 'Location too long').optional(),
  companyLogo: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  driveType: z.string().optional(),
  branchesEligible: z.array(z.string()).optional(),
  yearEligible: z.array(z.string()).optional(),
  skillsRequired: z.array(z.string()).optional(),
  salaryType: z.string().optional(),
  employmentType: z.string().optional(),
  
  workflowStatus: z.enum(['draft', 'pending_review', 'published', 'archived', 'expired']).optional(),
});

export const updatePlacementSchema = createPlacementSchema.partial().extend({
  version: z.number().optional() // For optimistic concurrency
});

export const changePlacementStatusSchema = z.object({
  workflowStatus: z.enum(['draft', 'pending_review', 'published', 'archived', 'expired']),
  version: z.number().optional() // Require version for safe status changes
});

export const bulkActionSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required')
});
