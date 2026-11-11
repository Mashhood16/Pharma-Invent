"use client";

import React, { useState, useEffect } from "react";
import {
  Minus,
  Square,
  X,
  Maximize2,
  Shield,
  User as UserIcon,
  Bot,
} from "lucide-react";

interface TitlebarProps {
  user?: {
    name: string;
    role: "ADMIN" | "CASHIER";
  } | null;
  onToggleAI?: () => void;
}

export function DesktopTitlebar({ user, onToggleAI }: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).desktopAPI?.isDesktop) {
      (window as any).desktopAPI.isMaximized().then((res: boolean) => {
        setIsMaximized(res);
      });
    }
  }, []);

  const handleMinimize = () => {
    if (typeof window !== "undefined" && (window as any).desktopAPI) {
      (window as any).desktopAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if (typeof window !== "undefined" && (window as any).desktopAPI) {
      (window as any).desktopAPI.maximize();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && (window as any).desktopAPI) {
      (window as any).desktopAPI.close();
    }
  };

  return (
    <header className="h-8 w-full bg-zinc-950 text-zinc-300 flex items-center justify-between px-3 select-none text-[11px] border-b border-zinc-800 z-50 shrink-0 app-drag-region">
      {/* Brand & Terminal Identifier */}
      <div className="flex items-center space-x-2.5">
        <div className="w-4 h-4 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 font-bold text-[10px]">
          ✚
        </div>
        <span className="font-semibold text-zinc-100 tracking-tight">
          Pharma Invent <span className="text-zinc-500 font-normal text-[10px]">POS & Inventory</span>
        </span>
        <div className="h-3 w-[1px] bg-zinc-800 mx-1" />
        <span className="text-zinc-400">Terminal 01</span>
      </div>

      {/* Center: System Status */}
      <div className="hidden md:flex items-center space-x-4 text-[10px] text-zinc-500">
        <span>System Ready</span>
        <span>•</span>
        <span>Barcode Scanner Active</span>
      </div>

      {/* User Info & Window Buttons */}
      <div className="flex items-center space-x-2 app-no-drag">
        {onToggleAI && (
          <button
            onClick={onToggleAI}
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
            title="AI Inventory Assistant (Ctrl+K)"
          >
            <Bot className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] hidden sm:inline">AI Assistant</span>
            <kbd className="text-[9px] font-mono bg-zinc-900 px-1 rounded border border-zinc-800 text-zinc-500">
              Ctrl+K
            </kbd>
          </button>
        )}

        {user && (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            {user.role === "ADMIN" ? (
              <Shield className="w-3 h-3 text-zinc-400" />
            ) : (
              <UserIcon className="w-3 h-3 text-zinc-400" />
            )}
            <span className="font-medium text-zinc-200 truncate max-w-[100px]">
              {user.name.split(" ")[0]}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-zinc-800 text-zinc-300">
              {user.role}
            </span>
          </div>
        )}

        {/* Standard Windows Desktop Controls */}
        <div className="flex items-center border-l border-zinc-800 pl-1">
          <button
            onClick={handleMinimize}
            title="Minimize"
            className="w-6 h-6 flex items-center justify-center hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={handleMaximize}
            title={isMaximized ? "Restore" : "Maximize"}
            className="w-6 h-6 flex items-center justify-center hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {isMaximized ? <Maximize2 className="w-3 h-3" /> : <Square className="w-3 h-3" />}
          </button>
          <button
            onClick={handleClose}
            title="Close"
            className="w-6 h-6 flex items-center justify-center hover:bg-red-600 rounded text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
}
