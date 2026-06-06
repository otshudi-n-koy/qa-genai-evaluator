/**
 * report.ts
 *
 * Generates an HTML report from evaluation results.
 *
 * Usage:
 *   npx ts-node src/report.ts reports/US_001_create_task_evaluation.json
 */

import fs from 'fs';
import path from 'path';

interface EvaluationData {
  usFilename: string;
  acs: string[];
  results: Array<{
    generationIndex: number;
    metrics: {
      validity: { passed: boolean; details: string };
      completeness: { score: number; coveredACs: string[]; missingACs: string[] };
    };
  }>;
  consistency: {
    totalGenerations: number;
    validityRate: number;
    avgCompleteness: number;
    acCoverageStability: number;
    details: string[];
  };
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function scoreColor(value: number): string {
  if (value >= 0.8) return '#22c55e';
  if (value >= 0.5) return '#f59e0b';
  return '#ef4444';
}

function generateHTML(data: EvaluationData): string {
  const { usFilename, acs, results, consistency } = data;

  const generationRows = results.map(r => `
    <tr>
      <td>Gen ${r.generationIndex + 1}</td>
      <td style="color:${r.metrics.validity.passed ? '#22c55e' : '#ef4444'}">
        ${r.metrics.validity.passed ? '✅ PASS' : '❌ FAIL'}
      </td>
      <td style="color:${scoreColor(r.metrics.completeness.score)}">
        ${pct(r.metrics.completeness.score)}
      </td>
      <td style="font-size:12px;color:#94a3b8">${r.metrics.validity.details}</td>
    </tr>
  `).join('');

  const acRows = acs.map(ac => {
    const coveredInAll = results.every(r =>
      r.metrics.completeness.coveredACs.includes(ac)
    );
    const coveredInSome = results.some(r =>
      r.metrics.completeness.coveredACs.includes(ac)
    );
    const status = coveredInAll ? '✅ Stable' : coveredInSome ? '⚠️ Unstable' : '❌ Missing';
    const color = coveredInAll ? '#22c55e' : coveredInSome ? '#f59e0b' : '#ef4444';
    return `
      <tr>
        <td style="font-size:13px">${ac}</td>
        <td style="color:${color};font-weight:500">${status}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>QA GenAI Evaluation — ${usFilename}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0f172a; color: #e2e8f0; padding: 32px; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 32px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; }
    .card-label { font-size: 12px; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; }
    .card-value { font-size: 36px; font-weight: 700; }
    .card-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    section { background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    h2 { font-size: 16px; margin-bottom: 16px; color: #94a3b8; text-transform: uppercase;
         letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 12px; color: #64748b; padding: 8px;
         border-bottom: 1px solid #334155; }
    td { padding: 10px 8px; border-bottom: 1px solid #1e293b; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 99px;
             font-size: 12px; font-weight: 500; }
    .footer { color: #475569; font-size: 12px; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <h1>QA GenAI Evaluation Report</h1>
  <p class="subtitle">User Story: ${usFilename} · ${consistency.totalGenerations} generations · ISTQB CT-GenAI Ch.3 & Ch.4</p>

  <div class="grid">
    <div class="card">
      <div class="card-label">Validity Rate</div>
      <div class="card-value" style="color:${scoreColor(consistency.validityRate)}">
        ${pct(consistency.validityRate)}
      </div>
      <div class="card-sub">Structurally valid generations</div>
    </div>
    <div class="card">
      <div class="card-label">Avg Completeness</div>
      <div class="card-value" style="color:${scoreColor(consistency.avgCompleteness)}">
        ${pct(consistency.avgCompleteness)}
      </div>
      <div class="card-sub">AC coverage per generation</div>
    </div>
    <div class="card">
      <div class="card-label">AC Stability</div>
      <div class="card-value" style="color:${scoreColor(consistency.acCoverageStability)}">
        ${pct(consistency.acCoverageStability)}
      </div>
      <div class="card-sub">ACs covered in all generations</div>
    </div>
  </div>

  <section>
    <h2>Generation Details</h2>
    <table>
      <tr>
        <th>Generation</th>
        <th>Validity</th>
        <th>Completeness</th>
        <th>Details</th>
      </tr>
      ${generationRows}
    </table>
  </section>

  <section>
    <h2>Acceptance Criteria Coverage</h2>
    <table>
      <tr>
        <th>Acceptance Criterion</th>
        <th>Stability</th>
      </tr>
      ${acRows}
    </table>
  </section>

  <p class="footer">Generated by qa-genai-evaluator · Author: N'Koy Otshudi · nkoyotshudi.fr</p>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const jsonPath = args[0];

if (!jsonPath) {
  console.error('Usage: npx ts-node src/report.ts <evaluation.json>');
  process.exit(1);
}

const data: EvaluationData = JSON.parse(fs.readFileSync(path.resolve(jsonPath), 'utf-8'));
const html = generateHTML(data);

const outputPath = jsonPath.replace('.json', '.html');
fs.writeFileSync(outputPath, html, 'utf-8');

console.log(`✅ Report generated: ${outputPath}`);