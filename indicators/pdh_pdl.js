// indicators/pdh_pdl.js

export function createPDHPDL({ chart, candles, options = {} }) {
    const highColor = options.highColor || '#089981';
    const lowColor = options.lowColor || '#f23645';

    const pdhLine = chart.addLineSeries({
        color: highColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'PDH'
    });

    const pdlLine = chart.addLineSeries({
        color: lowColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'PDL'
    });

    const instance = {
        pdhLine,
        pdlLine,
        candlesHistory: [...candles],
        lastCalculatedDay: null,
        currentPDH: null,
        currentPDL: null
    };

    recalculatePDHPDL(instance);
    return instance;
}

function recalculatePDHPDL(instance) {
    const candles = instance.candlesHistory;
    if (!candles || candles.length === 0) return;

    // Group candles by UTC calendar date string YYYY-MM-DD
    const dayMap = new Map();
    candles.forEach(c => {
        const dateKey = new Date(c.time * 1000).toISOString().slice(0, 10);
        if (!dayMap.has(dateKey)) {
            dayMap.set(dateKey, { high: -Infinity, low: Infinity });
        }
        const dayRecord = dayMap.get(dateKey);
        if (c.high > dayRecord.high) dayRecord.high = c.high;
        if (c.low < dayRecord.low) dayRecord.low = c.low;
    });

    const dateKeys = Array.from(dayMap.keys());
    const pdhData = [];
    const pdlData = [];

    candles.forEach(c => {
        const dateKey = new Date(c.time * 1000).toISOString().slice(0, 10);
        const dayIdx = dateKeys.indexOf(dateKey);
        if (dayIdx > 0) {
            const prevDayRecord = dayMap.get(dateKeys[dayIdx - 1]);
            pdhData.push({ time: c.time, value: prevDayRecord.high });
            pdlData.push({ time: c.time, value: prevDayRecord.low });
            instance.currentPDH = prevDayRecord.high;
            instance.currentPDL = prevDayRecord.low;
        }
    });

    instance.pdhLine.setData(pdhData);
    instance.pdlLine.setData(pdlData);
}

export function updatePDHPDL(instance, candle) {
    instance.candlesHistory.push(candle);
    
    // Check if new day started
    const lastBar = instance.candlesHistory[instance.candlesHistory.length - 2];
    const prevDate = lastBar ? new Date(lastBar.time * 1000).toISOString().slice(0, 10) : null;
    const currDate = new Date(candle.time * 1000).toISOString().slice(0, 10);

    if (prevDate && prevDate !== currDate) {
        recalculatePDHPDL(instance);
        return;
    }

    if (instance.currentPDH !== null && instance.currentPDL !== null) {
        instance.pdhLine.update({ time: candle.time, value: instance.currentPDH });
        instance.pdlLine.update({ time: candle.time, value: instance.currentPDL });
    }
}