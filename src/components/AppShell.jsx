"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AppUiProvider, useAppUi } from "@/context/AppUiContext";
import { FF } from "@/lib/fonts";
import TmdbHints from "@/components/TmdbHints";
import WhatToWatchModal from "@/components/WhatToWatchModal";
import BadgeInfoModal from "@/components/BadgeInfoModal";
import RecommendationDetailModal from "@/components/RecommendationDetailModal";
import { apiJson } from "@/lib/api";
import { buildLibraryCsv, downloadTextFile } from "@/lib/exportLibraryCsv";
import BrandLogo from "@/components/BrandLogo";

function AppShellInner({ children }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { data: session } = useSession();
  const { search, setSearch } = useAppUi();
  const [menuOpen, setMenuOpen] = useState(false);
  const [barMovies, setBarMovies] = useState([]);
  const [barSeries, setBarSeries] = useState([]);
  const [profileCard, setProfileCard] = useState(null);
  const [wtwOpen, setWtwOpen] = useState(false);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [searchDetailModal, setSearchDetailModal] = useState(null);
  const [quickAddBusyKey, setQuickAddBusyKey] = useState(null);
  const [flash, setFlash] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);
  const searchWrapRef = useRef(null);
  const [searchHintsSuppressed, setSearchHintsSuppressed] = useState(false);

  const loadBarData = useCallback(async () => {
    try {
      const [m, s, p] = await Promise.all([
        apiJson("/api/movies").catch(() => []),
        apiJson("/api/series").catch(() => []),
        apiJson("/api/profile").catch(() => null),
      ]);
      setBarMovies(Array.isArray(m) ? m : []);
      setBarSeries(Array.isArray(s) ? s : []);
      setProfileCard(p && !p.error ? p : null);
    } catch {
      setBarMovies([]);
    }
  }, []);

  useEffect(() => {
    loadBarData();
  }, [loadBarData]);

  useEffect(() => {
    const onRefresh = () => {
      loadBarData();
    };
    window.addEventListener("rp-app-refresh", onRefresh);
    return () => window.removeEventListener("rp-app-refresh", onRefresh);
  }, [loadBarData]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setSearchHintsSuppressed(false);
  }, [search]);

  useEffect(() => {
    if (!isHome) return;
    const onDown = (e) => {
      if (searchWrapRef.current?.contains(e.target)) return;
      setSearchHintsSuppressed(true);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [isHome]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || menuBtnRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [menuOpen]);

  const showFlash = useCallback((msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }, []);

  const quickAddFromSearchBar = useCallback(
    async (r) => {
      const mt = r.mediaType === "tv" ? "tv" : "movie";
      setQuickAddBusyKey(`${mt}-${r.tmdbId}`);
      try {
        if (mt === "tv") {
          await apiJson("/api/series", {
            method: "POST",
            body: JSON.stringify({
              title: r.title,
              years: r.year != null ? String(r.year) : "2000",
              tmdbId: r.tmdbId,
            }),
          });
          showFlash(`"${r.title}" added to Series`);
        } else {
          const y = r.year;
          if (y == null || !Number.isFinite(y)) {
            showFlash("No release year from TMDB — use Add Movie on Home to set the year.");
            return;
          }
          await apiJson("/api/movies", {
            method: "POST",
            body: JSON.stringify({ title: r.title, year: y, tmdbId: r.tmdbId }),
          });
          showFlash(`"${r.title}" added to Movies`);
        }
        window.dispatchEvent(new CustomEvent("rp-app-refresh"));
        window.dispatchEvent(new CustomEvent("rp-recommendations-refresh"));
      } catch (e) {
        showFlash(e instanceof Error ? e.message : "Could not add title");
      } finally {
        setQuickAddBusyKey(null);
      }
    },
    [showFlash]
  );

  const runExport = useCallback(async () => {
    setExportBusy(true);
    setMenuOpen(false);
    try {
      const [movies, series] = await Promise.all([apiJson("/api/movies"), apiJson("/api/series")]);
      const csv = buildLibraryCsv(movies, series);
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      downloadTextFile(`rotten-potatoes-library-${stamp}.csv`, csv);
      showFlash("Library exported");
    } catch (e) {
      showFlash(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  }, [showFlash]);

  const navLinkStyle = {
    display: "block",
    padding: "12px 16px",
    fontSize: 15,
    fontFamily: FF.sans,
    fontWeight: 600,
    color: "#ece8e0",
    textDecoration: "none",
    borderRadius: 8,
    transition: "background 0.15s ease",
  };

  return (
    <>
      {wtwOpen && <WhatToWatchModal onClose={() => setWtwOpen(false)} />}
      <BadgeInfoModal
        open={badgeModalOpen}
        onClose={() => setBadgeModalOpen(false)}
        badge={profileCard?.watchSummary?.currentBadge}
        totalMinutes={profileCard?.watchSummary?.totalMinutes}
      />
      {searchDetailModal && (
        <RecommendationDetailModal item={searchDetailModal} onClose={() => setSearchDetailModal(null)} />
      )}

      <header className="app-top-bar">
        <div className="app-top-bar__inner">
          <div className="app-top-bar__left">
            <button
              ref={menuBtnRef}
              type="button"
              className="app-top-bar__menu-btn"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="Open menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="app-top-bar__menu-icon" aria-hidden />
            </button>
            <Link href="/" className="app-top-bar__logo-link" aria-label="Home">
              <BrandLogo size={52} className="app-top-bar__logo" alt="" />
            </Link>
            {profileCard?.preferences?.showBadgesOnHome !== false && profileCard?.watchSummary?.currentBadge && (
              <button
                type="button"
                className="app-top-bar__badge-btn"
                onClick={() => setBadgeModalOpen(true)}
                title="Your watch badge"
              >
                {profileCard.watchSummary.currentBadge.title}
              </button>
            )}
          </div>

          <h1 className="app-top-bar__title">Rotten Potatoes</h1>

          <div className="app-top-bar__search-wrap">
            {isHome ? (
              <div ref={searchWrapRef} className="app-top-bar__search-inner">
                <input
                  placeholder="Search movies, series & TMDB…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchHintsSuppressed(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearchHintsSuppressed(true);
                  }}
                  aria-label="Search movies, series, and your library"
                  className="app-top-bar__search-input"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#161616",
                    border: "1px solid rgba(200, 50, 60, 0.55)",
                    borderRadius: 10,
                    color: "#f0ebe3",
                    padding: "12px 14px",
                    fontSize: 16,
                    fontFamily: FF.sans,
                    fontWeight: 500,
                    outline: "none",
                    minHeight: 48,
                  }}
                />
                <TmdbHints
                  id="home-tmdb-hints"
                  query={search}
                  type="both"
                  onPick={(r) => setSearch(r.title)}
                  onOpenDetail={(r) =>
                    setSearchDetailModal({
                      tmdbId: r.tmdbId,
                      mediaType: r.mediaType === "tv" ? "tv" : "movie",
                    })
                  }
                  visible={search.trim().length >= 2 && !searchHintsSuppressed}
                  libraryMovies={barMovies}
                  librarySeries={barSeries}
                  onQuickAdd={quickAddFromSearchBar}
                  quickAddBusyKey={quickAddBusyKey}
                  positionDropdown="absolute"
                  dropdownZIndex={220}
                />
              </div>
            ) : (
              <Link
                href="/"
                className="app-top-bar__search-input app-top-bar__search-faux"
                style={{
                  display: "flex",
                  alignItems: "center",
                  boxSizing: "border-box",
                  background: "#161616",
                  border: "1px solid #333",
                  borderRadius: 10,
                  color: "#666",
                  padding: "12px 14px",
                  fontSize: 16,
                  fontFamily: FF.sans,
                  textDecoration: "none",
                  minHeight: 48,
                }}
              >
                Search on Home…
              </Link>
            )}
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="app-nav-backdrop app-nav-backdrop--open" aria-hidden onClick={() => setMenuOpen(false)} />
          <nav
            ref={menuRef}
            className="app-nav-panel app-nav-panel--open"
            role="menu"
            aria-label="Main navigation"
          >
            <Link href="/" className="app-nav-panel__link" role="menuitem" style={navLinkStyle} onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <Link href="/for-you" className="app-nav-panel__link" role="menuitem" style={navLinkStyle} onClick={() => setMenuOpen(false)}>
              For You
            </Link>
            <Link href="/watchlist" className="app-nav-panel__link" role="menuitem" style={navLinkStyle} onClick={() => setMenuOpen(false)}>
              My List
            </Link>
            <button
              type="button"
              role="menuitem"
              className="app-nav-panel__link app-nav-panel__btn"
              disabled={exportBusy}
              style={{ ...navLinkStyle, border: "none", width: "100%", textAlign: "left", cursor: exportBusy ? "wait" : "pointer", background: "transparent" }}
              onClick={runExport}
            >
              {exportBusy ? "Exporting…" : "Export"}
            </button>

            <div className="app-nav-panel__divider" />

            <button
              type="button"
              className="app-nav-panel__sub"
              onClick={() => {
                setMenuOpen(false);
                setWtwOpen(true);
              }}
            >
              What to watch?
            </button>
            <Link href="/analytics" className="app-nav-panel__sub" onClick={() => setMenuOpen(false)}>
              Analytics
            </Link>
            <Link href="/profile" className="app-nav-panel__sub" onClick={() => setMenuOpen(false)}>
              Profile
            </Link>

            <div className="app-nav-panel__footer">
              {session?.user?.email && (
                <span className="app-nav-panel__email" title={session.user.email}>
                  {session.user.email}
                </span>
              )}
              <button
                type="button"
                className="app-nav-panel__signout"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign out
              </button>
            </div>
          </nav>
        </>
      )}

      <main className="app-main-pad">{children}</main>

      {flash && (
        <div
          className="tracker-toast tracker-toast-animate"
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 10,
            color: "#c8c4ba",
            padding: "12px 22px",
            fontSize: 13,
            fontFamily: FF.sans,
            letterSpacing: "0.02em",
            zIndex: 300,
            pointerEvents: "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
          }}
        >
          ✓ {flash}
        </div>
      )}
    </>
  );
}

export default function AppShell({ children }) {
  return (
    <AppUiProvider>
      <AppShellInner>{children}</AppShellInner>
    </AppUiProvider>
  );
}
