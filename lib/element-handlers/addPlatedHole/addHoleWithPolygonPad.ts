import type { PcbHoleWithPolygonPad } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"

export const addHoleWithPolygonPad = (
  platedHole: PcbHoleWithPolygonPad,
  ctx: ConvertContext,
): void => {
  // TODO: Implement hole with polygon pad generation
  console.warn(
    `Hole with polygon pad not yet implemented: ${platedHole.pcb_plated_hole_id}`,
  )
}
