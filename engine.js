// engine.js - Quantitative Execution Engine v2.5

window.TradingEngine = {
  htfCache: {},

  // Item 4: Persistent Strategy State (retains state across bars like Pine Script 'var')
  varState: {
    consecutiveBars: 0,
    lastEntryBarTime: 0,
    customVars: {}
  },

  resetState() {
    this.varState = { consecutiveBars: 0, lastEntryBarTime: 0, customVars: {} };
    this.htfCache = {};
  },

  resample(baseCandles, timeframeStr) {
    const tfMinutesMap = { "M1": 1, "M5": 5, "M15": 15, "M30": 30, "H1": 60, "H4": 240, "D1": 1440 };
    const targetMinutes = tfMinutesMap[timeframeStr.toUpperCase()] || 60;
    const targetSeconds = targetMinutes * 60;
    const htf = [];
    let currentBucket = null;

    for (let i = 0; i < baseCandles.length; i++) {
      const c = baseCandles[i];
      const bucketTime = Math.floor(c.time / targetSeconds) * targetSeconds;
      if (!currentBucket || currentBucket.time !== bucketTime) {
        if (currentBucket) htf.push(currentBucket);
        currentBucket = { time: bucketTime, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume || 25 };
      } else {
        currentBucket.high = Math.max(currentBucket.high, c.high);
        currentBucket.low = Math.min(currentBucket.low, c.low);
        currentBucket.close = c.close;
        currentBucket.volume += (c.volume || 25);
      }
    }
    if (currentBucket) htf.push(currentBucket);
    return htf;
  },

  resolveOperand(operand, candle, prevCandle, candles, terminalApi) {
    if (!operand) return NaN;

    switch (operand.type) {
      case "PRICE": {
        const target = operand.shift === 1 ? prevCandle : candle;
        const field = (operand.field || "close").toLowerCase();
        return target ? target[field] : NaN;
      }
      case "STATIC":
        return Number(operand.value);

      // Item 4: State-aware custom variables
      case "STATE": {
        const key = operand.name;
        if (key === "CONSECUTIVE_BARS") return this.varState.consecutiveBars;
        if (key === "BARS_SINCE_ENTRY") {
          return this.varState.lastEntryBarTime ? Math.floor((candle.time - this.varState.lastEntryBarTime) / 300) : 999;
        }
        return this.varState.customVars[key] !== undefined ? this.varState.customVars[key] : NaN;
      }

      case "INDICATOR": {
        const name = (operand.name || "").toUpperCase();
        const calcFn = window.IndicatorRegistry?.[name];
        if (!calcFn) return NaN;

        let targetCandles = candles;
        if (operand.timeframe) {
          const cacheKey = `${operand.timeframe}_${candles.length}`;
          if (!this.htfCache[cacheKey]) {
            this.htfCache[cacheKey] = this.resample(candles, operand.timeframe);
          }
          targetCandles = this.htfCache[cacheKey];
        }

        if (operand.shift === 1) targetCandles = targetCandles.slice(0, -1);
        return calcFn(targetCandles, operand.period, operand.param2);
      }

      case "LEVEL": {
        const levels = terminalApi.pdhPdl();
        if (!levels) return NaN;
        const name = (operand.name || "").toUpperCase();
        return name === "PDH" ? levels.pdh : name === "PDL" ? levels.pdl : NaN;
      }
      default:
        return NaN;
    }
  },

  testCondition(cond, candle, prevCandle, candles, terminalApi) {
    const leftVal = this.resolveOperand(cond.left, candle, prevCandle, candles, terminalApi);
    const rightVal = this.resolveOperand(cond.right, candle, prevCandle, candles, terminalApi);
    if (Number.isNaN(leftVal) || Number.isNaN(rightVal)) return false;

    switch (cond.op) {
      case ">": return leftVal > rightVal;
      case "<": return leftVal < rightVal;
      case "==": return Math.abs(leftVal - rightVal) < 0.0001;
      case "CROSSES_ABOVE": {
        const prevL = this.resolveOperand({ ...cond.left, shift: 1 }, candle, prevCandle, candles, terminalApi);
        const prevR = this.resolveOperand({ ...cond.right, shift: 1 }, candle, prevCandle, candles, terminalApi);
        if (Number.isNaN(prevL) || Number.isNaN(prevR)) return false;
        return prevL <= prevR && leftVal > rightVal;
      }
      case "CROSSES_BELOW": {
        const prevL = this.resolveOperand({ ...cond.left, shift: 1 }, candle, prevCandle, candles, terminalApi);
        const prevR = this.resolveOperand({ ...cond.right, shift: 1 }, candle, prevCandle, candles, terminalApi);
        if (Number.isNaN(prevL) || Number.isNaN(prevR)) return false;
        return prevL >= prevR && leftVal < rightVal;
      }
      default: return false;
    }
  },

  evaluateRuleGroup(group, candle, prevCandle, candles, terminalApi) {
    if (!group) return false;
    if (group.left && group.op) return this.testCondition(group, candle, prevCandle, candles, terminalApi);
    if (Array.isArray(group)) return group.every(i => this.evaluateRuleGroup(i, candle, prevCandle, candles, terminalApi));

    const conditions = group.conditions || group.rules || [];
    if (conditions.length === 0) return true;
    if (group.logic === "OR") return conditions.some(i => this.evaluateRuleGroup(i, candle, prevCandle, candles, terminalApi));
    return conditions.every(i => this.evaluateRuleGroup(i, candle, prevCandle, candles, terminalApi));
  },

  manageOpenPositions(positions, currentPrice, strategyJson, candleSeries) {
    if (!positions || positions.length === 0 || !strategyJson.riskManagement) return;
    const rm = strategyJson.riskManagement;

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (rm.breakEven?.enabled && !pos.isBreakEvenSet) {
        const riskDistance = Math.abs(pos.entry - pos.initialSl);
        const currentGain = pos.type === "BUY" ? (currentPrice - pos.entry) : (pos.entry - currentPrice);

        if (riskDistance > 0 && currentGain >= riskDistance * (rm.breakEven.triggerAtRR || 1.0)) {
          const offset = (rm.breakEven.offsetPips || 1.0) * 0.1;
          pos.sl = pos.type === "BUY" ? pos.entry + offset : pos.entry - offset;
          pos.isBreakEvenSet = true;
          if (pos.lines?.[0]) pos.lines[0].applyOptions({ price: pos.sl, title: `BE #${pos.id}` });
        }
      }

      if (rm.trailingStop?.enabled) {
        const trailStep = (rm.trailingStop.trailStepPips || 10) * 0.1;
        if (pos.type === "BUY") {
          const expectedSl = currentPrice - trailStep;
          if (expectedSl > pos.sl) {
            pos.sl = expectedSl;
            if (pos.lines?.[0]) pos.lines[0].applyOptions({ price: pos.sl });
          }
        } else {
          const expectedSl = currentPrice + trailStep;
          if (expectedSl < pos.sl) {
            pos.sl = expectedSl;
            if (pos.lines?.[0]) pos.lines[0].applyOptions({ price: pos.sl });
          }
        }
      }
    }
  },

  // Main Bar-Close Engine Runner
  runTick(strategyJson, candle, prevCandle, candles, terminalApi, activeBot) {
    if (!strategyJson) return;

    // Item 4: Maintain bar persistence
    if (candle.close > candle.open) {
      this.varState.consecutiveBars = this.varState.consecutiveBars >= 0 ? this.varState.consecutiveBars + 1 : 1;
    } else if (candle.close < candle.open) {
      this.varState.consecutiveBars = this.varState.consecutiveBars <= 0 ? this.varState.consecutiveBars - 1 : -1;
    }

    if (terminalApi.hasPosition() && window.account?.positions) {
      this.manageOpenPositions(window.account.positions, candle.close, strategyJson, window.candleSeries);
      return;
    }

    if (strategyJson.session?.enabled) {
      const utcHour = new Date(candle.time * 1000).getUTCHours();
      if (utcHour < strategyJson.session.start || utcHour >= strategyJson.session.end) return;
    }

    let slPoints = 3.0;
    let tpPoints = 4.5;
    let lotSize = strategyJson.lotSize || activeBot?.inputs?.lotSize?.value || 0.1;

    const rm = strategyJson.riskManagement;
    if (rm?.sl?.type === "ATR_MULTIPLE") {
      const currentAtr = window.IndicatorRegistry.ATR(candles, rm.sl.period || 14);
      slPoints = currentAtr * (rm.sl.multiplier || 1.0);
      tpPoints = currentAtr * (rm.tp?.multiplier || 1.5);

      if (rm.riskPercent && window.account) {
        const balance = window.account.balance || 10000;
        const riskCapital = balance * (rm.riskPercent / 100);
        const calculatedLots = riskCapital / (slPoints * 100);
        lotSize = Math.max(0.01, Math.min(10.0, parseFloat(calculatedLots.toFixed(2))));
      }
    } else {
      slPoints = (strategyJson.slPips || activeBot?.inputs?.slPips?.value || 30) * 0.1;
      tpPoints = (strategyJson.tpPips || activeBot?.inputs?.tpPips?.value || 80) * 0.1;
    }

    const isBuy = this.evaluateRuleGroup(strategyJson.buyRules, candle, prevCandle, candles, terminalApi);
    const isSell = this.evaluateRuleGroup(strategyJson.sellRules, candle, prevCandle, candles, terminalApi);

    const slPipsParam = slPoints / 0.1;
    const tpPipsParam = tpPoints / 0.1;

    if (isBuy) {
      terminalApi.buy(slPipsParam, tpPipsParam, lotSize, "Rule Long");
      this.varState.lastEntryBarTime = candle.time;
      const lastPos = window.account.positions[window.account.positions.length - 1];
      if (lastPos) lastPos.initialSl = lastPos.sl;
    } else if (isSell) {
      terminalApi.sell(slPipsParam, tpPipsParam, lotSize, "Rule Short");
      this.varState.lastEntryBarTime = candle.time;
      const lastPos = window.account.positions[window.account.positions.length - 1];
      if (lastPos) lastPos.initialSl = lastPos.sl;
    }
  }
};