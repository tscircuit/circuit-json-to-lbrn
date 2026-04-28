/**
 * Consistent layer index assignments for LightBurn cut settings.
 * Each layer type always gets the same index (and thus the same color)
 * regardless of what other layers are enabled.
 */
export const LAYER_INDEXES = {
  // Cut layers (vector/outline)
  topCopper: 0,
  bottomCopper: 1,
  throughBoard: 2,

  // Scan layers (raster/fill)
  topSoldermask: 3,
  topTraceClearance: 4,
  bottomTraceClearance: 5,
  topCopperCutFill: 6,
  bottomCopperCutFill: 7,
  topOxidationCleaning: 8,
  bottomOxidationCleaning: 9,
  topSoldermaskCure: 10,
  bottomSoldermask: 11,
  bottomSoldermaskCure: 12,
  reflectedBottomBoardCut: 13,
} as const

export type LayerIndex = (typeof LAYER_INDEXES)[keyof typeof LAYER_INDEXES]
