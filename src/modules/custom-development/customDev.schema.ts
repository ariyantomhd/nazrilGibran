// src/modules/custom-development/customDev.schema.ts
import { z } from 'zod';

export const PROJECT_TYPES = [
  'dapps-web3',
  'blog-cms',
  'android-apps',
  'web-applications',
  'custom-development',
] as const;

export type ProjectCategoryType = (typeof PROJECT_TYPES)[number];

export const createCustomDevRequestSchema = z.object({
  client_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(120, 'Full name cannot exceed 120 characters'),
  client_email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .max(255, 'Email address is too long'),
  company_name: z
    .string()
    .trim()
    .max(150, 'Company name cannot exceed 150 characters')
    .optional()
    .nullable(),
  project_title: z
    .string()
    .trim()
    .min(3, 'Project title must be at least 3 characters')
    .max(200, 'Project title cannot exceed 200 characters'),
  project_type: z.enum(PROJECT_TYPES, {
    message: 'Invalid project category selected',
  }),
  budget_range: z
    .string()
    .trim()
    .min(2, 'Budget range is required')
    .max(80, 'Budget range is invalid'),
  timeline: z
    .string()
    .trim()
    .min(2, 'Target timeline is required')
    .max(80, 'Timeline value is invalid'),
  description: z
    .string()
    .trim()
    .min(10, 'Project description must be at least 10 characters')
    .max(2000, 'Project description cannot exceed 2,000 characters'),
});

export type CreateCustomDevRequestDTO = z.infer<typeof createCustomDevRequestSchema>;