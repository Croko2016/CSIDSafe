import type { Thresholds } from './types';

export const DEFAULT_THRESHOLDS: Thresholds = {
  sucs: { amber: 1, red: 3 },
  mals: { amber: 1, red: 3 },
  lacs: { amber: 2, red: 5 },
};
