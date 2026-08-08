import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Shield, Satellite, Leaf, Coins, ArrowRight,
  ExternalLink, Globe, Zap, Building2, MapPin,
  CheckCircle2, Lock, BarChart3, Smartphone
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [creditCount, setCreditCount] = useState(45230);
  const [lands, setLands] = useState(10);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/gov/credits/count`)
      .then((r) => r.json())
      .then((d) => {
        if (d.total_issued) setCreditCount(d.total_issued);
      })
      .catch(() => {});

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/gov/lands`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setLands(d.length);
      })
      .catch(() => {});

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1411] text-white overflow-x-hidden">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0B1411]/95 backdrop-blur-md border-b border-[#1D332A]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#34D399] to-[#10B981] flex items-center justify-center">
              <span className="text-[#0B1411] font-bold text-sm">CT</span>
            </div>
            <div>
              <span className="font-bold text-white text-sm">CarbonTrace</span>
              <span className="text-[#64748B] text-xs block leading-none">MRV Portal</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {['Platform', 'How it Works', 'Impact', 'Technology'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/ /g, '-')}`}
                className="text-[#94A3B8] hover:text-white text-sm transition-colors"
              >
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-[#64748B] uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-[#FF9933]" />
              <div className="w-2 h-2 rounded-full bg-white/30" />
              <div className="w-2 h-2 rounded-full bg-[#138808]" />
              <span className="ml-1">Govt. of India</span>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] text-sm font-semibold hover:bg-[#00D4FF]/20 transition-all duration-200"
            >
              Login to Portal
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      <section className="min-h-screen flex items-center pt-16 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#00D4FF 1px, transparent 1px), linear-gradient(90deg, #00D4FF 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl bg-[#34D399] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl bg-[#22C55E] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[#00D4FF] text-xs font-semibold uppercase tracking-wider">
                Live on Ethereum Sepolia · India Carbon Credit Trading Scheme 2025
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              <span className="text-white">Making Carbon Credits</span>
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#10B981] bg-clip-text text-transparent">
                Impossible to Fake
              </span>
            </h1>

            <p className="text-[#94A3B8] text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
              India's first blockchain-enabled MRV platform connecting mangrove restoration with verified
              carbon credits — powered by ISRO Bhuvan satellite data and Ethereum.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-[#34D399] to-[#10B981] text-[#0B1411] hover:opacity-90 transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)]"
              >
                Access Portal
                <ArrowRight size={16} />
              </button>
              <a
                href="https://sepolia.etherscan.io/address/0x0172a95425f10712321eB82D22e69d1c78605a3C"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-[#12211B] border border-[#1D332A] text-[#94A3B8] hover:text-white hover:border-[#34D399]/30 transition-all"
              >
                <Shield size={16} className="text-[#10B981]" />
                View Smart Contract
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { value: creditCount.toLocaleString('en-IN'), label: 'Credits Issued', color: '#00D4FF', suffix: 'CC' },
                { value: lands, label: 'Registered Lands', color: '#10B981', suffix: 'parcels' },
                { value: '0.9994', label: 'Wallet Balance', color: '#F59E0B', suffix: 'ETH' },
                { value: 'Sepolia', label: 'Network', color: '#8B5CF6', suffix: 'Live' }
              ].map((stat, i) => (
                <div key={i} className="bg-[#12211B]/80 border border-[#1D332A] rounded-xl p-4 backdrop-blur-sm">
                  <p className="font-bold text-2xl" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-[#64748B] text-xs mt-1">{stat.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: `${stat.color}80` }}>{stat.suffix}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 border-t border-[#1D332A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#00D4FF] text-xs font-semibold uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl font-bold text-white">From Mangrove to Certificate</h2>
            <p className="text-[#64748B] mt-3 max-w-xl mx-auto">
              Every step verified by satellite, AI, and permanently recorded on Ethereum blockchain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
            {[
              { step: '01', icon: MapPin, title: 'Land Registration', desc: 'Panchayat submits land request. Documents uploaded to Pinata IPFS.', color: '#00D4FF' },
              { step: '02', icon: Shield, title: 'Gov Approval', desc: 'Government verifies, signs transaction via MetaMask. Land registered on Ethereum.', color: '#10B981' },
              { step: '03', icon: Satellite, title: 'ISRO Bhuvan Scan', desc: 'Satellite monitors vegetation. AI detects mangrove species. Drone ground truth.', color: '#F59E0B' },
              { step: '04', icon: Coins, title: 'Credits Issued', desc: 'Carbon formula calculates credits. MetaMask signs issueCredits on-chain.', color: '#8B5CF6' },
              { step: '05', icon: Building2, title: 'Company Buys', desc: 'Verified company pays via Razorpay. Certificate with Etherscan proof issued.', color: '#FF9933' }
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 4 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[#1D332A] to-transparent z-0" />
                )}
                <div
                  className="relative z-10 bg-[#12211B] border border-[#1D332A] rounded-xl p-5 hover:border-opacity-50 transition-all duration-200"
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${item.color}50`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1D332A'; }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold opacity-40" style={{ color: item.color }}>{item.step}</span>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${item.color}15` }}>
                      <item.icon size={16} style={{ color: item.color }} />
                    </div>
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2">{item.title}</h3>
                  <p className="text-[#64748B] text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="py-24 border-t border-[#1D332A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#00D4FF] text-xs font-semibold uppercase tracking-widest mb-3">Platform</p>
            <h2 className="text-3xl font-bold text-white">Three Portals. One System.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Building2, title: 'Government Portal', subtitle: 'Website A',
                desc: 'Review land requests, monitor NDVI satellite data, issue carbon credits, manage NGO payouts — all with blockchain signing via MetaMask.',
                features: ['Land approval + Ethereum tx', 'ISRO Bhuvan NDVI monitoring', 'Carbon credit issuance on-chain', 'Razorpay payouts to panchayats', 'Blockchain audit trail'],
                color: '#00D4FF', badge: 'Live'
              },
              {
                icon: Smartphone, title: 'NGO / Panchayat App', subtitle: 'Flutter Mobile',
                desc: 'Field workers submit land requests, upload GPS-tagged photos, view earnings, and use AR camera to see plot boundaries floating over real terrain.',
                features: ['OTP login — no blockchain needed', 'GPS coordinate pinning', 'AR boundary visualization', 'Offline-first with sync', 'Carbon earnings dashboard'],
                color: '#10B981', badge: 'Mobile'
              },
              {
                icon: Globe, title: 'Corporate Marketplace', subtitle: 'Website B',
                desc: 'Verified companies browse available carbon credits, purchase with Razorpay, and receive certificates with real Ethereum transaction hash proof.',
                features: ['Company KYC + gov approval', 'Live credit count from blockchain', 'Razorpay payment gateway', 'transferToCompany on-chain', 'PDF certificate + Etherscan proof'],
                color: '#8B5CF6', badge: 'Phase 2'
              }
            ].map((portal, i) => (
              <div
                key={i}
                className="bg-[#12211B] border border-[#1D332A] rounded-xl p-6 flex flex-col"
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${portal.color}40`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1D332A'; }}
                style={{ transition: 'border-color 0.2s' }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${portal.color}15` }}>
                    <portal.icon size={20} style={{ color: portal.color }} />
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-1 rounded-full"
                    style={{ color: portal.color, background: `${portal.color}15`, border: `1px solid ${portal.color}30` }}
                  >
                    {portal.badge}
                  </span>
                </div>

                <h3 className="text-white font-bold text-lg mb-1">{portal.title}</h3>
                <p className="text-xs font-mono mb-3" style={{ color: portal.color }}>{portal.subtitle}</p>
                <p className="text-[#64748B] text-sm leading-relaxed mb-5 flex-1">{portal.desc}</p>

                <ul className="space-y-2">
                  {portal.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-[#94A3B8]">
                      <CheckCircle2 size={12} style={{ color: portal.color, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="impact" className="py-24 border-t border-[#1D332A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#00D4FF] text-xs font-semibold uppercase tracking-widest mb-3">Impact</p>
            <h2 className="text-3xl font-bold text-white">Real Numbers. Real Impact.</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { value: '70%', label: 'Faster MISHTI monitoring', desc: 'vs manual field surveys', color: '#00D4FF' },
              { value: '40%', label: 'Better credit accuracy', desc: 'AI-driven MRV vs manual', color: '#10B981' },
              { value: '1L+', label: 'Hectares potential', desc: 'from 22K current', color: '#F59E0B' },
              { value: '9', label: 'SDGs addressed', desc: 'SDG 1, 8, 10, 11, 13, 14, 15, 16, 17', color: '#8B5CF6' }
            ].map((item, i) => (
              <div key={i} className="text-center p-6 bg-[#12211B] border border-[#1D332A] rounded-xl">
                <p className="text-4xl font-bold mb-2" style={{ color: item.color }}>{item.value}</p>
                <p className="text-white text-sm font-semibold mb-1">{item.label}</p>
                <p className="text-[#64748B] text-xs">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-[#64748B] text-xs uppercase tracking-widest mb-4">
              Contributing to UN Sustainable Development Goals
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { n: 'SDG 1', t: 'No Poverty', c: '#F59E0B' },
                { n: 'SDG 8', t: 'Decent Work', c: '#10B981' },
                { n: 'SDG 10', t: 'Reduced Inequalities', c: '#8B5CF6' },
                { n: 'SDG 11', t: 'Sustainable Cities', c: '#00D4FF' },
                { n: 'SDG 13', t: 'Climate Action', c: '#10B981' },
                { n: 'SDG 14', t: 'Life Below Water', c: '#00D4FF' },
                { n: 'SDG 15', t: 'Life on Land', c: '#10B981' },
                { n: 'SDG 16', t: 'Strong Institutions', c: '#F59E0B' },
                { n: 'SDG 17', t: 'Partnerships', c: '#8B5CF6' }
              ].map((sdg, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold"
                  style={{ color: sdg.c, borderColor: `${sdg.c}30`, background: `${sdg.c}10` }}
                >
                  <span>{sdg.n}</span>
                  <span className="text-[#64748B] font-normal">{sdg.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="technology" className="py-24 border-t border-[#1D332A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#00D4FF] text-xs font-semibold uppercase tracking-widest mb-3">Technology</p>
            <h2 className="text-3xl font-bold text-white">Built on Proven Infrastructure</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Shield, name: 'Ethereum Sepolia', desc: 'Smart contracts for land registry and carbon credit management', color: '#8B5CF6' },
              { icon: Globe, name: 'Pinata IPFS', desc: 'Decentralized document storage. Every CID linked on-chain.', color: '#00D4FF' },
              { icon: Satellite, name: 'ISRO Bhuvan', desc: 'Government satellite NDVI monitoring for vegetation verification', color: '#10B981' },
              { icon: Zap, name: 'MetaMask Signing', desc: 'Every approval requires government wallet signature', color: '#F59E0B' },
              { icon: BarChart3, name: 'AI Species Detection', desc: 'Pretrained models identify red, black, white mangrove species', color: '#10B981' },
              { icon: Leaf, name: 'WebODM Drone', desc: 'Orthomosaic mapping from drone footage for ground truth', color: '#00D4FF' },
              { icon: Smartphone, name: 'AR Mapping', desc: 'Flutter ARCore overlays plot data on real terrain via GPS', color: '#8B5CF6' },
              { icon: Lock, name: 'Razorpay', desc: 'Direct bank payouts to NGO and panchayat accounts', color: '#F59E0B' }
            ].map((tech, i) => (
              <div
                key={i}
                className="bg-[#12211B] border border-[#1D332A] rounded-xl p-5 hover:border-opacity-40 transition-all duration-200"
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${tech.color}40`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1D332A'; }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${tech.color}15` }}>
                  <tech.icon size={16} style={{ color: tech.color }} />
                </div>
                <h3 className="text-white text-sm font-bold mb-1">{tech.name}</h3>
                <p className="text-[#64748B] text-xs leading-relaxed">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-[#1D332A]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-br from-[#12211B] to-[#0F1C17] border border-[#1D332A] rounded-2xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#00D4FF] blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#34D399] to-[#10B981] mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                <Shield size={24} className="text-[#0B1411]" />
              </div>

              <h2 className="text-3xl font-bold text-white mb-4">Verify it yourself</h2>
              <p className="text-[#94A3B8] mb-8 leading-relaxed">
                Every land registration and carbon credit issuance is permanently recorded on Ethereum.
                Open Etherscan and verify without asking anyone's permission.
              </p>

              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-[#34D399] to-[#10B981] text-[#0B1411] hover:opacity-90 transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                >
                  Access Portal
                  <ArrowRight size={16} />
                </button>
                <a
                  href="https://sepolia.etherscan.io/address/0x0172a95425f10712321eB82D22e69d1c78605a3C"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-[#0B1411] border border-[#1D332A] text-[#94A3B8] hover:text-white hover:border-[#34D399]/30 transition-all"
                >
                  View on Etherscan
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#1D332A] py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#34D399] to-[#10B981] flex items-center justify-center">
              <span className="text-[#0B1411] font-bold text-xs">CT</span>
            </div>
            <div>
              <span className="text-white text-sm font-bold">CarbonTrace</span>
              <span className="text-[#64748B] text-xs block leading-none">National Blue Carbon MRV Registry</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#FF9933]" />
              <div className="w-2 h-2 rounded-full bg-white/20" />
              <div className="w-2 h-2 rounded-full bg-[#138808]" />
            </div>
            <span>Government of India · Ministry of Environment · MISHTI Mission</span>
          </div>

          <p className="text-[#64748B] text-xs">
            Ethereum Sepolia · IPFS · ISRO Bhuvan · Razorpay · © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
