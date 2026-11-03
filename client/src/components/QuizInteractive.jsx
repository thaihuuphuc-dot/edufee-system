import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, RefreshCw } from 'lucide-react';

export default function QuizInteractive({ quizzes }) {
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState({});

  if (!quizzes || quizzes.length === 0) return null;

  const handleSelect = (quizId, val) => {
    if (submitted[quizId]) return;
    setUserAnswers(prev => ({ ...prev, [quizId]: val }));
  };

  const handleCheck = (quizId) => {
    if (!userAnswers[quizId]) return;
    setSubmitted(prev => ({ ...prev, [quizId]: true }));
  };

  const handleReset = (quizId) => {
    setUserAnswers(prev => ({ ...prev, [quizId]: '' }));
    setSubmitted(prev => ({ ...prev, [quizId]: false }));
  };

  return (
    <div className="mt-6 border-t border-slate-700/80 pt-5">
      <h4 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-indigo-400" />
        Bài tập Luyện tập Tương tác ({quizzes.length} câu)
      </h4>

      <div className="space-y-4">
        {quizzes.map((q, idx) => {
          const qId = q.id || q._id || String(idx);
          const isSubmitted = submitted[qId];
          const userAns = (userAnswers[qId] || '').trim().toLowerCase();
          const correctAns = (q.correctAnswer || '').trim().toLowerCase();
          const isCorrect = userAns === correctAns;

          return (
            <div key={qId} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-slate-200 text-sm">
                  <span className="font-bold text-indigo-400 mr-1.5">Câu {idx + 1}:</span>
                  {q.question}
                </p>
                {isSubmitted && (
                  isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Chính xác
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <XCircle className="w-3.5 h-3.5" /> Chưa đúng
                    </span>
                  )
                )}
              </div>

              {/* Dạng 1: Trắc nghiệm (Multiple Choice) */}
              {q.type === 'multiple_choice' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options?.map((opt, oIdx) => {
                    const optKey = String.fromCharCode(65 + oIdx); // A, B, C, D
                    const isSelected = userAnswers[qId] === optKey;
                    
                    let btnStyle = "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700";
                    if (isSubmitted) {
                      if (optKey.toLowerCase() === correctAns) btnStyle = "bg-emerald-600/30 border-emerald-500 text-emerald-300 font-semibold";
                      else if (isSelected && !isCorrect) btnStyle = "bg-rose-600/30 border-rose-500 text-rose-300";
                    } else if (isSelected) {
                      btnStyle = "bg-indigo-600 border-indigo-500 text-white font-medium";
                    }

                    return (
                      <button
                        key={oIdx}
                        disabled={isSubmitted}
                        onClick={() => handleSelect(qId, optKey)}
                        className={`text-left px-3.5 py-2.5 rounded-lg border text-xs transition duration-150 flex items-center gap-2 ${btnStyle}`}
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-900/40 flex items-center justify-center font-bold text-[10px]">
                          {optKey}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Dạng 2: Điền đáp số (Short Answer) */}
              {q.type === 'short_answer' && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    disabled={isSubmitted}
                    placeholder="Nhập kết quả/đáp số..."
                    value={userAnswers[qId] || ''}
                    onChange={(e) => handleSelect(qId, e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
                {!isSubmitted ? (
                  <button
                    disabled={!userAnswers[qId]}
                    onClick={() => handleCheck(qId)}
                    className="ml-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Kiểm tra đáp án
                  </button>
                ) : (
                  <button
                    onClick={() => handleReset(qId)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
                  >
                    <RefreshCw className="w-3 h-3" /> Làm lại
                  </button>
                )}
              </div>

              {isSubmitted && q.explanation && (
                <div className="mt-2 p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200">
                  <strong className="text-indigo-400 block mb-1">💡 Lời giải chi tiết:</strong>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}