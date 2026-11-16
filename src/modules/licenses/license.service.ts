// src/modules/licenses/license.service.ts
import { licenseRepo } from './license.repo';
import { supabaseAdmin } from '../../config/supabase';
import { License } from '../../types/order';

interface OrderItemForLicense {
  id: string;
  product_id: string;
  license_type?: string;
}

interface ProductRelation {
  id?: string;
  file_source_url?: string | null;
  file_path?: string | null;
  download_url?: string | null;
  title?: string;
  name?: string;
}

interface LicenseWithProduct extends License {
  products?: ProductRelation;
  order_items?: {
    products?: ProductRelation;
  };
}

export const licenseService = {
  async generateLicensesForOrder(
    _orderId: string,
    buyerId: string,
    orderItems: OrderItemForLicense[]
  ): Promise<void> {
    const licenseEntries = orderItems.map((item) => {
      const randomKey = Array.from({ length: 3 }, () =>
        Math.random().toString(36).substring(2, 6).toUpperCase()
      ).join('-');
      const licenseKey = `TMV-${randomKey}`;

      const rawLicense = item.license_type || 'regular';
      const normalizedLicenseType = (
        rawLicense.toLowerCase() === 'extended' ? 'extended' : 'regular'
      ) as License['license_type'];

      return {
        license_key: licenseKey,
        order_item_id: item.id,
        product_id: item.product_id,
        buyer_id: buyerId,
        license_type: normalizedLicenseType,
        activated_domains: [],
        activation_count: 0,
        status: 'ACTIVE' as const,
      };
    });

    await licenseRepo.createLicenses(licenseEntries);
  },

  async getMyLicenses(buyerId: string): Promise<License[]> {
    return await licenseRepo.getLicensesByBuyer(buyerId);
  },

  async getDownloadUrl(
    buyerId: string,
    licenseId: string
  ): Promise<{ download_url: string; file_name: string; license_key: string }> {
    const license = await licenseRepo.getLicenseById(licenseId, buyerId);
    if (!license) {
      throw new Error('License not found or you do not have access');
    }

    if (license.status !== 'ACTIVE') {
      throw new Error('Your license is currently inactive or suspended');
    }

    const typedLicense = license as unknown as LicenseWithProduct;
    const product = typedLicense.products || typedLicense.order_items?.products;

    const rawPath =
      product?.file_source_url || product?.file_path || product?.download_url;
    const productTitle = product?.title || product?.name || 'themavia-product';
    const fileName = `${productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`;

    if (!rawPath) {
      throw new Error('Product ZIP file has not been uploaded by the seller/admin');
    }

    // Return directly if file_source_url is already a full external URL
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      return {
        download_url: rawPath,
        file_name: fileName,
        license_key: license.license_key,
      };
    }

    // Generate Signed URL from Supabase Storage bucket 'product-files' (valid for 1 hour)
    const cleanStoragePath = rawPath.replace(/^product-files\//, '');
    const { data, error } = await supabaseAdmin.storage
      .from('product-files')
      .createSignedUrl(cleanStoragePath, 3600, {
        download: fileName,
      });

    if (error || !data) {
      throw new Error(
        `Failed to generate download link: ${error?.message || 'File not found in storage bucket'}`
      );
    }

    return {
      download_url: data.signedUrl,
      file_name: fileName,
      license_key: license.license_key,
    };
  },
};