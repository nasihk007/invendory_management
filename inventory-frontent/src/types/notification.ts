export interface Notification {
  id: number;
  product_id: number;
  message: string;
  type: 'low_stock' | 'out_of_stock' | 'reorder_required';
  is_read: boolean;
  created_at: string;
  updated_at: string;
  Product: {
    id: number;
    name: string;
    sku: string;
    category: string;
  };
  urgency: 'critical' | 'warning' | 'normal';
  age_hours: number;
}

export interface NotificationFilter {
  unread?: boolean;
  unreadOnly?: boolean;
  type?: Notification['type'];
  offset?: number;
  limit?: number;
  product_id?: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  summary: {
    total_notifications: number;
    unread_count: number;
    critical_count: number;
  };
}

export interface NotificationsApiResponse {
  statusCode: number;
  status: boolean;
  message: string;
  data: NotificationsResponse;
  meta: {
    take: number;
    itemCount: number;
    page: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}