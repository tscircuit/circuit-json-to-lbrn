import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    width: 10,
    height: 10,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    preset: "soldermask_cutout",
  } as any,
  {
    type: "pcb_smtpad",
    x: 0,
    y: 0,
    layer: "top",
    shape: "circle",
    pcb_smtpad_id: "pcb_smt_pad_1",
    pcb_port_id: "pcb_port_1",
    radius: 1,
  },
]

test("board outline with soldermask_cutout preset uses soldermask cut settings", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: true,
    includeSoldermask: false,
  })

  // Verify that the soldermask cut setting was created
  const soldermaskCutSetting = project.children.find(
    (child: any) => child.name === "Cut Soldermask",
  )
  expect(soldermaskCutSetting).toBeDefined()
  expect((soldermaskCutSetting as any).index).toBe(2)

  // Verify that the board outline uses the soldermask cut setting
  const shapePaths = project.children.filter(
    (child: any) => child.isClosed !== undefined,
  )
  const boardOutline = shapePaths.find((path: any) => path.isClosed === true)
  expect(boardOutline).toBeDefined()
  expect((boardOutline as any).cutIndex).toBe(2) // Should use soldermask cut setting

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
