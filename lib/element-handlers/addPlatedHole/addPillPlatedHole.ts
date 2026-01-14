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
    topCopperCutSetting,
    bottomCopperCutSetting,
    soldermaskCutSetting,
    throughBoardCutSetting,
    origin,
    includeCopper,
    includeSoldermask,
    globalCopperSoldermaskMarginAdjustment,
    solderMaskMarginPercent,
    includeLayers,
  } = ctx
  const centerX = platedHole.x + origin.x
  const centerY = platedHole.y + origin.y
  const rotation = (platedHole.ccw_rotation || 0) * (Math.PI / 180) // Convert degrees to radians

  // Add outer pill shape (copper) if drawing copper
  // Plated holes go through all layers, so add to both top and bottom
  if (
    platedHole.outer_width > 0 &&
    platedHole.outer_height > 0 &&
    includeCopper
  ) {
    const outer = createPillPath({
      centerX,
      centerY,
      width: platedHole.outer_width,
      height: platedHole.outer_height,
      rotation,
    })
    if (includeLayers.includes("top")) {
      project.children.push(
        new ShapePath({
          cutIndex: topCopperCutSetting.index,
          verts: outer.verts,
          prims: outer.prims,
          isClosed: true,
        }),
      )
    }
    if (includeLayers.includes("bottom")) {
      project.children.push(
        new ShapePath({
          cutIndex: bottomCopperCutSetting.index,
          verts: outer.verts,
          prims: outer.prims,
          isClosed: true,
        }),
      )
    }
  }

  // Add soldermask opening if drawing soldermask
  if (
    platedHole.outer_width > 0 &&
    platedHole.outer_height > 0 &&
    includeSoldermask
  ) {
    // Percent margin is additive and may be negative.
    // Absolute per-element margin and global adjustment are always applied.
    const percentMarginX =
      (solderMaskMarginPercent / 100) * platedHole.outer_width
    const percentMarginY =
      (solderMaskMarginPercent / 100) * platedHole.outer_height
    const totalMarginX = Math.max(
      globalCopperSoldermaskMarginAdjustment +
        (platedHole.soldermask_margin ?? 0) +
        percentMarginX,
      -platedHole.outer_width / 2,
    )
    const totalMarginY = Math.max(
      globalCopperSoldermaskMarginAdjustment +
        (platedHole.soldermask_margin ?? 0) +
        percentMarginY,
      -platedHole.outer_height / 2,
    )
    const smWidth = platedHole.outer_width + 2 * totalMarginX
    const smHeight = platedHole.outer_height + 2 * totalMarginY
    const outer = createPillPath({
      centerX,
      centerY,
      width: smWidth,
      height: smHeight,
      rotation,
    })
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
  if (
    platedHole.hole_width > 0 &&
    platedHole.hole_height > 0 &&
    includeCopper
  ) {
    const inner = createPillPath({
      centerX,
      centerY,
      width: platedHole.hole_width,
      height: platedHole.hole_height,
      rotation,
    })
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
