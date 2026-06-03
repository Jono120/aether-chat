import React from 'react';
import { reportClientError } from '../utils/clientErrorReporting';
import { logClientError } from '../utils/safeConsole';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logClientError('Render error', error);
    void reportClientError(error, info, 'render');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-container" style={{ padding: '2rem', maxWidth: '28rem' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Something went wrong</h1>
          <p style={{ marginBottom: '1rem', opacity: 0.85 }}>
            Aether hit an unexpected error. Reload the page to try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
