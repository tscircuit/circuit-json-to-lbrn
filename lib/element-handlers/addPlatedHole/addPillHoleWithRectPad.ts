import type { PcbHolePillWithRectPad } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"

export const addPillHoleWithRectPad = (
  platedHole: PcbHolePillWithRectPad,
  ctx: ConvertContext,
): void => {
  // TODO: Implement pill hole with rectangular pad generation
  console.warn(
    `Pill hole with rect pad not yet implemented: ${platedHole.pcb_plated_hole_id}`,
  )
}
