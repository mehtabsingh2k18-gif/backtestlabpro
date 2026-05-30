// indicators/supertrend.js

export function createSupertrend({ chart, candles, options = {} }) {

    const period = options.period || 10;
    const multiplier = options.multiplier || 3;

    const line = chart.addLineSeries({
        color: options.color || "#00ff88",
        lineWidth: 2
    });

    const supertrendData =
        calculateSupertrend(candles, period, multiplier);

    line.setData(supertrendData);

    return {
        line,
        period,
        multiplier,
        color: options.color || "#00ff88",
        sourceCandles: [...candles],
        supertrendData
    };
}

export function updateSupertrend(instance, candle) {

    instance.sourceCandles.push(candle);

    const result =
        calculateSupertrend(
            instance.sourceCandles,
            instance.period,
            instance.multiplier
        );

    const latest = result[result.length - 1];

    if (!latest) return;

    instance.line.update(latest);

    instance.supertrendData.push(latest);
}
function calculateSupertrend(candles, period, multiplier) {

    if (!candles || candles.length < period)
        return [];

    const atr = calculateATR(candles, period);

    const result = [];

    let prevUpper = 0;
    let prevLower = 0;
    let prevTrend = 1;

    for (let i = period; i < candles.length; i++) {

        const c = candles[i];

        const hl2 =
            (c.high + c.low) / 2;

        const upperBand =
            hl2 + multiplier * atr[i];

        const lowerBand =
            hl2 - multiplier * atr[i];

        let finalUpper =
            (upperBand < prevUpper || candles[i - 1].close > prevUpper)
                ? upperBand
                : prevUpper;

        let finalLower =
            (lowerBand > prevLower || candles[i - 1].close < prevLower)
                ? lowerBand
                : prevLower;

        let trend = prevTrend;

        if (c.close > prevUpper)
            trend = 1;
        else if (c.close < prevLower)
            trend = -1;

        const value =
            trend === 1
                ? finalLower
                : finalUpper;

        result.push({
            time: c.time,
            value
        });

        prevUpper = finalUpper;
        prevLower = finalLower;
        prevTrend = trend;
    }

    return result;
}

function calculateATR(candles, period) {

    const tr = [0];

    for (let i = 1; i < candles.length; i++) {

        const current = candles[i];
        const prev = candles[i - 1];

        tr.push(
            Math.max(
                current.high - current.low,
                Math.abs(current.high - prev.close),
                Math.abs(current.low - prev.close)
            )
        );
    }

    const atr = [];

    let sum = 0;

    for (let i = 0; i < tr.length; i++) {

        sum += tr[i];

        if (i < period) {
            atr.push(sum / (i + 1));
        } else {

            atr.push(
                (atr[i - 1] * (period - 1) + tr[i])
                / period
            );
        }
    }

    return atr;
}