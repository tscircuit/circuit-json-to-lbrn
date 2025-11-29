import type { PcbPlatedHoleCircle } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createCirclePath } from "../../helpers/circleShape"
import { Circle, point } from "@flatten-js/core"
import { circleToPolygon } from "../addPcbTrace/circle-to-polygon"

export const addCirclePlatedHole = (
  platedHole: PcbPlatedHoleCircle,
  ctx: ConvertContext,
): void => {
  const {
    project,
    copperCutSetting,
    soldermaskCutSetting,
    throughBoardCutSetting,
    origin,
    includeCopper,
    includeSoldermask,
    connMap,
  } = ctx
  const centerX = platedHole.x + origin.x
  const centerY = platedHole.y + origin.y

  // Add outer circle (copper annulus) if drawing copper - add to netGeoms for merging
  if (platedHole.outer_diameter > 0 && includeCopper) {
    const netId = connMap.getNetConnectedToId(platedHole.pcb_plated_hole_id)
    const outerRadius = platedHole.outer_diameter / 2
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
  if (platedHole.outer_diameter > 0 && includeSoldermask) {
    const outerRadius = platedHole.outer_diameter / 2
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

  // Add inner circle (hole) - always cut through the board regardless of mode
  if (platedHole.hole_diameter > 0) {
    const innerRadius = platedHole.hole_diameter / 2
    const inner = createCirclePath(centerX, centerY, innerRadius)
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts: inner.verts,
        prims: inner.prims,
        isClosed: true,
      }),
    )
  }
}
