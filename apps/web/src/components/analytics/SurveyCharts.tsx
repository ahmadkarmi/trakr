import React, { useMemo } from 'react'
import Plot from 'react-plotly.js'
import { SurveyResultRow, QuestionAnalysis } from '../../types/analytics'
import { Survey } from '@trakr/shared'
import { format, parseISO } from 'date-fns'

interface SurveyChartsProps {
  survey: Survey
  results: SurveyResultRow[]
  activeChart: 'trends' | 'branches' | 'questions' | 'heatmap'
}

const SurveyCharts: React.FC<SurveyChartsProps> = ({ survey, results, activeChart }) => {
  // Compliance Trends Over Time
  const trendData = useMemo(() => {
    const grouped = results.reduce((acc, r) => {
      const date = format(parseISO(r.completedAt.toISOString()), 'yyyy-MM-dd')
      if (!acc[date]) acc[date] = []
      acc[date].push(r.complianceScore)
      return acc
    }, {} as Record<string, number[]>)

    const sorted = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
    
    return {
      dates: sorted.map(([date]) => date),
      scores: sorted.map(([, scores]) => 
        scores.reduce((sum, s) => sum + s, 0) / scores.length
      )
    }
  }, [results])

  // Branch Comparison
  const branchData = useMemo(() => {
    const grouped = results.reduce((acc, r) => {
      if (!acc[r.branchName]) acc[r.branchName] = []
      acc[r.branchName].push(r.complianceScore)
      return acc
    }, {} as Record<string, number[]>)

    const sorted = Object.entries(grouped)
      .map(([branch, scores]) => ({
        branch,
        avgScore: scores.reduce((sum, s) => sum + s, 0) / scores.length,
        count: scores.length
      }))
      .sort((a, b) => b.avgScore - a.avgScore)

    return {
      branches: sorted.map(b => b.branch),
      scores: sorted.map(b => b.avgScore),
      counts: sorted.map(b => b.count)
    }
  }, [results])

  // Question Analysis
  const questionData = useMemo(() => {
    const analysis: QuestionAnalysis[] = []
    
    survey.sections?.forEach(section => {
      section.questions?.forEach(q => {
        const responses = results.map(r => r[`q_${q.id}` as keyof SurveyResultRow])
        const total = responses.length
        const yesCount = responses.filter(r => r === 'yes').length
        const noCount = responses.filter(r => r === 'no').length
        const naCount = responses.filter(r => r === 'n/a').length
        
        analysis.push({
          questionId: q.id,
          questionText: q.text.substring(0, 50) + (q.text.length > 50 ? '...' : ''),
          sectionTitle: section.title,
          totalResponses: total,
          yesCount,
          noCount,
          naCount,
          passRate: total > 0 ? (yesCount / (yesCount + noCount)) * 100 : 0,
          trend: 'stable'
        })
      })
    })

    return analysis.sort((a, b) => a.passRate - b.passRate).slice(0, 10)
  }, [survey, results])

  // Heatmap Data
  const heatmapData = useMemo(() => {
    const branches = [...new Set(results.map(r => r.branchName))].sort()
    const questions = survey.sections?.flatMap(s => 
      s.questions?.map(q => ({ id: q.id, text: q.text.substring(0, 30) })) || []
    ) || []

    const matrix = questions.map(q => 
      branches.map(branch => {
        const branchResults = results.filter(r => r.branchName === branch)
        const yesCount = branchResults.filter(r => r[`q_${q.id}` as keyof SurveyResultRow] === 'yes').length
        const totalAnswered = branchResults.filter(r => {
          const val = r[`q_${q.id}` as keyof SurveyResultRow]
          return val === 'yes' || val === 'no'
        }).length
        return totalAnswered > 0 ? (yesCount / totalAnswered) * 100 : 0
      })
    )

    return {
      branches,
      questions: questions.map(q => q.text),
      matrix
    }
  }, [survey, results])

  if (activeChart === 'trends') {
    return (
      <Plot
        data={[
          {
            x: trendData.dates,
            y: trendData.scores,
            type: 'scatter',
            mode: 'lines+markers',
            marker: { color: '#3b82f6', size: 8 },
            line: { width: 3, shape: 'spline' },
            name: 'Compliance Score',
            hovertemplate: '<b>%{x}</b><br>Score: %{y:.1f}%<extra></extra>'
          }
        ]}
        layout={{
          title: { text: 'Compliance Trends Over Time' },
          xaxis: { title: { text: 'Date' } },
          yaxis: { title: { text: 'Average Score (%)' }, range: [0, 100] },
          hovermode: 'closest',
          height: 500,
          margin: { t: 50, r: 50, b: 80, l: 60 }
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          toImageButtonOptions: {
            format: 'png',
            filename: 'compliance-trends',
            height: 600,
            width: 1000,
          }
        }}
        style={{ width: '100%' }}
      />
    )
  }

  if (activeChart === 'branches') {
    return (
      <Plot
        data={[
          {
            x: branchData.scores,
            y: branchData.branches,
            type: 'bar',
            orientation: 'h',
            marker: {
              color: branchData.scores,
              colorscale: 'RdYlGn',
              cmin: 0,
              cmax: 100,
            },
            text: branchData.scores.map(s => `${s.toFixed(1)}%`),
            textposition: 'outside',
            hovertemplate: '<b>%{y}</b><br>Score: %{x:.1f}%<br>Audits: %{customdata}<extra></extra>',
            customdata: branchData.counts
          }
        ]}
        layout={{
          title: { text: 'Branch Performance Comparison' },
          xaxis: { title: { text: 'Average Compliance Score (%)' }, range: [0, 105] },
          yaxis: { title: { text: 'Branch' } },
          height: Math.max(400, branchData.branches.length * 40),
          margin: { t: 50, r: 50, b: 80, l: 200 }
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          toImageButtonOptions: {
            format: 'png',
            filename: 'branch-comparison',
            height: 800,
            width: 1200,
          }
        }}
        style={{ width: '100%' }}
      />
    )
  }

  if (activeChart === 'questions') {
    return (
      <Plot
        data={[
          {
            x: questionData.map(q => q.passRate),
            y: questionData.map(q => q.questionText),
            type: 'bar',
            orientation: 'h',
            marker: {
              color: questionData.map(q => q.passRate),
              colorscale: [[0, '#ef4444'], [0.5, '#fbbf24'], [1, '#22c55e']],
              cmin: 0,
              cmax: 100,
            },
            text: questionData.map(q => `${q.passRate.toFixed(1)}%`),
            textposition: 'outside',
            hovertemplate: '<b>%{y}</b><br>Pass Rate: %{x:.1f}%<extra></extra>'
          }
        ]}
        layout={{
          title: { text: 'Top 10 Lowest Scoring Questions' },
          xaxis: { title: { text: 'Pass Rate (%)' }, range: [0, 105] },
          yaxis: { title: { text: 'Question' } },
          height: 600,
          margin: { t: 50, r: 50, b: 80, l: 300 }
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          toImageButtonOptions: {
            format: 'png',
            filename: 'question-analysis',
            height: 800,
            width: 1200,
          }
        }}
        style={{ width: '100%' }}
      />
    )
  }

  if (activeChart === 'heatmap') {
    return (
      <Plot
        data={[{
          z: heatmapData.matrix,
          x: heatmapData.branches,
          y: heatmapData.questions,
          type: 'heatmap',
          colorscale: 'RdYlGn',
          zmin: 0,
          zmax: 100,
          hovertemplate: '<b>%{y}</b><br>Branch: %{x}<br>Pass Rate: %{z:.1f}%<extra></extra>',
          colorbar: {
            title: { text: 'Pass Rate (%)' },
            thickness: 20,
            len: 0.7
          }
        }]}
        layout={{
          title: { text: 'Branch × Question Performance Heatmap' },
          xaxis: { title: { text: 'Branch' }, side: 'bottom' },
          yaxis: { title: { text: 'Question' }, automargin: true },
          height: Math.max(600, heatmapData.questions.length * 25),
          margin: { t: 50, r: 150, b: 100, l: 250 }
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          toImageButtonOptions: {
            format: 'png',
            filename: 'performance-heatmap',
            height: 1200,
            width: 1600,
          }
        }}
        style={{ width: '100%' }}
      />
    )
  }

  return null
}

export default SurveyCharts
