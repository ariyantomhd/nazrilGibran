// src/modules/auth/auth.repo.ts
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../config/supabase';
import { SocialUserProfile, UpdateUserProfileInput, User } from '../../types/auth';
import { ClientTelemetryData } from '../../utils/clientTelemetry';

export const authRepo = {
  async findUserById(userId: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as User | null;
  },

  async findUserByProviderOrEmail(
    provider: string,
    providerId: string,
    email: string | null
  ): Promise<User | null> {
    const { data: byProvider, error: providerErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('provider', provider)
      .eq('provider_id', providerId)
      .maybeSingle();

    if (providerErr) {
      console.warn('[Auth Repo Provider Lookup Warning]:', providerErr.message);
    }
    if (byProvider) return byProvider as User;

    if (email) {
      const { data: byEmail, error: emailErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (emailErr) throw new Error(emailErr.message);
      if (byEmail) return byEmail as User;
    }

    return null;
  },

  async upsertSocialUser(profile: SocialUserProfile): Promise<User> {
    const nowIso = new Date().toISOString();
    const normalizedEmail = profile.email
      ? profile.email.toLowerCase()
      : `${profile.provider}_${profile.providerId}@oauth.themavia.com`;

    const existing = await this.findUserByProviderOrEmail(
      profile.provider,
      profile.providerId,
      profile.email
    );

    if (existing) {
      const updatePayload: Record<string, unknown> = {
        provider: profile.provider,
        provider_id: profile.providerId,
        avatar_url: existing.avatar_url || profile.avatarUrl,
        last_seen_at: nowIso,
        updated_at: nowIso,
      };

      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as User;
    }

    const newUserId = randomUUID();
    const cleanUsername =
      profile.username
        .replace(/[^a-zA-Z0-9_.-]/g, '')
        .slice(0, 24) || `user_${newUserId.slice(0, 6)}`;

    const { data: created, error: createErr } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUserId,
        email: normalizedEmail,
        username: cleanUsername,
        avatar_url: profile.avatarUrl,
        provider: profile.provider,
        provider_id: profile.providerId,
        role: 'BUYER',
        status: 'ACTIVE',
        terms_accepted_at: nowIso,
        last_seen_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (createErr) throw new Error(createErr.message);
    return created as User;
  },

  async updateUserTelemetry(
    userId: string,
    telemetry: ClientTelemetryData
  ): Promise<void> {
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

  async updateProfile(
    userId: string,
    payload: Partial<UpdateUserProfileInput>
  ): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        ...(payload.username !== undefined ? { username: payload.username } : {}),
        ...(payload.avatar_url !== undefined ? { avatar_url: payload.avatar_url } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as User;
  },
};