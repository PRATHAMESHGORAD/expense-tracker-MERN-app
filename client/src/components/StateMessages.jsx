export function LoadingState({ label = "Loading..." }) {
  return <div className="state-message state-loading">{label}</div>;
}

export function EmptyState({ label = "Nothing here yet." }) {
  return <div className="state-message state-empty">{label}</div>;
}

export function ErrorState({ label = "Something went wrong." }) {
  return <div className="state-message state-error">{label}</div>;
}
