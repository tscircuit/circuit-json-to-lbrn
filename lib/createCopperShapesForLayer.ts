import { Polygon, Box, BooleanOperations, Point } from "@flatten-js/core"
import { ShapePath } from "lbrnts"
import type { ConvertContext } from "./ConvertContext"
import { polygonToShapePathData } from "./polygon-to-shape-path"

/**
 * Outputs a polygon as a ShapePath.
 * If the polygon has multiple faces, outputs each face as a separate ShapePath.
 */
const outputPolygon = (
  poly: Polygon,
  cutIndex: number,
  project: ConvertContext["project"],
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
        if (verts.length > 0) {
          project.children.push(
            new ShapePath({
              cutIndex,
              verts,
              prims,
              isClosed: false,
            }),
          )
        }
      }
    }
    return
  }

  const { verts, prims } = polygonToShapePathData(poly)
  project.children.push(
    new ShapePath({
      cutIndex,
      verts,
      prims,
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
) => {
  for (const geom of netGeoms) {
    const poly = geom instanceof Box ? new Polygon(geom) : geom
    outputPolygon(poly, cutIndex, project)
  }
}

/**
 * Creates copper shapes for a given layer by unifying net geometries
 * and converting them to LightBurn ShapePath objects (CUT mode)
 */
export const createCopperShapesForLayer = ({
  layer,
  ctx,
}: {
  layer: "top" | "bottom"
  ctx: ConvertContext
}) => {
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

    // If there's only one geometry, output it directly without union
    if (netGeoms.length === 1) {
      const geom = netGeoms[0]!
      const poly = geom instanceof Box ? new Polygon(geom) : geom
      outputPolygon(poly, cutIndex, project)
      continue
    }

    try {
      let union = netGeoms[0]!
      if (union instanceof Box) {
        union = new Polygon(union)
      }

      const failedPolys: Polygon[] = []
      for (const geom of netGeoms.slice(1)) {
        const poly = geom instanceof Polygon ? geom : new Polygon(geom)
        try {
          const nextUnion = BooleanOperations.unify(union, poly)
          // If union produced a degenerate result, keep this geometry separate
          // and continue unifying the rest.
          if (nextUnion.faces.size === 0) {
            failedPolys.push(poly)
            continue
          }
          union = nextUnion
        } catch (_error) {
          // Keep problematic geometry separate instead of dropping the entire net.
          failedPolys.push(poly)
        }
      }

      const islands = union.splitToIslands()
      if (islands.length === 0) {
        // No islands produced - output individual geometries
        outputIndividualGeometries(netGeoms, cutIndex, project)
        continue
      }

      for (const island of islands) {
        outputPolygon(island, cutIndex, project)
      }

      // Output geometries that could not be merged without failing boolean ops.
      for (const failedPoly of failedPolys) {
        outputPolygon(failedPoly, cutIndex, project)
      }
    } catch (error) {
      console.warn(
        `Failed to union geometries for net ${net} on ${layer} layer:`,
        error,
      )
      // Output individual geometries if union fails
      outputIndividualGeometries(netGeoms, cutIndex, project)
    }
  }
}
