// src/modules/auth/auth.repo.ts
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { RegisterPayload, LoginPayload } from '../../types/auth';
import { ClientTelemetryData } from '../../utils/clientTelemetry';

const supabaseAuthClient = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_PUBLISHABLE_KEY || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

export const authRepo = {
  async registerUser(payload: RegisterPayload) {
    // 1. Buat user menggunakan admin API dengan status belum terkonfirmasi
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: false 
    });
    if (error) throw new Error(error.message);
    
    // (Trigger di database Supabase akan otomatis menangani pembuatan record di tabel public.users)
    return data.user;
  },

  async loginUser(payload: LoginPayload) {
    const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async updateUserTelemetry(userId: string, telemetry: ClientTelemetryData): Promise<void> {
    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        last_login_ip: telemetry.ip,
        last_device: telemetry.device,
        last_country: telemetry.country,
        is_vpn_detected: telemetry.isVpn,
        last_seen_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', userId);

    if (error) {
      console.warn('[Telemetry Repo Warning]:', error.message);
    }
  },
};