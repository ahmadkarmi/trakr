import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SurveyResultRow } from '../types/analytics'
import { format } from 'date-fns'

export const exportToExcel = async (data: SurveyResultRow[], surveyTitle: string) => {
  // Create workbook
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Survey Results')

  // Define columns
  worksheet.columns = [
    { header: 'Branch', key: 'branch', width: 20 },
    { header: 'Zone', key: 'zone', width: 15 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Auditor', key: 'auditor', width: 20 },
    { header: 'Score (%)', key: 'score', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Total Questions', key: 'totalQuestions', width: 15 },
    { header: 'Yes', key: 'yes', width: 10 },
    { header: 'No', key: 'no', width: 10 },
    { header: 'N/A', key: 'na', width: 10 },
  ]

  // Style header row
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  }
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

  // Add data rows
  data.forEach(row => {
    worksheet.addRow({
      branch: row.branchName,
      zone: row.zoneName || 'N/A',
      date: format(new Date(row.completedAt), 'yyyy-MM-dd'),
      auditor: row.auditorName,
      score: row.complianceScore,
      status: row.status,
      totalQuestions: row.totalQuestions,
      yes: row.yesCount,
      no: row.noCount,
      na: row.naCount,
    })
  })

  // Generate filename
  const filename = `${surveyTitle.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`

  // Save file
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

export const exportToCSV = (data: SurveyResultRow[], surveyTitle: string) => {
  // Define headers
  const headers = ['Branch', 'Zone', 'Date', 'Auditor', 'Score (%)', 'Status', 'Total Questions', 'Yes', 'No', 'N/A']
  
  // Prepare data rows
  const rows = data.map(row => [
    row.branchName,
    row.zoneName || 'N/A',
    format(new Date(row.completedAt), 'yyyy-MM-dd'),
    row.auditorName,
    row.complianceScore.toString(),
    row.status,
    row.totalQuestions.toString(),
    row.yesCount.toString(),
    row.noCount.toString(),
    row.naCount.toString(),
  ])
  
  // Convert to CSV (escape fields with commas/quotes)
  const escapeCSV = (field: string) => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`
    }
    return field
  }
  
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')
  
  // Generate filename
  const filename = `${surveyTitle.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

export const exportToPDF = (data: SurveyResultRow[], surveyTitle: string) => {
  const doc = new jsPDF('landscape')
  
  // Title
  doc.setFontSize(16)
  doc.text(`${surveyTitle} - Survey Results Report`, 14, 15)
  
  // Metadata
  doc.setFontSize(10)
  doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 22)
  doc.text(`Total Audits: ${data.length}`, 14, 28)
  
  // Calculate stats
  const avgScore = data.reduce((sum, r) => sum + r.complianceScore, 0) / data.length
  doc.text(`Average Score: ${avgScore.toFixed(1)}%`, 14, 34)
  
  // Table
  autoTable(doc, {
    startY: 40,
    head: [['Branch', 'Zone', 'Date', 'Auditor', 'Score', 'Status']],
    body: data.map(r => [
      r.branchName,
      r.zoneName || 'N/A',
      format(new Date(r.completedAt), 'yyyy-MM-dd'),
      r.auditorName,
      `${r.complianceScore}%`,
      r.status
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { top: 40 },
  })
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' })
  }
  
  // Save
  const filename = `${surveyTitle.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
  doc.save(filename)
}
