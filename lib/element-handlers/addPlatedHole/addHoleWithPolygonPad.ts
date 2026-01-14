import type { PcbHoleWithPolygonPad } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPolygonPathFromOutline } from "../../helpers/polygonShape"
import { createCirclePath } from "../../helpers/circleShape"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"

export const addHoleWithPolygonPad = (
  platedHole: PcbHoleWithPolygonPad,
  ctx: ConvertContext,
): void => {
  const {
    project,
    soldermaskCutSetting,
    throughBoardCutSetting,
    origin,
    includeCopper,
    includeSoldermask,
    globalCopperSoldermaskMarginAdjustment,
    includeLayers,
  } = ctx

  // Create the polygon pad
  if (platedHole.pad_outline.length >= 3 && includeCopper) {
    const pad = createPolygonPathFromOutline({
      outline: platedHole.pad_outline,
      offsetX: platedHole.x + origin.x,
      offsetY: platedHole.y + origin.y,
    })

    // Add the polygon pad if drawing copper
    // Plated holes go through all layers, so add to both top and bottom
    if (includeCopper) {
      addCopperGeometryToNetOrProject({
        geometryId: platedHole.pcb_plated_hole_id,
        path: pad,
        layer: "top",
        ctx,
      })
      addCopperGeometryToNetOrProject({
        geometryId: platedHole.pcb_plated_hole_id,
        path: pad,
        layer: "bottom",
        ctx,
      })
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

  if (
    platedHole.hole_shape === "circle" &&
    platedHole.hole_diameter &&
    includeCopper
  ) {
    const centerX = platedHole.x + platedHole.hole_offset_x + origin.x
    const centerY = platedHole.y + platedHole.hole_offset_y + origin.y
    const radius = platedHole.hole_diameter / 2
    const hole = createCirclePath({
      centerX,
      centerY,
      radius,
      segments: 64,
    })

    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: hole.verts,
        prims: hole.prims,
        isClosed: true,
      }),
    )
  }
  if (
    platedHole.hole_shape === "pill" &&
    platedHole.hole_diameter &&
    includeCopper
  ) {
    const centerX = platedHole.x + platedHole.hole_offset_x + origin.x
    const centerY = platedHole.y + platedHole.hole_offset_y + origin.y
    const radius = platedHole.hole_diameter / 2
    const hole = createCirclePath({
      centerX,
      centerY,
      radius,
      segments: 64,
    })

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
