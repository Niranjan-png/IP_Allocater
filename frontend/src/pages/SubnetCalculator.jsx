import React, { useState } from 'react';
import { api } from '../services/api';
import CopyButton from '../components/CopyButton';
import {
  Calculator,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Binary,
  Layers,
  ShieldCheck,
  Globe,
  Sliders,
  CheckCircle2,
  Copy
} from 'lucide-react';

export default function SubnetCalculator() {
  const [ipAddress, setIpAddress] = useState('192.168.1.10');
  const [cidr, setCidr] = useState(24);
  const [strict, setStrict] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copyAllStatus, setCopyAllStatus] = useState(false);

  const handleCalculate = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.calculateSubnet({
        ip_address: ipAddress.trim(),
        cidr: parseInt(cidr, 10),
        strict: Boolean(strict)
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIpAddress('');
    setCidr(24);
    setStrict(false);
    setResult(null);
    setError(null);
  };

  const loadExample = (exampleIp, exampleCidr) => {
    setIpAddress(exampleIp);
    setCidr(exampleCidr);
    setStrict(false);
    setError(null);
    // Auto calculate for convenience
    setTimeout(() => {
      api.calculateSubnet({
        ip_address: exampleIp,
        cidr: exampleCidr,
        strict: false
      }).then(setResult).catch(err => setError(err.message));
    }, 50);
  };

  const handleCopyAll = async () => {
    if (!result) return;
    const summary = `
IPv4 Subnet Calculation:
------------------------
IP Address:         ${result.ip_address}
CIDR Notation:      ${result.cidr_notation}
Network Address:    ${result.network_address}
Subnet Mask:        ${result.subnet_mask}
Wildcard Mask:      ${result.wildcard_mask}
Broadcast Address:  ${result.broadcast_address}
First Usable Host:  ${result.first_usable_host}
Last Usable Host:   ${result.last_usable_host}
Total Addresses:    ${result.total_addresses.toLocaleString()}
Usable Hosts:       ${result.usable_hosts.toLocaleString()}
Class:              ${result.ip_class}
Scope:              ${result.scope}
Private IP:         ${result.is_private ? 'Yes' : 'No'}
`.trim();
    try {
      await navigator.clipboard.writeText(summary);
      setCopyAllStatus(true);
      setTimeout(() => setCopyAllStatus(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Input Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Subnet Parameter Calculator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter an IPv4 address and CIDR prefix to evaluate network properties.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Examples:</span>
            <button
              type="button"
              onClick={() => loadExample('192.168.1.10', 24)}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
            >
              192.168.1.10/24
            </button>
            <button
              type="button"
              onClick={() => loadExample('10.0.0.65', 26)}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
            >
              10.0.0.65/26
            </button>
            <button
              type="button"
              onClick={() => loadExample('172.16.5.4', 31)}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
            >
              172.16.5.4/31
            </button>
          </div>
        </div>

        <form onSubmit={handleCalculate} className="mt-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* IP Address Input */}
            <div className="md:col-span-6 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                IPv4 Address or Network
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="e.g. 192.168.1.10"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-sm"
                  required
                />
              </div>
              <span className="text-[11px] text-slate-400">
                Standard dotted-quad notation (0.0.0.0 to 255.255.255.255)
              </span>
            </div>

            {/* CIDR Prefix Input & Slider */}
            <div className="md:col-span-6 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  CIDR Prefix (/{cidr})
                </label>
                <span className="text-xs font-mono font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  /{cidr}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={cidr}
                  onChange={(e) => setCidr(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <input
                  type="number"
                  min="0"
                  max="32"
                  value={cidr}
                  onChange={(e) => setCidr(Number(e.target.value))}
                  className="w-16 px-2.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-sm text-center"
                />
              </div>
              <span className="text-[11px] text-slate-400">
                Slide or type prefix length between 0 and 32
              </span>
            </div>
          </div>

          {/* Strict Validation Checkbox */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={strict}
                onChange={(e) => setStrict(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs text-slate-700 font-medium">
                Enforce Strict Network Validation (Rejects addresses where host bits are not zero)
              </span>
            </label>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                <Calculator className="w-3.5 h-3.5" />
                {loading ? 'Calculating...' : 'Calculate Subnet'}
              </button>
            </div>
          </div>
        </form>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Calculation Error: </strong>
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Output Results Cards */}
      {result && (
        <div className="space-y-6">
          {/* Main Key Metrics Grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-800">
                  Calculated Results for <span className="font-mono text-blue-600">{result.ip_address}{result.cidr_notation}</span>
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {result.ip_class}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  result.is_private
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {result.scope}
                </span>
              </div>

              <button
                onClick={handleCopyAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
              >
                {copyAllStatus ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copyAllStatus ? "All Details Copied!" : "Copy Full Report"}</span>
              </button>
            </div>

            {/* Note alert if RFC 3021 / /32 edge cases */}
            {result.notes && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span><strong>Protocol Note:</strong> {result.notes}</span>
              </div>
            )}

            {/* Structured Value Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Network Address</span>
                  <CopyButton text={result.network_address} />
                </div>
                <div className="text-sm font-bold font-mono text-slate-900">{result.network_address}</div>
                <div className="text-[11px] text-slate-400 font-mono">CIDR: {result.cidr_notation}</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Subnet Mask</span>
                  <CopyButton text={result.subnet_mask} />
                </div>
                <div className="text-sm font-bold font-mono text-slate-900">{result.subnet_mask}</div>
                <div className="text-[11px] text-slate-400 font-mono">Netmask</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Wildcard Mask</span>
                  <CopyButton text={result.wildcard_mask} />
                </div>
                <div className="text-sm font-bold font-mono text-slate-900">{result.wildcard_mask}</div>
                <div className="text-[11px] text-slate-400 font-mono">Inverse Mask</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Broadcast Address</span>
                  <CopyButton text={result.broadcast_address} />
                </div>
                <div className="text-sm font-bold font-mono text-slate-900">{result.broadcast_address}</div>
                <div className="text-[11px] text-slate-400 font-mono">Subnet Broadcast</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">First Usable Host</span>
                  <CopyButton text={result.first_usable_host} />
                </div>
                <div className="text-sm font-bold font-mono text-emerald-700">{result.first_usable_host}</div>
                <div className="text-[11px] text-slate-400">Lower Host Boundary</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Last Usable Host</span>
                  <CopyButton text={result.last_usable_host} />
                </div>
                <div className="text-sm font-bold font-mono text-emerald-700">{result.last_usable_host}</div>
                <div className="text-[11px] text-slate-400">Upper Host Boundary</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total IP Count</span>
                  <CopyButton text={String(result.total_addresses)} />
                </div>
                <div className="text-sm font-bold font-mono text-slate-900">{result.total_addresses.toLocaleString()}</div>
                <div className="text-[11px] text-slate-400 font-mono">2^{32 - result.cidr} addresses</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Usable Hosts</span>
                  <CopyButton text={String(result.usable_hosts)} />
                </div>
                <div className="text-sm font-bold font-mono text-blue-700">{result.usable_hosts.toLocaleString()}</div>
                <div className="text-[11px] text-slate-400">Assignable Host IPs</div>
              </div>
            </div>

            {/* Binary Breakdown View */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Binary className="w-4 h-4 text-slate-400" />
                32-Bit Binary Representation
              </h4>

              <div className="space-y-2 bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-400 w-36">IP Address:</span>
                  <span className="text-blue-400 tracking-wider font-semibold">{result.ip_binary}</span>
                  <CopyButton text={result.ip_binary} className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-400 w-36">Subnet Mask:</span>
                  <span className="text-emerald-400 tracking-wider font-semibold">{result.subnet_mask_binary}</span>
                  <CopyButton text={result.subnet_mask_binary} className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-400 w-36">Network Address:</span>
                  <span className="text-amber-400 tracking-wider font-semibold">{result.network_address_binary}</span>
                  <CopyButton text={result.network_address_binary} className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

