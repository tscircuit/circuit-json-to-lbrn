import type { ConvertContext } from "../ConvertContext"
import { ShapePath } from "lbrnts"
import { pathToPolygon } from "./pathToPolygon"
import { BooleanOperations } from "@flatten-js/core"
import { polygonToShapePathData } from "../polygon-to-shape-path"

/**
 * Expands a path by a given distance.
 * Simply expands each vertex outward from the centroid by the given distance.
 * This is a simple approximation that works well for convex shapes like pads.
 */
export const expandPath = (
  verts: { x: number; y: number }[],
  distance: number,
): { x: number; y: number }[] => {
  if (distance <= 0 || verts.length < 3) return verts

  // Calculate centroid
  let cx = 0
  let cy = 0
  // Exclude the closing vertex if it's the same as the first
  const uniqueVerts =
    verts.length > 1 &&
    verts[0]!.x === verts[verts.length - 1]!.x &&
    verts[0]!.y === verts[verts.length - 1]!.y
      ? verts.slice(0, -1)
      : verts

  for (const v of uniqueVerts) {
    cx += v.x
    cy += v.y
  }
  cx /= uniqueVerts.length
  cy /= uniqueVerts.length

  // Expand each vertex outward from centroid
  const expanded = uniqueVerts.map((v) => {
    const dx = v.x - cx
    const dy = v.y - cy
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return v // Vertex at centroid, can't expand

    // Normalize and scale
    const scale = (len + distance) / len
    return {
      x: cx + dx * scale,
      y: cy + dy * scale,
    }
  })

  // Close the path if original was closed
  if (verts.length > uniqueVerts.length) {
    expanded.push({ ...expanded[0]! })
  }

  return expanded
}

export const addCopperGeometryToNetOrProject = ({
  geometryId,
  path,
  layer,
  ctx,
  overrideNetId,
}: {
  geometryId: string
  path: { verts: { x: number; y: number }[]; prims: Array<{ type: number }> }
  layer: "top" | "bottom"
  ctx: ConvertContext
  /** Optional net ID to use instead of looking up by geometryId */
  overrideNetId?: string
}) => {
  const {
    project,
    connMap,
    topCutNetGeoms,
    bottomCutNetGeoms,
    topCopperFillNetGeoms,
    bottomCopperFillNetGeoms,
    topCopperCutSetting,
    bottomCopperCutSetting,
    includeLayers,
    copperFillExpansion,
  } = ctx

  if (!includeLayers.includes(layer)) return

  // Use override net ID if provided, otherwise look up by geometry ID
  const netId = overrideNetId ?? connMap.getNetConnectedToId(geometryId)
  const cutSetting =
    layer === "top" ? topCopperCutSetting : bottomCopperCutSetting
  const netGeoms = layer === "top" ? topCutNetGeoms : bottomCutNetGeoms
  const copperFillNetGeoms =
    layer === "top" ? topCopperFillNetGeoms : bottomCopperFillNetGeoms

  // Create polygon from path
  const polygon = pathToPolygon(path.verts)

  // Add to global copper geometry list for this layer (used for copper fill subtraction)
  const allCopperGeoms =
    layer === "top" ? ctx.topAllCopperGeoms : ctx.bottomAllCopperGeoms
  allCopperGeoms.push(polygon)

  // Get copper fill cut setting for this layer
  const copperFillCutSetting =
    layer === "top"
      ? ctx.topCopperFillCutSetting
      : ctx.bottomCopperFillCutSetting

  if (netId) {
    // Add to netGeoms for union with other elements on same net
    netGeoms.get(netId)?.push(polygon)

    // Add expanded geometry to copper fill net geoms if enabled
    if (copperFillExpansion > 0) {
      const expandedVerts = expandPath(path.verts, copperFillExpansion)
      const expandedPolygon = pathToPolygon(expandedVerts)
      copperFillNetGeoms.get(netId)?.push(expandedPolygon)
    }
  } else {
    // No net connection - draw directly to project
    project.children.push(
      new ShapePath({
        cutIndex: cutSetting.index,
        verts: path.verts,
        prims: path.prims,
        isClosed: true,
      }),
    )

    // Also add copper fill ring directly if enabled
    if (copperFillExpansion > 0 && copperFillCutSetting) {
      try {
        const expandedVerts = expandPath(path.verts, copperFillExpansion)
        const expandedPolygon = pathToPolygon(expandedVerts)

        // Compute the ring (expanded - inner)
        const ringPolygon = BooleanOperations.subtract(expandedPolygon, polygon)

        // Output each island of the ring
        for (const island of ringPolygon.splitToIslands()) {
          const { verts, prims } = polygonToShapePathData(island)
          project.children.push(
            new ShapePath({
              cutIndex: copperFillCutSetting.index,
              verts,
              prims,
              isClosed: true,
            }),
          )
        }
      } catch {
        // If boolean operation fails, skip copper fill for this element
      }
    }
  }
}
