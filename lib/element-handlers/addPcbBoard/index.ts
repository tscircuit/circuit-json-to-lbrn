import { Polygon, point } from "@flatten-js/core"
import type { PcbBoard } from "circuit-json"
import { ShapePath } from "lbrnts"
import type { ConvertContext } from "../../ConvertContext"
import { polygonToShapePathData } from "../../polygon-to-shape-path"

export const addPcbBoard = (board: PcbBoard, ctx: ConvertContext) => {
  const {
    origin,
    project,
    throughBoardCutSetting,
    soldermaskCutSetting,
    includeCopper,
    includeSoldermask,
  } = ctx

  let polygon: Polygon | null = null

  if (board.outline?.length) {
    polygon = new Polygon(
      board.outline.map((outlinePoint) =>
        point(outlinePoint.x + origin.x, outlinePoint.y + origin.y),
      ),
    )
  } else if (
    typeof board.width === "number" &&
    typeof board.height === "number" &&
    board.center
  ) {
    const halfWidth = board.width / 2
    const halfHeight = board.height / 2
    const minX = board.center.x - halfWidth + origin.x
    const minY = board.center.y - halfHeight + origin.y
    const maxX = board.center.x + halfWidth + origin.x
    const maxY = board.center.y + halfHeight + origin.y

    polygon = new Polygon([
      point(minX, minY),
      point(maxX, minY),
      point(maxX, maxY),
      point(minX, maxY),
    ])
  }

  if (!polygon) return

  const { verts, prims } = polygonToShapePathData(polygon)

  if (includeCopper) {
    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts,
        prims,
        isClosed: true,
      }),
    )
  }
  if (includeSoldermask) {
    project.children.push(
      new ShapePath({
        cutIndex: soldermaskCutSetting.index,
        verts,
        prims,
        isClosed: true,
      }),
    )
  }
}
