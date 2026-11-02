"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { testerRankPresentation } from "@/lib/tester-rank";

export default function AnonymousTesterLabel({
  testId,
  number,
  compact = false,
}: {
  testId: string;
  number: number;
  compact?: boolean;
}) {
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void createClient()
      .rpc("get_developer_test_rank", { p_test_id: testId })
      .then(({ data, error }) => {
        if (!active || error) return;
        if (typeof data === "number" && Number.isInteger(data)) setRank(data);
      });
    return () => {
      active = false;
    };
  }, [testId]);

  const presentation = testerRankPresentation(rank);
  const label = presentation.known
    ? `${presentation.label} #${number}`
    : `Tester #${number}`;

  return (
    <span
      className={compact ? presentation.text : `font-semibold ${presentation.text}`}
      title="Anonymous tester rank at the time this report is viewed"
    >
      {label}
    </span>
  );
}
