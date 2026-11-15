// src/modules/licenses/license.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { License } from '../../types/order';

export const licenseRepo = {
  // 1. Bulk insert license ketika order sukses dibayar
  async createLicenses(licensesData: Omit<License, 'id' | 'created_at' | 'updated_at'>[]): Promise<License[]> {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .insert(licensesData)
      .select();

    if (error) throw new Error(`Gagal membuat lisensi: ${error.message}`);
    return data as License[];
  },

  // 2. Ambil semua lisensi yang dimiliki oleh user (buyer)
  async getLicensesByBuyer(buyerId: string): Promise<License[]> {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .select('*, order_items(*, products(*))')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Gagal mengambil data lisensi: ${error.message}`);
    return data as License[];
  },

  // 3. Ambil detail lisensi berdasarkan ID untuk keperluan download
  async getLicenseById(licenseId: string, buyerId: string): Promise<License | null> {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .select('*, order_items(*, products(*))')
      .eq('id', licenseId)
      .eq('buyer_id', buyerId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data as License | null;
  }
};