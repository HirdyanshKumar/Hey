import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-boundary-card">
                        <div className="error-boundary-icon">
                            <AlertTriangle size={40} />
                        </div>
                        <h2 className="error-boundary-title">Something went wrong</h2>
                        <p className="error-boundary-message">
                            An unexpected error occurred. Please try refreshing the page.
                        </p>
                        {this.state.error && (
                            <p className="error-boundary-detail">
                                {this.state.error.message}
                            </p>
                        )}
                        <div className="error-boundary-actions">
                            <button
                                className="error-boundary-btn error-boundary-btn-primary"
                                onClick={() => window.location.reload()}
                            >
                                <RefreshCw size={16} />
                                Refresh Page
                            </button>
                            <button
                                className="error-boundary-btn error-boundary-btn-secondary"
                                onClick={this.handleRetry}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
