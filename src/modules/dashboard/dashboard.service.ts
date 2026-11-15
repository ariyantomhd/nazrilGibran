// src/modules/dashboard/dashboard.service.ts
import { dashboardRepo } from './dashboard.repo';
import { UserDashboardData } from '../../types/dashboard';

export const dashboardService = {
  async getDashboardData(userId: string): Promise<UserDashboardData> {
    const user = await dashboardRepo.getUserProfile(userId);
    if (!user) throw new Error('Profil pengguna tidak ditemukan');

    const stats = await dashboardRepo.getDashboardStats(userId);
    const recent_orders = await dashboardRepo.getRecentOrders(userId);

    return {
      user,
      stats,
      recent_orders,
    };
  },
};