import fs from "fs";
import path from "path";
import { REC_FEATURE_DIM } from "@/lib/recFeatures";

/**
 * @typedef {{ weights: number[], trainedAt?: string, nSamples?: number }} RankerModel
 */

/**
 * Load trained logistic weights from `data/ranker_weights.json` or `RANKER_WEIGHTS_PATH`.
 * @returns {RankerModel | null}
 */
export function loadRankerModel() {
  const custom = process.env.RANKER_WEIGHTS_PATH;
  const p = custom && custom.length > 0 ? custom : path.join(process.cwd(), "data", "ranker_weights.json");
  try {
    const raw = fs.readFileSync(p, "utf8");
    const j = JSON.parse(raw);
    if (!Array.isArray(j.weights) || j.weights.length !== REC_FEATURE_DIM) return null;
    return {
      weights: j.weights.map((x) => Number(x)),
      trainedAt: j.trainedAt,
      nSamples: j.nSamples,
    };
  } catch {
    return null;
  }
}

/**
 * Logistic score in (0,1); feature vector includes leading 1 (bias term).
 * @param {number[]} features
 * @param {RankerModel} model
 */
export function rankerProbability(features, model) {
  let z = 0;
  for (let i = 0; i < REC_FEATURE_DIM; i++) {
    z += model.weights[i] * features[i];
  }
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}
