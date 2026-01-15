import type { CircuitJsonUtilObjects } from "@tscircuit/circuit-json-util"
import type { CutSetting, LightBurnProject } from "lbrnts"
import type { Box, Polygon } from "@flatten-js/core"
import type { ConnectivityMap } from "circuit-json-to-connectivity-map"

export type ConnectivityMapKey = string

export interface ConvertContext {
  db: CircuitJsonUtilObjects
  project: LightBurnProject

  topCopperCutSetting: CutSetting
  bottomCopperCutSetting: CutSetting
  throughBoardCutSetting: CutSetting
  soldermaskCutSetting: CutSetting

  connMap: ConnectivityMap

  // Net geometries for CUT operations (vector/outline mode)
  // These are traced outlines of copper features
  topCutNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>
  bottomCutNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>

  // Net geometries for SCAN operations (raster/fill mode)
  // These are filled areas for trace clearance zones
  topScanNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>
  bottomScanNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>

  // Net geometries for copper fill expansion (larger ablation zone)
  // These use SCAN/fill mode to create bigger gaps around copper features
  topCopperFillNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>
  bottomCopperFillNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>

  // Global list of all copper geometries on each layer (source of truth for subtractions)
  topAllCopperGeoms: Array<Polygon | Box>
  bottomAllCopperGeoms: Array<Polygon | Box>

  origin: { x: number; y: number }

  // Include flags
  includeCopper: boolean
  includeSoldermask: boolean
  includeLayers: Array<"top" | "bottom">

  // Global copper soldermask margin adjustment (can be negative)
  globalCopperSoldermaskMarginAdjustment: number

  // Trace margin for clearance zones
  traceMargin: number
  laserSpotSize: number

  // Cut settings for trace clearance areas
  topTraceClearanceAreaCutSetting?: CutSetting
  bottomTraceClearanceAreaCutSetting?: CutSetting

  // Percent-based solder mask margin (scales with element size)
  solderMaskMarginPercent: number

  // Copper fill expansion distance (mm) for larger ablation zones
  copperFillExpansion: number

  // Cut settings for copper fill layers
  topCopperFillCutSetting?: CutSetting
  bottomCopperFillCutSetting?: CutSetting

  // Board outline polygon (used to clip copper fill to board boundaries)
  boardOutline?: Polygon
}
