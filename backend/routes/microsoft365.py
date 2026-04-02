"""
Microsoft 365 Integration Routes
OAuth2 + Microsoft Graph API for Email, Calendar, and Tasks
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import logging
import uuid
import urllib.parse
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/o365", tags=["microsoft365"])

db = None

def set_db(database):
    global db
    db = database

def get_db():
    return db

from routes.auth import get_current_user

# Azure AD config — read at request time to support Docker env injection
def get_azure_config():
    return {
        "tenant_id": os.environ.get("AZURE_TENANT_ID", ""),
        "client_id": os.environ.get("AZURE_CLIENT_ID", ""),
        "client_secret": os.environ.get("AZURE_CLIENT_SECRET", ""),
        "redirect_uri": os.environ.get("AZURE_REDIRECT_URI", ""),
    }

GRAPH_BASE = "https://graph.microsoft.com/v1.0"

SCOPES = "offline_access openid profile email Mail.ReadWrite Mail.Send Calendars.ReadWrite Tasks.ReadWrite User.Read"


def get_auth_url_base():
    cfg = get_azure_config()
    return f"https://login.microsoftonline.com/{cfg['tenant_id']}/oauth2/v2.0/authorize"

def get_token_url():
    cfg = get_azure_config()
    return f"https://login.microsoftonline.com/{cfg['tenant_id']}/oauth2/v2.0/token"


# ==================== HELPERS ====================

async def get_o365_token(user_id: str) -> Optional[dict]:
    """Get stored O365 token for a user, refreshing if expired."""
    db = get_db()
    token_doc = await db.o365_tokens.find_one({"user_id": user_id}, {"_id": 0})
    if not token_doc:
        return None

    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if expires_at < datetime.now(timezone.utc) + timedelta(minutes=5):
        refreshed = await refresh_o365_token(user_id, token_doc["refresh_token"])
        if refreshed:
            return refreshed
        return None

    return token_doc


async def refresh_o365_token(user_id: str, refresh_token: str) -> Optional[dict]:
    """Refresh an expired O365 access token."""
    cfg = get_azure_config()
    data = {
        "grant_type": "refresh_token",
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "refresh_token": refresh_token,
        "scope": SCOPES,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(get_token_url(), data=data)
            if resp.status_code != 200:
                logger.error(f"O365 token refresh failed: {resp.text}")
                return None
            token_data = resp.json()

        db = get_db()
        update = {
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token", refresh_token),
            "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"])).isoformat(),
        }
        await db.o365_tokens.update_one({"user_id": user_id}, {"$set": update})
        token_doc = await db.o365_tokens.find_one({"user_id": user_id}, {"_id": 0})
        return token_doc
    except Exception as e:
        logger.error(f"O365 token refresh error: {e}")
        return None


async def graph_request(method: str, endpoint: str, access_token: str, **kwargs) -> dict:
    """Make a request to Microsoft Graph API."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    url = f"{GRAPH_BASE}{endpoint}"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(method, url, headers=headers, **kwargs)
            if resp.status_code in (200, 201):
                if resp.content:
                    return resp.json()
                return {"success": True}
            if resp.status_code in (202, 204):
                return {"success": True}
            if resp.status_code >= 400:
                logger.error(f"Graph API {method} {endpoint}: {resp.status_code} - {resp.text}")
                error_msg = resp.text
                try:
                    error_msg = resp.json().get("error", {}).get("message", resp.text)
                except Exception:
                    pass
                raise HTTPException(status_code=resp.status_code, detail=error_msg)
            return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Graph API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== OAUTH2 ====================

@router.get("/auth/url")
async def get_o365_auth_url(current_user=Depends(get_current_user)):
    """Generate Microsoft OAuth2 authorization URL."""
    cfg = get_azure_config()
    if not cfg["client_id"] or not cfg["tenant_id"]:
        raise HTTPException(status_code=500, detail="Azure AD não configurado. Defina AZURE_TENANT_ID e AZURE_CLIENT_ID.")

    state = str(uuid.uuid4())
    db = get_db()
    await db.o365_states.update_one(
        {"user_id": current_user.id},
        {"$set": {"state": state, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

    params = {
        "client_id": cfg["client_id"],
        "response_type": "code",
        "redirect_uri": cfg["redirect_uri"],
        "scope": SCOPES,
        "state": state,
        "response_mode": "query",
        "prompt": "select_account",
        "login_hint": current_user.email if hasattr(current_user, 'email') else "",
        "domain_hint": "kryptobox.onmicrosoft.com",
    }
    # Remove empty params
    params = {k: v for k, v in params.items() if v}
    url = f"{get_auth_url_base()}?{urllib.parse.urlencode(params)}"
    return {"auth_url": url}


class OAuthCallbackRequest(BaseModel):
    code: str
    state: str


@router.post("/auth/callback")
async def oauth_callback(data: OAuthCallbackRequest, current_user=Depends(get_current_user)):
    """Exchange authorization code for tokens and store them."""
    return await _exchange_token(data.code, data.state, current_user)


@router.get("/auth/callback/redirect")
async def oauth_callback_redirect(code: str = Query(""), state: str = Query(""), error: str = Query("")):
    """Handle GET/POST redirect from Microsoft - redirects to frontend callback page."""
    from fastapi.responses import RedirectResponse
    cfg = get_azure_config()
    frontend_url = cfg["redirect_uri"].replace("/api/o365/auth/callback/redirect", "")
    # Redirect to frontend O365Callback page with params
    if error:
        return RedirectResponse(url=f"{frontend_url}/auth/o365/callback?error={error}")
    return RedirectResponse(url=f"{frontend_url}/auth/o365/callback?code={code}&state={state}")


async def _exchange_token(code: str, state: str, current_user):
    """Internal: Exchange authorization code for tokens."""
    db = get_db()
    cfg = get_azure_config()

    state_doc = await db.o365_states.find_one({"user_id": current_user.id, "state": state})
    if not state_doc:
        raise HTTPException(status_code=400, detail="Estado OAuth inválido")

    token_data_req = {
        "grant_type": "authorization_code",
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "redirect_uri": cfg["redirect_uri"],
        "code": code,
        "scope": SCOPES,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(get_token_url(), data=token_data_req)
        if resp.status_code != 200:
            logger.error(f"O365 token exchange failed: {resp.text}")
            raise HTTPException(status_code=400, detail=f"Falha na autenticação: {resp.json().get('error_description', resp.text)}")
        tokens = resp.json()

    profile_headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        profile_resp = await client.get(f"{GRAPH_BASE}/me", headers=profile_headers)
        profile = profile_resp.json() if profile_resp.status_code == 200 else {}

    token_doc = {
        "user_id": current_user.id,
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token", ""),
        "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=tokens["expires_in"])).isoformat(),
        "account_email": profile.get("mail") or profile.get("userPrincipalName", ""),
        "account_name": profile.get("displayName", ""),
        "connected_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.o365_tokens.update_one({"user_id": current_user.id}, {"$set": token_doc}, upsert=True)
    await db.o365_states.delete_one({"user_id": current_user.id})

    return {
        "success": True,
        "account_email": token_doc["account_email"],
        "account_name": token_doc["account_name"],
    }


@router.get("/auth/status")
async def get_auth_status(current_user=Depends(get_current_user)):
    """Check if user has a connected O365 account."""
    db = get_db()
    token_doc = await db.o365_tokens.find_one({"user_id": current_user.id}, {"_id": 0, "access_token": 0, "refresh_token": 0})
    if not token_doc:
        return {"connected": False}
    return {
        "connected": True,
        "account_email": token_doc.get("account_email", ""),
        "account_name": token_doc.get("account_name", ""),
        "connected_at": token_doc.get("connected_at", ""),
    }


@router.delete("/auth/disconnect")
async def disconnect_o365(current_user=Depends(get_current_user)):
    """Disconnect O365 account."""
    db = get_db()
    await db.o365_tokens.delete_one({"user_id": current_user.id})
    return {"success": True}


# ==================== EMAIL ====================

@router.get("/mail/folders")
async def get_mail_folders(current_user=Depends(get_current_user)):
    """Get mail folders from O365."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    data = await graph_request("GET", "/me/mailFolders?$top=50", token["access_token"])
    folders = []
    for f in data.get("value", []):
        folders.append({
            "id": f["id"],
            "name": f["displayName"],
            "unread_count": f.get("unreadItemCount", 0),
            "total_count": f.get("totalItemCount", 0),
        })
    return {"folders": folders}


@router.get("/mail/messages")
async def get_mail_messages(
    folder_id: str = Query("inbox"),
    skip: int = 0,
    top: int = 25,
    search: str = "",
    current_user=Depends(get_current_user),
):
    """Get messages from a mail folder."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    select = "$select=id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,importance,flag"
    order = "$orderby=receivedDateTime desc"
    endpoint = f"/me/mailFolders/{folder_id}/messages?{select}&{order}&$top={top}&$skip={skip}"

    if search:
        endpoint += f"&$search=\"{search}\""

    data = await graph_request("GET", endpoint, token["access_token"])
    messages = []
    for m in data.get("value", []):
        from_addr = m.get("from", {}).get("emailAddress", {})
        messages.append({
            "id": m["id"],
            "subject": m.get("subject", "(Sem assunto)"),
            "from_email": from_addr.get("address", ""),
            "from_name": from_addr.get("name", ""),
            "to": [r["emailAddress"]["address"] for r in m.get("toRecipients", [])],
            "received_at": m.get("receivedDateTime", ""),
            "is_read": m.get("isRead", False),
            "has_attachments": m.get("hasAttachments", False),
            "preview": m.get("bodyPreview", ""),
            "importance": m.get("importance", "normal"),
            "flagged": m.get("flag", {}).get("flagStatus", "notFlagged") == "flagged",
        })
    return {"messages": messages, "total": len(messages)}


@router.get("/mail/messages/{message_id}")
async def get_message_detail(message_id: str, current_user=Depends(get_current_user)):
    """Get full message detail including body."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    data = await graph_request(
        "GET",
        f"/me/messages/{message_id}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,isRead,hasAttachments,importance",
        token["access_token"],
    )

    # Mark as read
    if not data.get("isRead", True):
        try:
            await graph_request("PATCH", f"/me/messages/{message_id}", token["access_token"], json={"isRead": True})
        except Exception:
            pass

    from_addr = data.get("from", {}).get("emailAddress", {})
    return {
        "id": data["id"],
        "subject": data.get("subject", ""),
        "from_email": from_addr.get("address", ""),
        "from_name": from_addr.get("name", ""),
        "to": [r["emailAddress"]["address"] for r in data.get("toRecipients", [])],
        "cc": [r["emailAddress"]["address"] for r in data.get("ccRecipients", [])],
        "received_at": data.get("receivedDateTime", ""),
        "body_html": data.get("body", {}).get("content", ""),
        "body_type": data.get("body", {}).get("contentType", "html"),
        "is_read": data.get("isRead", False),
        "has_attachments": data.get("hasAttachments", False),
        "importance": data.get("importance", "normal"),
    }


@router.get("/mail/messages/{message_id}/attachments")
async def get_attachments(message_id: str, current_user=Depends(get_current_user)):
    """Get message attachments."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    data = await graph_request("GET", f"/me/messages/{message_id}/attachments", token["access_token"])
    attachments = []
    for a in data.get("value", []):
        attachments.append({
            "id": a["id"],
            "name": a.get("name", ""),
            "size": a.get("size", 0),
            "content_type": a.get("contentType", ""),
            "is_inline": a.get("isInline", False),
        })
    return {"attachments": attachments}


class SendMailRequest(BaseModel):
    to_email: str
    to_name: str = ""
    subject: str
    body_html: str
    cc: List[str] = []


@router.post("/mail/send")
async def send_mail(data: SendMailRequest, current_user=Depends(get_current_user)):
    """Send an email via O365."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    payload = {
        "message": {
            "subject": data.subject,
            "body": {"contentType": "HTML", "content": data.body_html},
            "toRecipients": [{"emailAddress": {"address": data.to_email, "name": data.to_name}}],
        },
        "saveToSentItems": True,
    }
    if data.cc:
        payload["message"]["ccRecipients"] = [{"emailAddress": {"address": e}} for e in data.cc]

    await graph_request("POST", "/me/sendMail", token["access_token"], json=payload)
    return {"success": True}


class ReplyRequest(BaseModel):
    comment: str


@router.post("/mail/messages/{message_id}/reply")
async def reply_message(message_id: str, data: ReplyRequest, current_user=Depends(get_current_user)):
    """Reply to a message."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    await graph_request("POST", f"/me/messages/{message_id}/reply", token["access_token"], json={"comment": data.comment})
    return {"success": True}


class ForwardRequest(BaseModel):
    to_email: str
    to_name: str = ""
    comment: str = ""


@router.post("/mail/messages/{message_id}/forward")
async def forward_message(message_id: str, data: ForwardRequest, current_user=Depends(get_current_user)):
    """Forward a message."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    payload = {
        "comment": data.comment,
        "toRecipients": [{"emailAddress": {"address": data.to_email, "name": data.to_name}}],
    }
    await graph_request("POST", f"/me/messages/{message_id}/forward", token["access_token"], json=payload)
    return {"success": True}


class MoveRequest(BaseModel):
    destination_folder_id: str


@router.post("/mail/messages/{message_id}/move")
async def move_message(message_id: str, data: MoveRequest, current_user=Depends(get_current_user)):
    """Move a message to another folder."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    await graph_request("POST", f"/me/messages/{message_id}/move", token["access_token"], json={"destinationId": data.destination_folder_id})
    return {"success": True}


@router.delete("/mail/messages/{message_id}")
async def delete_message(message_id: str, current_user=Depends(get_current_user)):
    """Delete a message."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    await graph_request("DELETE", f"/me/messages/{message_id}", token["access_token"])
    return {"success": True}


# ==================== CALENDAR ====================

@router.get("/calendar/events")
async def get_calendar_events(
    start: str = Query(...),
    end: str = Query(...),
    current_user=Depends(get_current_user),
):
    """Get calendar events in a date range."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    endpoint = f"/me/calendarView?startDateTime={start}&endDateTime={end}&$top=200&$orderby=start/dateTime&$select=id,subject,start,end,location,isAllDay,attendees,body,organizer,isCancelled"
    data = await graph_request("GET", endpoint, token["access_token"])

    events = []
    for e in data.get("value", []):
        events.append({
            "id": e["id"],
            "title": e.get("subject", ""),
            "start_date": e.get("start", {}).get("dateTime", ""),
            "start_tz": e.get("start", {}).get("timeZone", "UTC"),
            "end_date": e.get("end", {}).get("dateTime", ""),
            "end_tz": e.get("end", {}).get("timeZone", "UTC"),
            "location": e.get("location", {}).get("displayName", ""),
            "all_day": e.get("isAllDay", False),
            "attendees": [a["emailAddress"]["address"] for a in e.get("attendees", []) if a.get("emailAddress")],
            "body": e.get("body", {}).get("content", ""),
            "organizer": e.get("organizer", {}).get("emailAddress", {}).get("address", ""),
            "cancelled": e.get("isCancelled", False),
        })
    return {"events": events}


class CreateEventRequest(BaseModel):
    subject: str
    start_time: str
    end_time: str
    time_zone: str = "UTC"
    location: str = ""
    body: str = ""
    attendees: List[str] = []
    is_all_day: bool = False


@router.post("/calendar/events")
async def create_calendar_event(data: CreateEventRequest, current_user=Depends(get_current_user)):
    """Create a calendar event."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    payload = {
        "subject": data.subject,
        "start": {"dateTime": data.start_time, "timeZone": data.time_zone},
        "end": {"dateTime": data.end_time, "timeZone": data.time_zone},
        "isAllDay": data.is_all_day,
    }
    if data.location:
        payload["location"] = {"displayName": data.location}
    if data.body:
        payload["body"] = {"contentType": "HTML", "content": data.body}
    if data.attendees:
        payload["attendees"] = [
            {"emailAddress": {"address": e}, "type": "required"} for e in data.attendees
        ]

    result = await graph_request("POST", "/me/events", token["access_token"], json=payload)
    return {"success": True, "event_id": result.get("id")}


class UpdateEventRequest(BaseModel):
    subject: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    time_zone: str = "UTC"
    location: Optional[str] = None
    body: Optional[str] = None


@router.patch("/calendar/events/{event_id}")
async def update_calendar_event(event_id: str, data: UpdateEventRequest, current_user=Depends(get_current_user)):
    """Update a calendar event."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    payload = {}
    if data.subject is not None:
        payload["subject"] = data.subject
    if data.start_time is not None:
        payload["start"] = {"dateTime": data.start_time, "timeZone": data.time_zone}
    if data.end_time is not None:
        payload["end"] = {"dateTime": data.end_time, "timeZone": data.time_zone}
    if data.location is not None:
        payload["location"] = {"displayName": data.location}
    if data.body is not None:
        payload["body"] = {"contentType": "HTML", "content": data.body}

    await graph_request("PATCH", f"/me/events/{event_id}", token["access_token"], json=payload)
    return {"success": True}


@router.delete("/calendar/events/{event_id}")
async def delete_calendar_event(event_id: str, current_user=Depends(get_current_user)):
    """Delete a calendar event."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    await graph_request("DELETE", f"/me/events/{event_id}", token["access_token"])
    return {"success": True}


# ==================== TASKS ====================

@router.get("/tasks/lists")
async def get_task_lists(current_user=Depends(get_current_user)):
    """Get task lists from Microsoft To Do."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    data = await graph_request("GET", "/me/todo/lists", token["access_token"])
    lists = []
    for l in data.get("value", []):
        lists.append({
            "id": l["id"],
            "name": l.get("displayName", ""),
            "is_default": l.get("wellknownListName") == "defaultList",
        })
    return {"lists": lists}


@router.get("/tasks/lists/{list_id}/tasks")
async def get_tasks(list_id: str, status: str = "", current_user=Depends(get_current_user)):
    """Get tasks from a task list."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    endpoint = f"/me/todo/lists/{list_id}/tasks?$top=100&$orderby=createdDateTime desc"
    if status == "completed":
        endpoint += "&$filter=status eq 'completed'"
    elif status == "notStarted":
        endpoint += "&$filter=status eq 'notStarted'"

    data = await graph_request("GET", endpoint, token["access_token"])
    tasks = []
    for t in data.get("value", []):
        due = t.get("dueDateTime")
        tasks.append({
            "id": t["id"],
            "title": t.get("title", ""),
            "body": t.get("body", {}).get("content", ""),
            "status": t.get("status", "notStarted"),
            "importance": t.get("importance", "normal"),
            "due_date": due.get("dateTime", "") if due else "",
            "created_at": t.get("createdDateTime", ""),
            "completed_at": t.get("completedDateTime", {}).get("dateTime", "") if t.get("completedDateTime") else "",
            "categories": t.get("categories", []),
        })
    return {"tasks": tasks}


class CreateTaskRequest(BaseModel):
    title: str
    body: str = ""
    importance: str = "normal"
    due_date: Optional[str] = None
    categories: List[str] = []


@router.post("/tasks/lists/{list_id}/tasks")
async def create_task(list_id: str, data: CreateTaskRequest, current_user=Depends(get_current_user)):
    """Create a task."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    payload = {
        "title": data.title,
        "importance": data.importance,
        "categories": data.categories,
    }
    if data.body:
        payload["body"] = {"contentType": "text", "content": data.body}
    if data.due_date:
        payload["dueDateTime"] = {"dateTime": data.due_date, "timeZone": "UTC"}

    result = await graph_request("POST", f"/me/todo/lists/{list_id}/tasks", token["access_token"], json=payload)
    return {"success": True, "task_id": result.get("id")}


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None
    importance: Optional[str] = None
    due_date: Optional[str] = None


@router.patch("/tasks/lists/{list_id}/tasks/{task_id}")
async def update_task(list_id: str, task_id: str, data: UpdateTaskRequest, current_user=Depends(get_current_user)):
    """Update a task."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    payload = {}
    if data.title is not None:
        payload["title"] = data.title
    if data.status is not None:
        payload["status"] = data.status
    if data.importance is not None:
        payload["importance"] = data.importance
    if data.body is not None:
        payload["body"] = {"contentType": "text", "content": data.body}
    if data.due_date is not None:
        payload["dueDateTime"] = {"dateTime": data.due_date, "timeZone": "UTC"}

    await graph_request("PATCH", f"/me/todo/lists/{list_id}/tasks/{task_id}", token["access_token"], json=payload)
    return {"success": True}


@router.delete("/tasks/lists/{list_id}/tasks/{task_id}")
async def delete_task(list_id: str, task_id: str, current_user=Depends(get_current_user)):
    """Delete a task."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada")

    await graph_request("DELETE", f"/me/todo/lists/{list_id}/tasks/{task_id}", token["access_token"])
    return {"success": True}


# ==================== MEETINGS (Teams) ====================

class ScheduleMeetingRequest(BaseModel):
    subject: str
    start_time: str  # ISO format
    duration_minutes: int = 30
    time_zone: str = "Europe/Lisbon"
    attendee_email: str
    attendee_name: str = ""
    notes: str = ""
    lead_id: str
    lead_type: str  # "crm" or "otc"


@router.post("/meetings/schedule")
async def schedule_meeting(data: ScheduleMeetingRequest, current_user=Depends(get_current_user)):
    """Schedule a Teams meeting linked to a CRM/OTC lead."""
    token = await get_o365_token(current_user.id)
    if not token:
        raise HTTPException(status_code=401, detail="Conta O365 não conectada. Conecte-se no Team Hub primeiro.")

    db = get_db()

    # Calculate end time
    from datetime import datetime as dt
    start = dt.fromisoformat(data.start_time.replace("Z", "+00:00"))
    end = start + timedelta(minutes=data.duration_minutes)

    body_html = f"""
    <p><strong>Reunião KBEX</strong></p>
    <p>Lead: {data.attendee_name} ({data.attendee_email})</p>
    {f'<p>Notas: {data.notes}</p>' if data.notes else ''}
    """

    payload = {
        "subject": data.subject,
        "start": {"dateTime": data.start_time, "timeZone": data.time_zone},
        "end": {"dateTime": end.isoformat(), "timeZone": data.time_zone},
        "body": {"contentType": "HTML", "content": body_html},
        "attendees": [
            {
                "emailAddress": {"address": data.attendee_email, "name": data.attendee_name},
                "type": "required"
            }
        ],
        "isOnlineMeeting": True,
        "onlineMeetingProvider": "teamsForBusiness",
    }

    result = await graph_request("POST", "/me/events", token["access_token"], json=payload)

    # Extract Teams link
    teams_link = ""
    online_meeting = result.get("onlineMeeting")
    if online_meeting:
        teams_link = online_meeting.get("joinUrl", "")

    # Store meeting record in MongoDB
    meeting_record = {
        "id": str(uuid.uuid4()),
        "event_id": result.get("id", ""),
        "subject": data.subject,
        "start_time": data.start_time,
        "end_time": end.isoformat(),
        "time_zone": data.time_zone,
        "duration_minutes": data.duration_minutes,
        "attendee_email": data.attendee_email,
        "attendee_name": data.attendee_name,
        "notes": data.notes,
        "teams_link": teams_link,
        "lead_id": data.lead_id,
        "lead_type": data.lead_type,
        "organizer_id": current_user.id,
        "organizer_name": current_user.name if hasattr(current_user, 'name') else "",
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.meetings.insert_one(meeting_record)

    logger.info(f"Meeting scheduled: {data.subject} with {data.attendee_email} by {current_user.id}")

    return {
        "success": True,
        "meeting_id": meeting_record["id"],
        "event_id": result.get("id"),
        "teams_link": teams_link,
    }


@router.get("/meetings")
async def get_meetings(
    lead_id: Optional[str] = None,
    lead_type: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    """Get meetings, optionally filtered by lead."""
    db = get_db()
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    if lead_type:
        query["lead_type"] = lead_type

    meetings = await db.meetings.find(query, {"_id": 0}).sort("start_time", -1).to_list(100)
    return {"meetings": meetings}


@router.delete("/meetings/{meeting_id}")
async def cancel_meeting(meeting_id: str, current_user=Depends(get_current_user)):
    """Cancel a scheduled meeting."""
    db = get_db()
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")

    # Cancel in O365 Calendar
    event_id = meeting.get("event_id")
    if event_id:
        try:
            token = await get_o365_token(current_user.id)
            if token:
                await graph_request("DELETE", f"/me/events/{event_id}", token["access_token"])
        except Exception as e:
            logger.warning(f"Failed to cancel O365 event: {e}")

    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"success": True, "message": "Reunião cancelada"}
