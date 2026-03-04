import type { PcbSmtPadPill } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { createPillPath } from "../../helpers/pillShape"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"
import { createLayerShapePath } from "../../helpers/createLayerShapePath"

export const addPillSmtPad = (
  smtPad: PcbSmtPadPill,
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

  const centerX = smtPad.x + origin.x
  const centerY = smtPad.y + origin.y
  const soldermaskCutSetting =
    padLayer === "top" ? topSoldermaskCutSetting : bottomSoldermaskCutSetting

  if (smtPad.width > 0 && smtPad.height > 0) {
    const outer = createPillPath({
      centerX,
      centerY,
      width: smtPad.width,
      height: smtPad.height,
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
    if (includeSoldermask && soldermaskCutSetting) {
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
      const smOuter = createPillPath({
        centerX,
        centerY,
        width: smWidth,
        height: smHeight,
      })
      project.children.push(
        createLayerShapePath({
          cutIndex: soldermaskCutSetting.index,
          pathData: smOuter,
          layer: padLayer,
          isClosed: true,
          ctx,
        }),
      )
    }
  }
}
