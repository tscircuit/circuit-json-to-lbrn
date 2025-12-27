import type { PcbSilkscreenRect } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import { createRoundedRectPath } from "../../helpers/roundedRectShape"

/**
 * Adds a rectangular silkscreen element to the project
 * Silkscreen is typically engraved/cut into the board surface
 */
export const addPcbSilkscreenRect = (
  silkscreen: PcbSilkscreenRect,
  ctx: ConvertContext,
): void => {
  const { project, throughBoardCutSetting, origin, includeLayers } = ctx

  // Check if we should process this layer - only process top and bottom layers
  const layer = silkscreen.layer ?? "top"
  if (layer !== "top" && layer !== "bottom") {
    return // Skip inner layers
  }
  if (!includeLayers.includes(layer)) {
    return
  }

  const centerX = silkscreen.center.x + origin.x
  const centerY = silkscreen.center.y + origin.y

  // Silkscreen rectangles can be filled or stroked
  if (silkscreen.width > 0 && silkscreen.height > 0) {
    if (silkscreen.is_filled) {
      // Filled rectangle - create a closed path
      const rectPath = createRoundedRectPath({
        centerX,
        centerY,
        width: silkscreen.width,
        height: silkscreen.height,
        borderRadius: 0,
      })
      project.children.push(
        new ShapePath({
          cutIndex: throughBoardCutSetting.index,
          verts: rectPath.verts,
          prims: rectPath.prims,
          isClosed: true,
        }),
      )
    } else {
      // Stroked rectangle - create an outline path
      // For stroke, we use the same rectangle path but it will be rendered as an outline
      const rectPath = createRoundedRectPath({
        centerX,
        centerY,
        width: silkscreen.width,
        height: silkscreen.height,
        borderRadius: 0,
      })
      project.children.push(
        new ShapePath({
          cutIndex: throughBoardCutSetting.index,
          verts: rectPath.verts,
          prims: rectPath.prims,
          isClosed: true,
        }),
      )
    }
  }
}
