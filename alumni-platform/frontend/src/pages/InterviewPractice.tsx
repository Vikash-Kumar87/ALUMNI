import React, { useState, useEffect, useRef, useCallback } from 'react';
import { aiAPI } from '../services/api';
import { InterviewQuestion, InterviewEvaluation } from '../types';
import {
  FiCpu, FiChevronRight, FiStar, FiCheckCircle, FiArrowLeft,
  FiZap, FiTarget, FiAward, FiCode, FiDatabase, FiLayers, FiTrendingUp,
  FiMic, FiMicOff, FiType,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const TOPICS = [
  { label: 'React', icon: '⚛️' }, { label: 'JavaScript', icon: '🟡' },
  { label: 'TypeScript', icon: '🔷' }, { label: 'Node.js', icon: '🟢' },
  { label: 'Python', icon: '🐍' }, { label: 'Data Structures', icon: '🌳' },
  { label: 'Algorithms', icon: '⚡' }, { label: 'System Design', icon: '🏗️' },
  { label: 'SQL', icon: '🗄️' }, { label: 'MongoDB', icon: '🍃' },
  { label: 'HTML/CSS', icon: '🎨' }, { label: 'Java', icon: '☕' },
  { label: 'C++', icon: '⚙️' },
];

const DIFFICULTIES = [
  { key: 'easy', label: 'Easy', color: 'from-emerald-400 to-green-500', bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', emoji: '🌱' },
  { key: 'medium', label: 'Medium', color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', emoji: '🔥' },
  { key: 'hard', label: 'Hard', color: 'from-rose-400 to-red-600', bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-700', emoji: '💀' },
];

type Stage = 'setup' | 'questions' | 'answering' | 'evaluation';

/* ── animated counter ── */
const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({ value, duration = 800 }) => {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(p * value * 10) / 10);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return <>{display}</>;
};

const InterviewPractice: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [stage, setStage] = useState<Stage>('setup');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [allEvaluations, setAllEvaluations] = useState<(InterviewEvaluation & { question: string })[]>([]);
  const [stageKey, setStageKey] = useState(0);

  // ── Voice mode state ──
  const [answerMode,    setAnswerMode]    = useState<'text' | 'voice'>('text');
  const [recording,     setRecording]     = useState(false);
  const [transcript,    setTranscript]    = useState('');
  const [interimText,   setInterimText]   = useState('');
  const [recSeconds,    setRecSeconds]    = useState(0);
  const [recDuration,   setRecDuration]   = useState(0);
  const recRef   = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialise SpeechRecognition once
  const initRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous     = true;
    r.interimResults = true;
    r.lang           = 'en-US';
    r.onresult = (e: any) => {
      let fin = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      if (fin) setTranscript(prev => prev + fin);
      setInterimText(interim);
    };
    r.onerror = (e: any) => {
      if (e.error !== 'aborted') toast.error(`Mic error: ${e.error}`);
    };
    r.onend = () => {
      setRecording(false);
      setInterimText('');
    };
    return r;
  }, []);

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Speech recognition not supported in this browser. Try Chrome.'); return; }
    setTranscript('');
    setInterimText('');
    setRecSeconds(0);
    const r = initRecognition();
    if (!r) return;
    recRef.current = r;
    r.start();
    setRecording(true);
    timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
  };

  const stopRecording = () => {
    if (recRef.current) {
      recRef.current.stop();
      recRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecDuration(recSeconds);
    setRecording(false);
    setInterimText('');
  };

  // Clean up on unmount
  useEffect(() => () => {
    if (recRef.current) recRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // Reset voice state when entering answering stage
  const handleStartAnswer = () => {
    setAnswer('');
    setTranscript('');
    setInterimText('');
    setRecSeconds(0);
    setRecDuration(0);
    setAnswerMode('text');
    setEvaluation(null);
    bumpStage();
    setStage('answering');
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const activeTopic = customTopic.trim() || topic;
  const bumpStage   = () => setStageKey(k => k + 1);
  const voiceText   = transcript + interimText;

  const generateQuestions = async () => {
    if (!activeTopic) { toast.error('Please select or type a topic'); return; }
    setLoading(true);
    try {
      const res = await aiAPI.generateInterviewQuestions(activeTopic, difficulty);
      setQuestions(res.data.questions as InterviewQuestion[]);
      setCurrentIdx(0);
      setAllEvaluations([]);
      bumpStage();
      setStage('questions');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (err as Error)?.message || 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    const textToEval = answerMode === 'voice' ? voiceText.trim() : answer.trim();
    if (!textToEval) { toast.error(answerMode === 'voice' ? 'Record your answer first' : 'Please write an answer'); return; }
    setLoading(true);
    try {
      const currentQ = questions[currentIdx];
      let eval_: InterviewEvaluation;
      if (answerMode === 'voice') {
        const res = await aiAPI.evaluateVoiceAnswer(activeTopic, currentQ.question, textToEval, recDuration || recSeconds);
        eval_ = res.data.evaluation as InterviewEvaluation;
      } else {
        const res = await aiAPI.evaluateAnswer(activeTopic, currentQ.question, textToEval);
        eval_ = res.data.evaluation as InterviewEvaluation;
      }
      setEvaluation(eval_);
      setAllEvaluations(prev => [...prev, { ...eval_, question: currentQ.question }]);
      bumpStage();
      setStage('evaluation');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (err as Error)?.message || 'Failed to evaluate answer');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (recRef.current) { recRef.current.stop(); recRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1);
      setAnswer('');
      setTranscript('');
      setInterimText('');
      setRecSeconds(0);
      setRecDuration(0);
      setRecording(false);
      setEvaluation(null);
      bumpStage();
      setStage('questions');
    } else {
      bumpStage();
      setStage('setup');
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-600';
    if (score >= 6) return 'text-amber-500';
    return 'text-rose-500';
  };
  const scoreBg = (score: number) => {
    if (score >= 8) return 'from-emerald-400 to-green-500';
    if (score >= 6) return 'from-amber-400 to-orange-500';
    return 'from-rose-400 to-red-500';
  };

  const avgScore = allEvaluations.length > 0
    ? Math.round(allEvaluations.reduce((s, e) => s + e.score, 0) / allEvaluations.length * 10) / 10
    : 0;

  const diffObj = DIFFICULTIES.find(d => d.key === difficulty)!;
  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/40 px-4 py-8">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="aurora-blob w-96 h-96 bg-violet-300/20 -top-20 -right-20" />
        <div className="aurora-blob w-72 h-72 bg-indigo-300/20 bottom-20 -left-10" style={{ animationDelay: '4s' }} />
        <div className="aurora-blob w-64 h-64 bg-purple-300/15 top-1/2 right-1/3" style={{ animationDelay: '8s' }} />
      </div>

      <div className="max-w-3xl mx-auto">
        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <FiCpu className="w-7 h-7 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              AI Interview <span className="text-gradient">Practice</span>
            </h1>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <FiZap className="w-3.5 h-3.5 text-violet-400" /> Powered by Groq AI — instant feedback
            </p>
          </div>
          {allEvaluations.length > 0 && (
            <div className="ml-auto flex items-center gap-2 bg-white/80 backdrop-blur border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm">
              <FiAward className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-700">{avgScore}/10 avg</span>
            </div>
          )}
        </div>

        {/* ── Stage panels ── */}
        <div key={stageKey} style={{ animation: 'fadeInUp 0.4s ease-out both' }}>

          {/* ════ SETUP ════ */}
          {stage === 'setup' && (
            <div className="space-y-5">

              {/* Session summary after a session */}
              {allEvaluations.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-200/60"
                  style={{ background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-300/20 rounded-full blur-2xl" />
                  <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                    <FiTrendingUp className="w-4 h-4" /> Session Complete!
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className={`text-4xl font-black ${scoreColor(avgScore)}`}>
                        <AnimatedNumber value={avgScore} />/10
                      </p>
                      <p className="text-xs text-emerald-700 font-medium mt-0.5">Avg Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-black text-gray-800">
                        <AnimatedNumber value={allEvaluations.length} />
                      </p>
                      <p className="text-xs text-emerald-700 font-medium mt-0.5">Questions Done</p>
                    </div>
                    <div className="flex-1">
                      <div className="space-y-1.5">
                        {allEvaluations.map((e, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-16 truncate">Q{i + 1}</span>
                            <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-r ${scoreBg(e.score)} transition-all`}
                                style={{ width: `${e.score * 10}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${scoreColor(e.score)}`}>{e.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Configure card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-card p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <FiTarget className="w-5 h-5 text-violet-500" /> Configure Your Session
                </h2>
                <p className="text-sm text-gray-400 mb-6">Pick a topic, difficulty, and start practicing</p>

                {/* Topic grid */}
                <div className="mb-5">
                  <label className="label flex items-center gap-1.5">
                    <FiCode className="w-3.5 h-3.5 text-gray-400" /> Select Topic
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
                    {TOPICS.map(t => (
                      <button
                        key={t.label}
                        onClick={() => { setTopic(t.label); setCustomTopic(''); }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all duration-200 ${
                          topic === t.label && !customTopic
                            ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm scale-[1.03]'
                            : 'border-gray-150 bg-gray-50 text-gray-600 hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-600'
                        }`}
                      >
                        <span>{t.icon}</span> {t.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={e => { setCustomTopic(e.target.value); setTopic(''); }}
                    placeholder="Or type a custom topic..."
                    className="input input-glow"
                  />
                </div>

                {/* Difficulty */}
                <div className="mb-7">
                  <label className="label flex items-center gap-1.5">
                    <FiLayers className="w-3.5 h-3.5 text-gray-400" /> Difficulty
                  </label>
                  <div className="flex gap-3">
                    {DIFFICULTIES.map(d => (
                      <button
                        key={d.key}
                        onClick={() => setDifficulty(d.key)}
                        className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all duration-200 flex flex-col items-center gap-1 ${
                          difficulty === d.key
                            ? `${d.border} ${d.bg} ${d.text} shadow-sm scale-[1.03]`
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <span className="text-lg">{d.emoji}</span>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start button */}
                <button
                  onClick={generateQuestions}
                  disabled={loading || !activeTopic}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Generating questions...
                      </>
                    ) : (
                      <><FiZap className="w-5 h-5" /> Start Interview Session</>
                    )}
                  </span>
                </button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <FiDatabase className="w-4 h-4" />, label: 'Topics', val: '13+', color: 'text-violet-500' },
                  { icon: <FiCpu className="w-4 h-4" />, label: 'AI Powered', val: 'Groq', color: 'text-indigo-500' },
                  { icon: <FiAward className="w-4 h-4" />, label: 'Feedback', val: 'Instant', color: 'text-emerald-500' },
                ].map(s => (
                  <div key={s.label} className="bg-white/70 backdrop-blur rounded-xl border border-gray-100 p-3 text-center">
                    <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
                    <p className="text-sm font-bold text-gray-800">{s.val}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ QUESTIONS ════ */}
          {stage === 'questions' && questions.length > 0 && (
            <div className="space-y-4">
              {/* Progress header */}
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="badge-purple">Q {currentIdx + 1} / {questions.length}</span>
                    <span className={`badge ${diffObj.bg} ${diffObj.text} border ${diffObj.border}`}>
                      {diffObj.emoji} {diffObj.label}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-500">{activeTopic}</span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
                <div className="flex justify-between mt-1.5">
                  {questions.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i < currentIdx ? 'bg-violet-500' : i === currentIdx ? 'bg-violet-400 scale-125' : 'bg-gray-200'
                    }`} />
                  ))}
                </div>
              </div>

              {/* Question card */}
              <div className="bg-white/90 backdrop-blur rounded-2xl border border-gray-100 shadow-card p-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 mb-4">
                  <FiLayers className="w-3 h-3" /> {questions[currentIdx].category}
                </span>
                <h2 className="text-xl font-bold text-gray-900 mb-5 leading-relaxed">
                  {questions[currentIdx].question}
                </h2>

                {/* Hint box */}
                <div className="flex gap-3 bg-amber-50 border border-amber-200/80 rounded-xl p-4 mb-6">
                  <span className="text-xl mt-0.5">💡</span>
                  <div>
                    <p className="text-xs font-semibold text-amber-700 mb-0.5">Hint</p>
                    <p className="text-sm text-amber-800 leading-relaxed">{questions[currentIdx].hint}</p>
                  </div>
                </div>

                <button
                  onClick={handleStartAnswer}
                  className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 15px rgba(99,102,241,0.35)' }}
                >
                  Write My Answer <FiChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ════ ANSWERING ════ */}
          {stage === 'answering' && questions.length > 0 && (
            <div className="bg-white/90 backdrop-blur rounded-2xl border border-gray-100 shadow-card p-6">
              <button
                onClick={() => { if (recording) stopRecording(); bumpStage(); setStage('questions'); }}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-600 mb-5 transition-colors"
              >
                <FiArrowLeft className="w-4 h-4" /> Back to question
              </button>

              <div className="flex items-center gap-2 mb-4">
                <span className="badge-purple">Q {currentIdx + 1} / {questions.length}</span>
                <span className={`badge ${diffObj.bg} ${diffObj.text} border ${diffObj.border}`}>
                  {diffObj.emoji} {diffObj.label}
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
                <h2 className="text-base font-semibold text-gray-800 leading-relaxed">
                  {questions[currentIdx].question}
                </h2>
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-2xl">
                {(['text', 'voice'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { if (recording) stopRecording(); setAnswerMode(m); }}
                    className="relative flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200"
                    style={answerMode === m ? {
                      background: 'white',
                      color: m === 'voice' ? '#7c3aed' : '#4f46e5',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    } : { color: '#9ca3af' }}
                  >
                    {answerMode === m && (
                      <motion.div layoutId="modeBg" className="absolute inset-0 rounded-xl bg-white"
                        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {m === 'text' ? <><FiType className="w-4 h-4" /> Text Answer</> : <><FiMic className="w-4 h-4" /> Voice Answer</>}
                    </span>
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">

                {/* ── Text mode ── */}
                {answerMode === 'text' && (
                  <motion.div key="text"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                  >
                    <label className="label flex items-center gap-1.5">
                      <FiCode className="w-3.5 h-3.5 text-gray-400" /> Your Answer
                    </label>
                    <textarea
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Write your answer here… Be thorough and explain your thinking."
                      className="input mb-1.5 resize-none focus:ring-violet-400/40"
                      rows={9}
                    />
                    <p className="text-xs text-gray-400 mb-5">{answer.length} characters</p>
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={loading || !answer.trim()}
                      className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all duration-200"
                      style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
                    >
                      {loading
                        ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> AI is evaluating…</>
                        : <><FiCpu className="w-5 h-5" /> Evaluate My Answer</>
                      }
                    </button>
                  </motion.div>
                )}

                {/* ── Voice mode ── */}
                {answerMode === 'voice' && (
                  <motion.div key="voice"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-4"
                  >
                    {/* Mic button area */}
                    <div className="flex flex-col items-center py-6 gap-5">
                      {/* Pulse rings */}
                      <div className="relative flex items-center justify-center">
                        {recording && (
                          <>
                            <motion.div className="absolute rounded-full border-2 border-violet-400/40"
                              animate={{ width: [80, 130, 80], height: [80, 130, 80], opacity: [0.6, 0, 0.6] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <motion.div className="absolute rounded-full border-2 border-violet-300/30"
                              animate={{ width: [80, 170, 80], height: [80, 170, 80], opacity: [0.4, 0, 0.4] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                            />
                          </>
                        )}
                        <motion.button
                          onClick={recording ? stopRecording : startRecording}
                          whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.94 }}
                          className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl z-10"
                          style={{
                            background: recording
                              ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                              : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                            boxShadow: recording
                              ? '0 8px 32px rgba(239,68,68,0.45)'
                              : '0 8px 32px rgba(124,58,237,0.45)',
                          }}
                        >
                          {recording
                            ? <FiMicOff className="w-8 h-8 text-white" />
                            : <FiMic className="w-8 h-8 text-white" />
                          }
                        </motion.button>
                      </div>

                      {/* Timer + waveform */}
                      <div className="flex flex-col items-center gap-2">
                        {recording ? (
                          <>
                            <div className="flex items-center gap-2">
                              <motion.div className="w-2 h-2 rounded-full bg-red-500"
                                animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}
                              />
                              <span className="font-mono text-lg font-bold text-gray-800">{fmtTime(recSeconds)}</span>
                            </div>
                            {/* Waveform bars */}
                            <div className="flex items-center gap-0.5 h-8">
                              {Array.from({ length: 20 }).map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="w-1 rounded-full bg-gradient-to-t from-violet-500 to-purple-400"
                                  animate={{ height: ['6px', `${10 + Math.random() * 22}px`, '6px'] }}
                                  transition={{ duration: 0.4 + Math.random() * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
                                />
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 text-center">
                            {voiceText.trim()
                              ? <span className="text-emerald-600 font-medium">✓ Answer recorded ({recDuration}s)</span>
                              : 'Press the mic and speak your answer clearly'
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Live transcript */}
                    {(voiceText || recording) && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 rounded-2xl border border-gray-200 p-4 min-h-[80px]"
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-4 h-4 rounded-full bg-violet-100 flex items-center justify-center">
                            <FiMic className="w-2.5 h-2.5 text-violet-600" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Transcript</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {transcript}
                          {interimText && <span className="text-gray-400 italic">{interimText}</span>}
                          {!voiceText && <span className="text-gray-400 italic">Listening…</span>}
                        </p>
                      </motion.div>
                    )}

                    {/* Evaluate button */}
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={loading || !voiceText.trim() || recording}
                      className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
                    >
                      {loading
                        ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> AI is evaluating voice answer…</>
                        : <><FiZap className="w-5 h-5" /> Evaluate Voice Answer</>
                      }
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ════ EVALUATION ════ */}
          {stage === 'evaluation' && evaluation && (
            <div className="space-y-4">

              {/* Score card */}
              <div className="relative overflow-hidden rounded-2xl p-6 text-white"
                style={{ background: `linear-gradient(135deg, ${evaluation.score >= 8 ? '#059669,#10b981' : evaluation.score >= 6 ? '#d97706,#f59e0b' : '#dc2626,#ef4444'})` }}>
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-xl" />
                <div className="relative flex items-center gap-5">
                  {/* Score ring */}
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                      <circle
                        cx="48" cy="48" r="40" fill="none" stroke="white" strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - evaluation.score / 10)}`}
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black">{evaluation.score}</span>
                      <span className="text-xs opacity-80">/10</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-black mb-0.5">{evaluation.grade}</p>
                    <p className="text-white/80 text-sm">Question {currentIdx + 1} of {questions.length}</p>
                    <div className="flex gap-1 mt-2">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`h-1.5 w-4 rounded-full transition-all ${i < evaluation.score ? 'bg-white' : 'bg-white/25'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="bg-white/90 backdrop-blur rounded-2xl border border-gray-100 shadow-sm p-5">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <FiCpu className="w-4 h-4 text-violet-500" /> AI Feedback
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">{evaluation.feedback}</p>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/90 backdrop-blur rounded-2xl border border-emerald-100 shadow-sm p-5">
                  <h4 className="font-bold text-emerald-700 mb-3 flex items-center gap-2">
                    <FiCheckCircle className="w-4 h-4" /> Strengths
                  </h4>
                  <ul className="space-y-2">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2 items-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-bold">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/90 backdrop-blur rounded-2xl border border-orange-100 shadow-sm p-5">
                  <h4 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
                    <FiStar className="w-4 h-4" /> Improvements
                  </h4>
                  <ul className="space-y-2">
                    {evaluation.improvements.map((s, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2 items-start">
                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-bold">→</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Model answer */}
              <div className="bg-white/90 backdrop-blur rounded-2xl border border-violet-100 shadow-sm p-5">
                <h4 className="font-bold text-violet-700 mb-3 flex items-center gap-2">
                  <FiAward className="w-4 h-4" /> Model Answer
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">{evaluation.modelAnswer}</p>
              </div>

              {/* Voice delivery analysis */}
              {evaluation.voiceInsights && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="rounded-2xl border border-violet-200 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,#f5f3ff,#eef2ff)' }}
                >
                  <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                      <FiMic className="w-4 h-4 text-violet-600" />
                    </div>
                    <h4 className="font-bold text-violet-800 text-sm">Voice Delivery Analysis</h4>
                  </div>

                  {/* Metric row */}
                  <div className="grid grid-cols-3 gap-3 px-5 pb-4">
                    {/* Confidence */}
                    <div className="bg-white/80 rounded-xl p-3 flex flex-col items-center gap-1.5 border border-violet-100">
                      <svg width="60" height="36" viewBox="0 0 60 36">
                        <path d="M5 35 A25 25 0 0 1 55 35" fill="none" stroke="#e9d5ff" strokeWidth="5" strokeLinecap="round" />
                        <motion.path d="M5 35 A25 25 0 0 1 55 35" fill="none" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={String(Math.PI * 25)}
                          initial={{ strokeDashoffset: Math.PI * 25 }}
                          animate={{ strokeDashoffset: Math.PI * 25 * (1 - evaluation.voiceInsights.confidenceScore / 100) }}
                          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                        />
                        <text x="30" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#5b21b6">
                          {evaluation.voiceInsights.confidenceScore}%
                        </text>
                      </svg>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Confidence</span>
                    </div>
                    {/* Clarity */}
                    <div className="bg-white/80 rounded-xl p-3 flex flex-col items-center gap-1.5 border border-violet-100">
                      <svg width="60" height="36" viewBox="0 0 60 36">
                        <path d="M5 35 A25 25 0 0 1 55 35" fill="none" stroke="#ddd6fe" strokeWidth="5" strokeLinecap="round" />
                        <motion.path d="M5 35 A25 25 0 0 1 55 35" fill="none" stroke="#4f46e5" strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={String(Math.PI * 25)}
                          initial={{ strokeDashoffset: Math.PI * 25 }}
                          animate={{ strokeDashoffset: Math.PI * 25 * (1 - evaluation.voiceInsights.clarity / 100) }}
                          transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                        />
                        <text x="30" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#3730a3">
                          {evaluation.voiceInsights.clarity}%
                        </text>
                      </svg>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Clarity</span>
                    </div>
                    {/* Pace */}
                    <div className="bg-white/80 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 border border-violet-100">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        evaluation.voiceInsights.pace.toLowerCase().includes('good') ? 'bg-emerald-100 text-emerald-700' :
                        evaluation.voiceInsights.pace.toLowerCase().includes('fast') ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {evaluation.voiceInsights.pace}
                      </span>
                      <p className="text-xs text-gray-500 font-semibold">{evaluation.voiceInsights.wpm} wpm</p>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pace</span>
                    </div>
                  </div>

                  {/* Tone badge */}
                  <div className="px-5 pb-4 flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-semibold">Tone:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      evaluation.voiceInsights.tone === 'Confident' ? 'bg-emerald-100 text-emerald-700' :
                      evaluation.voiceInsights.tone === 'Engaging' ? 'bg-violet-100 text-violet-700' :
                      evaluation.voiceInsights.tone === 'Nervous' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {evaluation.voiceInsights.tone}
                    </span>
                    {evaluation.voiceInsights.verdict && (
                      <span className="ml-auto text-xs text-gray-600 italic">{evaluation.voiceInsights.verdict}</span>
                    )}
                  </div>

                  {/* Delivery tips */}
                  {evaluation.voiceInsights.tips.length > 0 && (
                    <div className="px-5 pb-5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Delivery Tips</p>
                      <ul className="space-y-1.5">
                        {evaluation.voiceInsights.tips.map((tip, i) => (
                          <motion.li key={i}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35 + i * 0.08 }}
                            className="flex items-start gap-2 text-xs text-gray-700"
                          >
                            <span className="w-4 h-4 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            {tip}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Next button */}
              <button
                onClick={handleNextQuestion}
                className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
              >
                {currentIdx + 1 < questions.length
                  ? <><FiChevronRight className="w-5 h-5" /> Next Question</>
                  : <><FiAward className="w-5 h-5" /> Finish Session &amp; See Summary</>
                }
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default InterviewPractice;
