import type { PcbSmtPadPolygon } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPolygonPathFromOutline } from "../../helpers/polygonShape"
import { pathToPolygon } from "../../helpers/pathToPolygon"

export const addPolygonSmtPad = (
  smtPad: PcbSmtPadPolygon,
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
  } = ctx

  // Create the polygon pad
  if (smtPad.points.length >= 3) {
    const pad = createPolygonPathFromOutline(smtPad.points, origin.x, origin.y)

    // Add to netGeoms for copper (will be merged with traces)
    if (includeCopper) {
      const netId = connMap.getNetConnectedToId(smtPad.pcb_smtpad_id)
      const polygon = pathToPolygon(pad.verts)

      if (netId) {
        // Add to netGeoms to be merged with other elements on the same net
        ctx.netGeoms.get(netId)?.push(polygon)
      } else {
        // No net connection - draw directly
        project.children.push(
          new ShapePath({
            cutIndex: copperCutSetting.index,
            verts: pad.verts,
            prims: pad.prims,
            isClosed: true,
          }),
        )
      }
    }

    // Add soldermask opening if drawing soldermask
    if (includeSoldermask) {
      project.children.push(
        new ShapePath({
          cutIndex: soldermaskCutSetting.index,
          verts: pad.verts,
          prims: pad.prims,
          isClosed: true,
        }),
      )
    }
  }
}
