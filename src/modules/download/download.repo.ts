// src/modules/download/download.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { DownloadLogResponse } from '../../types/download';

export const downloadRepo = {
  async countDownloadsLast24Hours(licenseId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabaseAdmin
      .from('download_logs')
      .select('id', { count: 'exact', head: true })
      .eq('license_id', licenseId)
      .eq('status', 'SUCCESS')
      .gte('created_at', since);

    if (error) {
      console.warn('[Download Quota Check Warning]:', error.message);
      return 0;
    }

    return count ?? 0;
  },

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
      console.warn('[Download Audit Log Warning]:', error.message);
      return null;
    }

    return data as DownloadLogResponse;
  },
};