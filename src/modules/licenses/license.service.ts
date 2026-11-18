// src/modules/licenses/license.service.ts
import crypto from 'crypto';
import { licenseRepo } from './license.repo';
import { downloadService } from '../download/download.service';
import { AppError } from '../../utils/app-error';
import { License } from '../../types/order';

interface OrderItemForLicense {
  id: string;
  product_id: string;
  license_type?: string;
}

function generateCryptographicLicenseKey(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(12);
  let chars = '';
  for (let i = 0; i < 12; i++) {
    chars += alphabet[bytes[i] % alphabet.length];
  }
  return `TMV-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

export const licenseService = {
  async generateLicensesForOrder(
    _orderId: string,
    buyerId: string,
    orderItems: OrderItemForLicense[]
  ): Promise<void> {
    const licenseEntries = orderItems.map((item) => {
      const licenseKey = generateCryptographicLicenseKey();
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
    if (!buyerId) {
      throw new AppError('Authentication required.', 401);
    }
    return await licenseRepo.getLicensesByBuyer(buyerId);
  },

  async getDownloadUrl(
    buyerId: string,
    licenseId: string,
    ipAddress?: string
  ): Promise<{ download_url: string; file_name: string; license_key: string; expires_in: string }> {
    const result = await downloadService.processDownloadByLicenseId(
      buyerId,
      licenseId,
      ipAddress
    );

    return {
      download_url: result.download_url,
      file_name: result.file_name ?? 'themavia-product.zip',
      license_key: result.license_key,
      expires_in: result.expires_in ?? '15 Minutes',
    };
  },
};