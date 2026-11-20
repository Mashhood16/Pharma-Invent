"use client";

import React, { useState, useEffect } from "react";
import {
  Minus,
  Square,
  X,
  Maximize2,
  Shield,
  ShieldAlert,
  User as UserIcon,
  Bot,
  Building,
  Menu,
} from "lucide-react";
import { Role } from "@/lib/auth";

interface TitlebarProps {
  user?: {
    name: string;
    role: Role;
    pharmacyName?: string | null;
  } | null;
  onToggleAI?: () => void;
  onToggleMobileMenu?: () => void;
}

export function DesktopTitlebar({ user, onToggleAI, onToggleMobileMenu }: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).desktopAPI?.isDesktop) {
      setIsDesktop(true);
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
    <header className="h-10 sm:h-8 w-full bg-zinc-950 text-zinc-300 flex items-center justify-between px-2.5 sm:px-3 select-none text-[11px] border-b border-zinc-800 z-50 shrink-0 app-drag-region">
      {/* Left: Mobile Hamburger + Brand & Store Identifier */}
      <div className="flex items-center space-x-2">
        {/* Mobile Hamburger Toggle Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded focus:outline-none"
            title="Open Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="w-4 h-4 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 font-bold text-[10px] shrink-0">
          ✚
        </div>
        <span className="font-semibold text-zinc-100 tracking-tight whitespace-nowrap">
          Pharma Invent
        </span>

        {user?.pharmacyName && (
          <div className="hidden sm:flex items-center">
            <div className="h-3 w-[1px] bg-zinc-800 mx-1.5" />
            <span className="text-zinc-400 font-medium truncate max-w-[140px] sm:max-w-[200px] flex items-center gap-1 text-[10px] sm:text-[11px]">
              <Building className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="truncate">{user.pharmacyName}</span>
            </span>
          </div>
        )}
      </div>

      {/* Center: System Status (Hidden on smaller screens) */}
      <div className="hidden lg:flex items-center space-x-3 text-[10px] text-zinc-500">
        <span>System Ready</span>
        <span>•</span>
        <span>Barcode Scanner Active</span>
      </div>

      {/* Right: User Info & Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 app-no-drag">
        {onToggleAI && (
          <button
            onClick={onToggleAI}
            className="flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
            title="AI Assistant (Ctrl+K)"
          >
            <Bot className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-[10px] hidden sm:inline">AI</span>
          </button>
        )}

        {user && (
          <div className="flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            {user.role === "SUPER_ADMIN" ? (
              <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
            ) : user.role === "ADMIN" ? (
              <Shield className="w-3 h-3 text-zinc-400 shrink-0" />
            ) : (
              <UserIcon className="w-3 h-3 text-zinc-400 shrink-0" />
            )}
            <span className="font-medium text-zinc-200 truncate max-w-[70px] sm:max-w-[100px] text-[10px] sm:text-[11px]">
              {user.name.split(" ")[0]}
            </span>
            <span
              className={`text-[8px] sm:text-[9px] px-1 py-0.2 rounded font-semibold ${
                user.role === "SUPER_ADMIN"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {user.role === "SUPER_ADMIN" ? "SUPER" : user.role}
            </span>
          </div>
        )}

        {/* Windows Desktop Controls: Only show when running in Electron */}
        {isDesktop && (
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
        )}
      </div>
    </header>
  );
}
