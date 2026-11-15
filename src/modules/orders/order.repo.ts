import { supabaseAdmin } from '../../config/supabase';
import { Order, OrderItem } from '../../types/order';
import { OrderStatus } from '../../types/enums';

export const orderRepo = {
  // 1. Insert ke tabel orders
  async createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_items'>): Promise<Order> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) throw new Error(`Gagal membuat order: ${error.message}`);
    return data as Order;
  },

  // 2. Insert ke tabel order_items (Bulk insert)
  async createOrderItems(itemsData: Omit<OrderItem, 'id' | 'created_at'>[]): Promise<OrderItem[]> {
    const { data, error } = await supabaseAdmin
      .from('order_items')
      .insert(itemsData)
      .select();

    if (error) throw new Error(`Gagal membuat detail order: ${error.message}`);
    return data as OrderItem[];
  },

  // 3. Ambil detail order berdasarkan ID dan Buyer (Keamanan agar tidak bisa akses invoice orang lain)
  async getOrderById(orderId: string, buyerId: string): Promise<Order | null> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .eq('buyer_id', buyerId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data as Order | null;
  },

  // 4. Ambil semua riwayat order milik user
  async getOrdersByBuyerId(buyerId: string): Promise<Order[]> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as Order[];
  },

  // 5. Update status setelah pembayaran PayPal berhasil
  async updatePaymentStatus(orderId: string, status: OrderStatus, paypalTxId?: string): Promise<void> {
    const updateData: Partial<Order> = { payment_status: status };
    if (paypalTxId) updateData.paypal_transaction_id = paypalTxId;

    const { error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) throw new Error(`Gagal update status order: ${error.message}`);
  }
};