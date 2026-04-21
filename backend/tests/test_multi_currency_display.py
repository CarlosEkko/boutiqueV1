"""
Multi-currency display tests — verify backend converts prices correctly across
all 7 client-visible fiat currencies (EUR, USD, AED, CHF, QAR, SAR, HKD) and
that the previously broken `markets/stats` endpoint now works for all of them.
"""
import requests
from conftest import API_BASE


SUPPORTED = ["EUR", "USD", "AED", "CHF", "QAR", "SAR", "HKD"]


def test_exchange_rates_returns_all_supported_currencies():
    """Backend must populate rates for ALL supported fiat, not just USD/EUR/AED/BRL."""
    r = requests.get(f"{API_BASE}/trading/exchange-rates", timeout=10)
    assert r.status_code == 200
    rates = r.json()["rates"]
    for ccy in SUPPORTED:
        assert ccy in rates, f"Missing rate for {ccy}"
        assert rates[ccy] > 0, f"{ccy} rate is zero/negative: {rates[ccy]}"
    # Sanity: rates are market-realistic (USD=1, EUR<1.5, HKD between 7-9)
    assert rates["USD"] == 1.0
    assert 0.5 < rates["EUR"] < 1.5
    assert 6.0 < rates["HKD"] < 9.0
    assert 3.0 < rates["AED"] < 4.5  # AED is pegged near 3.67


def test_markets_endpoint_converts_across_all_currencies():
    """BTC price should scale proportionally with the FX rate."""
    rates = requests.get(f"{API_BASE}/trading/exchange-rates", timeout=10).json()["rates"]

    usd_res = requests.get(f"{API_BASE}/trading/markets?currency=USD", timeout=15).json()
    btc_usd = next(m for m in usd_res["markets"] if m["symbol"] == "BTC")["price"]
    assert btc_usd > 1000, f"BTC USD too low: {btc_usd}"

    for ccy in SUPPORTED:
        res = requests.get(f"{API_BASE}/trading/markets?currency={ccy}", timeout=15).json()
        btc_ccy = next(m for m in res["markets"] if m["symbol"] == "BTC")["price"]
        expected = btc_usd * rates[ccy]
        # Allow 1% tolerance for live-price drift between the two calls.
        assert abs(btc_ccy - expected) / expected < 0.01, (
            f"BTC price in {ccy} off: got {btc_ccy}, expected ~{expected} "
            f"(USD={btc_usd}, rate={rates[ccy]})"
        )


def test_markets_stats_endpoint_works_for_all_currencies():
    """Regression: markets/stats used to 500 for non-USD because of a
    `Depends()` object leaking into a Mongo query. Must now return 200 and
    correctly localised market_cap for every supported fiat."""
    for ccy in SUPPORTED:
        r = requests.get(f"{API_BASE}/trading/markets/stats?currency={ccy}", timeout=15)
        assert r.status_code == 200, f"stats {ccy} failed: {r.status_code} {r.text[:200]}"
        data = r.json()
        assert data["currency"] == ccy
        assert data["total_market_cap"] > 0
        assert data["total_volume_24h"] > 0
        assert data["top_gainer"] is not None
        assert data["top_loser"] is not None
