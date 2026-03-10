import React, { useState } from 'react';
import { aiAPI } from '../services/api';
import { InterviewQuestion, InterviewEvaluation } from '../types';
import { FiCpu, FiChevronRight, FiStar, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TOPICS = ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Data Structures', 'Algorithms', 'System Design', 'SQL', 'MongoDB', 'HTML/CSS', 'Java', 'C++'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

type Stage = 'setup' | 'questions' | 'answering' | 'evaluation';

const InterviewPractice: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [stage, setStage] = useState<Stage>('setup');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [allEvaluations, setAllEvaluations] = useState<(InterviewEvaluation & { question: string })[]>([]);

  const generateQuestions = async () => {
    if (!topic) { toast.error('Please select a topic'); return; }
    setLoading(true);
    try {
      const res = await aiAPI.generateInterviewQuestions(topic, difficulty);
      setQuestions(res.data.questions as InterviewQuestion[]);
      setStage('questions');
      setCurrentIdx(0);
      setAllEvaluations([]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (err as Error)?.message || 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAnswer = () => {
    setAnswer('');
    setEvaluation(null);
    setStage('answering');
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) { toast.error('Please write an answer'); return; }
    setLoading(true);
    try {
      const currentQ = questions[currentIdx];
      const res = await aiAPI.evaluateAnswer(topic, currentQ.question, answer);
      const eval_ = res.data.evaluation as InterviewEvaluation;
      setEvaluation(eval_);
      setAllEvaluations(prev => [...prev, { ...eval_, question: currentQ.question }]);
      setStage('evaluation');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (err as Error)?.message || 'Failed to evaluate answer');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1);
      setAnswer('');
      setEvaluation(null);
      setStage('questions');
    } else {
      setStage('setup');
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const avgScore = allEvaluations.length > 0
    ? Math.round(allEvaluations.reduce((s, e) => s + e.score, 0) / allEvaluations.length * 10) / 10
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="icon-box w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600">
          <FiCpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Interview Practice</h1>
          <p className="text-sm text-gray-500">Powered by Google Gemini — Practice and get instant AI feedback</p>
        </div>
      </div>

      {/* Setup Stage */}
      {stage === 'setup' && (
        <div className="card animate-slide-up">
          {allEvaluations.length > 0 && (
            <div className="mb-6 p-4 bg-green-50 rounded-xl">
              <h3 className="font-semibold text-green-800 mb-2">Session Summary</h3>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${scoreColor(avgScore)}`}>{avgScore}/10</p>
                  <p className="text-xs text-gray-500">Avg Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{allEvaluations.length}</p>
                  <p className="text-xs text-gray-500">Questions Done</p>
                </div>
              </div>
            </div>
          )}

          <h2 className="font-semibold text-gray-900 mb-4">Configure Your Session</h2>

          <div className="mb-5">
            <label className="label">Select Topic</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {TOPICS.map(t => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={topic === t ? 'chip chip-active text-xs' : 'chip chip-gray text-xs'}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={!TOPICS.includes(topic) ? topic : ''}
              onChange={e => setTopic(e.target.value)}
              placeholder="Or type a custom topic..."
              className="input mt-2"
            />
          </div>

          <div className="mb-6">
            <label className="label">Difficulty</label>
            <div className="flex gap-3">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                    difficulty === d
                      ? d === 'easy' ? 'border-green-500 bg-green-50 text-green-700'
                        : d === 'medium' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button onClick={generateQuestions} disabled={loading || !topic} className="btn-primary w-full py-3 text-base">
            {loading ? 'Generating questions...' : 'Start Interview Session →'}
          </button>
        </div>
      )}

      {/* Questions Stage */}
      {stage === 'questions' && questions.length > 0 && (
        <div className="card animate-slide-up">
          {/* Progress */}
          <div className="flex justify-between items-center mb-4">
            <span className="badge-blue">Question {currentIdx + 1}/{questions.length}</span>
            <span className="text-sm text-gray-500">{topic} · {difficulty}</span>
          </div>
          <div className="progress-bar mb-6">
            <div
              className="progress-fill"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          <div className="mb-2">
            <span className="badge bg-purple-100 text-purple-700 mb-3">{questions[currentIdx].category}</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{questions[currentIdx].question}</h2>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-amber-800"><strong>Hint:</strong> {questions[currentIdx].hint}</p>
          </div>

          <button onClick={handleStartAnswer} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
            Write My Answer <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Answering Stage */}
      {stage === 'answering' && questions.length > 0 && (
        <div className="card animate-slide-up">
          <button onClick={() => setStage('questions')} className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-700">
            <FiArrowLeft className="w-4 h-4" /> Back to question
          </button>

          <h2 className="text-base font-semibold text-gray-900 mb-2">{questions[currentIdx].question}</h2>
          <span className="badge-blue mb-4 inline-block">Question {currentIdx + 1}/{questions.length}</span>

          <label className="label">Your Answer</label>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Write your answer here... Be thorough and explain your thinking."
            className="input mb-4"
            rows={8}
          />

          <button onClick={handleSubmitAnswer} disabled={loading || !answer.trim()} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
            {loading ? 'AI is evaluating...' : <><FiCpu className="w-4 h-4" /> Evaluate My Answer</>}
          </button>
        </div>
      )}

      {/* Evaluation Stage */}
      {stage === 'evaluation' && evaluation && (
        <div className="animate-slide-up space-y-4">
          <div className="card">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <span className={`text-2xl font-bold ${scoreColor(evaluation.score)}`}>{evaluation.score}/10</span>
              </div>
              <div>
                <p className={`text-lg font-bold ${scoreColor(evaluation.score)}`}>{evaluation.grade}</p>
                <p className="text-sm text-gray-500">Question {currentIdx + 1}/{questions.length}</p>
              </div>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">{evaluation.feedback}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card border-l-4 border-green-500">
              <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-1.5"><FiCheckCircle className="w-4 h-4" /> Strengths</h4>
              <ul className="space-y-1">
                {evaluation.strengths.map((s, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-500 mt-0.5">✓</span>{s}</li>)}
              </ul>
            </div>
            <div className="card border-l-4 border-orange-500">
              <h4 className="font-semibold text-orange-700 mb-2 flex items-center gap-1.5"><FiStar className="w-4 h-4" /> Improvements</h4>
              <ul className="space-y-1">
                {evaluation.improvements.map((s, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-orange-500 mt-0.5">→</span>{s}</li>)}
              </ul>
            </div>
          </div>

          <div className="card border-l-4 border-primary-500">
            <h4 className="font-semibold text-primary-700 mb-2">Model Answer</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{evaluation.modelAnswer}</p>
          </div>

          <button onClick={handleNextQuestion} className="btn-primary w-full py-3 text-base">
            {currentIdx + 1 < questions.length ? 'Next Question →' : 'Finish Session'}
          </button>
        </div>
      )}
    </div>
  );
};

export default InterviewPractice;
