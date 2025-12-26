import { Polygon, Box, BooleanOperations } from "@flatten-js/core"
import { ShapePath } from "lbrnts"
import type { ConvertContext } from "./ConvertContext"
import { polygonToShapePathData } from "./polygon-to-shape-path"

/**
 * Outputs a polygon as a ShapePath
 */
const outputPolygon = (
  poly: Polygon,
  cutIndex: number,
  project: ConvertContext["project"],
) => {
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

      let unionFailed = false
      for (const geom of netGeoms.slice(1)) {
        const poly = geom instanceof Polygon ? geom : new Polygon(geom)
        union = BooleanOperations.unify(union, poly)

        // Check if union produced a degenerate result (0 faces means union failed)
        if (union.faces.size === 0) {
          unionFailed = true
          break
        }
      }

      if (unionFailed) {
        // Union produced degenerate result - output individual geometries
        outputIndividualGeometries(netGeoms, cutIndex, project)
        continue
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
