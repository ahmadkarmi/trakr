/**
 * Bundle Size Monitoring Script
 * Checks bundle sizes after build and warns if they exceed thresholds
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DIST_PATH = path.resolve(__dirname, '../dist')
const THRESHOLDS = {
  entry: 350, // KB
  vendor: 500, // KB
  route: 100, // KB
  total: 2000, // KB
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath)
  return (stats.size / 1024).toFixed(2) // KB
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    const filePath = path.join(dirPath, file)
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles)
    } else {
      arrayOfFiles.push(filePath)
    }
  })

  return arrayOfFiles
}

function checkBundleSize() {
  if (!fs.existsSync(DIST_PATH)) {
    console.error('❌ Dist folder not found. Run `npm run build` first.')
    process.exit(1)
  }

  const allFiles = getAllFiles(DIST_PATH)
  const jsFiles = allFiles.filter((file) => file.endsWith('.js'))

  let totalSize = 0
  const chunks = {}

  jsFiles.forEach((file) => {
    const size = parseFloat(getFileSize(file))
    totalSize += size
    const fileName = path.basename(file)
    chunks[fileName] = size
  })

  console.log('\n📦 Bundle Size Report\n')
  console.log('=' .repeat(60))

  // Sort by size
  const sortedChunks = Object.entries(chunks).sort((a, b) => b[1] - a[1])

  sortedChunks.forEach(([name, size]) => {
    const status = getStatus(name, size)
    console.log(`${status} ${name}: ${size} KB`)
  })

  console.log('=' .repeat(60))
  console.log(`\n📊 Total Size: ${totalSize.toFixed(2)} KB`)

  // Check thresholds
  const warnings = []
  sortedChunks.forEach(([name, size]) => {
    if (name.includes('entry') && size > THRESHOLDS.entry) {
      warnings.push(`⚠️  Entry chunk (${size} KB) exceeds threshold (${THRESHOLDS.entry} KB)`)
    } else if (name.includes('vendor') && size > THRESHOLDS.vendor) {
      warnings.push(`⚠️  Vendor chunk ${name} (${size} KB) exceeds threshold (${THRESHOLDS.vendor} KB)`)
    } else if (!name.includes('vendor') && !name.includes('entry') && size > THRESHOLDS.route) {
      warnings.push(`⚠️  Route chunk ${name} (${size} KB) exceeds threshold (${THRESHOLDS.route} KB)`)
    }
  })

  if (totalSize > THRESHOLDS.total) {
    warnings.push(`⚠️  Total bundle size (${totalSize.toFixed(2)} KB) exceeds threshold (${THRESHOLDS.total} KB)`)
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Bundle Size Warnings:\n')
    warnings.forEach((warning) => console.log(warning))
    console.log('\n💡 Consider:')
    console.log('   - Running `npm run build:analyze` to identify large dependencies')
    console.log('   - Lazy loading more components')
    console.log('   - Reviewing vendor chunk splitting')
  } else {
    console.log('\n✅ All chunks are within size thresholds!')
  }

  console.log('\n')
}

function getStatus(name, size) {
  if (name.includes('entry') && size > THRESHOLDS.entry) return '⚠️ '
  if (name.includes('vendor') && size > THRESHOLDS.vendor) return '⚠️ '
  if (!name.includes('vendor') && !name.includes('entry') && size > THRESHOLDS.route) return '⚠️ '
  return '✅'
}

checkBundleSize()
