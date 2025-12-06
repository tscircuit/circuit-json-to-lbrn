import type { PcbSmtPadPill } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPillPath } from "../../helpers/pillShape"
import { pathToPolygon } from "../../helpers/pathToPolygon"

export const addPillSmtPad = (
  smtPad: PcbSmtPadPill,
  ctx: ConvertContext,
): void => {
  const {
    project,
    topCopperCutSetting,
    bottomCopperCutSetting,
    soldermaskCutSetting,
    topCutNetGeoms,
    bottomCutNetGeoms,
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
  const netGeoms = padLayer === "top" ? topCutNetGeoms : bottomCutNetGeoms

  const centerX = smtPad.x + origin.x
  const centerY = smtPad.y + origin.y

  if (smtPad.width > 0 && smtPad.height > 0) {
    const outer = createPillPath({
      centerX,
      centerY,
      width: smtPad.width,
      height: smtPad.height,
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
      const smOuter = createPillPath({
        centerX,
        centerY,
        width: smWidth,
        height: smHeight,
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
