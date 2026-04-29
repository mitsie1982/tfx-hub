#!/usr/bin/env python3
"""
agent_action_cli.py
- CLI wrapper to generate agent action JSON files from arguments
- Usage: python3 scripts/agent_action_cli.py issue <agent_id> <capability> <customer_id> [--approved] [--output action.json]
"""
import sys, json, argparse, datetime

def main():
    parser = argparse.ArgumentParser(description='Agent Action CLI Wrapper')
    subparsers = parser.add_subparsers(dest='command')

    issue = subparsers.add_parser('issue', help='Issue an agent action')
    issue.add_argument('agent_id', help='Agent ID')
    issue.add_argument('capability', help='Capability name')
    issue.add_argument('customer_id', help='Customer ID')
    issue.add_argument('--approved', action='store_true', help='Set approved true')
    issue.add_argument('--output', default='action.json', help='Output file (default: action.json)')
    issue.add_argument('--run', action='store_true', help='Run agent_manager.py after generating action')
    issue.add_argument('--contract', default=None, help='Path to contract JSON to link')

    args = parser.parse_args()
    if args.command == 'issue':
        action = {
            'agent_id': args.agent_id,
            'name': f'export_{args.capability}',
            'capability': args.capability,
            'type': 'external',
            'risk': 'high',
            'inputs': {'customer_id': args.customer_id},
            'approved': args.approved,
            'timestamp': datetime.datetime.utcnow().isoformat() + 'Z'
        }
        if args.contract:
            try:
                with open(args.contract, 'r', encoding='utf-8') as cf:
                    contract = json.load(cf)
                action['contract'] = contract
            except Exception as e:
                print(f'Warning: Could not load contract file: {e}', file=sys.stderr)
        with open(args.output, 'w', encoding='utf-8') as fh:
            json.dump(action, fh, indent=2)
        print(f'Action JSON written to {args.output}')
        if getattr(args, 'run', False):
            import subprocess
            print(f'Running agent_manager.py with {args.output}...')
            result = subprocess.run([sys.executable, 'scripts/agent_manager.py', args.output], capture_output=True, text=True)
            print(result.stdout.strip())
            if result.stderr:
                print(result.stderr.strip(), file=sys.stderr)
            if result.returncode != 0:
                sys.exit(result.returncode)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
