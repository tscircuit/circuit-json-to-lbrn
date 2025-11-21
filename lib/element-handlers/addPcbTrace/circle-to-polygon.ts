import Flatten from "@flatten-js/core"

export const circleToPolygon = (
  circle: Flatten.Circle,
  segments = 32,
): Flatten.Polygon => {
  const points: Flatten.Point[] = []
  for (let i = 0; i < segments; i++) {
    const angle = (i * 2 * Math.PI) / segments
    const x = circle.center.x + circle.r * Math.cos(angle)
    const y = circle.center.y + circle.r * Math.sin(angle)
    points.push(Flatten.point(x, y))
  }
  return new Flatten.Polygon(points)
}
