// Punto de entrada: estilos, tema y montaje de la app.
import { render } from 'preact';
import './styles/app.css';
import { App } from './app/App.jsx';
import { initTheme } from './state/theme.mjs';

// El tema va antes de pintar, para que el modo oscuro no parpadee en claro.
initTheme();
render(<App />, document.getElementById('app'));
