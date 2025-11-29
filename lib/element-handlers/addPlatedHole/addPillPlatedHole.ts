import type { PcbPlatedHoleOval } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPillPath } from "../../helpers/pillShape"

export const addPcbPlatedHolePill = (
  platedHole: PcbPlatedHoleOval,
  ctx: ConvertContext,
): void => {
  const {
    project,
    copperCutSetting,
    soldermaskCutSetting,
    throughBoardCutSetting,
    origin,
    includeCopper,
    includeSoldermask,
  } = ctx
  const centerX = platedHole.x + origin.x
  const centerY = platedHole.y + origin.y
  const rotation = (platedHole.ccw_rotation || 0) * (Math.PI / 180) // Convert degrees to radians

  // Add outer pill shape (copper) if drawing copper
  if (
    platedHole.outer_width > 0 &&
    platedHole.outer_height > 0 &&
    includeCopper
  ) {
    const outer = createPillPath(
      centerX,
      centerY,
      platedHole.outer_width,
      platedHole.outer_height,
      rotation,
    )
    project.children.push(
      new ShapePath({
        cutIndex: copperCutSetting.index,
        verts: outer.verts,
        prims: outer.prims,
        isClosed: true,
      }),
    )
  }

  // Add soldermask opening if drawing soldermask
  if (
    platedHole.outer_width > 0 &&
    platedHole.outer_height > 0 &&
    includeSoldermask
  ) {
    const outer = createPillPath(
      centerX,
      centerY,
      platedHole.outer_width,
      platedHole.outer_height,
      rotation,
    )
    project.children.push(
      new ShapePath({
        cutIndex: soldermaskCutSetting.index,
        verts: outer.verts,
        prims: outer.prims,
        isClosed: true,
      }),
    )
  }

  // Add inner pill shape (hole)
  if (platedHole.hole_width > 0 && platedHole.hole_height > 0) {
    const inner = createPillPath(
      centerX,
      centerY,
      platedHole.hole_width,
      platedHole.hole_height,
      rotation,
    )
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: inner.verts,
        prims: inner.prims,
        isClosed: true,
      }),
    )
  }
}
