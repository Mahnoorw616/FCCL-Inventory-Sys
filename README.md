# FCCL Inventory

Track devices, work orders, spare stock, racks and suppliers for all FCCL plants.
Everything is saved in your browser (no server or database needed).

## Run it

1. Install Node.js 20 or newer from https://nodejs.org
2. Open a terminal in this folder and run `npm install`
3. Run `npm run dev`
4. Open http://localhost:3000

Other commands: `npm run build` (production build), `npm run lint` (type check), `npm test` (rule tests).

## How it works

- Devices are identified by their **serial number**. Each device also gets a simple number (1, 2, 3 ...).
- A green dot means online, an orange dot means offline. Change it in the device's Edit form.
- Top bar: Overview, Devices, Work Orders, Stock & Spares. Left menu: Racks, Suppliers, Activity Log.
- Devices can be exported to and imported from CSV (columns: serial, name, category, model, plant, assigned_to, status, warranty_end, notes).
