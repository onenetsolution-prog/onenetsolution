export default function PlaceholderPage({ title }) {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Coming soon — being built next!</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <p>🚧 This page is under construction</p>
          </div>
        </div>
      </div>
    </div>
  );
}