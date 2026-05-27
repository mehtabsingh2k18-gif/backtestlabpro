// indicators/macd.js

export function createMACD({ chart, candles, options = {} }) {
    const fastPeriod = options.fastPeriod || 12;
    const slowPeriod = options.slowPeriod || 26;
    const signalPeriod = options.signalPeriod || 9;

    // Create unique separate scaling system pane for MACD calculations
    const macdLineSeries = chart.addLineSeries({
        color: options.macdColor || '#2196f3',
        lineWidth: 1.5,
        priceScaleId: 'macd-scale'
    });

    const signalLineSeries = chart.addLineSeries({
        color: options.signalColor || '#ff9800',
        lineWidth: 1.5,
        priceScaleId: 'macd-scale'
    });

    const histogramSeries = chart.addHistogramSeries({
        priceScaleId: 'macd-scale'
    });

    chart.priceScale('macd-scale').applyOptions({
        scaleMargins: { top: 0.75, bottom: 0.02 },
        borderColor: '#2a2e39',
        visible: true
    });

    let macdHistoryMeta = [];

    function calculateMACD(dataList) {
        if (!dataList || dataList.length < slowPeriod) return [];
        
        // Internal EMA calculations Helper
        function getEMAList(data, length) {
            const k = 2 / (length + 1);
            let ema = data[0].close;
            const res = [];
            for(let i=0; i<data.length; i++) {
                ema = data[i].close * k + ema * (1 - k);
                res.push(ema);
            }
            return res;
        }

        const fastEMA = getEMAList(dataList, fastPeriod);
        const slowEMA = getEMAList(dataList, slowPeriod);
        const intermediateValues = [];

        for (let i = 0; i < dataList.length; i++) {
            const macdVal = fastEMA[i] - slowEMA[i];
            intermediateValues.push({ time: dataList[i].time, macd: macdVal });
        }

        // Generate Signal line over computed MACD array values
        const kSignal = 2 / (signalPeriod + 1);
        let signalEMA = intermediateValues[0].macd;
        const finalResults = [];

        for (let i = 0; i < intermediateValues.length; i++) {
            signalEMA = intermediateValues[i].macd * kSignal + signalEMA * (1 - kSignal);
            const hist = intermediateValues[i].macd - signalEMA;
            
            finalResults.push({
                time: intermediateValues[i].time,
                macd: intermediateValues[i].macd,
                signal: signalEMA,
                histogram: hist,
                fastEmaPrev: fastEMA[i],
                slowEmaPrev: slowEMA[i]
            });
        }
        return finalResults;
    }

    if (candles && candles.length) {
        macdHistoryMeta = calculateMACD(candles);
        
        macdLineSeries.setData(macdHistoryMeta.map(d => ({ time: d.time, value: d.macd })));
        signalLineSeries.setData(macdHistoryMeta.map(d => ({ time: d.time, value: d.signal })));
        histogramSeries.setData(macdHistoryMeta.map(d => ({
            time: d.time,
            value: d.histogram,
            color: d.histogram >= 0 ? '#089981' : '#f23645'
        })));
    }

    return {
        macdLineSeries,
        signalLineSeries,
        histogramSeries,
        macdHistoryMeta,
        rawCandles: [...candles],
        options: { fastPeriod, slowPeriod, signalPeriod }
    };
}

export function updateMACD(instance, candle) {
    if (!instance || !instance.macdHistoryMeta || !instance.macdHistoryMeta.length) return;

    const prevCandles = instance.rawCandles;
    instance.rawCandles.push(candle);

    const lastMeta = instance.macdHistoryMeta[instance.macdHistoryMeta.length - 1];
    
    const fastPeriod = instance.options?.fastPeriod || 12;
    const slowPeriod = instance.options?.slowPeriod || 26;
    const signalPeriod = instance.options?.signalPeriod || 9;

    const kFast = 2 / (fastPeriod + 1);
    const kSlow = 2 / (slowPeriod + 1);
    const kSignal = 2 / (signalPeriod + 1);

    const nextFast = candle.close * kFast + lastMeta.fastEmaPrev * (1 - kFast);
    const nextSlow = candle.close * kSlow + lastMeta.slowEmaPrev * (1 - kSlow);
    const nextMacd = nextFast - nextSlow;
    const nextSignal = nextMacd * kSignal + lastMeta.signal * (1 - kSignal);
    const nextHist = nextMacd - nextSignal;

    const updatedMeta = {
        time: candle.time,
        macd: nextMacd,
        signal: nextSignal,
        histogram: nextHist,
        fastEmaPrev: nextFast,
        slowEmaPrev: nextSlow
    };

    instance.macdHistoryMeta.push(updatedMeta);
    
    instance.macdLineSeries.update({ time: candle.time, value: nextMacd });
    instance.signalLineSeries.update({ time: candle.time, value: nextSignal });
    instance.histogramSeries.update({
        time: candle.time,
        value: nextHist,
        color: nextHist >= 0 ? '#089981' : '#f23645'
    });
}