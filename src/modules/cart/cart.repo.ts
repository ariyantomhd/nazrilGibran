// src/modules/cart/cart.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { Cart, CartItem } from '../../types/cart';

export type LicenseType = 'regular' | 'extended';

const DEFAULT_SUPPORT_PRICE = 12.0;

export const cartRepo = {
  async getCartByUserId(userId: string): Promise<Cart | null> {
    const { data, error } = await supabaseAdmin
      .from('carts')
      .select(`
        id, 
        user_id, 
        created_at, 
        updated_at,
        items:cart_items(
          id, 
          cart_id, 
          product_id, 
          quantity, 
          license_type,
          with_support,
          created_at,
          products(id, title, slug, regular_price, extended_price, discount_price, support_price, images_url, status)
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Gagal mengambil keranjang: ${error.message}`);
    }

    if (!data) return null;

    let cartSubtotal = 0;
    let totalItemsCount = 0;

    if (Array.isArray(data.items)) {
      data.items = data.items
        .filter((item: any) => item.products !== null)
        .map((item: any) => {
          const normalizedLicense: LicenseType =
            String(item.license_type || 'regular').toLowerCase() === 'extended'
              ? 'extended'
              : 'regular';

          const prod = item.products;
          const regularPrice = Number(prod.discount_price ?? prod.regular_price ?? 0);
          const extendedPrice = Number(prod.extended_price ?? regularPrice * 2);
          const unitPrice = normalizedLicense === 'extended' ? extendedPrice : regularPrice;

          const rawSupport = Number(prod.support_price ?? 0);
          const resolvedSupportPrice = rawSupport > 0 ? rawSupport : DEFAULT_SUPPORT_PRICE;
          const withSupport = Boolean(item.with_support);
          const qty = Math.max(1, Number(item.quantity || 1));

          const unitSupportCost = withSupport ? resolvedSupportPrice : 0;
          const itemSubtotal = Number(((unitPrice + unitSupportCost) * qty).toFixed(2));

          cartSubtotal += itemSubtotal;
          totalItemsCount += qty;

          return {
            ...item,
            quantity: qty,
            license_type: normalizedLicense,
            license: normalizedLicense,
            withSupport,
            unit_price: unitPrice,
            support_price: resolvedSupportPrice,
            item_subtotal: itemSubtotal,
            products: {
              ...prod,
              regular_price: regularPrice,
              extended_price: extendedPrice,
              support_price: resolvedSupportPrice,
              thumbnail_url: prod.images_url,
            },
          };
        });
    }

    return {
      ...data,
      total_items: totalItemsCount,
      subtotal: Number(cartSubtotal.toFixed(2)),
    } as unknown as Cart;
  },

  async createCart(userId: string): Promise<Cart> {
    const { data, error } = await supabaseAdmin
      .from('carts')
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (error) throw new Error(`Gagal membuat keranjang: ${error.message}`);
    return { ...data, items: [], total_items: 0, subtotal: 0 } as unknown as Cart;
  },

  async getCartItemByProduct(
    cartId: string,
    productId: string,
    withSupport: boolean,
    licenseType: LicenseType
  ): Promise<CartItem | null> {
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .eq('with_support', withSupport)
      .eq('license_type', licenseType)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as CartItem;
  },

  async upsertCartItem(
    cartId: string,
    productId: string,
    quantity: number,
    withSupport: boolean,
    licenseType: LicenseType = 'regular'
  ): Promise<void> {
    const existingItem = await this.getCartItemByProduct(cartId, productId, withSupport, licenseType);

    if (existingItem) {
      const { error } = await supabaseAdmin
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from('cart_items')
        .insert([
          {
            cart_id: cartId,
            product_id: productId,
            quantity,
            with_support: withSupport,
            license_type: licenseType,
          },
        ]);
      if (error) throw new Error(error.message);
    }
  },

  async updateCartItem(
    itemId: string,
    quantity: number,
    withSupport?: boolean,
    licenseType?: LicenseType
  ): Promise<void> {
    const updateData: any = { quantity };

    if (withSupport !== undefined) {
      updateData.with_support = withSupport;
    }

    if (licenseType !== undefined) {
      updateData.license_type = licenseType;
    }

    const { error } = await supabaseAdmin
      .from('cart_items')
      .update(updateData)
      .eq('id', itemId);

    if (error) throw new Error(`Gagal update item: ${error.message}`);
  },

  async removeCartItem(itemId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) throw new Error(`Gagal menghapus item: ${error.message}`);
  },

  async clearCartItems(cartId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId);

    if (error) throw new Error(`Gagal mengosongkan keranjang: ${error.message}`);
  },
};