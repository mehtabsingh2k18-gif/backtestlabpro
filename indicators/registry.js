// indicators/registry.js

import { createEMA, updateEMA } from "./ema.js";
import { createSMA, updateSMA } from "./sma.js";
import { createRSI, updateRSI } from "./rsi.js";
import { createMACD, updateMACD } from "./macd.js";
import { createBB, updateBB } from "./bb.js";
import { createATR, updateATR } from "./atr.js";

export const registry = {
    EMA: {
        create: createEMA,
        update: updateEMA
    },
    SMA: {
        create: createSMA,
        update: updateSMA
    },
    RSI: {
        create: createRSI,
        update: updateRSI
    },
    MACD: {
        create: createMACD,
        update: updateMACD
    },
    BB: {
        create: createBB,
        update: updateBB
    },
    ATR: {
        create: createATR,
        update: updateATR
    }
};