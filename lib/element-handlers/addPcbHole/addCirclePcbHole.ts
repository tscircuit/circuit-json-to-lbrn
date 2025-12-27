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
  const {
    project,
    throughBoardCutSetting,
    soldermaskCutSetting,
    origin,
    includeSoldermask,
    includeCopper,
  } = ctx
  const centerX = hole.x + origin.x
  const centerY = hole.y + origin.y

  // Add soldermask opening if drawing soldermask
  if (hole.hole_diameter > 0 && includeSoldermask) {
    const soldermaskPath = createCirclePath({
      centerX,
      centerY,
      radius: hole.hole_diameter / 2 + (hole.soldermask_margin ?? 0),
    })
    project.children.push(
      new ShapePath({
        cutIndex: soldermaskCutSetting.index,
        verts: soldermaskPath.verts,
        prims: soldermaskPath.prims,
        isClosed: true,
      }),
    )
  }

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
