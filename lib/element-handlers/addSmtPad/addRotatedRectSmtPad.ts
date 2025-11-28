import type { PcbSmtPadRotatedRect } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createRoundedRectPath } from "../../helpers/roundedRectShape"

export const addRotatedRectSmtPad = (
  smtPad: PcbSmtPadRotatedRect,
  ctx: ConvertContext,
): void => {
  const { project, copperCutSetting, origin } = ctx
  const centerX = smtPad.x + origin.x
  const centerY = smtPad.y + origin.y
  const rotation = smtPad.ccw_rotation ?? 0
  const borderRadius = smtPad.rect_border_radius ?? 0

  if (smtPad.width > 0 && smtPad.height > 0) {
    const outer = createRoundedRectPath(
      centerX,
      centerY,
      smtPad.width,
      smtPad.height,
      borderRadius,
      4,
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
}
