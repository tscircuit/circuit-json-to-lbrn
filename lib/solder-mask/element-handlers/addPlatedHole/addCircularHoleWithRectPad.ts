import type { PcbHoleCircularWithRectPad } from "circuit-json"
import type { ConvertContext } from "../../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createRoundedRectPath } from "../../../helpers/roundedRectShape"
import { createCirclePath } from "../../../helpers/circleShape"

export const addCircularHoleWithRectPad = (
  platedHole: PcbHoleCircularWithRectPad,
  ctx: ConvertContext,
): void => {
  const { project, copperCutSetting, throughBoardCutSetting, origin } = ctx
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

  // Add the rectangular pad
  project.children.push(
    new ShapePath({
      cutIndex: copperCutSetting.index,
      verts: padPath.verts,
      prims: padPath.prims,
      isClosed: true,
    }),
  )
}
