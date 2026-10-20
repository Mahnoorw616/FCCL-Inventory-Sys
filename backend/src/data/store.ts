import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InventoryData } from '../types/inventory.js';
import { createSeedData } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory can be overridden via DATA_DIR environment variable
const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const filePath = path.join(dataDir, 'inventory.json');

export const uid = (prefix: string) => prefix + Math.random().toString(36).slice(2, 9);

export function withLog(data: InventoryData, text: string): InventoryData {
  return {
    ...data,
    log: [{ id: uid('l'), time: new Date().toISOString(), text }, ...data.log].slice(0, 300),
  };
}

let inMemoryData: InventoryData;

function ensureDataDir(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

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

export function initStore(): InventoryData {
  ensureDataDir();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (isValid(parsed)) {
        inMemoryData = parsed;
        return inMemoryData;
      }
    }
  } catch (err) {
    console.error('Failed to read inventory.json, falling back to seed data:', err);
  }

  inMemoryData = createSeedData();
  saveSync(inMemoryData);
  return inMemoryData;
}

function saveSync(data: InventoryData): void {
  try {
    ensureDataDir();
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    console.error('Failed to write inventory.json to disk:', err);
  }
}

export async function saveInventory(data: InventoryData): Promise<void> {
  inMemoryData = data;
  try {
    ensureDataDir();
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    await fs.promises.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.promises.rename(tempFile, filePath);
  } catch (err) {
    console.error('Failed to write inventory.json to disk:', err);
  }
}

export function getInventory(): InventoryData {
  if (!inMemoryData) {
    return initStore();
  }
  return inMemoryData;
}

export async function resetInventory(): Promise<InventoryData> {
  const fresh = createSeedData();
  await saveInventory(fresh);
  return fresh;
}
