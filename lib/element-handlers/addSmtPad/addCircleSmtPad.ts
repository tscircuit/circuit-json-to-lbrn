import type { PcbSmtPadCircle } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createCirclePath } from "../../helpers/circleShape"

export const addCircleSmtPad = (
  smtPad: PcbSmtPadCircle,
  ctx: ConvertContext,
): void => {
  const { project, copperCutSetting, origin } = ctx
  const centerX = smtPad.x + origin.x
  const centerY = smtPad.y + origin.y

  if (smtPad.radius > 0) {
    const outerRadius = smtPad.radius
    const outer = createCirclePath(centerX, centerY, outerRadius)
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
