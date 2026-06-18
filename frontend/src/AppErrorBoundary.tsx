import { AlertCircle, RotateCcw } from "lucide-react";
import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  private retry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <section className="app-state-card app-state-card--error" role="alert">
          <span className="app-state-icon"><AlertCircle size={38} /></span>
          <h2>Tampilan gagal dimuat</h2>
          <p>Terjadi kendala saat menampilkan halaman. Data mock tidak berubah.</p>
          <button className="button button--primary" type="button" onClick={this.retry}><RotateCcw size={20} />Coba Lagi</button>
        </section>
      );
    }

    return this.props.children;
  }
}
