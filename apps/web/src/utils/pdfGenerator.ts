import jsPDF from 'jspdf'
import { logger } from './logger'
import { resolveSignedUrl } from './signedUrls'
import type { Audit, Branch, User, Survey } from '@trakr/shared'
import { calculateAuditScore, calculateWeightedAuditScore } from '@trakr/shared'

interface PDFExportOptions {
  audit: Audit
  branch: Branch
  auditor: User
  survey: Survey
  manager?: User
}

// Helper to load image as base64
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    logger.error('Failed to load image', error, { context: 'PDFGenerator' })
    return null
  }
}

export async function generateAuditPDF(options: PDFExportOptions): Promise<void> {
  const { audit, branch, auditor, survey, manager } = options
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })
  
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let yPosition = margin
  
  // Load logo
  const logoUrl = '/icons/TrakrLogoLightMode.svg'
  const logoImageData = await loadImageAsBase64(logoUrl)
  
  // Helper function to check if we need a new page  
  const checkPageBreak = (spaceNeeded: number) => {
    if (yPosition + spaceNeeded > pageHeight - margin) {
      pdf.addPage()
      yPosition = margin
      addHeader()
      return true
    }
    return false
  }
  
  const addHeader = () => {
    // Minimal header with logo and subtitle
    const headerHeight = 18
    
    let x = margin
    const logoHeight = 8
    const logoWidth = 22
    
    // Logo
    if (logoImageData) {
      try {
        pdf.addImage(logoImageData, 'PNG', x, yPosition + 2, logoWidth, logoHeight)
        x += logoWidth + 4
      } catch {
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(31, 41, 55)
        pdf.text('Trakr', x, yPosition + 7)
        x += 18
      }
    } else {
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(31, 41, 55)
      pdf.text('Trakr', x, yPosition + 7)
      x += 18
    }
    
    // Title and subtitle
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(17, 24, 39)
    pdf.text('Audit Report', x, yPosition + 6)
    
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(107, 114, 128)
    pdf.text(branch.name, x, yPosition + 11)
    
    // Divider
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.2)
    pdf.line(margin, yPosition + headerHeight, pageWidth - margin, yPosition + headerHeight)
    
    pdf.setTextColor(0, 0, 0)
    pdf.setFont('helvetica', 'normal')
    yPosition += headerHeight + 8
  }
  
  const addFooter = (pageNum: number, totalPages: number) => {
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(156, 163, 175)
    
    // Generated date (left)
    const dateText = `Generated: ${new Date().toLocaleDateString()}`
    pdf.text(dateText, margin, pageHeight - 8)
    
    // Page number (center)
    const footerText = `Page ${pageNum} of ${totalPages}`
    const textWidth = pdf.getTextWidth(footerText)
    pdf.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 8)
    
    // Badge (right)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(59, 130, 246)
    const badgeText = 'Exported with TRAKR'
    const badgeWidth = pdf.getTextWidth(badgeText)
    pdf.text(badgeText, pageWidth - margin - badgeWidth, pageHeight - 8)
    
    pdf.setTextColor(0, 0, 0)
    pdf.setFont('helvetica', 'normal')
  }
  
  addHeader()
  
  // Calculate scores
  const basicScore = calculateAuditScore(audit, survey)
  const weightedScore = calculateWeightedAuditScore(audit, survey)
  
  // Status color
  const status = audit.status?.toUpperCase() || 'UNKNOWN'
  let statusColor: [number, number, number] = [75, 85, 99]
  switch (status) {
    case 'APPROVED':
      statusColor = [46, 125, 90]
      break
    case 'REJECTED':
      statusColor = [200, 60, 60]
      break
    case 'SUBMITTED':
      statusColor = [59, 130, 246]
      break
  }
  
  // Hero title
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(17, 24, 39)
  pdf.text('Audit Summary', margin, yPosition)
  yPosition += 6
  
  // Subtitle
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(107, 114, 128)
  const subtitleLine = `${survey.title || 'Audit template'} · ${new Date(audit.createdAt).toLocaleDateString()}`
  pdf.text(subtitleLine, margin, yPosition)
  pdf.setTextColor(0, 0, 0)
  yPosition += 10
  
  // Two-column layout
  const leftColX = margin
  const leftColWidth = contentWidth * 0.52
  const rightColX = leftColX + leftColWidth + 6
  const rightColWidth = pageWidth - margin - rightColX
  let leftY = yPosition
  
  // Left column - metadata
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(107, 114, 128)
  pdf.text('Branch', leftColX, leftY)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(31, 41, 55)
  pdf.text(branch.name, leftColX, leftY + 4)
  leftY += 10
  
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(107, 114, 128)
  pdf.text('Auditor', leftColX, leftY)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(31, 41, 55)
  pdf.text(auditor.name || auditor.email, leftColX, leftY + 4)
  leftY += 10
  
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(107, 114, 128)
  pdf.text('Status', leftColX, leftY)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...statusColor)
  pdf.text(status, leftColX, leftY + 4)
  leftY += 10
  
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(107, 114, 128)
  pdf.text('Submitted', leftColX, leftY)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(31, 41, 55)
  pdf.text(audit.submittedAt ? new Date(audit.submittedAt).toLocaleDateString() : 'Not yet', leftColX, leftY + 4)
  leftY += 10
  
  // Right column - score card
  const scoreCardHeight = 32
  const scoreCardTop = yPosition
  
  pdf.setFillColor(248, 248, 245)
  pdf.setDrawColor(229, 231, 235)
  pdf.setLineWidth(0.3)
  pdf.rect(rightColX, scoreCardTop, rightColWidth, scoreCardHeight, 'FD')
  
  // Large score
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(37, 99, 235)
  pdf.text(`${weightedScore.weightedCompliancePercentage.toFixed(1)}%`, rightColX + 5, scoreCardTop + 15)
  
  // Caption
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(107, 114, 128)
  pdf.text('Weighted compliance', rightColX + 5, scoreCardTop + 21)
  pdf.text(`${basicScore.answeredQuestions}/${basicScore.totalQuestions} questions`, rightColX + 5, scoreCardTop + 26)
  
  pdf.setTextColor(0, 0, 0)
  
  // Advance y
  yPosition = Math.max(leftY, scoreCardTop + scoreCardHeight) + 14
  
  // Audit Details section
  checkPageBreak(18)
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(17, 24, 39)
  pdf.text('Audit Details', margin, yPosition)
  yPosition += 10
  
  let questionNumber = 1
  for (const section of survey.sections) {
    checkPageBreak(16)
    
    // Section title band
    pdf.setFillColor(239, 246, 255)
    pdf.rect(margin, yPosition - 4, contentWidth, 10, 'F')
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(37, 99, 235)
    pdf.text(section.title, margin + 3, yPosition + 2)
    pdf.setTextColor(0, 0, 0)
    yPosition += 12
    
    for (const question of section.questions) {
      checkPageBreak(22)
      
      // Question text
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(31, 41, 55)
      const questionText = `${questionNumber}. ${question.text}`
      const questionLines = pdf.splitTextToSize(questionText, contentWidth - 8)
      yPosition += 3
      pdf.text(questionLines, margin + 2, yPosition)
      yPosition += questionLines.length * 4
      
      // Answer
      pdf.setFont('helvetica', 'normal')
      const response = audit.responses[question.id] || 'No answer'
      let responseColor: [number, number, number] = [75, 85, 99]
      if (response.toLowerCase() === 'yes') responseColor = [46, 125, 90]
      else if (response.toLowerCase() === 'no') responseColor = [200, 60, 60]
      else if (response.toLowerCase() === 'n/a') responseColor = [156, 163, 175]
      
      pdf.setTextColor(...responseColor)
      pdf.text(`Answer: ${response.toUpperCase()}`, margin + 2, yPosition + 4)
      pdf.setTextColor(0, 0, 0)
      yPosition += 8
      
      // N/A reason
      if (response.toLowerCase() === 'n/a' && audit.naReasons?.[question.id]) {
        pdf.setFontSize(8)
        pdf.setTextColor(107, 114, 128)
        const reasonLines = pdf.splitTextToSize(`N/A Reason: ${audit.naReasons[question.id]}`, contentWidth - 8)
        pdf.text(reasonLines, margin + 2, yPosition)
        pdf.setTextColor(0, 0, 0)
        pdf.setFontSize(9)
        yPosition += reasonLines.length * 3.5 + 2
      }
      
      // Admin override
      if (audit.overrideScores?.[question.id] !== undefined) {
        pdf.setFontSize(8)
        pdf.setTextColor(59, 130, 246)
        pdf.text(`Admin Override: ${audit.overrideScores[question.id]} points`, margin + 2, yPosition)
        if (audit.overrideNotes?.[question.id]) {
          yPosition += 3.5
          const noteLines = pdf.splitTextToSize(`Note: ${audit.overrideNotes[question.id]}`, contentWidth - 8)
          pdf.text(noteLines, margin + 2, yPosition)
          yPosition += noteLines.length * 3.5
        }
        pdf.setTextColor(0, 0, 0)
        pdf.setFontSize(9)
        yPosition += 2
      }
      
      // Divider
      pdf.setDrawColor(229, 231, 235)
      pdf.setLineWidth(0.2)
      pdf.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2)
      yPosition += 6
      questionNumber++
    }
    
    // Section comments
    if (audit.sectionComments?.[section.id]) {
      checkPageBreak(12)
      yPosition += 2
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(37, 99, 235)
      pdf.text('Section Comments:', margin + 2, yPosition)
      yPosition += 4
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(31, 41, 55)
      const commentLines = pdf.splitTextToSize(audit.sectionComments[section.id], contentWidth - 6)
      pdf.text(commentLines, margin + 2, yPosition)
      pdf.setTextColor(0, 0, 0)
      yPosition += commentLines.length * 3.5 + 5
    }
    
    // Section photos
    const sectionPhotos = audit.sectionPhotos?.filter(p => p.sectionId === section.id) || []
    if (sectionPhotos.length > 0) {
      checkPageBreak(30)
      yPosition += 2
      pdf.setFontSize(8)
      pdf.setTextColor(37, 99, 235)
      pdf.text(`Section Photos (${sectionPhotos.length})`, margin + 2, yPosition)
      yPosition += 5
      
      let xOffset = margin + 4
      let photoCount = 0
      const photoWidth = 38
      const photoHeight = 28
      
      for (const photo of sectionPhotos.slice(0, 4)) {
        if (photoCount > 0 && photoCount % 2 === 0) {
          yPosition += photoHeight + 3
          xOffset = margin + 4
          checkPageBreak(photoHeight + 5)
        }
        
        try {
          // audit-photos is private: resolve the stored object path to a signed URL first.
          const signedUrl = await resolveSignedUrl('audit-photos', photo.url)
          const imageData = signedUrl ? await loadImageAsBase64(signedUrl) : ''
          if (imageData) {
            pdf.addImage(imageData, 'JPEG', xOffset, yPosition, photoWidth, photoHeight)
          }
        } catch (error) {
          pdf.setDrawColor(229, 231, 235)
          pdf.rect(xOffset, yPosition, photoWidth, photoHeight, 'S')
          pdf.setFontSize(7)
          pdf.setTextColor(156, 163, 175)
          pdf.text('Image unavailable', xOffset + 4, yPosition + 14)
          pdf.setFontSize(8)
        }
        
        xOffset += photoWidth + 4
        photoCount++
      }
      
      if (photoCount > 0) {
        yPosition += photoHeight + 3
      }
      
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(9)
    }
    
    yPosition += 6
  }
  
  // Timeline section
  checkPageBreak(35)
  yPosition += 8
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(17, 24, 39)
  pdf.text('Audit Timeline', margin, yPosition)
  yPosition += 10
  
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  
  // Created
  pdf.setTextColor(107, 114, 128)
  pdf.text('• Created:', margin + 2, yPosition)
  pdf.setTextColor(31, 41, 55)
  pdf.text(new Date(audit.createdAt).toLocaleString(), margin + 28, yPosition)
  yPosition += 6
  
  // Submitted
  if (audit.submittedAt) {
    pdf.setTextColor(107, 114, 128)
    pdf.text('• Submitted:', margin + 2, yPosition)
    pdf.setTextColor(31, 41, 55)
    pdf.text(new Date(audit.submittedAt).toLocaleString(), margin + 28, yPosition)
    pdf.setFontSize(8)
    pdf.setTextColor(156, 163, 175)
    pdf.text(`by ${auditor.name || auditor.email}`, margin + 85, yPosition)
    pdf.setFontSize(9)
    pdf.setTextColor(0, 0, 0)
    yPosition += 6
  }
  
  // Approved
  if (audit.approvedAt) {
    pdf.setTextColor(46, 125, 90)
    pdf.text('• Approved:', margin + 2, yPosition)
    pdf.setTextColor(31, 41, 55)
    pdf.text(new Date(audit.approvedAt).toLocaleString(), margin + 28, yPosition)
    if (manager) {
      pdf.setFontSize(8)
      pdf.setTextColor(156, 163, 175)
      pdf.text(`by ${manager.name || manager.email}`, margin + 85, yPosition)
      pdf.setFontSize(9)
    }
    pdf.setTextColor(0, 0, 0)
    yPosition += 6
  }
  
  // Rejected
  if (audit.rejectedAt) {
    pdf.setTextColor(200, 60, 60)
    pdf.text('• Rejected:', margin + 2, yPosition)
    pdf.setTextColor(31, 41, 55)
    pdf.text(new Date(audit.rejectedAt).toLocaleString(), margin + 28, yPosition)
    if (manager) {
      pdf.setFontSize(8)
      pdf.setTextColor(156, 163, 175)
      pdf.text(`by ${manager.name || manager.email}`, margin + 85, yPosition)
      pdf.setFontSize(9)
    }
    pdf.setTextColor(0, 0, 0)
    yPosition += 6
  }
  
  yPosition += 6
  
  // Approval/Rejection notes
  if (audit.approvalNote || audit.rejectionNote) {
    checkPageBreak(25)
    yPosition += 4
    
    const noteText = audit.approvalNote || audit.rejectionNote || ''
    const noteLines = pdf.splitTextToSize(noteText, contentWidth - 8)
    const noteHeight = noteLines.length * 4.5 + 14
    
    // Card
    const isApproval = !!audit.approvalNote
    pdf.setFillColor(isApproval ? 240 : 254, isApproval ? 253 : 245, isApproval ? 244 : 245)
    pdf.setDrawColor(isApproval ? 46 : 200, isApproval ? 125 : 60, isApproval ? 90 : 60)
    pdf.setLineWidth(0.4)
    pdf.rect(margin, yPosition, contentWidth, noteHeight, 'FD')
    pdf.setLineWidth(0.2)
    
    // Title
    yPosition += 6
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(isApproval ? 46 : 200, isApproval ? 125 : 60, isApproval ? 90 : 60)
    pdf.text(isApproval ? 'Approval Note' : 'Rejection Note', margin + 4, yPosition)
    pdf.setTextColor(0, 0, 0)
    
    // Note text
    yPosition += 5
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(31, 41, 55)
    pdf.text(noteLines, margin + 4, yPosition)
    yPosition += noteLines.length * 4.5 + 4
    pdf.setTextColor(0, 0, 0)
  }
  
  // Signatures section
  checkPageBreak(42)
  yPosition += 10
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(17, 24, 39)
  pdf.text('Signatures & Approval', margin, yPosition)
  yPosition += 10
  
  // Signature boxes
  const signatureBoxWidth = (contentWidth - 4) / 2
  const signatureBoxHeight = 32
  
  // Auditor box
  pdf.setFillColor(248, 248, 245)
  pdf.setDrawColor(229, 231, 235)
  pdf.setLineWidth(0.3)
  pdf.rect(margin, yPosition, signatureBoxWidth, signatureBoxHeight, 'FD')
  
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(156, 163, 175)
  pdf.text('AUDITOR', margin + 3, yPosition + 5)
  
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(31, 41, 55)
  pdf.text(auditor.name || auditor.email, margin + 3, yPosition + 11)
  
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(107, 114, 128)
  if (audit.submittedAt) {
    pdf.text(`Submitted: ${new Date(audit.submittedAt).toLocaleDateString()}`, margin + 3, yPosition + 17)
    pdf.text(`at ${new Date(audit.submittedAt).toLocaleTimeString()}`, margin + 3, yPosition + 22)
  } else {
    pdf.text('Not yet submitted', margin + 3, yPosition + 17)
  }
  
  // Manager box
  if (manager && (audit.approvedBy || audit.rejectedBy)) {
    const managerBoxX = margin + signatureBoxWidth + 4
    pdf.rect(managerBoxX, yPosition, signatureBoxWidth, signatureBoxHeight, 'FD')
    
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'bold')
    const managerLabel = audit.approvedAt ? 'APPROVED BY' : 'REJECTED BY'
    const labelColor: [number, number, number] = audit.approvedAt ? [46, 125, 90] : [200, 60, 60]
    pdf.setTextColor(...labelColor)
    pdf.text(managerLabel, managerBoxX + 3, yPosition + 5)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(31, 41, 55)
    pdf.text(manager.name || manager.email, managerBoxX + 3, yPosition + 11)
    
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(107, 114, 128)
    const actionDate = audit.approvedAt || audit.rejectedAt
    if (actionDate) {
      pdf.text(`Date: ${new Date(actionDate).toLocaleDateString()}`, managerBoxX + 3, yPosition + 17)
      pdf.text(`at ${new Date(actionDate).toLocaleTimeString()}`, managerBoxX + 3, yPosition + 22)
    }
    
    if (audit.approvalSignatureType) {
      pdf.setFontSize(7)
      pdf.text(`Signature: ${audit.approvalSignatureType}`, managerBoxX + 3, yPosition + 27)
    }
  }
  
  pdf.setTextColor(0, 0, 0)
  yPosition += signatureBoxHeight + 5
  
  // Add page numbers to all pages
  const totalPages = pdf.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    addFooter(i, totalPages)
  }
  
  // Save PDF
  const fileName = `Audit_${branch.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  pdf.save(fileName)
}
