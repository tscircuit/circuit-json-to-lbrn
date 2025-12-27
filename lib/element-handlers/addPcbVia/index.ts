import type { PcbVia } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createCirclePath } from "../../helpers/circleShape"
import { Circle, point } from "@flatten-js/core"
import { circleToPolygon } from "../addPcbTrace/circle-to-polygon"

export const addPcbVia = (via: PcbVia, ctx: ConvertContext): void => {
  const {
    db,
    project,
    topCopperCutSetting,
    bottomCopperCutSetting,
    soldermaskCutSetting,
    throughBoardCutSetting,
    topCutNetGeoms,
    bottomCutNetGeoms,
    origin,
    includeCopper,
    includeSoldermask,
    connMap,
    globalCopperSoldermaskMarginAdjustment,
    includeLayers,
  } = ctx
  const centerX = via.x + origin.x
  const centerY = via.y + origin.y

  // Add outer circle (copper annulus) if drawing copper - add to netGeoms for merging
  // Vias go through all layers, so add to both top and bottom
  if (via.outer_diameter > 0 && includeCopper) {
    // Find the pcb_port associated with this via (vias don't have pcb_port_id property)
    // We need to find a port at the same location as the via
    const viaPort = db.pcb_port
      .list()
      .find((port) => port.x === via.x && port.y === via.y)

    const netId = viaPort
      ? connMap.getNetConnectedToId(viaPort.pcb_port_id)
      : undefined

    const outerRadius = via.outer_diameter / 2
    const circle = new Circle(point(centerX, centerY), outerRadius)
    const polygon = circleToPolygon(circle)

    if (netId) {
      // Add to both top and bottom netGeoms since vias go through the board
      if (includeLayers.includes("top")) {
        topCutNetGeoms.get(netId)?.push(polygon.clone())
      }
      if (includeLayers.includes("bottom")) {
        bottomCutNetGeoms.get(netId)?.push(polygon.clone())
      }
    } else {
      // No net connection - draw directly for each included layer
      const outer = createCirclePath({
        centerX,
        centerY,
        radius: outerRadius,
      })
      if (includeLayers.includes("top")) {
        project.children.push(
          new ShapePath({
            cutIndex: topCopperCutSetting.index,
            verts: outer.verts,
            prims: outer.prims,
            isClosed: true,
          }),
        )
      }
      if (includeLayers.includes("bottom")) {
        project.children.push(
          new ShapePath({
            cutIndex: bottomCopperCutSetting.index,
            verts: outer.verts,
            prims: outer.prims,
            isClosed: true,
          }),
        )
      }
    }
  }

  // Add soldermask opening if drawing soldermask
  if (via.outer_diameter > 0 && includeSoldermask) {
    const smRadius =
      via.outer_diameter / 2 + globalCopperSoldermaskMarginAdjustment
    const outer = createCirclePath({
      centerX,
      centerY,
      radius: smRadius,
    })
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
  if (via.hole_diameter > 0 && includeCopper) {
    const innerRadius = via.hole_diameter / 2
    const inner = createCirclePath({
      centerX,
      centerY,
      radius: innerRadius,
    })
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
