"use client";

import Daily, { type DailyCall, type DailyEventObjectFatalError } from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";

interface DailyPrebuiltCallProps {
  roomUrl: string;
  token: string;
  userName: string;
}

export default function DailyPrebuiltCall({ roomUrl, token, userName }: DailyPrebuiltCallProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callRef = useRef<DailyCall | null>(null);
  const [status, setStatus] = useState<"loading" | "joining" | "joined" | "left" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!containerRef.current || callRef.current) return;

    let cancelled = false;
    setStatus("joining");

    const callFrame = Daily.createFrame(containerRef.current, {
      showLeaveButton: true,
      showFullscreenButton: true,
      showParticipantsBar: true,
      showLocalVideo: true,
      showUserNameChangeUI: false,
      userName,
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "0",
        borderRadius: "0"
      },
      theme: {
        light: {
          colors: {
            accent: "#dc2626",
            accentText: "#ffffff",
            background: "#ffffff",
            backgroundAccent: "#f8fafc",
            baseText: "#020617",
            border: "#e2e8f0",
            mainAreaBg: "#020617",
            mainAreaBgAccent: "#111827",
            mainAreaText: "#ffffff",
            supportiveText: "#64748b"
          }
        },
        dark: {
          colors: {
            accent: "#dc2626",
            accentText: "#ffffff",
            background: "#090909",
            backgroundAccent: "#111111",
            baseText: "#ffffff",
            border: "rgba(255,255,255,0.12)",
            mainAreaBg: "#050505",
            mainAreaBgAccent: "#171717",
            mainAreaText: "#ffffff",
            supportiveText: "rgba(255,255,255,0.55)"
          }
        }
      }
    });

    callRef.current = callFrame;

    callFrame
      .on("joined-meeting", () => {
        if (!cancelled) setStatus("joined");
      })
      .on("left-meeting", () => {
        if (!cancelled) setStatus("left");
      })
      .on("error", (event) => {
        if (cancelled) return;
        const fatalEvent = event as DailyEventObjectFatalError;
        setError(fatalEvent.errorMsg || "Daily could not join the room.");
        setStatus("error");
      });

    callFrame.join({ url: roomUrl, token }).catch((joinError: unknown) => {
      if (cancelled) return;
      setError(joinError instanceof Error ? joinError.message : "Daily could not join the room.");
      setStatus("error");
    });

    return () => {
      cancelled = true;
      const existingCall = callRef.current;
      callRef.current = null;
      existingCall?.destroy();
    };
  }, [roomUrl, token, userName]);

  return (
    <div className="relative h-full min-h-[66vh] overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      {status === "joining" || status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#050505]">
          <div className="w-full max-w-sm border border-white/10 bg-[#111] p-5 text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">Daily SFU</p>
            <p className="mt-2 text-2xl font-black text-white">Joining secure call...</p>
            <p className="mt-2 text-sm font-semibold text-white/45">Camera and microphone prompts will appear inside the call frame.</p>
          </div>
        </div>
      ) : null}

      {status === "left" ? (
        <div className="absolute inset-0 grid place-items-center bg-[#050505] p-6">
          <div className="w-full max-w-md border border-white/10 bg-[#111] p-6 text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">Call ended</p>
            <h2 className="mt-2 text-3xl font-black text-white">You left the room.</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/45">Generate a fresh join token from the side panel if you need to rejoin.</p>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-[#050505] p-6">
          <div className="w-full max-w-md border border-red-500/35 bg-red-500/10 p-6 text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-200">Daily error</p>
            <h2 className="mt-2 text-3xl font-black text-white">Could not join call.</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-red-100/70">{error}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
