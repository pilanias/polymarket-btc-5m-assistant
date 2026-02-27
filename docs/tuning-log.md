# Tuning Log — Parameter Changes & Data

Tracks every config change with the data that drove it. Never change parameters without updating this file.

---

## v1.0.9 — 2026-02-27 (151 trades post-v1.0.7)

### Dataset
- 151 trades on v1.0.7/v1.0.8
- v1.0.8 (100 trades): 43% WR, PF 1.09, +$38.61
- MFE analysis: winning trades capture only 63% of peak unrealized ($13.83 peak → $9.86 exit)
- 21 trades peaked at avg +$3.61, then reversed to avg -$5.30 loss

### Changes

| Parameter | Old | New | Data Rationale |
|-----------|-----|-----|----------------|
| `trailingStartUsd` | 3 | 4 | 21 reversal trades peaked avg $3.61 — premature trailing activation at $3 |
| `trailingDrawdownUsd` | 2.50 | 2.00 (base) | Tighter base for small wins ($4-8 range) |
| `trailingDrawdownTiers` | N/A | [{above:15, dd:4.0}, {above:8, dd:3.0}] | Tiered: $4-8 gets $2, $8-15 gets $3, $15+ gets $4 |

### Expected Impact
- Fewer premature trailing activations at $3-4 peaks (saves 21-type reversal losses)
- Small wins ($4-8) protected with tight $2 drawdown
- Medium wins ($8-15) given $3 room → capture more of the $10-20 bucket
- Big wins ($15+) given $4 room → ride $20-40 moves instead of exiting at $15

### Risks
- Higher start ($4) means some $3-4 wins become $0 or losses (but data shows these often reverse anyway)
- Tighter base ($2 vs $2.50) on small wins could cause more shake-outs in $4-8 range

---

## Future: Dynamic Contract Sizing (for live trading)

### Concept
Scale position size based on confidence signals:
- **Higher conviction** (strong RSI alignment, high model prob, high edge) → larger position
- **Lower conviction** (borderline signals) → smaller position
- Could also scale with recent win streak / PnL (Kelly criterion variant)

### Current State
- Fixed ~$80 contract size
- Every trade gets same risk regardless of signal strength

### Implementation Ideas
- Base size from bankroll percentage (e.g., 2% of balance)
- Multiplier from signal strength: 0.5x (weak) to 2.0x (strong)
- Hard floor/ceiling to prevent over-sizing
- Needs live trading data to calibrate — paper mode uses fixed balance

### Prerequisites
- Stable PF > 1.2 over 500+ trades
- Live trading enabled
- Risk management framework (max position per market, max daily exposure)

---

## v1.0.8 — 2026-02-27 (103 trades post-v1.0.7)

### Dataset
- 103 closed trades on v1.0.7 config
- Performance: 55% WR, PF 1.50, +$184.58
- Settlement data available for 53 trades

### Changes

| Parameter | Old | New | Data Rationale |
|-----------|-----|-----|----------------|
| `minHoldBeforeStopSeconds` | N/A | 5 | 5/7 "right direction but lost" trades hit max loss in <10s. 5s grace lets entry volatility settle |
| `stagnationExitSeconds` | N/A | 30 | Trades >25s: 36% WR, +$0.55 avg. Flat trades usually hit max loss eventually |
| `stagnationBandUsd` | N/A | 2 | Exit if PnL within ±$2 after stagnation threshold |
| `rsiBullishThreshold` | 60 | 65 | RSI>60 UP: 42 trades, 52% WR, -$7 PnL. Cuts marginal momentum entries |
| `weekdaysOnly` | false | true | Weekend = low volume, wider spreads. Stops trading Sat + Sun until 6 PM PST |
| `allowSundayAfterHour` | -1 | 18 | Resume Sunday 6 PM PST when volume picks up |

### Key Findings (settlement data, 53 trades)
- Direction accuracy: 34% (only right 1 in 3 times)
- Right direction + won: 11 trades, avg +$16.03 (the big wins)
- Wrong direction + won: 16 trades, avg +$7.98 (scalping microstructure)
- All 19 "wrong + lost" were Max Loss; all 27 wins were Trailing TP
- Bot is a scalper, not a directional predictor — profits from short-term volatility

### Expected Impact
- Min hold: converts some early stop-outs into winners (est. +$30-50 over 100 trades)
- Stagnation exit: cuts stagnant trades at ~-$1 instead of waiting for full -$8 max loss
- RSI threshold: removes unprofitable high-volume bucket
- Weekend block: avoids low-liquidity conditions

### Risks
- Min hold: extra $1-2 exposure per early trade if truly bad
- Stagnation exit: might cut trades that would have eventually won (but data says unlikely)
- RSI 65: reduces trade count. RSI 60-65 UP trades may include some winners we're now blocking
- Weekend block: misses any good weekend trades (acceptable trade-off for stability)

---

## v1.0.7 — 2026-02-26 (234 trades)

### Dataset
- 234 closed trades total (146 post-v1.0.5)
- v1.0.5 performance: 46% WR, PF 0.97, -$19.60

### Changes

| Parameter | Old | New | Data Rationale |
|-----------|-----|-----|----------------|
| `minPolyPrice` | 0.35 | 0.40 | 38 trades <40¢: 29% WR, -$107 PnL |
| `dynamicStopLossPct` | 0.12 | 0.10 | 63 max losses avg $9.82. Reducing saves ~$1-2/trade = $60-120 over sample |
| `rsiDirectionalBiasEnabled` | N/A | true | RSI<40 UP entries worst bucket (39% WR, -$68). RSI>60 UP best (51%) |
| `rsiBearishThreshold` | N/A | 40 | Below 40: only DOWN allowed |
| `rsiBullishThreshold` | N/A | 60 | Above 60: only UP allowed |
| `trailingDrawdownUsd` | 2.00 | 2.50 | 16 trailing TP losses from tight tolerance. Wider gives recovery room |
| `edgeEarly` | 0.02 | 0.015 | 84% of trades are EARLY, PF ~1.0. More volume at best timing window |

### Expected Impact
- Fewer bad entries (price floor + RSI bias cuts lowest WR buckets)
- Smaller max losses (~$8 instead of ~$10)
- More trailing TP recovery (fewer false exits)
- Slightly more trade volume from looser EARLY edge

### Risks
- RSI directional bias may reduce trade count significantly if RSI oscillates 40-60
- Wider trailing TP drawdown means giving back more profit on reversals
- Looser EARLY edge could let in marginal trades

---

## v1.0.5 — 2026-02-26 (84 trades)

### Dataset
- 84 closed trades (pre-v1.0.5 config)
- Overall: 37% WR, PF 0.72, -$117 PnL

### Changes

| Parameter | Old | New | Data Rationale |
|-----------|-----|-----|----------------|
| `minProbEarly` | 0.52 | 0.57 | Entries >60¢ had 63% WR vs 27% at <40¢ |
| `minProbMid` | 0.53 | 0.58 | Same analysis |
| `minProbLate` | 0.55 | 0.60 | Same analysis |
| `minPolyPrice` | 0.05 | 0.35 | 22 trades <40¢: 27% WR, -$72.60 |
| `trailingDrawdownUsd` | 1.50 | 2.00 | 16 TP losses avg -$2.47, many would have recovered |

### Outcome (146 trades post-change)
- WR: 39% → 46%
- PF: 0.72 → 0.97
- Trailing TP went 67W/16L (81% WR)
- Near breakeven: -$19.60

---

## v1.0.4 — 2026-02-25 (initial)

### Changes (from analysis of first 10 trades)

| Parameter | Old | New | Rationale |
|-----------|-----|-----|-----------|
| `trailingStartUsd` | 20 | 3 | $20 threshold rarely hit on 5m contracts |
| `trailingDrawdownUsd` | 10 | 1.50 | Tighter to capture small wins |
| `dynamicStopLossPct` | 0.20 | 0.12 | Losses avg $16, cut to ~$10 |
| `maxMaxLossUsd` | 40 | 20 | Absolute ceiling halved |
| `noTradeRsiOverbought` | N/A | 78 | Blocked UP entries at extreme RSI (89) |
| `noTradeRsiOversold` | N/A | 22 | Blocked DOWN entries at extreme RSI |
