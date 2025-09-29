export interface AuditLog {
  id: string;
  product_id: string;
  user_id: string;
  old_quantity: number;
  new_quantity: number;
  reason: string;
  operation_type: 'manual_adjustment' | 'sale' | 'purchase' | 'damage' | 'transfer' | 'correction';
  created_at: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  product?: {
    id: string;
    sku: string;
    name: string;
  };
}

// Backend audit history response structure
export interface AuditHistoryItem {
  id: number;
  product: string;
  user: string;
  change: {
    from: number;
    to: number;
    difference: number;
    type: 'increase' | 'decrease';
  };
  reason: string;
  operation_type: 'manual_adjustment' | 'sale' | 'purchase' | 'damage' | 'transfer' | 'correction';
  timestamp: string;
}

export interface ProductAuditHistory {
  product: {
    id: number;
    sku: string;
    name: string;
    current_quantity: number;
  };
  audit_history: AuditHistoryItem[];
  summary: {
    total_changes: number;
    total_increases: number;
    total_decreases: number;
    earliest_record: string;
    latest_record: string;
  };
}

export interface AuditFilter {
  product_id?: string;
  user_id?: string;
  operation_type?: AuditLog['operation_type'];
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}