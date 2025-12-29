import type { PcbHoleOval } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createOvalPath } from "../../helpers/ovalShape"

/**
 * Adds an oval PCB hole (non-plated) to the project
 */
export const addOvalPcbHole = (
  hole: PcbHoleOval,
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
  if (hole.hole_width > 0 && hole.hole_height > 0 && includeSoldermask) {
    const soldermaskPath = createOvalPath({
      centerX,
      centerY,
      width: hole.hole_width + 2 * (hole.soldermask_margin ?? 0),
      height: hole.hole_height + 2 * (hole.soldermask_margin ?? 0),
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
  if (hole.hole_width > 0 && hole.hole_height > 0 && includeCopper) {
    const ovalPath = createOvalPath({
      centerX,
      centerY,
      width: hole.hole_width,
      height: hole.hole_height,
    })
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: ovalPath.verts,
        prims: ovalPath.prims,
        isClosed: true,
      }),
    )
  }
}
