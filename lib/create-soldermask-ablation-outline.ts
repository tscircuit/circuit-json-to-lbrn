import { ShapeGroup } from "lbrnts"
import type { ConvertContext } from "./ConvertContext"
import {
  type Contour,
  contourToPolygon,
  normalizeContourToCcw,
  polygonToContours,
  signedArea,
} from "./createCopperCutFillForLayer"
import { getManifold } from "./getManifold"
import { createLayerShapePath } from "./helpers/createLayerShapePath"
import { polygonToShapePathData } from "./polygon-to-shape-path"

export const createSoldermaskAblationOutline = async (
  ctx: ConvertContext,
): Promise<void> => {
  const {
    boardOutlineContour,
    clipCopperCutFillToBoardOutline,
    project,
    soldermaskAblationClearance,
    topCutNetGeoms,
    topSoldermaskAblationCutSetting,
  } = ctx

  if (!topSoldermaskAblationCutSetting) return

  const copperContours: Contour[] = []
  for (const netGeometries of topCutNetGeoms.values()) {
    for (const geometry of netGeometries) {
      copperContours.push(
        ...polygonToContours(geometry).map(normalizeContourToCcw),
      )
    }
  }
  if (copperContours.length === 0) return

  try {
    const { CrossSection } = await getManifold()
    const copperArea = new CrossSection(copperContours, "NonZero")
    const expandedCopperArea = copperArea.offset(
      soldermaskAblationClearance,
      "Round",
      2,
      32,
    )
    let outlineArea = expandedCopperArea

    if (
      clipCopperCutFillToBoardOutline &&
      boardOutlineContour &&
      boardOutlineContour.length >= 3
    ) {
      const boardArea = new CrossSection(
        [normalizeContourToCcw(boardOutlineContour)],
        "NonZero",
      )
      outlineArea = expandedCopperArea.intersect(boardArea)
      expandedCopperArea.delete()
      boardArea.delete()
    }

    const simplifiedOutline = outlineArea.simplify(0.001)
    const outerContours = simplifiedOutline
      .toPolygons()
      .filter((contour: Contour) => signedArea(contour) > 0)
    const outlineGroup = new ShapeGroup()

    for (const contour of outerContours) {
      const polygon = contourToPolygon(contour)
      if (!polygon) continue

      for (const island of polygon.splitToIslands()) {
        const pathData = polygonToShapePathData(island)
        if (pathData.verts.length === 0) continue

        outlineGroup.children.push(
          createLayerShapePath({
            cutIndex: topSoldermaskAblationCutSetting.index,
            pathData,
            layer: "top",
            isClosed: true,
            ctx,
          }),
        )
      }
    }

    if (outlineGroup.children.length > 0) {
      project.children.push(outlineGroup)
    }

    copperArea.delete()
    outlineArea.delete()
    simplifiedOutline.delete()
  } catch (error) {
    console.warn("Failed to create top soldermask ablation outline:", error)
  }
}
