// src/modules/licenses/license.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { License } from '../../types/order';

const SAFE_LICENSE_SELECT = `
  id,
  license_key,
  order_item_id,
  product_id,
  buyer_id,
  license_type,
  activated_domains,
  activation_count,
  status,
  created_at,
  updated_at,
  products (
    id,
    title,
    slug,
    images_url,
    category_id,
    current_version,
    live_preview_url,
    product_categories (
      id,
      name,
      slug
    )
  ),
  order_items (
    id,
    order_id,
    license_type,
    price_at_purchase,
    with_support,
    support_price,
    orders (
      id,
      invoice_number,
      created_at
    )
  )
`;

export const licenseRepo = {
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

  async getLicensesByBuyer(buyerId: string): Promise<License[]> {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .select(SAFE_LICENSE_SELECT)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch licenses: ${error.message}`);
    return data as unknown as License[];
  },

  async getLicenseById(licenseId: string, buyerId: string): Promise<License | null> {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .select(SAFE_LICENSE_SELECT)
      .eq('id', licenseId)
      .eq('buyer_id', buyerId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch license details: ${error.message}`);
    return data as unknown as License | null;
  },
};