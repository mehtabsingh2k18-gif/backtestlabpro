// indicators/sma.js

export function createSMA({ chart, candles, options = {} }) {
    const period = options.period || 20;
    const line = chart.addLineSeries({
        color: options.color || "#2196f3",
        lineWidth: 2
    });

    let smaData = [];

    function calculateSMA(dataList) {
        if (!dataList || dataList.length < period) return [];
        const result = [];

        for (let i = 0; i < dataList.length; i++) {
            if (i < period - 1) {
                // Not enough lookback bars yet, seed baseline moving sum
                continue;
            }
            
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += dataList[i - j].close;
            }
            result.push({
                time: dataList[i].time,
                value: sum / period
            });
        }
        return result;
    }

    if (candles && candles.length) {
        smaData = calculateSMA(candles);
        line.setData(smaData);
    }

    return {
        line,
        rawCandles: [...candles],
        period
    };
}

export function updateSMA(instance, candle) {
    if (!instance) return;
    
    instance.rawCandles.push(candle);
    if (instance.rawCandles.length < instance.period) return;

    let sum = 0;
    const len = instance.rawCandles.length;
    for (let i = 0; i < instance.period; i++) {
        sum += instance.rawCandles[len - 1 - i].close;
    }

    const updatedValue = { time: candle.time, value: sum / instance.period };
    instance.line.update(updatedValue);
}