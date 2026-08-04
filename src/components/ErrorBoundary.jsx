import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          background: 'var(--bg)',
          color: 'var(--text)',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h3 style={{ margin: 0 }}>界面出现异常</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', wordBreak: 'break-word', margin: 0 }}>
            {String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error || '未知错误')}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: 8,
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
