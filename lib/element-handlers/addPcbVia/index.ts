import type { PcbVia } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createCirclePath } from "../../helpers/circleShape"
import { addCopperGeometryToNetOrProject } from "../../helpers/addCopperGeometryToNetOrProject"

export const addPcbVia = (via: PcbVia, ctx: ConvertContext): void => {
  const {
    db,
    project,
    soldermaskCutSetting,
    throughBoardCutSetting,
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

  // Add outer circle (copper annulus) if drawing copper
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
    const outerPath = createCirclePath({
      centerX,
      centerY,
      radius: outerRadius,
    })

    // Use the helper for both layers (vias go through board)
    // Pass the resolved netId as override since via uses pcb_trace_id for net lookup
    if (includeLayers.includes("top")) {
      addCopperGeometryToNetOrProject({
        geometryId: via.pcb_via_id,
        path: outerPath,
        layer: "top",
        ctx,
        overrideNetId: netId,
      })
    }
    if (includeLayers.includes("bottom")) {
      addCopperGeometryToNetOrProject({
        geometryId: via.pcb_via_id,
        path: outerPath,
        layer: "bottom",
        ctx,
        overrideNetId: netId,
      })
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
