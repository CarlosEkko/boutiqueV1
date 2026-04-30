"""OTC Chat — KBEX Mobile M4.2.

Two-way messaging between the OTC desk (admin/staff) and a client tied to an
OTC deal. New messages trigger Expo push notifications to the other party.

DB collection: `otc_chat_messages`
  {
    id: str (uuid),
    deal_id: str,
    sender_id: str,         # user_id who sent
    sender_role: "client" | "desk",
    sender_name: str,       # cached for snappy rendering
    body: str,
    attachments: list[dict] = [],   # reserved for future use
    created_at: iso,
    read_by: list[str] = [],        # user_ids who have read it
  }
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import logging
import os
import uuid
import httpx

from utils.auth import get_current_user_id

router = APIRouter(prefix="/otc-chat", tags=["OTC Chat"])
logger = logging.getLogger(__name__)

db = None


def set_db(database):
    global db
    db = database


class SendMessageRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)


class MessageResponse(BaseModel):
    id: str
    deal_id: str
    sender_id: str
    sender_role: str
    sender_name: str
    body: str
    created_at: str
    is_self: bool = False  # set per-request for the caller
    read_by: List[str] = []


class DealSummary(BaseModel):
    id: str
    deal_number: Optional[str] = None
    deal_type: Optional[str] = None
    asset: Optional[str] = None
    quantity: Optional[float] = None
    total_value: Optional[float] = None
    stage: Optional[str] = None
    status: Optional[str] = None
    client_name: Optional[str] = None
    last_message_at: Optional[str] = None
    last_message_preview: Optional[str] = None
    unread_count: int = 0


# ----- helpers -----

async def _resolve_user_role_and_name(user_id: str) -> tuple[str, str]:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "first_name": 1, "last_name": 1, "email": 1, "is_admin": 1, "internal_role": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = "desk" if (user.get("is_admin") or user.get("internal_role")) else "client"
    name = " ".join(filter(None, [user.get("first_name"), user.get("last_name")])).strip() or user.get("email", "User")
    return role, name


async def _get_deal_or_404(deal_id: str) -> dict:
    """Resolve a deal across both prod (`otc_deals`) and demo (`demo_otc_deals`) collections."""
    for coll_name in ("otc_deals", "demo_otc_deals"):
        coll = getattr(db, coll_name)
        deal = await coll.find_one({"id": deal_id}, {"_id": 0})
        if deal:
            deal["__collection"] = coll_name
            return deal
    raise HTTPException(status_code=404, detail="Deal not found")


async def _check_can_access_deal(user_id: str, deal: dict, role: str) -> None:
    """Permission gate: desk can see all; client only deals they own."""
    if role == "desk":
        return
    # Client side: must match user_id directly OR via OTC client_id mapping.
    if deal.get("client_user_id") == user_id or deal.get("created_by") == user_id:
        return
    client_id = deal.get("client_id")
    if client_id:
        client = await db.otc_clients.find_one({"id": client_id, "user_id": user_id}, {"_id": 0, "id": 1})
        if client:
            return
    raise HTTPException(status_code=403, detail="Not allowed to access this deal chat")


async def _send_push_to_user(target_user_id: str, title: str, body: str, data: dict) -> None:
    """Best-effort Expo push to all active tokens of a user."""
    if not target_user_id:
        return
    tokens = await db.push_tokens.find(
        {"user_id": target_user_id, "active": True},
        {"_id": 0, "token": 1},
    ).to_list(20)
    token_strs = [t["token"] for t in tokens]
    if not token_strs:
        return
    messages = [
        {"to": tok, "title": title, "body": body, "sound": "default", "data": data, "priority": "high"}
        for tok in token_strs
    ]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post("https://exp.host/--/api/v2/push/send", json=messages)
            if resp.status_code >= 400:
                logger.warning("OTC chat push: Expo returned %s", resp.status_code)
    except Exception as exc:
        logger.warning("OTC chat push send failed: %s", exc)


def _resolve_recipient_user_id(deal: dict, sender_id: str, sender_role: str) -> Optional[str]:
    """Pick the recipient user_id for the push notification.

    From client → desk: notify the deal's account_manager_id (desk staff).
    From desk → client: notify the linked client user_id (or `created_by` fallback).
    """
    if sender_role == "client":
        return deal.get("account_manager_id") or deal.get("assigned_to")
    # desk → client
    return deal.get("client_user_id") or deal.get("created_by")


# ----- endpoints -----

@router.get("/deals", response_model=List[DealSummary])
async def list_my_chat_deals(user_id: str = Depends(get_current_user_id)):
    """Return all OTC deals visible to the caller, with chat metadata."""
    role, _ = await _resolve_user_role_and_name(user_id)

    # Build query: desk sees all; client sees only their own (owned or linked).
    summaries: list[DealSummary] = []
    seen_ids: set = set()

    async def emit(deal: dict):
        if deal["id"] in seen_ids:
            return
        seen_ids.add(deal["id"])
        last_msg = await db.otc_chat_messages.find_one(
            {"deal_id": deal["id"]},
            {"_id": 0, "body": 1, "created_at": 1},
            sort=[("created_at", -1)],
        )
        unread = await db.otc_chat_messages.count_documents({
            "deal_id": deal["id"],
            "sender_id": {"$ne": user_id},
            "read_by": {"$ne": user_id},
        })
        summaries.append(DealSummary(
            id=deal["id"],
            deal_number=deal.get("deal_number"),
            deal_type=deal.get("deal_type"),
            asset=deal.get("asset"),
            quantity=deal.get("quantity"),
            total_value=deal.get("total_value"),
            stage=deal.get("stage"),
            status=deal.get("status"),
            client_name=deal.get("client_name"),
            last_message_at=last_msg.get("created_at") if last_msg else None,
            last_message_preview=(last_msg.get("body") or "")[:120] if last_msg else None,
            unread_count=unread,
        ))

    if role == "desk":
        for coll_name in ("otc_deals", "demo_otc_deals"):
            cursor = getattr(db, coll_name).find({}, {"_id": 0}).sort("updated_at", -1)
            async for d in cursor:
                await emit(d)
    else:
        # Client: only their own.
        my_clients = await db.otc_clients.find({"user_id": user_id}, {"_id": 0, "id": 1}).to_list(50)
        client_ids = [c["id"] for c in my_clients]
        query = {
            "$or": [
                {"client_user_id": user_id},
                {"created_by": user_id},
            ]
        }
        if client_ids:
            query["$or"].append({"client_id": {"$in": client_ids}})
        for coll_name in ("otc_deals", "demo_otc_deals"):
            cursor = getattr(db, coll_name).find(query, {"_id": 0}).sort("updated_at", -1)
            async for d in cursor:
                await emit(d)

    summaries.sort(key=lambda s: s.last_message_at or "", reverse=True)
    return summaries


@router.get("/deals/{deal_id}/messages", response_model=List[MessageResponse])
async def list_deal_messages(
    deal_id: str,
    limit: int = 200,
    user_id: str = Depends(get_current_user_id),
):
    role, _ = await _resolve_user_role_and_name(user_id)
    deal = await _get_deal_or_404(deal_id)
    await _check_can_access_deal(user_id, deal, role)

    cursor = db.otc_chat_messages.find({"deal_id": deal_id}, {"_id": 0}).sort("created_at", 1).limit(limit)
    out: list[MessageResponse] = []
    async for m in cursor:
        out.append(MessageResponse(**m, is_self=(m.get("sender_id") == user_id)))
    return out


@router.post("/deals/{deal_id}/messages", response_model=MessageResponse, status_code=201)
async def send_message(
    deal_id: str,
    payload: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
):
    role, name = await _resolve_user_role_and_name(user_id)
    deal = await _get_deal_or_404(deal_id)
    await _check_can_access_deal(user_id, deal, role)

    now = datetime.now(timezone.utc).isoformat()
    msg = {
        "id": str(uuid.uuid4()),
        "deal_id": deal_id,
        "sender_id": user_id,
        "sender_role": role,
        "sender_name": name,
        "body": payload.body.strip(),
        "attachments": [],
        "created_at": now,
        "read_by": [user_id],
    }
    await db.otc_chat_messages.insert_one(dict(msg))

    # Bump deal updated_at on its native collection so list ordering stays accurate.
    coll_name = deal.get("__collection", "otc_deals")
    await getattr(db, coll_name).update_one(
        {"id": deal_id},
        {"$set": {"updated_at": now, "last_chat_at": now}},
    )

    # Push to the other party.
    recipient = _resolve_recipient_user_id(deal, user_id, role)
    if recipient and recipient != user_id:
        deal_label = deal.get("deal_number") or f"{deal.get('asset','')} {deal.get('deal_type','')}".strip() or "OTC"
        title = f"KBEX OTC · {deal_label}"
        body_text = f"{name}: {payload.body[:120]}"
        await _send_push_to_user(
            recipient,
            title=title,
            body=body_text,
            data={"type": "otc_chat", "deal_id": deal_id, "message_id": msg["id"]},
        )

    msg.pop("_id", None)
    return MessageResponse(**msg, is_self=True)


@router.post("/deals/{deal_id}/messages/read")
async def mark_messages_read(
    deal_id: str,
    user_id: str = Depends(get_current_user_id),
):
    role, _ = await _resolve_user_role_and_name(user_id)
    deal = await _get_deal_or_404(deal_id)
    await _check_can_access_deal(user_id, deal, role)

    result = await db.otc_chat_messages.update_many(
        {
            "deal_id": deal_id,
            "sender_id": {"$ne": user_id},
            "read_by": {"$ne": user_id},
        },
        {"$addToSet": {"read_by": user_id}},
    )
    return {"success": True, "marked_read": result.modified_count}
