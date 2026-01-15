import type { PcbPlatedHoleCircle } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createCirclePath } from "../../helpers/circleShape"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"

export const addCirclePlatedHole = (
  platedHole: PcbPlatedHoleCircle,
  ctx: ConvertContext,
): void => {
  const {
    project,
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

  // Add outer circle (copper annulus) if drawing copper
  // Plated holes go through all layers, so add to both top and bottom
  if (platedHole.outer_diameter > 0 && includeCopper) {
    const outerRadius = platedHole.outer_diameter / 2
    const outerPath = createCirclePath({
      centerX,
      centerY,
      radius: outerRadius,
    })

    // Use the helper for both layers (plated holes go through board)
    if (includeLayers.includes("top")) {
      addCopperGeometryToNetOrProject({
        geometryId: platedHole.pcb_plated_hole_id,
        path: outerPath,
        layer: "top",
        ctx,
      })
    }
    if (includeLayers.includes("bottom")) {
      addCopperGeometryToNetOrProject({
        geometryId: platedHole.pcb_plated_hole_id,
        path: outerPath,
        layer: "bottom",
        ctx,
      })
    }
  }

  // Add soldermask opening if drawing soldermask
  if (platedHole.outer_diameter > 0 && includeSoldermask) {
    // Percent margin is additive and may be negative.
    // Absolute per-element margin and global adjustment are always applied.
    const percentMargin =
      (solderMaskMarginPercent / 100) * platedHole.outer_diameter
    const totalMargin =
      globalCopperSoldermaskMarginAdjustment +
      (platedHole.soldermask_margin ?? 0) +
      percentMargin
    const smRadius = Math.max(platedHole.outer_diameter / 2 + totalMargin, 0)
    const outer = createCirclePath({
      centerX,
      centerY,
      radius: smRadius,
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

  // Add inner circle (hole) - always cut through the board
  if (platedHole.hole_diameter > 0 && includeCopper) {
    const innerRadius = platedHole.hole_diameter / 2
    const inner = createCirclePath({
      centerX,
      centerY,
      radius: innerRadius,
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
