import { Point, Polygon } from "@flatten-js/core"
import { ShapeGroup, ShapePath } from "lbrnts"
import type { ConvertContext } from "./ConvertContext"
import { getManifold } from "./getManifold"
import { polygonToShapePathData } from "./polygon-to-shape-path"

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

const shapePathToContour = (shapePath: ShapePath): Contour | null => {
  if (!shapePath.verts || shapePath.verts.length < 3) return null
  const contour = shapePath.verts.map(
    (vert) => [vert.x, vert.y] as [number, number],
  )
  if (contour.length > 3) {
    const first = contour[0]
    const last = contour[contour.length - 1]
    if (first && last && first[0] === last[0] && first[1] === last[1]) {
      contour.pop()
    }
  }
  return contour.length >= 3 ? contour : null
}

const collectSoldermaskContours = (
  project: ConvertContext["project"],
  soldermaskCutIndex: number,
) => {
  const contours: Contour[] = []

  for (const child of project.children) {
    if (child instanceof ShapePath) {
      if (child.cutIndex !== soldermaskCutIndex) {
        continue
      }
      const contour = shapePathToContour(child)
      if (contour) {
        contours.push(contour)
      }
      continue
    }

    if (child instanceof ShapeGroup) {
      for (const groupChild of child.children) {
        if (groupChild instanceof ShapePath) {
          if (groupChild.cutIndex !== soldermaskCutIndex) {
            continue
          }
          const contour = shapePathToContour(groupChild)
          if (contour) {
            contours.push(contour)
          }
        }
      }
    }
  }

  return contours
}

/**
 * Creates a soldermask cure layer by subtracting soldermask openings from the board outline.
 */
export const createSoldermaskCureLayer = async ({
  ctx,
}: {
  ctx: ConvertContext
}): Promise<void> => {
  const { project, boardOutlineContour, soldermaskCureCutSetting } = ctx

  if (!soldermaskCureCutSetting) {
    return
  }

  if (ctx.soldermaskCutSetting.index === undefined) {
    return
  }
  const soldermaskCutIndex = ctx.soldermaskCutSetting.index

  if (!boardOutlineContour || boardOutlineContour.length < 3) {
    console.warn(
      "Cannot create soldermask cure layer: no board outline available",
    )
    return
  }

  try {
    const manifold = await getManifold()
    const { CrossSection } = manifold

    const allContours = collectSoldermaskContours(project, soldermaskCutIndex)
    if (allContours.length === 0) {
      return
    }

    const boardOutline = new CrossSection([boardOutlineContour], "Positive")
    const soldermaskOpenings = new CrossSection(allContours, "Positive")
    const cureArea = boardOutline.subtract(soldermaskOpenings)
    const simplifiedArea = cureArea.simplify(0.001)
    const resultContours: Contour[] = simplifiedArea.toPolygons()

    if (resultContours.length === 0) {
      boardOutline.delete()
      soldermaskOpenings.delete()
      cureArea.delete()
      simplifiedArea.delete()
      return
    }

    const shapeGroup = new ShapeGroup()

    for (const contour of resultContours) {
      const polygon = contourToPolygon(contour)
      if (!polygon) continue

      for (const island of polygon.splitToIslands()) {
        const { verts, prims } = polygonToShapePathData(island)

        if (verts.length > 0) {
          shapeGroup.children.push(
            new ShapePath({
              cutIndex: soldermaskCureCutSetting.index,
              verts,
              prims,
              isClosed: true,
            }),
          )
        }
      }
    }

    if (shapeGroup.children.length > 0) {
      project.children.push(shapeGroup)
    }

    boardOutline.delete()
    soldermaskOpenings.delete()
    cureArea.delete()
    simplifiedArea.delete()
  } catch (error) {
    console.warn("Failed to create soldermask cure layer:", error)
  }
}
