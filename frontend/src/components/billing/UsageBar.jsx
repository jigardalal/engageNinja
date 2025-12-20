import React from 'react';

export default function UsageBar({ label, used, limit, unit = 'messages' }) {
  const normalizeNumber = (value) => {
    const asNumber = Number(value ?? 0);
    return Number.isFinite(asNumber) ? asNumber : 0;
  };
  const usedValue = normalizeNumber(used);
  const limitValue = normalizeNumber(limit);
  const percentage = limitValue > 0 ? (usedValue / limitValue) * 100 : 0;
  const isNearLimit = percentage >= 80;
  const isOverLimit = percentage > 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span
          className={`text-sm font-semibold ${
            isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-green-600'
          }`}
        >
          {usedValue.toLocaleString()} / {limitValue.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--border)]">
        <div
          className={`h-2 rounded-full transition-all ${
            isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isOverLimit && (
        <p className="text-xs text-red-600">⚠ Limit exceeded - upgrade to send more messages</p>
      )}
    </div>
  );
}
