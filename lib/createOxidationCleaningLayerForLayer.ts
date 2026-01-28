import { Polygon, Point } from "@flatten-js/core"
import type { ConvertContext } from "./ConvertContext"
import { polygonToShapePathData } from "./polygon-to-shape-path"
import { ShapePath, ShapeGroup } from "lbrnts"
import { getManifold } from "./getManifold"

type Contour = Array<[number, number]>

/**
 * Converts a single contour to a flatten-js Polygon
 */
const contourToPolygon = (contour: Contour): Polygon | null => {
  if (contour.length < 3) return null

  const points = contour.map(([x, y]) => new Point(x, y))
  try {
    const polygon = new Polygon(points)
    if (polygon.faces.size > 0) {
      return polygon
    }
  } catch {
    // Skip invalid polygons
  }
  return null
}

/**
 * Creates an oxidation cleaning layer for a given layer.
 *
 * This generates a filled area covering the entire "inside" of the board outline
 * that can be used to laser clean oxidation from the copper surface.
 *
 * The algorithm:
 * 1. Get the board outline contour
 * 2. Optionally inset (shrink) the outline by the margin to leave a border
 * 3. Create SCAN mode shapes that will fill the entire board area
 */
export const createOxidationCleaningLayerForLayer = async ({
  layer,
  ctx,
}: {
  layer: "top" | "bottom"
  ctx: ConvertContext
}): Promise<void> => {
  const { project, boardOutlineContour } = ctx

  // Get the appropriate cut setting for this layer
  const cutSetting =
    layer === "top"
      ? ctx.topOxidationCleaningCutSetting
      : ctx.bottomOxidationCleaningCutSetting

  if (!cutSetting) {
    return
  }

  if (!boardOutlineContour || boardOutlineContour.length < 3) {
    console.warn(
      `Cannot create oxidation cleaning layer for ${layer}: no board outline available`,
    )
    return
  }

  try {
    const manifold = await getManifold()
    const { CrossSection } = manifold

    // Create board outline as CrossSection (the fill area)
    const fillArea = new CrossSection([boardOutlineContour], "Positive")

    // Simplify to clean up any spurious tiny segments
    const simplifiedArea = fillArea.simplify(0.001)

    // Get the resulting contours
    const resultContours: Contour[] = simplifiedArea.toPolygons()

    if (resultContours.length === 0) {
      fillArea.delete()
      simplifiedArea.delete()
      return
    }

    // Create a ShapeGroup to hold all contours
    const shapeGroup = new ShapeGroup()

    for (const contour of resultContours) {
      const polygon = contourToPolygon(contour)
      if (!polygon) continue

      for (const island of polygon.splitToIslands()) {
        const { verts, prims } = polygonToShapePathData(island)

        if (verts.length > 0) {
          shapeGroup.children.push(
            new ShapePath({
              cutIndex: cutSetting.index,
              verts,
              prims,
              isClosed: true, // Filled shapes should be closed
            }),
          )
        }
      }
    }

    // Add the group to the project if it has shapes
    if (shapeGroup.children.length > 0) {
      project.children.push(shapeGroup)
    }

    // Clean up WASM memory
    fillArea.delete()
    simplifiedArea.delete()
  } catch (error) {
    console.warn(
      `Failed to create oxidation cleaning layer for ${layer} layer:`,
      error,
    )
  }
}
