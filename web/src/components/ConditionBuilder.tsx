"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Condition, ConditionGroup } from "@/lib/acn";

const METHODS = [
  { value: "x402-payment", label: "x402 Payment" },
  { value: "stx-balance", label: "STX Balance" },
  { value: "sip010-balance", label: "SIP-010 Token Balance" },
  { value: "sip009-owner", label: "SIP-009 NFT Ownership" },
  { value: "contract-call", label: "Custom Contract Call" },
  { value: "block-height", label: "Block Height" },
] as const;

const COMPARATORS = ["==", ">=", "<=", ">", "<"] as const;

interface Props {
  value: ConditionGroup | null;
  onChange: (v: ConditionGroup | null) => void;
}

function emptyCondition(id: number): Condition {
  return {
    id,
    method: "stx-balance",
    returnValueTest: { comparator: ">=", value: "0" },
  };
}

function makeX402Condition(id: number, priceStx = ""): Condition {
  const ustx = Math.round(parseFloat(priceStx || "0") * 1_000_000);
  return {
    id,
    method: "x402-payment",
    returnValueTest: { comparator: "==", value: String(ustx) },
  };
}

/** Extract the STX price string from an x402-payment condition's value (stored as microSTX). */
function x402PriceStx(cond: Condition): string {
  const ustx = parseInt(cond.returnValueTest.value, 10);
  if (!ustx || isNaN(ustx)) return "";
  return String(ustx / 1_000_000);
}

export function ConditionBuilder({ value, onChange }: Props) {
  const [enabled, setEnabled] = useState(!!value);

  const group: ConditionGroup = value ?? {
    operator: "AND",
    conditions: [emptyCondition(1)],
  };

  function toggle() {
    if (enabled) {
      onChange(null);
      setEnabled(false);
    } else {
      onChange(group);
      setEnabled(true);
    }
  }

  function update(g: ConditionGroup) {
    onChange(g);
  }

  function setOperator(op: "AND" | "OR") {
    update({ ...group, operator: op });
  }

  function addCondition() {
    const nextId = Math.max(0, ...group.conditions.map((c) => c.id)) + 1;
    update({
      ...group,
      conditions: [...group.conditions, emptyCondition(nextId)],
    });
  }

  function removeCondition(id: number) {
    const next = group.conditions.filter((c) => c.id !== id);
    if (next.length === 0) {
      onChange(null);
      setEnabled(false);
      return;
    }
    update({ ...group, conditions: next });
  }

  function updateCondition(id: number, patch: Partial<Condition>) {
    update({
      ...group,
      conditions: group.conditions.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    });
  }

  function handleMethodChange(id: number, method: string) {
    if (method === "x402-payment") {
      updateCondition(id, {
        method,
        returnValueTest: { comparator: "==", value: "0" },
      });
    } else {
      updateCondition(id, {
        method,
        returnValueTest: { comparator: ">=", value: "0" },
      });
    }
  }

  function handleX402PriceChange(id: number, priceStx: string) {
    const ustx = Math.round(parseFloat(priceStx || "0") * 1_000_000);
    updateCondition(id, {
      returnValueTest: { comparator: "==", value: String(ustx) },
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={toggle}
          className="rounded border-gray-600 bg-gray-800 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm font-medium text-gray-300">
          Add access conditions
        </span>
      </label>

      {enabled && (
        <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Require</span>
            <select
              value={group.operator}
              onChange={(e) => setOperator(e.target.value as "AND" | "OR")}
              className="input w-auto py-1 px-2"
            >
              <option value="AND">ALL conditions (AND)</option>
              <option value="OR">ANY condition (OR)</option>
            </select>
          </div>

          {group.conditions.map((cond) => (
            <div
              key={cond.id}
              className="space-y-2 rounded-lg border border-gray-700 bg-gray-900/50 p-3"
            >
              <div className="flex items-center justify-between">
                <select
                  value={cond.method}
                  onChange={(e) => handleMethodChange(cond.id, e.target.value)}
                  className="input w-auto py-1 px-2 text-xs"
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeCondition(cond.id)}
                  className="rounded p-1 text-gray-500 hover:text-red-400 hover:bg-gray-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {cond.method === "x402-payment" && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Price (STX)</label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    placeholder="e.g. 5.0"
                    value={x402PriceStx(cond)}
                    onChange={(e) => handleX402PriceChange(cond.id, e.target.value)}
                    className="input text-xs"
                  />
                </div>
              )}

              {(cond.method === "sip010-balance" ||
                cond.method === "sip009-owner" ||
                cond.method === "contract-call") && (
                <input
                  type="text"
                  placeholder="Contract address (e.g. SP2C...R.my-token)"
                  value={cond.contractAddress ?? ""}
                  onChange={(e) =>
                    updateCondition(cond.id, { contractAddress: e.target.value })
                  }
                  className="input text-xs"
                />
              )}

              {cond.method === "contract-call" && (
                <>
                  <input
                    type="text"
                    placeholder="Function name"
                    value={cond.function ?? ""}
                    onChange={(e) =>
                      updateCondition(cond.id, { function: e.target.value })
                    }
                    className="input text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Parameters (comma-separated, :userAddress for buyer)"
                    value={(cond.parameters ?? []).join(",")}
                    onChange={(e) =>
                      updateCondition(cond.id, {
                        parameters: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="input text-xs"
                  />
                </>
              )}

              {cond.method !== "x402-payment" && (
                <div className="flex items-center gap-2">
                  <select
                    value={cond.returnValueTest.comparator}
                    onChange={(e) =>
                      updateCondition(cond.id, {
                        returnValueTest: {
                          ...cond.returnValueTest,
                          comparator: e.target.value,
                        },
                      })
                    }
                    className="input w-20 py-1 px-2 text-xs"
                  >
                    {COMPARATORS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Value"
                    value={cond.returnValueTest.value}
                    onChange={(e) =>
                      updateCondition(cond.id, {
                        returnValueTest: {
                          ...cond.returnValueTest,
                          value: e.target.value,
                        },
                      })
                    }
                    className="input flex-1 text-xs"
                  />
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addCondition}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-700 px-3 py-2 text-xs text-gray-400 transition-colors hover:border-brand-500 hover:text-brand-400 w-full justify-center"
          >
            <Plus className="h-3.5 w-3.5" />
            Add condition
          </button>
        </div>
      )}
    </div>
  );
}

/** Extract price (microSTX) from conditions. Returns 0 if no x402-payment condition. */
export function extractPriceFromConditions(group: ConditionGroup | null): number {
  if (!group) return 0;
  const x402 = group.conditions.find((c) => c.method === "x402-payment");
  if (!x402) return 0;
  const val = parseInt(x402.returnValueTest.value, 10);
  return isNaN(val) ? 0 : val;
}
