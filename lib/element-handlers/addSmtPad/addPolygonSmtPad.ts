import type { PcbSmtPadPolygon } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { createPolygonPathFromOutline } from "../../helpers/polygonShape"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"
import { createLayerShapePath } from "../../helpers/createLayerShapePath"

export const addPolygonSmtPad = (
  smtPad: PcbSmtPadPolygon,
  ctx: ConvertContext,
): void => {
  const {
    project,
    topSoldermaskCutSetting,
    bottomSoldermaskCutSetting,
    origin,
    includeCopper,
    includeSoldermask,
    globalCopperSoldermaskMarginAdjustment,
    solderMaskMarginPercent,
    includeLayers,
  } = ctx

  // Filter by layer - only process top and bottom layers
  const padLayer = (smtPad.layer || "top") as "top" | "bottom"
  if (padLayer !== "top" && padLayer !== "bottom") {
    return // Skip inner layers
  }
  if (!includeLayers.includes(padLayer)) {
    return
  }
  const soldermaskCutSetting =
    padLayer === "top" ? topSoldermaskCutSetting : bottomSoldermaskCutSetting

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
    if (includeSoldermask && soldermaskCutSetting) {
      // TODO: For polygon pads with soldermask margin, we need to implement proper
      // polygon offsetting. For now, we use the pad vertices directly.
      // Consider using a polygon offsetting library like polygon-offset or
      // implementing offset using @flatten-js/core buffer operations
      project.children.push(
        createLayerShapePath({
          cutIndex: soldermaskCutSetting.index,
          pathData: pad,
          layer: padLayer,
          isClosed: true,
          ctx,
        }),
      )
    }
  }
}
