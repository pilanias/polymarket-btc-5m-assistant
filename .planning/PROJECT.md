# Polymarket BTC 5m Assistant

## What This Is

A high-frequency automated trading bot for Polymarket's 5-minute BTC Up/Down prediction contracts. It monitors BTC price movements across multiple feeds (Chainlink, Kraken, Coinbase, Polymarket), computes trading signals using technical indicators (RSI, MACD, VWAP, Heiken Ashi), and executes trades in both paper mode (simulated ledger) and live mode (CLOB via Polymarket API). Includes a real-time dashboard for monitoring, trade history, KPIs, and diagnostics. Trade data persisted in Supabase (hosted PostgreSQL) for deploy-proof history.

## Core Value

Profitable automated BTC contract trading with configurable risk controls that protect capital while maximizing opportunity capture across market conditions.

## Requirements

### Validated

- TRADE-01: 25-condition entry gate with configurable thresholds -- existing
- TRADE-02: Multi-condition exit evaluator (max loss, profit target, probability flip, rollover, trailing TP) -- existing
- TRADE-03: Dynamic bankroll-based position sizing with min/max bounds -- existing
- TRADE-04: Circuit breaker halting after consecutive losses with exponential backoff -- existing
- TRADE-05: Loss/win cooldowns between trades -- existing
- TRADE-06: Skip-market-after-max-loss safety gate -- existing
- TRADE-07: Max-loss grace window with model-support requirement -- existing
- TRADE-08: Weekend tightening with stricter thresholds -- existing
- FEED-01: Chainlink WebSocket + REST BTC price feed with 1m candle builder -- existing
- FEED-02: Kraken REST fallback for price and historical candle seeding -- existing
- FEED-03: Coinbase trade stream for spot impulse metrics -- existing
- FEED-04: Polymarket live WS + Gamma API for contract prices and orderbook -- existing
- IND-01: RSI with slope detection (period=9) -- existing
- IND-02: MACD with histogram and histogram delta (6/13/5) -- existing
- IND-03: VWAP with slope and distance metrics -- existing
- IND-04: Heiken Ashi with consecutive color counting -- existing
- IND-05: Range percentage and VWAP cross counting -- existing
- UI-01: Real-time dashboard with status table, open trade, ledger summary -- existing
- UI-02: Paper/Live mode toggle with first-poll-only sync -- existing
- UI-03: Start/Stop trading controls with pill status display -- existing
- UI-04: Trade history table with filters (limit, reason, side, losses only) -- existing
- UI-05: KPI cards (balance, realized PnL, win rate, profit factor, daily stats) -- existing
- UI-06: Equity curve chart with auto-downsampling -- existing
- UI-07: Entry blocker diagnostics (frequency tracking, top blockers row, /api/diagnostics) -- existing
- INFRA-01: Multi-instance oscillation prevention via instance locking and seeking mode -- existing
- INFRA-02: First-poll-only sync preventing server overwrite of user-controlled state -- existing
- INFRA-03: Paper trading ledger with JSON persistence and backup -- existing
- INFRA-04: Cache-busting headers and fetch timeout guards -- existing
- EXEC-01: Paper executor with simulated fills and ledger recording -- existing
- EXEC-02: Live executor with CLOB order submission, fills, approvals -- existing
- EXEC-03: Executor abstraction (OrderExecutor interface) for runtime swapping -- existing
- ANLYT-01: Historical trade performance dashboard (per-day, per-week, per-session) -- v1.0
- ANLYT-02: Strategy parameter backtesting framework -- v1.0
- ANLYT-03: Trade journal capturing entry/exit context (indicators, market state, signals) -- v1.0
- ANLYT-04: Drawdown analysis and advanced equity curve metrics (Sharpe, Sortino) -- v1.0
- PROF-01: Backtest harness replaying paper trade history with modified parameters -- v1.0
- PROF-02: Threshold optimizer testing parameter combinations and reporting win rate/PF -- v1.0
- PROF-03: Win rate and profit factor segmented by entry phase, time of day, market conditions -- v1.0
- PROF-04: Entry filter adjustments suggested based on blocker diagnostics frequency data -- v1.0
- LIVE-01: Full order lifecycle tracked (SUBMITTED->FILLED->EXITED) -- v1.0
- LIVE-02: Position reconciliation between CLOB state and local tracking -- v1.0
- LIVE-03: Fee-aware sizing incorporating fee estimates into trade decisions -- v1.0
- LIVE-04: Graceful error recovery for CLOB failures with exponential backoff retry -- v1.0
- LIVE-05: Daily PnL kill-switch validated end-to-end -- v1.0
- INFRA-05: Webhook alerts (Slack/Discord) on critical events -- v1.0
- INFRA-06: Auto-restart on crash with state recovery from persisted data -- v1.0
- INFRA-07: Structured data persistence (Supabase) beyond JSON ledger -- v1.0 + v1.1
- INFRA-08: Zero-downtime deployment with instance coordination -- v1.0
- DB-01: Every trade insert/update written to Supabase in real-time -- v1.1
- DB-02: All trade reads routed through Supabase client -- v1.1
- DB-03: Auto-migration of JSON ledger trades on first empty-table startup -- v1.1
- DB-04: JSON ledger fallback when Supabase unavailable -- v1.1
- DB-05: Supabase connection status logged on startup -- v1.1
- CFG-01: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY documented in .env.example -- v1.1
- CFG-02: package.json updated (add @supabase/supabase-js, remove better-sqlite3) -- v1.1

### Active

(No active requirements -- planning next milestone)

### Out of Scope

- Mobile app -- web dashboard is sufficient for monitoring
- Multi-asset trading -- focused on BTC 5m contracts only
- Social/copy trading -- single-user bot
- ML model training -- uses rule-based indicators, not trainable models
- Exchange trading -- Polymarket CLOB only, not Binance/Coinbase exchange
- React/framework migration -- vanilla JS dashboard works, no build step needed

## Context

- **Runtime**: Node.js 20+ with ESM modules, started with `--max-old-space-size=1024`
- **Deployment**: DigitalOcean App Platform with multiple instances behind load balancer
- **Architecture**: Clean architecture (domain/application/infrastructure/presentation layers)
- **Key Pattern**: Executor abstraction enables Paper/Live swap at runtime
- **Multi-Instance Challenge**: POSTs and GETs may hit different server instances; solved with frontend instance locking + seeking mode
- **Market Structure**: 5-minute BTC Up/Down contracts on Polymarket, new market every 5 minutes
- **Price Feeds**: 4-tier fallback (Chainlink WS -> Chainlink REST -> Polymarket WS -> Kraken REST)
- **Persistence**: Supabase (hosted PostgreSQL) for trade history; JSON ledger as offline fallback
- **Shipped**: v1.0 (analytics, backtesting, live trading, infrastructure) + v1.1 (Supabase persistence)

## Constraints

- **Tech Stack**: Node.js/ESM, Express for API, vanilla JS dashboard (no React/framework)
- **Deployment**: DigitalOcean App Platform with multi-instance load balancing
- **API Limits**: Polymarket CLOB has rate limits; circuit breaker prevents cascade
- **Memory**: 1GB heap cap (--max-old-space-size=1024)
- **Latency**: 1s main loop, 1.5s UI poll interval -- cannot be slower
- **Data**: Paper ledger is JSON file (not shared across instances); Supabase is shared
- **Persistence**: DigitalOcean Amsterdam has no persistent volumes; Supabase solves this

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Clean architecture layers | Separation of concerns, testability | Good |
| Executor abstraction | Runtime Paper/Live swap without code changes | Good |
| Instance locking + seeking mode | Multi-instance oscillation prevention | Good |
| Dropdown as source of truth | Prevents server overwriting user state | Good |
| First-poll-only sync | Mode/trading only synced once, then user-controlled | Good |
| 25 entry blockers (all must pass) | Conservative by design, protects capital | Revisit -- may be too strict |
| JSON paper ledger | Simple persistence, no DB needed | Good -- retained as offline fallback |
| Supabase replacing SQLite | Hosted PostgreSQL, survives deploys, DO-compatible | Good -- v1.1 shipped |
| service_role key (not anon) | Full database CRUD access required | Good |
| Fire-and-forget trade sync | PaperExecutor stays sync, Supabase writes async in background | Good |
| globalThis singleton pattern | ESM cross-module store access | Good -- pragmatic for ESM |
| Upsert for trade inserts | Idempotent, safe for retry/migration | Good |
| Vanilla JS dashboard | No build step, simple deployment | Pending |

---
*Last updated: 2026-02-24 after v1.1 milestone completed -- Supabase persistence shipped*
