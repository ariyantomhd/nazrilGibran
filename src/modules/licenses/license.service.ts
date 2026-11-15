// src/modules/licenses/license.service.ts
import { licenseRepo } from './license.repo';
import { supabaseAdmin } from '../../config/supabase';
import { License } from '../../types/order';

// Definisikan tipe strict untuk item order yang masuk saat generate lisensi
interface OrderItemForLicense {
  id: string;
  product_id: string;
  license_type?: string;
}

// Definisikan tipe strict untuk produk berelasi pada tabel licenses
interface ProductRelation {
  file_path?: string;
  title?: string;
}

interface LicenseWithProduct extends License {
  products?: ProductRelation;
}

export const licenseService = {
  // Dipanggil otomatis oleh payment service ketika capture PayPal COMPLETED
  async generateLicensesForOrder(orderId: string, buyerId: string, orderItems: OrderItemForLicense[]): Promise<void> {
    const licenseEntries = orderItems.map(item => {
      // Buat format license key acak yang elegan (Contoh: TMV-A8F2-9B1C-4E7D)
      const randomKey = Array.from({ length: 3 }, () => 
        Math.random().toString(36).substring(2, 6).toUpperCase()
      ).join('-');
      const licenseKey = `TMV-${randomKey}`;

      // Normalisasi wajib ke lowercase agar cocok dengan enum PostgreSQL ('regular' / 'extended')
      const rawLicense = item.license_type || 'regular';
      const normalizedLicenseType = (rawLicense.toLowerCase() === 'extended' ? 'extended' : 'regular') as License['license_type'];

      return {
        license_key: licenseKey,
        order_item_id: item.id,
        product_id: item.product_id,
        buyer_id: buyerId,
        license_type: normalizedLicenseType,
        activated_domains: [],
        activation_count: 0,
        status: 'ACTIVE' as const // Menggunakan string literal langsung untuk menghindari error type-only
      };
    });

    await licenseRepo.createLicenses(licenseEntries);
  },

  async getMyLicenses(buyerId: string): Promise<License[]> {
    return await licenseRepo.getLicensesByBuyer(buyerId);
  },

  // Generate Signed URL untuk download file aset digital secara aman (Expired dalam 1 jam)
  async getDownloadUrl(buyerId: string, licenseId: string): Promise<{ download_url: string; file_name: string }> {
    const license = await licenseRepo.getLicenseById(licenseId, buyerId);
    if (!license) throw new Error('Lisensi tidak ditemukan atau Anda tidak memiliki akses');

    // Casting ke tipe data strict tanpa menggunakan 'any'
    const typedLicense = license as unknown as LicenseWithProduct;
    const product = typedLicense.products;
    
    if (!product || !product.file_path) {
      throw new Error('File produk untuk unduhan tidak ditemukan di server');
    }

    // Buat Signed URL dari Supabase Storage (Berlaku selama 3600 detik / 1 jam)
    const { data, error } = await supabaseAdmin.storage
      .from('product-files') // Nama bucket storage Supabase
      .createSignedUrl(product.file_path, 3600);

    if (error || !data) {
      throw new Error(`Gagal membuat tautan unduhan: ${error?.message || 'Unknown error'}`);
    }

    return {
      download_url: data.signedUrl,
      file_name: product.title ? `${product.title.toLowerCase().replace(/\s+/g, '-')}.zip` : 'download.zip'
    };
  }
};
