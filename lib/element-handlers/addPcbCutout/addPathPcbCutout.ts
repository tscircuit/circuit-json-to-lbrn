import type { PcbCutoutPath } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"

/**
 * Adds a path-based PCB cutout to the project
 * Path cutouts create slots along a route (e.g., for routed slots or complex cutout paths)
 */
export const addPathPcbCutout = (
  cutout: PcbCutoutPath,
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

  // For path cutouts, we need to create a stroke along the route with the given width
  // For simplicity, we'll convert the path to a polyline
  if (cutout.route.length >= 2 && includeCopper) {
    const verts: { x: number; y: number }[] = []
    const prims: { type: number }[] = []

    for (const point of cutout.route) {
      verts.push({
        x: point.x + origin.x,
        y: point.y + origin.y,
      })
      prims.push({ type: 0 })
    }

    // Note: slot_width, slot_length, space_between_slots, and slot_corner_radius
    // would require more complex path offsetting and aren't currently implemented
    // For now, we just create a simple path along the route
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts,
        prims,
        isClosed: false, // Paths are typically not closed
      }),
    )
  }

  // Add soldermask opening if drawing soldermask
  if (cutout.route.length >= 2 && includeSoldermask) {
    const verts: { x: number; y: number }[] = []
    const prims: { type: number }[] = []

    // Create path with soldermask margin
    for (const point of cutout.route) {
      verts.push({
        x: point.x + origin.x,
        y: point.y + origin.y,
      })
      prims.push({ type: 0 })
    }

    project.children.push(
      new ShapePath({
        cutIndex: soldermaskCutSetting.index,
        verts,
        prims,
        isClosed: false, // Match the same path as the copper cutout
      }),
    )
  }
}
