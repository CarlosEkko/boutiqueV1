"""
Portugal Inflation Service — Fetches monthly CPI data from Eurostat API
Dataset: prc_hicp_midx (Monthly HICP Index, base 2015=100)
Calculates month-on-month inflation rates for Portugal
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
import httpx
import logging

from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/inflation", tags=["Inflation"])

# In-memory cache (refreshes daily)
_cache = {"data": None, "fetched_at": None}
CACHE_TTL_SECONDS = 86400  # 24h

EUROSTAT_URL = (
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_midx"
    "?format=JSON&lang=en&unit=I15&coicop=CP00&geo=PT&sinceTimePeriod=2024M01"
)


async def fetch_eurostat_data():
    """Fetch monthly HICP index from Eurostat and compute month-on-month rates"""
    now = datetime.now(timezone.utc)

    # Return cache if fresh
    if _cache["data"] and _cache["fetched_at"]:
        age = (now - _cache["fetched_at"]).total_seconds()
        if age < CACHE_TTL_SECONDS:
            return _cache["data"]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(EUROSTAT_URL)
            resp.raise_for_status()
            raw = resp.json()

        # Parse Eurostat JSON-stat format
        time_dim = raw.get("dimension", {}).get("time", {}).get("category", {})
        time_labels = time_dim.get("label", {})  # {"0": "2024M01", ...}
        time_index = time_dim.get("index", {})   # {"2024M01": 0, ...}
        values = raw.get("value", {})             # {"0": 124.5, ...}

        # Build sorted list of (period, index_value)
        points = []
        for period_key, idx in sorted(time_index.items(), key=lambda x: x[1]):
            val = values.get(str(idx))
            if val is not None:
                points.append({"period": period_key, "index": float(val)})

        # Calculate month-on-month inflation rates
        monthly_rates = []
        for i in range(1, len(points)):
            prev = points[i - 1]["index"]
            curr = points[i]["index"]
            if prev > 0:
                mom = ((curr - prev) / prev) * 100
                monthly_rates.append({
                    "period": points[i]["period"],
                    "index": round(curr, 2),
                    "mom_rate": round(mom, 4),  # month-on-month %
                })

        result = {
            "country": "PT",
            "source": "Eurostat HICP (prc_hicp_midx)",
            "base_year": "2015=100",
            "monthly_rates": monthly_rates,
            "last_updated": now.isoformat(),
        }
        _cache["data"] = result
        _cache["fetched_at"] = now
        return result

    except Exception as e:
        logger.error(f"Eurostat fetch failed: {e}")
        # Return cache even if stale
        if _cache["data"]:
            return _cache["data"]
        return {
            "country": "PT",
            "source": "Eurostat HICP (prc_hicp_midx)",
            "monthly_rates": [],
            "error": str(e),
            "last_updated": now.isoformat(),
        }


@router.get("/portugal")
async def get_portugal_inflation(current_user=Depends(get_current_user)):
    """Get monthly inflation rates for Portugal (month-on-month CPI changes)"""
    data = await fetch_eurostat_data()
    return {"success": True, **data}
