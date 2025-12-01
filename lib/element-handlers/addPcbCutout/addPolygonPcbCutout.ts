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
  const {
    project,
    throughBoardCutSetting,
    origin,
    includeCopper,
    includeSoldermask,
    soldermaskCutSetting,
    soldermaskMargin,
  } = ctx

  // Add the cutout - cut through the board
  if (cutout.points.length >= 3 && includeCopper) {
    const polygonPath = createPolygonPathFromOutline(
      cutout.points,
      origin.x,
      origin.y,
    )
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: polygonPath.verts,
        prims: polygonPath.prims,
        isClosed: true,
      }),
    )
  }

  // Add soldermask opening if drawing soldermask
  if (cutout.points.length >= 3 && includeSoldermask) {
    // Apply soldermask margin to the points if margin is specified
    const points =
      soldermaskMargin && soldermaskMargin > 0
        ? cutout.points.map((p) => ({
            x:
              (p.x ?? 0) + (p.x ?? 0) > 0
                ? soldermaskMargin
                : -soldermaskMargin,
            y:
              (p.y ?? 0) + (p.y ?? 0) > 0
                ? soldermaskMargin
                : -soldermaskMargin,
          }))
        : cutout.points

    const polygonPath = createPolygonPathFromOutline(points, origin.x, origin.y)
    project.children.push(
      new ShapePath({
        cutIndex: soldermaskCutSetting.index,
        verts: polygonPath.verts,
        prims: polygonPath.prims,
        isClosed: true,
      }),
    )
  }
}
