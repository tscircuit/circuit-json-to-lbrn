import type { PcbSmtPadRotatedRect } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createRoundedRectPath } from "../../helpers/roundedRectShape"
import { pathToPolygon } from "../../helpers/pathToPolygon"

export const addRotatedRectSmtPad = (
  smtPad: PcbSmtPadRotatedRect,
  ctx: ConvertContext,
): void => {
  const {
    project,
    topCopperCutSetting,
    bottomCopperCutSetting,
    soldermaskCutSetting,
    topNetGeoms,
    bottomNetGeoms,
    origin,
    includeCopper,
    includeSoldermask,
    connMap,
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

  // Select the correct cut setting and net geoms based on layer
  const copperCutSetting =
    padLayer === "top" ? topCopperCutSetting : bottomCopperCutSetting
  const netGeoms = padLayer === "top" ? topNetGeoms : bottomNetGeoms

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

    // Add to netGeoms for copper (will be merged with traces)
    if (includeCopper) {
      const netId = connMap.getNetConnectedToId(smtPad.pcb_smtpad_id)
      const polygon = pathToPolygon(outer.verts)

      if (netId) {
        // Add to netGeoms to be merged with other elements on the same net
        netGeoms.get(netId)?.push(polygon)
      } else {
        // No net connection - draw directly
        project.children.push(
          new ShapePath({
            cutIndex: copperCutSetting.index,
            verts: outer.verts,
            prims: outer.prims,
            isClosed: true,
          }),
        )
      }
    }

    // Add soldermask opening if drawing soldermask
    if (includeSoldermask) {
      const smWidth = smtPad.width + 2 * soldermaskMargin
      const smHeight = smtPad.height + 2 * soldermaskMargin
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
