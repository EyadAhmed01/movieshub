import { useState, useRef, useEffect } from "react";

const INIT_MOVIES = [
  { title: "Jaws", year: 1975 },
  { title: "Scent of a Woman", year: 1992 },
  { title: "The Shawshank Redemption", year: 1994 },
  { title: "Men in Black", year: 1997 },
  { title: "Rounders", year: 1998 },
  { title: "Fight Club", year: 1999 },
  { title: "Harry Potter and the Sorcerer's Stone", year: 2001 },
  { title: "Catch Me If You Can", year: 2002 },
  { title: "8 Mile", year: 2002 },
  { title: "Spider-Man", year: 2002 },
  { title: "Men in Black II", year: 2002 },
  { title: "Harry Potter and the Chamber of Secrets", year: 2002 },
  { title: "The Day After Tomorrow", year: 2004 },
  { title: "The Terminal", year: 2004 },
  { title: "Harry Potter and the Prisoner of Azkaban", year: 2004 },
  { title: "The SpongeBob SquarePants Movie", year: 2004 },
  { title: "Brick", year: 2005 },
  { title: "Harry Potter and the Goblet of Fire", year: 2005 },
  { title: "Click", year: 2006 },
  { title: "Harry Potter and the Order of the Phoenix", year: 2007 },
  { title: "Harry Potter and the Half-Blood Prince", year: 2009 },
  { title: "Harry Potter and the Deathly Hallows: Part 1", year: 2010 },
  { title: "Harry Potter and the Deathly Hallows: Part 2", year: 2011 },
  { title: "Moneyball", year: 2011 },
  { title: "The Dictator", year: 2012 },
  { title: "The Conjuring", year: 2013 },
  { title: "Now You See Me", year: 2013 },
  { title: "The Grand Budapest Hotel", year: 2014 },
  { title: "Ride Along", year: 2014 },
  { title: "The Revenant", year: 2015 },
  { title: "Pixels", year: 2015 },
  { title: "Ride Along 2", year: 2016 },
  { title: "The Conjuring 2", year: 2016 },
  { title: "The Kissing Booth", year: 2018 },
  { title: "Fifty Shades Freed", year: 2018 },
  { title: "The Big Fake", year: 2018 },
  { title: "Once Upon a Time in Hollywood", year: 2019 },
  { title: "The Platform", year: 2019 },
  { title: "El Camino: A Breaking Bad Movie", year: 2019 },
  { title: "Holiday Rush", year: 2019 },
  { title: "365 Days", year: 2020 },
  { title: "Project Power", year: 2020 },
  { title: "Extraction", year: 2020 },
  { title: "The SpongeBob Movie: Sponge on the Run", year: 2020 },
  { title: "The Princess Switch 3: Romancing the Star", year: 2021 },
  { title: "Babylon", year: 2022 },
  { title: "Hustle", year: 2022 },
  { title: "The Adam Project", year: 2022 },
  { title: "Glass Onion: A Knives Out Mystery", year: 2022 },
  { title: "Barbarian", year: 2022 },
  { title: "M3GAN", year: 2022 },
  { title: "Smile", year: 2022 },
  { title: "Me Time", year: 2022 },
  { title: "The Weekend Away", year: 2022 },
  { title: "Through My Window", year: 2022 },
  { title: "Extraction 2", year: 2023 },
  { title: "Meg 2: The Trench", year: 2023 },
  { title: "Nowhere", year: 2023 },
  { title: "Leave the World Behind", year: 2023 },
  { title: "Leo", year: 2023 },
  { title: "Family Switch", year: 2023 },
  { title: "Best. Christmas. Ever!", year: 2023 },
  { title: "The Rip", year: 2023 },
  { title: "Society of the Snow", year: 2023 },
  { title: "The Deliverance", year: 2024 },
  { title: "Under Paris", year: 2024 },
  { title: "Carry-On", year: 2024 },
  { title: "The Union", year: 2024 },
  { title: "Rebel Ridge", year: 2024 },
  { title: "No Way Up", year: 2024 },
  { title: "iHostage", year: 2024 },
  { title: "Don't Move", year: 2024 },
  { title: "Time Cut", year: 2024 },
  { title: "The Platform 2", year: 2024 },
  { title: "Jake Paul vs. Mike Tyson", year: 2024 },
  { title: "Uglies", year: 2024 },
  { title: "IT'S WHAT'S INSIDE", year: 2024 },
  { title: "Spaceman", year: 2024 },
  { title: "Lift", year: 2024 },
  { title: "Meet Me Next Christmas", year: 2024 },
  { title: "Orion and the Dark", year: 2024 },
  { title: "Frankenstein", year: 2024 },
  { title: "A HOUSE OF DYNAMITE", year: 2024 },
  { title: "The Great Flood", year: 2024 },
  { title: "Wake Up Dead Man: A Knives Out Mystery", year: 2025 },
  { title: "KPop Demon Hunters", year: 2025 },
  { title: "Back in Action", year: 2025 },
  { title: "On the Go", year: 2025 },
];

const INIT_SERIES = [
  { title: "SpongeBob SquarePants", years: "1999–present", eps: null },
  { title: "Prison Break", years: "2005–2017", eps: null },
  { title: "Ben 10", years: "2005–2008", eps: null },
  { title: "Dexter", years: "2006–2013", eps: null },
  { title: "Shaun the Sheep", years: "2007–present", eps: null },
  { title: "Breaking Bad", years: "2008–2013", eps: null },
  { title: "The Vampire Diaries", years: "2009–2017", eps: null },
  { title: "Teen Wolf", years: "2011–2017", eps: 100 },
  { title: "Black Mirror", years: "2011–present", eps: null },
  { title: "Suits", years: "2011–2019", eps: null },
  { title: "Oscar's Oasis", years: "2011–present", eps: null },
  { title: "Medcezir", years: "2013–2015", eps: 100 },
  { title: "Peaky Blinders", years: "2013–2022", eps: 30 },
  { title: "Rick and Morty", years: "2013–present", eps: null },
  { title: "BoJack Horseman", years: "2014–2020", eps: null },
  { title: "Better Call Saul", years: "2015–2022", eps: null },
  { title: "Narcos", years: "2015–2017", eps: null },
  { title: "Stranger Things", years: "2016–2025", eps: 25 },
  { title: "Lucifer", years: "2016–2021", eps: 83 },
  { title: "Riverdale", years: "2017–2023", eps: 86 },
  { title: "Money Heist (La Casa De Papel)", years: "2017–2021", eps: 31 },
  { title: "The End of the F***ing World", years: "2017–2019", eps: 12 },
  { title: "Elite", years: "2018–2024", eps: 32 },
  { title: "You", years: "2018–2024", eps: 20 },
  { title: "Narcos: Mexico", years: "2018–2021", eps: null },
  { title: "Bodyguard", years: "2018", eps: 6 },
  { title: "Legacies", years: "2018–2022", eps: 48 },
  { title: "How to Sell Drugs Online (Fast)", years: "2019–present", eps: 6 },
  { title: "Jinn", years: "2019", eps: 6 },
  { title: "Love 101", years: "2020–2021", eps: 10 },
  { title: "Outer Banks", years: "2020–present", eps: null },
  { title: "Bridgerton", years: "2020–present", eps: null },
  { title: "Dracula", years: "2020", eps: 3 },
  { title: "AlRawabi School for Girls", years: "2021–2024", eps: null },
  { title: "Squid Game", years: "2021–2025", eps: null },
  { title: "From", years: "2022–present", eps: null },
  { title: "Wednesday", years: "2022–2025", eps: null },
  { title: "1899", years: "2022", eps: null },
  { title: "Inventing Anna", years: "2022", eps: null },
  { title: "Wrong Side of the Tracks", years: "2022–present", eps: null },
  { title: "The Lincoln Lawyer", years: "2022–present", eps: null },
  { title: "Squid Game: The Challenge", years: "2023", eps: null },
  { title: "3 Body Problem", years: "2024", eps: null },
  { title: "Death by Lightning", years: "2024", eps: null },
  { title: "Radioactive Emergency", years: "2024", eps: null },
  { title: "La Palma", years: "2024", eps: null },
  { title: "Adolescence", years: "2025", eps: null },
  { title: "Zero Day", years: "2025", eps: null },
  { title: "Heweliusz", years: "2025", eps: null },
  { title: "HIS & HERS", years: "2025", eps: null },
  { title: "Bad Thoughts", years: "2025", eps: null },
  { title: "Something Very Bad Is Going to Happen", years: "2025", eps: null },
];

const YEARS = Array.from({ length: 2025 - 1950 + 1 }, (_, i) => 2025 - i);

// ── STORAGE HELPERS ──────────────────────────────────────────────
async function saveToStorage(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Storage save failed:", e);
  }
}

async function loadFromStorage(key) {
  try {
    const result = await window.storage.get(key);
    return result ? JSON.parse(result.value) : null;
  } catch (e) {
    return null;
  }
}

// ── STAR RATING ──────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onClick={() => onChange(value === star ? 0 : star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          title={`${star}/5`}
          style={{
            cursor: "pointer", fontSize: 15,
            color: star <= (hovered || value) ? "#e50914" : "#222",
            transition: "color 0.1s", userSelect: "none", lineHeight: 1,
          }}
        >★</span>
      ))}
    </div>
  );
}

// ── STYLES ───────────────────────────────────────────────────────
const inputStyle = {
  background: "#0f0f0f", border: "1px solid #252525", color: "#d0ccc4",
  padding: "9px 12px", fontSize: 12, fontFamily: "monospace", outline: "none",
  letterSpacing: "0.04em", width: "100%", boxSizing: "border-box",
};

const selectStyle = {
  ...inputStyle, cursor: "pointer", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23555'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 28,
};

// ── ADD FORM ─────────────────────────────────────────────────────
function AddForm({ type, onAdd }) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(2024);
  const [yearEnd, setYearEnd] = useState("present");
  const [eps, setEps] = useState("");
  const [error, setError] = useState("");
  const titleRef = useRef(null);

  const handleAdd = () => {
    if (!title.trim()) { setError("Title is required."); return; }
    if (type === "movie") {
      onAdd({ title: title.trim(), year: Number(year) });
    } else {
      const yearsStr = yearEnd === "present"
        ? `${year}–present`
        : yearEnd === year.toString() ? `${year}` : `${year}–${yearEnd}`;
      onAdd({ title: title.trim(), years: yearsStr, eps: eps ? Number(eps) : null });
    }
    setTitle(""); setYear(2024); setYearEnd("present"); setEps(""); setError("");
    titleRef.current?.focus();
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", padding: "18px 20px", marginBottom: 20 }}>
      <p style={{ fontSize: 10, color: "#e50914", letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "monospace", margin: "0 0 14px" }}>
        + Add {type === "movie" ? "Movie" : "Series"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          ref={titleRef}
          placeholder={`${type === "movie" ? "Movie" : "Series"} title...`}
          value={title}
          onChange={e => { setTitle(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          style={inputStyle}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", fontFamily: "monospace", margin: "0 0 4px" }}>
              {type === "movie" ? "RELEASE YEAR" : "START YEAR"}
            </p>
            <select value={year} onChange={e => setYear(e.target.value)} style={selectStyle}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {type === "series" && (
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", fontFamily: "monospace", margin: "0 0 4px" }}>END YEAR</p>
              <select value={yearEnd} onChange={e => setYearEnd(e.target.value)} style={selectStyle}>
                <option value="present">present</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          {type === "series" && (
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", fontFamily: "monospace", margin: "0 0 4px" }}>EPISODES (OPT.)</p>
              <input
                type="number" placeholder="—" value={eps}
                onChange={e => setEps(e.target.value)}
                style={inputStyle} min={1}
              />
            </div>
          )}
        </div>
        {error && <p style={{ fontSize: 11, color: "#e50914", fontFamily: "monospace", margin: 0 }}>{error}</p>}
        <button
          onClick={handleAdd}
          style={{
            background: "#e50914", border: "none", color: "#fff",
            padding: "9px 20px", fontSize: 11, letterSpacing: "0.15em",
            textTransform: "uppercase", cursor: "pointer", fontFamily: "monospace",
            alignSelf: "flex-end", transition: "background 0.15s",
          }}
          onMouseEnter={e => e.target.style.background = "#c0070f"}
          onMouseLeave={e => e.target.style.background = "#e50914"}
        >Add</button>
      </div>
    </div>
  );
}

const colLabel = (label, right) => (
  <span style={{ fontSize: 9, color: "#333", letterSpacing: "0.2em", fontFamily: "monospace", textAlign: right ? "right" : "left" }}>
    {label}
  </span>
);

// ── MAIN APP ─────────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [movies, setMovies] = useState(INIT_MOVIES);
  const [series, setSeries] = useState(INIT_SERIES);
  const [movieRatings, setMovieRatings] = useState({});
  const [seriesRatings, setSeriesRatings] = useState({});
  const [showMovieForm, setShowMovieForm] = useState(false);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [flash, setFlash] = useState(null);

  // ── LOAD from storage on mount ──
  useEffect(() => {
    async function load() {
      const [savedMovies, savedSeries, savedMR, savedSR] = await Promise.all([
        loadFromStorage("nfx-movies"),
        loadFromStorage("nfx-series"),
        loadFromStorage("nfx-movie-ratings"),
        loadFromStorage("nfx-series-ratings"),
      ]);
      if (savedMovies) setMovies(savedMovies);
      if (savedSeries) setSeries(savedSeries);
      if (savedMR) setMovieRatings(savedMR);
      if (savedSR) setSeriesRatings(savedSR);
      setLoading(false);
    }
    load();
  }, []);

  // ── SAVE movies whenever they change (skip on initial load) ──
  const mountedMovies = useRef(false);
  useEffect(() => {
    if (!mountedMovies.current) { mountedMovies.current = true; return; }
    saveToStorage("nfx-movies", movies);
  }, [movies]);

  const mountedSeries = useRef(false);
  useEffect(() => {
    if (!mountedSeries.current) { mountedSeries.current = true; return; }
    saveToStorage("nfx-series", series);
  }, [series]);

  const mountedMR = useRef(false);
  useEffect(() => {
    if (!mountedMR.current) { mountedMR.current = true; return; }
    saveToStorage("nfx-movie-ratings", movieRatings);
  }, [movieRatings]);

  const mountedSR = useRef(false);
  useEffect(() => {
    if (!mountedSR.current) { mountedSR.current = true; return; }
    saveToStorage("nfx-series-ratings", seriesRatings);
  }, [seriesRatings]);

  // ── DERIVED ──
  const sortedMovies = [...movies].sort((a, b) => a.year - b.year);
  const sortedSeries = [...series].sort((a, b) => parseInt(a.years) - parseInt(b.years));
  const filteredMovies = sortedMovies.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
  const filteredSeries = sortedSeries.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
  const ratedCount = Object.values(movieRatings).filter(Boolean).length + Object.values(seriesRatings).filter(Boolean).length;

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(null), 2500); };

  const addMovie = (item) => {
    setMovies(prev => [...prev, item]);
    showFlash(`"${item.title}" added to Movies`);
  };

  const addSeries = (item) => {
    setSeries(prev => [...prev, item]);
    showFlash(`"${item.title}" added to Series`);
  };

  const removeMovie = (title) => {
    setMovies(prev => prev.filter(m => m.title !== title));
    setMovieRatings(r => { const n = { ...r }; delete n[title]; return n; });
  };

  const removeSeries = (title) => {
    setSeries(prev => prev.filter(s => s.title !== title));
    setSeriesRatings(r => { const n = { ...r }; delete n[title]; return n; });
  };

  const setMovieRating = (title, v) => setMovieRatings(r => ({ ...r, [title]: v }));
  const setSeriesRating = (title, v) => setSeriesRatings(r => ({ ...r, [title]: v }));

  // ── LOADING SCREEN ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#333", fontFamily: "monospace", fontSize: 12, letterSpacing: "0.2em" }}>LOADING…</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'Georgia', serif", color: "#e8e0d0" }}>

      {/* ── HEADER ── */}
      <div style={{ borderBottom: "1px solid #181818", padding: "32px 40px 24px", background: "#0a0a0a", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.3em", color: "#e50914", textTransform: "uppercase", marginBottom: 6, fontFamily: "monospace" }}>
            Netflix Viewing History
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <h1 style={{ fontSize: "clamp(20px, 3vw, 38px)", fontWeight: 400, letterSpacing: "-0.02em", margin: 0, lineHeight: 1, color: "#f5f0e8" }}>
              All Titles · Sorted by Year
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, color: "#2a2a2a", fontFamily: "monospace" }}>💾 auto-saved</span>
              <input
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: "#111", border: "1px solid #222", color: "#e8e0d0", padding: "8px 12px", fontSize: 12, fontFamily: "monospace", outline: "none", width: 160, letterSpacing: "0.05em" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 18, borderBottom: "1px solid #181818" }}>
            {[
              { key: "all", label: "All" },
              { key: "movies", label: `Movies (${movies.length})` },
              { key: "series", label: `Series (${series.length})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                background: "none", border: "none",
                borderBottom: filter === tab.key ? "2px solid #e50914" : "2px solid transparent",
                color: filter === tab.key ? "#f5f0e8" : "#444",
                padding: "6px 16px", fontSize: 10, letterSpacing: "0.18em",
                textTransform: "uppercase", cursor: "pointer", fontFamily: "monospace",
                transition: "color 0.15s", marginBottom: -1,
              }}>{tab.label}</button>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#333", fontFamily: "monospace", paddingBottom: 7 }}>
              {ratedCount} / {movies.length + series.length} rated
            </span>
          </div>
        </div>
      </div>

      {/* ── TOAST ── */}
      {flash && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#c8c4ba",
          padding: "10px 20px", fontSize: 12, fontFamily: "monospace",
          letterSpacing: "0.05em", zIndex: 100, pointerEvents: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        }}>✓ {flash}</div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: filter === "all" ? "1fr 1fr" : "1fr", gap: 0 }}>

          {/* MOVIES */}
          {(filter === "all" || filter === "movies") && (
            <div style={{ borderRight: filter === "all" ? "1px solid #181818" : "none", paddingRight: filter === "all" ? 32 : 0 }}>
              <div style={{ padding: "20px 0 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.3em", color: "#e50914", textTransform: "uppercase", fontFamily: "monospace" }}>◆ Movies</span>
                <span style={{ fontSize: 10, color: "#3a3a3a", fontFamily: "monospace" }}>{filteredMovies.length} titles</span>
                <button
                  onClick={() => { setShowMovieForm(v => !v); setShowSeriesForm(false); }}
                  style={{
                    marginLeft: "auto", background: showMovieForm ? "#1a1a1a" : "none",
                    border: "1px solid #282828", color: showMovieForm ? "#e50914" : "#555",
                    padding: "4px 10px", fontSize: 10, fontFamily: "monospace",
                    letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.15s",
                  }}
                >{showMovieForm ? "✕ Close" : "+ Add Movie"}</button>
              </div>

              {showMovieForm && <AddForm type="movie" onAdd={(item) => { addMovie(item); setShowMovieForm(false); }} />}

              <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 50px 92px 28px", borderBottom: "1px solid #181818", paddingBottom: 6, marginBottom: 2 }}>
                {colLabel("#")} {colLabel("TITLE")} {colLabel("YEAR", true)} {colLabel("RATING", true)} <span />
              </div>
              {filteredMovies.map((m, i) => (
                <div key={m.title} style={{
                  display: "grid", gridTemplateColumns: "36px 1fr 50px 92px 28px",
                  padding: "7px 0", borderBottom: "1px solid #0f0f0f", alignItems: "center",
                }}>
                  <span style={{ fontSize: 10, color: "#282828", fontFamily: "monospace" }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontSize: 13, color: "#c8c4ba", lineHeight: 1.3, paddingRight: 8 }}>{m.title}</span>
                  <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace", textAlign: "right" }}>{m.year}</span>
                  <StarRating value={movieRatings[m.title] || 0} onChange={v => setMovieRating(m.title, v)} />
                  <button
                    onClick={() => removeMovie(m.title)} title="Remove"
                    style={{ background: "none", border: "none", color: "#2a2a2a", cursor: "pointer", fontSize: 14, padding: "0 0 0 4px", lineHeight: 1, transition: "color 0.1s" }}
                    onMouseEnter={e => e.target.style.color = "#c0070f"}
                    onMouseLeave={e => e.target.style.color = "#2a2a2a"}
                  >×</button>
                </div>
              ))}
              {filteredMovies.length === 0 && <p style={{ color: "#333", fontSize: 12, fontFamily: "monospace", padding: "20px 0" }}>No results.</p>}
            </div>
          )}

          {/* SERIES */}
          {(filter === "all" || filter === "series") && (
            <div style={{ paddingLeft: filter === "all" ? 32 : 0 }}>
              <div style={{ padding: "20px 0 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.3em", color: "#e50914", textTransform: "uppercase", fontFamily: "monospace" }}>◆ Series</span>
                <span style={{ fontSize: 10, color: "#3a3a3a", fontFamily: "monospace" }}>{filteredSeries.length} titles</span>
                <button
                  onClick={() => { setShowSeriesForm(v => !v); setShowMovieForm(false); }}
                  style={{
                    marginLeft: "auto", background: showSeriesForm ? "#1a1a1a" : "none",
                    border: "1px solid #282828", color: showSeriesForm ? "#e50914" : "#555",
                    padding: "4px 10px", fontSize: 10, fontFamily: "monospace",
                    letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.15s",
                  }}
                >{showSeriesForm ? "✕ Close" : "+ Add Series"}</button>
              </div>

              {showSeriesForm && <AddForm type="series" onAdd={(item) => { addSeries(item); setShowSeriesForm(false); }} />}

              <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 62px 36px 92px 28px", borderBottom: "1px solid #181818", paddingBottom: 6, marginBottom: 2 }}>
                {colLabel("#")} {colLabel("TITLE")} {colLabel("YEARS", true)} {colLabel("EP", true)} {colLabel("RATING", true)} <span />
              </div>
              {filteredSeries.map((s, i) => (
                <div key={s.title} style={{
                  display: "grid", gridTemplateColumns: "36px 1fr 62px 36px 92px 28px",
                  padding: "7px 0", borderBottom: "1px solid #0f0f0f", alignItems: "center",
                }}>
                  <span style={{ fontSize: 10, color: "#282828", fontFamily: "monospace" }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontSize: 13, color: "#c8c4ba", lineHeight: 1.3, paddingRight: 8 }}>{s.title}</span>
                  <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace", textAlign: "right" }}>{s.years}</span>
                  <span style={{ fontSize: 11, color: s.eps ? "#777" : "#252525", fontFamily: "monospace", textAlign: "right" }}>{s.eps ?? "—"}</span>
                  <StarRating value={seriesRatings[s.title] || 0} onChange={v => setSeriesRating(s.title, v)} />
                  <button
                    onClick={() => removeSeries(s.title)} title="Remove"
                    style={{ background: "none", border: "none", color: "#2a2a2a", cursor: "pointer", fontSize: 14, padding: "0 0 0 4px", lineHeight: 1, transition: "color 0.1s" }}
                    onMouseEnter={e => e.target.style.color = "#c0070f"}
                    onMouseLeave={e => e.target.style.color = "#2a2a2a"}
                  >×</button>
                </div>
              ))}
              {filteredSeries.length === 0 && <p style={{ color: "#333", fontSize: 12, fontFamily: "monospace", padding: "20px 0" }}>No results.</p>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
