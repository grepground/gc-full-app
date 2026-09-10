export default function ArticleDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4 animate-pulse text-chess-text">
      {/* Back Button Skeleton Container */}
      <div className="w-44 h-9 border-2 border-chess-text bg-chess-surface rounded-xl opacity-30"></div>

      {/* Header Info Skeleton Grid */}
      <header className="space-y-4 border-b-2 border-chess-text pb-6 border-opacity-10">
        <div className="flex items-center gap-4">
          <div className="w-24 h-4 bg-chess-text opacity-20 rounded-md"></div>
          <div className="w-2 h-2 bg-chess-text opacity-10 rounded-full"></div>
          <div className="w-32 h-4 bg-chess-text opacity-20 rounded-md"></div>
        </div>

        {/* Title Lines Skeleton */}
        <div className="space-y-2">
          <div className="w-full h-8 bg-chess-text opacity-30 rounded-xl"></div>
          <div className="w-4/5 h-8 bg-chess-text opacity-30 rounded-xl"></div>
        </div>

        {/* Excerpt Summary Block Skeleton */}
        <div className="h-12 border-l-4 border-chess-primary border-opacity-30 pl-4 py-1 space-y-2">
          <div className="w-full h-3.5 bg-chess-text opacity-20 rounded-md"></div>
          <div className="w-5/6 h-3.5 bg-chess-text opacity-20 rounded-md"></div>
        </div>
      </header>

      {/* Hero Cover Image Skeleton Border */}
      <div className="w-full h-64 md:h-96 border-2 border-chess-text rounded-2xl bg-chess-bg opacity-30"></div>

      {/* Main Content Article Body Text Skeleton Area */}
      <main className="border-2 border-chess-text bg-chess-surface p-6 md:p-8 rounded-2xl opacity-40 space-y-4">
        <div className="w-full h-4 bg-chess-text opacity-20 rounded-md"></div>
        <div className="w-full h-4 bg-chess-text opacity-20 rounded-md"></div>
        <div className="w-11/12 h-4 bg-chess-text opacity-20 rounded-md"></div>
        <div className="w-full h-4 bg-chess-text opacity-20 rounded-md pt-2"></div>

        {/* Inner Heading Placeholder */}
        <div className="w-1/3 h-6 bg-chess-text opacity-20 rounded-lg my-4"></div>

        <div className="w-full h-4 bg-chess-text opacity-20 rounded-md"></div>
        <div className="w-full h-4 bg-chess-text opacity-20 rounded-md"></div>
        <div className="w-3/4 h-4 bg-chess-text opacity-20 rounded-md"></div>
      </main>
    </div>
  );
}
