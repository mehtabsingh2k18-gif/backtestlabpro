// indicators/bb.js

export function createBB({ chart, candles, options = {} }) {
    const period = options.period || 20;
    const stdDevMultiplier = options.stdDevMultiplier || 2;

    const upperLine = chart.addLineSeries({ color: options.color || '#2196f3', lineWidth: 1, lineStyle: 0 });
    const middleLine = chart.addLineSeries({ color: options.color || '#ff9800', lineWidth: 1, lineStyle: 2 });
    const lowerLine = chart.addLineSeries({ color: options.color || '#2196f3', lineWidth: 1, lineStyle: 0 });

    let bbHistoryMeta = [];

    function calculateBB(dataList) {
        if (!dataList || dataList.length < period) return [];
        const result = [];

        for (let i = 0; i < dataList.length; i++) {
            if (i < period - 1) continue;

            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += dataList[i - j].close;
            }
            const sma = sum / period;

            let varianceSum = 0;
            for (let j = 0; j < period; j++) {
                varianceSum += Math.pow(dataList[i - j].close - sma, 2);
            }
            const stdDev = Math.sqrt(varianceSum / period);

            result.push({
                time: dataList[i].time,
                middle: sma,
                upper: sma + (stdDevMultiplier * stdDev),
                lower: sma - (stdDevMultiplier * stdDev)
            });
        }
        return result;
    }

    if (candles && candles.length) {
        bbHistoryMeta = calculateBB(candles);
        upperLine.setData(bbHistoryMeta.map(d => ({ time: d.time, value: d.upper })));
        middleLine.setData(bbHistoryMeta.map(d => ({ time: d.time, value: d.middle })));
        lowerLine.setData(bbHistoryMeta.map(d => ({ time: d.time, value: d.lower })));
    }

    return {
        upperLine,
        middleLine,
        lowerLine,
        bbHistoryMeta,
        rawCandles: [...candles],
        options: { period, stdDevMultiplier }
    };
}

export function updateBB(instance, candle) {
    if (!instance) return;

    instance.rawCandles.push(candle);
    const targetPeriod = instance.options?.period || 20;
    const devMultiplier = instance.options?.stdDevMultiplier || 2;
    
    if (instance.rawCandles.length < targetPeriod) return;

    const len = instance.rawCandles.length;
    let sum = 0;
    for (let i = 0; i < targetPeriod; i++) {
        sum += instance.rawCandles[len - 1 - i].close;
    }
    const sma = sum / targetPeriod;

    let varianceSum = 0;
    for (let i = 0; i < targetPeriod; i++) {
        varianceSum += Math.pow(instance.rawCandles[len - 1 - i].close - sma, 2);
    }
    const stdDev = Math.sqrt(varianceSum / targetPeriod);

    const upperVal = sma + (devMultiplier * stdDev);
    const lowerVal = sma - (devMultiplier * stdDev);

    instance.upperLine.update({ time: candle.time, value: upperVal });
    instance.middleLine.update({ time: candle.time, value: sma });
    instance.lowerLine.update({ time: candle.time, value: lowerVal });
}