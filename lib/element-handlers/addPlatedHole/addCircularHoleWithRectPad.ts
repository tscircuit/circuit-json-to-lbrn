import type { PcbHoleCircularWithRectPad } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createRoundedRectPath } from "../../helpers/roundedRectShape"
import { createCirclePath } from "../../helpers/circleShape"

export const addCircularHoleWithRectPad = (
  platedHole: PcbHoleCircularWithRectPad,
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
    soldermaskMargin,
  } = ctx
  const centerX = platedHole.x + origin.x
  const centerY = platedHole.y + origin.y
  const holeRadius = platedHole.hole_diameter / 2
  const padWidth = platedHole.rect_pad_width
  const padHeight = platedHole.rect_pad_height
  const borderRadius = platedHole.rect_border_radius ?? 0

  // Create rectangle pad vertices
  const padPath = createRoundedRectPath(
    centerX,
    centerY,
    padWidth,
    padHeight,
    borderRadius,
  )

  // Add the rectangular pad if drawing copper
  if (includeCopper) {
    project.children.push(
      new ShapePath({
        cutIndex: copperCutSetting.index,
        verts: padPath.verts,
        prims: padPath.prims,
        isClosed: true,
      }),
    )
  }

  // Add soldermask opening if drawing soldermask
  if (includeSoldermask) {
    const smPadWidth = padWidth + 2 * soldermaskMargin
    const smPadHeight = padHeight + 2 * soldermaskMargin
    const smPadPath = createRoundedRectPath(
      centerX,
      centerY,
      smPadWidth,
      smPadHeight,
      borderRadius,
    )

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
  if (holeRadius > 0) {
    const holeCenterX = centerX + platedHole.hole_offset_x
    const holeCenterY = centerY + platedHole.hole_offset_y
    const holePath = createCirclePath(holeCenterX, holeCenterY, holeRadius, 32)

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
