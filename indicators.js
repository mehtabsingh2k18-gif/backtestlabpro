// indicators.js - Quantitative Math Library v2.5
window.IndicatorRegistry = {
  // --- Moving Averages ---
  EMA: (candles, period = 14) => {
    if (!candles || candles.length < period) return NaN;
    const k = 2 / (period + 1);
    let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
    for (let i = period; i < candles.length; i++) {
      ema = candles[i].close * k + ema * (1 - k);
    }
    return ema;
  },

  SMA: (candles, period = 14) => {
    if (!candles || candles.length < period) return NaN;
    const slice = candles.slice(-period);
    return slice.reduce((s, c) => s + c.close, 0) / period;
  },

  // --- Oscillators ---
  RSI: (candles, period = 14) => {
    if (!candles || candles.length <= period) return NaN;
    let gains = 0, losses = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    if (losses === 0) return 100;
    const rs = (gains / period) / (losses / period);
    return 100 - (100 / (1 + rs));
  },

  STOCH_K: (candles, period = 14) => {
    if (!candles || candles.length < period) return NaN;
    const slice = candles.slice(-period);
    const high = Math.max(...slice.map(c => c.high));
    const low = Math.min(...slice.map(c => c.low));
    const close = candles[candles.length - 1].close;
    return high === low ? 50 : ((close - low) / (high - low)) * 100;
  },

  STOCH_D: (candles, period = 14, dPeriod = 3) => {
    if (!candles || candles.length < period + dPeriod) return NaN;
    const kValues = [];
    for (let i = candles.length - dPeriod; i < candles.length; i++) {
      const sub = candles.slice(0, i + 1);
      kValues.push(window.IndicatorRegistry.STOCH_K(sub, period));
    }
    return kValues.reduce((s, v) => s + v, 0) / dPeriod;
  },

  // --- Volatility & Bands ---
  ATR: (candles, period = 14) => {
    if (!candles || candles.length <= period) return 1.5;
    let trSum = 0;
    const slice = candles.slice(-(period + 1));
    for (let i = 1; i < slice.length; i++) {
      trSum += Math.max(
        slice[i].high - slice[i].low,
        Math.abs(slice[i].high - slice[i - 1].close),
        Math.abs(slice[i].low - slice[i - 1].close)
      );
    }
    return trSum / period;
  },

  BOLLINGER_UPPER: (candles, period = 20, mult = 2) => {
    const sma = window.IndicatorRegistry.SMA(candles, period);
    if (Number.isNaN(sma)) return NaN;
    const slice = candles.slice(-period);
    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - sma, 2), 0) / period;
    return sma + Math.sqrt(variance) * mult;
  },

  BOLLINGER_LOWER: (candles, period = 20, mult = 2) => {
    const sma = window.IndicatorRegistry.SMA(candles, period);
    if (Number.isNaN(sma)) return NaN;
    const slice = candles.slice(-period);
    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - sma, 2), 0) / period;
    return sma - Math.sqrt(variance) * mult;
  },

  // --- Momentum, Trend & Volume ---
  RVOL: (candles, period = 20) => {
    if (!candles || candles.length < period) return 1.0;
    const slice = candles.slice(-period);
    const avg = slice.reduce((s, c) => s + (c.volume || 25), 0) / period;
    const curVol = candles[candles.length - 1].volume || 25;
    return avg > 0 ? curVol / avg : 1.0;
  },

  MACD_LINE: (candles, fast = 12, slow = 26) => {
    const f = window.IndicatorRegistry.EMA(candles, fast);
    const s = window.IndicatorRegistry.EMA(candles, slow);
    return !Number.isNaN(f) && !Number.isNaN(s) ? f - s : NaN;
  },

  MACD_SIGNAL: (candles, fast = 12, slow = 26, signalPeriod = 9) => {
    if (!candles || candles.length < slow + signalPeriod) return NaN;
    const macdHistory = [];
    for (let i = candles.length - signalPeriod; i < candles.length; i++) {
      const subSlice = candles.slice(0, i + 1);
      macdHistory.push(window.IndicatorRegistry.MACD_LINE(subSlice, fast, slow));
    }
    return macdHistory.reduce((s, v) => s + v, 0) / signalPeriod;
  },

  SUPERTREND: (candles, period = 10, multiplier = 3.0) => {
    if (!candles || candles.length < period + 1) return NaN;
    const atr = window.IndicatorRegistry.ATR(candles, period);
    let upperBand = 0, lowerBand = 0, inUpTrend = true;

    for (let i = period; i < candles.length; i++) {
      const c = candles[i];
      const prevC = candles[i - 1];
      const hl2 = (c.high + c.low) / 2;
      const basicUpper = hl2 + (multiplier * atr);
      const basicLower = hl2 - (multiplier * atr);

      upperBand = (basicUpper < upperBand || prevC.close > upperBand) ? basicUpper : upperBand;
      lowerBand = (basicLower > lowerBand || prevC.close < lowerBand) ? basicLower : lowerBand;

      if (inUpTrend && c.close < lowerBand) inUpTrend = false;
      else if (!inUpTrend && c.close > upperBand) inUpTrend = true;
    }
    return inUpTrend ? lowerBand : upperBand;
  },

  ADX: (candles, period = 14) => {
    if (!candles || candles.length < period * 2) return NaN;
    let trList = [], plusDM = [], minusDM = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i], p = candles[i - 1];
      const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
      const upMove = c.high - p.high;
      const downMove = p.low - c.low;
      trList.push(tr);
      plusDM.push((upMove > downMove && upMove > 0) ? upMove : 0);
      minusDM.push((downMove > upMove && downMove > 0) ? downMove : 0);
    }
    const smoothTR = trList.slice(-period).reduce((a, b) => a + b, 0);
    const smoothPlus = plusDM.slice(-period).reduce((a, b) => a + b, 0);
    const smoothMinus = minusDM.slice(-period).reduce((a, b) => a + b, 0);
    const diPlus = (smoothPlus / smoothTR) * 100;
    const diMinus = (smoothMinus / smoothTR) * 100;
    const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
    return Number.isNaN(dx) ? 25 : dx;
  },

  VWAP: (candles) => {
    if (!candles || candles.length === 0) return NaN;
    const curDate = new Date(candles[candles.length - 1].time * 1000).getUTCDate();
    let cumVol = 0, cumTypical = 0;
    for (let i = candles.length - 1; i >= 0; i--) {
      const c = candles[i];
      if (new Date(c.time * 1000).getUTCDate() !== curDate) break;
      const typical = (c.high + c.low + c.close) / 3;
      const vol = c.volume || 25;
      cumVol += vol;
      cumTypical += typical * vol;
    }
    return cumVol > 0 ? cumTypical / cumVol : candles[candles.length - 1].close;
  }
};