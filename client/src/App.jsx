import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Player from './components/Player';
import ShowDetails from './components/ShowDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/details/:id" element={<ShowDetails />} />
        <Route path="/play/:id" element={<Player />} />
      </Routes>
    </Router>
  );
}

export default App;

