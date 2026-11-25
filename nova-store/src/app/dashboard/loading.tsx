export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-lg bg-navy-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white" />)}</div>
      <div className="h-64 rounded-2xl bg-white" />
    </div>
  );
}
