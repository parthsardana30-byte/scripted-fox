export function DashboardLoading() {
  return (
    <div className="dashboard-page dashboard-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="dashboard-loading__message">
        <span className="dashboard-loading__signal" aria-hidden="true" />
        <div>
          <p>Opening your workspace</p>
          <span>Getting this page ready.</span>
        </div>
      </div>
    </div>
  );
}
