
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Send, Trash2, CalendarDays, MoreHorizontal, Heart, MessageCircle, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PlanningPost, Comment } from '../types';

interface WeeklyPlanningProps {
  isDarkMode: boolean;
}

const WeeklyPlanning: React.FC<WeeklyPlanningProps> = ({ isDarkMode }) => {
  const [posts, setPosts] = useState<PlanningPost[]>(() => {
    try {
      const saved = localStorage.getItem('patternPro_planning');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [newContent, setNewContent] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  
  // State for handling comments
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    localStorage.setItem('patternPro_planning', JSON.stringify(posts));
  }, [posts]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Fix: Explicitly cast Array.from(files) to File[] to resolve 'unknown' type inference and property 'size' errors
    (Array.from(files) as File[]).forEach(file => {
        // Fix: file is now correctly typed as File
        if (file.size > 5 * 1024 * 1024) {
          alert("File too large. Please select an image under 5MB.");
          return;
        }

        const reader = new FileReader();
        // Fix: file is now correctly recognized as a Blob for readAsDataURL
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const scaleSize = MAX_WIDTH / img.width;
            const newWidth = scaleSize < 1 ? MAX_WIDTH : img.width;
            const newHeight = scaleSize < 1 ? img.height * scaleSize : img.height;

            canvas.width = newWidth;
            canvas.height = newHeight;
            
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, newWidth, newHeight);
            
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            setNewImages(prev => [...prev, compressedBase64]);
          };
        };
    });
  };

  const removeImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = () => {
    if (!newContent.trim() && newImages.length === 0) return;

    const post: PlanningPost = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      content: newContent,
      images: newImages,
      likes: 0,
      comments: []
    };

    setPosts([post, ...posts]);
    setNewContent('');
    setNewImages([]);
  };

  const deletePost = (id: string) => {
    if (confirm('Delete this post?')) {
      setPosts(posts.filter(p => p.id !== id));
    }
  };

  const toggleLike = (id: string) => {
    setPosts(posts.map(p => {
      if (p.id === id) {
        return { ...p, likes: p.likes + 1 };
      }
      return p;
    }));
  };

  const handleCommentSubmit = (postId: string) => {
     if (!commentText.trim()) return;

     const newComment: Comment = {
       id: crypto.randomUUID(),
       author: 'Trader', // Default name
       text: commentText,
       timestamp: Date.now()
     };

     setPosts(posts.map(p => {
       if (p.id === postId) {
         return { ...p, comments: [...(p.comments || []), newComment] };
       }
       return p;
     }));
     setCommentText('');
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const cardBg = isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-slate-200';
  const textColor = isDarkMode ? 'text-zinc-200' : 'text-slate-800';
  const secondaryText = isDarkMode ? 'text-zinc-500' : 'text-slate-500';

  return (
    <div className="flex flex-col h-full items-center overflow-hidden">
      <div className="w-full max-w-2xl flex flex-col h-full gap-6">
        
        {/* Create Post Card */}
        <div className={`shrink-0 p-4 rounded-2xl border backdrop-blur-xl shadow-lg ${cardBg}`}>
          <div className="flex gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'} text-white font-bold`}>
              TR
            </div>
            <div className="flex-1">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What's your plan for next week?"
                rows={3}
                className={`w-full bg-transparent resize-none outline-none text-sm placeholder-opacity-50 ${textColor} ${isDarkMode ? 'placeholder-zinc-600' : 'placeholder-slate-400'}`}
              />
              
              {newImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {newImages.map((img, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden group w-20 h-20 border border-zinc-700/50">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full hover:bg-rose-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {newImages.length < 4 && (
                    <label className={`w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-opacity-50 transition-colors ${isDarkMode ? 'border-zinc-700 hover:bg-zinc-800' : 'border-slate-200 hover:bg-slate-50'}`}>
                         <Plus className={`w-6 h-6 ${secondaryText}`} />
                         <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
              )}

              <div className={`flex items-center justify-between mt-4 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                <label className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors px-3 py-2 rounded-lg ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-50 hover:bg-slate-100'}`}>
                  <ImageIcon className="w-4 h-4" />
                  <span>Add Photos</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
                
                <button
                  onClick={handlePost}
                  disabled={!newContent.trim() && newImages.length === 0}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all
                    ${(!newContent.trim() && newImages.length === 0) 
                      ? 'opacity-50 cursor-not-allowed bg-zinc-700 text-zinc-400' 
                      : (isDarkMode ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20')}`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Post Plan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-20">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <CalendarDays className={`w-12 h-12 mb-4 ${isDarkMode ? 'text-zinc-700' : 'text-slate-300'}`} />
              <p className={`text-sm ${secondaryText}`}>No plans posted yet. Start preparing for the week!</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className={`p-4 rounded-2xl border backdrop-blur-sm animate-fade-in ${cardBg}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'} text-white font-bold text-sm shadow-lg`}>
                      TR
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${textColor}`}>Trader</h3>
                      <p className={`text-[10px] ${secondaryText}`}>{getRelativeTime(post.timestamp)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => deletePost(post.id)}
                    className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-600 hover:text-rose-500' : 'hover:bg-slate-100 text-slate-400 hover:text-rose-500'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className={`text-sm leading-relaxed mb-4 whitespace-pre-wrap font-medium ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {post.content}
                </div>

                {post.images && post.images.length > 0 && (
                  <div className={`grid gap-2 mb-4 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {post.images.map((img, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden border border-zinc-700/20">
                         <img src={img} alt="Plan attachment" className="w-full object-cover max-h-60" />
                      </div>
                    ))}
                  </div>
                )}

                <div className={`flex items-center gap-6 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                  <button 
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-2 text-xs font-bold transition-colors group ${post.likes > 0 ? 'text-rose-500' : secondaryText} hover:text-rose-500`}
                  >
                    <Heart className={`w-4 h-4 ${post.likes > 0 ? 'fill-current' : 'group-hover:scale-110 transition-transform'}`} />
                    <span>{post.likes > 0 ? post.likes : 'Like'}</span>
                  </button>
                  <button 
                    onClick={() => setOpenCommentsId(openCommentsId === post.id ? null : post.id)}
                    className={`flex items-center gap-2 text-xs font-bold transition-colors ${secondaryText} hover:text-indigo-500`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.comments?.length || 0} Comments</span>
                  </button>
                  <button className={`flex items-center gap-2 text-xs font-bold transition-colors ${secondaryText} hover:text-indigo-500 ml-auto`}>
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Comment Section */}
                {openCommentsId === post.id && (
                  <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                    {/* List */}
                    <div className="space-y-3 mb-4 max-h-48 overflow-y-auto custom-scrollbar">
                      {post.comments?.length === 0 && <p className={`text-xs text-center italic ${secondaryText}`}>No comments yet.</p>}
                      {post.comments?.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-zinc-700' : 'bg-slate-200'} text-[10px] font-bold`}>
                              {comment.author.substring(0,2).toUpperCase()}
                           </div>
                           <div className={`flex-1 rounded-lg px-3 py-2 text-xs ${isDarkMode ? 'bg-zinc-800/50' : 'bg-slate-50'}`}>
                              <div className="flex justify-between items-baseline mb-1">
                                <span className={`font-bold ${textColor}`}>{comment.author}</span>
                                <span className="text-[9px] opacity-50">{getRelativeTime(comment.timestamp)}</span>
                              </div>
                              <p className={secondaryText}>{comment.text}</p>
                           </div>
                        </div>
                      ))}
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                      <input 
                         type="text" 
                         value={commentText}
                         onChange={(e) => setCommentText(e.target.value)}
                         placeholder="Write a comment..."
                         className={`flex-1 rounded-lg px-3 py-2 text-xs outline-none ${isDarkMode ? 'bg-zinc-950 border border-zinc-800 focus:border-indigo-500' : 'bg-white border border-slate-200 focus:border-indigo-500'}`}
                         onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                      />
                      <button 
                         onClick={() => handleCommentSubmit(post.id)}
                         disabled={!commentText.trim()}
                         className={`p-2 rounded-lg ${!commentText.trim() ? 'opacity-50' : 'hover:bg-indigo-500 hover:text-white'} ${isDarkMode ? 'text-zinc-400' : 'text-slate-400'}`}
                      >
                         <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlanning;
