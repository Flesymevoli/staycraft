"""Verify Supabase identity and single-account property ownership for formal API routes."""

import os
from dataclasses import dataclass
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class PropertyAccess:
    user_id: UUID
    property_id: UUID
    role: str


class SupabaseGateway:
    def __init__(self, url: str, publishable_key: str, transport: httpx.AsyncBaseTransport | None = None):
        self.url = url.rstrip("/")
        self.publishable_key = publishable_key
        self.transport = transport

    async def verify_property_access(self, token: str, property_id: UUID) -> PropertyAccess:
        headers = {
            "apikey": self.publishable_key,
            "Authorization": f"Bearer {token}",
        }
        try:
            async with httpx.AsyncClient(timeout=5, transport=self.transport) as client:
                identity = await client.get(f"{self.url}/auth/v1/user", headers=headers)
                if identity.status_code in (401, 403):
                    raise HTTPException(status_code=401, detail="Invalid session")
                identity.raise_for_status()
                user_id = UUID(identity.json()["id"])

                membership = await client.get(
                    f"{self.url}/rest/v1/properties",
                    headers=headers,
                    params={
                        "select": "id,owner_user_id",
                        "id": f"eq.{property_id}",
                        "owner_user_id": f"eq.{user_id}",
                        "limit": "1",
                    },
                )
                if membership.status_code in (401, 403):
                    raise HTTPException(status_code=401, detail="Invalid session")
                membership.raise_for_status()
                rows = membership.json()
                if not rows:
                    raise HTTPException(status_code=403, detail="Property access denied")
                if (not isinstance(rows, list) or len(rows)!=1 or not isinstance(rows[0], dict)
                        or rows[0].get("id") != str(property_id)
                        or rows[0].get("owner_user_id") != str(user_id)):
                    raise ValueError("Unexpected ownership response")
                return PropertyAccess(user_id=user_id, property_id=property_id, role="owner")
        except HTTPException:
            raise
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
            raise HTTPException(status_code=503, detail="Access verification unavailable") from exc


def get_gateway() -> SupabaseGateway:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    return SupabaseGateway(url, key)


async def require_property_access(
    property_id: UUID,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    gateway: SupabaseGateway = Depends(get_gateway),
) -> PropertyAccess:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign in required")
    return await gateway.verify_property_access(credentials.credentials, property_id)
