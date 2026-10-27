import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const NEAR_BOTTOM_PX = 80;

/**
 * Chat scrolling that respects the reader: new messages scroll the view down
 * only if the user is already at (or near) the bottom. If they've scrolled up
 * to re-read something, `showJump` turns on so a "Jump to latest" button can
 * be shown instead of yanking them away.
 *
 *   const { scrollRef, showJump, jumpToLatest } = useChatScroll([messages, isTyping]);
 */
export default function useChatScroll(deps) {
  const scrollRef = useRef(null);
  const pinned = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const jumpToLatest = useCallback((behavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    pinned.current = true;
    setShowJump(false);
  }, []);

  // Track whether the reader is at the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      pinned.current = atBottom;
      if (atBottom) setShowJump(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  });

  // On new content: follow it if pinned, otherwise offer the jump button.
  useLayoutEffect(() => {
    if (pinned.current) jumpToLatest("auto");
    else setShowJump(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { scrollRef, showJump, jumpToLatest };
}
