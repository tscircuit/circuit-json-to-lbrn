import type { PcbPlatedHole } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { addCirclePlatedHole } from "./addCirclePlatedHole"
import { addOvalPlatedHole } from "./addOvalPlatedHole"
import { addCircularHoleWithRectPad } from "./addCircularHoleWithRectPad"
import { addPillHoleWithRectPad } from "./addPillHoleWithRectPad"
import { addRotatedPillHoleWithRectPad } from "./addRotatedPillHoleWithRectPad"
import { addHoleWithPolygonPad } from "./addHoleWithPolygonPad"

/**
 * Main dispatcher function that routes plated holes to the appropriate handler
 * based on their shape property
 */
export const addPlatedHole = (
  platedHole: PcbPlatedHole,
  ctx: ConvertContext,
): void => {
  switch (platedHole.shape) {
    case "circle":
      return addCirclePlatedHole(platedHole, ctx)

    case "oval":
    case "pill":
      return addOvalPlatedHole(platedHole, ctx)

    case "circular_hole_with_rect_pad":
      return addCircularHoleWithRectPad(platedHole, ctx)

    case "pill_hole_with_rect_pad":
      return addPillHoleWithRectPad(platedHole, ctx)

    case "rotated_pill_hole_with_rect_pad":
      return addRotatedPillHoleWithRectPad(platedHole, ctx)

    case "hole_with_polygon_pad":
      return addHoleWithPolygonPad(platedHole, ctx)

    default:
      // Type guard to ensure we handle all cases
      const _exhaustive: never = platedHole
      console.warn(`Unknown plated hole shape: ${(platedHole as any).shape}`)
  }
}
