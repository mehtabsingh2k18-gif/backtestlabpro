import { createEMA, updateEMA } from "./ema.js";
import { createSMA, updateSMA } from "./sma.js";
import { createRSI, updateRSI } from "./rsi.js";
import { createMACD, updateMACD } from "./macd.js";
import { createBB, updateBB } from "./bb.js";
import { createATR, updateATR } from "./atr.js";
import { createSupertrend, updateSupertrend } from "./supertrend.js";
import { createVWAP, updateVWAP } from "./vwap.js";
import { createPDHPDL, updatePDHPDL } from "./pdh_pdl.js";

export const registry = {
    EMA: { create: createEMA, update: updateEMA },
    SMA: { create: createSMA, update: updateSMA },
    RSI: { create: createRSI, update: updateRSI },
    MACD: { create: createMACD, update: updateMACD },
    BB: { create: createBB, update: updateBB },
    ATR: { create: createATR, update: updateATR },
    Supertrend: { create: createSupertrend, update: updateSupertrend },
    VWAP: { create: createVWAP, update: updateVWAP },
    PDH_PDL: { create: createPDHPDL, update: updatePDHPDL }
};