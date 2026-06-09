import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import MemberManager from './components/MemberManager'
import PlansManager from './components/PlansManager'
import GameManager from './components/GameManager'
import Settings from './components/Settings'
import PlayerMobile from './components/PlayerMobile'
import LoginScreen from './components/LoginScreen'
import FundManager from './components/FundManager'
import AttendanceManager from './components/AttendanceManager'
import MinutesManager from './components/MinutesManager'
import DocumentManager from './components/DocumentManager'
import { RAW_MEMBERS, INIT_PLANS, INIT_QUESTIONS, getBranchConfig } from './data/constants'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE'

function AppContent({ currentUser, handleAppLogout }) {
  const isAdmin = currentUser?.role === 'admin';
  const isSuperAdmin = currentUser?.username === 'admin-bvtks';
  const isReadOnly = isSuperAdmin;
  const effectiveIsAdmin = isAdmin && !isReadOnly;

  const navigate = useNavigate();
  const location = useLocation();

  const [selectedBranch, setSelectedBranch] = useState('all'); // 'all' | 'cs1' | 'cs2'

  const pathToTab = (path) => {
    const p = path.replace(/^\//, '');
    const validTabs = ['dashboard', 'members', 'funds', 'attendance', 'documents', 'plans', 'games', 'settings', 'minutes'];
    if (validTabs.includes(p)) return p;
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(() => {
    return pathToTab(location.pathname);
  });

  // Sync from URL change (e.g. back/forward browser buttons)
  useEffect(() => {
    const tab = pathToTab(location.pathname);
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'dashboard') {
      navigate('/');
    } else {
      navigate(`/${tabId}`);
    }
  };
  
  // LocalStorage Cache System for Branch CS1
  const [cs1Members, setCs1Members] = useState(() => {
    const saved = localStorage.getItem('db_members_bvtks-cs1');
    return saved ? JSON.parse(saved) : RAW_MEMBERS;
  });
  const [cs1Plans, setCs1Plans] = useState(() => {
    const saved = localStorage.getItem('db_plans_bvtks-cs1');
    return saved ? JSON.parse(saved) : INIT_PLANS;
  });
  const [cs1Questions, setCs1Questions] = useState(() => {
    const saved = localStorage.getItem('db_questions_bvtks-cs1');
    return saved ? JSON.parse(saved) : INIT_QUESTIONS;
  });
  const [cs1Funds, setCs1Funds] = useState(() => {
    const saved = localStorage.getItem('db_funds_bvtks-cs1');
    return saved ? JSON.parse(saved) : [];
  });
  const [cs1Documents, setCs1Documents] = useState(() => {
    const saved = localStorage.getItem('db_documents_bvtks-cs1');
    return saved ? JSON.parse(saved) : [];
  });

  // LocalStorage Cache System for Branch CS2
  const [cs2Members, setCs2Members] = useState(() => {
    const saved = localStorage.getItem('db_members_bvtks-cs2');
    return saved ? JSON.parse(saved) : RAW_MEMBERS;
  });
  const [cs2Plans, setCs2Plans] = useState(() => {
    const saved = localStorage.getItem('db_plans_bvtks-cs2');
    return saved ? JSON.parse(saved) : INIT_PLANS;
  });
  const [cs2Questions, setCs2Questions] = useState(() => {
    const saved = localStorage.getItem('db_questions_bvtks-cs2');
    return saved ? JSON.parse(saved) : INIT_QUESTIONS;
  });
  const [cs2Funds, setCs2Funds] = useState(() => {
    const saved = localStorage.getItem('db_funds_bvtks-cs2');
    return saved ? JSON.parse(saved) : [];
  });
  const [cs2Documents, setCs2Documents] = useState(() => {
    const saved = localStorage.getItem('db_documents_bvtks-cs2');
    return saved ? JSON.parse(saved) : [];
  });

  // LocalStorage Cache System for Normal Users
  const [normalMembers, setNormalMembers] = useState(() => {
    if (isSuperAdmin) return [];
    const saved = localStorage.getItem(`db_members_${currentUser?.username}`);
    return saved ? JSON.parse(saved) : RAW_MEMBERS;
  });
  const [normalPlans, setNormalPlans] = useState(() => {
    if (isSuperAdmin) return [];
    const saved = localStorage.getItem(`db_plans_${currentUser?.username}`);
    return saved ? JSON.parse(saved) : INIT_PLANS;
  });
  const [normalQuestions, setNormalQuestions] = useState(() => {
    if (isSuperAdmin) return [];
    const saved = localStorage.getItem(`db_questions_${currentUser?.username}`);
    return saved ? JSON.parse(saved) : INIT_QUESTIONS;
  });
  const [normalFunds, setNormalFunds] = useState(() => {
    if (isSuperAdmin) return [];
    const saved = localStorage.getItem(`db_funds_${currentUser?.username}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [normalDocuments, setNormalDocuments] = useState(() => {
    if (isSuperAdmin) return [];
    const saved = localStorage.getItem(`db_documents_${currentUser?.username}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Computed active states based on current selection
  const members = isSuperAdmin 
    ? (selectedBranch === 'cs1' ? cs1Members : (selectedBranch === 'cs2' ? cs2Members : [...cs1Members, ...cs2Members]))
    : normalMembers;

  const plans = isSuperAdmin 
    ? (selectedBranch === 'cs1' ? cs1Plans : (selectedBranch === 'cs2' ? cs2Plans : [...cs1Plans, ...cs2Plans]))
    : normalPlans;

  const questions = isSuperAdmin 
    ? (selectedBranch === 'cs1' ? cs1Questions : (selectedBranch === 'cs2' ? cs2Questions : cs1Questions))
    : normalQuestions;

  const funds = isSuperAdmin 
    ? (selectedBranch === 'cs1' ? cs1Funds : (selectedBranch === 'cs2' ? cs2Funds : [...cs1Funds, ...cs2Funds]))
    : normalFunds;

  const documents = isSuperAdmin 
    ? (selectedBranch === 'cs1' ? cs1Documents : (selectedBranch === 'cs2' ? cs2Documents : [...cs1Documents, ...cs2Documents]))
    : normalDocuments;

  // Setters wrap
  const setMembers = (newVal) => {
    if (!isSuperAdmin) setNormalMembers(newVal);
  };
  const setPlans = (newVal) => {
    if (!isSuperAdmin) setNormalPlans(newVal);
  };
  const setQuestions = (newVal) => {
    if (!isSuperAdmin) setNormalQuestions(newVal);
  };
  const setFunds = (newVal) => {
    if (!isSuperAdmin) setNormalFunds(newVal);
  };
  const setDocuments = (newVal) => {
    if (!isSuperAdmin) setNormalDocuments(newVal);
  };
  
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem(`geminiApiKey_${currentUser?.username}`) || import.meta.env.VITE_GEMINI_API_KEY || '')
  const [syncStatus, setSyncStatus] = useState('Chưa kết nối')
  const initialLoadDone = useRef(false)

  // Lưu vào LocalStorage & sync cloud (chỉ admin mới được ghi lên Drive)
  useEffect(() => {
    if (isSuperAdmin) return;
    localStorage.setItem(`db_members_${currentUser?.username}`, JSON.stringify(members));
    localStorage.setItem(`db_plans_${currentUser?.username}`, JSON.stringify(plans));
    localStorage.setItem(`db_questions_${currentUser?.username}`, JSON.stringify(questions));
    localStorage.setItem(`db_funds_${currentUser?.username}`, JSON.stringify(funds));
    localStorage.setItem(`db_documents_${currentUser?.username}`, JSON.stringify(documents));
    if (initialLoadDone.current && isAdmin) {
      uploadToCloud(members, plans, questions, funds, documents);
    }
  }, [members, plans, questions, funds, documents])

  useEffect(() => {
    downloadFromCloud();
  }, [])

  const downloadFromCloud = async () => {
    if (isSuperAdmin) {
      setSyncStatus('Đang đồng bộ 2 chi đoàn...');
      try {
        const config1 = getBranchConfig('bvtks-cs1');
        const config2 = getBranchConfig('bvtks-cs2');

        let cs1 = { members: RAW_MEMBERS, plans: INIT_PLANS, questions: INIT_QUESTIONS, funds: [], documents: [] };
        let cs2 = { members: RAW_MEMBERS, plans: INIT_PLANS, questions: INIT_QUESTIONS, funds: [], documents: [] };

        if (config1.apiUrl) {
          try {
            const res1 = await fetch(`${config1.apiUrl}?branch=cs1`);
            const data1 = await res1.json();
            if (data1.members) cs1.members = data1.members;
            if (data1.plans) cs1.plans = data1.plans;
            if (data1.questions) cs1.questions = data1.questions;
            if (data1.funds) cs1.funds = data1.funds;
            if (data1.documents) cs1.documents = data1.documents;
          } catch (e) {
            console.error("Lỗi fetch CS1:", e);
          }
        }

        if (config2.apiUrl) {
          try {
            const res2 = await fetch(`${config2.apiUrl}?branch=cs2`);
            const data2 = await res2.json();
            if (data2.members) cs2.members = data2.members;
            if (data2.plans) cs2.plans = data2.plans;
            if (data2.questions) cs2.questions = data2.questions;
            if (data2.funds) cs2.funds = data2.funds;
            if (data2.documents) cs2.documents = data2.documents;
          } catch (e) {
            console.error("Lỗi fetch CS2:", e);
          }
        }

        setCs1Members(cs1.members);
        setCs1Plans(cs1.plans);
        setCs1Questions(cs1.questions);
        setCs1Funds(cs1.funds);
        setCs1Documents(cs1.documents);

        setCs2Members(cs2.members);
        setCs2Plans(cs2.plans);
        setCs2Questions(cs2.questions);
        setCs2Funds(cs2.funds);
        setCs2Documents(cs2.documents);

        // Lưu offline cache
        localStorage.setItem('db_members_bvtks-cs1', JSON.stringify(cs1.members));
        localStorage.setItem('db_plans_bvtks-cs1', JSON.stringify(cs1.plans));
        localStorage.setItem('db_questions_bvtks-cs1', JSON.stringify(cs1.questions));
        localStorage.setItem('db_funds_bvtks-cs1', JSON.stringify(cs1.funds));
        localStorage.setItem('db_documents_bvtks-cs1', JSON.stringify(cs1.documents));

        localStorage.setItem('db_members_bvtks-cs2', JSON.stringify(cs2.members));
        localStorage.setItem('db_plans_bvtks-cs2', JSON.stringify(cs2.plans));
        localStorage.setItem('db_questions_bvtks-cs2', JSON.stringify(cs2.questions));
        localStorage.setItem('db_funds_bvtks-cs2', JSON.stringify(cs2.funds));
        localStorage.setItem('db_documents_bvtks-cs2', JSON.stringify(cs2.documents));

        setSyncStatus('Đã đồng bộ 2 chi đoàn');
      } catch (error) {
        console.error("Lỗi đồng bộ super admin:", error);
        setSyncStatus('Lỗi đồng bộ');
      } finally {
        initialLoadDone.current = true;
      }
      return;
    }

    const config = getBranchConfig(currentUser?.username);
    if (!config.apiUrl) {
      setSyncStatus('Chưa cấu hình API URL');
      initialLoadDone.current = true;
      return;
    }
    setSyncStatus('Đang đồng bộ...');
    try {
      const branch = currentUser?.username === 'bvtks-cs1' ? 'cs1' : 'cs2';
      const res = await fetch(`${config.apiUrl}?branch=${branch}`);
      const dbData = await res.json();
      if (dbData.members) setMembers(dbData.members);
      if (dbData.plans) setPlans(dbData.plans);
      if (dbData.questions) setQuestions(dbData.questions);
      if (dbData.funds) setFunds(dbData.funds);
      if (dbData.documents) setDocuments(dbData.documents);
      setSyncStatus('Đã đồng bộ');
    } catch (error) {
      console.error("Lỗi đồng bộ:", error);
      setSyncStatus('Chưa có dữ liệu trên Cloud (Sẵn sàng tạo mới)');
    } finally {
      initialLoadDone.current = true;
    }
  };

  const uploadToCloud = async (m, p, q, f, doc) => {
    if (isSuperAdmin) return;
    const config = getBranchConfig(currentUser?.username);
    if (!config.apiUrl) {
      setSyncStatus('Chưa cấu hình API URL');
      return;
    }
    setSyncStatus('Đang lưu lên Đám mây...');
    try {
      const branch = currentUser?.username === 'bvtks-cs1' ? 'cs1' : 'cs2';
      const dbContent = { members: m, plans: p, questions: q, funds: f, documents: doc, branch };
      const res = await fetch(config.apiUrl, { 
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(dbContent)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSyncStatus('Đã đồng bộ');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("Lỗi lưu lên Cloud:", error);
      setSyncStatus('Lỗi đồng bộ');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard members={members} />
      case 'members':
        return <MemberManager members={members} setMembers={setMembers} isAdmin={effectiveIsAdmin} />
      case 'funds':
        return <FundManager funds={funds} setFunds={setFunds} isAdmin={effectiveIsAdmin} isSuperAdmin={isSuperAdmin} />
      case 'attendance':
        return <AttendanceManager 
          members={members} 
          setMembers={setMembers} 
          plans={plans} 
          setPlans={setPlans} 
          isAdmin={effectiveIsAdmin} 
        />
      case 'plans':
        return <PlansManager 
          plans={plans} 
          setPlans={setPlans} 
          isAdmin={effectiveIsAdmin} 
          geminiApiKey={geminiApiKey} 
          currentUser={currentUser} 
        />
      case 'documents':
        return <DocumentManager 
          isAdmin={effectiveIsAdmin} 
          currentUser={currentUser} 
          selectedBranch={selectedBranch}
          documents={documents}
          setDocuments={setDocuments}
        />
      case 'minutes':
        return <MinutesManager 
          currentUser={currentUser}
          isAdmin={effectiveIsAdmin}
          selectedBranch={selectedBranch}
        />
      case 'games':
        return isAdmin
          ? <GameManager questions={questions} setQuestions={setQuestions} geminiApiKey={geminiApiKey} onNeedSettings={() => handleTabChange('settings')} />
          : null
      case 'settings':
        return (isAdmin && currentUser?.username !== 'admin-bvtks')
          ? <Settings 
              geminiApiKey={geminiApiKey} 
              setGeminiApiKey={(val) => {
                setGeminiApiKey(val);
                localStorage.setItem(`geminiApiKey_${currentUser?.username}`, val);
              }} 
              syncStatus={syncStatus} 
              currentUser={currentUser} 
            />
          : <div className="bg-white p-12 rounded-2xl text-center text-gray-400 text-lg">🔒 Chức năng này chỉ dành cho Admin.</div>
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#f0f2f8' }}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        currentUser={currentUser} 
        onAppLogout={handleAppLogout} 
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
      />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto animate-fade-in-up">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default function RootApp() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('app_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (account) => {
    setCurrentUser(account);
    localStorage.setItem('app_current_user', JSON.stringify(account));
  };

  const handleAppLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('app_current_user');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/play" element={<PlayerMobile />} />
        <Route path="/*" element={
          currentUser ? (
            <AppContent currentUser={currentUser} handleAppLogout={handleAppLogout} />
          ) : (
            <LoginScreen onLogin={handleLogin} />
          )
        } />
      </Routes>
    </BrowserRouter>
  )
}
