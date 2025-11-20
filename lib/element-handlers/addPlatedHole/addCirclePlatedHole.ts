import type { PcbPlatedHoleCircle } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"

export const addCirclePlatedHole = (
  platedHole: PcbPlatedHoleCircle,
  ctx: ConvertContext,
): void => {
  const { project, copperCutSetting } = ctx

  // Create a circle path using the outer diameter
  const radius = platedHole.outer_diameter / 2
  const centerX = platedHole.x
  const centerY = platedHole.y

  // Create circle using 4 bezier curves (standard circle approximation)
  // The control point offset for a circle is approximately 0.5522847498 * radius
  const kappa = 0.5522847498
  const controlOffset = radius * kappa

  // Create vertices for a circle starting from the right point (3 o'clock)
  const verts = [
    // Right point (3 o'clock)
    { x: centerX + radius, y: centerY },
    // Bottom point (6 o'clock) with control points
    {
      x: centerX,
      y: centerY + radius,
      c: 1,
      c0x: radius,
      c0y: controlOffset,
      c1x: controlOffset,
      c1y: radius,
    },
    // Left point (9 o'clock) with control points
    {
      x: centerX - radius,
      y: centerY,
      c: 1,
      c0x: -controlOffset,
      c0y: radius,
      c1x: -radius,
      c1y: controlOffset,
    },
    // Top point (12 o'clock) with control points
    {
      x: centerX,
      y: centerY - radius,
      c: 1,
      c0x: -radius,
      c0y: -controlOffset,
      c1x: -controlOffset,
      c1y: -radius,
    },
    // Back to right point (close path) with control points
    {
      x: centerX + radius,
      y: centerY,
      c: 1,
      c0x: controlOffset,
      c0y: -radius,
      c1x: radius,
      c1y: -controlOffset,
    },
  ]

  // Create primitives (all bezier curves)
  const prims = [
    { type: 1 }, // BezierTo for bottom
    { type: 1 }, // BezierTo for left
    { type: 1 }, // BezierTo for top
    { type: 1 }, // BezierTo for right (closing)
  ]

  project.children.push(
    new ShapePath({
      cutIndex: copperCutSetting.index,
      verts,
      prims,
      isClosed: true,
    }),
  )
}
