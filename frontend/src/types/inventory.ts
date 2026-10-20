export const CATEGORIES = ['Laptop', 'Desktop', 'Server', 'Network', 'Printer', 'Phone', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];

export const PLANTS = ['Main Plant', 'Plant 2', 'Head Office'];

export type Priority = 'Low' | 'Medium' | 'High';
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];

export type WorkStatus = 'Open' | 'In progress' | 'Done';
export const WORK_STATUSES: WorkStatus[] = ['Open', 'In progress', 'Done'];

export type ViewId = 'overview' | 'devices' | 'work' | 'stock' | 'racks' | 'suppliers' | 'log';

export interface Device {
  id: string;
  /** Simple running number: 1, 2, 3 ... */
  no: number;
  /** The serial number is the unique identifier of a device. */
  serial: string;
  name: string;
  category: Category;
  model: string;
  plant: string;
  assignedTo: string;
  online: boolean;
  warrantyEnd: string; // YYYY-MM-DD or ''
  rack: string; // rack id or ''
  rackStart: number; // lowest rack unit used, 0 when not in a rack
  rackUnits: number; // height in rack units, 0 when not in a rack
  notes: string;
}
export type DeviceDraft = Omit<Device, 'id' | 'no'>;

export interface Rack {
  id: string;
  name: string;
  plant: string;
  units: number;
}

export interface WorkOrder {
  id: string;
  no: number;
  title: string;
  deviceSerial: string;
  priority: Priority;
  status: WorkStatus;
  assignee: string;
  notes: string;
  createdAt: string;
}
export type WorkOrderDraft = Pick<WorkOrder, 'title' | 'deviceSerial' | 'priority' | 'assignee' | 'notes'>;

export interface StockItem {
  id: string;
  no: number;
  name: string;
  category: string;
  quantity: number;
  minimum: number;
  location: string;
  supplierId: string;
}
export type StockDraft = Omit<StockItem, 'id' | 'no'>;

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  supplies: string;
}
export type SupplierDraft = Omit<Supplier, 'id'>;

export interface LogEntry {
  id: string;
  time: string; // ISO date-time
  text: string;
}

export interface InventoryData {
  devices: Device[];
  racks: Rack[];
  workOrders: WorkOrder[];
  stock: StockItem[];
  suppliers: Supplier[];
  log: LogEntry[];
}
