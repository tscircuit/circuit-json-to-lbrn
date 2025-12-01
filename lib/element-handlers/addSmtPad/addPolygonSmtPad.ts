import type { PcbSmtPadPolygon } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createPolygonPathFromOutline } from "../../helpers/polygonShape"
import { pathToPolygon } from "../../helpers/pathToPolygon"
import { polygonToShapePathData } from "../../polygon-to-shape-path"

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
    soldermaskMargin,
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
      // TODO: For polygon pads with soldermask margin, we need to implement proper
      // polygon offsetting. For now, we use the pad vertices directly.
      // Consider using a polygon offsetting library like polygon-offset or
      // implementing offset using @flatten-js/core buffer operations
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
