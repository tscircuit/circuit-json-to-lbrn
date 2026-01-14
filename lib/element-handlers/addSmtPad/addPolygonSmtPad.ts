import type { PcbSmtPadPolygon } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPolygonPathFromOutline } from "../../helpers/polygonShape"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"
import { polygonToShapePathData } from "../../polygon-to-shape-path"

export const addPolygonSmtPad = (
  smtPad: PcbSmtPadPolygon,
  ctx: ConvertContext,
): void => {
  const {
    project,
    soldermaskCutSetting,
    origin,
    includeCopper,
    includeSoldermask,
    globalCopperSoldermaskMarginAdjustment,
    solderMaskMarginPercent,
    includeLayers,
  } = ctx

  // Filter by layer - only process top and bottom layers
  const padLayer = smtPad.layer || "top"
  if (padLayer !== "top" && padLayer !== "bottom") {
    return // Skip inner layers
  }
  if (!includeLayers.includes(padLayer)) {
    return
  }

  // Create the polygon pad
  if (smtPad.points.length >= 3) {
    const pad = createPolygonPathFromOutline({
      outline: smtPad.points,
      offsetX: origin.x,
      offsetY: origin.y,
    })

    // Add to copper geometry (will be merged with traces if connected)
    if (includeCopper) {
      addCopperGeometryToNetOrProject({
        geometryId: smtPad.pcb_smtpad_id,
        path: pad,
        layer: padLayer,
        ctx,
      })
    }

    // Add soldermask opening if drawing soldermask
    if (includeSoldermask) {
      // TODO: For polygon pads with soldermask margin, we need to implement proper
      // polygon offsetting. For now, we use the pad vertices directly.
      // Consider using a polygon offsetting library like polygon-offset or
      // implementing offset using @flatten-js/core buffer operations
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
}
