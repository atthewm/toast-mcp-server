/**
 * Typed models for Toast order-related API responses.
 */

export interface OrderSelection {
  guid?: string;
  itemGuid: string;
  quantity: number;
  modifiers?: Array<{
    guid: string;
    quantity?: number;
  }>;
  specialInstructions?: string;
}

export interface OrderCheck {
  guid?: string;
  selections: OrderSelection[];
  totalAmount?: number;
  taxAmount?: number;
  subtotalAmount?: number;
}

export interface Order {
  guid: string;
  entityType?: string;
  externalId?: string;
  openedDate?: string;
  modifiedDate?: string;
  closedDate?: string;
  promisedDate?: string;
  voided?: boolean;
  duration?: number;
  businessDate?: number;
  paidDate?: string;
  revenueCenter?: { guid: string; name?: string };
  diningOption?: { guid: string; name?: string };
  server?: { guid: string; name?: string };
  checks?: OrderCheck[];
  source?: string;
  approvalStatus?: string;
}

export interface OrderListResponse {
  orders: Order[];
  // Toast uses cursor-based pagination in some endpoints
  nextPageToken?: string;
}

export interface PriceOrderRequest {
  restaurantGuid: string;
  diningOptionGuid?: string;
  revenueCenterGuid?: string;
  selections: OrderSelection[];
}

export interface PriceOrderResponse {
  subtotal: number;
  tax: number;
  total: number;
  selections: Array<{
    itemGuid: string;
    name?: string;
    price: number;
    quantity: number;
  }>;
}

export interface CreateOrderRequest {
  restaurantGuid: string;
  diningOptionGuid: string;
  revenueCenterGuid?: string;
  checks: Array<{
    selections: OrderSelection[];
    customer?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };
  }>;
}
