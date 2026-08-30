import { CHART_POINTS_FAQ_URL } from "../stats/help/helpContent";

export const YOUTUBE_CHANNEL_URL =
  "https://www.youtube.com/@EurovisionSongContest";

export const EXPLAINER_TITLE = "About these stats";

/** Shared body for banner and sheet (approved task copy). */
export function ExplainerBody() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-text">
      <p>
        This site tracks the official Eurovision Song Contest{" "}
        <a
          href={YOUTUBE_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          YouTube channel’s
        </a>{" "}
        monthly <strong>Top 20: Most Watched</strong> charts.
      </p>
      <p>
        <strong>Videos</strong> rank the performance of individual clips in the
        chart. <strong>Songs</strong> aggregate that data per song.{" "}
        <strong>Chart points</strong> measure how high and how often a video or
        song ranks in the chart.
      </p>
      <p>
        <strong>Episodes</strong> shows each month’s Top 20 as a row.{" "}
        <strong>Insights</strong> are hand-picked highlights from the data.
      </p>
    </div>
  );
}

export function ExplainerFaqLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={CHART_POINTS_FAQ_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-accent hover:underline ${className}`.trim()}
    >
      Chart points FAQ
    </a>
  );
}
