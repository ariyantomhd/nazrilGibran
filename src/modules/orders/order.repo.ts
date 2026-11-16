import { supabaseAdmin } from '../../config/supabase';
import { Order, OrderItem } from '../../types/order';
import { OrderStatus } from '../../types/enums';

export const orderRepo = {
  // 1. Insert into orders table
  async createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_items'>): Promise<Order> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) throw new Error(`Failed to create order: ${error.message}`);
    return data as Order;
  },

  // 2. Insert into order_items table (Bulk insert)
  async createOrderItems(itemsData: Omit<OrderItem, 'id' | 'created_at'>[]): Promise<OrderItem[]> {
    const { data, error } = await supabaseAdmin
      .from('order_items')
      .insert(itemsData)
      .select();

    if (error) throw new Error(`Failed to create order items: ${error.message}`);
    return data as OrderItem[];
  },

  // 3. Fetch order details by ID and Buyer (Ensures users cannot access others' invoices)
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

  // 4. Fetch all order history for the user
  async getOrdersByBuyerId(buyerId: string): Promise<Order[]> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as Order[];
  },

  // 5. Update status after PayPal payment succeeds
  async updatePaymentStatus(orderId: string, status: OrderStatus, paypalTxId?: string): Promise<void> {
    const updateData: Partial<Order> = { payment_status: status };
    if (paypalTxId) updateData.paypal_transaction_id = paypalTxId;

    const { error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) throw new Error(`Failed to update order status: ${error.message}`);
  }
};