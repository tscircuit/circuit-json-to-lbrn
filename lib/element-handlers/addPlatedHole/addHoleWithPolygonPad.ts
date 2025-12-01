import type { PcbHoleWithPolygonPad } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPolygonPathFromOutline } from "../../helpers/polygonShape"
import { createCirclePath } from "../../helpers/circleShape"

export const addHoleWithPolygonPad = (
  platedHole: PcbHoleWithPolygonPad,
  ctx: ConvertContext,
): void => {
  const {
    project,
    copperCutSetting,
    soldermaskCutSetting,
    throughBoardCutSetting,
    origin,
    includeCopper,
    includeSoldermask,
    soldermaskMargin,
  } = ctx

  // Create the polygon pad
  if (platedHole.pad_outline.length >= 3) {
    const pad = createPolygonPathFromOutline(
      platedHole.pad_outline,
      platedHole.x + origin.x,
      platedHole.y + origin.y,
    )

    // Add the polygon pad if drawing copper
    if (includeCopper) {
      project.children.push(
        new ShapePath({
          cutIndex: copperCutSetting.index,
          verts: pad.verts,
          prims: pad.prims,
          isClosed: true,
        }),
      )
    }

    // Add soldermask opening if drawing soldermask
    if (includeSoldermask) {
      // TODO: For polygon pads with soldermask margin, we need to implement proper
      // polygon offsetting. For now, we use the pad vertices directly.
      project.children.push(
        new ShapePath({
          cutIndex: soldermaskCutSetting.index,
          verts: pad.verts,
          prims: pad.prims,
          isClosed: true,
        }),
      )
    }
  }

  if (platedHole.hole_shape === "circle" && platedHole.hole_diameter) {
    const centerX = platedHole.x + platedHole.hole_offset_x + origin.x
    const centerY = platedHole.y + platedHole.hole_offset_y + origin.y
    const radius = platedHole.hole_diameter / 2
    const hole = createCirclePath(centerX, centerY, radius, 64)

    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: hole.verts,
        prims: hole.prims,
        isClosed: true,
      }),
    )
  }
  if (platedHole.hole_shape === "pill" && platedHole.hole_diameter) {
    const centerX = platedHole.x + platedHole.hole_offset_x + origin.x
    const centerY = platedHole.y + platedHole.hole_offset_y + origin.y
    const radius = platedHole.hole_diameter / 2
    const hole = createCirclePath(centerX, centerY, radius, 64)

    // Note: rotation is not supported for holes with polygon pad

    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: hole.verts,
        prims: hole.prims,
        isClosed: true,
      }),
    )
  }
}
