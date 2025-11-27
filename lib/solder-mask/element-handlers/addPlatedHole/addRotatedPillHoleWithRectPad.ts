import type { PcbHoleRotatedPillWithRectPad } from "circuit-json"
import type { ConvertContext } from "../../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createRoundedRectPath } from "../../../helpers/roundedRectShape"
import { createPillPath } from "../../../helpers/pillShape"

export const addRotatedPillHoleWithRectPad = (
  platedHole: PcbHoleRotatedPillWithRectPad,
  ctx: ConvertContext,
): void => {
  const { project, copperCutSetting, throughBoardCutSetting, origin } = ctx
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

    project.children.push(
      new ShapePath({
        cutIndex: copperCutSetting.index,
        verts: padPath.verts,
        prims: padPath.prims,
        isClosed: true,
      }),
    )
  }

  const holeWidth = platedHole.hole_width
  const holeHeight = platedHole.hole_height
  const holeRotation = (platedHole.hole_ccw_rotation ?? 0) * (Math.PI / 180)
}
