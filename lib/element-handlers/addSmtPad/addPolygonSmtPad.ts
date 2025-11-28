import type { PcbSmtPadPolygon } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPolygonPathFromOutline } from "../../helpers/polygonShape"

export const addPolygonSmtPad = (
  smtPad: PcbSmtPadPolygon,
  ctx: ConvertContext,
): void => {
  const { project, copperCutSetting, origin } = ctx

  // Create the polygon pad
  if (smtPad.points.length >= 3) {
    const pad = createPolygonPathFromOutline(smtPad.points, origin.x, origin.y)

    project.children.push(
      new ShapePath({
        cutIndex: copperCutSetting.index,
        verts: pad.verts,
        prims: pad.prims,
        isClosed: true,
      }),
    )
  }
}
