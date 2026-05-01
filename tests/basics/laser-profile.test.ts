import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import type { CutSetting } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../lib"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 5, y: 5 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    outline: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
  },
]

test("applies custom laserProfile settings with one pass per layer", async () => {
  const project = await convertCircuitJsonToLbrn(circuitJson, {
    laserProfile: {
      copper: {
        speed: 350,
        numPasses: 150,
        frequency: 25000,
        pulseWidth: 2,
      },
      board: {
        speed: 25,
        numPasses: 120,
        frequency: 21000,
        pulseWidth: 1.5,
      },
    },
  })

  expect(project).toBeDefined()
  const cutSettings = project.children.filter(
    (child) => child.constructor.name === "_CutSetting",
  ) as CutSetting[]
  expect(cutSettings.length).toBe(3) // top copper, bottom copper, through board

  // Verify top copper settings
  const topCopper = cutSettings[0]!
  expect(topCopper.speed).toBe(350)
  expect(topCopper.numPasses).toBe(1)
  expect(topCopper.frequency).toBe(25000)
  expect(topCopper.qPulseWidth).toBe(2)

  // Verify bottom copper settings (same as top)
  const bottomCopper = cutSettings[1]!
  expect(bottomCopper.speed).toBe(350)
  expect(bottomCopper.numPasses).toBe(1)
  expect(bottomCopper.frequency).toBe(25000)
  expect(bottomCopper.qPulseWidth).toBe(2)

  // Verify through board settings
  const throughBoard = cutSettings[2]!
  expect(throughBoard.speed).toBe(25)
  expect(throughBoard.numPasses).toBe(1)
  expect(throughBoard.frequency).toBe(21000)
  expect(throughBoard.qPulseWidth).toBe(1.5)
})

test("uses default laserProfile settings when not provided", async () => {
  const project = await convertCircuitJsonToLbrn(circuitJson)

  expect(project).toBeDefined()
  const cutSettings = project.children.filter(
    (child) => child.constructor.name === "_CutSetting",
  ) as CutSetting[]
  expect(cutSettings.length).toBe(3)

  // Verify top copper defaults
  const topCopper = cutSettings[0]!
  expect(topCopper.speed).toBe(300)
  expect(topCopper.numPasses).toBe(1)
  expect(topCopper.frequency).toBe(20000)
  expect(topCopper.qPulseWidth).toBe(1)

  // Verify through board defaults
  const throughBoard = cutSettings[2]!
  expect(throughBoard.speed).toBe(20)
  expect(throughBoard.numPasses).toBe(1)
  expect(throughBoard.frequency).toBe(20000)
  expect(throughBoard.qPulseWidth).toBe(1)
})

test("sets every generated layer to one pass", async () => {
  const project = await convertCircuitJsonToLbrn(
    [
      ...circuitJson,
      {
        type: "pcb_via",
        pcb_via_id: "via1",
        x: 5,
        y: 5,
        outer_diameter: 1.5,
        hole_diameter: 0.8,
        layers: ["top", "bottom"],
      },
    ],
    {
      includeCopper: true,
      includeSoldermask: true,
      includeSoldermaskCure: true,
      includeCopperCutFill: true,
      includeOxidationCleaningLayer: true,
      includeLayers: ["top", "bottom"],
      mirrorBottomLayer: true,
      traceMargin: 0.1,
      laserProfile: {
        copper: { numPasses: 150 },
        board: { numPasses: 120 },
      },
    },
  )

  const cutSettings = project.children.filter(
    (child) => child.constructor.name === "_CutSetting",
  ) as CutSetting[]

  expect(cutSettings.length).toBeGreaterThan(3)
  for (const cutSetting of cutSettings) {
    expect(cutSetting.numPasses).toBe(1)
  }
})
