// src/modules/dashboard/dashboard.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { DashboardUser, DashboardStats, RecentOrder } from '../../types/dashboard';

export const dashboardRepo = {
  async getUserProfile(userId: string): Promise<DashboardUser | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, avatar_url, role, status, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data as DashboardUser | null;
  },

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    // 1. Fetch orders to calculate total_spent and active_orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('grand_total, payment_status')
      .eq('buyer_id', userId);

    if (ordersError) throw new Error(ordersError.message);

    let total_spent = 0;
    let active_orders = 0;

    orders?.forEach((order) => {
      if (order.payment_status === 'PAID' || order.payment_status === 'COMPLETED') {
        total_spent += Number(order.grand_total || 0);
      } else if (order.payment_status === 'PENDING') {
        active_orders++;
      }
    });

    // 2. Count downloadable items (active licenses)
    const { count: licenseCount, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .eq('status', 'ACTIVE');

    if (licenseError) console.warn('Failed to count active licenses:', licenseError.message);

    // 3. Count wishlist items
    let wishlist_count = 0;
    const { count: wishCount, error: wishError } = await supabaseAdmin
      .from('wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!wishError && wishCount !== null) {
      wishlist_count = wishCount;
    }

    return {
      total_spent,
      active_orders,
      downloadable_items: licenseCount || 0,
      wishlist_count,
    };
  },

  async getRecentOrders(userId: string): Promise<RecentOrder[]> {
    // Fetch orders and order_items without nested join to products
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, invoice_number, grand_total, payment_status, created_at, order_items(*)')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw new Error(error.message);

    const ordersList = data || [];

    // Collect all unique product_ids from order_items
    const productIds = Array.from(
      new Set(
        ordersList
          .flatMap((ord: any) => ord.order_items || [])
          .map((item: any) => item.product_id)
          .filter(Boolean)
      )
    );

    // Fetch product titles from the products table if product_ids exist
    const productTitleMap = new Map<string, string>();
    if (productIds.length > 0) {
      const { data: productsData, error: productsError } = await supabaseAdmin
        .from('products')
        .select('id, title')
        .in('id', productIds);

      if (!productsError && productsData) {
        productsData.forEach((prod: any) => {
          productTitleMap.set(prod.id, prod.title);
        });
      }
    }

    return ordersList.map((ord: any) => {
      const firstItem = ord.order_items?.[0];
      const firstProductTitle =
        firstItem?.product_title ||
        firstItem?.title ||
        firstItem?.product_name ||
        (firstItem?.product_id ? productTitleMap.get(firstItem.product_id) : null) ||
        'Themavia Digital Product';

      let mappedStatus: 'COMPLETED' | 'PENDING' | 'CANCELLED' = 'PENDING';
      if (ord.payment_status === 'PAID' || ord.payment_status === 'COMPLETED') {
        mappedStatus = 'COMPLETED';
      } else if (ord.payment_status === 'CANCELLED' || ord.payment_status === 'FAILED') {
        mappedStatus = 'CANCELLED';
      }

      return {
        id: ord.id,
        order_number: ord.invoice_number,
        product_name: firstProductTitle,
        total_amount: Number(ord.grand_total || 0),
        status: mappedStatus,
        created_at: ord.created_at,
      };
    });
  },
};