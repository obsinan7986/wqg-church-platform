import React, { useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  X,
  ChevronDown
} from 'lucide-react';
import { Card } from '../../../components/ui';
import { formatTime, formatDual } from '../../../utils/dateFormat';

/**
 * LiveChatDrawer Component
 * - Comments feed & composition
 * - Like/Dislike reactions
 * - Mobile bottom sheet mode & desktop card mode
 */
const LiveChatDrawer = ({
  comments = [],
  commentInput = '',
  onCommentInputChange,
  onSendComment,
  isSendingComment = false,
  likesCount = 0,
  dislikesCount = 0,
  userLiked = false,
  userDisliked = false,
  onReaction,
  isMobileSheet = false,
  isOpen = true,
  onClose
}) => {
  const commentsEndRef = useRef(null);

  // Auto-scroll on new comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  if (isMobileSheet && !isOpen) return null;

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs font-black text-royal shrink-0">
        <span className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-gold-500" />
          <span>Yaada Kallattii (Live Comments)</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-semibold">
            {comments.length} Yaada
          </span>
          {isMobileSheet && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* REACTIONS BAR */}
      <div className="py-2.5 px-1 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-gold-500" />
          <span>Miira (Reactions):</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onReaction('like')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
              userLiked
                ? 'bg-gold-500 text-royal border-gold-500 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{likesCount}</span>
          </button>
          <button
            onClick={() => onReaction('dislike')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
              userDisliked
                ? 'bg-red-600 text-white border-red-500 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            <span>{dislikesCount}</span>
          </button>
        </div>
      </div>

      {/* COMMENTS FEED */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 text-xs custom-scrollbar">
        {comments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Yaadni ammaaf hin jiru. Kan duraa barreessaa!
          </div>
        ) : (
          comments.map((c, idx) => (
            <div
              key={c._id || idx}
              className="p-2.5 rounded-xl bg-royal-tint/60 border border-slate-200 space-y-1 shadow-sm"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-900 truncate max-w-[150px]">
                  {c.fullName}
                </span>
                <span
                  className="text-[9px] text-slate-500 cursor-help"
                  title={formatDual(c.createdAt, { includeTime: true })}
                >
                  {formatTime(c.createdAt)}
                </span>
              </div>
              {c.originChurch && (
                <span className="text-[10px] text-royal font-medium block truncate">
                  ⛪ {c.originChurch}
                </span>
              )}
              <p className="text-slate-800 leading-snug pt-0.5 whitespace-pre-wrap">
                {c.text}
              </p>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* COMPOSITION FORM */}
      <form
        onSubmit={onSendComment}
        className="pt-2.5 border-t border-slate-200 flex items-center space-x-2 shrink-0"
      >
        <input
          type="text"
          value={commentInput}
          onChange={(e) => onCommentInputChange(e.target.value)}
          placeholder="Yaada keessan asitti barreessaa..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal/30"
        />
        <button
          type="submit"
          disabled={isSendingComment || !commentInput.trim()}
          aria-label="Send comment"
          className="p-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 active:scale-95 disabled:opacity-50 text-royal font-black transition-all shadow-md shrink-0"
        >
          <Send className="w-4 h-4 text-royal" />
        </button>
      </form>
    </div>
  );

  // If mobile bottom sheet
  if (isMobileSheet) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm lg:hidden animate-in fade-in">
        <div
          className="bg-white rounded-t-3xl max-h-[75vh] h-[520px] w-full p-4 flex flex-col shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Bottom sheet drag indicator */}
          <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-3" />
          {content}
        </div>
      </div>
    );
  }

  // Desktop Card
  return (
    <Card className="p-4 shadow-sm border border-slate-200 flex flex-col h-[480px] bg-white">
      {content}
    </Card>
  );
};

export default LiveChatDrawer;
