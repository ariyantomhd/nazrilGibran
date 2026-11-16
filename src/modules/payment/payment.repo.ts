// src/modules/payment/payment.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { TransactionRecordPayload } from '../../types/payment';

export const paymentRepo = {
  // Save payment transaction log to database table
  async saveTransactionRecord(transactionData: TransactionRecordPayload): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) {
      // Ignore or log warning if optional transactions table does not exist yet
      console.warn('Failed to save transaction log to table:', error.message);
      return null;
    }
    
    return data;
  }
};