/**
 * metrics.ts
 * 
 * Defines evaluation metrics for LLM-generated test files.
 * 
 * Three metrics aligned with ISTQB CT-GenAI Ch.3 and Ch.4:
 * - Validity    : is the generated code syntactically valid TypeScript?
 * - Completeness: does it cover all acceptance criteria from the User Story?
 * - Consistency : across N generations, are the results stable?
 */

export interface EvaluationResult {
  generationIndex: number;
  code: string;
  metrics: {
    validity: ValidityMetric;
    completeness: CompletenessMetric;
  };
}

export interface ValidityMetric {
  score: number;        // 0 or 1
  passed: boolean;
  details: string;
}

export interface CompletenessMetric {
  score: number;        // 0.0 to 1.0
  coveredACs: string[];
  missingACs: string[];
  details: string;
}

export interface ConsistencyReport {
  totalGenerations: number;
  validityRate: number;       // % of generations that are valid TS
  avgCompleteness: number;    // average completeness score across generations
  acCoverageStability: number; // % of ACs covered in ALL generations
  details: string[];
}

// ── Validity ────────────────────────────────────────────────────────────────

export function evaluateValidity(code: string): ValidityMetric {
  const checks = [
    {
      pattern: /import\s+{.*}\s+from\s+['"]@playwright\/test['"]/,
      label: 'Playwright import',
      weight: 'critical' as const,
    },
    {
      pattern: /test\.describe\s*\(/,
      label: 'test.describe block',
      weight: 'critical' as const,
    },
    {
      pattern: /test\s*\(/,
      label: 'at least one test()',
      weight: 'critical' as const,
    },
    {
      pattern: /expect\s*\(/,
      label: 'at least one expect()',
      weight: 'critical' as const,
    },
    {
      // Détecte markdown fences — signe que Claude n'a pas suivi la consigne "no markdown"
      pattern: /^(?!.*```)/s,
      label: 'no markdown fences in output',
      weight: 'critical' as const,
    },
    {
      // AAA commentaires — souhaitable mais pas bloquant
      pattern: /\/\/\s*Arrange|\/\/\s*Act|\/\/\s*Assert/,
      label: 'Arrange/Act/Assert pattern',
      weight: 'advisory' as const,
    },
    {
      // POM ou sélecteurs data-testid — bonne pratique
      pattern: /data-testid|TodoPage/,
      label: 'data-testid or Page Object used',
      weight: 'advisory' as const,
    },
  ];

  const criticalFailed = checks.filter(
    c => c.weight === 'critical' && !c.pattern.test(code)
  );
  const advisoryFailed = checks.filter(
    c => c.weight === 'advisory' && !c.pattern.test(code)
  );

  const passed = criticalFailed.length === 0;

  const details = [
    passed ? '✅ All critical checks passed' : `❌ Critical: ${criticalFailed.map(f => f.label).join(', ')}`,
    advisoryFailed.length > 0
      ? `⚠️  Advisory: ${advisoryFailed.map(f => f.label).join(', ')}`
      : '✅ All advisory checks passed',
  ].join(' | ');

  return {
    score: passed ? 1 : 0,
    passed,
    details,
  };
}

// ── Completeness ─────────────────────────────────────────────────────────────

export function evaluateCompleteness(
  code: string,
  acceptanceCriteria: string[]
): CompletenessMetric {
  const coveredACs: string[] = [];
  const missingACs: string[] = [];

  for (const ac of acceptanceCriteria) {
    // Extract keywords from the AC and check if they appear in the generated code
    const keywords = extractKeywords(ac);
    const isCovered = keywords.some(kw =>
      code.toLowerCase().includes(kw.toLowerCase())
    );

    if (isCovered) {
      coveredACs.push(ac);
    } else {
      missingACs.push(ac);
    }
  }

  const score = coveredACs.length / acceptanceCriteria.length;

  return {
    score,
    coveredACs,
    missingACs,
    details: `${coveredACs.length}/${acceptanceCriteria.length} ACs covered (${Math.round(score * 100)}%)`,
  };
}

// ── Consistency ──────────────────────────────────────────────────────────────

export function evaluateConsistency(
  results: EvaluationResult[]
): ConsistencyReport {
  const totalGenerations = results.length;

  // Validity rate
  const validCount = results.filter(r => r.metrics.validity.passed).length;
  const validityRate = validCount / totalGenerations;

  // Average completeness
  const avgCompleteness =
    results.reduce((sum, r) => sum + r.metrics.completeness.score, 0) /
    totalGenerations;

  // AC coverage stability — ACs covered in ALL generations
  const allACs = results[0]?.metrics.completeness.coveredACs ?? [];
  const stableACs = allACs.filter(ac =>
    results.every(r => r.metrics.completeness.coveredACs.includes(ac))
  );
  const totalACs =
    (results[0]?.metrics.completeness.coveredACs.length ?? 0) +
    (results[0]?.metrics.completeness.missingACs.length ?? 0);

  const acCoverageStability = totalACs > 0 ? stableACs.length / totalACs : 0;

  const details = results.map(
    r =>
      `Gen ${r.generationIndex + 1}: validity=${r.metrics.validity.passed ? '✅' : '❌'} completeness=${Math.round(r.metrics.completeness.score * 100)}%`
  );

  return {
    totalGenerations,
    validityRate,
    avgCompleteness,
    acCoverageStability,
    details,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractKeywords(ac: string): string[] {
  // Remove common words, keep meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'can', 'by', 'with',
    'and', 'or', 'if', 'in', 'to', 'of', 'for', 'be',
    'user', 'should', 'must', 'will',
  ]);

  return ac
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}