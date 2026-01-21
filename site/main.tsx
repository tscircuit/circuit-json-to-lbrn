import { convertCircuitJsonToLbrn } from "../lib/index.ts"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import type { CircuitJson } from "circuit-json"

// Global state
let currentLbrnProject: any = null
let currentCircuitJson: CircuitJson | null = null

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message

  return "Unknown error"
}

// Get DOM elements
const dropArea = document.getElementById("dropArea") as HTMLDivElement
const fileInput = document.getElementById("fileInput") as HTMLInputElement
const downloadBtn = document.getElementById("downloadBtn") as HTMLButtonElement
const previewContainer = document.getElementById(
  "previewContainer",
) as HTMLDivElement
const circuitSvgContainer = document.getElementById(
  "circuitSvgContainer",
) as HTMLDivElement
const lbrnSvgContainer = document.getElementById(
  "lbrnSvgContainer",
) as HTMLDivElement
const errorMessage = document.getElementById("errorMessage") as HTMLDivElement
const loading = document.getElementById("loading") as HTMLDivElement
const optionsContainer = document.getElementById(
  "optionsContainer",
) as HTMLDivElement
const originXInput = document.getElementById("originX") as HTMLInputElement
const originYInput = document.getElementById("originY") as HTMLInputElement
const traceMarginInput = document.getElementById(
  "traceMargin",
) as HTMLInputElement
const globalCopperSoldermaskMarginAdjustmentInput = document.getElementById(
  "globalCopperSoldermaskMarginAdjustment",
) as HTMLInputElement
const solderMaskMarginPercentInput = document.getElementById(
  "solderMaskMarginPercent",
) as HTMLInputElement
const laserSpotSizeInput = document.getElementById(
  "laserSpotSize",
) as HTMLInputElement
const includeCopperInput = document.getElementById(
  "includeCopper",
) as HTMLInputElement
const includeCopperCutFillInput = document.getElementById(
  "includeCopperCutFill",
) as HTMLInputElement
const copperCutFillMarginInput = document.getElementById(
  "copperCutFillMargin",
) as HTMLInputElement
const includeSoldermaskInput = document.getElementById(
  "includeSoldermask",
) as HTMLInputElement
const includeSilkscreenInput = document.getElementById(
  "includeSilkscreen",
) as HTMLInputElement
const includeTopLayerInput = document.getElementById(
  "includeTopLayer",
) as HTMLInputElement
const includeBottomLayerInput = document.getElementById(
  "includeBottomLayer",
) as HTMLInputElement
const copperSpeedInput = document.getElementById(
  "copperSpeed",
) as HTMLInputElement
const copperNumPassesInput = document.getElementById(
  "copperNumPasses",
) as HTMLInputElement
const copperFrequencyInput = document.getElementById(
  "copperFrequency",
) as HTMLInputElement
const copperPulseWidthInput = document.getElementById(
  "copperPulseWidth",
) as HTMLInputElement
const boardSpeedInput = document.getElementById(
  "boardSpeed",
) as HTMLInputElement
const boardNumPassesInput = document.getElementById(
  "boardNumPasses",
) as HTMLInputElement
const boardFrequencyInput = document.getElementById(
  "boardFrequency",
) as HTMLInputElement
const boardPulseWidthInput = document.getElementById(
  "boardPulseWidth",
) as HTMLInputElement
const presetSelect = document.getElementById(
  "presetSelect",
) as HTMLSelectElement
const reconvertBtn = document.getElementById(
  "reconvertBtn",
) as HTMLButtonElement

// Convert frequency from kHz to Hz
function kHzToHz(khz: number): number {
  return khz * 1000
}

// Convert pulse width from ns to seconds
function nsToSeconds(ns: number): number {
  return ns * 1e-9
}

// Load Omni X 6W 150x150 preset
function loadOmniX6W150x150Preset() {
  copperSpeedInput.value = "300"
  copperNumPassesInput.value = "1"
  copperFrequencyInput.value = "20"
  copperPulseWidthInput.value = "1"

  boardSpeedInput.value = "20"
  boardNumPassesInput.value = "1"
  boardFrequencyInput.value = "20"
  boardPulseWidthInput.value = "1"
}

// Reset to defaults
function resetToDefaults() {
  copperSpeedInput.value = "300"
  copperNumPassesInput.value = "1"
  copperFrequencyInput.value = "20"
  copperPulseWidthInput.value = "1"

  boardSpeedInput.value = "20"
  boardNumPassesInput.value = "1"
  boardFrequencyInput.value = "20"
  boardPulseWidthInput.value = "1"
}

// Initialize display values on load
function initializeDisplayValues() {
  copperFrequencyInput.value = "20"
  copperPulseWidthInput.value = "1"
  boardFrequencyInput.value = "20"
  boardPulseWidthInput.value = "1"
}

// Show error message
function showError(message: string) {
  errorMessage.textContent = message
  errorMessage.classList.remove("hidden")
  setTimeout(() => {
    errorMessage.classList.add("hidden")
  }, 5000)
}

// Show loading state
function showLoading(show: boolean) {
  if (show) {
    loading.classList.remove("hidden")
    previewContainer.classList.add("hidden")
    downloadBtn.disabled = true
  } else {
    loading.classList.add("hidden")
  }
}

// Get conversion options from UI
function getConversionOptions() {
  return {
    includeSilkscreen: includeSilkscreenInput.checked,
    origin: {
      x: parseFloat(originXInput.value) || 0,
      y: parseFloat(originYInput.value) || 0,
    },
    includeCopper: includeCopperInput.checked,
    includeCopperCutFill: includeCopperCutFillInput.checked,
    copperCutFillMargin: parseFloat(copperCutFillMarginInput.value) || 0.5,
    includeSoldermask: includeSoldermaskInput.checked,
    globalCopperSoldermaskMarginAdjustment:
      parseFloat(globalCopperSoldermaskMarginAdjustmentInput.value) || 0,
    solderMaskMarginPercent:
      parseFloat(solderMaskMarginPercentInput.value) || 0,
    includeLayers: [
      ...(includeTopLayerInput.checked ? ["top" as const] : []),
      ...(includeBottomLayerInput.checked ? ["bottom" as const] : []),
    ],
    traceMargin: parseFloat(traceMarginInput.value) || 0,
    laserSpotSize: parseFloat(laserSpotSizeInput.value) || 0.005,
    laserProfile: {
      copper: {
        speed: parseFloat(copperSpeedInput.value) || 300,
        numPasses: parseInt(copperNumPassesInput.value) || 100,
        frequency: kHzToHz(parseFloat(copperFrequencyInput.value) || 20),
        pulseWidth: nsToSeconds(parseFloat(copperPulseWidthInput.value) || 1),
      },
      board: {
        speed: parseFloat(boardSpeedInput.value) || 20,
        numPasses: parseInt(boardNumPassesInput.value) || 100,
        frequency: kHzToHz(parseFloat(boardFrequencyInput.value) || 20),
        pulseWidth: nsToSeconds(parseFloat(boardPulseWidthInput.value) || 1),
      },
    },
  }
}

// Process the uploaded file
async function processFile(file: File) {
  try {
    showLoading(true)
    errorMessage.classList.add("hidden")

    // Read the file
    const fileContent = await file.text()
    const circuitJson: CircuitJson = JSON.parse(fileContent)

    currentCircuitJson = circuitJson

    // Show options container
    optionsContainer.classList.remove("hidden")
    initializeDisplayValues()

    // Convert to LBRN with options
    await convertAndDisplay()
  } catch (error) {
    showLoading(false)
    console.error("Error processing file:", error)
    showError(`Error processing file: ${getErrorMessage(error)}`)
  }
}

// Convert circuit JSON to LBRN and display previews
async function convertAndDisplay() {
  if (!currentCircuitJson) return

  try {
    showLoading(true)

    const options = getConversionOptions()

    // Apply origin offset to circuit JSON if needed
    let processedCircuitJson = currentCircuitJson
    if (options.origin.x !== 0 || options.origin.y !== 0) {
      processedCircuitJson = JSON.parse(JSON.stringify(currentCircuitJson))
      // Apply offset to all elements with x/y coordinates
      for (const element of processedCircuitJson as any[]) {
        if (element.center) {
          element.center.x += options.origin.x
          element.center.y += options.origin.y
        }
        if (element.x !== undefined) {
          element.x += options.origin.x
        }
        if (element.y !== undefined) {
          element.y += options.origin.y
        }
        if (element.route) {
          for (const point of element.route) {
            if (point.x !== undefined) point.x += options.origin.x
            if (point.y !== undefined) point.y += options.origin.y
          }
        }
      }
    }

    // Convert to LBRN
    console.log("Converting to LBRN with options:", options)
    const { origin: _, ...conversionOptions } = options
    currentLbrnProject = await convertCircuitJsonToLbrn(
      processedCircuitJson,
      conversionOptions,
    )

    // Generate SVGs
    console.log("Generating Circuit JSON SVG...")
    const circuitSvg = await convertCircuitJsonToPcbSvg(processedCircuitJson)

    console.log("Generating LBRN SVG...")
    const lbrnSvg = await generateLightBurnSvg(currentLbrnProject)

    // Display SVGs
    circuitSvgContainer.innerHTML = circuitSvg
    lbrnSvgContainer.innerHTML = lbrnSvg

    // Show preview and enable download
    previewContainer.classList.remove("hidden")
    downloadBtn.disabled = false
    showLoading(false)

    console.log("Conversion complete!")
  } catch (error) {
    showLoading(false)
    console.error("Error converting:", error)
    showError(`Error converting: ${getErrorMessage(error)}`)
  }
}

// Handle file selection
fileInput.addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    processFile(file)
  }
})

// Handle drop area click
dropArea.addEventListener("click", () => {
  fileInput.click()
})

// Handle drag and drop
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault()
  dropArea.classList.add("border-blue-400")
})

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("border-blue-400")
})

dropArea.addEventListener("drop", (e) => {
  e.preventDefault()
  dropArea.classList.remove("border-blue-400")

  const file = e.dataTransfer?.files?.[0]
  if (file) {
    if (file.type === "application/json" || file.name.endsWith(".json")) {
      processFile(file)
    } else {
      showError("Please upload a JSON file")
    }
  }
})

// Handle reconvert button
reconvertBtn.addEventListener("click", () => {
  convertAndDisplay()
})

// Handle preset select
presetSelect.addEventListener("change", (e: Event) => {
  const target = e.target as HTMLSelectElement
  const value = target.value
  if (value === "default") {
    resetToDefaults()
  } else if (value === "omni-x-6w") {
    loadOmniX6W150x150Preset()
  }
})

// Handle download button
downloadBtn.addEventListener("click", () => {
  if (!currentLbrnProject) {
    showError("No LBRN project to download")
    return
  }

  try {
    const lbrnString = currentLbrnProject.getString()
    const blob = new Blob([lbrnString], { type: "application/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "circuit.lbrn2"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error downloading file:", error)
    showError(`Error downloading file: ${getErrorMessage(error)}`)
  }
})

console.log("Circuit JSON to LBRN Converter loaded!")
