import { Polygon, Box, BooleanOperations } from "@flatten-js/core"
import type { ConvertContext } from "./ConvertContext"
import { polygonToShapePathData } from "./polygon-to-shape-path"
import { ShapePath } from "lbrnts"

/**
 * Creates copper fill shapes for a given layer.
 * Computes the area to ablate by subtracting each copper geometry individually
 * from the expanded copper geometries, then clips the result to the board outline.
 * This ensures ablation only occurs in empty areas within the board boundaries,
 * creating proper clearance zones without ablating over adjacent copper features
 * (pads/traces) from other nets or outside the board.
 *
 * IMPORTANT: We do NOT union allCopperGeoms before subtracting. Instead, we
 * subtract each geometry individually to avoid boolean operation issues.
 */
export const createCopperFillForLayer = ({
  layer,
  ctx,
}: {
  layer: "top" | "bottom"
  ctx: ConvertContext
}) => {
  const {
    project,
    connMap,
    topCopperFillNetGeoms,
    bottomCopperFillNetGeoms,
    topCopperFillCutSetting,
    bottomCopperFillCutSetting,
    topAllCopperGeoms,
    bottomAllCopperGeoms,
    boardOutline,
  } = ctx

  // Get the appropriate cut setting for this layer
  const cutSetting =
    layer === "top" ? topCopperFillCutSetting : bottomCopperFillCutSetting

  if (!cutSetting) {
    return
  }

  // Get the appropriate geometry arrays
  // allCopperGeoms = ALL copper geometries on this layer (source of truth)
  // outerGeomMap = FILL geometries (expanded copper outlines)
  const allCopperGeoms =
    layer === "top" ? topAllCopperGeoms : bottomAllCopperGeoms
  const outerGeomMap =
    layer === "top" ? topCopperFillNetGeoms : bottomCopperFillNetGeoms

  // If there's no copper on this layer, nothing to do
  if (allCopperGeoms.length === 0) {
    return
  }

  // Process each net's expanded copper
  for (const net of Object.keys(connMap.netMap)) {
    const outerGeoms = outerGeomMap.get(net)

    if (!outerGeoms || outerGeoms.length === 0) {
      continue
    }

    try {
      // Union outer geometries (expanded copper outlines for this net)
      let copperFillArea: Polygon | null = null
      for (const geom of outerGeoms) {
        try {
          const polygon = geom instanceof Box ? new Polygon(geom) : geom
          if (copperFillArea === null) {
            copperFillArea = polygon
          } else {
            copperFillArea = BooleanOperations.unify(copperFillArea, polygon)
          }
        } catch {
          // Skip this geometry if union fails, continue with what we have
        }
      }

      if (copperFillArea === null) {
        continue
      }

      // Subtract each copper geometry individually from the expanded area
      // IMPORTANT: Do NOT union allCopperGeoms first - subtract each one separately
      for (const geom of allCopperGeoms) {
        try {
          const polygon = geom instanceof Box ? new Polygon(geom) : geom
          copperFillArea = BooleanOperations.subtract(copperFillArea, polygon)
        } catch {
          // Skip this geometry if subtraction fails, continue with what we have
        }
      }

      // Clip the copper fill area to the board outline if available
      // This ensures we don't ablate outside the board boundaries
      if (boardOutline) {
        copperFillArea = BooleanOperations.intersect(
          copperFillArea,
          boardOutline,
        )
      }

      // Output copper fill area as filled shapes
      for (const island of copperFillArea.splitToIslands()) {
        const { verts, prims } = polygonToShapePathData(island)

        project.children.push(
          new ShapePath({
            cutIndex: cutSetting.index,
            verts,
            prims,
            isClosed: true, // Filled shapes should be closed
          }),
        )
      }
    } catch (error) {
      console.warn(
        `Failed to create copper fill for net ${net} on ${layer} layer:`,
        error,
      )
      // Skip this net's copper fill if we can't compute it
    }
  }
}
