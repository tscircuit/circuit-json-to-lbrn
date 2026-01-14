import type { PcbHoleCircularWithRectPad } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createRoundedRectPath } from "../../helpers/roundedRectShape"
import { createCirclePath } from "../../helpers/circleShape"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"

export const addCircularHoleWithRectPad = (
  platedHole: PcbHoleCircularWithRectPad,
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
    includeLayers,
  } = ctx
  const centerX = platedHole.x + origin.x
  const centerY = platedHole.y + origin.y
  const holeRadius = platedHole.hole_diameter / 2
  const padWidth = platedHole.rect_pad_width
  const padHeight = platedHole.rect_pad_height
  const borderRadius = platedHole.rect_border_radius ?? 0

  // Create rectangle pad vertices
  const padPath = createRoundedRectPath({
    centerX,
    centerY,
    width: padWidth,
    height: padHeight,
    borderRadius,
  })

  // Add the rectangular pad if drawing copper
  // Plated holes go through all layers, so add to both top and bottom
  if (includeCopper) {
    addCopperGeometryToNetOrProject({
      geometryId: platedHole.pcb_plated_hole_id,
      path: padPath,
      layer: "top",
      ctx,
    })
    addCopperGeometryToNetOrProject({
      geometryId: platedHole.pcb_plated_hole_id,
      path: padPath,
      layer: "bottom",
      ctx,
    })
  }

  // Add soldermask opening if drawing soldermask
  if (includeSoldermask) {
    const smPadWidth =
      padWidth +
      2 * globalCopperSoldermaskMarginAdjustment +
      (platedHole.soldermask_margin ?? 0)
    const smPadHeight =
      padHeight +
      2 * globalCopperSoldermaskMarginAdjustment +
      (platedHole.soldermask_margin ?? 0)
    const smPadPath = createRoundedRectPath({
      centerX,
      centerY,
      width: smPadWidth,
      height: smPadHeight,
      borderRadius,
    })

    project.children.push(
      new ShapePath({
        cutIndex: soldermaskCutSetting.index,
        verts: smPadPath.verts,
        prims: smPadPath.prims,
        isClosed: true,
      }),
    )
  }

  // Add the circular hole (as a cutout) - always cut through the board regardless of mode
  if (holeRadius > 0 && includeCopper) {
    const holeCenterX = centerX + (platedHole.hole_offset_x ?? 0)
    const holeCenterY = centerY + (platedHole.hole_offset_y ?? 0)
    const holePath = createCirclePath({
      centerX: holeCenterX,
      centerY: holeCenterY,
      radius: holeRadius,
      segments: 32,
    })

    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: holePath.verts,
        prims: holePath.prims,
        isClosed: true,
      }),
    )
  }
}
