#!/usr/bin/env python3
"""
example_http_api_agent.py
HTTP API wrapper for customer data reads with Zero Trust, No-Before-Action, and audit enforcement.
- Enforces authentication and role-based access
- Integrates agent_manager.py for runtime policy enforcement
- Logs all agent actions
"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))
from agent_manager import enforce_agent_action_policy, log_audit_event

# --- Dummy customer data ---
CUSTOMERS = {
    'CUST-000123': {'customer_id': 'CUST-000123', 'name': 'Ayanda Mokoena', 'email': 'client@example.com', 'status': 'active'},
    'CUST-000456': {'customer_id': 'CUST-000456', 'name': 'Naledi Khumalo', 'email': 'naledi@example.com', 'status': 'inactive'}
}

# --- Dummy authentication/role check ---
def get_user_context(headers):
    # In real code, extract from JWT/session/cookie
    # Here, use headers for demo
    return {
        'authenticated': headers.get('X-Authenticated', 'false').lower() == 'true',
        'role': headers.get('X-Role', 'guest')
    }

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/customer-profile':
            params = parse_qs(parsed.query)
            customer_id = params.get('customer_id', [None])[0]
            user_context = get_user_context(self.headers)
            agent_request = {
                'agent_id': 'example-http-api',
                'capability': 'read_customer',
                'type': 'external',
                'risk': 'low',
                'inputs': {'customer_id': customer_id},
                'approved': False
            }
            try:
                # Enforce contract preconditions
                if not user_context['authenticated']:
                    raise PermissionError('Denied: User not authenticated.')
                if user_context['role'] not in ('operator', 'admin'):
                    raise PermissionError('Denied: User role not approved.')
                # Policy enforcement (audit, Zero Trust, etc)
                enforce_agent_action_policy(agent_request)
                # Fetch and return customer profile
                profile = CUSTOMERS.get(customer_id)
                if not profile:
                    self.send_response(404)
                    self.end_headers()
                    self.wfile.write(b'Customer not found')
                    log_audit_event(agent_request, 'DENIED', 'Customer not found')
                    return
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'customer_profile': profile}).encode())
                log_audit_event(agent_request, 'ALLOWED', 'Customer profile returned')
            except Exception as e:
                self.send_response(403)
                self.end_headers()
                self.wfile.write(f'Access denied: {e}'.encode())
                log_audit_event(agent_request, 'DENIED', str(e))
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not found')

def run(server_class=HTTPServer, handler_class=Handler, port=8080):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Serving HTTP API agent on port {port}...')
    httpd.serve_forever()

if __name__ == '__main__':
    run()
