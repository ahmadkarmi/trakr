import { jsPDF } from 'jspdf'
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
    console.error('Failed to load image:', error)
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
  const margin = 15
  const contentWidth = pageWidth - (margin * 2)
  let yPosition = margin
  
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
    const headerY = yPosition
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('TRAKR', margin, headerY)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Audit Management System', margin, headerY + 6)
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, headerY + 10, pageWidth - margin, headerY + 10)
    yPosition = headerY + 15
  }
  
  const addFooter = (pageNum: number, totalPages: number) => {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(128, 128, 128)
    
    // Page number (center)
    const footerText = `Page ${pageNum} of ${totalPages}`
    const textWidth = pdf.getTextWidth(footerText)
    pdf.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10)
    
    // Generated date (left)
    const dateText = `Generated: ${new Date().toLocaleDateString()}`
    pdf.text(dateText, margin, pageHeight - 10)
    
    // "Exported with TRAKR" badge (right)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(59, 130, 246)
    const badgeText = 'Exported with TRAKR'
    const badgeWidth = pdf.getTextWidth(badgeText)
    pdf.text(badgeText, pageWidth - margin - badgeWidth, pageHeight - 10)
    
    pdf.setTextColor(0, 0, 0)
    pdf.setFont('helvetica', 'normal')
  }
  
  addHeader()
  
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Audit Report', margin, yPosition)
  yPosition += 10
  
  pdf.setFillColor(245, 247, 250)
  pdf.rect(margin, yPosition, contentWidth, 42, 'F')
  pdf.setDrawColor(220, 220, 220)
  pdf.setLineWidth(0.3)
  pdf.rect(margin, yPosition, contentWidth, 42, 'S')
  pdf.setLineWidth(0.2)
  
  yPosition += 7
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Branch:', margin + 5, yPosition)
  pdf.setFont('helvetica', 'normal')
  pdf.text(branch.name, margin + 30, yPosition)
  
  yPosition += 6
  pdf.setFont('helvetica', 'bold')
  pdf.text('Auditor:', margin + 5, yPosition)
  pdf.setFont('helvetica', 'normal')
  pdf.text(auditor.name || auditor.email, margin + 30, yPosition)
  
  yPosition += 6
  pdf.setFont('helvetica', 'bold')
  pdf.text('Status:', margin + 5, yPosition)
  pdf.setFont('helvetica', 'normal')
  
  // Status with color
  const status = audit.status?.toUpperCase() || 'UNKNOWN'
  let statusColor: [number, number, number] = [0, 0, 0]
  switch (status) {
    case 'APPROVED':
      statusColor = [34, 197, 94]
      break
    case 'REJECTED':
      statusColor = [239, 68, 68]
      break
    case 'SUBMITTED':
      statusColor = [59, 130, 246]
      break
  }
  pdf.setTextColor(...statusColor)
  pdf.setFont('helvetica', 'bold')
  pdf.text(status, margin + 30, yPosition)
  pdf.setTextColor(0, 0, 0)
  pdf.setFont('helvetica', 'normal')
  
  yPosition += 6
  pdf.setFont('helvetica', 'bold')
  pdf.text('Date:', margin + 5, yPosition)
  pdf.setFont('helvetica', 'normal')
  pdf.text(new Date(audit.createdAt).toLocaleDateString(), margin + 30, yPosition)
  
  yPosition += 6
  pdf.setFont('helvetica', 'bold')
  pdf.text('Submitted:', margin + 5, yPosition)
  pdf.setFont('helvetica', 'normal')
  pdf.text(audit.submittedAt ? new Date(audit.submittedAt).toLocaleDateString() : 'Not yet', margin + 30, yPosition)
  
  yPosition += 10
  
  // Score Summary Box
  const basicScore = calculateAuditScore(audit, survey)
  const weightedScore = calculateWeightedAuditScore(audit, survey)
  
  pdf.setFillColor(240, 253, 244)
  pdf.rect(margin, yPosition, contentWidth, 22, 'F')
  pdf.setDrawColor(34, 197, 94)
  pdf.setLineWidth(0.5)
  pdf.rect(margin, yPosition, contentWidth, 22, 'S')
  pdf.setLineWidth(0.2)
  
  yPosition += 7
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Compliance Score:', margin + 5, yPosition)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(34, 197, 94)
  pdf.text(`${basicScore.compliancePercentage.toFixed(1)}%`, margin + 45, yPosition)
  
  pdf.setTextColor(0, 0, 0)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Weighted Score:', margin + 80, yPosition)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(34, 197, 94)
  pdf.text(`${weightedScore.weightedCompliancePercentage.toFixed(1)}%`, margin + 125, yPosition)
  pdf.setTextColor(0, 0, 0)
  
  yPosition += 6
  pdf.setFontSize(9)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`${basicScore.answeredQuestions} of ${basicScore.totalQuestions} questions answered`, margin + 5, yPosition)
  pdf.setTextColor(0, 0, 0)
  
  yPosition += 18
  
  checkPageBreak(20)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Audit Details', margin, yPosition)
  yPosition += 10
  
  let questionNumber = 1
  for (const section of survey.sections) {
    checkPageBreak(20)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(59, 130, 246)
    pdf.text(section.title, margin, yPosition)
    pdf.setTextColor(0, 0, 0)
    yPosition += 10
    
    for (const question of section.questions) {
      checkPageBreak(25)
      
      // Light box around each question
      const questionStartY = yPosition
      pdf.setFillColor(252, 252, 252)
      pdf.setDrawColor(230, 230, 230)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      const questionText = `${questionNumber}. ${question.text}`
      const questionLines = pdf.splitTextToSize(questionText, contentWidth - 10)
      yPosition += 5
      pdf.text(questionLines, margin + 5, yPosition)
      yPosition += questionLines.length * 5
      
      pdf.setFont('helvetica', 'normal')
      const response = audit.responses[question.id] || 'No answer'
      
      // Display response with color coding
      let responseColor: [number, number, number] = [64, 64, 64]
      if (response.toLowerCase() === 'yes') responseColor = [34, 197, 94]
      else if (response.toLowerCase() === 'no') responseColor = [239, 68, 68]
      else if (response.toLowerCase() === 'n/a') responseColor = [156, 163, 175]
      
      pdf.setTextColor(...responseColor)
      pdf.text(`Answer: ${response.toUpperCase()}`, margin + 7, yPosition)
      pdf.setTextColor(0, 0, 0)
      yPosition += 5
      
      // Show N/A reason if provided
      if (response.toLowerCase() === 'n/a' && audit.naReasons?.[question.id]) {
        pdf.setFontSize(9)
        pdf.setTextColor(100, 100, 100)
        const reasonLines = pdf.splitTextToSize(`N/A Reason: ${audit.naReasons[question.id]}`, contentWidth - 10)
        pdf.text(reasonLines, margin + 7, yPosition)
        pdf.setTextColor(0, 0, 0)
        pdf.setFontSize(10)
        yPosition += reasonLines.length * 4 + 2
      }
      
      // Show admin override if exists
      if (audit.overrideScores?.[question.id] !== undefined) {
        pdf.setFontSize(9)
        pdf.setTextColor(59, 130, 246)
        pdf.text(`Admin Override: ${audit.overrideScores[question.id]} points`, margin + 7, yPosition)
        if (audit.overrideNotes?.[question.id]) {
          yPosition += 4
          const noteLines = pdf.splitTextToSize(`Note: ${audit.overrideNotes[question.id]}`, contentWidth - 10)
          pdf.text(noteLines, margin + 7, yPosition)
          yPosition += noteLines.length * 4
        }
        pdf.setTextColor(0, 0, 0)
        pdf.setFontSize(10)
        yPosition += 2
      }
      
      // Show photos for this question
      const questionPhotos = audit.photos?.filter(p => p.questionId === question.id) || []
      if (questionPhotos.length > 0) {
        yPosition += 3
        pdf.setFontSize(9)
        pdf.setTextColor(59, 130, 246)
        pdf.text(`📷 ${questionPhotos.length} photo(s) attached`, margin + 7, yPosition)
        yPosition += 5
        
        // Display photos (max 2 per row)
        let xOffset = margin + 7
        let photoCount = 0
        const photoWidth = 40
        const photoHeight = 30
        
        for (const photo of questionPhotos.slice(0, 4)) { // Max 4 photos per question
          if (photoCount > 0 && photoCount % 2 === 0) {
            yPosition += photoHeight + 3
            xOffset = margin + 7
            checkPageBreak(photoHeight + 5)
          }
          
          try {
            const imageData = await loadImageAsBase64(photo.url)
            if (imageData) {
              pdf.addImage(imageData, 'JPEG', xOffset, yPosition, photoWidth, photoHeight)
            }
          } catch (error) {
            // If image fails to load, show placeholder
            pdf.setDrawColor(200, 200, 200)
            pdf.rect(xOffset, yPosition, photoWidth, photoHeight, 'S')
            pdf.setFontSize(8)
            pdf.text('Image unavailable', xOffset + 5, yPosition + 15)
            pdf.setFontSize(9)
          }
          
          xOffset += photoWidth + 5
          photoCount++
        }
        
        if (photoCount > 0) {
          yPosition += photoHeight + 3
        }
        
        pdf.setTextColor(0, 0, 0)
        pdf.setFontSize(10)
      }
      
      // Draw border around question box
      const questionEndY = yPosition + 2
      const questionHeight = questionEndY - questionStartY
      pdf.rect(margin + 2, questionStartY, contentWidth - 4, questionHeight, 'S')
      
      yPosition += 5
      questionNumber++
    }
    
    // Show section comments if any
    if (audit.sectionComments?.[section.id]) {
      checkPageBreak(15)
      yPosition += 3
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(59, 130, 246)
      pdf.text('Section Comments:', margin + 2, yPosition)
      yPosition += 5
      pdf.setFont('helvetica', 'normal')
      const commentLines = pdf.splitTextToSize(audit.sectionComments[section.id], contentWidth - 5)
      pdf.text(commentLines, margin + 2, yPosition)
      pdf.setTextColor(0, 0, 0)
      yPosition += commentLines.length * 4 + 5
    }
    
    // Show section photos if any
    const sectionPhotos = audit.sectionPhotos?.filter(p => p.sectionId === section.id) || []
    if (sectionPhotos.length > 0) {
      checkPageBreak(35)
      yPosition += 3
      pdf.setFontSize(9)
      pdf.setTextColor(59, 130, 246)
      pdf.text(`📷 Section Photos (${sectionPhotos.length})`, margin + 2, yPosition)
      yPosition += 5
      
      // Display section photos (max 2 per row)
      let xOffset = margin + 7
      let photoCount = 0
      const photoWidth = 40
      const photoHeight = 30
      
      for (const photo of sectionPhotos.slice(0, 4)) { // Max 4 photos per section
        if (photoCount > 0 && photoCount % 2 === 0) {
          yPosition += photoHeight + 3
          xOffset = margin + 7
          checkPageBreak(photoHeight + 5)
        }
        
        try {
          const imageData = await loadImageAsBase64(photo.url)
          if (imageData) {
            pdf.addImage(imageData, 'JPEG', xOffset, yPosition, photoWidth, photoHeight)
          }
        } catch (error) {
          pdf.setDrawColor(200, 200, 200)
          pdf.rect(xOffset, yPosition, photoWidth, photoHeight, 'S')
          pdf.setFontSize(8)
          pdf.text('Image unavailable', xOffset + 5, yPosition + 15)
          pdf.setFontSize(9)
        }
        
        xOffset += photoWidth + 5
        photoCount++
      }
      
      if (photoCount > 0) {
        yPosition += photoHeight + 3
      }
      
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(10)
    }
    
    yPosition += 8
  }
  
  // Audit Timeline/History
  checkPageBreak(40)
  yPosition += 10
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Audit Timeline', margin, yPosition)
  yPosition += 10
  
  // Timeline events
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  
  // Created
  pdf.text('• Created:', margin + 2, yPosition)
  pdf.text(new Date(audit.createdAt).toLocaleString(), margin + 30, yPosition)
  yPosition += 6
  
  // Submitted
  if (audit.submittedAt) {
    pdf.text('• Submitted:', margin + 2, yPosition)
    pdf.text(new Date(audit.submittedAt).toLocaleString(), margin + 30, yPosition)
    pdf.setTextColor(100, 100, 100)
    pdf.setFontSize(9)
    pdf.text(`by ${auditor.name || auditor.email}`, margin + 95, yPosition)
    pdf.setFontSize(10)
    pdf.setTextColor(0, 0, 0)
    yPosition += 6
  }
  
  // Approved
  if (audit.approvedAt) {
    pdf.setTextColor(34, 197, 94)
    pdf.text('• Approved:', margin + 2, yPosition)
    pdf.setTextColor(0, 0, 0)
    pdf.text(new Date(audit.approvedAt).toLocaleString(), margin + 30, yPosition)
    if (manager) {
      pdf.setTextColor(100, 100, 100)
      pdf.setFontSize(9)
      pdf.text(`by ${manager.name || manager.email}`, margin + 95, yPosition)
      pdf.setFontSize(10)
      pdf.setTextColor(0, 0, 0)
    }
    yPosition += 6
  }
  
  // Rejected
  if (audit.rejectedAt) {
    pdf.setTextColor(239, 68, 68)
    pdf.text('• Rejected:', margin + 2, yPosition)
    pdf.setTextColor(0, 0, 0)
    pdf.text(new Date(audit.rejectedAt).toLocaleString(), margin + 30, yPosition)
    if (manager) {
      pdf.setTextColor(100, 100, 100)
      pdf.setFontSize(9)
      pdf.text(`by ${manager.name || manager.email}`, margin + 95, yPosition)
      pdf.setFontSize(10)
      pdf.setTextColor(0, 0, 0)
    }
    yPosition += 6
  }
  
  yPosition += 8
  
  // Approval/Rejection Notes (if any) - Show prominently before signatures
  if (audit.approvalNote || audit.rejectionNote) {
    checkPageBreak(30)
    yPosition += 5
    
    const noteText = audit.approvalNote || audit.rejectionNote || ''
    const noteLines = pdf.splitTextToSize(noteText, contentWidth - 10)
    const noteHeight = noteLines.length * 5 + 17
    
    // Draw background box
    pdf.setFillColor(audit.approvalNote ? 240 : 254, audit.approvalNote ? 253 : 242, audit.approvalNote ? 244 : 242)
    pdf.rect(margin, yPosition, contentWidth, noteHeight, 'F')
    
    // Draw border
    pdf.setDrawColor(audit.approvalNote ? 34 : 239, audit.approvalNote ? 197 : 68, audit.approvalNote ? 94 : 68)
    pdf.setLineWidth(0.5)
    pdf.rect(margin, yPosition, contentWidth, noteHeight, 'S')
    pdf.setLineWidth(0.2)
    
    // Title
    yPosition += 7
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(audit.approvalNote ? 34 : 239, audit.approvalNote ? 197 : 68, audit.approvalNote ? 94 : 68)
    pdf.text(audit.approvalNote ? '✓ Approval Note' : '✗ Rejection Note', margin + 5, yPosition)
    pdf.setTextColor(0, 0, 0)
    
    // Note text
    yPosition += 6
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(noteLines, margin + 5, yPosition)
    yPosition += noteLines.length * 5 + 6
  }
  
  // Signatures section
  checkPageBreak(50)
  yPosition += 10
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Signatures & Approval', margin, yPosition)
  yPosition += 12
  
  // Draw signature boxes
  const signatureBoxWidth = (contentWidth - 5) / 2
  const signatureBoxHeight = 35
  
  // Auditor signature box
  pdf.setDrawColor(200, 200, 200)
  pdf.setFillColor(250, 250, 250)
  pdf.rect(margin, yPosition, signatureBoxWidth, signatureBoxHeight, 'FD')
  
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(100, 100, 100)
  pdf.text('AUDITOR', margin + 3, yPosition + 5)
  
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  pdf.text(auditor.name || auditor.email, margin + 3, yPosition + 12)
  
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(100, 100, 100)
  if (audit.submittedAt) {
    pdf.text(`Submitted: ${new Date(audit.submittedAt).toLocaleDateString()}`, margin + 3, yPosition + 18)
    pdf.text(`at ${new Date(audit.submittedAt).toLocaleTimeString()}`, margin + 3, yPosition + 23)
  } else {
    pdf.text('Not yet submitted', margin + 3, yPosition + 18)
  }
  
  // Manager signature box (if approved/rejected)
  if (manager && (audit.approvedBy || audit.rejectedBy)) {
    const managerBoxX = margin + signatureBoxWidth + 5
    pdf.rect(managerBoxX, yPosition, signatureBoxWidth, signatureBoxHeight, 'FD')
    
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    const managerLabel = audit.approvedAt ? 'APPROVED BY' : 'REJECTED BY'
    const labelColor: [number, number, number] = audit.approvedAt ? [34, 197, 94] : [239, 68, 68]
    pdf.setTextColor(...labelColor)
    pdf.text(managerLabel, managerBoxX + 3, yPosition + 5)
    
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text(manager.name || manager.email, managerBoxX + 3, yPosition + 12)
    
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 100, 100)
    const actionDate = audit.approvedAt || audit.rejectedAt
    if (actionDate) {
      pdf.text(`Date: ${new Date(actionDate).toLocaleDateString()}`, managerBoxX + 3, yPosition + 18)
      pdf.text(`at ${new Date(actionDate).toLocaleTimeString()}`, managerBoxX + 3, yPosition + 23)
    }
    
    // Show signature type/authority if available
    if (audit.approvalSignatureType) {
      pdf.setFontSize(8)
      pdf.text(`Signature: ${audit.approvalSignatureType}`, managerBoxX + 3, yPosition + 28)
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
