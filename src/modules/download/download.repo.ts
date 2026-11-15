// src/modules/downloads/download.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { DownloadLogResponse } from '../../types/download';

export const downloadRepo = {
  // Mencatat log aktivitas unduhan user
  async createDownloadLog(logData: {
    user_id: string;
    product_id: string;
    license_id: string;
    status: string;
    ip_address?: string;
  }): Promise<DownloadLogResponse | null> {
    const { data, error } = await supabaseAdmin
      .from('download_logs') // Pastikan tabel ini ada di Supabase abang
      .insert([logData])
      .select()
      .single();

    if (error) {
      console.warn('Gagal mencatat log unduhan:', error.message);
      return null; // Mencegah crash jika tabel log opsional belum dibuat
    }

    return data as DownloadLogResponse;
  }
};