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
      // Percent margin is additive and may be negative.
      // Absolute per-element margin and global adjustment are always applied.
      const elementWidth = 2 * outerRadius
      const elementHeight = 2 * outerRadius
      const percentMarginX = (solderMaskMarginPercent / 100) * elementWidth
      const percentMarginY = (solderMaskMarginPercent / 100) * elementHeight
      const totalMarginX = Math.max(
        globalCopperSoldermaskMarginAdjustment +
          (smtPad.soldermask_margin ?? 0) +
          percentMarginX,
        -elementWidth / 2,
      )
      const totalMarginY = Math.max(
        globalCopperSoldermaskMarginAdjustment +
          (smtPad.soldermask_margin ?? 0) +
          percentMarginY,
        -elementHeight / 2,
      )
      // Since symmetric, use totalMarginX (same as totalMarginY)
      const smRadius = outerRadius + totalMarginX
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
