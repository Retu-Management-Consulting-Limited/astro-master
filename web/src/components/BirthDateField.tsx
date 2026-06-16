"use client";
import { useState } from "react";

// month is 1-12; day 0 of the next month == last day of this month.
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
export function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

const pad = (n: number) => String(n).padStart(2, "0");

const selStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "var(--field)",
  border: "1px solid var(--field-bd)",
  borderRadius: 13,
  padding: "15px 10px",
  color: "var(--cream)",
  fontSize: 15.5,
  fontFamily: "var(--sans)",
  colorScheme: "dark",
  cursor: "pointer",
};

// 年/月/日 三个独立 <select> 替换原生 <input type="date">。原生 date picker 在
// 安卓上选几十年前的出生年极痛苦——要么一个月一个月翻几百次、要么找不到怎么跳年，
// 且年/月/日锁在一个弹层里无法单独修改（这是 Kevin 报的核心痛点）。三段独立选择
// 是生日输入的标准做法，可单独改年/月/日。value/onChange 用 "YYYY-MM-DD"，与下游
// resolveBirth 完全兼容；未选全时 onChange("")，交给上游校验兜底。
export function BirthDateField({
  value,
  onChange,
  idPrefix = "bd",
}: {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  idPrefix?: string;
}) {
  const parts = value ? value.split("-").map((n) => parseInt(n, 10)) : [];
  const [y, setY] = useState<number>(parts[0] || 0);
  const [m, setM] = useState<number>(parts[1] || 0);
  const [d, setD] = useState<number>(parts[2] || 0);

  const thisYear = new Date().getFullYear();
  const years: number[] = [];
  for (let yy = thisYear; yy >= 1900; yy--) years.push(yy); // 倒序：出生年更快够到
  const dmax = y && m ? daysInMonth(y, m) : 31;

  function commit(ny: number, nm: number, nd: number) {
    // 改年/月后把日收敛到当月上限（如 1/31 → 切到 2 月变 2/28，闰年 2/29）
    if (ny && nm && nd) nd = clampDay(ny, nm, nd);
    setY(ny);
    setM(nm);
    setD(nd);
    onChange(ny && nm && nd ? `${ny}-${pad(nm)}-${pad(nd)}` : "");
  }

  return (
    <div role="group" aria-label="出生日期" style={{ display: "flex", gap: 8 }}>
      <select aria-label="出生年" id={`${idPrefix}-year`} value={y || ""} onChange={(e) => commit(parseInt(e.target.value, 10) || 0, m, d)} style={{ ...selStyle, flex: 1.3 }}>
        <option value="" disabled>年</option>
        {years.map((yy) => <option key={yy} value={yy}>{yy}</option>)}
      </select>
      <select aria-label="出生月" id={`${idPrefix}-month`} value={m || ""} onChange={(e) => commit(y, parseInt(e.target.value, 10) || 0, d)} style={selStyle}>
        <option value="" disabled>月</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => <option key={mm} value={mm}>{mm}</option>)}
      </select>
      <select aria-label="出生日" id={`${idPrefix}-day`} value={d || ""} onChange={(e) => commit(y, m, parseInt(e.target.value, 10) || 0)} style={selStyle}>
        <option value="" disabled>日</option>
        {Array.from({ length: dmax }, (_, i) => i + 1).map((dd) => <option key={dd} value={dd}>{dd}</option>)}
      </select>
    </div>
  );
}
