import { Polygon, Box, BooleanOperations } from "@flatten-js/core"
import type { ConvertContext } from "./ConvertContext"
import { polygonToShapePathData } from "./polygon-to-shape-path"
import { ShapePath } from "lbrnts"

/**
 * Generates trace clearance areas for a given layer
 * Computes the area between inner (normal) and outer (with traceMargin) trace geometries
 * and outputs them as filled shapes with crosshatch pattern for laser ablation
 */
export const generateTraceClearanceAreas = ({
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
    topMarginNetGeoms,
    bottomMarginNetGeoms,
    topTraceMarginCutSetting,
    bottomTraceMarginCutSetting,
  } = ctx

  // Get the appropriate cut setting for this layer
  const cutSetting =
    layer === "top" ? topTraceMarginCutSetting : bottomTraceMarginCutSetting

  if (!cutSetting) {
    return
  }

  // Get the appropriate geometry maps
  const innerGeomMap = layer === "top" ? topNetGeoms : bottomNetGeoms
  const outerGeomMap =
    layer === "top" ? topMarginNetGeoms : bottomMarginNetGeoms

  // Process each net
  for (const net of Object.keys(connMap.netMap)) {
    const innerGeoms = innerGeomMap.get(net)!
    const outerGeoms = outerGeomMap.get(net)!

    if (innerGeoms.length === 0 || outerGeoms.length === 0) {
      continue
    }

    try {
      // Union inner geometries (normal traces)
      let innerUnion = innerGeoms[0]!
      if (innerUnion instanceof Box) {
        innerUnion = new Polygon(innerUnion)
      }
      for (const geom of innerGeoms.slice(1)) {
        if (geom instanceof Polygon) {
          innerUnion = BooleanOperations.unify(innerUnion, geom)
        } else if (geom instanceof Box) {
          innerUnion = BooleanOperations.unify(innerUnion, new Polygon(geom))
        }
      }

      // Union outer geometries (traces with traceMargin)
      let outerUnion = outerGeoms[0]!
      if (outerUnion instanceof Box) {
        outerUnion = new Polygon(outerUnion)
      }
      for (const geom of outerGeoms.slice(1)) {
        if (geom instanceof Polygon) {
          outerUnion = BooleanOperations.unify(outerUnion, geom)
        } else if (geom instanceof Box) {
          outerUnion = BooleanOperations.unify(outerUnion, new Polygon(geom))
        }
      }

      // Calculate clearance area (outer - inner)
      const clearanceArea = BooleanOperations.subtract(outerUnion, innerUnion)

      // Output clearance area as filled shapes
      for (const island of clearanceArea.splitToIslands()) {
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
        `Failed to generate trace clearance area for net ${net} on ${layer} layer:`,
        error,
      )
      // Skip this net's clearance if we can't compute it
    }
  }
}
