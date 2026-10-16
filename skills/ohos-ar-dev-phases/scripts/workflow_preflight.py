#!/usr/bin/env python3
"""Run checks before the signed gate. Records all attempts, never advances a phase."""
import argparse
import json
import os
import sys
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'lib'))
from workflow_checks import stage_checks, record_preflight_fix

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--pipeline-dir',required=True)
    ap.add_argument('--phase',type=int,choices=range(1,9),required=True)
    ap.add_argument('--design'); ap.add_argument('--suites',nargs='+')
    ap.add_argument('--scenario-script'); ap.add_argument('--deploy-script')
    ap.add_argument('--fix-attempt',help='failed preflight ID to annotate before this retest')
    ap.add_argument('--cause'); ap.add_argument('--action')
    args=ap.parse_args()
    if args.fix_attempt:
        if not args.cause or not args.action: ap.error('--fix-attempt requires --cause and --action')
        record_preflight_fix(args.pipeline_dir,args.fix_attempt,args.cause,args.action)
    results=stage_checks(args.pipeline_dir,args.phase,design=args.design,suites=args.suites,scenario=args.scenario_script,deploy=args.deploy_script)
    print(json.dumps(results,ensure_ascii=False,indent=2))
    return 0 if all(r['status']=='PASS' for r in results) else 1

if __name__=='__main__': sys.exit(main())
