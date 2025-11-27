import type { CircuitJson } from "circuit-json"
import type { LightBurnProject } from "lbrnts"
import { generateCopper } from "./copper/generateCopper"
import { generateSolderMask } from "./solder-mask/generateSolderMask"

export const convertCircuitJsonToLbrn = (
  circuitJson: CircuitJson,
  options: {
    includeSilkscreen?: boolean
    origin?: { x: number; y: number }
    margin?: number
    solderMask?: boolean
  } = {},
): LightBurnProject => {
  if (options.solderMask) {
    return generateSolderMask(circuitJson, options)
  }
  return generateCopper(circuitJson, options)
}
