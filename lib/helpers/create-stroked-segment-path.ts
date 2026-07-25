import { createPillPath, type PillPath, type Point } from "./pillShape"

export interface CreateStrokedSegmentPathParams {
  start: Point
  end: Point
  strokeWidth: number
  origin: Point
}

export const createStrokedSegmentPath = ({
  start,
  end,
  strokeWidth,
  origin,
}: CreateStrokedSegmentPathParams): PillPath | null => {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const segmentLength = Math.hypot(deltaX, deltaY)
  if (segmentLength === 0) return null

  return createPillPath({
    centerX: (start.x + end.x) / 2 + origin.x,
    centerY: (start.y + end.y) / 2 + origin.y,
    width: segmentLength + strokeWidth,
    height: strokeWidth,
    rotation: Math.atan2(deltaY, deltaX),
  })
}
