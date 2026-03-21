/**
 * Typed models for Toast restaurant-related API responses.
 * These represent the subset of fields we actively use.
 * Toast API responses may contain additional fields.
 */

export interface RestaurantInfo {
  guid: string;
  name: string;
  locationName?: string;
  locationCode?: string;
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  phone?: string;
  timezone?: string;
  currencyCode?: string;
  managementGroupGuid?: string;
}

export interface RevenueCenter {
  guid: string;
  name: string;
  entityType?: string;
}

export interface DiningOption {
  guid: string;
  name: string;
  behavior?: string;
  curbside?: boolean;
}

export interface ServiceArea {
  guid: string;
  name: string;
  revenueCenter?: { guid: string };
}

export interface ConfigSummary {
  restaurant: RestaurantInfo;
  revenueCenters: RevenueCenter[];
  diningOptions: DiningOption[];
  serviceAreas: ServiceArea[];
}
