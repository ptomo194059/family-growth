"use client";

import { useAppStore } from "@/lib/store";
import Header from "./Header";

export default function HeaderWrapper() {
  const childrenList = useAppStore((s) => s.children);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const setActiveChild = useAppStore((s) => s.setActiveChild);

  const lang = "zh"; // 可以之後接 i18n
  const onLangChange = (l: "zh" | "en") => console.log("Switch lang", l);

  return (
    <Header
      childrenList={childrenList}
      selectedChildId={activeChildId}
      onChildChange={setActiveChild}
      lang={lang}
      onLangChange={onLangChange}
    />
  );
}
