// src/modules/downloads/download.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { DownloadLogResponse } from '../../types/download';

export const downloadRepo = {
  // Record user download activity log
  async createDownloadLog(logData: {
    user_id: string;
    product_id: string;
    license_id: string;
    status: string;
    ip_address?: string;
  }): Promise<DownloadLogResponse | null> {
    const { data, error } = await supabaseAdmin
      .from('download_logs')
      .insert([logData])
      .select()
      .single();

    if (error) {
      console.warn('Failed to record download log:', error.message);
      return null; // Prevent crash if optional log table is not yet created
    }

    return data as DownloadLogResponse;
  }
};