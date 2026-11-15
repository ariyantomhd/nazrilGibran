// src/modules/auth/auth.service.ts
import { authRepo } from './auth.repo';
import { RegisterPayload, LoginPayload, UpdateUserProfileInput, UpdateUserPasswordInput } from '../../types/auth';
import { supabaseAdmin } from '../../config/supabase';
import { sendVerificationEmail } from '../../utils/email/verify';
import { ClientTelemetryData } from '../../utils/clientTelemetry';

export const authService = {
  async register(payload: RegisterPayload, telemetry?: ClientTelemetryData) {
    // 1. Buat user di Supabase Auth (Trigger otomatis DB jalan di sini)
    const user = await authRepo.registerUser(payload);
    if (!user) throw new Error('Gagal mendaftarkan user');

    // 2. Simpan telemetry IP, device, negara & deteksi VPN
    if (telemetry && user.id) {
      await authRepo.updateUserTelemetry(user.id, telemetry);
    }

    // 3. Generate Link Konfirmasi dari Supabase Admin
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: payload.email,
      password: payload.password
    });

    if (linkError || !linkData) {
      console.warn('[GenerateLink Warning]:', linkError?.message);
    }

    const confirmationUrl = linkData?.properties?.action_link || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?token=${user.id}`;

    // 4. Kirim email secara asynchronous non-blocking
    sendVerificationEmail(payload.email, confirmationUrl)
      .then(() => {
        console.log('✨ [SMTP Success]: Email konfirmasi berhasil dikirim ke:', payload.email);
      })
      .catch((emailError: any) => {
        console.warn('⚠️ [SMTP Warning]: Gagal mengirim email otomatis ->', emailError.message);
        console.log('🔗 Link Verifikasi Manual (Gunakan ini untuk testing):', confirmationUrl);
      });

    return user;
  },

  async login(payload: LoginPayload, telemetry?: ClientTelemetryData) {
    const authData = await authRepo.loginUser(payload);
    const userId = authData?.user?.id;

    if (telemetry && userId) {
      await authRepo.updateUserTelemetry(userId, telemetry);
    }

    return authData;
  },

  async getSocialAuthUrl(provider: 'google' | 'twitter') {
    const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: process.env.FRONTEND_URL || 'http://localhost:3000/dashboard',
        skipBrowserRedirect: true, // Wajib agar mengembalikan URL JSON ke backend/frontend
      },
    });

    if (error) throw new Error(error.message);
    if (!data?.url) throw new Error(`Gagal mendapatkan URL ${provider} Auth`);

    return data.url;
  },

  async getMe(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw new Error('User profile not found');
    return data;
  },

  async signout(accessToken?: string) {
    if (accessToken && accessToken.split('.').length === 3) {
      const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
      if (error) {
        console.warn('[Supabase Signout Info]:', error.message);
      }
    }
    return true;
  },

  async resetPassword(email: string) {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
    return true;
  },

  async updatePassword(userId: string, payload: UpdateUserPasswordInput) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: payload.new_password
    });
    if (error) throw new Error(error.message);
    return true;
  },

  async updateProfile(userId: string, payload: UpdateUserProfileInput) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        username: payload.username, 
        avatar_url: payload.avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
      
    if (error) throw new Error(error.message);
    return data;
  },

  async confirmation(token: string) {
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    });
    if (error || !data.user) throw new Error('Invalid or expired confirmation token');

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        status: 'ACTIVE', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', data.user.id);

    if (updateError) throw new Error(updateError.message);

    return true;
  }
};