import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: '#fff5f7', padding: 20
        }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: '#fee2e2', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <AlertTriangle size={32} color="#dc2626" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', marginBottom: 8 }}>
              Oops! Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
              The application encountered an error. Please refresh the page or contact support.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                background: '#f3f0ff', borderRadius: 12, padding: 12,
                fontSize: 12, color: '#5b21b6', textAlign: 'left',
                marginBottom: 20, border: '1px solid #ddd6fe'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>
                  Error Details
                </summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 11, opacity: 0.8 }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px', background: '#4f46e5', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', width: '100%'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
