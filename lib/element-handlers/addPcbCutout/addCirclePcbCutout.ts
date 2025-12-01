import type { PcbCutoutCircle } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createCirclePath } from "../../helpers/circleShape"

/**
 * Adds a circular PCB cutout to the project
 * Cutouts are regions removed from the board entirely
 */
export const addCirclePcbCutout = (
  cutout: PcbCutoutCircle,
  ctx: ConvertContext,
): void => {
  const {
    project,
    throughBoardCutSetting,
    origin,
    includeCopper,
    includeSoldermask,
    soldermaskMargin,
    soldermaskCutSetting,
  } = ctx
  const centerX = cutout.center.x + origin.x
  const centerY = cutout.center.y + origin.y

  // Add the cutout - cut through the board
  if (cutout.radius > 0 && includeCopper) {
    const circlePath = createCirclePath(centerX, centerY, cutout.radius)
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: circlePath.verts,
        prims: circlePath.prims,
        isClosed: true,
      }),
    )
  }

  // Add soldermask opening if drawing soldermask
  if (cutout.radius > 0 && includeSoldermask) {
    const smRadius = cutout.radius + soldermaskMargin
    const outer = createCirclePath(centerX, centerY, smRadius)
    project.children.push(
      new ShapePath({
        cutIndex: soldermaskCutSetting.index,
        verts: outer.verts,
        prims: outer.prims,
        isClosed: true,
      }),
    )
  }
}
