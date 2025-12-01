import type { PcbSmtPadRotatedPill } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPillPath } from "../../helpers/pillShape"
import { pathToPolygon } from "../../helpers/pathToPolygon"

export const addRotatedPillSmtPad = (
  smtPad: PcbSmtPadRotatedPill,
  ctx: ConvertContext,
): void => {
  const {
    project,
    copperCutSetting,
    soldermaskCutSetting,
    origin,
    includeCopper,
    includeSoldermask,
    connMap,
    soldermaskMargin,
  } = ctx
  const centerX = smtPad.x + origin.x
  const centerY = smtPad.y + origin.y

  if (smtPad.width > 0 && smtPad.height > 0) {
    const outer = createPillPath(
      centerX,
      centerY,
      smtPad.width,
      smtPad.height,
      (smtPad.ccw_rotation ?? 0) * (Math.PI / 180),
    )

    // Add to netGeoms for copper (will be merged with traces)
    if (includeCopper) {
      const netId = connMap.getNetConnectedToId(smtPad.pcb_smtpad_id)
      const polygon = pathToPolygon(outer.verts)

      if (netId) {
        // Add to netGeoms to be merged with other elements on the same net
        ctx.netGeoms.get(netId)?.push(polygon)
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
      const smOuter = createPillPath(
        centerX,
        centerY,
        smWidth,
        smHeight,
        (smtPad.ccw_rotation ?? 0) * (Math.PI / 180),
      )

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
