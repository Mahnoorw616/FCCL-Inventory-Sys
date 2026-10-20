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
import { nextNumber, normalizeDraft, validateDevice } from '../utils/inventoryRules';

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
    /* fall through to sample data */
  }
  return createSeedData();
}

const uid = (prefix: string) => prefix + Math.random().toString(36).slice(2, 9);

function withLog(data: InventoryData, text: string): InventoryData {
  return { ...data, log: [{ id: uid('l'), time: new Date().toISOString(), text }, ...data.log].slice(0, 300) };
}

function stockProblem(d: StockDraft): string {
  if (!d.name.trim()) return 'Enter the item name.';
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

  // Persist local copy for fast hydration and offline resiliency
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage quota exceeded or disabled */
    }
  }, [data]);

  // Fetch initial data from backend API
  const refreshFromBackend = useCallback(async () => {
    setIsSyncing(true);
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

        // Optimistic local update
        const tempId = uid('d');
        const tempDevice = { ...draft, id: tempId, no: nextNumber(cur.devices) };
        apply((d) =>
          withLog(
            { ...d, devices: [...d.devices, tempDevice] },
            `Added device ${draft.name} (${draft.serial})`,
          ),
        );

        // Sync with backend
        try {
          const created = await api.createDevice(draft);
          apply((d) => ({
            ...d,
            devices: d.devices.map((dev) => (dev.id === tempId ? created : dev)),
          }));
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to sync device to backend:', err);
          return err?.message || 'Failed to save to server';
        }
      },

      async updateDevice(id: string, input: DeviceDraft): Promise<string> {
        const draft = normalizeDraft(input);
        const cur = ref.current;
        const old = cur.devices.find((d) => d.id === id);
        if (!old) return 'This device no longer exists.';
        const error = validateDevice(draft, cur.devices, cur.racks, id);
        if (error) return error;

        // Optimistic update
        apply((d) =>
          withLog(
            {
              ...d,
              devices: d.devices.map((x) => (x.id === id ? { ...x, ...draft } : x)),
              workOrders:
                old.serial === draft.serial
                  ? d.workOrders
                  : d.workOrders.map((w) => (w.deviceSerial === old.serial ? { ...w, deviceSerial: draft.serial } : w)),
            },
            `Updated device ${draft.name} (${draft.serial})`,
          ),
        );

        // Backend sync
        try {
          await api.updateDevice(id, draft);
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to sync updated device to backend:', err);
          return err?.message || 'Failed to update device on server';
        }
      },

      async deleteDevice(id: string): Promise<void> {
        const old = ref.current.devices.find((d) => d.id === id);
        if (!old) return;
        apply((d) => withLog({ ...d, devices: d.devices.filter((x) => x.id !== id) }, `Deleted device ${old.name} (${old.serial})`));

        try {
          await api.deleteDevice(id);
          setStatus('connected');
        } catch (err) {
          console.error('Failed to delete device on backend:', err);
        }
      },

      async importDevices(drafts: DeviceDraft[]): Promise<void> {
        if (drafts.length === 0) return;
        apply((d) => {
          let no = nextNumber(d.devices);
          const added = drafts.map((x) => ({ ...x, id: uid('d'), no: no++ }));
          return withLog({ ...d, devices: [...d.devices, ...added] }, `Imported ${added.length} devices from CSV`);
        });

        try {
          await api.importDevices(drafts);
          await refreshFromBackend();
          setStatus('connected');
        } catch (err) {
          console.error('Failed to sync imported devices to backend:', err);
        }
      },

      /* work orders */
      async addWorkOrder(input: WorkOrderDraft): Promise<string> {
        const title = input.title.trim();
        if (!title) return 'Enter what needs to be done.';
        const tempId = uid('w');
        const tempWorkOrder = {
          id: tempId,
          no: nextNumber(ref.current.workOrders),
          title,
          deviceSerial: input.deviceSerial,
          priority: input.priority,
          status: 'Open' as WorkStatus,
          assignee: input.assignee.trim(),
          notes: input.notes.trim(),
          createdAt: new Date().toISOString(),
        };

        apply((d) =>
          withLog(
            { ...d, workOrders: [...d.workOrders, tempWorkOrder] },
            `Created work order: ${title}`,
          ),
        );

        try {
          const created = await api.createWorkOrder(input);
          apply((d) => ({
            ...d,
            workOrders: d.workOrders.map((w) => (w.id === tempId ? created : w)),
          }));
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to sync work order to backend:', err);
          return err?.message || 'Failed to save work order';
        }
      },

      async setWorkStatus(id: string, nextStatus: WorkStatus): Promise<void> {
        const old = ref.current.workOrders.find((w) => w.id === id);
        if (!old || old.status === nextStatus) return;
        apply((d) =>
          withLog(
            { ...d, workOrders: d.workOrders.map((w) => (w.id === id ? { ...w, status: nextStatus } : w)) },
            `Work order #${old.no} is now ${nextStatus.toLowerCase()}`,
          ),
        );

        try {
          await api.setWorkStatus(id, nextStatus);
          setStatus('connected');
        } catch (err) {
          console.error('Failed to sync work status to backend:', err);
        }
      },

      async setWorkPriority(id: string, priority: Priority): Promise<void> {
        apply((d) => ({ ...d, workOrders: d.workOrders.map((w) => (w.id === id ? { ...w, priority } : w)) }));
        try {
          await api.setWorkPriority(id, priority);
          setStatus('connected');
        } catch (err) {
          console.error('Failed to sync priority to backend:', err);
        }
      },

      async deleteWorkOrder(id: string): Promise<void> {
        const old = ref.current.workOrders.find((w) => w.id === id);
        if (!old) return;
        apply((d) => withLog({ ...d, workOrders: d.workOrders.filter((w) => w.id !== id) }, `Deleted work order #${old.no}`));

        try {
          await api.deleteWorkOrder(id);
          setStatus('connected');
        } catch (err) {
          console.error('Failed to delete work order on backend:', err);
        }
      },

      /* stock */
      async addStock(input: StockDraft): Promise<string> {
        const error = stockProblem(input);
        if (error) return error;

        const tempId = uid('s');
        const tempItem = { ...input, name: input.name.trim(), id: tempId, no: nextNumber(ref.current.stock) };
        apply((d) =>
          withLog(
            { ...d, stock: [...d.stock, tempItem] },
            `Added stock item ${input.name.trim()}`,
          ),
        );

        try {
          const created = await api.createStock(input);
          apply((d) => ({
            ...d,
            stock: d.stock.map((s) => (s.id === tempId ? created : s)),
          }));
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to add stock item to backend:', err);
          return err?.message || 'Failed to add stock';
        }
      },

      async updateStock(id: string, input: StockDraft): Promise<string> {
        const error = stockProblem(input);
        if (error) return error;

        apply((d) =>
          withLog(
            { ...d, stock: d.stock.map((s) => (s.id === id ? { ...s, ...input, name: input.name.trim() } : s)) },
            `Updated stock item ${input.name.trim()}`,
          ),
        );

        try {
          await api.updateStock(id, input);
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to update stock item on backend:', err);
          return err?.message || 'Failed to update stock';
        }
      },

      async changeStock(id: string, change: number): Promise<void> {
        const old = ref.current.stock.find((s) => s.id === id);
        if (!old) return;
        const quantity = Math.max(0, old.quantity + change);
        if (quantity === old.quantity) return;
        apply((d) =>
          withLog(
            { ...d, stock: d.stock.map((s) => (s.id === id ? { ...s, quantity } : s)) },
            `${old.name}: stock ${old.quantity} → ${quantity}`,
          ),
        );

        try {
          await api.changeStock(id, change);
          setStatus('connected');
        } catch (err) {
          console.error('Failed to adjust stock on backend:', err);
        }
      },

      async deleteStock(id: string): Promise<void> {
        const old = ref.current.stock.find((s) => s.id === id);
        if (!old) return;
        apply((d) => withLog({ ...d, stock: d.stock.filter((s) => s.id !== id) }, `Deleted stock item ${old.name}`));

        try {
          await api.deleteStock(id);
          setStatus('connected');
        } catch (err) {
          console.error('Failed to delete stock on backend:', err);
        }
      },

      /* suppliers */
      async saveSupplier(input: SupplierDraft, id?: string): Promise<string> {
        const name = input.name.trim();
        if (!name) return 'Enter the supplier name.';
        const clean = {
          ...input,
          name,
          contact: input.contact.trim(),
          phone: input.phone.trim(),
          email: input.email.trim(),
          supplies: input.supplies.trim(),
        };

        if (id) {
          apply((d) => withLog({ ...d, suppliers: d.suppliers.map((s) => (s.id === id ? { ...s, ...clean } : s)) }, `Updated supplier ${name}`));
          try {
            await api.updateSupplier(id, clean);
            setStatus('connected');
            return '';
          } catch (err: any) {
            console.error('Failed to update supplier on backend:', err);
            return err?.message || 'Failed to update supplier';
          }
        } else {
          const tempId = uid('p');
          apply((d) => withLog({ ...d, suppliers: [...d.suppliers, { ...clean, id: tempId }] }, `Added supplier ${name}`));
          try {
            const created = await api.createSupplier(clean);
            apply((d) => ({
              ...d,
              suppliers: d.suppliers.map((s) => (s.id === tempId ? created : s)),
            }));
            setStatus('connected');
            return '';
          } catch (err: any) {
            console.error('Failed to save supplier to backend:', err);
            return err?.message || 'Failed to save supplier';
          }
        }
      },

      async deleteSupplier(id: string): Promise<string> {
        const cur = ref.current;
        const old = cur.suppliers.find((s) => s.id === id);
        if (!old) return '';
        if (cur.stock.some((s) => s.supplierId === id)) return 'Some stock items use this supplier. Change them first.';

        apply((d) => withLog({ ...d, suppliers: d.suppliers.filter((s) => s.id !== id) }, `Deleted supplier ${old.name}`));

        try {
          await api.deleteSupplier(id);
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

        const tempId = uid('r');
        apply((d) => withLog({ ...d, racks: [...d.racks, { id: tempId, name: clean, plant, units }] }, `Added rack ${clean}`));

        try {
          const created = await api.createRack(clean, plant, units);
          apply((d) => ({
            ...d,
            racks: d.racks.map((r) => (r.id === tempId ? created : r)),
          }));
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to save rack to backend:', err);
          return err?.message || 'Failed to add rack';
        }
      },

      async deleteRack(id: string): Promise<string> {
        const cur = ref.current;
        const old = cur.racks.find((r) => r.id === id);
        if (!old) return '';
        if (cur.devices.some((x) => x.rack === id)) return 'Remove the devices from this rack first.';

        apply((d) => withLog({ ...d, racks: d.racks.filter((r) => r.id !== id) }, `Deleted rack ${old.name}`));

        try {
          await api.deleteRack(id);
          setStatus('connected');
          return '';
        } catch (err: any) {
          console.error('Failed to delete rack on backend:', err);
          return err?.message || 'Failed to delete rack';
        }
      },

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
