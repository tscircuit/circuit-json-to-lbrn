import { Polygon, Box, BooleanOperations } from "@flatten-js/core"
import { ShapePath } from "lbrnts"
import type { ConvertContext } from "./ConvertContext"
import { polygonToShapePathData } from "./polygon-to-shape-path"

/**
 * Outputs copper shapes for a given layer by unifying net geometries
 * and converting them to LightBurn ShapePath objects
 */
export const outputCopperShapes = ({
  layer,
  ctx,
}: {
  layer: "top" | "bottom"
  ctx: ConvertContext
}) => {
  const {
    project,
    connMap,
    topNetGeoms,
    bottomNetGeoms,
    topCopperCutSetting,
    bottomCopperCutSetting,
  } = ctx

  const netGeomMap = layer === "top" ? topNetGeoms : bottomNetGeoms
  const cutSetting =
    layer === "top" ? topCopperCutSetting : bottomCopperCutSetting

  for (const net of Object.keys(connMap.netMap)) {
    const netGeoms = netGeomMap.get(net)!

    if (netGeoms.length === 0) {
      continue
    }

    try {
      let union = netGeoms[0]!
      if (union instanceof Box) {
        union = new Polygon(union)
      }
      for (const geom of netGeoms.slice(1)) {
        if (geom instanceof Polygon) {
          union = BooleanOperations.unify(union, geom)
        } else if (geom instanceof Box) {
          union = BooleanOperations.unify(union, new Polygon(geom))
        }
      }

      for (const island of union.splitToIslands()) {
        const { verts, prims } = polygonToShapePathData(island)

        project.children.push(
          new ShapePath({
            cutIndex: cutSetting.index,
            verts,
            prims,
            isClosed: false,
          }),
        )
      }
    } catch (error) {
      console.warn(
        `Failed to union geometries for net ${net} on ${layer} layer:`,
        error,
      )
      // Output individual geometries if union fails
      for (const geom of netGeoms) {
        const poly = geom instanceof Box ? new Polygon(geom) : geom
        const { verts, prims } = polygonToShapePathData(poly)
        project.children.push(
          new ShapePath({
            cutIndex: cutSetting.index,
            verts,
            prims,
            isClosed: false,
          }),
        )
      }
    }
  }
}
