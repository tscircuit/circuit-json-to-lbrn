import { Box } from "@flatten-js/core"
import type { ConvertContext } from "../../ConvertContext"
import type { PcbSmtPadRect } from "circuit-json"
import { ShapePath } from "lbrnts"

export const addRectSmtPad = (smtPad: PcbSmtPadRect, ctx: ConvertContext) => {
  const {
    project,
    topCopperCutSetting,
    bottomCopperCutSetting,
    soldermaskCutSetting,
    connMap,
    topNetGeoms,
    bottomNetGeoms,
    origin,
    includeCopper,
    includeSoldermask,
    soldermaskMargin,
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

  const netId = connMap.getNetConnectedToId(smtPad.pcb_smtpad_id)

  // Select the correct cut setting and net geoms based on layer
  const copperCutSetting =
    padLayer === "top" ? topCopperCutSetting : bottomCopperCutSetting
  const netGeoms = padLayer === "top" ? topNetGeoms : bottomNetGeoms

  // Only add to netGeoms if drawing copper
  if (includeCopper) {
    if (netId) {
      // Add to netGeoms to be merged with other elements on the same net
      netGeoms
        .get(netId)
        ?.push(
          new Box(
            centerX - halfWidth,
            centerY - halfHeight,
            centerX + halfWidth,
            centerY + halfHeight,
          ),
        )
    } else {
      // No net connection - draw directly
      const verts = [
        { x: centerX - halfWidth, y: centerY - halfHeight },
        { x: centerX + halfWidth, y: centerY - halfHeight },
        { x: centerX + halfWidth, y: centerY + halfHeight },
        { x: centerX - halfWidth, y: centerY + halfHeight },
        { x: centerX - halfWidth, y: centerY - halfHeight }, // Close the path
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
          cutIndex: copperCutSetting.index,
          verts,
          prims,
          isClosed: true,
        }),
      )
    }
  }

  // Add soldermask opening if drawing soldermask
  if (includeSoldermask) {
    const smHalfWidth = halfWidth + soldermaskMargin
    const smHalfHeight = halfHeight + soldermaskMargin

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
