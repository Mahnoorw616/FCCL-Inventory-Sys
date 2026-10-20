import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { createSeedData } from '../data/seedData';
import type {
  DeviceDraft,
  InventoryData,
  Priority,
  StockDraft,
  SupplierDraft,
  WorkOrderDraft,
  WorkStatus,
} from '../types/inventory';
import { normalizeDraft, validateDevice } from '../utils/inventoryRules';

const STORAGE_KEY = 'fccl-inventory-v1';

function isValid(value: unknown): value is InventoryData {
  const v = value as Partial<InventoryData> | null;
  return (
    !!v &&
    Array.isArray(v.devices) &&
    Array.isArray(v.racks) &&
    Array.isArray(v.workOrders) &&
    Array.isArray(v.stock) &&
    Array.isArray(v.suppliers) &&
    Array.isArray(v.log)
  );
}

function loadLocal(): InventoryData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValid(parsed)) return parsed;
    }
  } catch {
    /* fallback to seed data */
  }
  return createSeedData();
}

const uid = (prefix: string) => prefix + Math.random().toString(36).slice(2, 9);

function withLog(data: InventoryData, text: string): InventoryData {
  return { ...data, log: [{ id: uid('l'), time: new Date().toISOString(), text }, ...data.log].slice(0, 300) };
}

function stockProblem(d: StockDraft): string {
  if (!d.name || !d.name.trim()) return 'Enter the item name.';
  if (!Number.isInteger(d.quantity) || d.quantity < 0) return 'Quantity must be a whole number, 0 or more.';
  if (!Number.isInteger(d.minimum) || d.minimum < 0) return 'Minimum must be a whole number, 0 or more.';
  return '';
}

export type BackendStatus = 'connected' | 'connecting' | 'offline' | 'error';

export function useInventory() {
  const [data, setData] = useState<InventoryData>(loadLocal);
  const [status, setStatus] = useState<BackendStatus>('connecting');
  const [isSyncing, setIsSyncing] = useState(false);
  const ref = useRef(data);
  ref.current = data;

  // Persist local copy for fast hydration and offline cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* quota exceeded or private mode */
    }
  }, [data]);

  // Fetch initial data from backend API
  const refreshFromBackend = useCallback(async () => {
    setIsSyncing(true);
    setStatus('connecting');
    try {
      const remoteData = await api.getInventory();
      if (isValid(remoteData)) {
        setData(remoteData);
        setStatus('connected');
      }
    } catch (err) {
      console.warn('Backend unavailable, using local cache:', err);
      setStatus('offline');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    refreshFromBackend();
  }, [refreshFromBackend]);

  const actions = useMemo(() => {
    const apply = (fn: (d: InventoryData) => InventoryData) => {
      const next = fn(ref.current);
      ref.current = next;
      setData(next);
    };

    return {
      refresh: refreshFromBackend,

      /* devices */
      async addDevice(input: DeviceDraft): Promise<string> {
        const draft = normalizeDraft(input);
        const cur = ref.current;
        const error = validateDevice(draft, cur.devices, cur.racks);
        if (error) return error;

        try {
          const created = await api.createDevice(draft);
          apply((d) =>
            withLog(
              { ...d, devices: [...d.devices, created] },
              `Added device ${created.name} (${created.serial})`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to add device on server:', err);
          return err?.message || 'Failed to save device to server';
        }
      },

      async updateDevice(id: string, input: DeviceDraft): Promise<string> {
        const draft = normalizeDraft(input);
        const cur = ref.current;
        const old = cur.devices.find((d) => d.id === id);
        if (!old) return 'This device no longer exists.';
        const error = validateDevice(draft, cur.devices, cur.racks, id);
        if (error) return error;

        try {
          const updated = await api.updateDevice(id, draft);
          apply((d) =>
            withLog(
              {
                ...d,
                devices: d.devices.map((x) => (x.id === id ? updated : x)),
                workOrders:
                  old.serial === updated.serial
                    ? d.workOrders
                    : d.workOrders.map((w) =>
                        w.deviceSerial === old.serial ? { ...w, deviceSerial: updated.serial } : w,
                      ),
              },
              `Updated device ${updated.name} (${updated.serial})`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to update device on server:', err);
          return err?.message || 'Failed to update device on server';
        }
      },

      async deleteDevice(id: string): Promise<string> {
        const old = ref.current.devices.find((d) => d.id === id);
        if (!old) return 'Device not found';

        try {
          await api.deleteDevice(id);
          apply((d) =>
            withLog(
              { ...d, devices: d.devices.filter((x) => x.id !== id) },
              `Deleted device ${old.name} (${old.serial})`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to delete device on backend:', err);
          return err?.message || 'Failed to delete device';
        }
      },

      async importDevices(drafts: DeviceDraft[]): Promise<string> {
        if (drafts.length === 0) return '';
        try {
          const res = await api.importDevices(drafts);
          if (res?.data && Array.isArray(res.data)) {
            apply((d) =>
              withLog(
                { ...d, devices: [...d.devices, ...res.data] },
                `Imported ${res.data.length} devices from CSV`,
              ),
            );
          } else {
            await refreshFromBackend();
          }
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to sync imported devices to backend:', err);
          return err?.message || 'Failed to import devices';
        }
      },

      /* work orders */
      async addWorkOrder(input: WorkOrderDraft): Promise<string> {
        const title = input.title?.trim();
        if (!title) return 'Enter what needs to be done.';

        try {
          const created = await api.createWorkOrder(input);
          apply((d) =>
            withLog(
              { ...d, workOrders: [...d.workOrders, created] },
              `Created work order: ${created.title}`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to create work order on server:', err);
          return err?.message || 'Failed to save work order';
        }
      },

      async setWorkStatus(id: string, nextStatus: WorkStatus): Promise<string> {
        const old = ref.current.workOrders.find((w) => w.id === id);
        if (!old || old.status === nextStatus) return '';

        try {
          const updated = await api.setWorkStatus(id, nextStatus);
          apply((d) =>
            withLog(
              { ...d, workOrders: d.workOrders.map((w) => (w.id === id ? updated : w)) },
              `Work order #${old.no} is now ${nextStatus.toLowerCase()}`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to update work order status on server:', err);
          return err?.message || 'Failed to update status';
        }
      },

      async setWorkPriority(id: string, priority: Priority): Promise<string> {
        try {
          const updated = await api.setWorkPriority(id, priority);
          apply((d) => ({
            ...d,
            workOrders: d.workOrders.map((w) => (w.id === id ? updated : w)),
          }));
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to update work order priority on server:', err);
          return err?.message || 'Failed to update priority';
        }
      },

      async deleteWorkOrder(id: string): Promise<string> {
        const old = ref.current.workOrders.find((w) => w.id === id);
        if (!old) return '';

        try {
          await api.deleteWorkOrder(id);
          apply((d) =>
            withLog(
              { ...d, workOrders: d.workOrders.filter((w) => w.id !== id) },
              `Deleted work order #${old.no}`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to delete work order on backend:', err);
          return err?.message || 'Failed to delete work order';
        }
      },

      /* stock */
      async addStock(input: StockDraft): Promise<string> {
        const error = stockProblem(input);
        if (error) return error;

        try {
          const created = await api.createStock(input);
          apply((d) =>
            withLog(
              { ...d, stock: [...d.stock, created] },
              `Added stock item ${created.name}`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to add stock item on server:', err);
          return err?.message || 'Failed to add stock';
        }
      },

      async updateStock(id: string, input: StockDraft): Promise<string> {
        const error = stockProblem(input);
        if (error) return error;

        try {
          const updated = await api.updateStock(id, input);
          apply((d) =>
            withLog(
              { ...d, stock: d.stock.map((s) => (s.id === id ? updated : s)) },
              `Updated stock item ${updated.name}`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to update stock item on server:', err);
          return err?.message || 'Failed to update stock';
        }
      },

      async changeStock(id: string, change: number): Promise<string> {
        const old = ref.current.stock.find((s) => s.id === id);
        if (!old) return '';
        const quantity = Math.max(0, old.quantity + change);
        if (quantity === old.quantity) return '';

        try {
          const updated = await api.changeStock(id, change);
          apply((d) =>
            withLog(
              { ...d, stock: d.stock.map((s) => (s.id === id ? updated : s)) },
              `${old.name}: stock ${old.quantity} → ${quantity}`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to change stock on server:', err);
          return err?.message || 'Failed to change stock';
        }
      },

      async deleteStock(id: string): Promise<string> {
        const old = ref.current.stock.find((s) => s.id === id);
        if (!old) return '';

        try {
          await api.deleteStock(id);
          apply((d) =>
            withLog(
              { ...d, stock: d.stock.filter((s) => s.id !== id) },
              `Deleted stock item ${old.name}`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to delete stock item on backend:', err);
          return err?.message || 'Failed to delete stock item';
        }
      },

      /* suppliers */
      async saveSupplier(input: SupplierDraft, id?: string): Promise<string> {
        const name = input.name?.trim();
        if (!name) return 'Enter the supplier name.';
        const clean = {
          ...input,
          name,
          contact: (input.contact || '').trim(),
          phone: (input.phone || '').trim(),
          email: (input.email || '').trim(),
          supplies: (input.supplies || '').trim(),
        };

        try {
          if (id) {
            const updated = await api.updateSupplier(id, clean);
            apply((d) =>
              withLog(
                { ...d, suppliers: d.suppliers.map((s) => (s.id === id ? updated : s)) },
                `Updated supplier ${name}`,
              ),
            );
          } else {
            const created = await api.createSupplier(clean);
            apply((d) =>
              withLog(
                { ...d, suppliers: [...d.suppliers, created] },
                `Added supplier ${name}`,
              ),
            );
          }
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to save supplier on server:', err);
          return err?.message || 'Failed to save supplier';
        }
      },

      async deleteSupplier(id: string): Promise<string> {
        const cur = ref.current;
        const old = cur.suppliers.find((s) => s.id === id);
        if (!old) return '';
        if (cur.stock.some((s) => s.supplierId === id)) return 'Some stock items use this supplier. Change them first.';

        try {
          await api.deleteSupplier(id);
          apply((d) =>
            withLog(
              { ...d, suppliers: d.suppliers.filter((s) => s.id !== id) },
              `Deleted supplier ${old.name}`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to delete supplier on backend:', err);
          return err?.message || 'Failed to delete supplier';
        }
      },

      /* racks */
      async addRack(name: string, plant: string, units: number): Promise<string> {
        const clean = name.trim();
        if (!clean) return 'Enter the rack name.';
        if (!Number.isInteger(units) || units < 1 || units > 60) return 'Rack size must be a whole number from 1 to 60.';
        if (ref.current.racks.some((r) => r.name.toLowerCase() === clean.toLowerCase())) return 'A rack with this name already exists.';

        try {
          const created = await api.createRack(clean, plant, units);
          apply((d) =>
            withLog(
              { ...d, racks: [...d.racks, created] },
              `Added rack ${clean}`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to add rack on server:', err);
          return err?.message || 'Failed to add rack';
        }
      },

      async deleteRack(id: string): Promise<string> {
        const cur = ref.current;
        const old = cur.racks.find((r) => r.id === id);
        if (!old) return '';
        if (cur.devices.some((x) => x.rack === id)) return 'Remove the devices from this rack first.';

        try {
          await api.deleteRack(id);
          apply((d) =>
            withLog(
              { ...d, racks: d.racks.filter((r) => r.id !== id) },
              `Deleted rack ${old.name}`,
            ),
          );
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to delete rack on backend:', err);
          return err?.message || 'Failed to delete rack';
        }
      },

      /* reset */
      async reset(): Promise<void> {
        try {
          const fresh = await api.resetInventory();
          apply(() => fresh);
          setStatus('connected');
        } catch (err) {
          console.warn('Backend reset failed, resetting local data:', err);
          apply(() => createSeedData());
        }
      },
    };
  }, [refreshFromBackend]);

  return { data, status, isSyncing, ...actions };
}

export type Inventory = ReturnType<typeof useInventory>;
