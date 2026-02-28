import { Polygon, Box, Point } from "@flatten-js/core"
import { ShapePath } from "lbrnts"
import type { ConvertContext } from "./ConvertContext"
import { getManifold } from "./getManifold"
import { mirrorPathData } from "./helpers/mirrorPathData"
import { polygonToShapePathData } from "./polygon-to-shape-path"

type Contour = Array<[number, number]>

const signedArea = (contour: Contour): number => {
  let area = 0
  for (let i = 0; i < contour.length; i++) {
    const [x1, y1] = contour[i]!
    const [x2, y2] = contour[(i + 1) % contour.length]!
    area += x1 * y2 - x2 * y1
  }
  return area / 2
}

const normalizeContourToCcw = (contour: Contour): Contour => {
  if (contour.length < 3) return contour
  return signedArea(contour) < 0 ? [...contour].reverse() : contour
}

/**
 * Outputs a polygon as a ShapePath.
 * If the polygon has multiple faces, outputs each face as a separate ShapePath.
 */
const outputPolygon = (
  poly: Polygon,
  cutIndex: number,
  project: ConvertContext["project"],
  layer: "top" | "bottom",
  ctx: ConvertContext,
) => {
  // If polygon has multiple faces, output each face separately
  // This handles the case where boolean union creates touching but non-overlapping regions
  if (poly.faces.size > 1) {
    for (const face of poly.faces) {
      // Create a new polygon from just this face's edges
      const facePoints: Point[] = []
      for (const edge of face) {
        facePoints.push(edge.start)
      }
      if (facePoints.length >= 3) {
        const facePoly = new Polygon(facePoints)
        const { verts, prims } = polygonToShapePathData(facePoly)
        const pathData =
          ctx.mirrorBottomLayer && layer === "bottom"
            ? mirrorPathData({ verts, prims }, ctx)
            : { verts, prims }
        if (verts.length > 0) {
          project.children.push(
            new ShapePath({
              cutIndex,
              verts: pathData.verts,
              prims: pathData.prims,
              isClosed: false,
            }),
          )
        }
      }
    }
    return
  }

  const { verts, prims } = polygonToShapePathData(poly)
  const pathData =
    ctx.mirrorBottomLayer && layer === "bottom"
      ? mirrorPathData({ verts, prims }, ctx)
      : { verts, prims }
  project.children.push(
    new ShapePath({
      cutIndex,
      verts: pathData.verts,
      prims: pathData.prims,
      isClosed: false,
    }),
  )
}

/**
 * Outputs individual geometries as ShapePaths
 */
const outputIndividualGeometries = (
  netGeoms: Array<Polygon | Box>,
  cutIndex: number,
  project: ConvertContext["project"],
  layer: "top" | "bottom",
  ctx: ConvertContext,
) => {
  for (const geom of netGeoms) {
    const poly = geom instanceof Box ? new Polygon(geom) : geom
    outputPolygon(poly, cutIndex, project, layer, ctx)
  }
}

const geometryToContours = (geom: Polygon | Box): Contour[] => {
  if (geom instanceof Box) {
    return [
      [
        [geom.xmin, geom.ymin],
        [geom.xmax, geom.ymin],
        [geom.xmax, geom.ymax],
        [geom.xmin, geom.ymax],
      ],
    ]
  }

  const contours: Contour[] = []
  for (const face of geom.faces) {
    const contour: Contour = []
    for (const edge of face) {
      contour.push([edge.start.x, edge.start.y])
    }
    if (contour.length >= 3) {
      contours.push(contour)
    }
  }
  return contours
}

const contourToPolygon = (contour: Contour): Polygon | null => {
  if (contour.length < 3) return null

  try {
    const polygon = new Polygon(contour.map(([x, y]) => new Point(x, y)))
    return polygon.faces.size > 0 ? polygon : null
  } catch {
    return null
  }
}

/**
 * Creates copper shapes for a given layer by unifying net geometries
 * and converting them to LightBurn ShapePath objects (CUT mode)
 */
export const createCopperShapesForLayer = async ({
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
    topCopperCutSetting,
    bottomCopperCutSetting,
  } = ctx

  const netGeomMap = layer === "top" ? topCutNetGeoms : bottomCutNetGeoms
  const cutSetting =
    layer === "top" ? topCopperCutSetting : bottomCopperCutSetting

  if (!cutSetting) {
    throw new Error(`Cut setting not found for layer ${layer}`)
  }
  const cutIndex = cutSetting.index!

  for (const net of Object.keys(connMap.netMap)) {
    const netGeoms = netGeomMap.get(net)!

    if (netGeoms.length === 0) {
      continue
    }

    try {
      const manifold = await getManifold()
      const { CrossSection } = manifold

      const allContours: Contour[] = []
      for (const geom of netGeoms) {
        const contours = geometryToContours(geom).map(normalizeContourToCcw)
        allContours.push(...contours)
      }

      if (allContours.length === 0) {
        continue
      }

      // Keep NonZero fill rule for union robustness with via/circular geometries.
      // Input contours are normalized to CCW above to avoid winding-related dropouts.
      const crossSection = new CrossSection(allContours, "NonZero")
      const simplified = crossSection.simplify(0.0001)
      const resultContours: Contour[] = simplified.toPolygons()

      crossSection.delete()
      simplified.delete()

      if (resultContours.length === 0) {
        outputIndividualGeometries(netGeoms, cutIndex, project, layer, ctx)
        continue
      }

      let hasOutput = false
      for (const contour of resultContours) {
        const polygon = contourToPolygon(contour)
        if (!polygon) continue
        hasOutput = true
        outputPolygon(polygon, cutIndex, project, layer, ctx)
      }

      if (!hasOutput) {
        outputIndividualGeometries(netGeoms, cutIndex, project, layer, ctx)
      }
    } catch (error) {
      console.warn(
        `Failed to union geometries for net ${net} on ${layer} layer:`,
        error,
      )
      // Output individual geometries if union fails
      outputIndividualGeometries(netGeoms, cutIndex, project, layer, ctx)
    }
  }
}
