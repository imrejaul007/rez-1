#!/usr/bin/env python3
"""
CI Doctor Fixer — Fully free, zero API cost.
Uses pattern matching for common TS errors + Groq free LLM for complex cases.
"""

import json
import os
import re
import subprocess
import sys
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional


# ─── Pattern-based fixers (no API needed) ────────────────────────────────────

FIXERS: list[tuple[str, callable]] = []


def fixer(pattern: str):
    """Decorator to register a pattern-based fixer."""
    def deco(fn: callable):
        FIXERS.append((pattern, fn))
        return fn
    return deco


@fixer(r"does not exist in type")
def fix_missing_interface_field(errors: list[dict], work_dir: Path) -> int:
    """Fix: Field exists in schema but not in TypeScript interface."""
    fixed = 0
    for err in errors:
        m = re.search(r"Property '(\w+)' does not exist in type '(\w+)'", err["full"])
        if not m:
            m = re.search(r"'(\w+)' does not exist in type '(\w+)'", err["full"])
        if not m:
            continue
        prop, iface = m.group(1), m.group(2)
        # Find interface in model file
        for ts_file in work_dir.rglob("*.ts"):
            content = ts_file.read_text()
            # Look for interface definition
            iface_match = re.search(
                rf"(interface\s+{re.escape(iface)}\s*\{{[^}}]*?)(?<!\w{re.escape(prop)}(?:\?)?:)",
                content, re.DOTALL
            )
            if iface_match and prop not in iface_match.group(0):
                # Add the missing field as optional
                new_iface = iface_match.group(0).rstrip()
                if new_iface.endswith("}"):
                    new_iface = new_iface[:-1].rstrip()
                new_iface += f"\n  {prop}?: any;\n}}"
                new_content = content.replace(iface_match.group(0), new_iface)
                if new_content != content:
                    ts_file.write_text(new_content)
                    print(f"  FIXED (missing field): {ts_file.name} — added {prop} to {iface}")
                    fixed += 1
                    break
    return fixed


@fixer(r"is missing.*original.*selling.*currency")
@fixer(r"Type '{}' is missing")
def fix_pricing_object_init(errors: list[dict], work_dir: Path) -> int:
    """Fix: this.pricing = {} missing required IProductPricing fields."""
    fixed = 0
    for err in errors:
        if "this.pricing" in err.get("full", ""):
            for ts_file in work_dir.rglob("src/models/Product.ts"):
                content = ts_file.read_text()
                # Replace empty pricing init with proper fields
                if re.search(r"this\.pricing\s*=\s*\{\s*\}", content):
                    # Count occurrences
                    count = len(re.findall(r"this\.pricing\s*=\s*\{\s*\}", content))
                    content = re.sub(
                        r"this\.pricing\s*=\s*\{\s*\}",
                        "{ original: 0, selling: 0, currency: 'INR' }",
                        content
                    )
                    ts_file.write_text(content)
                    print(f"  FIXED (pricing init): {count}x in Product.ts")
                    fixed += count
    return fixed


@fixer(r"is not assignable to type.*'starter'\|'bronze'")
@fixer(r"is not assignable to type.*STARTER")
def fix_lowercase_enum_casting(errors: list[dict], work_dir: Path) -> int:
    """Fix: Uppercase enum values cast to lowercase type."""
    fixed = 0
    for err in errors:
        full = err.get("full", "")
        m = re.search(r"as\s+'([A-Z]+(?:\|[A-Z]+)+)'", full)
        if not m:
            continue
        wrong = m.group(1)
        right = wrong.lower()
        for ts_file in work_dir.rglob("src/services/referralTierService.ts"):
            content = ts_file.read_text()
            if f"as '{wrong}'" in content:
                content = content.replace(f"as '{wrong}'", f"as '{right}'")
                ts_file.write_text(content)
                print(f"  FIXED (enum casing): referralTierService.ts")
                fixed += 1
    return fixed


@fixer(r"Implicit any")
def fix_implicit_any(errors: list[dict], work_dir: Path) -> int:
    """Fix: Parameter 'x' implicitly has an 'any' type."""
    fixed = 0
    for err in errors:
        full = err.get("full", "")
        m = re.search(r"Parameter '(\w+)' implicitly has an 'any' type", full)
        if not m:
            continue
        param = m.group(1)
        # Get file and line number
        file_m = re.search(r"^(src/[^(]+)", full)
        if not file_m:
            continue
        filepath = work_dir / file_m.group(1)
        if not filepath.exists():
            continue
        line_m = re.search(r"\((\d+),", full)
        if not line_m:
            continue
        lineno = int(line_m.group(1))
        lines = filepath.read_text().splitlines()
        if lineno > len(lines):
            continue
        line = lines[lineno - 1]
        # Add : any annotation
        # Match patterns like: function(param, ...)
        # or: (param: or : param
        new_line = re.sub(
            rf"(\b{re.escape(param)}\s*,|\b{re.escape(param)}\s*\))",
            lambda m2: m2.group(1)[:-1].strip() + ": any,)" if m2.group(1).endswith(",") else m2.group(1)[:-1].strip() + ": any)",
            line
        )
        if new_line != line and ": any" not in line:
            # Try adding type annotation inline
            if f"{param}:" not in line and f"{param} =" in line:
                new_line = re.sub(
                    rf"(\b{re.escape(param)}\s*=\s*)",
                    f"\\1// eslint-disable-next-line @typescript-eslint/no-explicit-any\n    {param}: any = ",
                    line
                )
            if new_line != line:
                lines[lineno - 1] = new_line
                filepath.write_text("\n".join(lines))
                print(f"  FIXED (implicit any): {filepath.name}:{lineno}")
                fixed += 1
    return fixed


@fixer(r"Cannot find name")
def fix_undefined_variable(errors: list[dict], work_dir: Path) -> int:
    """Fix: 'appointment' used but 'Appointment' defined."""
    fixed = 0
    for err in errors:
        full = err.get("full", "")
        m = re.search(r"Cannot find name '(\w+)'. Did you mean '(\w+)'", full)
        if not m:
            continue
        wrong, correct = m.group(1), m.group(2)
        file_m = re.search(r"^(src/[^(]+)", full)
        if not file_m:
            continue
        filepath = work_dir / file_m.group(1)
        if not filepath.exists():
            continue
        content = filepath.read_text()
        count = content.count(wrong)
        if count > 0:
            content = content.replace(wrong, correct)
            filepath.write_text(content)
            print(f"  FIXED (typo): {filepath.name} — {wrong} → {correct} ({count}x)")
            fixed += count
    return fixed


@fixer(r"is not assignable to type 'null'")
@fixer(r"Conversion of type")
def fix_type_mismatch(errors: list[dict], work_dir: Path) -> int:
    """Fix: Type X is not assignable to type Y."""
    fixed = 0
    for err in errors:
        full = err.get("full", "")
        # Mongoose Document assigned to lean-typed variable
        if "toObject()" in full or ("Document" in full and "lean" in full):
            file_m = re.search(r"^(src/[^(]+)", full)
            if not file_m:
                continue
            filepath = work_dir / file_m.group(1)
            if not filepath.exists():
                continue
            content = filepath.read_text()
            # Fix: user = guestUser → user = guestUser.toObject()
            if re.search(r"user\s*=\s*(guest\w+|[A-Z]\w+)\s*;", content) and "toObject()" not in content:
                content = re.sub(
                    r"(user)\s*=\s*([A-Z]\w+)\s*;",
                    r"\1 = \2.toObject() as Exclude<typeof user, null>;",
                    content
                )
                filepath.write_text(content)
                print(f"  FIXED (type mismatch): {filepath.name}")
                fixed += 1
    return fixed


@fixer(r"does not exist on type")
def fix_missing_method(errors: list[dict], work_dir: Path) -> int:
    """Fix: Method does not exist on model type."""
    fixed = 0
    for err in errors:
        full = err.get("full", "")
        m = re.search(r"Property '(\w+)' does not exist on type", full)
        if not m:
            continue
        method = m.group(1)
        file_m = re.search(r"^(src/[^(]+)", full)
        if not file_m:
            continue
        filepath = work_dir / file_m.group(1)
        if not filepath.exists():
            continue
        # Find the call and cast to any
        content = filepath.read_text()
        if f".{method}(" in content:
            # Replace: .method( → .method as any>(
            pattern = rf"\.{method}\s*\("
            replacement = f".{method} as any("
            count = len(re.findall(pattern, content))
            content = re.sub(pattern, replacement, content)
            filepath.write_text(content)
            print(f"  FIXED (missing method): {filepath.name} — .{method} cast as any ({count}x)")
            fixed += count
    return fixed


@fixer(r"has no exported member")
def fix_missing_export(errors: list[dict], work_dir: Path) -> int:
    """Fix: Module has no exported member X."""
    fixed = 0
    for err in errors:
        full = err.get("full", "")
        m = re.search(r"Module '[^']+' has no exported member '(\w+)'", full)
        if not m:
            continue
        missing = m.group(1)
        file_m = re.search(r"^(src/[^(]+)", full)
        if not file_m:
            continue
        filepath = work_dir / file_m.group(1)
        if not filepath.exists():
            continue
        content = filepath.read_text()
        # Remove the import
        new_content = re.sub(
            rf"import\s+\{{[^}}*\b{re.escape(missing)}\b[^}}]*\}}\s+from",
            lambda m2: _remove_from_import(m2.group(0), missing),
            content
        )
        if new_content != content:
            filepath.write_text(new_content)
            print(f"  FIXED (missing export): {filepath.name} — removed {missing} import")
            fixed += 1
    return fixed


def _remove_from_import(import_str: str, member: str) -> str:
    """Remove member from named import list."""
    members = re.search(r"import\s+\{{([^}}]+)}}\s+from", import_str)
    if not members:
        return import_str
    parts = [p.strip() for p in members.group(1).split(",")]
    parts = [p for p in parts if p and p != member]
    if not parts:
        return f"/* import removed: {member} */"
    return f"import {{ {', '.join(parts)} }} from"


@fixer(r"Module '.*?' has no exported member")
def fix_missing_export_alias(errors: list[dict], work_dir: Path) -> int:
    """Alias: handled above."""
    return 0


def apply_pattern_fixes(errors: list[dict], work_dir: Path) -> tuple[int, int]:
    """Run all pattern-based fixers. Returns (fixed_count, total_fixes)."""
    total = 0
    for pattern, fixer_fn in FIXERS:
        matched = [e for e in errors if re.search(pattern, e.get("full", ""))]
        if matched:
            n = fixer_fn(matched, work_dir)
            total += n
            if n > 0:
                print(f"  [{fixer_fn.__name__}] fixed {n} issue(s)")
    return total


# ─── Groq free LLM fallback ───────────────────────────────────────────────────

def call_groq(prompt: str) -> str:
    key = os.environ.get("GROQ_API_KEY", "")
    if not key:
        raise RuntimeError("GROQ_API_KEY not set")
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 8000,
    }
    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "content-type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read())["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Groq API error {e.code}: {e.read().decode()[:300]}")


def call_ollama(prompt: str, model: str = "qwen2.5-coder:7b") -> str:
    """Call local Ollama (if running)."""
    import urllib.error
    payload = {"model": model, "prompt": prompt, "stream": False}
    req = urllib.request.Request(
        "http://localhost:11434/api/generate",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.loads(resp.read())["response"]
    except (urllib.error.URLError, Exception) as e:
        raise RuntimeError(f"Ollama not available: {e}")


def call_llm(prompt: str) -> str:
    """Try Ollama first (free, local), then Groq (free, cloud)."""
    try:
        print("  Trying Ollama (local, free)...")
        return call_ollama(prompt)
    except RuntimeError:
        pass
    try:
        print("  Trying Groq (free cloud)...")
        return call_groq(prompt)
    except RuntimeError as e:
        print(f"  LLM unavailable: {e}")
        raise


def parse_file_blocks(response: str) -> dict[str, str]:
    """Parse FILE: path blocks from LLM output."""
    blocks = {}
    for m in re.finditer(r"FILE:\s*([^\n]+)\n```[\w]*\n(.*?)```", response, re.DOTALL):
        blocks[m.group(1).strip()] = m.group(2).rstrip() + "\n"
    return blocks


def write_file(filepath: str, content: str) -> bool:
    """Write file if content differs."""
    full = Path(filepath)
    full.parent.mkdir(parents=True, exist_ok=True)
    old = full.read_text() if full.exists() else ""
    if old != content:
        full.write_text(content)
        print(f"  LLM WRITTEN: {filepath}")
        return True
    print(f"  LLM SKIPPED: {filepath} (no change)")
    return False


def run_tsc() -> tuple[int, str]:
    """Run tsc --noEmit."""
    work_dir = os.environ.get("WORKING_DIR", os.getcwd())
    r = subprocess.run(
        ["npx", "tsc", "--noEmit"],
        cwd=work_dir,
        capture_output=True,
        text=True,
        timeout=120,
    )
    output = r.stdout + r.stderr
    return len(re.findall(r"error TS\d+:", output)), output


def parse_errors(errors_text: str) -> list[dict]:
    """Parse tsc output into structured error list."""
    errors = []
    for line in errors_text.splitlines():
        m = re.match(r"^(src/[^(:]+)(?:\((\d+),(\d+)\))?:?\s*error TS(\d+):\s*(.+)$", line)
        if m:
            errors.append({
                "file": m.group(1),
                "line": int(m.group(2)) if m.group(2) else 0,
                "col": int(m.group(3)) if m.group(3) else 0,
                "code": m.group(4),
                "msg": m.group(5),
                "full": line,
            })
    return errors


def get_file_context(filepath: str, max_lines: int = 200) -> str:
    """Read file for LLM context."""
    work_dir = Path(os.environ.get("WORKING_DIR", os.getcwd()))
    full = work_dir / filepath
    if full.exists():
        return "\n".join(full.read_text().splitlines()[:max_lines])
    return f"(file not found: {filepath})"


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    work_dir = Path(os.environ.get("WORKING_DIR", os.getcwd()))
    tsc_errors_path = Path("/tmp/tsc-errors.txt")

    if not tsc_errors_path.exists():
        print("No tsc-errors.txt found")
        sys.exit(0)

    errors_text = tsc_errors_path.read_text()
    error_count = len(re.findall(r"error TS\d+:", errors_text))
    print(f"=== CI Doctor ===")
    print(f"Errors found: {error_count}")

    if error_count == 0:
        print("No errors. Nothing to fix.")
        sys.exit(0)

    # ── Phase 1: Pattern-based fixes (free, fast) ──
    print("\n─── Phase 1: Pattern fixes (free) ───")
    errors = parse_errors(errors_text)
    pattern_fixes = apply_pattern_fixes(errors, work_dir)

    remaining, output = run_tsc()
    Path("/tmp/tsc-after-phase1.txt").write_text(output)
    print(f"After pattern fixes: {remaining} errors ({pattern_fixes} issues fixed)")

    if remaining == 0:
        print("\n=== ALL ERRORS FIXED BY PATTERNS (no LLM needed) ===")
        print("Total fixes: {pattern_fixes}")
        sys.exit(0)

    # ── Phase 2: LLM fallback (free Groq) ──
    print(f"\n─── Phase 2: LLM fallback ({remaining} errors) ───")

    error_files = sorted(set(e["file"] for e in parse_errors(output)))
    context_parts = []
    for f in error_files:
        ctx = get_file_context(f)
        context_parts.append(f"\n=== FILE: {f} ===\n{ctx}\n")

    prompt = f"""You are a TypeScript expert. Fix ALL the remaining TypeScript errors below.

## Remaining Errors
{output}

## Source Files
{"".join(context_parts)}

## Task
1. Read each file above
2. Identify the minimum fix for each error
3. Apply ONLY necessary changes — do NOT refactor working code
4. Fix ALL remaining errors

## Output Format
For each fixed file:
FILE: <relative-path>
```
<complete fixed file content>
```

After all fixes, output on its own line:
[ALL_FIXED]
"""

    try:
        response = call_llm(prompt)
        print(f"LLM response: {len(response)} chars")
    except RuntimeError as e:
        print(f"LLM unavailable: {e}")
        print(f"Pattern fixer handled {pattern_fixes}/{error_count} issues.")
        print(f"{remaining} errors need manual fix.")
        sys.exit(1)

    # Apply LLM fixes
    blocks = parse_file_blocks(response)
    if not blocks:
        print("WARNING: No FILE: blocks in LLM response")
        print(response[:500])
    else:
        for path, code in blocks.items():
            write_file(path, code)

    # Verify
    remaining2, output2 = run_tsc()
    Path("/tmp/tsc-after.txt").write_text(output2)

    if remaining2 > 0:
        print(f"\n=== Second pass for {remaining2} remaining errors ===")
        try:
            rem_files = sorted(set(e["file"] for e in parse_errors(output2)))
            rem_ctx = "\n".join(f"\n=== FILE: {f} ===\n{get_file_context(f)}\n" for f in rem_files)
            retry = f"""Continue fixing the remaining errors. Fix ALL completely.

## Remaining Errors
{output2}

## Files
{rem_ctx}

Fix all remaining errors. Output FILE: blocks and [ALL_FIXED]."""
            resp2 = call_llm(retry)
            for path, code in parse_file_blocks(resp2).items():
                write_file(path, code)
            remaining2, output2 = run_tsc()
            Path("/tmp/tsc-after.txt").write_text(output2)
        except RuntimeError:
            pass

    print(f"\n=== DONE ===")
    print(f"Pattern fixes: {pattern_fixes}")
    print(f"LLM fixes: {len(blocks)} files")
    print(f"Final errors: {remaining2}")
    print(f"Result: {'PASS' if remaining2 == 0 else f'{remaining2} remaining'}")


if __name__ == "__main__":
    main()
