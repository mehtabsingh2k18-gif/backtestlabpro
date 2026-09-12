// indicators/rsi.js

export function createRSI({ chart, candles, options = {} }) {
    const period = options.period || 14;
    const line = chart.addLineSeries({
        color: options.color || "#e91e63",
        lineWidth: 2,
        priceScaleId: 'rsi-scale' // Separate price scale axis on the right margin
    });

    // Configure layout rules for the secondary layout axis scale
    chart.priceScale('rsi-scale').applyOptions({
        scaleMargins: { top: 0.7, bottom: 0.05 },
        borderColor: '#2a2e39',
        visible: true
    });

    let rsiData = [];

    function calculateRSI(dataList) {
        if (!dataList || dataList.length <= period) return [];
        const result = [];
        
        let gains = 0;
        let losses = 0;

        // Establish core initial baseline average calculation
        for (let i = 1; i <= period; i++) {
            const diff = dataList[i].close - dataList[i - 1].close;
            if (diff > 0) gains += diff;
            else losses += Math.abs(diff);
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;
        
        let firstRSI = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
        result.push({ time: dataList[period].time, value: firstRSI, avgGain, avgLoss });

        // Apply Wilder's smoothing method across subsequent historical data items
        for (let i = period + 1; i < dataList.length; i++) {
            const diff = dataList[i].close - dataList[i - 1].close;
            const currentGain = diff > 0 ? diff : 0;
            const currentLoss = diff < 0 ? Math.abs(diff) : 0;

            avgGain = ((avgGain * (period - 1)) + currentGain) / period;
            avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

            const rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
            result.push({ time: dataList[i].time, value: rsiValue, avgGain, avgLoss });
        }
        return result;
    }

    if (candles && candles.length) {
        const fullComputedValues = calculateRSI(candles);
        rsiData = fullComputedValues.map(item => ({ time: item.time, value: item.value }));
        line.setData(rsiData);
        
        // Cache calculation histories inside state footprints
        line.rsiHistoryMeta = fullComputedValues;
    } else {
        line.rsiHistoryMeta = [];
    }

    return {
        line,
        rawCandles: [...candles],
        period
    };
}

export function updateRSI(instance, candle) {
    if (!instance || !instance.line.rsiHistoryMeta) return;

    const historyMeta = instance.line.rsiHistoryMeta;
    const prevCandles = instance.rawCandles;
    const prevCandle = prevCandles[prevCandles.length - 1];
    
    instance.rawCandles.push(candle);
    if (historyMeta.length === 0 || !prevCandle) return;

    const lastMetaItem = historyMeta[historyMeta.length - 1];
    const diff = candle.close - prevCandle.close;
    
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    const nextAvgGain = ((lastMetaItem.avgGain * (instance.period - 1)) + currentGain) / instance.period;
    const nextAvgLoss = ((lastMetaItem.avgLoss * (instance.period - 1)) + currentLoss) / instance.period;

    const rsiValue = nextAvgLoss === 0 ? 100 : 100 - (100 / (1 + (nextAvgGain / nextAvgLoss)));
    const updatedMeta = { time: candle.time, value: rsiValue, avgGain: nextAvgGain, avgLoss: nextAvgLoss };
    
    historyMeta.push(updatedMeta);
    instance.line.update({ time: candle.time, value: rsiValue });
}