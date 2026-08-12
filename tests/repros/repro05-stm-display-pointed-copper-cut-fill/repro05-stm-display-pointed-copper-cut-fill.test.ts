import { expect, test } from "bun:test"
import type { CircuitJson, PcbBoard, PcbComponent } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import circuitJson from "./stm-display-btn1.circuit.json"

const VISUAL_PADDING_MM = 5

test("repro05 - stm display BTN1 pointed copper cut fill", async () => {
  const typedCircuitJson = circuitJson as CircuitJson
  const board = typedCircuitJson.find(
    (element): element is PcbBoard => element.type === "pcb_board",
  )
  if (!board || board.width === undefined || board.height === undefined) {
    throw new Error("Expected the reproduction fixture to have a sized board")
  }
  const { width: boardWidth, height: boardHeight } = board
  const components = typedCircuitJson.filter(
    (element): element is PcbComponent => element.type === "pcb_component",
  )

  const componentBounds = {
    minX: Math.min(
      ...components.map(({ center, width }) => center.x - width / 2),
    ),
    maxX: Math.max(
      ...components.map(({ center, width }) => center.x + width / 2),
    ),
    minY: Math.min(
      ...components.map(({ center, height }) => center.y - height / 2),
    ),
    maxY: Math.max(
      ...components.map(({ center, height }) => center.y + height / 2),
    ),
  }
  const boardBounds = {
    minX: board.center.x - boardWidth / 2,
    maxX: board.center.x + boardWidth / 2,
    minY: board.center.y - boardHeight / 2,
    maxY: board.center.y + boardHeight / 2,
  }

  expect(componentBounds.minX - boardBounds.minX).toBeCloseTo(VISUAL_PADDING_MM)
  expect(boardBounds.maxX - componentBounds.maxX).toBeCloseTo(VISUAL_PADDING_MM)
  expect(componentBounds.minY - boardBounds.minY).toBeCloseTo(VISUAL_PADDING_MM)
  expect(boardBounds.maxY - componentBounds.maxY).toBeCloseTo(VISUAL_PADDING_MM)

  const snapshotWidth = 1000
  const snapshotHeight = snapshotWidth * (boardHeight / boardWidth)
  const pcbSvg = await convertCircuitJsonToPcbSvg(typedCircuitJson, {
    width: snapshotWidth,
    height: snapshotHeight,
    matchBoardAspectRatio: true,
    drawPaddingOutsideBoard: true,
  })
  const project = await convertCircuitJsonToLbrn(typedCircuitJson, {
    includeLayers: ["top"],
    includeCopper: true,
    includeSoldermask: true,
    includeCopperCutFill: true,
    copperCutFillMargin: 0.5,
    clipCopperCutFillToBoardOutline: true,
    includeHolePunch: false,
    origin: {
      x: boardWidth / 2 - board.center.x,
      y: boardHeight / 2 - board.center.y,
    },
  })
  const lbrnSvg = generateLightBurnSvg(project, {
    defaultStrokeWidth: 0.01,
    margin: 1,
    width: snapshotWidth,
    height: snapshotHeight,
  })

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
