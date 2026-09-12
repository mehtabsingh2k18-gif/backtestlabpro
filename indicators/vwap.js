// indicators/vwap.js

export function createVWAP({ chart, candles, options = {} }) {
    const color = options.color || '#ff9800';

    const line = chart.addLineSeries({
        color: color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'VWAP'
    });

    const instance = {
        line,
        cumVol: 0,
        cumTPV: 0,
        lastDay: null,
        history: []
    };

    recalculateVWAP(instance, candles);
    return instance;
}

function isNewDay(t1, t2) {
    if (!t1) return true;
    const d1 = new Date(t1 * 1000).getUTCDate();
    const d2 = new Date(t2 * 1000).getUTCDate();
    return d1 !== d2;
}

function recalculateVWAP(instance, candles) {
    let cumVol = 0;
    let cumTPV = 0;
    let lastTime = null;
    const plotData = [];

    candles.forEach((c) => {
        if (isNewDay(lastTime, c.time)) {
            cumVol = 0;
            cumTPV = 0;
        }

        const vol = c.volume || 1;
        const typicalPrice = (c.high + c.low + c.close) / 3;
        cumTPV += typicalPrice * vol;
        cumVol += vol;

        const vwapVal = cumTPV / cumVol;
        plotData.push({ time: c.time, value: vwapVal });
        lastTime = c.time;
    });

    instance.cumVol = cumVol;
    instance.cumTPV = cumTPV;
    instance.lastDay = lastTime ? new Date(lastTime * 1000).getUTCDate() : null;
    instance.line.setData(plotData);
}

export function updateVWAP(instance, candle) {
    const currentDate = new Date(candle.time * 1000).getUTCDate();
    if (instance.lastDay !== currentDate) {
        instance.cumVol = 0;
        instance.cumTPV = 0;
        instance.lastDay = currentDate;
    }

    const vol = candle.volume || 1;
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    instance.cumTPV += typicalPrice * vol;
    instance.cumVol += vol;

    const vwapVal = instance.cumTPV / instance.cumVol;
    instance.line.update({ time: candle.time, value: vwapVal });
}