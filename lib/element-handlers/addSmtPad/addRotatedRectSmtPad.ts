import type { PcbSmtPadRotatedRect } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createRoundedRectPath } from "../../helpers/roundedRectShape"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"

export const addRotatedRectSmtPad = (
  smtPad: PcbSmtPadRotatedRect,
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
  const rotation = (smtPad.ccw_rotation ?? 0) * (Math.PI / 180)
  const borderRadius = smtPad.rect_border_radius ?? 0

  if (smtPad.width > 0 && smtPad.height > 0) {
    const outer = createRoundedRectPath({
      centerX,
      centerY,
      width: smtPad.width,
      height: smtPad.height,
      borderRadius,
      segments: 4,
      rotation,
    })

    // Add to copper geometry (will be merged with traces if connected)
    if (includeCopper) {
      addCopperGeometryToNetOrProject({
        geometryId: smtPad.pcb_smtpad_id,
        path: outer,
        layer: padLayer,
        ctx,
      })
    }

    // Add soldermask opening if drawing soldermask
    if (includeSoldermask) {
      // Percent margin is additive and may be negative.
      // Absolute per-element margin and global adjustment are always applied.
      const percentMarginX = (solderMaskMarginPercent / 100) * smtPad.width
      const percentMarginY = (solderMaskMarginPercent / 100) * smtPad.height
      const totalMarginX = Math.max(
        globalCopperSoldermaskMarginAdjustment +
          (smtPad.soldermask_margin ?? 0) +
          percentMarginX,
        -smtPad.width / 2,
      )
      const totalMarginY = Math.max(
        globalCopperSoldermaskMarginAdjustment +
          (smtPad.soldermask_margin ?? 0) +
          percentMarginY,
        -smtPad.height / 2,
      )
      const smWidth = smtPad.width + 2 * totalMarginX
      const smHeight = smtPad.height + 2 * totalMarginY
      const smOuter = createRoundedRectPath({
        centerX,
        centerY,
        width: smWidth,
        height: smHeight,
        borderRadius,
        segments: 4,
        rotation,
      })

      project.children.push(
        new ShapePath({
          cutIndex: soldermaskCutSetting.index,
          verts: smOuter.verts,
          prims: smOuter.prims,
          isClosed: true,
        }),
      )
    }
  }
}
