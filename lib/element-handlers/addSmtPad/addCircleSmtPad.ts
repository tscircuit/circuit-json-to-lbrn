import type { PcbSmtPadCircle } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createCirclePath } from "../../helpers/circleShape"
import { Circle, Polygon, point } from "@flatten-js/core"
import { circleToPolygon } from "../addPcbTrace/circle-to-polygon"

export const addCircleSmtPad = (
  smtPad: PcbSmtPadCircle,
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
  const centerX = smtPad.x + origin.x
  const centerY = smtPad.y + origin.y

  if (smtPad.radius > 0) {
    const outerRadius = smtPad.radius

    // Add to netGeoms for copper (will be merged with traces)
    if (includeCopper) {
      const netId = connMap.getNetConnectedToId(smtPad.pcb_smtpad_id)
      const circle = new Circle(point(centerX, centerY), outerRadius)
      const polygon = circleToPolygon(circle)

      if (netId) {
        // Add to netGeoms to be merged with other elements on the same net
        ctx.netGeoms.get(netId)?.push(polygon)
      } else {
        // No net connection - draw directly
        const outer = createCirclePath(centerX, centerY, outerRadius)
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
      const outer = createCirclePath(centerX, centerY, outerRadius)
      project.children.push(
        new ShapePath({
          cutIndex: soldermaskCutSetting.index,
          verts: outer.verts,
          prims: outer.prims,
          isClosed: true,
        }),
      )
    }
  }
}
