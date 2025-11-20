import type { PcbHoleCircularWithRectPad } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"

export const addCircularHoleWithRectPad = (
  platedHole: PcbHoleCircularWithRectPad,
  ctx: ConvertContext,
): void => {
  // TODO: Implement circular hole with rectangular pad generation
  console.warn(
    `Circular hole with rect pad not yet implemented: ${platedHole.pcb_plated_hole_id}`,
  )
}
