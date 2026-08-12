import { expect, test } from "bun:test"
import type { CircuitJson, PcbComponent } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import circuitJson from "./stm32c071-display.circuit.json"

const VISUAL_PADDING_MM = 5
const TARGET_COMPONENT_NAMES = new Set(["SW_BTN1", "R_BTN1"])

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const addPixelFrame = (svg: string, width: number, height: number) =>
  svg.replace(
    "</svg>",
    `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#888" stroke-width="2"/></svg>`,
  )

const cropLightBurnSvg = (
  svg: string,
  bounds: Bounds,
  width: number,
  height: number,
) => {
  const yFlipMatch = svg.match(/matrix\(1 0 0 -1 0 ([^)]+)\)/)
  if (!yFlipMatch) throw new Error("Expected a Y-flip transform in LBRN SVG")

  const yFlipOffset = Number(yFlipMatch[1])
  const viewBoxY = yFlipOffset - bounds.maxY
  const viewBoxWidth = bounds.maxX - bounds.minX
  const viewBoxHeight = bounds.maxY - bounds.minY
  const scale = width / viewBoxWidth
  const translateX = -bounds.minX * scale
  const translateY = -viewBoxY * scale
  const innerSvg = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><clipPath id="lbrn-focus-clip"><rect width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#lbrn-focus-clip)"><g transform="translate(${translateX} ${translateY}) scale(${scale})">${innerSvg}</g></g><rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#888" stroke-width="2"/></svg>`
}

test("repro05 - stm display BTN1 pointed copper cut fill", async () => {
  // Rendered from tscircuit/biscuit-boards@78dbe6523daadc0d8fc88e4c20cac893ecbe76b7.
  const typedCircuitJson = circuitJson as CircuitJson
  const targetSourceComponentIds = new Set(
    typedCircuitJson.flatMap((element) =>
      element.type === "source_component" &&
      TARGET_COMPONENT_NAMES.has(element.name)
        ? [element.source_component_id]
        : [],
    ),
  )
  const components = typedCircuitJson.filter(
    (element): element is PcbComponent =>
      element.type === "pcb_component" &&
      targetSourceComponentIds.has(element.source_component_id),
  )
  expect(components).toHaveLength(2)

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
  const visualBounds = {
    minX: componentBounds.minX - VISUAL_PADDING_MM,
    maxX: componentBounds.maxX + VISUAL_PADDING_MM,
    minY: componentBounds.minY - VISUAL_PADDING_MM,
    maxY: componentBounds.maxY + VISUAL_PADDING_MM,
  }

  expect(componentBounds.minX - visualBounds.minX).toBeCloseTo(
    VISUAL_PADDING_MM,
  )
  expect(visualBounds.maxX - componentBounds.maxX).toBeCloseTo(
    VISUAL_PADDING_MM,
  )
  expect(componentBounds.minY - visualBounds.minY).toBeCloseTo(
    VISUAL_PADDING_MM,
  )
  expect(visualBounds.maxY - componentBounds.maxY).toBeCloseTo(
    VISUAL_PADDING_MM,
  )

  const snapshotWidth = 1000
  const snapshotHeight =
    snapshotWidth *
    ((visualBounds.maxY - visualBounds.minY) /
      (visualBounds.maxX - visualBounds.minX))
  const pcbSvg = addPixelFrame(
    convertCircuitJsonToPcbSvg(typedCircuitJson, {
      width: snapshotWidth,
      height: snapshotHeight,
      viewport: visualBounds,
      drawPaddingOutsideBoard: false,
      layer: "top",
      showSolderMask: false,
      showPcbNotes: false,
    }),
    snapshotWidth,
    snapshotHeight,
  )
  const project = await convertCircuitJsonToLbrn(typedCircuitJson, {
    includeLayers: ["top"],
    includeCopper: true,
    includeSoldermask: true,
    includeCopperCutFill: true,
    copperCutFillMargin: 0.5,
    clipCopperCutFillToBoardOutline: true,
    includeHolePunch: false,
    origin: { x: 0, y: 0 },
  })
  const lbrnSvg = cropLightBurnSvg(
    generateLightBurnSvg(project, {
      defaultStrokeWidth: 0.01,
      margin: 1,
    }),
    visualBounds,
    snapshotWidth,
    snapshotHeight,
  )

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
