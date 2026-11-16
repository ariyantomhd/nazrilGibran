// src/modules/licenses/license.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { License } from '../../types/order';

export const licenseRepo = {
  // 1. Bulk insert licenses when an order is successfully paid
  async createLicenses(
    licensesData: Omit<License, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<License[]> {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .insert(licensesData)
      .select();

    if (error) throw new Error(`Failed to create licenses: ${error.message}`);
    return data as License[];
  },

  // 2. Fetch all licenses owned by the buyer along with product & order details
  async getLicensesByBuyer(buyerId: string): Promise<License[]> {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .select('*, products(*), order_items(*, orders(*))')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch licenses: ${error.message}`);
    return data as License[];
  },

  // 3. Fetch license details by ID for downloading
  async getLicenseById(licenseId: string, buyerId: string): Promise<License | null> {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .select('*, products(*), order_items(*, products(*))')
      .eq('id', licenseId)
      .eq('buyer_id', buyerId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data as License | null;
  },
};