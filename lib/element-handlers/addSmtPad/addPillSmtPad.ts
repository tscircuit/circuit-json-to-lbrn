import type { PcbSmtPadPill } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPillPath } from "../../helpers/pillShape"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"

export const addPillSmtPad = (
  smtPad: PcbSmtPadPill,
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
    if (includeSoldermask) {
      const smWidth =
        smtPad.width +
        2 * globalCopperSoldermaskMarginAdjustment +
        (smtPad.soldermask_margin ?? 0)
      const smHeight =
        smtPad.height +
        2 * globalCopperSoldermaskMarginAdjustment +
        (smtPad.soldermask_margin ?? 0)
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
