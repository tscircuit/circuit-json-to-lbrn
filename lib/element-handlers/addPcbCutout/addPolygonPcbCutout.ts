import type { PcbCutoutPolygon } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPolygonPathFromOutline } from "../../helpers/polygonShape"

/**
 * Adds a polygon PCB cutout to the project
 * Cutouts are regions removed from the board entirely
 */
export const addPolygonPcbCutout = (
  cutout: PcbCutoutPolygon,
  ctx: ConvertContext,
): void => {
  const { project, throughBoardCutSetting, origin, includeCopper } = ctx

  // Add the cutout - cut through the board
  if (cutout.points.length >= 3 && includeCopper) {
    const polygonPath = createPolygonPathFromOutline({
      outline: cutout.points,
      offsetX: origin.x,
      offsetY: origin.y,
    })
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: polygonPath.verts,
        prims: polygonPath.prims,
        isClosed: true,
      }),
    )
  }
}
