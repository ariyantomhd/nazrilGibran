// src/modules/payment/payment.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { TransactionRecordPayload } from '../../types/payment';

export const paymentRepo = {
  // Menyimpan log transaksi pembayaran ke tabel database
  async saveTransactionRecord(transactionData: TransactionRecordPayload): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('transactions') // Pastikan tabel ini ada jika ingin mencatat log transaksi terpisah
      .insert([transactionData])
      .select()
      .single();

    if (error) {
      // Jika tabel transactions belum dibuat di database, kita abaikan atau log saja agar tidak bikin crash
      console.warn('Gagal menyimpan log transaksi ke tabel:', error.message);
      return null;
    }
    
    return data;
  }
};