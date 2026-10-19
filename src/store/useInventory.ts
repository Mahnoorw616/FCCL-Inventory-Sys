import { useEffect, useMemo, useRef, useState } from 'react';
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

function load(): InventoryData {
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

/** All data lives in the browser (localStorage). Every action returns '' on success or a message to show. */
export function useInventory() {
  const [data, setData] = useState<InventoryData>(load);
  const ref = useRef(data);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked: the app still works for this visit */
    }
  }, [data]);

  const actions = useMemo(() => {
    const apply = (fn: (d: InventoryData) => InventoryData) => {
      const next = fn(ref.current);
      ref.current = next;
      setData(next);
    };

    return {
      /* devices */
      addDevice(input: DeviceDraft): string {
        const draft = normalizeDraft(input);
        const cur = ref.current;
        const error = validateDevice(draft, cur.devices, cur.racks);
        if (error) return error;
        apply((d) =>
          withLog(
            { ...d, devices: [...d.devices, { ...draft, id: uid('d'), no: nextNumber(d.devices) }] },
            `Added device ${draft.name} (${draft.serial})`,
          ),
        );
        return '';
      },
      updateDevice(id: string, input: DeviceDraft): string {
        const draft = normalizeDraft(input);
        const cur = ref.current;
        const old = cur.devices.find((d) => d.id === id);
        if (!old) return 'This device no longer exists.';
        const error = validateDevice(draft, cur.devices, cur.racks, id);
        if (error) return error;
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
        return '';
      },
      deleteDevice(id: string): void {
        const old = ref.current.devices.find((d) => d.id === id);
        if (!old) return;
        apply((d) => withLog({ ...d, devices: d.devices.filter((x) => x.id !== id) }, `Deleted device ${old.name} (${old.serial})`));
      },
      importDevices(drafts: DeviceDraft[]): void {
        if (drafts.length === 0) return;
        apply((d) => {
          let no = nextNumber(d.devices);
          const added = drafts.map((x) => ({ ...x, id: uid('d'), no: no++ }));
          return withLog({ ...d, devices: [...d.devices, ...added] }, `Imported ${added.length} devices from CSV`);
        });
      },

      /* work orders */
      addWorkOrder(input: WorkOrderDraft): string {
        const title = input.title.trim();
        if (!title) return 'Enter what needs to be done.';
        apply((d) =>
          withLog(
            {
              ...d,
              workOrders: [
                ...d.workOrders,
                {
                  id: uid('w'),
                  no: nextNumber(d.workOrders),
                  title,
                  deviceSerial: input.deviceSerial,
                  priority: input.priority,
                  status: 'Open',
                  assignee: input.assignee.trim(),
                  notes: input.notes.trim(),
                  createdAt: new Date().toISOString(),
                },
              ],
            },
            `Created work order: ${title}`,
          ),
        );
        return '';
      },
      setWorkStatus(id: string, status: WorkStatus): void {
        const old = ref.current.workOrders.find((w) => w.id === id);
        if (!old || old.status === status) return;
        apply((d) =>
          withLog(
            { ...d, workOrders: d.workOrders.map((w) => (w.id === id ? { ...w, status } : w)) },
            `Work order #${old.no} is now ${status.toLowerCase()}`,
          ),
        );
      },
      setWorkPriority(id: string, priority: Priority): void {
        apply((d) => ({ ...d, workOrders: d.workOrders.map((w) => (w.id === id ? { ...w, priority } : w)) }));
      },
      deleteWorkOrder(id: string): void {
        const old = ref.current.workOrders.find((w) => w.id === id);
        if (!old) return;
        apply((d) => withLog({ ...d, workOrders: d.workOrders.filter((w) => w.id !== id) }, `Deleted work order #${old.no}`));
      },

      /* stock */
      addStock(input: StockDraft): string {
        const error = stockProblem(input);
        if (error) return error;
        apply((d) =>
          withLog(
            { ...d, stock: [...d.stock, { ...input, name: input.name.trim(), id: uid('s'), no: nextNumber(d.stock) }] },
            `Added stock item ${input.name.trim()}`,
          ),
        );
        return '';
      },
      updateStock(id: string, input: StockDraft): string {
        const error = stockProblem(input);
        if (error) return error;
        apply((d) =>
          withLog(
            { ...d, stock: d.stock.map((s) => (s.id === id ? { ...s, ...input, name: input.name.trim() } : s)) },
            `Updated stock item ${input.name.trim()}`,
          ),
        );
        return '';
      },
      changeStock(id: string, change: number): void {
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
      },
      deleteStock(id: string): void {
        const old = ref.current.stock.find((s) => s.id === id);
        if (!old) return;
        apply((d) => withLog({ ...d, stock: d.stock.filter((s) => s.id !== id) }, `Deleted stock item ${old.name}`));
      },

      /* suppliers */
      saveSupplier(input: SupplierDraft, id?: string): string {
        const name = input.name.trim();
        if (!name) return 'Enter the supplier name.';
        const clean = { ...input, name, contact: input.contact.trim(), phone: input.phone.trim(), email: input.email.trim(), supplies: input.supplies.trim() };
        if (id) {
          apply((d) => withLog({ ...d, suppliers: d.suppliers.map((s) => (s.id === id ? { ...s, ...clean } : s)) }, `Updated supplier ${name}`));
        } else {
          apply((d) => withLog({ ...d, suppliers: [...d.suppliers, { ...clean, id: uid('p') }] }, `Added supplier ${name}`));
        }
        return '';
      },
      deleteSupplier(id: string): string {
        const cur = ref.current;
        const old = cur.suppliers.find((s) => s.id === id);
        if (!old) return '';
        if (cur.stock.some((s) => s.supplierId === id)) return 'Some stock items use this supplier. Change them first.';
        apply((d) => withLog({ ...d, suppliers: d.suppliers.filter((s) => s.id !== id) }, `Deleted supplier ${old.name}`));
        return '';
      },

      /* racks */
      addRack(name: string, plant: string, units: number): string {
        const clean = name.trim();
        if (!clean) return 'Enter the rack name.';
        if (!Number.isInteger(units) || units < 1 || units > 60) return 'Rack size must be a whole number from 1 to 60.';
        if (ref.current.racks.some((r) => r.name.toLowerCase() === clean.toLowerCase())) return 'A rack with this name already exists.';
        apply((d) => withLog({ ...d, racks: [...d.racks, { id: uid('r'), name: clean, plant, units }] }, `Added rack ${clean}`));
        return '';
      },
      deleteRack(id: string): string {
        const cur = ref.current;
        const old = cur.racks.find((r) => r.id === id);
        if (!old) return '';
        if (cur.devices.some((x) => x.rack === id)) return 'Remove the devices from this rack first.';
        apply((d) => withLog({ ...d, racks: d.racks.filter((r) => r.id !== id) }, `Deleted rack ${old.name}`));
        return '';
      },

      reset(): void {
        apply(() => createSeedData());
      },
    };
  }, []);

  return { data, ...actions };
}

export type Inventory = ReturnType<typeof useInventory>;
