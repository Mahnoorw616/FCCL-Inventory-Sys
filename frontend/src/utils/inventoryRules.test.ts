import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanSerial,
  devicesToCsv,
  isLowStock,
  matchesQuery,
  nextNumber,
  normalizeDraft,
  parseDevicesCsv,
  validateDevice,
  warrantyState,
} from './inventoryRules.ts';
import { createSeedData } from '../data/seedData.ts';
import type { DeviceDraft } from '../types/inventory.ts';

const data = createSeedData();

const draft = (over: Partial<DeviceDraft> = {}): DeviceDraft => ({
  serial: 'NEW123',
  name: 'Test device',
  category: 'Laptop',
  model: '',
  plant: 'Main Plant',
  assignedTo: '',
  online: true,
  warrantyEnd: '',
  rack: '',
  rackStart: 0,
  rackUnits: 0,
  notes: '',
  ...over,
});

test('numbers are simple and keep counting up', () => {
  assert.equal(nextNumber([]), 1);
  assert.equal(nextNumber(data.devices), 13);
});

test('serial numbers lose spaces and become capitals', () => {
  assert.equal(cleanSerial(' ab 12 cd '), 'AB12CD');
});

test('a device needs a serial number and a name', () => {
  assert.match(validateDevice(normalizeDraft(draft({ serial: '  ' })), data.devices, data.racks), /serial/i);
  assert.match(validateDevice(normalizeDraft(draft({ name: ' ' })), data.devices, data.racks), /name/i);
  assert.equal(validateDevice(normalizeDraft(draft()), data.devices, data.racks), '');
});

test('the same serial number cannot be used twice', () => {
  const copy = normalizeDraft(draft({ serial: '7xk2 m93' }));
  assert.match(validateDevice(copy, data.devices, data.racks), /already/);
  assert.equal(validateDevice(copy, data.devices, data.racks, 'd1'), '');
});

test('rack positions must fit and must not overlap', () => {
  const tooHigh = normalizeDraft(draft({ rack: 'r2', rackStart: 24, rackUnits: 2 }));
  assert.match(validateDevice(tooHigh, data.devices, data.racks), /only 24 units/);
  const overlap = normalizeDraft(draft({ rack: 'r1', rackStart: 39, rackUnits: 1 }));
  assert.match(validateDevice(overlap, data.devices, data.racks), /already used/);
  const free = normalizeDraft(draft({ rack: 'r1', rackStart: 1, rackUnits: 2 }));
  assert.equal(validateDevice(free, data.devices, data.racks), '');
});

test('low stock and warranty helpers', () => {
  assert.equal(isLowStock({ quantity: 1, minimum: 4 }), true);
  assert.equal(isLowStock({ quantity: 9, minimum: 4 }), false);
  const now = Date.parse('2026-10-19T00:00:00');
  assert.equal(warrantyState('', now), 'none');
  assert.equal(warrantyState('2025-01-01', now), 'expired');
  assert.equal(warrantyState('2026-11-15', now), 'soon');
  assert.equal(warrantyState('2028-01-01', now), 'ok');
});

test('search finds devices by serial number', () => {
  assert.equal(matchesQuery(data.devices[0], 'xk2'), true);
  assert.equal(matchesQuery(data.devices[0], 'zzz'), false);
});

test('CSV export can be imported again', () => {
  const csv = devicesToCsv(data.devices);
  const result = parseDevicesCsv(csv, []);
  assert.equal(result.errors.length, 0);
  assert.equal(result.drafts.length, data.devices.length);
  assert.equal(result.drafts[3].online, false);
});

test('CSV import reports bad rows and skips duplicates', () => {
  const csv = 'serial,name,category\nAAA1,Printer,printer\n,No serial,Laptop\n7XK2M93,Duplicate,Server\nAAA1,Same twice,Server\n';
  const result = parseDevicesCsv(csv, data.devices);
  assert.equal(result.drafts.length, 1);
  assert.equal(result.drafts[0].category, 'Printer');
  assert.equal(result.errors.length, 3);
  assert.match(parseDevicesCsv('a,b\n1,2', []).errors[0], /serial/);
});
