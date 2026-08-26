# src/run_nightly.py
"""🚀 One-command manual pipeline runner.
Runs the optimizer and everything after it, in order.
Zero Gemini/quota cost — pure PuLP + local files + Supabase.

Usage (from project root):
    python -m src.run_nightly
"""
import subprocess
import sys

CHAIN = [
    "src.optimize",                # 1. tomorrow's plan -> data/processed/induction_plan.json
    "src.generate_future_plans",   # 2. 4-day forecast + Supabase sync (plans + explanations)
    "src.explain",                 # 3. human-readable rationales
    "src.sync_to_supabase",        # 4. push final plan/explanations to Supabase
]

def main():
    for i, mod in enumerate(CHAIN, 1):
        print(f"\n{'='*60}\n[{i}/{len(CHAIN)}] python -m {mod}\n{'='*60}")
        code = subprocess.call([sys.executable, "-m", mod])
        if code != 0:
            print(f"\n❌ STOPPED at {mod} (exit {code}). Fix and re-run this script.")
            sys.exit(code)
    print("\n🎉 All done — dashboard data is fresh.")

if __name__ == "__main__":
    main()