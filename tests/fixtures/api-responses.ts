/**
 * Mock API response objects for use across all test files.
 * These represent realistic Toast API response shapes.
 */

import type {
  RestaurantInfo,
  RevenueCenter,
  DiningOption,
  Menu,
  MenuGroup,
  MenuItemReference,
  Order,
  OrderCheck,
} from "../../src/models/index.js";

// ==================== Restaurant ====================

export const mockRestaurantInfo: RestaurantInfo = {
  guid: "c227349d-7778-4ec2-af27-e386eb2ec52e",
  name: "Remote Coffee",
  locationName: "Remote Coffee Downtown",
  locationCode: "RC001",
  address: {
    street1: "100 Main Street",
    street2: "Suite 1",
    city: "Austin",
    state: "TX",
    zip: "78701",
    country: "US",
  },
  phone: "5125551234",
  timezone: "America/Chicago",
  currencyCode: "USD",
  managementGroupGuid: "mgmt-guid-001",
};

// ==================== Revenue Centers ====================

export const mockRevenueCenters: RevenueCenter[] = [
  {
    guid: "rev-center-001",
    name: "Counter",
    entityType: "RevenueCenter",
  },
  {
    guid: "rev-center-002",
    name: "Drive Through",
    entityType: "RevenueCenter",
  },
];

// ==================== Dining Options ====================

export const mockDiningOptions: DiningOption[] = [
  {
    guid: "dine-opt-001",
    name: "Dine In",
    behavior: "DINE_IN",
    curbside: false,
  },
  {
    guid: "dine-opt-002",
    name: "Takeout",
    behavior: "TAKE_OUT",
    curbside: false,
  },
  {
    guid: "dine-opt-003",
    name: "Curbside Pickup",
    behavior: "TAKE_OUT",
    curbside: true,
  },
];

// ==================== Menu Items and Groups ====================

export const mockModifiers = [
  {
    guid: "mod-oat-milk",
    name: "Oat Milk",
    price: 0.75,
    preModifier: false,
  },
  {
    guid: "mod-almond-milk",
    name: "Almond Milk",
    price: 0.75,
    preModifier: false,
  },
  {
    guid: "mod-extra-shot",
    name: "Extra Shot",
    price: 1.0,
    preModifier: false,
  },
];

export const mockMenuItems: MenuItemReference[] = [
  {
    guid: "item-latte",
    name: "House Latte",
    description: "A smooth and creamy espresso with steamed milk",
    price: 5.5,
    plu: "1001",
    sku: "LATTE",
    visibility: "ALL",
    modifierGroups: [
      {
        guid: "modgrp-milk",
        name: "Milk Options",
        minSelections: 0,
        maxSelections: 1,
        modifiers: mockModifiers.slice(0, 2),
      },
      {
        guid: "modgrp-extras",
        name: "Extras",
        minSelections: 0,
        maxSelections: 3,
        modifiers: [mockModifiers[2]],
      },
    ],
  },
  {
    guid: "item-drip",
    name: "Drip Coffee",
    description: "Freshly brewed single origin drip coffee",
    price: 3.0,
    plu: "1002",
    sku: "DRIP",
    visibility: "ALL",
  },
  {
    guid: "item-muffin",
    name: "Blueberry Muffin",
    description: "Fresh baked blueberry muffin",
    price: 3.5,
    plu: "2001",
    sku: "MUFFIN",
    visibility: "ALL",
  },
  {
    guid: "item-cookie",
    name: "Chocolate Chip Cookie",
    description: "Warm chocolate chip cookie",
    price: 2.5,
    plu: "2002",
    sku: "COOKIE",
    visibility: "ALL",
  },
];

export const mockMenuGroups: MenuGroup[] = [
  {
    guid: "group-espresso",
    name: "Espresso Drinks",
    description: "Handcrafted espresso beverages",
    items: [mockMenuItems[0]],
    visibility: "ALL",
  },
  {
    guid: "group-brewed",
    name: "Brewed Coffee",
    description: "Freshly brewed coffees",
    items: [mockMenuItems[1]],
    visibility: "ALL",
  },
  {
    guid: "group-pastry",
    name: "Pastries",
    description: "Fresh baked goods",
    items: [mockMenuItems[2], mockMenuItems[3]],
    subgroups: [
      {
        guid: "group-seasonal",
        name: "Seasonal Specials",
        items: [
          {
            guid: "item-pumpkin-muffin",
            name: "Pumpkin Spice Muffin",
            description: "Limited time seasonal treat",
            price: 4.0,
            visibility: "ALL",
          },
        ],
      },
    ],
    visibility: "ALL",
  },
];

export const mockMenu: Menu = {
  guid: "menu-main",
  name: "Main Menu",
  description: "Remote Coffee main menu",
  groups: mockMenuGroups,
  visibility: "ALL",
};

export const mockMenus: Menu[] = [
  mockMenu,
  {
    guid: "menu-catering",
    name: "Catering Menu",
    description: "Catering and bulk orders",
    groups: [
      {
        guid: "group-catering-drinks",
        name: "Catering Beverages",
        items: [
          {
            guid: "item-coffee-box",
            name: "Coffee Box (serves 10)",
            description: "A box of freshly brewed coffee",
            price: 25.0,
            visibility: "ALL",
          },
        ],
      },
    ],
    visibility: "ALL",
  },
];

// ==================== Orders ====================

export const mockOrderCheck: OrderCheck = {
  guid: "check-001",
  selections: [
    {
      guid: "sel-001",
      itemGuid: "item-latte",
      quantity: 2,
      modifiers: [{ guid: "mod-oat-milk", quantity: 1 }],
    },
    {
      guid: "sel-002",
      itemGuid: "item-muffin",
      quantity: 1,
    },
  ],
  totalAmount: 14.5,
  taxAmount: 1.19,
  subtotalAmount: 13.31,
};

export const mockOrder: Order = {
  guid: "order-001",
  entityType: "Order",
  externalId: "ext-001",
  openedDate: "2026-03-21T10:30:00.000Z",
  modifiedDate: "2026-03-21T10:32:00.000Z",
  closedDate: undefined,
  voided: false,
  businessDate: 20260321,
  revenueCenter: { guid: "rev-center-001", name: "Counter" },
  diningOption: { guid: "dine-opt-001", name: "Dine In" },
  server: { guid: "server-001", name: "Jane" },
  checks: [mockOrderCheck],
  source: "MCP",
  approvalStatus: "APPROVED",
};

// ==================== Auth Token Response ====================

export const mockTokenResponse = {
  accessToken: "mock-access-token-abc123",
  tokenType: "Bearer",
  expiresIn: 3600,
};

// ==================== Config Helpers ====================

/**
 * Returns a minimal valid config object for testing.
 */
export function createMockConfig(overrides: Record<string, unknown> = {}) {
  return {
    toastClientId: "test-client-id",
    toastClientSecret: "test-client-secret",
    toastRestaurantGuid: "c227349d-7778-4ec2-af27-e386eb2ec52e",
    toastRestaurantGuids: ["c227349d-7778-4ec2-af27-e386eb2ec52e"],
    toastApiHost: "https://ws-api.toasttab.com",
    allowWrites: false,
    dryRun: true,
    logLevel: "info" as const,
    partnerMode: false,
    webhookPort: 3100,
    microsoftBridgeEnabled: false,
    ...overrides,
  };
}
