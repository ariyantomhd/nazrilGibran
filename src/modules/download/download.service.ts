// src/modules/downloads/download.service.ts
import { downloadRepo } from './download.repo';
import { licenseRepo } from '../licenses/license.repo';
import { supabaseAdmin } from '../../config/supabase';
import { DownloadResponse } from '../../types/download';

export const downloadService = {
  async processDownload(buyerId: string, licenseKey: string, ipAddress?: string): Promise<DownloadResponse> {
    // 1. Validasi keberadaan license key di database
    const { data: license, error } = await supabaseAdmin
      .from('licenses')
      .select('*, products(*)')
      .eq('license_key', licenseKey.trim().toUpperCase())
      .eq('buyer_id', buyerId)
      .single();

    if (error || !license) {
      throw new Error('Kunci lisensi tidak valid atau bukan milik Anda');
    }

    if (license.status !== 'ACTIVE') {
      throw new Error('Lisensi ini sedang tidak aktif atau sudah kedaluwarsa');
    }

    const product = license.products;
    if (!product || !product.file_path) {
      throw new Error('File produk fisik/digital tidak ditemukan di server penyimpanan');
    }

    // 2. Buat Signed URL dari Supabase Storage (Berlaku selama 1 jam / 3600 detik)
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('product-files')
      .createSignedUrl(product.file_path, 3600);

    if (storageError || !storageData) {
      throw new Error(`Gagal menghasilkan tautan unduhan: ${storageError?.message || 'Unknown error'}`);
    }

    // 3. Catat aktivitas unduhan ke log
    await downloadRepo.createDownloadLog({
      user_id: buyerId,
      product_id: product.id,
      license_id: license.id,
      status: 'SUCCESS',
      ip_address: ipAddress
    });

    return {
      download_url: storageData.signedUrl,
      file_name: product.title ? `${product.title.toLowerCase().replace(/\s+/g, '-')}.zip` : 'download.zip',
      expires_in: '1 Jam',
      message: 'Tautan unduhan berhasil dibuat'
    };
  }
};