export const Loading = () => <p className="state" role="status">Loading…</p>
export const SkeletonGrid = ({ n = 12 }) => <div className="grid" aria-busy="true">{Array.from({ length: n }, (_, i) => <div key={i} className="sk" />)}</div>
export const ErrorState = ({ error }) => <div className="state" role="alert"><p>Couldn't load movies. {error?.message}</p><p>Check that TMDB_READ_TOKEN is set in .env, then restart the dev server.</p></div>
export const Empty = ({ children }) => <p className="state">{children}</p>
