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

  // Separate net geometries for top and bottom layers
  topNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>
  bottomNetGeoms: Map<ConnectivityMapKey, Array<Polygon | Box>>

  origin: { x: number; y: number }

  // Include flags
  includeCopper: boolean
  includeSoldermask: boolean
  includeLayers: Array<"top" | "bottom">

  // Soldermask margin (can be negative)
  soldermaskMargin: number
}
