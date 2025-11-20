import type { PcbPlatedHoleOval } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"

export const addOvalPlatedHole = (
  platedHole: PcbPlatedHoleOval,
  ctx: ConvertContext,
): void => {
  // TODO: Implement oval/pill plated hole generation
  console.warn(
    `Oval/pill plated hole not yet implemented: ${platedHole.pcb_plated_hole_id}`,
  )
}
