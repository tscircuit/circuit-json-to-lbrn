import type { PcbHole } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { addCirclePcbHole } from "./addCirclePcbHole"
import { addRectPcbHole } from "./addRectPcbHole"
import { addOvalPcbHole } from "./addOvalPcbHole"
import { addPillPcbHole } from "./addPillPcbHole"
import { addRotatedPillPcbHole } from "./addRotatedPillPcbHole"

/**
 * Main dispatcher function that routes PCB holes to the appropriate handler
 * based on their hole_shape property
 */
export const addPcbHole = (hole: PcbHole, ctx: ConvertContext): void => {
  switch (hole.hole_shape) {
    case "circle":
    case "square":
      return addCirclePcbHole(hole, ctx)

    case "rect":
      return addRectPcbHole(hole, ctx)

    case "oval":
      return addOvalPcbHole(hole, ctx)

    case "pill":
      return addPillPcbHole(hole, ctx)

    case "rotated_pill":
      return addRotatedPillPcbHole(hole, ctx)

    default:
      // Type guard to ensure we handle all cases
      const _exhaustive: never = hole
      console.warn(`Unknown hole shape: ${(hole as any).hole_shape}`)
  }
}
