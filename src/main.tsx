import {Component, StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class AppErrorBoundary extends Component<
  {children: React.ReactNode},
  {hasError: boolean; errorMessage: string}
> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = {hasError: false, errorMessage: ''};
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error.message || 'Unexpected application error.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('App render failed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-3">
            <h1 className="text-xl font-black text-white">App failed to load</h1>
            <p className="text-sm text-zinc-400">
              The client hit a runtime error during startup.
            </p>
            <p className="text-sm text-orange-500 break-words">
              {this.state.errorMessage}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
