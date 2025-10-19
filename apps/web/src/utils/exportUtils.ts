import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SurveyResultRow } from '../types/analytics'
import { format } from 'date-fns'

export const exportToExcel = (data: SurveyResultRow[], surveyTitle: string) => {
  // Prepare data for export
  const exportData = data.map(row => ({
    'Branch': row.branchName,
    'Zone': row.zoneName || 'N/A',
    'Date': format(new Date(row.completedAt), 'yyyy-MM-dd'),
    'Auditor': row.auditorName,
    'Score (%)': row.complianceScore,
    'Status': row.status,
    'Total Questions': row.totalQuestions,
    'Yes': row.yesCount,
    'No': row.noCount,
    'N/A': row.naCount,
  }))

  // Create workbook
  const ws = XLSX.utils.json_to_sheet(exportData)
  
  // Auto-size columns
  const colWidths = Object.keys(exportData[0] || {}).map(key => ({
    wch: Math.max(key.length, 15)
  }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Survey Results')
  
  // Generate filename
  const filename = `${surveyTitle.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  
  // Save file
  XLSX.writeFile(wb, filename)
}

export const exportToCSV = (data: SurveyResultRow[], surveyTitle: string) => {
  // Prepare data for export
  const exportData = data.map(row => ({
    'Branch': row.branchName,
    'Zone': row.zoneName || 'N/A',
    'Date': format(new Date(row.completedAt), 'yyyy-MM-dd'),
    'Auditor': row.auditorName,
    'Score (%)': row.complianceScore,
    'Status': row.status,
    'Total Questions': row.totalQuestions,
    'Yes': row.yesCount,
    'No': row.noCount,
    'N/A': row.naCount,
  }))

  // Create workbook and convert to CSV
  const ws = XLSX.utils.json_to_sheet(exportData)
  const csv = XLSX.utils.sheet_to_csv(ws)
  
  // Generate filename
  const filename = `${surveyTitle.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
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
