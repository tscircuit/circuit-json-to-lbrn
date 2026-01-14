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
  const centerX = platedHole.x + origin.x
  const centerY = platedHole.y + origin.y

  // Add outer circle (copper annulus) if drawing copper - add to netGeoms for merging
  // Plated holes go through all layers, so add to both top and bottom
  if (platedHole.outer_diameter > 0 && includeCopper) {
    const netId = connMap.getNetConnectedToId(platedHole.pcb_plated_hole_id)
    const outerRadius = platedHole.outer_diameter / 2
    const circle = new Circle(point(centerX, centerY), outerRadius)
    const polygon = circleToPolygon(circle)

    if (netId) {
      // Add to both top and bottom netGeoms since plated holes go through the board
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
  if (platedHole.outer_diameter > 0 && includeSoldermask) {
    // Percent margin is additive and may be negative.
    // Absolute per-element margin and global adjustment are always applied.
    const percentMargin =
      (solderMaskMarginPercent / 100) * platedHole.outer_diameter
    const totalMargin =
      globalCopperSoldermaskMarginAdjustment +
      (platedHole.soldermask_margin ?? 0) +
      percentMargin
    const smRadius = Math.max(platedHole.outer_diameter / 2 + totalMargin, 0)
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

  if (platedHole.hole_diameter > 0 && includeCopper) {
    const innerRadius = platedHole.hole_diameter / 2
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
