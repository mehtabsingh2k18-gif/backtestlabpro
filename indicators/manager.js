// indicators/manager.js

import { registry } from "./registry.js";

export const indicators = [];

// ========================================
// ADD INDICATOR
// ========================================
export function addIndicator({ type, chart, candles, options }) {
    const def = registry[type];
    if (!def) return;

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

    const instance = indicators[idx];
    
    // Safely remove simple lines or complex multi-line sets
    if (instance.line) chart.removeSeries(instance.line);
    if (instance.upperLine) chart.removeSeries(instance.upperLine);
    if (instance.middleLine) chart.removeSeries(instance.middleLine);
    if (instance.lowerLine) chart.removeSeries(instance.lowerLine);
    if (instance.macdLineSeries) chart.removeSeries(instance.macdLineSeries);
    if (instance.signalLineSeries) chart.removeSeries(instance.signalLineSeries);
    if (instance.histogramSeries) chart.removeSeries(instance.histogramSeries);

    indicators.splice(idx, 1);
}

// ========================================
// EDIT / UPDATE CONFIGURATION PARAMETERS
// ========================================
export function editIndicator(id, chart, candles, newOptions) {
    const instance = indicators.find(ind => ind.id === id);
    if (!instance) return;

    // Flush old sub-series assets completely
    if (instance.line) chart.removeSeries(instance.line);
    if (instance.upperLine) chart.removeSeries(instance.upperLine);
    if (instance.middleLine) chart.removeSeries(instance.middleLine);
    if (instance.lowerLine) chart.removeSeries(instance.lowerLine);
    if (instance.macdLineSeries) chart.removeSeries(instance.macdLineSeries);
    if (instance.signalLineSeries) chart.removeSeries(instance.signalLineSeries);
    if (instance.histogramSeries) chart.removeSeries(instance.histogramSeries);

    const def = registry[instance.type];
    if (!def) return;

    const renewed = def.create({
        chart,
        candles,
        options: newOptions
    });

    // Merge renewed parameters into instance metadata footprints
    Object.assign(instance, renewed);
    instance.options = newOptions;
}

// ========================================
// UPDATE ALL
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
// REBUILD
// ========================================
export function rebuildIndicators({ chart, candles }) {
    if (!indicators.length) return;

    const saved = indicators.map(ind => ({
        type: ind.type,
        options: ind.options
    }));

    indicators.forEach(instance => {
        if (instance.line) chart.removeSeries(instance.line);
        if (instance.upperLine) chart.removeSeries(instance.upperLine);
        if (instance.middleLine) chart.removeSeries(instance.middleLine);
        if (instance.lowerLine) chart.removeSeries(instance.lowerLine);
        if (instance.macdLineSeries) chart.removeSeries(instance.macdLineSeries);
        if (instance.signalLineSeries) chart.removeSeries(instance.signalLineSeries);
        if (instance.histogramSeries) chart.removeSeries(instance.histogramSeries);
    });

    indicators.length = 0;

    saved.forEach(cfg => {
        addIndicator({
            type: cfg.type,
            chart,
            candles,
            options: cfg.options
        });
    });
}