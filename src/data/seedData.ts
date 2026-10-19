import type { Device, InventoryData } from '../types/inventory';

const dev = (
  no: number,
  serial: string,
  name: string,
  category: Device['category'],
  model: string,
  plant: string,
  assignedTo: string,
  online: boolean,
  warrantyEnd: string,
  rack = '',
  rackStart = 0,
  rackUnits = 0,
): Device => ({
  id: `d${no}`, no, serial, name, category, model, plant, assignedTo, online, warrantyEnd, rack, rackStart, rackUnits, notes: '',
});

/** Sample data shown the first time the app opens. Edit or reset it from the app. */
export function createSeedData(): InventoryData {
  const now = Date.now();
  const ago = (hours: number) => new Date(now - hours * 3600_000).toISOString();
  return {
    racks: [
      { id: 'r1', name: 'Rack A', plant: 'Main Plant', units: 42 },
      { id: 'r2', name: 'Rack B', plant: 'Plant 2', units: 24 },
    ],
    devices: [
      dev(1, '7XK2M93', 'Main file server', 'Server', 'Dell PowerEdge R750', 'Main Plant', '', true, '2028-03-31', 'r1', 38, 2),
      dev(2, 'CZ2310ABCD', 'Application server', 'Server', 'HPE ProLiant DL380', 'Main Plant', '', true, '2027-08-15', 'r1', 35, 2),
      dev(3, 'FOC2415X0AB', 'Core switch', 'Network', 'Cisco Catalyst 9300', 'Main Plant', '', true, '2027-11-30', 'r1', 41, 1),
      dev(4, 'FCW2230ABCD', 'Floor switch', 'Network', 'Cisco Catalyst 2960', 'Main Plant', '', false, '2025-06-30', 'r1', 33, 1),
      dev(5, 'FG100FTK21000123', 'Firewall', 'Network', 'Fortinet FortiGate 100F', 'Plant 2', '', true, '2028-01-31', 'r2', 22, 1),
      dev(6, '2B4N7P2', 'Backup server', 'Server', 'Dell PowerEdge R650', 'Plant 2', '', true, '2027-05-20', 'r2', 18, 1),
      dev(7, '5H8K3Z3', 'Laptop', 'Laptop', 'Dell Latitude 5440', 'Head Office', 'Ayesha Khan', true, '2027-09-10'),
      dev(8, 'PF3XQ7MN', 'Laptop', 'Laptop', 'Lenovo ThinkPad T14', 'Plant 2', 'Bilal Ahmed', false, '2026-12-01'),
      dev(9, 'CZC3141K9P', 'Production office PC', 'Desktop', 'HP EliteDesk 800 G9', 'Plant 2', 'Production office', true, '2028-02-14'),
      dev(10, '8R2LP34', 'Store PC', 'Desktop', 'Dell OptiPlex 7010', 'Main Plant', 'Store', true, '2026-07-01'),
      dev(11, 'PHBLK12345', 'Admin printer', 'Printer', 'HP LaserJet M507', 'Main Plant', 'Admin', false, '2026-10-31'),
      dev(12, 'R5CWB1234XY', 'Mobile phone', 'Phone', 'Samsung Galaxy A54', 'Head Office', 'Usman Ali', true, '2027-04-05'),
    ],
    workOrders: [
      { id: 'w1', no: 1, title: 'Switch not responding', deviceSerial: 'FCW2230ABCD', priority: 'High', status: 'Open', assignee: 'IT team', notes: 'Check power and uplink cable.', createdAt: ago(20) },
      { id: 'w2', no: 2, title: 'Printer paper jam error', deviceSerial: 'PHBLK12345', priority: 'Low', status: 'In progress', assignee: 'IT team', notes: '', createdAt: ago(48) },
      { id: 'w3', no: 3, title: 'Replace laptop battery', deviceSerial: 'PF3XQ7MN', priority: 'Medium', status: 'Open', assignee: 'IT team', notes: 'Battery swells at the back.', createdAt: ago(30) },
      { id: 'w4', no: 4, title: 'Install system updates', deviceSerial: '7XK2M93', priority: 'Medium', status: 'Done', assignee: 'IT team', notes: '', createdAt: ago(120) },
    ],
    stock: [
      { id: 's1', no: 1, name: 'Laptop battery (Latitude 5440)', category: 'Laptop parts', quantity: 2, minimum: 2, location: 'Head Office store', supplierId: 'p1' },
      { id: 's2', no: 2, name: 'SSD 512 GB', category: 'Storage', quantity: 8, minimum: 3, location: 'Main Plant store', supplierId: 'p1' },
      { id: 's3', no: 3, name: 'RAM 16 GB DDR4', category: 'Memory', quantity: 1, minimum: 4, location: 'Main Plant store', supplierId: 'p1' },
      { id: 's4', no: 4, name: 'Network cable Cat6 (box)', category: 'Cables', quantity: 5, minimum: 2, location: 'Main Plant store', supplierId: 'p2' },
      { id: 's5', no: 5, name: 'Toner cartridge', category: 'Printer supplies', quantity: 3, minimum: 3, location: 'Admin office', supplierId: 'p3' },
      { id: 's6', no: 6, name: 'UPS battery', category: 'Power', quantity: 6, minimum: 2, location: 'Plant 2 store', supplierId: 'p2' },
    ],
    suppliers: [
      { id: 'p1', name: 'Computer parts supplier', contact: 'Sales desk', phone: '', email: '', supplies: 'Laptop parts, SSDs, memory' },
      { id: 'p2', name: 'Networking and power supplier', contact: 'Sales desk', phone: '', email: '', supplies: 'Cables, UPS batteries, switches' },
      { id: 'p3', name: 'Printer supplies vendor', contact: 'Sales desk', phone: '', email: '', supplies: 'Toner, ink, paper' },
    ],
    log: [{ id: 'l1', time: ago(1), text: 'Sample data loaded' }],
  };
}
