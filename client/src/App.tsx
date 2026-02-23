
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { PostProject } from './pages/PostProject';
import { Navbar } from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { ProfilePage } from './pages/ProfilePage';
import { Inbox } from './pages/Inbox';
import { Chat } from './pages/Chat';
import { Help } from './pages/Help';
import { EscrowDashboard } from './pages/EscrowDashboard';
import { MyProjects } from './pages/MyProjects';
import { About } from './pages/About';
import { MembershipPage } from './pages/MembershipPage';
import { ReferralPage } from './pages/ReferralPage';
import { TermsPage } from './pages/TermsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-950">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/post-project" element={<PostProject />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/messages/:userId" element={<Chat />} />
            <Route path="/help" element={<Help />} />
            <Route path="/escrow" element={<EscrowDashboard />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/about" element={<About />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/referral" element={<ReferralPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
