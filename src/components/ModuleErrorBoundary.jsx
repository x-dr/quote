import { Component } from 'react'

class ModuleErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div className="module-error" role="alert">
        <strong>当前模块暂时无法显示</strong>
        <span>{this.state.error.message || '模块加载失败，请稍后重试。'}</span>
        <div className="module-error-actions">
          <button type="button" onClick={() => this.setState({ error: null })}>
            重试
          </button>
          <button type="button" onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      </div>
    )
  }
}

export default ModuleErrorBoundary
