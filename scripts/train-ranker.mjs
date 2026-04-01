/**
 * Train logistic regression on CSV from export-rec-training.mjs.
 * Usage: node scripts/train-ranker.mjs training.csv
 *        node scripts/train-ranker.mjs --in training.csv --out data/ranker_weights.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REC_FEATURE_DIM = 9;

function parseArgs() {
  const a = process.argv.slice(2);
  let input = null;
  let out = path.join(process.cwd(), "data", "ranker_weights.json");
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--in") input = a[++i];
    else if (a[i] === "--out") out = a[++i];
    else if (!a[i].startsWith("-") && !input) input = a[i];
  }
  return { input, out };
}

function sigmoid(z) {
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const data = [];
  for (let li = 1; li < lines.length; li++) {
    const parts = lines[li].split(",");
    const label = Number(parts[0]);
    const feats = [];
    for (let j = 0; j < REC_FEATURE_DIM; j++) {
      feats.push(Number(parts[1 + j]));
    }
    if (![0, 1].includes(label) || feats.some((x) => !Number.isFinite(x))) continue;
    data.push({ y: label, x: feats });
  }
  return data;
}

function train(data, { lr = 0.15, epochs = 600, l2 = 0.02 } = {}) {
  const n = data.length;
  if (n < 20) return null;
  const w = Array(REC_FEATURE_DIM).fill(0);

  for (let e = 0; e < epochs; e++) {
    const g = Array(REC_FEATURE_DIM).fill(0);
    for (const row of data) {
      const p = sigmoid(w.reduce((s, wi, i) => s + wi * row.x[i], 0));
      const err = p - row.y;
      for (let i = 0; i < REC_FEATURE_DIM; i++) {
        g[i] += err * row.x[i];
      }
    }
    for (let i = 0; i < REC_FEATURE_DIM; i++) {
      w[i] -= (lr / n) * g[i] + lr * l2 * w[i];
    }
  }
  return w;
}

function main() {
  const { input, out } = parseArgs();
  if (!input) {
    console.error("Usage: node scripts/train-ranker.mjs <training.csv> [--out data/ranker_weights.json]");
    process.exit(1);
  }
  const csv = fs.readFileSync(path.resolve(input), "utf8");
  const data = parseCsv(csv);
  const w = train(data);
  if (!w) {
    console.error("Need at least 20 labeled rows to train.");
    process.exit(1);
  }

  const dir = path.dirname(path.resolve(out));
  fs.mkdirSync(dir, { recursive: true });
  const payload = {
    weights: w,
    trainedAt: new Date().toISOString(),
    nSamples: data.length,
    featureDim: REC_FEATURE_DIM,
  };
  fs.writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");
  console.error(`Wrote ${out} (${data.length} samples)`);
}

main();
