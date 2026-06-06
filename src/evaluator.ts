/**
 * evaluator.ts
 *
 * Orchestrates N generations of the same User Story
 * and evaluates each output using metrics.ts.
 *
 * Usage:
 *   npx ts-node src/evaluator.ts examples/user-stories/US_001_create_task.md
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: require('path').join(__dirname, '../.env') });

import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import {
  EvaluationResult,
  evaluateValidity,
  evaluateCompleteness,
  evaluateConsistency,
} from './metrics';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GENERATION_COUNT = parseInt(process.env.GENERATION_COUNT ?? '3', 10);

// ── Acceptance Criteria extracted from US format ─────────────────────────────

function extractACs(userStory: string): string[] {
  const lines = userStory.split('\n');
  const acs: string[] = [];
  let inACSection = false;

  for (const line of lines) {
    if (/acceptance criteria/i.test(line)) {
      inACSection = true;
      continue;
    }
    if (inACSection && line.startsWith('##')) {
      inACSection = false;
    }
    if (inACSection) {
      const match = line.match(/^\s*[-*]\s+\*\*AC\d+.*?\*\*:?\s*(.+)/);
      if (match) acs.push(match[1].trim());
    }
  }

  return acs;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(userStory: string): string {
  return `You are a QA Automation engineer. Generate a complete Playwright TypeScript test file from this User Story.

CRITICAL OUTPUT RULES — MUST FOLLOW:
- Output RAW TypeScript code ONLY
- Do NOT wrap in markdown code fences (\`\`\`typescript or \`\`\`)
- Do NOT include any explanation, preamble, or commentary
- First line of output must be: import { test, expect } from '@playwright/test';

Test rules:
- Structure tests with test.describe and test() blocks
- Follow Arrange → Act → Assert pattern with // Arrange // Act // Assert comments
- Cover all acceptance criteria
- Include both happy path and negative tests

User Story:
---
${userStory}
---`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function stripMarkdownFences(code: string): string {
  return code
    .replace(/^```typescript\n?/m, '')
    .replace(/^```\n?/m, '')
    .replace(/```$/m, '')
    .trim();
}

export async function runEvaluation(userStoryPath: string): Promise<void> {
  if (!fs.existsSync(userStoryPath)) {
    console.error(`❌ File not found: ${userStoryPath}`);
    process.exit(1);
  }

  const userStory = fs.readFileSync(userStoryPath, 'utf-8');
  const acs = extractACs(userStory);
  const usFilename = path.basename(userStoryPath, '.md');

  console.log(`\n🔬 Evaluating: ${usFilename}`);
  console.log(`📋 Acceptance Criteria found: ${acs.length}`);
  console.log(`🔁 Generations: ${GENERATION_COUNT}\n`);

  if (acs.length === 0) {
    console.warn('⚠️  No ACs found — check your US format (look for **ACn** pattern)');
  }

  const results: EvaluationResult[] = [];

  for (let i = 0; i < GENERATION_COUNT; i++) {
    console.log(`📡 Generation ${i + 1}/${GENERATION_COUNT}...`);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: buildPrompt(userStory) }],
    });

    const rawCode = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n');

    const code = stripMarkdownFences(rawCode);

    const result: EvaluationResult = {
      generationIndex: i,
      code,
      metrics: {
        validity: evaluateValidity(code),
        completeness: evaluateCompleteness(code, acs),
      },
    };

    results.push(result);
    console.log(`   validity=${result.metrics.validity.passed ? '✅' : '❌'} completeness=${Math.round(result.metrics.completeness.score * 100)}%`);
  }

  const consistency = evaluateConsistency(results);

  // Save results
  const outputDir = path.join(__dirname, '../reports');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${usFilename}_evaluation.json`);
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ usFilename, acs, results, consistency }, null, 2),
    'utf-8'
  );

  console.log(`\n✅ Evaluation complete`);
  console.log(`📊 Validity rate     : ${Math.round(consistency.validityRate * 100)}%`);
  console.log(`📊 Avg completeness  : ${Math.round(consistency.avgCompleteness * 100)}%`);
  console.log(`📊 AC stability      : ${Math.round(consistency.acCoverageStability * 100)}%`);
  console.log(`\n💾 Results saved: ${outputPath}`);
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const userStoryFile = args[0];

if (!userStoryFile) {
  console.error('Usage: npx ts-node src/evaluator.ts <user-story.md>');
  process.exit(1);
}

runEvaluation(path.resolve(userStoryFile)).catch(err => {
  console.error('❌ Evaluation failed:', err.message);
  process.exit(1);
});