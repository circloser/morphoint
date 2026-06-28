"use client";

import { useCallback, useEffect, useState } from "react";

// Premium is a local flag for now (payments are out of scope this round).
// When billing lands, replace the setter with a verified entitlement check.
const KEY = "morphoint.premium.v1";

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    setIsPremium(localStorage.getItem(KEY) === "1");
  }, []);

  const setPremium = useCallback((v: boolean) => {
    setIsPremium(v);
    localStorage.setItem(KEY, v ? "1" : "0");
  }, []);

  return { isPremium, setPremium };
}
