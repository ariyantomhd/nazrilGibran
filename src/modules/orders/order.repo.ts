// src/modules/orders/order.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { Order, OrderItem } from '../../types/order';
import { OrderStatus } from '../../types/enums';

// Explicit safe columns for buyer-facing DTO (excludes internal seller fee & affiliate token fields)
const SAFE_ORDER_SELECT = `
  id,
  buyer_id,
  invoice_number,
  subtotal,
  discount_total,
  buyer_fee,
  gateway_fee,
  grand_total,
  payment_gateway,
  paypal_transaction_id,
  payment_status,
  created_at,
  updated_at,
  order_items (
    id,
    order_id,
    product_id,
    license_type,
    price_at_purchase,
    created_at
  )
`;

export const orderRepo = {
  // Atomic RPC call to create order and items in a single transaction
  async createOrderAtomic(
    orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_items'> & { coupon_code: string | null },
    itemsData: Omit<OrderItem, 'id' | 'order_id' | 'created_at'>[]
  ): Promise<Order> {
    const { data, error } = await supabaseAdmin.rpc('create_order_with_items', {
      p_order: orderData,
      p_items: itemsData,
    });

    if (error) throw new Error(`Failed to create order atomically: ${error.message}`);
    return data as Order;
  },

  // Fetch order details by ID and Buyer (Ensures users cannot access others' invoices)
  async getOrderById(orderId: string, buyerId: string): Promise<Order | null> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(SAFE_ORDER_SELECT)
      .eq('id', orderId)
      .eq('buyer_id', buyerId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as unknown as Order | null;
  },

  // Fetch all order history for the user
  async getOrdersByBuyerId(buyerId: string): Promise<Order[]> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(SAFE_ORDER_SELECT)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as unknown as Order[];
  },

  // Update status after PayPal payment succeeds
  async updatePaymentStatus(
    orderId: string,
    status: OrderStatus,
    paypalTxId?: string
  ): Promise<void> {
    const updateData: Partial<Order> = {
      payment_status: status,
      updated_at: new Date().toISOString(),
    };
    if (paypalTxId) updateData.paypal_transaction_id = paypalTxId;

    const { error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) throw new Error(`Failed to update order status: ${error.message}`);
  },
};