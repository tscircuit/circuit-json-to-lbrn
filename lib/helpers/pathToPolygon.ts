import { Polygon, point } from "@flatten-js/core"

export interface Point {
  x: number
  y: number
}

/**
 * Convert an array of points to a Polygon
 */
export const pathToPolygon = (verts: Point[]): Polygon => {
  const points = verts.map((v) => point(v.x, v.y))
  return new Polygon(points)
}
