import { Polygon, Box, Point } from "@flatten-js/core"
import type { ConvertContext } from "./ConvertContext"
import { polygonToShapePathData } from "./polygon-to-shape-path"
import { ShapePath } from "lbrnts"
import ManifoldModule from "manifold-3d"

// Lazy-load the manifold WASM module
let manifoldInstance: Awaited<ReturnType<typeof ManifoldModule>> | null = null

const getManifold = async () => {
  if (!manifoldInstance) {
    manifoldInstance = await ManifoldModule()
    manifoldInstance.setup() // Initialize the JS-friendly API
  }
  return manifoldInstance
}

type Contour = Array<[number, number]>

/**
 * Converts a flatten-js Polygon to an array of contours for manifold CrossSection
 * Each contour is an array of [x, y] coordinates
 */
const polygonToContours = (polygon: Polygon | Box): Contour[] => {
  const contours: Contour[] = []

  if (polygon instanceof Box) {
    // Convert Box to contour
    const { xmin, ymin, xmax, ymax } = polygon
    contours.push([
      [xmin, ymin],
      [xmax, ymin],
      [xmax, ymax],
      [xmin, ymax],
    ])
  } else {
    // Handle Polygon faces
    for (const face of polygon.faces) {
      const contour: Contour = []
      for (const edge of face) {
        contour.push([edge.start.x, edge.start.y])
      }
      if (contour.length >= 3) {
        contours.push(contour)
      }
    }
  }

  return contours
}

/**
 * Converts manifold CrossSection polygons back to flatten-js Polygons
 */
const crossSectionToPolygons = (contours: Contour[]): Polygon[] => {
  const polygons: Polygon[] = []

  for (const contour of contours) {
    if (contour.length >= 3) {
      const points = contour.map(([x, y]) => new Point(x, y))
      try {
        const polygon = new Polygon(points)
        if (polygon.faces.size > 0) {
          polygons.push(polygon)
        }
      } catch {
        // Skip invalid polygons
      }
    }
  }

  return polygons
}

/**
 * Creates copper fill for a given layer using manifold3d CrossSection for offset operations.
 *
 * The algorithm:
 * 1. Collect all copper geometries for the layer (traces, pads, vias)
 * 2. Union all copper geometries into a single CrossSection
 * 3. Offset (expand) the unified copper by copperFillMargin
 * 4. Subtract the original copper from the expanded copper
 * 5. The result is the "ring" area around copper that needs to be lasered
 *
 * This ensures that the fill cuts copper around traces and pads but never
 * cuts the pads or traces themselves.
 */
export const createCopperFillForLayer = async ({
  layer,
  ctx,
}: {
  layer: "top" | "bottom"
  ctx: ConvertContext
}): Promise<void> => {
  const {
    project,
    connMap,
    topCutNetGeoms,
    bottomCutNetGeoms,
    topCopperFillCutSetting,
    bottomCopperFillCutSetting,
    copperFillMargin,
  } = ctx

  // Get the appropriate cut setting for this layer
  const cutSetting =
    layer === "top" ? topCopperFillCutSetting : bottomCopperFillCutSetting

  if (!cutSetting) {
    return
  }

  // Get the appropriate geometry map
  const netGeomMap = layer === "top" ? topCutNetGeoms : bottomCutNetGeoms

  // Collect all geometries for this layer across all nets
  const allGeoms: Array<Polygon | Box> = []
  for (const net of Object.keys(connMap.netMap)) {
    const netGeoms = netGeomMap.get(net)
    if (netGeoms && netGeoms.length > 0) {
      allGeoms.push(...netGeoms)
    }
  }

  if (allGeoms.length === 0) {
    return
  }

  try {
    // Initialize manifold
    const manifold = await getManifold()
    const { CrossSection } = manifold

    // Collect all contours from all geometries
    const allContours: Contour[] = []
    for (const geom of allGeoms) {
      const contours = polygonToContours(geom)
      allContours.push(...contours)
    }

    if (allContours.length === 0) {
      return
    }

    // Create a unified CrossSection from all copper contours
    // The constructor performs a boolean union with Positive fill rule
    const copperSection = new CrossSection(allContours, "Positive")

    // Offset (expand) the copper by the fill margin
    // Positive delta expands outward
    const expandedSection = copperSection.offset(
      copperFillMargin,
      "Round", // joinType
      2.0, // miterLimit
      32, // circularSegments
    )

    // Subtract the original copper from the expanded copper
    // This gives us the "ring" area around the copper features
    const fillSection = expandedSection.subtract(copperSection)

    // Simplify to clean up any spurious tiny segments
    const simplifiedSection = fillSection.simplify(0.001)

    // Get the resulting polygons
    const resultContours = simplifiedSection.toPolygons()

    // Convert to flatten-js Polygons and output as ShapePaths
    const resultPolygons = crossSectionToPolygons(resultContours)

    for (const polygon of resultPolygons) {
      for (const island of polygon.splitToIslands()) {
        const { verts, prims } = polygonToShapePathData(island)

        if (verts.length > 0) {
          project.children.push(
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

    // Clean up WASM memory
    copperSection.delete()
    expandedSection.delete()
    fillSection.delete()
    simplifiedSection.delete()
  } catch (error) {
    console.warn(`Failed to create copper fill for ${layer} layer:`, error)
  }
}
