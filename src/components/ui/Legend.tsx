// Legend - Small legend for visual meanings



export function Legend() {
  return (
    <div className="glass-panel-dark px-3 py-2 fade-in">
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Activity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-primary rounded-full" />
          <span>Topic Flow</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-primary/30 rounded-full" />
          <span>Low Activity</span>
        </div>
      </div>
    </div>
  );
}
