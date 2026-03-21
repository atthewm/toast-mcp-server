/**
 * Typed models for Toast menu-related API responses.
 */

export interface MenuGroup {
  guid: string;
  name: string;
  description?: string;
  items?: MenuItemReference[];
  subgroups?: MenuGroup[];
  visibility?: string;
}

export interface MenuItemReference {
  guid: string;
  name: string;
  description?: string;
  price?: number;
  plu?: string;
  sku?: string;
  visibility?: string;
  modifierGroups?: ModifierGroup[];
}

export interface ModifierGroup {
  guid: string;
  name: string;
  minSelections?: number;
  maxSelections?: number;
  modifiers?: Modifier[];
}

export interface Modifier {
  guid: string;
  name: string;
  price?: number;
  preModifier?: boolean;
}

export interface Menu {
  guid: string;
  name: string;
  description?: string;
  groups: MenuGroup[];
  visibility?: string;
}

export interface MenuMetadata {
  lastUpdated?: string;
  menuCount: number;
  menus: Array<{
    guid: string;
    name: string;
    groupCount: number;
  }>;
}

export interface MenuSearchResult {
  item: MenuItemReference;
  menuName: string;
  groupName: string;
  matchField: string;
}
