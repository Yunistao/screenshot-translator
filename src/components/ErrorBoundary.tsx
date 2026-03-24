import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught an error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#333',
        }}>
          <h2 style={{ marginBottom: '12px', color: '#d24747' }}>
            {'\u51fa\u73b0\u9519\u8bef'}
          </h2>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            {'\u5e94\u7528\u7a0b\u5e8f\u9047\u5230\u4e86\u4e00\u4e2a\u610f\u5916\u9519\u8bef\u3002'}
          </p>
          {this.state.error && (
            <details style={{
              marginBottom: '16px',
              padding: '12px',
              background: '#f5f5f5',
              borderRadius: '8px',
              maxWidth: '100%',
              overflow: 'auto',
              fontSize: '12px',
              textAlign: 'left',
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                {'\u9519\u8bef\u8be6\u60c5'}
              </summary>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              cursor: 'pointer',
              border: 'none',
              borderRadius: '8px',
              background: '#2a7ef5',
              color: 'white',
            }}
          >
            {'\u91cd\u8bd5'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;