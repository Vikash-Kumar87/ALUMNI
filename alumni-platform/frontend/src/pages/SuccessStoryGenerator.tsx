import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { aiAPI } from '../services/api';
import {
  FiArrowLeft, FiZap, FiCopy, FiCheck, FiRefreshCw, FiStar,
  FiEdit3, FiUser, FiBriefcase, FiAward, FiMessageSquare,
  FiTrendingUp, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, Variants } from 'framer-motion';

/* ──────────────────────── animation presets ──────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.93 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 340, damping: 24 } },
};

/* ──────────────────────── helpers ──────────────────────── */
const TONE_OPTIONS = [
  { id: 'inspiring',    label: 'Inspiring',    emoji: '✨', desc: 'Uplifting, motivational tone' },
  { id: 'professional', label: 'Professional', emoji: '💼', desc: 'Formal LinkedIn-style bio'   },
  { id: 'storytelling', label: 'Story-Driven', emoji: '📖', desc: 'Narrative, personal journey'  },
];

const PLACEHOLDER_TIPS: Record<string, string> = {
  currentRole:    'e.g. Senior Software Engineer at Google',
  journey:        'e.g. Started as a CSE student in Tier-2 college, did 3 internships, cracked FAANG in 2 years…',
  biggestWin:     'e.g. Led a team to ship a feature used by 10M users, spoke at Google I/O…',
  challengesFaced:'e.g. Faced imposter syndrome, rejected 12 times before first offer…',
  adviceForJuniors:'e.g. Start with fundamentals, build projects, network consistently…',
  funFact:        'e.g. I code better after midnight ☕, or I run marathons on weekends',
};

/* ──────────────────────── skeleton ──────────────────────── */
const Sk = ({ w = 'w-full', h = 'h-4', r = 'rounded-lg' }: { w?: string; h?: string; r?: string }) => (
  <div className={`skeleton ${w} ${h} ${r}`} />
);

const StorySkeleton = () => (
  <div className="space-y-3 p-5">
    <Sk w="w-32" h="h-3" />
    {[100, 85, 90, 70, 95, 75].map((w, i) => (
      <Sk key={i} w={`w-[${w}%]`} h="h-3.5" />
    ))}
    <div className="h-2" />
    {[88, 72, 96].map((w, i) => (
      <Sk key={i} w={`w-[${w}%]`} h="h-3.5" />
    ))}
  </div>
);

/* ──────────────────────── textarea field ──────────────────────── */
const Field: React.FC<{
  label: string; icon: React.ElementType; field: string;
  value: string; onChange: (v: string) => void; multiline?: boolean; required?: boolean;
}> = ({ label, icon: Icon, field, value, onChange, multiline = false, required = false }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-xs font-black text-gray-700 uppercase tracking-widest">
      <Icon className="w-3.5 h-3.5 text-amber-500" />
      {label}
      {required && <span className="text-rose-400">*</span>}
    </label>
    {multiline ? (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={PLACEHOLDER_TIPS[field] || ''}
        rows={3}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-all resize-none leading-relaxed"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={PLACEHOLDER_TIPS[field] || ''}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-all"
      />
    )}
  </div>
);

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
const SuccessStoryGenerator: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  /* form state */
  const [currentRole,     setCurrentRole]     = useState(userProfile?.jobRole || '');
  const [company,         setCompany]         = useState(userProfile?.company || '');
  const [journey,         setJourney]         = useState('');
  const [biggestWin,      setBiggestWin]      = useState('');
  const [challengesFaced, setChallengesFaced] = useState('');
  const [adviceForJuniors,setAdviceForJuniors]= useState('');
  const [funFact,         setFunFact]         = useState('');
  const [tone,            setTone]            = useState('inspiring');

  /* output state */
  const [loading,  setLoading]  = useState(false);
  const [story,    setStory]    = useState('');
  const [copied,   setCopied]   = useState(false);
  const [showForm, setShowForm] = useState(true);

  const storyRef = useRef<HTMLDivElement>(null);

  const canGenerate = currentRole.trim() && journey.trim();

  const handleGenerate = async () => {
    if (!canGenerate) { toast.error('Please fill in your current role and journey'); return; }
    setLoading(true);
    setStory('');
    try {
      const res = await aiAPI.generateSuccessStory(
        userProfile?.name || 'Alumni',
        currentRole, company, journey,
        biggestWin, challengesFaced, adviceForJuniors, funFact, tone,
        userProfile?.skills || [],
      );
      const result: string = res.data.story;
      if (!result) throw new Error('No story generated');
      setStory(result);
      setShowForm(false);
      setTimeout(() => storyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err: any) {
      toast.error(err.message || 'Could not generate story. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(story).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRegenerate = () => {
    setStory('');
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  /* ── parse story into paragraphs for nice rendering ── */
  const paragraphs = story.split(/\n+/).filter(p => p.trim());

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(155deg,#fffbeb 0%,#fefce8 30%,#fff 70%)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">

        {/* ── back ── */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors group">
            <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
        </div>

        {/* ── page hero ── */}
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
              <FiStar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Success Story Generator</h1>
              <p className="text-xs text-gray-500">Let AI craft a compelling bio from your journey</p>
            </div>
          </div>

          {/* tone selector */}
          <div className="mt-4 flex gap-2 flex-wrap">
            {TONE_OPTIONS.map(t => (
              <button key={t.id} onClick={() => setTone(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  tone === t.id
                    ? 'text-white border-transparent shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-700'
                }`}
                style={tone === t.id ? { background: 'linear-gradient(135deg,#f59e0b,#f97316)', boxShadow: '0 3px 14px rgba(245,158,11,0.35)' } : {}}
              >
                <span>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── FORM ── */}
        <AnimatePresence initial={false}>
          {showForm && (
            <motion.div
              key="form"
              initial="hidden" animate="show" exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
              variants={stagger}
            >
              <motion.div variants={fadeUp}
                className="rounded-3xl p-6 mb-5 shadow-sm space-y-5"
                style={{ background: 'white', border: '1.5px solid rgba(245,158,11,0.15)' }}
              >
                <p className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                  <FiUser className="w-3.5 h-3.5" /> Your Story
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Current Role" icon={FiBriefcase} field="currentRole"
                    value={currentRole} onChange={setCurrentRole} required />
                  <Field label="Company / Org" icon={FiBriefcase} field="company"
                    value={company} onChange={setCompany} />
                </div>

                <Field label="Your Journey" icon={FiTrendingUp} field="journey"
                  value={journey} onChange={setJourney} multiline required />

                <Field label="Biggest Win / Achievement" icon={FiAward} field="biggestWin"
                  value={biggestWin} onChange={setBiggestWin} multiline />

                <Field label="Challenges You Overcame" icon={FiStar} field="challengesFaced"
                  value={challengesFaced} onChange={setChallengesFaced} multiline />

                <Field label="Advice for Juniors" icon={FiMessageSquare} field="adviceForJuniors"
                  value={adviceForJuniors} onChange={setAdviceForJuniors} multiline />

                <Field label="Fun Fact (optional)" icon={FiEdit3} field="funFact"
                  value={funFact} onChange={setFunFact} />
              </motion.div>

              {/* generate button */}
              <motion.div variants={fadeUp}>
                <motion.button
                  onClick={handleGenerate}
                  disabled={loading || !canGenerate}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -2 }}
                  className="w-full py-4 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', boxShadow: '0 6px 24px rgba(245,158,11,0.4)' }}
                >
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Writing your story…</>
                    : <><FiZap className="w-4 h-4" /> Generate Success Story</>}
                </motion.button>
                {!canGenerate && (
                  <p className="text-center text-xs text-gray-400 mt-2">Fill in Role* and Journey* to continue</p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STORY LOADING skeleton ── */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-3xl overflow-hidden border shadow-sm mt-2"
            style={{ borderColor: 'rgba(245,158,11,0.2)' }}
          >
            <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg,#f59e0b,#f97316)' }} />
            <StorySkeleton />
          </motion.div>
        )}

        {/* ── STORY RESULT ── */}
        <AnimatePresence>
          {story && !loading && (
            <motion.div
              ref={storyRef}
              key="story"
              variants={scaleIn} initial="hidden" animate="show" exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-3xl overflow-hidden shadow-lg mt-2"
              style={{ border: '1.5px solid rgba(245,158,11,0.2)' }}
            >
              {/* top accent bar */}
              <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg,#f59e0b,#f97316,#ef4444)' }} />

              {/* story header */}
              <div className="px-6 pt-5 pb-4 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg,rgba(255,251,235,0.9),rgba(255,247,237,0.9))' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', boxShadow: '0 3px 12px rgba(245,158,11,0.35)' }}>
                    <FiStar className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Your Story</p>
                    <p className="text-sm font-bold text-gray-800">{userProfile?.name || 'Alumni'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full capitalize"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                  {TONE_OPTIONS.find(t => t.id === tone)?.emoji} {TONE_OPTIONS.find(t => t.id === tone)?.label}
                </span>
              </div>

              {/* story body */}
              <div className="px-6 py-5 bg-white">
                <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
                  {paragraphs.map((para, i) => (
                    <motion.p key={i} variants={fadeUp}
                      className={`leading-relaxed text-gray-700 ${i === 0 ? 'text-base font-semibold text-gray-800' : 'text-sm'}`}>
                      {para}
                    </motion.p>
                  ))}
                </motion.div>
              </div>

              {/* action bar */}
              <div className="px-6 py-4 flex flex-wrap gap-3 border-t border-amber-50"
                style={{ background: 'rgba(255,251,235,0.6)' }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', boxShadow: '0 3px 14px rgba(245,158,11,0.3)' }}
                >
                  {copied ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Story'}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowForm(v => !v)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-700 transition-all border border-amber-200 bg-amber-50 hover:bg-amber-100"
                >
                  {showForm ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                  {showForm ? 'Hide Form' : 'Edit Details'}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRegenerate}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 transition-all border border-gray-200 bg-white hover:bg-gray-50 ml-auto"
                >
                  <FiRefreshCw className="w-3.5 h-3.5" /> Try Different Tone
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── usage tip ── */}
        {!story && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-6 rounded-2xl p-4 flex gap-3"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
          >
            <span className="text-xl flex-shrink-0">💡</span>
            <div>
              <p className="text-xs font-bold text-amber-700 mb-0.5">Pro tip</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                The more detail you give in "Journey" and "Challenges", the more unique and compelling your story becomes. Students love real, honest accounts — not just achievements.
              </p>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default SuccessStoryGenerator;
