import type {
  Device,
  DeviceDraft,
  InventoryData,
  Priority,
  Rack,
  StockDraft,
  StockItem,
  Supplier,
  SupplierDraft,
  WorkOrder,
  WorkOrderDraft,
  WorkStatus,
} from '../types/inventory';

// Base API URL:
// In production on Vercel, set VITE_API_URL to your Render backend URL (e.g. https://fccl-inventory-backend.onrender.com/api)
// In local dev, defaults to '/api' which Vite proxies to http://localhost:5000
const rawUrl = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
export const API_BASE = rawUrl.replace(/\/+$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      (typeof data === 'object' && data !== null && (data as any).message) ||
      `Request failed (${response.status}: ${response.statusText})`;
    throw new Error(errorMsg);
  }

  return (typeof data === 'object' && data !== null && 'data' in data ? (data as any).data : data) as T;
}

export const api = {
  async getHealth(): Promise<{ status: string; uptime: number }> {
    return request<{ status: string; uptime: number }>('/health');
  },

  async getInventory(): Promise<InventoryData> {
    return request<InventoryData>('/inventory');
  },

  async resetInventory(): Promise<InventoryData> {
    return request<InventoryData>('/inventory/reset', {
      method: 'POST',
    });
  },

  /* Devices */
  async createDevice(draft: DeviceDraft): Promise<Device> {
    return request<Device>('/devices', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  },

  async updateDevice(id: string, draft: DeviceDraft): Promise<Device> {
    return request<Device>(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(draft),
    });
  },

  async deleteDevice(id: string): Promise<void> {
    await request(`/devices/${id}`, {
      method: 'DELETE',
    });
  },

  async importDevices(drafts: DeviceDraft[]): Promise<{ count: number; data: Device[] }> {
    return request<{ count: number; data: Device[] }>('/devices/import', {
      method: 'POST',
      body: JSON.stringify({ drafts }),
    });
  },

  /* Work Orders */
  async createWorkOrder(draft: WorkOrderDraft): Promise<WorkOrder> {
    return request<WorkOrder>('/work-orders', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  },

  async setWorkStatus(id: string, status: WorkStatus): Promise<WorkOrder> {
    return request<WorkOrder>(`/work-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async setWorkPriority(id: string, priority: Priority): Promise<WorkOrder> {
    return request<WorkOrder>(`/work-orders/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
  },

  async deleteWorkOrder(id: string): Promise<void> {
    await request(`/work-orders/${id}`, {
      method: 'DELETE',
    });
  },

  /* Stock */
  async createStock(draft: StockDraft): Promise<StockItem> {
    return request<StockItem>('/stock', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  },

  async updateStock(id: string, draft: StockDraft): Promise<StockItem> {
    return request<StockItem>(`/stock/${id}`, {
      method: 'PUT',
      body: JSON.stringify(draft),
    });
  },

  async changeStock(id: string, change: number): Promise<StockItem> {
    return request<StockItem>(`/stock/${id}/change`, {
      method: 'PATCH',
      body: JSON.stringify({ change }),
    });
  },

  async deleteStock(id: string): Promise<void> {
    await request(`/stock/${id}`, {
      method: 'DELETE',
    });
  },

  /* Suppliers */
  async createSupplier(draft: SupplierDraft): Promise<Supplier> {
    return request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  },

  async updateSupplier(id: string, draft: SupplierDraft): Promise<Supplier> {
    return request<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(draft),
    });
  },

  async deleteSupplier(id: string): Promise<void> {
    await request(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  },

  /* Racks */
  async createRack(name: string, plant: string, units: number): Promise<Rack> {
    return request<Rack>('/racks', {
      method: 'POST',
      body: JSON.stringify({ name, plant, units }),
    });
  },

  async deleteRack(id: string): Promise<void> {
    await request(`/racks/${id}`, {
      method: 'DELETE',
    });
  },
};
