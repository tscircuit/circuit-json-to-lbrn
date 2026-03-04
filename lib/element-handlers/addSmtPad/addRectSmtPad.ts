import { Box } from "@flatten-js/core"
import type { ConvertContext } from "../../ConvertContext"
import type { PcbSmtPadRect } from "circuit-json"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"
import { createLayerShapePath } from "../../helpers/createLayerShapePath"

export const addRectSmtPad = (smtPad: PcbSmtPadRect, ctx: ConvertContext) => {
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
  const halfWidth = smtPad.width / 2
  const halfHeight = smtPad.height / 2
  const soldermaskCutSetting =
    padLayer === "top" ? topSoldermaskCutSetting : bottomSoldermaskCutSetting

  // Only add to netGeoms if drawing copper
  if (includeCopper) {
    const path = {
      verts: [
        { x: centerX - halfWidth, y: centerY - halfHeight },
        { x: centerX + halfWidth, y: centerY - halfHeight },
        { x: centerX + halfWidth, y: centerY + halfHeight },
        { x: centerX - halfWidth, y: centerY + halfHeight },
        { x: centerX - halfWidth, y: centerY - halfHeight }, // Close the path
      ],
      prims: [{ type: 0 }, { type: 0 }, { type: 0 }, { type: 0 }, { type: 0 }],
    }

    addCopperGeometryToNetOrProject({
      geometryId: smtPad.pcb_smtpad_id,
      path,
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
    const smHalfWidth = halfWidth + totalMarginX
    const smHalfHeight = halfHeight + totalMarginY

    const verts = [
      { x: centerX - smHalfWidth, y: centerY - smHalfHeight },
      { x: centerX + smHalfWidth, y: centerY - smHalfHeight },
      { x: centerX + smHalfWidth, y: centerY + smHalfHeight },
      { x: centerX - smHalfWidth, y: centerY + smHalfHeight },
      { x: centerX - smHalfWidth, y: centerY - smHalfHeight }, // Close the path
    ]

    const prims = [
      { type: 0 },
      { type: 0 },
      { type: 0 },
      { type: 0 },
      { type: 0 },
    ]
    project.children.push(
      createLayerShapePath({
        cutIndex: soldermaskCutSetting.index,
        pathData: { verts, prims },
        layer: padLayer,
        isClosed: true,
        ctx,
      }),
    )
  }
}
