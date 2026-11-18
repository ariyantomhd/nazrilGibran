// src/modules/custom-development/customDev.repo.ts
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../config/supabase';
import {
  CreateCustomDevRequestDTO,
  ProjectCategoryType,
} from './customDev.schema';

export interface CustomDevRequestRecord {
  id: string;
  user_id: string | null;
  client_name: string;
  client_email: string;
  company_name: string | null;
  project_title: string;
  project_type: ProjectCategoryType;
  budget_range: string;
  timeline: string;
  description: string;
  status: string;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const customDevRepo = {
  async createRequest(
    payload: CreateCustomDevRequestDTO,
    userId?: string
  ): Promise<CustomDevRequestRecord> {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('custom_dev_requests')
      .insert({
        id: randomUUID(),
        user_id: userId || null,
        client_name: payload.client_name,
        client_email: payload.client_email,
        company_name: payload.company_name || null,
        project_title: payload.project_title,
        project_type: payload.project_type,
        budget_range: payload.budget_range,
        timeline: payload.timeline,
        description: payload.description,
        status: 'PENDING',
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to save custom development request: ${error.message}`);
    }

    return data as CustomDevRequestRecord;
  },

  async getUserRequests(userId: string): Promise<CustomDevRequestRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('custom_dev_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user requests: ${error.message}`);
    }

    return (data ?? []) as CustomDevRequestRecord[];
  },
};