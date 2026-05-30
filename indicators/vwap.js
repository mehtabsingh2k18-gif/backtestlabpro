
// indicators/vwap.js

export function createVWAP({ chart, candles, options = {} }) {

    const line = chart.addLineSeries({
        color: options.color || "#00e5ff",
        lineWidth: 2
    });

    let vwapData = [];

    function calculateVWAP(dataList) {

        if (!dataList || !dataList.length) return [];

        let cumulativePV = 0;
        let cumulativeVolume = 0;

        const result = [];

        for (let i = 0; i < dataList.length; i++) {

            const candle = dataList[i];

            const typicalPrice =
                (candle.high + candle.low + candle.close) / 3;

            const volume =
                candle.volume || 1;

            cumulativePV += typicalPrice * volume;
            cumulativeVolume += volume;

            const vwap =
                cumulativePV / cumulativeVolume;

            result.push({
                time: candle.time,
                value: vwap
            });
        }

        return result;
    }

    if (candles && candles.length) {

        vwapData = calculateVWAP(candles);

        line.setData(vwapData);
    }

    return {
        line,
        vwapData,
        cumulativePV:
            candles.reduce((sum, c) => {
                const tp =
                    (c.high + c.low + c.close) / 3;

                return sum + tp * (c.volume || 1);
            }, 0),

        cumulativeVolume:
            candles.reduce((sum, c) => {
                return sum + (c.volume || 1);
            }, 0)
    };
}

export function updateVWAP(instance, candle) {

    if (!instance) return;

    const typicalPrice =
        (candle.high + candle.low + candle.close) / 3;

    const volume =
        candle.volume || 1;

    instance.cumulativePV +=
        typicalPrice * volume;

    instance.cumulativeVolume +=
        volume;

    const vwap =
        instance.cumulativePV /
        instance.cumulativeVolume;

    const value = {
        time: candle.time,
        value: vwap
    };

    instance.line.update(value);

    instance.vwapData.push(value);
}