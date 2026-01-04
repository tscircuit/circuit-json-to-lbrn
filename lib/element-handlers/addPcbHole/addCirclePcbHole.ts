import type { PcbHoleCircle, PcbHoleCircleOrSquare } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createCirclePath } from "../../helpers/circleShape"

/**
 * Adds a circular PCB hole (non-plated) to the project
 */
export const addCirclePcbHole = (
  hole: PcbHoleCircle | PcbHoleCircleOrSquare,
  ctx: ConvertContext,
): void => {
  const { project, throughBoardCutSetting, origin, includeCopper } = ctx
  const centerX = hole.x + origin.x
  const centerY = hole.y + origin.y

  // Add the hole - cut through the board
  if (hole.hole_diameter > 0 && includeCopper) {
    const radius = hole.hole_diameter / 2
    const circlePath = createCirclePath({
      centerX,
      centerY,
      radius,
    })
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: circlePath.verts,
        prims: circlePath.prims,
        isClosed: true,
      }),
    )
  }
}
