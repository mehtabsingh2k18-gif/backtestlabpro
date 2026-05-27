// indicators/atr.js

export function createATR({ chart, candles, options = {} }) {
    const period = options.period || 14;
    const line = chart.addLineSeries({
        color: options.color || '#9c27b0',
        lineWidth: 1.5,
        priceScaleId: 'atr-scale'
    });

    chart.priceScale('atr-scale').applyOptions({
        scaleMargins: { top: 0.82, bottom: 0.02 },
        borderColor: '#2a2e39',
        visible: true
    });

    let atrHistoryMeta = [];

    function calculateATR(dataList) {
        if (!dataList || dataList.length < 2) return [];
        const result = [];
        const trList = [];

        // Seed calculations starting from frame coordinate index 1
        for (let i = 1; i < dataList.length; i++) {
            const h = dataList[i].high;
            const l = dataList[i].low;
            const prevC = dataList[i - 1].close;

            const tr = Math.max(
                h - l,
                Math.abs(h - prevC),
                Math.abs(l - prevC)
            );
            trList.push({ time: dataList[i].time, tr });
        }

        if (trList.length < period) return [];

        let trSum = 0;
        for (let i = 0; i < period; i++) {
            trSum += trList[i].tr;
        }
        let currentAtr = trSum / period;
        result.push({ time: trList[period - 1].time, value: currentAtr });

        // Apply Wilder's smoothing function to the remaining items
        for (let i = period; i < trList.length; i++) {
            currentAtr = ((currentAtr * (period - 1)) + trList[i].tr) / period;
            result.push({ time: trList[i].time, value: currentAtr });
        }
        return result;
    }

    if (candles && candles.length) {
        atrHistoryMeta = calculateATR(candles);
        line.setData(atrHistoryMeta);
    }

    return {
        line,
        atrHistoryMeta,
        rawCandles: [...candles],
        options: { period }
    };
}

export function updateATR(instance, candle) {
    if (!instance || !instance.atrHistoryMeta || !instance.atrHistoryMeta.length) return;

    const prevCandles = instance.rawCandles;
    const prevCandle = prevCandles[prevCandles.length - 1];
    instance.rawCandles.push(candle);

    if (!prevCandle) return;

    const targetPeriod = instance.options?.period || 14;
    const tr = Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - prevCandle.close),
        Math.abs(candle.low - prevCandle.close)
    );

    const lastAtr = instance.atrHistoryMeta[instance.atrHistoryMeta.length - 1].value;
    const nextAtr = ((lastAtr * (targetPeriod - 1)) + tr) / targetPeriod;

    const updatedValue = { time: candle.time, value: nextAtr };
    instance.atrHistoryMeta.push(updatedValue);
    instance.line.update(updatedValue);
}