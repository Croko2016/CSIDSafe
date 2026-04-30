import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const OUT = join(ROOT, 'public', 'foods.json');

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(path) {
  const text = readFileSync(path, 'utf-8');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 5) continue;
    const [name, id, serving, servingUnit, qtyPer100] = fields;
    const value = parseFloat(qtyPer100);
    rows.push({
      id: id.trim(),
      name: name.trim(),
      serving: parseFloat(serving) || null,
      servingUnit: (servingUnit || '').trim() || null,
      value: Number.isFinite(value) ? value : 0,
    });
  }
  return rows;
}

const sucrose = parseCSV(join(DATA_DIR, 'sucrose.csv'));
const maltose = parseCSV(join(DATA_DIR, 'maltose.csv'));
const lactose = parseCSV(join(DATA_DIR, 'lactose.csv'));

const merged = new Map();
for (const r of sucrose) {
  merged.set(r.id, {
    id: r.id,
    name: r.name,
    serving: r.serving,
    servingUnit: r.servingUnit,
    sucs: r.value,
    mals: 0,
    lacs: 0,
  });
}
for (const r of maltose) {
  const existing = merged.get(r.id);
  if (existing) existing.mals = r.value;
  else
    merged.set(r.id, {
      id: r.id,
      name: r.name,
      serving: r.serving,
      servingUnit: r.servingUnit,
      sucs: 0,
      mals: r.value,
      lacs: 0,
    });
}
for (const r of lactose) {
  const existing = merged.get(r.id);
  if (existing) existing.lacs = r.value;
  else
    merged.set(r.id, {
      id: r.id,
      name: r.name,
      serving: r.serving,
      servingUnit: r.servingUnit,
      sucs: 0,
      mals: 0,
      lacs: r.value,
    });
}

const foods = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
const out = { version: '2024-nz-foodfiles', count: foods.length, foods };

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
console.log(`Wrote ${foods.length} foods to ${OUT}`);
