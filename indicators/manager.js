// indicators/manager.js

import { registry } from "./registry.js";

export const indicators = [];

/**
 * Safely disposes all series associated with an indicator instance from the chart.
 */
export function cleanupSeries(instance, chart) {
    if (!instance || !chart) return;

    // Single overlay / sub-panel lines
    if (instance.line) chart.removeSeries(instance.line);

    // Bollinger Bands lines
    if (instance.upperLine) chart.removeSeries(instance.upperLine);
    if (instance.middleLine) chart.removeSeries(instance.middleLine);
    if (instance.lowerLine) chart.removeSeries(instance.lowerLine);

    // PDH / PDL level lines
    if (instance.pdhLine) chart.removeSeries(instance.pdhLine);
    if (instance.pdlLine) chart.removeSeries(instance.pdlLine);

    // MACD composite series
    if (instance.macdLineSeries) chart.removeSeries(instance.macdLineSeries);
    if (instance.signalLineSeries) chart.removeSeries(instance.signalLineSeries);
    if (instance.histogramSeries) chart.removeSeries(instance.histogramSeries);
}

// ========================================
// ADD INDICATOR
// ========================================
export function addIndicator({ type, chart, candles, options }) {
    const def = registry[type];
    if (!def) {
        console.warn(`Indicator type "${type}" is not registered in registry.js`);
        return;
    }

    const instance = def.create({
        chart,
        candles,
        options
    });

    instance.id = type + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    instance.type = type;
    instance.options = options;

    indicators.push(instance);
    return instance;
}

// ========================================
// REMOVE INDICATOR
// ========================================
export function removeIndicator(id, chart) {
    const idx = indicators.findIndex(ind => ind.id === id);
    if (idx === -1) return;

    cleanupSeries(indicators[idx], chart);
    indicators.splice(idx, 1);
}

// ========================================
// EDIT / UPDATE CONFIGURATION PARAMETERS
// ========================================
export function editIndicator(id, chart, candles, newOptions) {
    const instance = indicators.find(ind => ind.id === id);
    if (!instance) return;

    // Remove current series elements before recreating
    cleanupSeries(instance, chart);

    const def = registry[instance.type];
    if (!def) return;

    const renewed = def.create({
        chart,
        candles,
        options: newOptions
    });

    // Reassign new series references and update options
    Object.assign(instance, renewed);
    instance.options = newOptions;
}

// ========================================
// UPDATE ALL (Per Candle/Step)
// ========================================
export function updateIndicators(candle) {
    indicators.forEach(ind => {
        const def = registry[ind.type];
        if (def && def.update) {
            def.update(ind, candle);
        }
    });
}

// ========================================
// REBUILD (Timeframe Change / Data Reset)
// ========================================
export function rebuildIndicators({ chart, candles }) {
    if (!indicators.length) return;

    const saved = indicators.map(ind => ({
        type: ind.type,
        options: ind.options
    }));

    // Teardown all existing series
    indicators.forEach(instance => {
        cleanupSeries(instance, chart);
    });

    indicators.length = 0;

    // Reconstruct each indicator with the new candle set
    saved.forEach(cfg => {
        addIndicator({
            type: cfg.type,
            chart,
            candles,
            options: cfg.options
        });
    });
}