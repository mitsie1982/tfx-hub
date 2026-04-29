from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import uuid

app = FastAPI()
tokens = {}
ADMIN_TOKEN = "your_admin_token_here"

class TokenRequest(BaseModel):
    agent: str
    scope: str

@app.post("/issue")
def issue_token(req: TokenRequest, x_admin_token: str = Header(...)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(403, "Forbidden")
    token = str(uuid.uuid4())
    tokens[token] = {"agent": req.agent, "scope": req.scope}
    return {"token": token}

@app.post("/revoke")
def revoke_token(token: str, x_admin_token: str = Header(...)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(403, "Forbidden")
    if token in tokens:
        del tokens[token]
        return {"revoked": True}
    raise HTTPException(404, "Token not found")
