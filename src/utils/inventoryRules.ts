import { CATEGORIES } from '../types/inventory.ts';
import type { Device, DeviceDraft, Rack, StockItem } from '../types/inventory.ts';

/** Next simple running number: 1, 2, 3 ... */
export function nextNumber(items: { no: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.no), 0) + 1;
}

/** Serial numbers are stored without spaces, in capitals. */
export function cleanSerial(serial: string): string {
  return serial.replace(/\s+/g, '').toUpperCase();
}

/** Trim text, clean the serial number and clear rack details when the device is not in a rack. */
export function normalizeDraft(draft: DeviceDraft): DeviceDraft {
  const inRack = draft.rack !== '';
  return {
    ...draft,
    serial: cleanSerial(draft.serial),
    name: draft.name.trim(),
    model: draft.model.trim(),
    plant: draft.plant.trim(),
    assignedTo: draft.assignedTo.trim(),
    notes: draft.notes.trim(),
    rackStart: inRack ? draft.rackStart : 0,
    rackUnits: inRack ? draft.rackUnits : 0,
  };
}

/** Returns a message when the rack position is not valid, or '' when it is fine. */
export function rackProblem(devices: Device[], racks: Rack[], draft: DeviceDraft, ignoreId = ''): string {
  if (!draft.rack) return '';
  const rack = racks.find((r) => r.id === draft.rack);
  if (!rack) return 'Choose a rack from the list.';
  const start = draft.rackStart;
  const height = draft.rackUnits;
  if (!Number.isInteger(start) || !Number.isInteger(height) || start < 1 || height < 1) {
    return 'Enter a whole starting unit and a height of 1 or more.';
  }
  const end = start + height - 1;
  if (end > rack.units) return `${rack.name} has only ${rack.units} units.`;
  const clash = devices.find(
    (d) => d.id !== ignoreId && d.rack === rack.id && d.rackStart <= end && start <= d.rackStart + d.rackUnits - 1,
  );
  if (clash) return `Those units are already used by ${clash.name} (${clash.serial}).`;
  return '';
}

/** Returns a message when the device is not valid, or '' when it is fine. Expects a normalized draft. */
export function validateDevice(draft: DeviceDraft, devices: Device[], racks: Rack[], ignoreId = ''): string {
  if (!draft.serial) return 'Enter the serial number.';
  if (devices.some((d) => d.id !== ignoreId && d.serial === draft.serial)) {
    return `Serial number ${draft.serial} is already in the list.`;
  }
  if (!draft.name) return 'Enter a device name.';
  if (draft.warrantyEnd && !/^\d{4}-\d{2}-\d{2}$/.test(draft.warrantyEnd)) {
    return 'Warranty date must look like 2027-12-31.';
  }
  return rackProblem(devices, racks, draft, ignoreId);
}

export function isLowStock(item: Pick<StockItem, 'quantity' | 'minimum'>): boolean {
  return item.quantity <= item.minimum;
}

export type WarrantyState = 'none' | 'expired' | 'soon' | 'ok';

/** "soon" means the warranty ends within 60 days. */
export function warrantyState(date: string, now = Date.now()): WarrantyState {
  if (!date) return 'none';
  const end = Date.parse(`${date}T23:59:59`);
  if (Number.isNaN(end)) return 'none';
  if (end < now) return 'expired';
  if (end - now <= 60 * 86_400_000) return 'soon';
  return 'ok';
}

/** Does a device match the text typed in the search box? */
export function matchesQuery(device: Device, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [device.serial, device.name, device.model, device.assignedTo, device.plant, String(device.no)].some((v) =>
    v.toLowerCase().includes(q),
  );
}

/* ---------- CSV ---------- */

export const CSV_HEADERS = ['serial', 'name', 'category', 'model', 'plant', 'assigned_to', 'status', 'warranty_end', 'notes'];

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function devicesToCsv(devices: Device[]): string {
  const rows = devices.map((d) =>
    [d.serial, d.name, d.category, d.model, d.plant, d.assignedTo, d.online ? 'online' : 'offline', d.warrantyEnd, d.notes]
      .map(csvCell)
      .join(','),
  );
  return [CSV_HEADERS.join(','), ...rows].join('\r\n');
}

/** Small CSV reader that understands quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export interface CsvImportResult {
  drafts: DeviceDraft[];
  errors: string[];
}

/** Reads a device CSV. Rows with a problem are skipped and reported. */
export function parseDevicesCsv(text: string, existing: Device[]): CsvImportResult {
  const rows = parseCsv(text);
  const result: CsvImportResult = { drafts: [], errors: [] };
  if (rows.length === 0) {
    result.errors.push('The file is empty.');
    return result;
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  if (col('serial') < 0 || col('name') < 0) {
    result.errors.push('The first row must have at least the columns "serial" and "name".');
    return result;
  }
  const seen = new Set(existing.map((d) => d.serial));
  rows.slice(1).forEach((r, index) => {
    const line = index + 2;
    const get = (name: string) => (col(name) >= 0 ? (r[col(name)] ?? '').trim() : '');
    const serial = cleanSerial(get('serial'));
    const name = get('name');
    if (!serial) return void result.errors.push(`Row ${line}: serial number is missing.`);
    if (!name) return void result.errors.push(`Row ${line}: name is missing.`);
    if (seen.has(serial)) return void result.errors.push(`Row ${line}: serial number ${serial} is already in the list.`);
    const warranty = get('warranty_end');
    if (warranty && !/^\d{4}-\d{2}-\d{2}$/.test(warranty)) {
      return void result.errors.push(`Row ${line}: warranty date must look like 2027-12-31.`);
    }
    const category = CATEGORIES.find((c) => c.toLowerCase() === get('category').toLowerCase()) ?? 'Other';
    seen.add(serial);
    result.drafts.push({
      serial,
      name,
      category,
      model: get('model'),
      plant: get('plant') || 'Main Plant',
      assignedTo: get('assigned_to'),
      online: get('status').toLowerCase() !== 'offline',
      warrantyEnd: warranty,
      rack: '',
      rackStart: 0,
      rackUnits: 0,
      notes: get('notes'),
    });
  });
  return result;
}
