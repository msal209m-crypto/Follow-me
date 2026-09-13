import React, { useState } from 'react';
import {
  Coins,
  RefreshCw,
  Globe,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Sliders,
  DollarSign,
  Search,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Calculator,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  POPULAR_CURRENCIES,
  CurrencyOption,
  findCurrency,
  getDefaultRatesForBase,
  fetchLiveExchangeRates,
  convertCurrency,
} from '../data/currencies';
import { MultiCurrencyConfig } from '../types';

export const MultiCurrencySettingsTab: React.FC = () => {
  const { settings, updateSettings, language, t, isRTL } = useApp();

  // Multi-currency config fallback
  const multiCurrency: MultiCurrencyConfig = settings.multiCurrency || {
    enabled: true,
    baseCurrencyCode: 'SAR',
    secondaryCurrencyCode: 'USD',
    showDualCurrency: true,
    rates: getDefaultRatesForBase('SAR'),
    lastUpdated: new Date().toISOString(),
    autoFetchRates: true,
  };

  const [baseCode, setBaseCode] = useState<string>(multiCurrency.baseCurrencyCode || 'SAR');
  const [secondaryCode, setSecondaryCode] = useState<string>(multiCurrency.secondaryCurrencyCode || 'USD');
  const [showDualCurrency, setShowDualCurrency] = useState<boolean>(multiCurrency.showDualCurrency ?? true);
  const [rates, setRates] = useState<Record<string, number>>(() => {
    return multiCurrency.rates && Object.keys(multiCurrency.rates).length > 0
      ? multiCurrency.rates
      : getDefaultRatesForBase(baseCode);
  });
  const [customRatesMap, setCustomRatesMap] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Currency Converter states
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcFrom, setCalcFrom] = useState<string>(baseCode);
  const [calcTo, setCalcTo] = useState<string>(secondaryCode);

  const baseCurrencyObj = findCurrency(baseCode);
  const secondaryCurrencyObj = findCurrency(secondaryCode);

  // Handle Changing Base Currency
  const handleChangeBaseCurrency = (newBase: string) => {
    setBaseCode(newBase);
    const newRates = getDefaultRatesForBase(newBase);
    setRates(newRates);
    const curr = findCurrency(newBase);

    // Save and propagate to store settings
    updateSettings({
      currency: curr.symbol,
      multiCurrency: {
        ...multiCurrency,
        baseCurrencyCode: newBase,
        rates: newRates,
        lastUpdated: new Date().toISOString(),
      },
    });

    if (calcFrom === baseCode) setCalcFrom(newBase);
  };

  // Handle toggling dual currency display
  const handleToggleDualCurrency = (enabled: boolean) => {
    setShowDualCurrency(enabled);
    updateSettings({
      multiCurrency: {
        ...multiCurrency,
        showDualCurrency: enabled,
      },
    });
  };

  // Handle changing secondary display currency
  const handleChangeSecondary = (newSecondary: string) => {
    setSecondaryCode(newSecondary);
    updateSettings({
      multiCurrency: {
        ...multiCurrency,
        secondaryCurrencyCode: newSecondary,
      },
    });
    setCalcTo(newSecondary);
  };

  // Fetch Live Rates
  const handleFetchLiveRates = async () => {
    setIsFetchingRates(true);
    setUpdateFeedback(null);
    try {
      const result = await fetchLiveExchangeRates(baseCode);
      setRates(result.rates);
      setCustomRatesMap({});

      updateSettings({
        multiCurrency: {
          ...multiCurrency,
          baseCurrencyCode: baseCode,
          rates: result.rates,
          lastUpdated: result.lastUpdated,
        },
      });

      setUpdateFeedback({
        type: 'success',
        message:
          result.source === 'live'
            ? t.ratesUpdatedSuccess
            : t.ratesUpdatedFallback,
      });

      setTimeout(() => setUpdateFeedback(null), 4000);
    } catch (err) {
      console.error('Rates fetch error:', err);
    } finally {
      setIsFetchingRates(false);
    }
  };

  // Update a single custom exchange rate
  const handleUpdateSingleRate = (code: string, newRate: number) => {
    if (newRate <= 0 || isNaN(newRate)) return;
    const updated = { ...rates, [code]: Number(newRate) };
    setRates(updated);
    setCustomRatesMap((prev) => ({ ...prev, [code]: true }));

    updateSettings({
      multiCurrency: {
        ...multiCurrency,
        rates: updated,
        lastUpdated: new Date().toISOString(),
      },
    });
  };

  // Reset a custom rate back to standard market benchmark
  const handleResetSingleRate = (code: string) => {
    const standard = getDefaultRatesForBase(baseCode);
    const standardRate = standard[code] || 1.0;
    const updated = { ...rates, [code]: standardRate };
    setRates(updated);
    setCustomRatesMap((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });

    updateSettings({
      multiCurrency: {
        ...multiCurrency,
        rates: updated,
        lastUpdated: new Date().toISOString(),
      },
    });
  };

  // Filter currencies for list
  const filteredCurrencies = POPULAR_CURRENCIES.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q) ||
      (c.countries && c.countries.toLowerCase().includes(q))
    );
  });

  // Calculate conversion output
  const convertedAmount = convertCurrency(calcAmount, calcFrom, calcTo, rates, baseCode);

  const formatLastUpdated = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Header Info */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <h4 className="font-extrabold text-sm text-white">{t.multiCurrencyTitle}</h4>
          </div>
          <p className="text-[11px] text-slate-400">{t.multiCurrencySubtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleFetchLiveRates}
          disabled={isFetchingRates}
          className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 py-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer shadow-sm text-[11px] disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRates ? 'animate-spin text-amber-400' : ''}`} />
          <span>{isFetchingRates ? t.fetchingRates : t.fetchLiveRates}</span>
        </button>
      </div>

      {updateFeedback && (
        <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{updateFeedback.message}</span>
        </div>
      )}

      {/* Grid: 1. Base Currency Selector & 2. Dual-Currency Display Option */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Base Currency Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-extrabold text-white text-xs block">{t.baseCurrency}</span>
              <span className="text-[10px] text-slate-400">{t.baseCurrencyDesc}</span>
            </div>
            <span className="text-2xl">{baseCurrencyObj.flag}</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <select
              value={baseCode}
              onChange={(e) => handleChangeBaseCurrency(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {POPULAR_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {language === 'ar' ? c.name : c.nameEn} ({c.code} - {c.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>{language === 'ar' ? 'الرمز المعتمد في التطبيق:' : 'Active Display Symbol:'}</span>
            <strong className="font-mono text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
              {baseCurrencyObj.symbol} ({baseCurrencyObj.code})
            </strong>
          </div>
        </div>

        {/* Secondary Display Currency Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-extrabold text-white text-xs block">{t.secondaryDisplayCurrency}</span>
              <span className="text-[10px] text-slate-400">{t.secondaryDisplayCurrencyDesc}</span>
            </div>
            <span className="text-2xl">{secondaryCurrencyObj.flag}</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <select
              value={secondaryCode}
              onChange={(e) => handleChangeSecondary(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {POPULAR_CURRENCIES.filter((c) => c.code !== baseCode).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {language === 'ar' ? c.name : c.nameEn} ({c.code} - {c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Dual Currency */}
          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-300 font-semibold">{t.showDualCurrencyOnReceipts}</span>
            <button
              type="button"
              onClick={() => handleToggleDualCurrency(!showDualCurrency)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showDualCurrency ? 'bg-teal-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  showDualCurrency ? (isRTL ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Currency Converter Widget */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950/30 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-teal-400" />
            <h5 className="font-extrabold text-white text-xs">{t.currencyConverterTitle}</h5>
          </div>
          <span className="text-[10px] text-slate-400">{t.currencyConverterDesc}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          {/* Amount input */}
          <div className="sm:col-span-4 space-y-1">
            <label className="text-[10px] text-slate-400 font-semibold block">{t.amountToConvert}:</label>
            <input
              type="number"
              value={calcAmount || ''}
              onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-teal-500"
              placeholder="100.00"
            />
          </div>

          {/* From Currency */}
          <div className="sm:col-span-3 space-y-1">
            <label className="text-[10px] text-slate-400 font-semibold block">{t.fromCurrency}:</label>
            <select
              value={calcFrom}
              onChange={(e) => setCalcFrom(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-bold text-xs focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {POPULAR_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="sm:col-span-1 flex items-center justify-center pt-3 sm:pt-4">
            <button
              type="button"
              onClick={() => {
                const prevFrom = calcFrom;
                setCalcFrom(calcTo);
                setCalcTo(prevFrom);
              }}
              title="عكس العملات"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* To Currency */}
          <div className="sm:col-span-4 space-y-1">
            <label className="text-[10px] text-slate-400 font-semibold block">{t.toCurrency}:</label>
            <select
              value={calcTo}
              onChange={(e) => setCalcTo(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-bold text-xs focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {POPULAR_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Converter Result Box */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-slate-400 text-xs font-mono">
            {calcAmount} {findCurrency(calcFrom).symbol} =
          </div>
          <div className="text-lg font-black text-emerald-400 font-mono flex items-center gap-1.5">
            <span>{convertedAmount.toFixed(findCurrency(calcTo).decimalDigits || 2)}</span>
            <span className="text-xs text-emerald-300 font-sans">{findCurrency(calcTo).symbol}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            (1 {findCurrency(calcFrom).code} = {(convertCurrency(1, calcFrom, calcTo, rates, baseCode)).toFixed(4)} {findCurrency(calcTo).code})
          </div>
        </div>
      </div>

      {/* Exchange Rates Table */}
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h5 className="font-extrabold text-white text-xs flex items-center gap-1.5">
              <span>{t.exchangeRatesTable}</span>
              <span className="font-mono text-amber-300">({baseCode})</span>
            </h5>
            <p className="text-[10px] text-slate-400">
              {multiCurrency.lastUpdated ? `${t.rateLastUpdated} ${formatLastUpdated(multiCurrency.lastUpdated)}` : ''}
            </p>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث عن عملة...' : 'Search currency...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-8 pl-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Table / List */}
        <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-slate-400 font-bold text-[11px] sticky top-0 z-10">
              <tr>
                <th className="p-2.5">{t.currency}</th>
                <th className="p-2.5 text-center">{t.exchangeRateLabel} (1 {baseCode} = )</th>
                <th className="p-2.5 text-center hidden sm:table-cell">{t.inverseRateLabel}</th>
                <th className="p-2.5 text-center w-24">{language === 'ar' ? 'تحكم' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
              {filteredCurrencies.map((curr) => {
                const isBase = curr.code === baseCode;
                const activeRate = isBase ? 1.0 : (rates[curr.code] !== undefined ? rates[curr.code] : 1.0);
                const inverseRate = activeRate > 0 ? (1 / activeRate) : 0;
                const isCustom = customRatesMap[curr.code];

                return (
                  <tr
                    key={curr.code}
                    className={`hover:bg-slate-850 transition-colors ${
                      isBase ? 'bg-amber-950/20 font-bold' : ''
                    }`}
                  >
                    {/* Currency name & info */}
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none">{curr.flag}</span>
                        <div>
                          <div className="font-extrabold text-white flex items-center gap-1.5">
                            <span>{language === 'ar' ? curr.name : curr.nameEn}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({curr.code})</span>
                            {isBase && (
                              <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded-md border border-amber-500/40">
                                {t.baseCurrency}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                            {curr.countries}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Rate value (Editable if not base) */}
                    <td className="p-2.5 text-center font-mono">
                      {isBase ? (
                        <span className="font-bold text-amber-300">1.0000 {curr.symbol}</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={activeRate}
                            onChange={(e) => handleUpdateSingleRate(curr.code, parseFloat(e.target.value))}
                            className={`w-24 bg-slate-900 border rounded-lg px-2 py-1 text-center font-mono font-bold text-xs focus:outline-none focus:border-amber-400 ${
                              isCustom
                                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                                : 'border-slate-700 text-slate-100'
                            }`}
                            step="0.0001"
                          />
                          <span className="text-[10px] text-slate-400">{curr.symbol}</span>
                        </div>
                      )}
                    </td>

                    {/* Inverse Rate */}
                    <td className="p-2.5 text-center font-mono text-slate-400 hidden sm:table-cell text-[11px]">
                      {isBase ? (
                        <span>-</span>
                      ) : (
                        <span>
                          1 {curr.code} = <strong className="text-slate-200">{inverseRate > 10 ? inverseRate.toFixed(2) : inverseRate.toFixed(4)}</strong> {baseCurrencyObj.symbol}
                        </span>
                      )}
                    </td>

                    {/* Reset Button */}
                    <td className="p-2.5 text-center">
                      {!isBase && isCustom && (
                        <button
                          type="button"
                          onClick={() => handleResetSingleRate(curr.code)}
                          title={t.resetToMarketRate}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
