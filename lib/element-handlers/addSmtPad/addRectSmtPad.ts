import { Box } from "@flatten-js/core"
import type { ConvertContext } from "../../ConvertContext"
import type { PcbSmtPadRect } from "circuit-json"
import { ShapePath } from "lbrnts"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"

export const addRectSmtPad = (smtPad: PcbSmtPadRect, ctx: ConvertContext) => {
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
  const halfWidth = smtPad.width / 2
  const halfHeight = smtPad.height / 2

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
  if (includeSoldermask) {
    const smHalfWidth =
      halfWidth +
      globalCopperSoldermaskMarginAdjustment +
      (smtPad.soldermask_margin ?? 0)
    const smHalfHeight =
      halfHeight +
      globalCopperSoldermaskMarginAdjustment +
      (smtPad.soldermask_margin ?? 0)

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
      new ShapePath({
        cutIndex: soldermaskCutSetting.index,
        verts,
        prims,
        isClosed: true,
      }),
    )
  }
}
