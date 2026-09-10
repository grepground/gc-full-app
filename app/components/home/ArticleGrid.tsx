"use client";

interface ArticleMock {
  id: number;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  readTime: string;
}

// Static mock database array adhering to our domain interests (Chess & Science)
const MOCK_ARTICLES: ArticleMock[] = [
  {
    id: 1,
    title: "Deep Positional Mechanics in the Czech Defense",
    category: "Opening Theory",
    excerpt:
      "An elite technical breakdown of the Czech Defense structural resilience against aggressive kingside pawn storms.",
    date: "JUL 06, 2026",
    readTime: "5 MIN READ",
  },
  {
    id: 2,
    title: "The Neurology of Chess Performance under Time Pressure",
    category: "Cognitive Science",
    excerpt:
      "Examining cortisol levels and pattern recognition neural pathways during deep calculation in critical blitz tiebreaks.",
    date: "JUL 02, 2026",
    readTime: "8 MIN READ",
  },
  {
    id: 3,
    title: "Optimizing Stockfish 17 Evaluation Trees on Local Linux Hardware",
    category: "Systems & Tech",
    excerpt:
      "How to correctly configure multi-threading, hash tables, and ryzenadj profiles on AMD Zen3 processors for deep game analysis.",
    date: "JUN 28, 2026",
    readTime: "6 MIN READ",
  },
];

export default function ArticleGrid() {
  return (
    <div className="space-y-8 text-chess-text">
      {/* Section Sub-Header Context */}
      <div className="flex justify-between items-center border-b-2 border-chess-text pb-4">
        <h2 className="text-xl font-black uppercase tracking-tight">
          Latest Analytical Columns
        </h2>
        <span className="text-xs font-black uppercase tracking-widest bg-chess-text text-chess-surface px-2 py-1 rounded-md">
          3 Articles Total
        </span>
      </div>

      {/* Responsive Structural Cards Grid Layout */}
      <div className="grid md:grid-cols-3 gap-6">
        {MOCK_ARTICLES.map((article) => (
          <article
            key={article.id}
            className="border-2 border-chess-text bg-chess-surface p-6 rounded-2xl flex flex-col justify-between space-y-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-chess-primary active:scale-[0.99] animate-[fade-up_0.5s_ease-out]"
          >
            {/* Top Identity Meta Layer */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-chess-primary">
                  {article.category}
                </span>
                <span className="text-[10px] font-bold text-chess-text opacity-50 tracking-wider">
                  {article.readTime}
                </span>
              </div>

              {/* Title Section Block */}
              <h3 className="text-lg font-black uppercase tracking-tight leading-snug hover:text-chess-primary transition-colors cursor-pointer">
                {article.title}
              </h3>

              {/* Excerpt Summary Context Layer */}
              <p className="text-sm font-bold text-chess-text opacity-70 normal-case tracking-normal line-clamp-3">
                {article.excerpt}
              </p>
            </div>

            {/* Bottom Interaction Action Block */}
            <div className="pt-2 border-t-2 border-chess-text border-opacity-10 flex flex-col space-y-3">
              <div className="text-[10px] font-black tracking-wider opacity-40">
                PUBLISHED: {article.date}
              </div>

              <a
                href={`/news/${article.id}`}
                className="w-full border-2 border-chess-text text-center font-black py-2.5 rounded-xl hover:bg-chess-text hover:text-chess-surface hover:border-chess-text bg-chess-bg text-chess-text transition-all duration-200 active:scale-[0.98] uppercase tracking-wider text-xs cursor-pointer block"
              >
                Analyze Line →
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
