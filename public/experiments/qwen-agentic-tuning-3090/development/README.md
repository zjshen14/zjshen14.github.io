# Qwen agentic tuning on an RTX 3090: development evidence

These historical development records show **5/24, 14/24, 20/24 and 23/24**
functional and delivered successes at medium/8K, medium/16K, medium/32K and
xhigh/32K respectively. The targeted temperature-0.8 round completed with
**5/6 functional and 4/6 delivered successes**, versus **5/6 for both metrics**
in its reused temperature-1.0 controls. These are observations on repeated
development cases, not an overall winner or a causal estimate.

This package concerns development only. It contains no confirmation cases or
results and makes no statement about confirmation progress or completion.

## Read or check the data

- [protocol.json](protocol.json): exact cohort memberships, profiles, task
  summaries, technical identity, repeat policy and inventory counts.
- [attempts.json](attempts.json) and [attempts.csv](attempts.csv): one record per
  distinct completed attempt, stopped attempt, configuration preflight or
  cancelled planned slot. Failed attempts are retained.
- [aggregates.json](aggregates.json): cohort totals, per-case totals, paired
  transitions and separately classified excluded records.
- [aggregates.csv](aggregates.csv): cohort and separate-group totals. Nested
  per-case and paired tables are in JSON.
- [check.py](check.py) and [SHA256SUMS](SHA256SUMS): standalone aggregation and
  integrity checks, requiring only Python 3.10 or later and its standard library.

Download all eight files into one directory, then run:

```sh
python3 check.py
```

The checker resolves files relative to itself, needs no network or model, and
writes nothing. It verifies every listed checksum, JSON/CSV parity, inventory,
cohort membership, case/repeat pairing, grade-to-score formulas, totals,
medians and paired transitions. A missing, changed or unexpected file fails
validation. CSV booleans are `true`/`false`; empty cells represent JSON `null`;
nested grade, turn and count objects are compact JSON in quoted CSV cells.

**Reproduction scope: results aggregation only.** This export does not include
fixtures, prompts, candidate patches, raw sessions, private tests or the full
inference/grading harness. It cannot reproduce inference, rerun grading, verify
the accuracy of final handoffs, or independently establish the truth of source
records. Checksums detect changes relative to this package; they do not prove
authenticity if data and checksums are changed together. Source reconciliation
requires the private audit receipts retained for independent review.

## Results and denominators

| Cohort | Attempts | Functional | Delivered | Median attempt seconds |
| --- | ---: | ---: | ---: | ---: |
| Medium, 8192 output tokens | 24 | 5 | 5 | 245.5435 |
| Medium, 16384 output tokens | 24 | 14 | 14 | 527.506 |
| Medium, 32768 output tokens | 24 | 20 | 20 | 586.5995 |
| Xhigh, 32768 output tokens | 24 | 23 | 23 | 775.7825 |
| Xhigh/32768, targeted temperature 0.8 | 6 | 5 | 4 | 1171.476 |
| Xhigh/32768, reused temperature 1.0 subset | 6 | 5 | 5 | 972.4515 |

Source: `aggregates.json`, `cohorts`. The last row is already included in the
xhigh/32768 row. The five newly measured cohorts contain **102 unique
attempts**, not 108. Medians include failures; the table rounds one binary
floating-point median for display. JSON retains the computed numeric value.

Each 24-attempt cohort is eight cases times three paired repeats. Functional
and delivered successes coincide in these four cohorts:

| Case | Medium/8K | Medium/16K | Medium/32K | Xhigh/32K |
| --- | ---: | ---: | ---: | ---: |
| cache | 1 | 3 | 3 | 3 |
| wallet | 1 | 2 | 3 | 3 |
| eventstream | 0 | 2 | 3 | 3 |
| boltons_paths | 3 | 3 | 3 | 3 |
| async_pool | 0 | 3 | 3 | 3 |
| ledger | 0 | 0 | 0 | 2 |
| pagination | 0 | 0 | 2 | 3 |
| buildplan | 0 | 1 | 3 | 3 |

Source: `aggregates.json`, `cohorts.*.by_case`. Each cell is out of three, not
a count of independent repositories or tests.

Matched case/repeat transitions show nine improvements and zero regressions
from 8K to 16K, six and zero from 16K to 32K, and three and zero from medium to
xhigh at 32K, for both metrics. Temperature 0.8 versus its reused 1.0 subset
shows one functional improvement and one regression; for delivery it shows
one improvement and two regressions. Source: `aggregates.json`, `paired`.
Here “candidate” means the right-hand cohort in the named comparison, not an
endorsement or an adopted winner.

## What counts as success

The scoring unit is an attempt on one case and one repeat. All eight exported
development tasks require **one turn**. The registered quality budget is
1800 seconds, 65536 generated tokens and 120 tool calls per attempt. Output
limits of 8192/16384/32768 apply per response, including reasoning and
tool/final output; they are different from the total attempt token budget.

The source runner records phase-one and final grading separately. A grade is
solved when no protected file was changed, no starter file is missing, and
every required check group succeeds. Python groups are `acceptance`,
`regression`, `public` and `syntax`; TypeScript groups are `acceptance`,
`regression`, `public`, `typecheck` and `consumer_typecheck`. Acceptance and
regression checks are predefined independent grader checks outside the agent
workspace. “Independent” here describes the grading boundary; correlated
test methods are not independent statistical samples.

**Functional success** requires solved phase-one and final grades plus an
unchanged agent configuration. **Delivered success** additionally requires
the expected number of turns, and every turn must have `termination ==
"completed"`, exit code zero, nonempty final text after tools, the last
recognized agent test validation passing, and the last recognized typecheck
passing for TypeScript. Python does not require an observed typecheck.

The checker recomputes grades from exported check booleans and integrity
counts, then both outcomes from grades and turn fields. It does not rerun
tests. `has_final_text_after_tools` is only a presence flag, not proof that
the handoff accurately describes the patch. `finish_reasons` preserves
recorded provider-step labels; it is not the process termination criterion.
`tool_error_count` retains the number of recorded tool errors without their
potentially private content. An error need not invalidate an eventually
successful attempt.

Budget monitoring can overshoot a cap between observations or by one
response. The recorded formula uses the runner's termination classification;
it does not add a new post hoc elapsed-time cutoff. Relative `seconds` is the
sum of recorded turn durations, covering the agent process, model and tool
work and turn instrumentation, excluding server startup, between-attempt
rests and independent grading. Native output tokens are server counter
deltas; OpenCode output tokens are its reported usage. They may differ and
are retained separately. No speed claim is based on these totals.

Three inspectable examples in `attempts.json`:

- `a0100`: ledger, repeat-2, temperature 0.8. Both grades solved, functional
  success true, but a 1800.017-second wall-time stop, exit code -15 and no
  final text make delivered success false.
- `a0101`: ledger, repeat-3, temperature 0.8. Normal exit, observed passing
  tests and final text do not override failed acceptance checks. Both
  success metrics are false.
- `a0060`: ledger, repeat-2, medium/32K. A 1800.189-second wall-time stop
  remains a scored functional and delivery failure, not an infrastructure
  exclusion.

## Cohort selection and separate records

`protocol.json` lists each cohort's attempt IDs in the source plan's order.
IDs are opaque labels and do not encode source names, dates or a global run
chronology. The first complete 24-attempt medium/8K baseline is the selected
control. A later protocol amendment retained that full baseline rather than
choosing the best result among duplicate 8K attempts.

The 16K cohort includes the registered successful replacement `a0038` for
boltons_paths/repeat-2. Its three predecessors are retained as unscored
infrastructure records: a GPU fault, a sandbox setup failure before inference,
and interruption at the historical temperature cutoff. Replacement selection
follows the amendment, not retrospective best-of scoring. A historical stale
lookup omitted the replacement; the complete resolved cohort is 24, not 23.

The six temperature-0.8 attempts cover ledger and pagination three times each,
selected after failures in earlier tuning. Their six 1.0 controls are the
matching case/repeat rows from the existing xhigh cohort; no fresh 1.0
controls were run for this targeted round. `temperature_sampling` in
`protocol.json` gives the count of historical slot observations per attempt.
All sampled temperatures matched 0.8 within floating-point tolerance.
Sampling covered all six attempts, but does not capture every request.

Separate from the primary comparisons:

| Group | Records | Treatment |
| --- | ---: | --- |
| Extra interleaved medium/8K | 14 | Completed; 3 functional and delivered successes; excluded from selected control cohort |
| Additional planned 8K slots | 10 | Cancelled before starting; null outcomes |
| Same-lineage pilots | 2 | Cache passed, async_pool failed; outside formal cohorts |
| Thinking-off plan | 24 | One cache success, one interrupted wallet attempt, 22 never started |
| Infrastructure predecessors | 3 | No completed result; replaced as described above |
| Configuration preflights | 4 | Metadata-only, not inference scores |

Source: `aggregates.json`, `separate_groups`, and the corresponding attempt
groups. Thinking-off was cancelled after a change of direction; its 23
unfinished rows are not 23 model failures. No missing-result record is
converted to `false`: its measurements and outcomes are `null`. Zero
successes/zero failures in an unscored aggregate means **no denominator**,
not 0% performance.

The inventory reconciles to 159 records: 119 completed results and 40
unscored records/planned slots. The 119 include 102 primary attempts, 14
extra 8K trials, two pilots and one thinking-off trial. The 40 include the
23 unfinished thinking-off slots, ten cancelled extra 8K slots, three
infrastructure stops and four preflights. Older suite versions, deployment,
MTP, alternative-weight diagnostics and calibration are different studies;
they are not imported or pooled here.

## Profiles, identity and interpretation

The recorded deployment name is Qwen3.8-27B Q4_K_M. `protocol.json` preserves
the exact weight size and SHA-256, suite fingerprint, runtime build,
OpenCode binary SHA-256, Python/Node/TypeScript/OpenCode versions and serving
settings. All completed exported records agree on the recorded model and
runtime identity. The hardware context is a single RTX 3090 with 24 GiB;
llama.cpp build is b11146-7fe450e19, with CUDA 12.8 reported by the historical
deployment audit. This is recorded identity, not an independent verification
of upstream branding or a fresh hash of loaded GPU tensors.

Shared settings include 131072 context capacity, thinking enabled for the
four principal cohorts and targeted sampling round, top-p 0.95, top-k 20,
min-p 0 and repetition penalty 1. Temperature defaults to 1.0; the targeted
profile overrides it to 0.8. Profile metadata and configured request bodies
agree on output allowance, thinking/reasoning settings and repeat seed.
The temperature sampling evidence provides an additional observation layer;
the other profile fields are not claimed to be independently captured in
every transmitted request. The isolated thinking-off profile retains the
medium reasoning label but disables thinking; that label does not imply
equivalent realized reasoning.

**Sequential confounding:** the output and reasoning rounds reused earlier
controls instead of fresh randomized interleaved controls. Recovery, pauses,
hardware conditions, cache histories and rest policies can differ. The later
16K continuation and medium/32K round used 300-second rests; the reasoning
round changed to 180-second rests before its results, and the targeted
temperature round used 180 seconds. An earlier infrastructure recovery had
a temperature cutoff that was later removed. These are historical protocol
facts, not instructions to operate a model service or change thermal policy.
This package does not establish that only one effective condition changed.

**Targeted sampling:** ledger and pagination were selected using earlier
failures, so their six-attempt result cannot estimate general coding quality.
**Repeated-case dependence:** each main cohort repeats the same eight tasks
three times. Reused cases, seeds and checks create dependence; 24 attempts
are not 24 independent tasks. Later model/tool trajectories may diverge
despite matched seeds. No confidence interval or universal ranking is
inferred. Larger output allowances and reasoning labels do not imply equal
realized compute, and context capacity is not evidence of full-context
coding quality.

The tasks are small development fixtures; boltons_paths uses a pinned
upstream library with an inserted fault. These are not official SWE-bench
results or a survey of independent production repositories. Passing frozen
checks does not establish maintainability, complete defect coverage or
accurate user delivery beyond the measured fields.

## Privacy and maintenance

Only allowlisted scalar measurements, score inputs, technical identities and
reviewed descriptions are exported. No private dates, timestamps, timezones,
hostnames, absolute personal paths, original attempt/session IDs, prompts,
raw conversations, account identifiers or credentials are included.

The original numeric sampling seeds are date-shaped and therefore omitted.
Deterministic labels `repeat-1`, `repeat-2` and `repeat-3` preserve their
original order and equality across paired cohorts. `pilot-repeat-1` denotes
a different pilot seed. Labels are **not substitute numeric seeds** and
cannot be used to reproduce inference. The exact mapping and source hash
receipts remain private, outside this public package.

For a later correction, reconcile the immutable historical sources and
private mapping, regenerate the complete export and both CSV files, update
the README when claims change, and regenerate SHA256SUMS last. Repeat source,
aggregation and every-file privacy review on the new version. Passing this
checker alone does not establish privacy or independent acceptance.
