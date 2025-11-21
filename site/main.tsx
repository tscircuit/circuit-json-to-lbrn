import { convertCircuitJsonToLbrn } from "../lib/index"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import type { CircuitJson } from "circuit-json"

// Global state
let currentLbrnProject: any = null
let currentCircuitJson: CircuitJson | null = null

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

// Show error message
function showError(message: string) {
  errorMessage.textContent = message
  errorMessage.classList.add("visible")
  setTimeout(() => {
    errorMessage.classList.remove("visible")
  }, 5000)
}

// Show loading state
function showLoading(show: boolean) {
  if (show) {
    loading.classList.add("visible")
    previewContainer.classList.remove("visible")
    downloadBtn.disabled = true
  } else {
    loading.classList.remove("visible")
  }
}

// Process the uploaded file
async function processFile(file: File) {
  try {
    showLoading(true)
    errorMessage.classList.remove("visible")

    // Read the file
    const fileContent = await file.text()
    const circuitJson: CircuitJson = JSON.parse(fileContent)

    currentCircuitJson = circuitJson

    // Convert to LBRN
    console.log("Converting to LBRN...")
    currentLbrnProject = convertCircuitJsonToLbrn(circuitJson)

    // Generate SVGs
    console.log("Generating Circuit JSON SVG...")
    const circuitSvg = await convertCircuitJsonToPcbSvg(circuitJson)

    console.log("Generating LBRN SVG...")
    const lbrnSvg = await generateLightBurnSvg(currentLbrnProject)

    // Display SVGs
    circuitSvgContainer.innerHTML = circuitSvg
    lbrnSvgContainer.innerHTML = lbrnSvg

    // Show preview and enable download
    previewContainer.classList.add("visible")
    downloadBtn.disabled = false
    showLoading(false)

    console.log("Conversion complete!")
  } catch (error) {
    showLoading(false)
    console.error("Error processing file:", error)
    showError(`Error processing file: ${error.message || "Unknown error"}`)
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
  dropArea.classList.add("drag-over")
})

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("drag-over")
})

dropArea.addEventListener("drop", (e) => {
  e.preventDefault()
  dropArea.classList.remove("drag-over")

  const file = e.dataTransfer?.files?.[0]
  if (file) {
    if (file.type === "application/json" || file.name.endsWith(".json")) {
      processFile(file)
    } else {
      showError("Please upload a JSON file")
    }
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
    showError(`Error downloading file: ${error.message || "Unknown error"}`)
  }
})

console.log("Circuit JSON to LBRN Converter loaded!")
