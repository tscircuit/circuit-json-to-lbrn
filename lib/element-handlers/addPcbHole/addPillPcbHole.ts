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
  if (hole.hole_width > 0 && hole.hole_height > 0 && includeSoldermask) {
    const soldermaskPath = createPillPath(
      centerX,
      centerY,
      hole.hole_width + soldermaskMargin * 2,
      hole.hole_height + soldermaskMargin * 2,
    )
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
  if (hole.hole_width > 0 && hole.hole_height > 0) {
    const pillPath = createPillPath(
      centerX,
      centerY,
      hole.hole_width,
      hole.hole_height,
    )
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
