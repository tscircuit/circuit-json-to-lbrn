import type { PcbSmtPadRotatedPill } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPillPath } from "../../helpers/pillShape"

export const addRotatedPillSmtPad = (
  smtPad: PcbSmtPadRotatedPill,
  ctx: ConvertContext,
): void => {
  const { project, copperCutSetting, origin } = ctx
  const centerX = smtPad.x + origin.x
  const centerY = smtPad.y + origin.y
  const borderRadius = smtPad.radius ?? 0

  if (smtPad.width > 0 && smtPad.height > 0) {
    const outer = createPillPath(
      centerX,
      centerY,
      smtPad.width,
      smtPad.height,
      (smtPad.ccw_rotation ?? 0) * (Math.PI / 180),
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
