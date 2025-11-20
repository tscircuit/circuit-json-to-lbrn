import type { CircuitJsonUtilObjects } from "@tscircuit/circuit-json-util"
import type { CutSetting, LightBurnProject } from "lbrnts"

export interface ConvertContext {
  db: CircuitJsonUtilObjects
  project: LightBurnProject

  copperCutSetting: CutSetting
}
