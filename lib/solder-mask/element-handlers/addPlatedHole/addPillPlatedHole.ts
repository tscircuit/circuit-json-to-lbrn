import type { PcbPlatedHoleOval } from "circuit-json"
import type { ConvertContext } from "../../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPillPath } from "../../../helpers/pillShape"

export const addPcbPlatedHolePill = (
  platedHole: PcbPlatedHoleOval,
  ctx: ConvertContext,
): void => {
  const { project, copperCutSetting, throughBoardCutSetting, origin } = ctx
  const centerX = platedHole.x + origin.x
  const centerY = platedHole.y + origin.y
  const rotation = (platedHole.ccw_rotation || 0) * (Math.PI / 180) // Convert degrees to radians

  // Add outer pill shape (copper)
  if (platedHole.outer_width > 0 && platedHole.outer_height > 0) {
    const outer = createPillPath(
      centerX,
      centerY,
      platedHole.outer_width,
      platedHole.outer_height,
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
