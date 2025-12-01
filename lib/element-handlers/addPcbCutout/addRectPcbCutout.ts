import type { PcbCutoutRect } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createRoundedRectPath } from "../../helpers/roundedRectShape"

/**
 * Adds a rectangular PCB cutout to the project
 * Cutouts are regions removed from the board entirely
 */
export const addRectPcbCutout = (
  cutout: PcbCutoutRect,
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
  if (cutout.width > 0 && cutout.height > 0 && includeCopper) {
    const rotation = (cutout.rotation ?? 0) * (Math.PI / 180) // Convert degrees to radians
    const rectPath = createRoundedRectPath(
      centerX,
      centerY,
      cutout.width,
      cutout.height,
      0, // no border radius for cutouts
      4, // segments
      rotation,
    )
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: rectPath.verts,
        prims: rectPath.prims,
        isClosed: true,
      }),
    )
  }

  // Add soldermask opening if drawing soldermask
  if (cutout.width > 0 && cutout.height > 0 && includeSoldermask) {
    const rotation = (cutout.rotation ?? 0) * (Math.PI / 180) // Convert degrees to radians
    const smWidth = cutout.width + 2 * soldermaskMargin
    const smHeight = cutout.height + 2 * soldermaskMargin
    const rectPath = createRoundedRectPath(
      centerX,
      centerY,
      smWidth,
      smHeight,
      0, // no border radius for cutouts
      4, // segments
      rotation,
    )
    project.children.push(
      new ShapePath({
        cutIndex: soldermaskCutSetting.index,
        verts: rectPath.verts,
        prims: rectPath.prims,
        isClosed: true,
      }),
    )
  }
}
