import type { PcbHoleRect } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createRoundedRectPath } from "../../helpers/roundedRectShape"

/**
 * Adds a rectangular PCB hole (non-plated) to the project
 */
export const addRectPcbHole = (
  hole: PcbHoleRect,
  ctx: ConvertContext,
): void => {
  const { project, throughBoardCutSetting, origin, includeCopper } = ctx
  const centerX = hole.x + origin.x
  const centerY = hole.y + origin.y

  // Add the hole - cut through the board
  if (hole.hole_width > 0 && hole.hole_height > 0 && includeCopper) {
    const rectPath = createRoundedRectPath({
      centerX,
      centerY,
      width: hole.hole_width,
      height: hole.hole_height,
      borderRadius: 0, // no border radius for rect holes
    })
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: rectPath.verts,
        prims: rectPath.prims,
        isClosed: true,
      }),
    )
  }
}
