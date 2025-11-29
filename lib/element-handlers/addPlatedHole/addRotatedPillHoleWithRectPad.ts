import type { PcbHoleRotatedPillWithRectPad } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createRoundedRectPath } from "../../helpers/roundedRectShape"
import { createPillPath } from "../../helpers/pillShape"

export const addRotatedPillHoleWithRectPad = (
  platedHole: PcbHoleRotatedPillWithRectPad,
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

  const padWidth = platedHole.rect_pad_width
  const padHeight = platedHole.rect_pad_height
  const borderRadius = platedHole.rect_border_radius ?? 0
  const padRotation = (platedHole.rect_ccw_rotation ?? 0) * (Math.PI / 180)

  if (padWidth > 0 && padHeight > 0) {
    const padPath = createRoundedRectPath(
      centerX,
      centerY,
      padWidth,
      padHeight,
      borderRadius,
      4,
      padRotation,
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
      project.children.push(
        new ShapePath({
          cutIndex: soldermaskCutSetting.index,
          verts: padPath.verts,
          prims: padPath.prims,
          isClosed: true,
        }),
      )
    }
  }

  const holeWidth = platedHole.hole_width
  const holeHeight = platedHole.hole_height
  const holeRotation = (platedHole.hole_ccw_rotation ?? 0) * (Math.PI / 180)

  if (holeWidth > 0 && holeHeight > 0) {
    const holeCenterX = centerX + platedHole.hole_offset_x
    const holeCenterY = centerY + platedHole.hole_offset_y
    const holePath = createPillPath(
      holeCenterX,
      holeCenterY,
      holeWidth,
      holeHeight,
      holeRotation,
    )

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
