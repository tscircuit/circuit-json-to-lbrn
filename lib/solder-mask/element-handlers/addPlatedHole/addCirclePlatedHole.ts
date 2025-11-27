import type { PcbPlatedHoleCircle } from "circuit-json"
import type { ConvertContext } from "../../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createCirclePath } from "../../../helpers/circleShape"

export const addCirclePlatedHole = (
  platedHole: PcbPlatedHoleCircle,
  ctx: ConvertContext,
): void => {
  const { project, copperCutSetting, throughBoardCutSetting, origin } = ctx
  const centerX = platedHole.x + origin.x
  const centerY = platedHole.y + origin.y

  // Add outer circle (copper annulus)
  if (platedHole.outer_diameter > 0) {
    const outerRadius = platedHole.outer_diameter / 2
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
