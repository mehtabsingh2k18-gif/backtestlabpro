// indicators/supertrend.js

export function createSupertrend({ chart, candles, options = {} }) {
    const period = parseInt(options.period) || 10;
    const multiplier = parseFloat(options.multiplier) || 3.0;

    const line = chart.addLineSeries({
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true
    });

    const instance = {
        line,
        period,
        multiplier,
        candlesHistory: [...candles],
        supertrendHistory: []
    };

    recalculateSupertrend(instance);
    return instance;
}

function calculateATR(candles, period) {
    const trs = [];
    for (let i = 0; i < candles.length; i++) {
        if (i === 0) {
            trs.push(candles[i].high - candles[i].low);
            continue;
        }
        const prevClose = candles[i - 1].close;
        const tr = Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - prevClose),
            Math.abs(candles[i].low - prevClose)
        );
        trs.push(tr);
    }

    const atrs = [];
    let sum = 0;
    for (let i = 0; i < trs.length; i++) {
        sum += trs[i];
        if (i < period - 1) {
            atrs.push(null);
        } else if (i === period - 1) {
            atrs.push(sum / period);
        } else {
            atrs.push((atrs[i - 1] * (period - 1) + trs[i]) / period);
        }
    }
    return atrs;
}

function recalculateSupertrend(instance) {
    const candles = instance.candlesHistory;
    const p = instance.period;
    const m = instance.multiplier;

    if (candles.length < p) return;

    const atrs = calculateATR(candles, p);
    const plotData = [];
    instance.supertrendHistory = [];

    let prevUpper = 0;
    let prevLower = 0;
    let prevClose = 0;
    let prevTrend = 1; // 1 = bullish, -1 = bearish
    let prevST = 0;

    for (let i = p - 1; i < candles.length; i++) {
        const c = candles[i];
        const atr = atrs[i];
        const hl2 = (c.high + c.low) / 2;

        let basicUpper = hl2 + (m * atr);
        let basicLower = hl2 - (m * atr);

        let finalUpper = basicUpper;
        let finalLower = basicLower;

        if (i > p - 1) {
            finalUpper = (basicUpper < prevUpper || prevClose > prevUpper) ? basicUpper : prevUpper;
            finalLower = (basicLower > prevLower || prevClose < prevLower) ? basicLower : prevLower;
        }

        let trend = prevTrend;
        if (prevST === prevUpper) {
            trend = c.close > finalUpper ? 1 : -1;
        } else {
            trend = c.close < finalLower ? -1 : 1;
        }

        const st = trend === 1 ? finalLower : finalUpper;
        const color = trend === 1 ? '#089981' : '#f23645';

        plotData.push({ time: c.time, value: st, color });
        instance.supertrendHistory.push({ time: c.time, value: st, trend, upper: finalUpper, lower: finalLower, color });

        prevUpper = finalUpper;
        prevLower = finalLower;
        prevClose = c.close;
        prevTrend = trend;
        prevST = st;
    }

    instance.line.setData(plotData);
}

export function updateSupertrend(instance, candle) {
    instance.candlesHistory.push(candle);
    const candles = instance.candlesHistory;
    const p = instance.period;
    const m = instance.multiplier;

    if (candles.length < p) return;

    const lastIdx = candles.length - 1;
    const prevClose = candles[lastIdx - 1].close;
    const tr = Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - prevClose),
        Math.abs(candle.low - prevClose)
    );

    // Approximate ATR smoothing step
    const prevATR = (candles[lastIdx - 1].high - candles[lastIdx - 1].low);
    const currentATR = (prevATR * (p - 1) + tr) / p;

    const hl2 = (candle.high + candle.low) / 2;
    const basicUpper = hl2 + (m * currentATR);
    const basicLower = hl2 - (m * currentATR);

    const prevHist = instance.supertrendHistory[instance.supertrendHistory.length - 1];
    let finalUpper = basicUpper;
    let finalLower = basicLower;

    if (prevHist) {
        finalUpper = (basicUpper < prevHist.upper || prevClose > prevHist.upper) ? basicUpper : prevHist.upper;
        finalLower = (basicLower > prevHist.lower || prevClose < prevHist.lower) ? basicLower : prevHist.lower;
    }

    let trend = prevHist ? prevHist.trend : 1;
    if (prevHist) {
        if (prevHist.value === prevHist.upper) {
            trend = candle.close > finalUpper ? 1 : -1;
        } else {
            trend = candle.close < finalLower ? -1 : 1;
        }
    }

    const st = trend === 1 ? finalLower : finalUpper;
    const color = trend === 1 ? '#089981' : '#f23645';

    instance.supertrendHistory.push({ time: candle.time, value: st, trend, upper: finalUpper, lower: finalLower, color });
    instance.line.update({ time: candle.time, value: st, color });
}