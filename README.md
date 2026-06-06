# qa-genai-evaluator

> LLM output evaluation framework for QA — measuring consistency, completeness
> and validity of AI-generated tests across multiple generations.

**Author:** N'Koy Otshudi — [nkoyotshudi.fr](https://nkoyotshudi.fr)  
**Stack:** TypeScript · Anthropic Claude Sonnet · HTML Reports  
**Certification context:** ISTQB CT-GenAI Ch.3 & Ch.4 (in progress)

---

## The problem this solves

When you generate tests with an LLM, how do you know the output is good?
Two generations of the same prompt can produce different results — different
structure, different coverage, different quality.

This framework **measures** that variability with three metrics:

| Metric | Question answered | CT-GenAI |
|--------|------------------|----------|
| **Validity** | Is the generated code structurally correct? | Ch.2 |
| **Completeness** | Does it cover all acceptance criteria? | Ch.3 |
| **Consistency** | Are results stable across N generations? | Ch.3 & Ch.4 |

---

## How it works

User Story (Markdown)
│
▼
evaluator.ts
(N × Claude Sonnet API calls)
│
▼
metrics.ts
(validity + completeness per generation)
│
▼
consistency analysis
(across all generations)
│
▼
report.ts
(HTML dashboard)

**Real calibration example from this project:**

| Run | Validity | Finding |
|-----|----------|---------|
| Before fix | 33% | Claude wrapped output in markdown fences |
| After fix | 100% | Prompt strengthened + output cleaned |

---

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/otshudi-n-koy/qa-genai-evaluator.git
cd qa-genai-evaluator
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: add your ANTHROPIC_API_KEY and GENERATION_COUNT

# 3. Run evaluation
npx ts-node --project tsconfig.json src/evaluator.ts examples/user-stories/US_001_create_task.md

# 4. Generate HTML report
npx ts-node --project tsconfig.json src/report.ts reports/US_001_create_task_evaluation.json

# 5. Open the report
start reports/US_001_create_task_evaluation.html  # Windows
open reports/US_001_create_task_evaluation.html   # macOS
```

---

## Project structure

```
qa-genai-evaluator/
├── .github/
│   └── agents/
│       └── qa-evaluator-agent.md   # Copilot agent for metric interpretation
├── src/
│   ├── evaluator.ts                # Orchestrates N generations + evaluation
│   ├── metrics.ts                  # Validity, completeness, consistency
│   └── report.ts                   # HTML report generator
├── examples/
│   └── user-stories/
│       └── US_001_create_task.md   # Sample input
├── reports/                        # Generated JSON + HTML reports
└── .env.example
```

---

## Reading the report

The HTML report shows three key indicators:

- 🟢 **Validity 100%** — all generations are structurally valid TypeScript
- 🟢 **Completeness 100%** — all ACs covered in every generation
- 🟢 **AC Stability 100%** — same ACs covered consistently across generations

An advisory warning (⚠️) on a generation means the code works but could be
improved — e.g. missing `data-testid` selectors or Arrange/Act/Assert comments.

---

## Related projects

- [qa-genai-toolkit](https://github.com/otshudi-n-koy/qa-genai-toolkit) — LLM-assisted test generation from User Stories
- [qa-mcp-playwright](https://github.com/otshudi-n-koy/qa-mcp-playwright) — MCP Playwright + Jira integration

---

## References

- [ISTQB CT-GenAI Syllabus](https://istqb.org)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [Playwright Documentation](https://playwright.dev)