import type { PcbHoleRotatedPill } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPillPath } from "../../helpers/pillShape"

/**
 * Adds a rotated pill-shaped PCB hole (non-plated) to the project
 */
export const addRotatedPillPcbHole = (
  hole: PcbHoleRotatedPill,
  ctx: ConvertContext,
): void => {
  const { project, throughBoardCutSetting, origin, includeCopper } = ctx
  const centerX = hole.x + origin.x
  const centerY = hole.y + origin.y
  const rotation = (hole.ccw_rotation || 0) * (Math.PI / 180) // Convert degrees to radians

  // Add the hole - cut through the board
  if (hole.hole_width > 0 && hole.hole_height > 0 && includeCopper) {
    const pillPath = createPillPath({
      centerX,
      centerY,
      width: hole.hole_width,
      height: hole.hole_height,
      rotation,
    })
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: pillPath.verts,
        prims: pillPath.prims,
        isClosed: true,
      }),
    )
  }
}
