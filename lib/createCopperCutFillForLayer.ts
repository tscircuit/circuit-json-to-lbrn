import { Polygon, Box, Point } from "@flatten-js/core"
import type { ConvertContext } from "./ConvertContext"
import { polygonToShapePathData } from "./polygon-to-shape-path"
import { ShapePath, ShapeGroup } from "lbrnts"

// Lazy-load the manifold WASM module
// Use dynamic import with computed string to prevent bundler from analyzing the import
// This allows the browser build to succeed - the feature will fail gracefully at runtime
let manifoldInstance: any = null

const getManifold = async () => {
  if (!manifoldInstance) {
    // Use computed module name to prevent bundler from tracing the import
    const moduleName = "manifold-3d"
    const ManifoldModule = (await import(/* @vite-ignore */ moduleName)).default
    manifoldInstance = await ManifoldModule()
    manifoldInstance.setup() // Initialize the JS-friendly API
  }
  return manifoldInstance
}

type Contour = Array<[number, number]>

/**
 * Calculates the signed area of a contour.
 * Positive area = counter-clockwise winding (outer boundary)
 * Negative area = clockwise winding (hole)
 */
const getSignedArea = (contour: Contour): number => {
  let area = 0
  const n = contour.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += contour[i]![0] * contour[j]![1]
    area -= contour[j]![0] * contour[i]![1]
  }
  return area / 2
}

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
 * Creates copper cut fill for a given layer using manifold3d CrossSection for offset operations.
 *
 * The algorithm:
 * 1. Collect all copper geometries for the layer (traces, pads, vias, plated holes)
 * 2. Union all copper geometries into a single CrossSection (the "inside")
 * 3. Offset (expand) the unified copper outward by copperCutFillMargin (the "outer boundary")
 * 4. Subtract the inside (original copper) from the outer boundary (expanded copper)
 * 5. The result is the ring/band area around copper that needs to be lasered to remove more copper
 *
 * This creates a laser cut path that removes copper around traces and pads but never
 * cuts into the traces or pads themselves.
 */
export const createCopperCutFillForLayer = async ({
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
    topCopperCutFillCutSetting,
    bottomCopperCutFillCutSetting,
    copperCutFillMargin,
  } = ctx

  // Get the appropriate cut setting for this layer
  const cutSetting =
    layer === "top" ? topCopperCutFillCutSetting : bottomCopperCutFillCutSetting

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

    // Create a unified CrossSection from all copper contours (the "inside")
    // The constructor performs a boolean union with Positive fill rule
    const copperInside = new CrossSection(allContours, "Positive")

    // Offset (expand) the copper outward by the margin to get the "outer boundary"
    // Positive delta expands outward
    const outerBoundary = copperInside.offset(
      copperCutFillMargin,
      "Round", // joinType for smooth corners
      2.0, // miterLimit
      32, // circularSegments for round corners
    )

    // Subtract the inside (original copper) from the outer boundary (expanded copper)
    // This gives us the ring/band area to laser cut
    const cutFillArea = outerBoundary.subtract(copperInside)

    // Simplify to clean up any spurious tiny segments
    const simplifiedArea = cutFillArea.simplify(0.001)

    // Get the resulting contours
    const resultContours: Contour[] = simplifiedArea.toPolygons()

    if (resultContours.length === 0) {
      // Clean up WASM memory
      copperInside.delete()
      outerBoundary.delete()
      cutFillArea.delete()
      simplifiedArea.delete()
      return
    }

    // Create a ShapeGroup to hold all contours
    // LightBurn uses nonzero winding rule: CCW (positive area) = outer boundary, CW (negative area) = hole
    // By grouping all contours together, LightBurn should properly fill only the ring area
    const shapeGroup = new ShapeGroup()

    // Convert all contours to ShapePaths and add to the group
    // Preserve winding order: positive area (CCW) = outer boundary, negative area (CW) = hole
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
    copperInside.delete()
    outerBoundary.delete()
    cutFillArea.delete()
    simplifiedArea.delete()
  } catch (error) {
    console.warn(`Failed to create copper cut fill for ${layer} layer:`, error)
  }
}
