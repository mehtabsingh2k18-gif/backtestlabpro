// indicators/donchian.js

export function createDonchian({ chart, candles, options = {} }) {

    const period = options.period || 20;

    const upperLine = chart.addLineSeries({
        color: options.upperColor || "#00ff88",
        lineWidth: 2
    });

    const middleLine = chart.addLineSeries({
        color: options.middleColor || "#ffffff",
        lineWidth: 1
    });

    const lowerLine = chart.addLineSeries({
        color: options.lowerColor || "#ff4444",
        lineWidth: 2
    });

    const data =
        calculateDonchian(candles, period);

    upperLine.setData(data.upper);
    middleLine.setData(data.middle);
    lowerLine.setData(data.lower);

    return {
        upperLine,
        middleLine,
        lowerLine,
        period,
        sourceCandles: [...candles],
        upperData: data.upper,
        middleData: data.middle,
        lowerData: data.lower
    };
}

export function updateDonchian(instance, candle) {

    instance.sourceCandles.push(candle);

    const data =
        calculateDonchian(
            instance.sourceCandles,
            instance.period
        );

    const upper =
        data.upper[data.upper.length - 1];

    const middle =
        data.middle[data.middle.length - 1];

    const lower =
        data.lower[data.lower.length - 1];

    if (!upper || !middle || !lower)
        return;

    instance.upperLine.update(upper);
    instance.middleLine.update(middle);
    instance.lowerLine.update(lower);

    instance.upperData.push(upper);
    instance.middleData.push(middle);
    instance.lowerData.push(lower);
}

function calculateDonchian(candles, period) {

    const upper = [];
    const middle = [];
    const lower = [];

    for (let i = period - 1; i < candles.length; i++) {

        const slice =
            candles.slice(i - period + 1, i + 1);

        const highest =
            Math.max(...slice.map(c => c.high));

        const lowest =
            Math.min(...slice.map(c => c.low));

        const mid =
            (highest + lowest) / 2;

        const time =
            candles[i].time;

        upper.push({
            time,
            value: highest
        });

        middle.push({
            time,
            value: mid
        });

        lower.push({
            time,
            value: lowest
        });
    }

    return {
        upper,
        middle,
        lower
    };
}