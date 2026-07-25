import type { Box, Polygon } from "@flatten-js/core"
import type {
  BoardBounds,
  CircuitJsonUtilObjects,
} from "@tscircuit/circuit-json-util"
import type { ConnectivityMap } from "circuit-json-to-connectivity-map"
import type { CutSetting, LightBurnProject, Mat } from "lbrnts"

type Contour = Array<[number, number]>

export type ConnectivityMapKey = string

export interface ConvertContext {
  db: CircuitJsonUtilObjects
  project: LightBurnProject

  topCopperCutSetting?: CutSetting
  bottomCopperCutSetting?: CutSetting
  throughBoardCutSetting: CutSetting
  topHolePunchCutSetting?: CutSetting
  bottomHolePunchCutSetting?: CutSetting
  topSoldermaskCutSetting?: CutSetting
  bottomSoldermaskCutSetting?: CutSetting
  topSoldermaskCureCutSetting?: CutSetting
  bottomSoldermaskCureCutSetting?: CutSetting
  reflectedBottomBoardCutSetting?: CutSetting
  tool1CutSetting?: CutSetting

  connMap: ConnectivityMap

  // Net geometries for CUT operations (vector/outline mode)
  // These are traced outlines of copper features
  topCutNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>
  bottomCutNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>

  // Net geometries for SCAN operations (raster/fill mode)
  // These are filled areas for trace clearance zones
  topScanNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>
  bottomScanNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>

  origin: { x: number; y: number }

  // Include flags
  includeCopper: boolean
  includeSoldermask: boolean
  includeSoldermaskCure: boolean
  includeLayers: Array<"top" | "bottom">
  mirrorBottomLayer: boolean
  bottomLayerXform?: Mat

  // Global copper soldermask margin adjustment (can be negative)
  globalCopperSoldermaskMarginAdjustment: number

  // Trace margin for clearance zones
  traceMargin: number
  laserSpotSize: number

  // Cut settings for trace clearance areas
  topTraceClearanceAreaCutSetting?: CutSetting
  bottomTraceClearanceAreaCutSetting?: CutSetting

  // Cut settings for copper cut fill layers
  topCopperCutFillCutSetting?: CutSetting
  bottomCopperCutFillCutSetting?: CutSetting
  topCopperCutFillExcludedNetIds: Set<ConnectivityMapKey>
  bottomCopperCutFillExcludedNetIds: Set<ConnectivityMapKey>

  // Cut setting for the outer soldermask ablation outline
  topSoldermaskAblationCutSetting?: CutSetting

  // Cut settings for oxidation cleaning layer
  topOxidationCleaningCutSetting?: CutSetting
  bottomOxidationCleaningCutSetting?: CutSetting

  // Percent-based solder mask margin (scales with element size)
  solderMaskMarginPercent: number

  // Copper cut fill margin (how far to expand the copper outline for the cut fill band)
  copperCutFillMargin: number
  clipCopperCutFillToBoardOutline: boolean
  soldermaskAblationClearance: number

  // Track trace endpoint positions to avoid duplicate circles
  // Key is "x,y" rounded to 6 decimal places
  topTraceEndpoints: Set<string>
  bottomTraceEndpoints: Set<string>

  // Board outline as a contour for board-relative scan layers
  boardOutlineContour?: Contour

  // Board bounds for full-board scan operations
  boardBounds?: BoardBounds
}
