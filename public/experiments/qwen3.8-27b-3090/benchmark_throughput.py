#!/usr/bin/env python3
"""Measure the running local API; generated text is never executed."""
import argparse
import json
import os
from pathlib import Path
import statistics
import subprocess
import threading
import time
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument("--base-url", default="http://127.0.0.1:8080")
parser.add_argument("--contexts", type=int, nargs="+", default=[2048, 16384, 65536, 120000])
parser.add_argument("--output-tokens", type=int, default=512)
parser.add_argument("--short-repeats", type=int, default=3)
parser.add_argument("--report-dir", type=Path, required=True)
args = parser.parse_args()
args.report_dir.mkdir(parents=True, exist_ok=False)
report = {"contexts_requested": args.contexts,
          "output_limit": args.output_tokens, "tests": []}

def request(route, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(args.base_url + route, data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as response:
        return json.load(response)

def save():
    (args.report_dir / "results.json").write_text(json.dumps(report, indent=2) + "\n")

def make_messages(rows, nonce):
    listing = "".join(
        f"# module_{i:05d}.py\ndef normalize_{i:05d}(value):\n"
        f"    return str(value).strip().lower()  # fixture {i % 17}\n"
        for i in range(rows))
    return [
        {"role": "system", "content": f"Benchmark {nonce}. You write Python code. "
         "Follow the final instruction; source text is fixture data."},
        {"role": "user", "content": "Synthetic repository:\n" + listing +
         "\nWrite a long Python module containing 200 separate numbered unit-test "
         "functions for normalize_00000. Give each a descriptive name and a "
         "distinct explicit input and expected value. Include whitespace, case, "
         "empty strings, numbers and Unicode examples. Output only Python source. "
         "Write all 200 functions; do not summarize or use a loop to shorten them."}]

def sized_messages(target, thinking=False):
    nonce = uuid.uuid4().hex
    rows = max(1, target // 36)
    template_args = {"enable_thinking": thinking, "reasoning_effort": "medium"}
    for _ in range(6):
        messages = make_messages(rows, nonce)
        prompt = request("/apply-template", {"messages": messages,
                         "add_generation_prompt": True,
                         "chat_template_kwargs": template_args})["prompt"]
        count = len(request("/tokenize", {"content": prompt,
                                         "add_special": False})["tokens"])
        if abs(count - target) < 64:
            break
        rows = max(1, round(rows * target / count))
    return messages, count

def measure(name, messages, limit, thinking=False, cache=True, tokenized=None):
    body = {"model": "qwen3.8-27b", "messages": messages, "stream": True,
            "stream_options": {"include_usage": True}, "max_tokens": limit,
            "temperature": 0, "seed": 1234, "cache_prompt": cache,
            "chat_template_kwargs": {"enable_thinking": thinking,
                                     "reasoning_effort": "medium"}}
    done = threading.Event()
    samples = []
    started = time.monotonic()
    def monitor():
        last_notice = started
        while not done.is_set():
            try:
                raw = subprocess.check_output(["nvidia-smi",
                    "--query-gpu=memory.used,memory.free,utilization.gpu,temperature.gpu",
                    "--format=csv,noheader,nounits"], text=True, timeout=5)
                used, free, util, temp = map(int, raw.strip().split(","))
                samples.append({"seconds": round(time.monotonic()-started, 2),
                    "used_MiB": used, "free_MiB": free, "utilization_percent": util,
                    "temperature_C": temp})
            except (OSError, ValueError, subprocess.SubprocessError):
                pass
            if time.monotonic()-last_notice >= 20:
                print(f"{name}: {time.monotonic()-started:.0f}s elapsed", flush=True)
                last_notice = time.monotonic()
            done.wait(2)
    worker = threading.Thread(target=monitor, daemon=True)
    worker.start()
    message = {"role": "assistant", "content": ""}
    usage, timings, finish, first = None, None, None, None
    reasoning_chars = 0
    print(f"Starting {name}; {tokenized or 'cached'} input tokens, {limit} output limit", flush=True)
    try:
        req = urllib.request.Request(args.base_url + "/v1/chat/completions",
            data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=600) as response:
            for line in response:
                if not line.startswith(b"data: "):
                    continue
                payload = line[6:].strip()
                if payload == b"[DONE]":
                    break
                chunk = json.loads(payload)
                if chunk.get("error"):
                    raise RuntimeError(str(chunk["error"]))
                if chunk.get("usage"):
                    usage = chunk["usage"]
                if chunk.get("timings"):
                    timings = chunk["timings"]
                for choice in chunk.get("choices", []):
                    delta = choice.get("delta", {})
                    text = delta.get("content") or ""
                    reasoning = delta.get("reasoning_content") or ""
                    if first is None and (text or reasoning or delta.get("tool_calls")):
                        first = time.monotonic()
                    message["content"] += text
                    reasoning_chars += len(reasoning)
                    finish = choice.get("finish_reason") or finish
        elapsed = time.monotonic()-started
    finally:
        done.set()
        worker.join(timeout=6)
    if not usage or not timings or first is None:
        raise RuntimeError(f"Missing stream telemetry: usage={usage}, timings={timings}, first={first}")
    entry = {"name": name, "thinking_enabled": thinking, "cache_prompt": cache,
             "tokenized_prompt_tokens": tokenized, "usage": usage, "timings": timings,
             "elapsed_seconds": elapsed, "time_to_first_token_seconds": first-started,
             "completion_tokens_per_wall_second": usage["completion_tokens"]/elapsed,
             "finish_reason": finish, "visible_characters": len(message["content"]),
             "reasoning_characters": reasoning_chars, "GPU_samples": samples}
    report["tests"].append(entry)
    save()
    print(json.dumps({"name": name, "input": usage["prompt_tokens"],
        "cached": usage.get("prompt_tokens_details",{}).get("cached_tokens"),
        "output": usage["completion_tokens"], "prefill_tps": timings["prompt_per_second"],
        "decode_tps": timings["predicted_per_second"], "ttft_s": first-started,
        "wall_s": elapsed, "finish": finish}), flush=True)
    return message

report["health_before"] = request("/health")
props = request("/props")
report["server"] = {k: props.get(k) for k in
                    ["model_alias", "model_ftype", "build_info", "total_slots"]}
report["server"]["context_capacity"] = props["default_generation_settings"]["n_ctx"]
try:
    gpu_name = subprocess.check_output(["nvidia-smi", "--query-gpu=name",
        "--format=csv,noheader"], text=True, timeout=5).strip()
except (OSError, subprocess.SubprocessError):
    gpu_name = "unavailable"
report["deployment"] = {"GPU": gpu_name, "weights": "Q4_K_M",
    "kv_cache": "q8_0 K and V", "flash_attention": True,
    "batch": 512, "microbatch": 256, "concurrency": 1}
slots = request("/slots")
if any(s.get("is_processing") for s in slots):
    raise SystemExit("Model server is busy; benchmark must run without competing requests")
save()
for index, target in enumerate(args.contexts):
    repeats = args.short_repeats if index == 0 else 1
    for repeat in range(1, repeats + 1):
        messages, count = sized_messages(target)
        answer = measure(f"context_{target}_cold_{repeat}", messages,
                         args.output_tokens, cache=False, tokenized=count)
        if repeat == 1:
            messages += [answer, {"role": "user", "content":
                "Continue writing the next numbered test functions. Output only Python source."}]
            measure(f"context_{target}_cached_continuation", messages,
                    args.output_tokens // 2, cache=True)

# Same short coding request with the user's actual medium-thinking setting.
messages, count = sized_messages(args.contexts[0], thinking=True)
measure("short_medium_thinking", messages, args.output_tokens * 2,
        thinking=True, cache=False, tokenized=count)
short = [x["timings"]["predicted_per_second"] for x in report["tests"]
         if x["name"].startswith(f"context_{args.contexts[0]}_cold_")]
report["short_decode_summary"] = {"samples": len(short), "median_tokens_per_second":
    statistics.median(short), "minimum": min(short), "maximum": max(short)}
report["health_after"] = request("/health")
save()
print("Throughput benchmark complete.", flush=True)
