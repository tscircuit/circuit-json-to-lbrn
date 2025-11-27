import type { PcbHoleWithPolygonPad } from "circuit-json"
import type { ConvertContext } from "../../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPolygonPathFromOutline } from "../../../helpers/polygonShape"
import { createCirclePath } from "../../../helpers/circleShape"

export const addHoleWithPolygonPad = (
  platedHole: PcbHoleWithPolygonPad,
  ctx: ConvertContext,
): void => {
  const { project, copperCutSetting, throughBoardCutSetting, origin } = ctx

  // Create the polygon pad
  if (platedHole.pad_outline.length >= 3) {
    const pad = createPolygonPathFromOutline(
      platedHole.pad_outline,
      platedHole.x + origin.x,
      platedHole.y + origin.y,
    )

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
