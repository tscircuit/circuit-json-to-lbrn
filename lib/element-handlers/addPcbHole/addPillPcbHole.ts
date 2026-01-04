import type { PcbHolePill } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPillPath } from "../../helpers/pillShape"

/**
 * Adds a pill-shaped PCB hole (non-plated) to the project
 */
export const addPillPcbHole = (
  hole: PcbHolePill,
  ctx: ConvertContext,
): void => {
  const { project, throughBoardCutSetting, origin, includeCopper } = ctx
  const centerX = hole.x + origin.x
  const centerY = hole.y + origin.y

  // Add the hole - cut through the board
  if (hole.hole_width > 0 && hole.hole_height > 0 && includeCopper) {
    const pillPath = createPillPath({
      centerX,
      centerY,
      width: hole.hole_width,
      height: hole.hole_height,
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
