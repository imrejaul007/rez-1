#!/usr/bin/env python3
"""Find dead service files in services/"""
import os
import subprocess
from pathlib import Path

SERVICES_DIR = Path("services")

def grep_files(pattern):
    cmd = ["grep", "-rln", "--include=*.tsx", "--include=*.ts",
           "--exclude-dir=node_modules", "--exclude-dir=.expo",
           "--exclude-dir=.git", "--exclude-dir=.trash",
           "--exclude-dir=docs", "--exclude-dir=.claude",
           "--exclude-dir=__tests__", "--exclude-dir=.optimize-logs",
           "--exclude-dir=coverage", "--exclude-dir=tests.bak",
           "--exclude-dir=public", "--exclude-dir=android",
           "--exclude-dir=__mocks__",
           pattern, "."]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return [l.strip().replace("\\", "/") for l in result.stdout.strip().split("\n") if l.strip()]

service_files = []
for fp in SERVICES_DIR.glob("*.ts"):
    service_files.append(fp)
for fp in SERVICES_DIR.glob("*.tsx"):
    service_files.append(fp)

print(f"Total service files: {len(service_files)}")

results = []
for fp in sorted(service_files):
    name = fp.stem
    size = fp.stat().st_size
    relpath = str(fp).replace(os.sep, "/")
    # Match the exact basename
    refs = grep_files(name)
    refs = [r for r in refs if r != relpath and r != f"./{relpath}"]
    test_refs = [r for r in refs if "__tests__" in r or ".test." in r]
    non_test_refs = [r for r in refs if r not in test_refs]
    is_dead = len(non_test_refs) == 0
    confidence = "HIGH" if len(refs) == 0 else ("MEDIUM" if len(non_test_refs) == 0 else "LOW")
    results.append({
        "file": relpath,
        "name": name,
        "size": size,
        "non_test_refs": non_test_refs,
        "test_refs": test_refs,
        "is_dead": is_dead,
        "confidence": confidence,
    })

dead = [r for r in results if r["is_dead"]]
alive = [r for r in results if not r["is_dead"]]
print(f"\n=== DEAD service files ({len(dead)}) ===")
for r in dead:
    print(f"  {r['file']:50s}  {r['size']:>7d} bytes  [{r['confidence']}]")
    if r["test_refs"]:
        for t in r["test_refs"][:3]:
            print(f"     test-ref: {t}")
print(f"\nTotal dead bytes: {sum(r['size'] for r in dead)}")
print(f"\n=== ALIVE service files: {len(alive)} (showing first 10) ===")
for r in alive[:10]:
    print(f"  {r['file']:50s}  {r['size']:>7d} bytes  refs={len(r['non_test_refs'])}")