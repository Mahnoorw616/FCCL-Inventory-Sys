import { Boxes, History, LayoutDashboard, Laptop, Server, Truck, Wrench, type LucideIcon } from 'lucide-react';
import type { ViewId } from '../types/inventory';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
}

/** Important sections: always visible in the top bar. */
export const PRIMARY_NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'devices', label: 'Devices', icon: Laptop },
  { id: 'work', label: 'Work Orders', icon: Wrench },
  { id: 'stock', label: 'Stock & Spares', icon: Boxes },
];

/** Other sections: kept in the left drawer. */
export const MORE_NAV: NavItem[] = [
  { id: 'racks', label: 'Racks', icon: Server },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'log', label: 'Activity Log', icon: History },
];
