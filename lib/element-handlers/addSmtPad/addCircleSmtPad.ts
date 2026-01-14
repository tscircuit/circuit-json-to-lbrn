import type { PcbSmtPadCircle } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createCirclePath } from "../../helpers/circleShape"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"

export const addCircleSmtPad = (
  smtPad: PcbSmtPadCircle,
  ctx: ConvertContext,
): void => {
  const {
    project,
    soldermaskCutSetting,
    origin,
    includeCopper,
    includeSoldermask,
    globalCopperSoldermaskMarginAdjustment,
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

  const centerX = smtPad.x + origin.x
  const centerY = smtPad.y + origin.y

  if (smtPad.radius > 0) {
    const outerRadius = smtPad.radius

    // Add to copper geometry (will be merged with traces if connected)
    if (includeCopper) {
      const path = createCirclePath({
        centerX,
        centerY,
        radius: outerRadius,
      })

      addCopperGeometryToNetOrProject({
        geometryId: smtPad.pcb_smtpad_id,
        path,
        layer: padLayer,
        ctx,
      })
    }

    // Add soldermask opening if drawing soldermask
    if (includeSoldermask) {
      const smRadius =
        outerRadius +
        globalCopperSoldermaskMarginAdjustment +
        (smtPad.soldermask_margin ?? 0)
      const outer = createCirclePath({
        centerX,
        centerY,
        radius: smRadius,
      })
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
}
