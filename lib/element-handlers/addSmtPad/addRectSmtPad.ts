import type { ConvertContext } from "../../ConvertContext"
import type { PcbSmtPadRect } from "circuit-json"
import { ShapePath } from "lbrnts"

export const addRectSmtPad = (smtPad: PcbSmtPadRect, ctx: ConvertContext) => {
  const { project, copperCutSetting } = ctx

  const centerX = smtPad.x
  const centerY = smtPad.y
  const halfWidth = smtPad.width / 2
  const halfHeight = smtPad.height / 2

  // Create vertices for rectangle corners (clockwise from top-left)
  const verts = [
    { x: centerX - halfWidth, y: centerY - halfHeight }, // Top-left
    { x: centerX + halfWidth, y: centerY - halfHeight }, // Top-right
    { x: centerX + halfWidth, y: centerY + halfHeight }, // Bottom-right
    { x: centerX - halfWidth, y: centerY + halfHeight }, // Bottom-left
  ]

  // Create primitives (all lines)
  const prims = [
    { type: 0 }, // LineTo for top-right
    { type: 0 }, // LineTo for bottom-right
    { type: 0 }, // LineTo for bottom-left
    { type: 0 }, // LineTo back to top-left (closing)
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
