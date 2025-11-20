import type { PcbHoleRotatedPillWithRectPad } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"

export const addRotatedPillHoleWithRectPad = (
  platedHole: PcbHoleRotatedPillWithRectPad,
  ctx: ConvertContext,
): void => {
  // TODO: Implement rotated pill hole with rectangular pad generation
  console.warn(
    `Rotated pill hole with rect pad not yet implemented: ${platedHole.pcb_plated_hole_id}`,
  )
}
