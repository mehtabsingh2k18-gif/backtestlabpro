// indicators/ema.js

export function createEMA({ chart, candles, options = {} }) {
    const period = options.period || 20;
    const line = chart.addLineSeries({
        color: options.color || "orange",
        lineWidth: 2
    });

    let emaData = [];

    function calculateEMA(dataList) {
        if (!dataList || !dataList.length) return [];
        const k = 2 / (period + 1);
        let ema = dataList[0].close;
        const result = [];

        for (let i = 0; i < dataList.length; i++) {
            ema = dataList[i].close * k + ema * (1 - k);
            result.push({ time: dataList[i].time, value: ema });
        }
        return result;
    }

    if (candles && candles.length) {
        emaData = calculateEMA(candles);
        line.setData(emaData);
    }

    return {
        line,
        emaData,
        period
    };
}

export function updateEMA(instance, candle) {
    if (!instance || !instance.emaData || !instance.emaData.length) return;

    const k = 2 / (instance.period + 1);
    const prev = instance.emaData[instance.emaData.length - 1].value;
    const ema = candle.close * k + prev * (1 - k);

    const updatedValue = { time: candle.time, value: ema };
    instance.line.update(updatedValue);
    instance.emaData.push(updatedValue);
}