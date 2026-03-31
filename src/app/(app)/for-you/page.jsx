import RecommendationsRow from "@/components/RecommendationsRow";

export const metadata = {
  title: "For You · Rotten Potatoes",
  description: "Recommendations based on your ratings",
};

export default function ForYouPage() {
  return (
    <div
      style={{
        minHeight: "70vh",
        maxWidth: 1240,
        margin: "0 auto",
        padding: "8px clamp(16px, 4vw, 40px) max(88px, env(safe-area-inset-bottom))",
      }}
    >
      <h2
        style={{
          margin: "0 0 4px",
          fontSize: "clamp(22px, 5vw, 28px)",
          fontWeight: 600,
          color: "#f5f0e8",
          fontFamily: "var(--font-sans), system-ui, sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        For you
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6a6a6a", fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
        Picks from your ratings refresh when you change a score or use Refresh picks.
      </p>
      <RecommendationsRow variant="page" />
    </div>
  );
}
