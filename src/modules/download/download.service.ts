// src/modules/download/download.service.ts
import { z } from 'zod';
import { downloadRepo } from './download.repo';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/app-error';
import { DownloadResponse } from '../../types/download';

const licenseKeySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^TMV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid license key format.');

const uuidSchema = z.string().uuid('Invalid license identifier format.');

const SIGNED_URL_EXPIRES_SECONDS = 900; // 15 minutes
const MAX_DOWNLOADS_PER_24H = 10;

function sanitizeStoragePath(rawPath: string): string {
  const cleaned = rawPath.replace(/^product-files\//, '').trim();
  if (
    !cleaned ||
    cleaned.includes('..') ||
    cleaned.startsWith('/') ||
    cleaned.startsWith('http://') ||
    cleaned.startsWith('https://')
  ) {
    throw new AppError('Invalid or unsecure product archive storage path.', 500);
  }
  return cleaned;
}

export const downloadService = {
  async generateSecureDownloadByLicenseRecord(
    buyerId: string,
    license: {
      id: string;
      license_key: string;
      status: string;
      product_id: string;
      products?: {
        id?: string;
        title?: string;
        name?: string;
        file_source_url?: string | null;
        file_path?: string | null;
        download_url?: string | null;
      } | null;
    },
    ipAddress?: string
  ): Promise<DownloadResponse & { license_key: string }> {
    if (license.status !== 'ACTIVE') {
      throw new AppError('This license is inactive or has been revoked.', 403);
    }

    // 1. Enforce 24-hour download rate limit per license
    const recentDownloads = await downloadRepo.countDownloadsLast24Hours(license.id);
    if (recentDownloads >= MAX_DOWNLOADS_PER_24H) {
      throw new AppError(
        `Daily download limit (${MAX_DOWNLOADS_PER_24H} downloads per 24 hours) reached for this license.`,
        429
      );
    }

    const product = license.products;
    const rawPath = product?.file_source_url || product?.file_path || product?.download_url;
    if (!product || !rawPath) {
      throw new AppError('Product archive file is not yet available on the storage server.', 404);
    }

    const productTitle = product.title || product.name || 'themavia-product';
    const fileName = `${productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`;

    // 2. Strictly enforce private Supabase Storage Signed URL (no raw external URL passthrough)
    const cleanStoragePath = sanitizeStoragePath(rawPath);
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('product-files')
      .createSignedUrl(cleanStoragePath, SIGNED_URL_EXPIRES_SECONDS, {
        download: fileName,
      });

    if (storageError || !storageData?.signedUrl) {
      console.error('[Download Storage SignedURL Error]:', storageError?.message);
      throw new AppError('Failed to generate secure download link. Please try again later.', 500);
    }

    // 3. Record download audit log
    await downloadRepo.createDownloadLog({
      user_id: buyerId,
      product_id: product.id || license.product_id,
      license_id: license.id,
      status: 'SUCCESS',
      ip_address: ipAddress,
    });

    return {
      download_url: storageData.signedUrl,
      file_name: fileName,
      license_key: license.license_key,
      expires_in: '15 Minutes',
      message: 'Download link generated successfully.',
    };
  },

  async processDownload(
    buyerId: string,
    rawLicenseKey: string,
    ipAddress?: string
  ): Promise<DownloadResponse> {
    if (!buyerId) {
      throw new AppError('Authentication required.', 401);
    }

    const parsedKey = licenseKeySchema.safeParse(rawLicenseKey);
    if (!parsedKey.success) {
      throw new AppError(parsedKey.error.issues[0]?.message || 'Invalid license key format.', 400);
    }

    const { data: license, error } = await supabaseAdmin
      .from('licenses')
      .select('id, license_key, status, product_id, products(id, title, file_source_url)')
      .eq('license_key', parsedKey.data)
      .eq('buyer_id', buyerId)
      .maybeSingle();

    if (error || !license) {
      throw new AppError('Invalid license key or you do not have access to this license.', 404);
    }

    const typedLicense = license as unknown as Parameters<
      typeof this.generateSecureDownloadByLicenseRecord
    >[1];

    const result = await this.generateSecureDownloadByLicenseRecord(
      buyerId,
      typedLicense,
      ipAddress
    );

    return {
      download_url: result.download_url,
      file_name: result.file_name,
      expires_in: result.expires_in,
      message: result.message,
    };
  },

  async processDownloadByLicenseId(
    buyerId: string,
    rawLicenseId: string,
    ipAddress?: string
  ): Promise<DownloadResponse & { license_key: string }> {
    if (!buyerId) {
      throw new AppError('Authentication required.', 401);
    }

    const parsedId = uuidSchema.safeParse(rawLicenseId);
    if (!parsedId.success) {
      throw new AppError(parsedId.error.issues[0]?.message || 'Invalid license ID.', 400);
    }

    const { data: license, error } = await supabaseAdmin
      .from('licenses')
      .select('id, license_key, status, product_id, products(id, title, file_source_url)')
      .eq('id', parsedId.data)
      .eq('buyer_id', buyerId)
      .maybeSingle();

    if (error || !license) {
      throw new AppError('License not found or you do not have access.', 404);
    }

    const typedLicense = license as unknown as Parameters<
      typeof this.generateSecureDownloadByLicenseRecord
    >[1];

    return await this.generateSecureDownloadByLicenseRecord(
      buyerId,
      typedLicense,
      ipAddress
    );
  },
};