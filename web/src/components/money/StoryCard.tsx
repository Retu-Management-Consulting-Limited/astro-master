import type { Prophecy } from "@/lib/money/types";

// S2「连载金钱故事」card + Day-1 opening. Styling lifted from
// design/19-money-mirror.html (.story block). Day-1 has no 承前.
export function StoryCard({
  page,
  isDayOne,
  hopeNote,
  prophecy,
  prev,
}: {
  page: number;
  isDayOne: boolean;
  weight: "heavy" | "light" | "recap";
  hopeNote: string;
  prophecy: Prophecy;
  prev: string | null;
}) {
  return (
    <div data-testid="money-story" className="rounded-2xl border border-[rgba(127,201,154,0.3)] bg-[linear-gradient(180deg,rgba(127,201,154,0.1),rgba(127,201,154,0.02))] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.16em] text-[#c9a861]">你的金钱故事</span>
        <span className="text-[10px] tracking-[0.1em] text-[#7a8194]">
          {isDayOne ? "第 1 页 · 从今天开始" : `第 ${page} 页 · 今天`}
        </span>
      </div>
      {prev && !isDayOne ? (
        <p className="mb-2 border-b border-white/10 pb-2 text-[12px] leading-relaxed text-[#7a8194]">承前：{prev}</p>
      ) : null}
      <p className="font-serif text-[17px] leading-relaxed text-[#ade3c2]">{hopeNote}</p>
      <p className="mt-3 font-serif text-[15px] italic leading-relaxed text-[#e0c98a]">{prophecy.text}</p>
    </div>
  );
}
