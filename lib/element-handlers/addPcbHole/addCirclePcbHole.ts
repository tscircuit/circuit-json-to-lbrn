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
    soldermaskMargin,
  } = ctx
  const centerX = hole.x + origin.x
  const centerY = hole.y + origin.y

  // Add soldermask opening if drawing soldermask
  if (hole.hole_diameter > 0 && includeSoldermask) {
    const smRadius = hole.hole_diameter / 2 + soldermaskMargin
    const soldermaskPath = createCirclePath(centerX, centerY, smRadius)
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
  if (hole.hole_diameter > 0) {
    const radius = hole.hole_diameter / 2
    const circlePath = createCirclePath(centerX, centerY, radius)
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
