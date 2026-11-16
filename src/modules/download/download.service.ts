// src/modules/downloads/download.service.ts
import { downloadRepo } from './download.repo';
import { supabaseAdmin } from '../../config/supabase';
import { DownloadResponse } from '../../types/download';

export const downloadService = {
  async processDownload(buyerId: string, licenseKey: string, ipAddress?: string): Promise<DownloadResponse> {
    // 1. Validate license key ownership in database
    const { data: license, error } = await supabaseAdmin
      .from('licenses')
      .select('*, products(*)')
      .eq('license_key', licenseKey.trim().toUpperCase())
      .eq('buyer_id', buyerId)
      .single();

    if (error || !license) {
      throw new Error('Invalid license key or you do not have access to this license');
    }

    if (license.status !== 'ACTIVE') {
      throw new Error('This license is inactive or has expired');
    }

    const product = license.products;
    const rawPath = product?.file_source_url || product?.file_path || product?.download_url;
    if (!product || !rawPath) {
      throw new Error('Product archive file is not yet available on the storage server');
    }

    const productTitle = product.title || product.name || 'themavia-product';
    const fileName = `${productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`;

    let resolvedDownloadUrl = rawPath;

    // 2. Generate Signed URL from Supabase Storage if not an external URL (Valid for 1 hour / 3600s)
    if (!rawPath.startsWith('http://') && !rawPath.startsWith('https://')) {
      const cleanStoragePath = rawPath.replace(/^product-files\//, '');
      const { data: storageData, error: storageError } = await supabaseAdmin.storage
        .from('product-files')
        .createSignedUrl(cleanStoragePath, 3600, {
          download: fileName,
        });

      if (storageError || !storageData) {
        throw new Error(`Failed to generate download link: ${storageError?.message || 'Unknown error'}`);
      }
      resolvedDownloadUrl = storageData.signedUrl;
    }

    // 3. Record download activity log
    await downloadRepo.createDownloadLog({
      user_id: buyerId,
      product_id: product.id,
      license_id: license.id,
      status: 'SUCCESS',
      ip_address: ipAddress
    });

    return {
      download_url: resolvedDownloadUrl,
      file_name: fileName,
      expires_in: '1 Hour',
      message: 'Download link generated successfully'
    };
  }
};