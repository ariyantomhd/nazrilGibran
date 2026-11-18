// src/modules/payment/payment.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { TransactionRecordPayload } from '../../types/payment';

export const paymentRepo = {
  // Save payment transaction log to database table
  async saveTransactionRecord(transactionData: TransactionRecordPayload): Promise<unknown> {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) {
      console.warn('[Payment Transaction Log Warning]:', error.message);
      return null;
    }

    return data;
  },
};