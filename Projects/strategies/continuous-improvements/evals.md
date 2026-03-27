---
title: "Behavioral Evals: Continuous Improvements"
strategy_slug: "continuous-improvements"
generated: "2026-03-27"
jtbd_coverage:
  total_now_jtbds: 4
  jtbds_with_evals: 4
  coverage: 1.0
evals:
  - id: "eval-001"
    jtbd: "Capture ideas instantly"
    statement: "Builder captures ≥2 ideas per day via Discord, averaged over a week"
    type: "behavioral"
    score_type: "continuous"
    target: 0.85
    baseline: null
    measurement: "days_with_2plus_ideas / 7"
    success_criteria: "6 of 7 days meet the 2-idea threshold for 2 consecutive weeks"
    grader: "code"
    quality_tier: 2
    negative_cases:
      - statement: "Ideas go into the void — captured but <50% receive an enrichment thread within 1 hour"
        expected_score: 0.2
  - id: "eval-002"
    jtbd: "Enrich ideas through conversation"
    statement: "Builder voluntarily extends enrichment threads beyond the system's initial questions, averaging ≥5 total exchanges per idea"
    type: "behavioral"
    score_type: "continuous"
    target: 0.70
    baseline: null
    measurement: "threads_with_5plus_exchanges / total_enrichment_threads"
    success_criteria: "70% of enrichment threads reach ≥5 exchanges for 2 consecutive weeks"
    grader: "code"
    quality_tier: 2
    negative_cases:
      - statement: "Scattered, no story — enrichment threads complete but <30% of graduated hypotheses reference the workstream's goal.md direction"
        expected_score: 0.2
  - id: "eval-003"
    jtbd: "Execute experiments on a heartbeat"
    statement: "Experiment results trigger new idea capture — builder logs ≥1 new idea within 4 hours of reviewing results, on days when experiments ran"
    type: "behavioral"
    score_type: "continuous"
    target: 0.60
    baseline: null
    measurement: "days_with_followon_idea / days_with_experiment_results"
    success_criteria: "60% of experiment-run days produce a follow-on idea for 2 consecutive weeks"
    grader: "code"
    quality_tier: 2
    negative_cases:
      - statement: "Agent hallucinated the fix — experiment ships but builder marks it 'wouldn't care if reverted' during evening review"
        expected_score: 0.1
  - id: "eval-004"
    jtbd: "Review results with confidence"
    statement: "Builder clicks through to the product AND provides qualitative feedback on ≥70% of experiment results during evening review"
    type: "behavioral"
    score_type: "continuous"
    target: 0.70
    baseline: null
    measurement: "results_with_clickthrough_and_feedback / total_experiment_results"
    success_criteria: "70% of experiment results get both a click-through and feedback for 2 consecutive weeks"
    grader: "code"
    quality_tier: 2
    negative_cases: []
leading_indicators:
  primary:
    - id: "li-001"
      name: "Experiment ship rate"
      jtbd_link: "Execute experiments on a heartbeat"
      target: 0.60
      measurement: "shipped_experiments / heartbeat_runs_this_week"
      grader: "code"
    - id: "li-002"
      name: "Idea-to-experiment latency"
      jtbd_link: "Capture ideas instantly + Enrich through conversation"
      target: 0.80
      measurement: "ideas_experimented_within_5_days / total_graduated_ideas"
      grader: "code"
  secondary:
    - id: "li-003"
      name: "Autonomy ratio"
      target: 0.80
      measurement: "1 - (runs_needing_human / total_runs)"
      grader: "code"
guardrails:
  - id: "guard-001"
    source: "no-go"
    statement: "Eval definitions must exist in exactly one place (evals.md / evals.json). goal.md, CLAUDE.md, and ideas-backlog.md must never contain eval targets, measurements, or scoring formulas."
    fail_condition: "Any eval metric, target, or measurement formula found in goal.md or CLAUDE.md"
  - id: "guard-002"
    source: "architecture"
    statement: "Every shipped experiment must be revertable from the dashboard with a single click. Granular revert (per-change within an experiment) must be available when an experiment touched multiple things."
    fail_condition: "An experiment exists in the dashboard without a working revert action, OR revert requires terminal access"
---

# Behavioral Evals: Continuous Improvements

**Strategy:** Continuous Improvements
**Generated:** 2026-03-27
**Status:** Complete

---

## JTBD 1: Capture ideas instantly

**Eval: Daily capture frequency**

Builder captures at least 2 ideas per day via Discord, sustained over a typical week. This measures whether Discord has replaced Todoist as the default capture channel. The emotional dimension — relief, cognitive debt eliminated — shows up as consistency: if capture feels good, you keep doing it.

- **Target:** 0.85 (6 of 7 days)
- **Baseline:** null (new product)
- **Measurement:** `days_with_2plus_ideas / 7`
- **Success criteria:** Target met for 2 consecutive weeks
- **Grader:** code-based (count Discord messages tagged as ideas per day)
- **Quality:** Tier 2 (behavioral signal)

**Negative case:** Ideas go into the void — captured but fewer than 50% receive an enrichment thread within 1 hour. Score: 0.2. Technically passing capture, but the pipeline is broken.

---

## JTBD 2: Enrich ideas through conversation

**Eval: Thread depth**

Builder voluntarily extends enrichment threads beyond the system's initial questions, averaging 5+ total exchanges per idea. Bad questions get short answers. Good questions unlock depth. Thread length is the honest measure of question quality — you keep going because the conversation is opening up real insight, not because the system demands it.

- **Target:** 0.70 (70% of threads reach ≥5 exchanges)
- **Baseline:** null (new product)
- **Measurement:** `threads_with_5plus_exchanges / total_enrichment_threads`
- **Success criteria:** Target met for 2 consecutive weeks
- **Grader:** code-based (count message pairs per thread)
- **Quality:** Tier 2 (behavioral signal)

**Negative case:** Scattered, no story — enrichment threads complete but fewer than 30% of graduated hypotheses reference the workstream's goal.md direction. Score: 0.2. Conversation happened but lacked strategic coherence.

---

## JTBD 3: Execute experiments on a heartbeat

**Eval: Inspiration loop**

Experiment results trigger new idea capture. Builder logs at least 1 new idea within 4 hours of reviewing results, on days when experiments ran. This measures whether the execution engine produces something interesting enough to spark new thinking — the output of execution becomes the input for capture. The 4-hour window captures the evening review → new idea pattern.

- **Target:** 0.60 (60% of experiment-run days)
- **Baseline:** null (new product)
- **Measurement:** `days_with_followon_idea / days_with_experiment_results`
- **Success criteria:** Target met for 2 consecutive weeks
- **Grader:** code-based (idea captured within 4 hours of results written to Supabase)
- **Quality:** Tier 2 (behavioral signal)

**Negative case:** Agent hallucinated the fix — experiment ships but builder marks it "wouldn't care if reverted" during evening review. Score: 0.1. Eval delta might even be positive, but the improvement was accidental, not intentional.

---

## JTBD 4: Review results with confidence

**Eval: Active review engagement**

Builder clicks through to the product AND provides qualitative feedback (Sean Ellis-style) on 70%+ of experiment results during evening review. This measures whether the review surface is rich enough to engage with — narrative explanation of why it improved, direct link to try it, and immediate feedback capture.

- **Target:** 0.70 (70% of results get click-through + feedback)
- **Baseline:** null (new product)
- **Measurement:** `results_with_clickthrough_and_feedback / total_experiment_results`
- **Success criteria:** Target met for 2 consecutive weeks
- **Grader:** code-based (click event + feedback submission within same review session)
- **Quality:** Tier 2 (behavioral signal) with Tier 3 component (Sean Ellis is self-report)

---

## Leading Indicators

### Primary

**Experiment ship rate** (tied to Execute JTBD)
At least 3 experiments ship (merge with positive eval delta) per week per workstream. The most direct signal that the execution engine is producing value.

- **Target:** 0.60 (3 of 5 weekday heartbeats produce a shipped improvement)
- **Measurement:** `shipped_experiments / heartbeat_runs_this_week`
- **Grader:** code (Supabase query: experiments with status=shipped this week)

**Idea-to-experiment latency** (tied to Capture + Enrich)
Median time from idea capture to experiment execution is 5 days or less. The pipeline is flowing — ideas don't stall in the backlog.

- **Target:** 0.80 (80% of graduated ideas experimented on within 5 days)
- **Measurement:** `ideas_experimented_within_5_days / total_graduated_ideas`
- **Grader:** code (timestamp diff: idea capture → experiment start)

### Secondary

**Autonomy ratio** (system health)
80%+ of heartbeat runs complete without human-in-the-loop intervention. Measures the "low touch" feeling — the system runs itself.

- **Target:** 0.80
- **Measurement:** `1 - (runs_needing_human / total_runs)`
- **Grader:** code (count HITL requests vs. total runs)

---

## Guardrails

**No eval duplication**
Eval definitions must exist in exactly one place (`evals.md` / `evals.json`). `goal.md`, `CLAUDE.md`, and `ideas-backlog.md` must never contain eval targets, measurements, or scoring formulas.

- **Fail condition:** Any eval metric, target, or measurement formula found in goal.md or CLAUDE.md
- **Grader:** code (grep for eval patterns in non-eval files)

**One-click revert**
Every shipped experiment must be revertable from the dashboard with a single click. Granular revert (per-change within an experiment) must be available when an experiment touched multiple things. Revert triggers Claude Code to make the actual changes.

- **Fail condition:** An experiment exists in the dashboard without a working revert action, OR revert requires terminal access
- **Grader:** code (dashboard renders revert button for every shipped experiment; revert action triggers Claude Code)
