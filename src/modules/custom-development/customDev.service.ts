// src/modules/custom-development/customDev.service.ts
import {
  createCustomDevRequestSchema,
  CreateCustomDevRequestDTO,
} from './customDev.schema';
import { customDevRepo } from './customDev.repo';

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>?/gm, '').trim();
}

export const customDevService = {
  async submitRequest(rawBody: unknown, userId?: string) {
    const parsed = createCustomDevRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const validationError = new Error(
        firstIssue?.message || 'Invalid custom development request payload'
      ) as Error & { statusCode?: number };
      validationError.statusCode = 400;
      throw validationError;
    }

    const cleanPayload: CreateCustomDevRequestDTO = {
      ...parsed.data,
      client_name: stripHtmlTags(parsed.data.client_name),
      client_email: parsed.data.client_email.toLowerCase().trim(),
      company_name: parsed.data.company_name
        ? stripHtmlTags(parsed.data.company_name)
        : null,
      project_title: stripHtmlTags(parsed.data.project_title),
      description: stripHtmlTags(parsed.data.description),
    };

    return await customDevRepo.createRequest(cleanPayload, userId);
  },

  async getMyRequests(userId: string) {
    if (!userId) {
      const authError = new Error('Authentication required') as Error & {
        statusCode?: number;
      };
      authError.statusCode = 401;
      throw authError;
    }

    return await customDevRepo.getUserRequests(userId);
  },
};