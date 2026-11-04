import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Plans from './pages/Plans.jsx';
import Subscribe from './pages/Subscribe.jsx';
import Payment from './pages/Payment.jsx';
import Confirmation from './pages/Confirmation.jsx';
import History from './pages/History.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import AdminPlans from './pages/admin/AdminPlans.jsx';
import AdminSubscriptions from './pages/admin/AdminSubscriptions.jsx';
import AdminSubscriptionDetail from './pages/admin/AdminSubscriptionDetail.jsx';
import AdminMessages from './pages/admin/AdminMessages.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="forfaits" element={<Plans />} />
        <Route path="souscrire/:planId" element={<Subscribe />} />
        <Route path="paiement/:subscriptionId" element={<Payment />} />
        <Route path="confirmation/:reference" element={<Confirmation />} />
        <Route path="historique" element={<History />} />
        <Route path="a-propos" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin/connexion" element={<AdminLogin />} />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="forfaits" element={<AdminPlans />} />
        <Route path="souscriptions" element={<AdminSubscriptions />} />
        <Route path="souscriptions/:id" element={<AdminSubscriptionDetail />} />
        <Route path="messages" element={<AdminMessages />} />
      </Route>
    </Routes>
  );
}
