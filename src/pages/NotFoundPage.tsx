import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <p className="text-6xl">404</p>
      <p className="mt-2 text-slate-500 dark:text-slate-400">
        This page does not exist.
      </p>
      <Link to="/overview" className="btn-primary mt-6">
        Back to overview
      </Link>
    </div>
  );
}
