import type { CircuitJsonUtilObjects } from "@tscircuit/circuit-json-util"
import type { CutSetting, LightBurnProject } from "lbrnts"
import type { AnyShape, Polygon } from "@flatten-js/core"
import type { ConnectivityMap } from "circuit-json-to-connectivity-map"

export type ConnectivityMapKey = string

export interface ConvertContext {
  db: CircuitJsonUtilObjects
  project: LightBurnProject

  copperCutSetting: CutSetting

  connMap: ConnectivityMap

  netGeoms: Map<ConnectivityMapKey, Polygon[]>
}
