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
    solderMaskMarginPercent,
    includeLayers,
  } = ctx
  const centerX = via.x + origin.x
  const centerY = via.y + origin.y

  // Add outer circle (copper annulus) if drawing copper - add to netGeoms for merging
  // Vias go through all layers, so add to both top and bottom
  if (via.outer_diameter > 0 && includeCopper) {
    // Find the net for this via using multiple methods:
    // 1. Via's pcb_trace_id (common in routed designs)
    // 2. pcb_port at the same location
    let netId: string | undefined

    // Try pcb_trace_id first (vias created during routing have this)
    if (via.pcb_trace_id) {
      netId = connMap.getNetConnectedToId(via.pcb_trace_id)
    }

    // Fallback: find pcb_port at the via's location
    if (!netId) {
      const viaPort = db.pcb_port
        .list()
        .find((port) => port.x === via.x && port.y === via.y)

      if (viaPort) {
        netId = connMap.getNetConnectedToId(viaPort.pcb_port_id)
      }
    }

    const outerRadius = via.outer_diameter / 2
    const circle = new Circle(point(centerX, centerY), outerRadius)
    const polygon = circleToPolygon(circle)

    if (netId) {
      // Add to netGeoms so it can be unified with traces on the same net
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
    // Percent margin is additive and may be negative.
    // Global adjustment is always applied.
    // Percent margin is applied to full diameter
    const percentMargin = (solderMaskMarginPercent / 100) * via.outer_diameter

    // Total margin is additive
    const totalMargin = globalCopperSoldermaskMarginAdjustment + percentMargin

    // Clamp so radius never goes below zero
    const smRadius = Math.max(via.outer_diameter / 2 + totalMargin, 0)
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
