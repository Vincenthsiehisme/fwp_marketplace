import React, { useState, useEffect, useRef } from 'react';
import { CustomerProfile, Gender, WishItem } from '../types';

interface CustomerFormProps {
  onSubmit: (profile: Omit<CustomerProfile, 'id' | 'createdAt'>) => void;
  isProcessing: boolean;
  /**
   * 由外部(tab)強制控制 isTimeUnsure 的值。
   * 傳值時:鎖定為該值,並隱藏表單內「我不確定詳細時間」checkbox。
   * 不傳:沿用原本的內部 checkbox 行為(向後相容)。
   */
  forceTimeUnsure?: boolean;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onSubmit, isProcessing, forceTimeUnsure }) => {
  const [name, setName] = useState('');
  
  // Date State (Unified Native Date Picker)
  const [dateString, setDateString] = useState('1990-01-01');
  
  // Derived state for internal logic (compatibility)
  const [year, setYear] = useState(1990);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);

  // Time State
  const [hour, setHour] = useState<string>('12');
  const [minute, setMinute] = useState<string>('00');
  const [isTimeUnsure, setIsTimeUnsure] = useState(forceTimeUnsure ?? false);

  // 由外部(tab)強制覆蓋 isTimeUnsure
  useEffect(() => {
    if (typeof forceTimeUnsure === 'boolean') {
      setIsTimeUnsure(forceTimeUnsure);
    }
  }, [forceTimeUnsure]);
  
  const [gender, setGender] = useState<Gender>(Gender.Female);
  
  // Wishes State (Array)
  const [wishes, setWishes] = useState<WishItem[]>([]);

  // Validation State
  const [showWishError, setShowWishError] = useState(false);
  const wishSectionRef = useRef<HTMLDivElement>(null);

  // Generate Time Options
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')); 
  
  // Suggested Wishes Tags
  const wishTags = ['事業運', '正偏財運', '戀愛桃花', '身體健康', '情緒穩定', '防小人', '貴人運', '改善睡眠', '學業考試'];

  // Limits
  const MAX_NAME_LENGTH = 20;
  const MAX_WISH_DESC_LENGTH = 100;
  // Visual distinction limit
  const PRIMARY_WISH_LIMIT = 3;

  // Sync date string to numbers
  useEffect(() => {
    if (dateString) {
      const parts = dateString.split('-');
      setYear(parseInt(parts[0]));
      setMonth(parseInt(parts[1]));
      setDay(parseInt(parts[2]));
    }
  }, [dateString]);

  // Clear error when wish is added
  useEffect(() => {
    if (wishes.length > 0) {
      setShowWishError(false);
    }
  }, [wishes]);

  // Scroll/Highlight Wish section when Time Unsure is toggled
  // 注意:當 isTimeUnsure 由外部 tab 控制(forceTimeUnsure 有值)時,跳過自動滾動
  // 原因:使用者只是切 tab,不應觸發頁面跳到願望區
  useEffect(() => {
    if (typeof forceTimeUnsure === 'boolean') return;
    if (isTimeUnsure && wishSectionRef.current) {
      setTimeout(() => {
        wishSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [isTimeUnsure, forceTimeUnsure]);

  // Focus Scroll Helper
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    setTimeout(() => {
       target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (wishes.length === 0) {
      setShowWishError(true);
      if (wishSectionRef.current) {
         wishSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // Format date string YYYY-MM-DD
    const birthDateStr = dateString;
    
    // Use selected time or default "12:00" if unsure
    const birthTimeStr = isTimeUnsure ? "12:00" : `${hour}:${minute}`;

    onSubmit({
      name,
      birthDate: birthDateStr,
      birthTime: birthTimeStr,
      isTimeUnsure, // Pass the flag
      gender,
      wishes
    });
  };

  const handleAddWishTag = (tag: string) => {
    if (wishes.some(w => w.type === tag)) return;
    setWishes([...wishes, { type: tag, description: '' }]);
  };

  const handleRemoveWish = (tag: string) => {
    setWishes(wishes.filter(w => w.type !== tag));
  };

  const handleWishDescriptionChange = (tag: string, value: string) => {
    if (value.length <= MAX_WISH_DESC_LENGTH) {
      setWishes(wishes.map(w => w.type === tag ? { ...w, description: value } : w));
    }
  };

  // Improved Input Class with larger min-height for touch targets (48px approx)
  const inputClass = "w-full min-h-[48px] bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-3 text-base text-white placeholder-slate-500 focus:ring-2 focus:ring-mystic-500/50 focus:border-mystic-500 outline-none transition shadow-inner backdrop-blur-sm font-sans appearance-none";

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-800/30 backdrop-blur-xl p-6 md:p-10 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] relative overflow-hidden group animate-fade-in-up">
      
      {/* Glossy sheen effect */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-mystic-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-mystic-500/20 transition duration-700"></div>

      <h2 className="relative text-2xl md:text-3xl font-bold font-sans text-white mb-8 text-center drop-shadow-md">
        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-mystic-200">輸入生辰資料</span>
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-mystic-100 mb-2 ml-1 font-sans">
            姓名 / 暱稱
          </label>
          <div className="relative">
            <input
              id="name"
              type="text"
              required
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => setName(e.target.value)}
              onFocus={handleFocus}
              className={`${inputClass} pr-12`}
              placeholder="例如：王小美"
            />
            <span className={`absolute right-3 top-3.5 text-xs font-sans transition-colors duration-200
                ${name.length >= MAX_NAME_LENGTH ? 'text-red-400 font-bold' : name.length >= MAX_NAME_LENGTH * 0.8 ? 'text-yellow-400' : 'text-slate-500'}
            `}>
              {name.length}/{MAX_NAME_LENGTH}
            </span>
          </div>
        </div>

        {/* Birth Date (Native Picker) */}
        <div>
          <label className="block text-sm font-medium text-mystic-100 mb-2 ml-1 font-sans">
            出生日期
          </label>
          <div className="relative">
             <input 
               type="date"
               required
               value={dateString}
               onChange={(e) => setDateString(e.target.value)}
               onFocus={handleFocus}
               className={`${inputClass} cursor-pointer`}
             />
             {/* Custom Icon for visual consistency */}
             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             </div>
          </div>
        </div>

        {/* Birth Time(僅在「五行手鍊」模式顯示;水晶能量手鍊模式不需出生時間) */}
        {!forceTimeUnsure && (
        <div>
          <div className="flex justify-between items-center mb-2 ml-1">
             <label className="block text-sm font-medium text-mystic-100 font-sans">
                出生時間
             </label>
             {typeof forceTimeUnsure !== 'boolean' && (
               <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={isTimeUnsure}
                    onChange={(e) => setIsTimeUnsure(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-4 h-4 border border-slate-500 rounded bg-slate-900 peer-checked:bg-mystic-500 peer-checked:border-mystic-500 transition-colors"></div>
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors select-none font-sans">
                    我不確定詳細時間
                  </span>
               </label>
             )}
          </div>
          
          <div className={`transition-all duration-300 overflow-hidden ${isTimeUnsure ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
            <div className="flex gap-2">
               <div className="relative flex-1">
                <select
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  onFocus={handleFocus}
                  className={`${inputClass} pr-8 cursor-pointer`}
                  disabled={isTimeUnsure}
                >
                  {hours.map(h => (
                    <option key={h} value={h} className="bg-slate-800 text-white">{h} 時</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400 font-sans">:</div>
              </div>
              <div className="relative flex-1">
                <select
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  onFocus={handleFocus}
                  className={`${inputClass} pr-8 cursor-pointer`}
                  disabled={isTimeUnsure}
                >
                  {minutes.map(m => (
                    <option key={m} value={m} className="bg-slate-800 text-white">{m} 分</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {isTimeUnsure && (
             <p className="text-[10px] text-yellow-500/80 mt-1.5 ml-1 font-sans border border-yellow-500/20 bg-yellow-900/10 p-2 rounded flex items-start gap-1">
               <span className="text-yellow-500 text-xs">⚡</span>
               <span>
                 啟動<strong>願望顯化模式</strong>：系統將<span className="text-white underline">完全依據</span>您的主要願望進行設計，八字僅作輔助參考。
               </span>
             </p>
          )}
        </div>
        )}

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-mystic-100 mb-2 ml-1 font-sans">
            性別
          </label>
          <div className="flex gap-3">
            {Object.values(Gender).map((g) => (
              <label key={g} className="flex-1 cursor-pointer group/radio">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={gender === g}
                  onChange={() => setGender(g)}
                  className="peer sr-only"
                />
                <div className="text-center py-3 min-h-[48px] flex items-center justify-center rounded-xl border border-slate-600/50 bg-slate-900/30 text-slate-300 peer-checked:bg-mystic-600 peer-checked:border-mystic-400 peer-checked:text-white peer-checked:shadow-[0_0_15px_rgba(192,38,211,0.4)] transition-all duration-300 ease-out hover:bg-slate-800/50 font-sans">
                  {g}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Wishes (Array Structure) - Ref and Validation Classes Added */}
        <div 
           ref={wishSectionRef}
           className={`transition-all duration-500 rounded-xl p-3 -m-3 ${
             showWishError ? 'animate-shake border border-red-500/50 bg-red-900/10' : 
             isTimeUnsure ? 'border border-gold-500/30 bg-gold-900/5 shadow-[0_0_20px_rgba(251,191,36,0.1)]' : 'border border-transparent'
           }`}
        >
          <div className="flex justify-between items-baseline mb-2 ml-1">
             <label className={`block text-sm font-medium font-sans transition-colors ${showWishError ? 'text-red-400' : isTimeUnsure ? 'text-gold-400' : 'text-mystic-100'}`}>
               {isTimeUnsure ? '🔮 願望與困擾 (設計核心)' : '願望與困擾'} {showWishError && <span className="text-xs ml-2">(*請至少選擇一項)</span>}
             </label>
             <span className="text-xs text-slate-400 font-sans">
                (已選 {wishes.length} 項)
             </span>
          </div>
          
          <div className={`bg-slate-900/40 p-3 rounded-lg border mb-3 transition-colors ${isTimeUnsure ? 'border-gold-500/20' : 'border-slate-700/50'}`}>
             <p className={`text-xs font-sans mb-1 font-bold ${isTimeUnsure ? 'text-gold-400' : 'text-mystic-400'}`}>
                ✦ 能量聚焦提示 ✦
             </p>
             <span className="text-xs text-slate-400 block font-sans leading-relaxed">
                 {isTimeUnsure ? (
                    <>
                       因時辰未定，<strong className="text-white">前 {PRIMARY_WISH_LIMIT} 項願望</strong>將成為「絕對核心」，設計師會專注於這幾項水晶。<strong>第 4 項起僅供參考</strong>，不會混入設計以免能量發散。
                    </>
                 ) : (
                    <>
                       前 <strong className="text-white">{PRIMARY_WISH_LIMIT}</strong> 項將設為「主要訴求」，設計師將以此為核心進行水晶搭配。<br/>
                       第 4 項起將列為「次要」，僅作為輔助參考。
                    </>
                 )}
             </span>
          </div>
          
          {/* Quick Tags Selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-slate-500 w-full mb-1 font-sans">點擊新增項目：</span>
            {wishTags.map(tag => {
              const isActive = wishes.some(w => w.type === tag);
              return (
                <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddWishTag(tag)}
                    disabled={isActive}
                    className={`text-xs px-3 py-2 rounded-full transition-all duration-200 border font-sans min-h-[36px]
                      ${isActive 
                        ? 'bg-mystic-900/50 border-mystic-500/30 text-mystic-400 cursor-default opacity-50' 
                        : 'bg-slate-800 hover:bg-mystic-700 border-slate-600 hover:border-mystic-500 text-slate-300 hover:text-white'
                      }`}
                >
                    {isActive ? '✓ ' : '+ '}{tag}
                </button>
              );
            })}
          </div>

          {/* Active Wishes List */}
          <div className="space-y-3 relative">
            {wishes.length === 0 && (
              <div className={`text-center py-6 text-sm border border-dashed rounded-xl font-sans transition-colors
                  ${showWishError ? 'text-red-300 border-red-500/30 bg-red-500/5' : 'text-slate-500 border-slate-700'}
              `}>
                 請從上方選擇您想改善的運勢
              </div>
            )}
            
            {wishes.map((item, index) => {
              const isPrimary = index < PRIMARY_WISH_LIMIT;
              const showDivider = index === PRIMARY_WISH_LIMIT && wishes.length > PRIMARY_WISH_LIMIT;

              return (
                <React.Fragment key={item.type}>
                    {/* Visual Divider for Secondary Wishes */}
                    {showDivider && (
                        <div className="flex items-center gap-2 py-2 opacity-60">
                            <div className="h-px bg-slate-700 flex-1"></div>
                            <span className="text-[10px] text-slate-500 font-sans uppercase tracking-widest">以下為輔助參考 (不列入設計)</span>
                            <div className="h-px bg-slate-700 flex-1"></div>
                        </div>
                    )}

                    <div className={`rounded-xl p-3 animate-fade-in-up transition-all duration-300 relative overflow-hidden
                        ${isPrimary 
                            ? 'bg-slate-800/80 border border-mystic-500/40 shadow-[0_0_15px_rgba(192,38,211,0.05)]' 
                            : 'bg-slate-900/40 border border-slate-700/30 opacity-70 grayscale-[0.3]'
                        }
                    `} style={{ animationDelay: `${index * 100}ms` }}>
                    
                    {/* Background indicator for primary */}
                    {isPrimary && <div className="absolute top-0 right-0 w-20 h-20 bg-mystic-500/5 rounded-full blur-xl pointer-events-none -mr-5 -mt-5"></div>}

                    <div className="flex justify-between items-center mb-2 relative z-10">
                        <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium font-sans ${isPrimary ? 'bg-mystic-600 text-white shadow-sm' : 'bg-slate-700 text-slate-400'}`}>
                            {item.type}
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider font-sans flex items-center gap-1 ${isPrimary ? 'text-gold-400' : 'text-slate-500'}`}>
                            {isPrimary ? (
                                <>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                主要願望
                                </>
                            ) : '次要'}
                        </span>
                        </div>
                        <button 
                        type="button" 
                        onClick={() => handleRemoveWish(item.type)}
                        className="text-slate-500 hover:text-red-400 transition p-1"
                        >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="relative z-10">
                        <textarea
                        rows={2}
                        value={item.description}
                        maxLength={MAX_WISH_DESC_LENGTH}
                        onChange={(e) => handleWishDescriptionChange(item.type, e.target.value)}
                        onFocus={handleFocus}
                        className={`w-full bg-slate-900/50 border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:ring-1 outline-none resize-none font-sans transition-all
                            ${isPrimary ? 'border-slate-600 focus:border-mystic-500/50 focus:ring-mystic-500/50' : 'border-slate-800 focus:border-slate-600 focus:ring-slate-700 text-slate-400'}
                        `}
                        placeholder={`請簡述需求 (選填，限${MAX_WISH_DESC_LENGTH}字)...`}
                        />
                        <div className={`absolute bottom-2 right-2 text-[10px] font-sans transition-colors duration-200
                        ${item.description.length >= MAX_WISH_DESC_LENGTH ? 'text-red-400 font-bold' : item.description.length >= MAX_WISH_DESC_LENGTH * 0.8 ? 'text-yellow-400' : 'text-slate-600'}
                        `}>
                        {item.description.length}/{MAX_WISH_DESC_LENGTH}
                        </div>
                    </div>
                    </div>
                </React.Fragment>
              );
            })}
          </div>
          
          {/* Explicit Error Message below the section */}
          {showWishError && (
             <p className="text-center text-red-400 text-xs mt-3 font-bold animate-pulse font-sans">
                ⚠ 請至少選擇一項願望或困擾以進行分析
             </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full py-4 rounded-xl font-bold text-lg tracking-widest shadow-lg transition-all duration-300 transform font-sans min-h-[56px]
            ${isProcessing 
              ? 'bg-slate-700/50 cursor-not-allowed text-slate-400' 
              : isTimeUnsure
                ? 'bg-gradient-to-r from-gold-600 via-yellow-600 to-gold-600 bg-[length:200%_auto] text-white hover:scale-[1.02] shadow-gold-600/30'
                : 'bg-gradient-to-r from-mystic-600 via-purple-600 to-mystic-600 bg-[length:200%_auto] hover:bg-[position:right_center] text-white hover:scale-[1.02] active:scale-[0.98] shadow-mystic-600/30'
            }`}
        >
          {isProcessing ? '能量運算中...' : isTimeUnsure ? '啟動願望顯化分析' : '開始八字運算'}
        </button>
      </form>
    </div>
  );
};

export default CustomerForm;
