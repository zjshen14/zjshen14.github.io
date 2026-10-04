#!/usr/bin/env python3
"""Recompute exported outcomes using only this directory and Python's standard library."""
import collections
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import statistics
import sys

FILES = {
    'README.md', 'attempts.json', 'attempts.csv', 'protocol.json',
    'aggregates.json', 'aggregates.csv', 'check.py', 'SHA256SUMS',
}
PRIMARY = ('medium_8k', 'medium_16k', 'medium_32k', 'xhigh_32k', 'temperature08_targeted')
GROUPS = set(PRIMARY) | {
    'extra_8k_excluded', 'pilots', 'thinking_off_cancelled',
    'infrastructure_excluded', 'configuration_only', 'extra_8k_cancelled',
}
STATUSES = {'complete', 'cancelled_after_start', 'cancelled_unstarted',
            'infrastructure_no_result', 'not_inference'}
CHECKS = {'acceptance', 'regression', 'public', 'syntax', 'typecheck', 'consumer_typecheck'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def solved(grade, language):
    require(set(grade) == {'protected_changes_count', 'missing_starter_files_count',
                           'checks', 'solved'}, 'Unexpected grade fields')
    expected = {'acceptance', 'regression', 'public'} | (
        {'typecheck', 'consumer_typecheck'} if language == 'typescript' else {'syntax'})
    require(set(grade['checks']) == expected, 'Missing or extra grading checks')
    require(all(type(v) is bool for v in grade['checks'].values()), 'Non-boolean grade')
    for key in ('protected_changes_count', 'missing_starter_files_count'):
        require(type(grade[key]) is int and grade[key] >= 0, 'Invalid integrity count')
    value = not grade['protected_changes_count'] and not grade['missing_starter_files_count'] and all(grade['checks'].values())
    require(type(grade['solved']) is bool and grade['solved'] == value, 'Grade formula mismatch')
    return value


def scores(row, task):
    phase_one = solved(row['phase_one_grade'], task['language'])
    final = solved(row['final_grade'], task['language'])
    functional = bool(phase_one and final and row['config_unchanged'])
    delivered = functional and len(row['turns']) == task['turns'] and all(
        t['termination'] == 'completed' and t['exit_code'] == 0
        and t['has_final_text_after_tools'] and t['observed_tests_passed']
        and (task['language'] != 'typescript' or t['observed_typecheck_passed'])
        for t in row['turns'])
    return functional, bool(delivered)


def validate(rows, protocol):
    require(protocol['schema_version'] == 1, 'Unsupported protocol schema')
    require(len(rows) == 159, 'Missing or extra inventory rows')
    ids = [r['attempt_id'] for r in rows]
    require(ids == [f'a{i:04d}' for i in range(1, 160)], 'Duplicate, missing or reordered attempt IDs')
    index = {r['attempt_id']: r for r in rows}
    fields = {'attempt_id', 'group', 'case', 'repeat', 'profile', 'status', 'event',
              'functional_success', 'delivered_success', 'seconds', 'native_output_tokens',
              'opencode_output_tokens', 'tool_calls', 'config_unchanged', 'phase_one_grade',
              'final_grade', 'turns'}
    for r in rows:
        require(set(r) == fields, 'Unexpected attempt fields')
        require(r['group'] in GROUPS and r['status'] in STATUSES, 'Invalid classification')
        require(r['case'] in protocol['tasks'] and r['profile'] in protocol['profiles'], 'Unknown task/profile')
        require(r['repeat'] in {'repeat-1', 'repeat-2', 'repeat-3', 'pilot-repeat-1'}, 'Invalid repeat label')
        require(r['event'] in {None, 'direction_changed', 'gpu_fault', 'sandbox_setup_failure',
                               'historical_temperature_cutoff', 'configuration_preflight', 'protocol_amendment'}, 'Unknown event')
        if r['status'] != 'complete':
            require(all(r[k] is None for k in ('functional_success', 'delivered_success', 'seconds',
                    'native_output_tokens', 'opencode_output_tokens', 'tool_calls', 'config_unchanged',
                    'phase_one_grade', 'final_grade')) and r['turns'] == [], 'Missing result scored as a failure')
            continue
        for key in ('seconds', 'native_output_tokens', 'opencode_output_tokens', 'tool_calls'):
            require(type(r[key]) in (int, float) and math.isfinite(r[key]) and r[key] >= 0, 'Invalid measurement')
        require(all(type(r[k]) is bool for k in ('functional_success', 'delivered_success', 'config_unchanged')), 'Invalid outcome type')
        require(len(r['turns']) == 1, 'This development export has one turn per result')
        for t in r['turns']:
            require(set(t) == {'seconds', 'exit_code', 'termination', 'tool_calls', 'observed_tests_passed',
                    'observed_typecheck_passed', 'finish_reasons', 'has_final_text_after_tools', 'tool_error_count'}, 'Unexpected turn fields')
            require(t['termination'] in {'completed', 'wall_time_limit', 'generated_token_limit', 'tool_call_limit'}, 'Unknown termination')
            require(set(t['finish_reasons']) <= {'stop', 'length', 'tool-calls', 'error', 'unknown', 'other', 'content-filter'}, 'Unknown finish reason')
            require(all(type(t[k]) is bool for k in ('observed_tests_passed', 'observed_typecheck_passed', 'has_final_text_after_tools')), 'Invalid turn flag')
            require(type(t['exit_code']) is int, 'Invalid exit code')
        f, d = scores(r, protocol['tasks'][r['case']])
        require((f, d) == (r['functional_success'], r['delivered_success']), 'Outcome formula mismatch: ' + r['attempt_id'])
        require(math.isclose(r['seconds'], sum(t['seconds'] for t in r['turns']), abs_tol=1e-6), 'Duration mismatch')
        require(r['tool_calls'] == sum(t['tool_calls'] for t in r['turns']), 'Tool count mismatch')
    require(set(protocol['cohorts']) == set(PRIMARY) | {'temperature10_reused_controls'}, 'Missing cohort')
    for name, cohort in protocol['cohorts'].items():
        selected = cohort['attempt_ids']
        require(len(selected) == len(set(selected)) == cohort['expected_count'], 'Duplicate or missing cohort member')
        require(all(i in index for i in selected), 'Unknown cohort ID')
        subset = [index[i] for i in selected]
        require(all(r['status'] == 'complete' for r in subset), 'Incomplete primary result')
        pairs = {(r['case'], r['repeat']) for r in subset}
        cases = {'ledger', 'pagination'} if 'temperature' in name else set(protocol['tasks'])
        require(pairs == {(c, f'repeat-{n}') for c in cases for n in (1, 2, 3)}, 'Missing/duplicate case-repeat pair')
        expected_profile = {'temperature08_targeted': 'xhigh_32k_temperature08',
                            'temperature10_reused_controls': 'xhigh_32k'}.get(name, name)
        require(all(r['profile'] == expected_profile for r in subset), 'Wrong profile in cohort')
        if name in PRIMARY:
            require(set(selected) == {r['attempt_id'] for r in rows if r['group'] == name}, 'Unaccounted primary record')
    require(set(protocol['cohorts']['temperature10_reused_controls']['attempt_ids']) <=
            set(protocol['cohorts']['xhigh_32k']['attempt_ids']), 'Controls are not reused')
    actual = {
        'unique_records': len(rows), 'completed_results': sum(r['status'] == 'complete' for r in rows),
        'primary_unique_attempts': len(set().union(*(set(protocol['cohorts'][n]['attempt_ids']) for n in PRIMARY))),
        'extra_8k_excluded': sum(r['group'] == 'extra_8k_excluded' for r in rows),
        'pilots': sum(r['group'] == 'pilots' for r in rows),
        'thinking_off_completed': sum(r['group'] == 'thinking_off_cancelled' and r['status'] == 'complete' for r in rows),
        'thinking_off_cancelled_after_start': sum(r['group'] == 'thinking_off_cancelled' and r['status'] == 'cancelled_after_start' for r in rows),
        'thinking_off_cancelled_unstarted': sum(r['group'] == 'thinking_off_cancelled' and r['status'] == 'cancelled_unstarted' for r in rows),
        'infrastructure_no_result': sum(r['status'] == 'infrastructure_no_result' for r in rows),
        'configuration_only': sum(r['group'] == 'configuration_only' for r in rows),
        'extra_8k_cancelled_unstarted': sum(r['group'] == 'extra_8k_cancelled' and r['status'] == 'cancelled_unstarted' for r in rows),
    }
    require(actual == protocol['expected_inventory'], 'Inventory reconciliation failed')
    return index


def tally(rows):
    completed = [r for r in rows if r['status'] == 'complete']
    result = {'records': len(rows), 'completed': len(completed), 'not_scored': len(rows) - len(completed)}
    for metric in ('functional_success', 'delivered_success'):
        result[metric] = sum(r[metric] for r in completed)
        result[metric.replace('success', 'failed')] = len(completed) - result[metric]
    result['median_seconds'] = statistics.median(r['seconds'] for r in completed) if completed else None
    result['status_counts'] = dict(sorted(collections.Counter(r['status'] for r in rows).items()))
    result['termination_counts'] = dict(sorted(collections.Counter(t['termination'] for r in completed for t in r['turns']).items()))
    return result


def aggregate(rows, protocol):
    index = validate(rows, protocol)
    cohorts = {}
    for name, spec in protocol['cohorts'].items():
        chosen = [index[i] for i in spec['attempt_ids']]
        cohorts[name] = {**tally(chosen), 'by_case': {c: tally([r for r in chosen if r['case'] == c]) for c in sorted({r['case'] for r in chosen})}}
    paired = {}
    for left, right in protocol['comparisons']:
        a = {(index[i]['case'], index[i]['repeat']): index[i] for i in protocol['cohorts'][left]['attempt_ids']}
        b = {(index[i]['case'], index[i]['repeat']): index[i] for i in protocol['cohorts'][right]['attempt_ids']}
        require(a.keys() == b.keys(), 'Incomplete comparison pairs')
        entry = {'pairs': len(a)}
        for metric in ('functional_success', 'delivered_success'):
            counts = dict.fromkeys(('both_pass', 'both_fail', 'candidate_improves', 'candidate_regresses'), 0)
            for key in a:
                x, y = a[key][metric], b[key][metric]
                counts['both_pass' if x and y else 'both_fail' if not x and not y else 'candidate_improves' if y else 'candidate_regresses'] += 1
            entry[metric] = counts
        paired[left + '__' + right] = entry
    return {'schema_version': 1, 'cohorts': cohorts, 'paired': paired,
            'separate_groups': {g: tally([r for r in rows if r['group'] == g]) for g in sorted(GROUPS - set(PRIMARY))},
            'inventory': protocol['expected_inventory']}


def cell(value):
    if value is None:
        return ''
    if isinstance(value, (dict, list, bool)):
        return json.dumps(value, separators=(',', ':'), sort_keys=True)
    return str(value)


def csv_text(rows):
    output = io.StringIO(newline='')
    writer = csv.DictWriter(output, fieldnames=list(rows[0]), lineterminator='\n')
    writer.writeheader()
    writer.writerows({k: cell(v) for k, v in r.items()} for r in rows)
    return output.getvalue()


def aggregate_csv(result):
    flat = []
    for section in ('cohorts', 'separate_groups'):
        for name, data in result[section].items():
            flat.append({'section': section, 'name': name, **{k: v for k, v in data.items() if k != 'by_case'}})
    return csv_text(flat)


def verify_checksums(root):
    present = {p.name for p in root.iterdir() if p.is_file()}
    require(present == FILES, 'Unexpected or missing package file')
    require(not any(p.is_symlink() or p.is_dir() for p in root.iterdir()), 'Unexpected package entry')
    entries = {}
    for line in (root / 'SHA256SUMS').read_text().splitlines():
        digest, name = line.split('  ', 1)
        require(name in FILES - {'SHA256SUMS'} and name not in entries, 'Invalid checksum entry')
        entries[name] = digest
    require(set(entries) == FILES - {'SHA256SUMS'}, 'Incomplete checksums')
    for name, expected in entries.items():
        require(hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, 'Checksum mismatch: ' + name)


def main():
    require(len(sys.argv) == 1, 'Usage: python3 check.py (no arguments)')
    root = Path(__file__).resolve().parent
    verify_checksums(root)
    source = json.loads((root / 'attempts.json').read_text())
    require(source['schema_version'] == 1 and set(source) == {'schema_version', 'attempts'}, 'Invalid attempts schema')
    rows = source['attempts']
    protocol = json.loads((root / 'protocol.json').read_text())
    result = aggregate(rows, protocol)
    require(result == json.loads((root / 'aggregates.json').read_text()), 'Aggregate mismatch')
    require(csv_text(rows) == (root / 'attempts.csv').read_text(), 'Attempt CSV mismatch')
    require(aggregate_csv(result) == (root / 'aggregates.csv').read_text(), 'Aggregate CSV mismatch')
    print('PASS: checksums, 159 inventory records, 119 results, score formulas, cohort membership, paired outcomes and both CSV files.')
    print('Aggregation only; no inference, grader rerun, source authenticity or semantic patch validation.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError) as error:
        print('FAIL:', error, file=sys.stderr)
        sys.exit(1)
