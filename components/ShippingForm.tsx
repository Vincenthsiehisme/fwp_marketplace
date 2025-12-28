import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ShippingDetails, PricingStrategy } from '../types';
import { COUPON_CONFIG } from '../config/coupons';

interface ShippingFormProps {
  onSubmit: (details: ShippingDetails) => void;
  isSubmitting?: boolean;
  pricingStrategy: PricingStrategy;
}

const STORAGE_KEY = 'fwp_shipping_draft_v1';

const ShippingForm: React.FC<ShippingFormProps> = ({ onSubmit, isSubmitting = false, pricingStrategy }) => {
  const isStandard = pricingStrategy.type === 'standard';
  const cartItems = pricingStrategy.cartItems || [];

  // --- Lazy Initialization Strategy ---
  const initialDraft = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to parse draft", e);
      return {};
    }
  }, []);

  const [hasRestoredData, setHasRestoredData] = useState(false);

  // Initialize states with saved data or defaults
  const [realName, setRealName] = useState(initialDraft.realName || '');
  const [phone, setPhone] = useState(initialDraft.phone || '');
  const [storeCode, setStoreCode] = useState(initialDraft.storeCode || '');
  const [storeName, setStoreName] = useState(initialDraft.storeName || '');
  const [socialId, setSocialId] = useState(initialDraft.socialId || '');
  
  const [wristSize, setWristSize] = useState(() => {
      if (initialDraft.wristSize) return initialDraft.wristSize;
      return isStandard ? '14' : '';
  });
  
  const [isCustomSize, setIsCustomSize] = useState(() => {
      if (isStandard && initialDraft.wristSize && initialDraft.wristSize !== '14') return true;
      return false;
  });

  const [purificationBagQty, setPurificationBagQty] = useState(initialDraft.purificationBagQty || 0);
  const [preferredColors, setPreferredColors] = useState<string[]>(initialDraft.preferredColors || []);
  
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, amount: number} | null>(null);
  const [couponError, setCouponError] = useState('');

  const [agreed, setAgreed] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const [showMapModal, setShowMapModal] = useState(false);
  const [isUrlCopied, setIsUrlCopied] = useState(false); 

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakingField, setShakingField] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const storeCodeRef = useRef<HTMLInputElement>(null);
  const storeNameRef = useRef<HTMLInputElement>(null);
  const socialRef = useRef<HTMLInputElement>(null);
  const wristRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLDivElement>(null);

  const PURIFICATION_BAG_COST = 200;

  const baseQty = pricingStrategy.type === 'custom' ? 1 : 0;
  const totalQuantity = baseQty + cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const baseSubtotal = pricingStrategy.type === 'custom' ? pricingStrategy.basePrice : 0;
  const subtotal = baseSubtotal + cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const isSurchargeApplicable = isStandard
    ? isCustomSize
    : (wristSize !== '' && !isNaN(Number(wristSize)) && Number(wristSize) >= pricingStrategy.sizeThreshold);
  
  const surchargeTotal = isSurchargeApplicable ? (pricingStrategy.surcharge * totalQuantity) : 0;
  
  const couponDiscountPerItem = appliedCoupon ? appliedCoupon.amount : 0;
  const totalDiscount = couponDiscountPerItem * totalQuantity;

  const baseTotal = 
    subtotal + 
    pricingStrategy.shippingCost + 
    surchargeTotal + 
    (purificationBagQty * PURIFICATION_BAG_COST);

  const totalPrice = Math.max(0, baseTotal - totalDiscount);

  const availableColors = ['紅', '橙', '黃', '綠', '藍', '紫', '白', '黑', '粉'];
  const colorMap: Record<string, string> = {
    '紅': 'bg-red-600', '橙': 'bg-orange-500', '黃': 'bg-yellow-400',
    '綠': 'bg-emerald-600', '藍': 'bg-blue-600', '紫': 'bg-purple-600',
    '白': 'bg-slate-100 border border-slate-300', '黑': 'bg-slate-900 border border-slate-600',
    '粉': 'bg-pink-400',
  };

  useEffect(() => {
    const draft = {
      realName, phone, storeCode, storeName, socialId, wristSize, purificationBagQty, preferredColors
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    
    if (realName) clearError('realName');
    if (phone) clearError('phone');
    if (storeCode) clearError('storeCode');
    if (storeName) clearError('storeName');
    if (socialId) clearError('socialId');
    if (wristSize) clearError('wristSize');
    if (agreed) clearError('agreement');

  }, [realName, phone, storeCode, storeName, socialId, wristSize, purificationBagQty, preferredColors, agreed]);

  useEffect(() => {
    if (initialDraft.realName || initialDraft.storeCode) {
      setHasRestoredData(true);
      const timer = setTimeout(() => setHasRestoredData(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [initialDraft]);

  useEffect(() => {
    if (showMapModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showMapModal]);

  const clearError = (field: string) => {
    setErrors(prev => {
        if (!prev[field]) return prev;
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
    });
  };

  const triggerShake = (field: string) => {
    setShakingField(field);
    if (navigator.vibrate) navigator.vibrate(200);
    setTimeout(() => setShakingField(null), 500);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const target = e.target;
    setTimeout(() => {
       target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length < phone.length) {
        setPhone(val);
        return;
    }
    const rawValue = val.replace(/[^\d]/g, '');
    const truncated = rawValue.slice(0, 10);
    
    let formatted = truncated;
    if (truncated.length > 7) {
      formatted = `${truncated.slice(0, 4)}-${truncated.slice(4, 7)}-${truncated.slice(7)}`;
    } else if (truncated.length > 4) {
      formatted = `${truncated.slice(0, 4)}-${truncated.slice(4)}`;
    }
    setPhone(formatted);
  };

  const handleStoreCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > 8) {
       const codeMatch = val.match(/(\d{6})/);
       if (codeMatch) {
          setStoreCode(codeMatch[0]);
          clearError('storeCode');
          
          let possibleName = val.replace(codeMatch[0], '')
              .replace(/7-11/gi, '')
              .replace(/店號/g, '')
              .replace(/[()（）]/g, ' ') 
              .replace(/門市/g, '門市 ') 
              .trim();
          
          const nameMatch = possibleName.match(/(\S+門市)/);
          if (nameMatch) {
             setStoreName(nameMatch[0]);
             clearError('storeName');
          } else {
             const parts = possibleName.split(/\s+/);
             if (parts.length > 0 && parts[0].length >= 2) {
                 setStoreName(parts[0]);
                 clearError('storeName');
             }
          }
          return;
       }
    }
    const cleanVal = val.replace(/\D/g, '').slice(0, 6);
    setStoreCode(cleanVal);
  };
  
  const handleWristSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      val = val.replace(/cm/i, '').replace(/[^\d.]/g, '');
      const parts = val.split('.');
      if (parts.length > 2) return;
      setWristSize(val);
  };

  const toggleColor = (color: string) => {
      if (preferredColors.includes(color)) {
          setPreferredColors(preferredColors.filter(c => c !== color));
      } else {
          setPreferredColors([...preferredColors, color]);
      }
  };

  const handleApplyCoupon = () => {
      setCouponError('');
      if (!couponInput.trim()) return;

      if (!COUPON_CONFIG.isEnabled) {
          setCouponError('目前無進行中的優惠活動');
          return;
      }

      if (couponInput.trim().toUpperCase() === COUPON_CONFIG.code.toUpperCase()) {
          setAppliedCoupon({
              code: COUPON_CONFIG.code,
              amount: COUPON_CONFIG.discountAmount
          });
          setCouponError('');
      } else {
          setCouponError('優惠碼無效或已過期');
          setAppliedCoupon(null);
      }
  };

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!realName.trim()) newErrors.realName = "請填寫真實姓名，以利取貨核對";
    const cleanPhone = phone.replace(/\D/g, '');
    let finalPhone = phone;
    if (!/^09\d{8}$/.test(cleanPhone)) newErrors.phone = "請輸入有效的 10 碼手機號碼 (09開頭)";
    else {
        finalPhone = `${cleanPhone.slice(0,4)}-${cleanPhone.slice(4,7)}-${cleanPhone.slice(7)}`;
        setPhone(finalPhone);
    }
    if (!/^\d{6}$/.test(storeCode)) newErrors.storeCode = "7-11 店號需為 6 碼數字";
    if (!storeName.trim()) newErrors.storeName = "請輸入店名";
    if (!socialId.trim()) newErrors.socialId = "請填寫 IG 或 FB 帳號";
    
    const sizeNum = parseFloat(wristSize);
    if (!wristSize || isNaN(sizeNum) || sizeNum <= 0 || sizeNum > 30) {
        newErrors.wristSize = "請輸入有效的手圍 (cm)";
    } 

    if (!agreed) newErrors.agreement = "請先閱讀並勾選同意購買須知";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
        const firstField = Object.keys(newErrors)[0];
        triggerShake(firstField);
        const refs: Record<string, React.RefObject<HTMLElement>> = {
            realName: nameRef, phone: phoneRef, storeCode: storeCodeRef, storeName: storeNameRef, socialId: socialRef, wristSize: wristRef, agreement: agreementRef
        };
        const targetRef = refs[firstField];
        if (targetRef && targetRef.current) {
            targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (targetRef.current instanceof HTMLInputElement) targetRef.current.focus();
        }
        return;
    }

    localStorage.removeItem(STORAGE_KEY);

    onSubmit({
      realName: realName.trim(),
      phone: finalPhone, 
      storeCode: storeCode, 
      storeName: storeName.trim(),
      socialId: socialId.trim(),
      wristSize: wristSize,
      purificationBagQty: purificationBagQty,
      preferredColors: preferredColors,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      discountAmount: totalDiscount,
      totalQuantity: totalQuantity,
      items: cartItems,
      totalPrice: totalPrice
    });
  };

  const handleCopyMapUrl = () => {
    const url = "https://emap.pcsc.com.tw/";
    navigator.clipboard.writeText(url).then(() => {
        setIsUrlCopied(true);
        setTimeout(() => setIsUrlCopied(false), 2000);
    }).catch(() => {
        alert("無法自動複製，請手動長按網址複製");
    });
  };

  const getInputClass = (field: string) => `
    w-full bg-slate-900/50 border rounded-xl px-4 py-3 text-base text-white placeholder-slate-500 
    outline-none transition-all duration-300 shadow-inner backdrop-blur-sm font-sans
    ${errors[field] 
       ? 'border-red-500/80 ring-2 ring-red-500/20 bg-red-900/10' 
       : 'border-slate-600/50 focus:ring-2 focus:ring-mystic-500/50 focus:border-mystic-500'}
    ${shakingField === field ? 'animate-shake' : ''}
  `;

  const buttonGradient = isStandard 
      ? 'from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500' 
      : 'from-mystic-600 to-purple-600 hover:from-mystic-500 hover:to-purple-500';

  const mapModalContent = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 font-sans touch-none" style={{ margin: 0 }}>
        <div 
           className="absolute inset-0 bg-black/90 backdrop-blur-md animate-fade-in" 
           onClick={() => setShowMapModal(false)}
        ></div>
        <div 
          className="relative z-10 bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-[320px] shadow-2xl animate-scale-in flex flex-col gap-5 text-center"
          onClick={(e) => e.stopPropagation()}
        >
            <div>
                <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner border border-slate-700">
                    🌏
                </div>
                <h3 className="text-xl font-bold text-white mb-2">7-11 門市查詢</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                    為避免瀏覽器兼容問題<br/>
                    請複製網址至 <span className="text-white">Safari</span> 或 <span className="text-white">Chrome</span> 開啟
                </p>
            </div>
            <div 
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 group cursor-pointer active:scale-95 transition-transform" 
                onClick={handleCopyMapUrl}
            >
                <div className="text-left overflow-hidden pl-2">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-0.5">Map URL</p>
                    <p className="text-sm text-blue-400 font-mono truncate">emap.pcsc.com.tw</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 shadow-lg ${isUrlCopied ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'}`}>
                    {isUrlCopied ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                    )}
                </div>
            </div>
            <button 
                onClick={() => setShowMapModal(false)} 
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold tracking-wide shadow-lg"
            >
                查詢完畢，返回填寫
            </button>
        </div>
    </div>
  );

  return (
    <div className="mt-8 bg-slate-800/40 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden animate-fade-in-up">
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[50px] rounded-full pointer-events-none"></div>
      
      {hasRestoredData && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up">
            <div className="bg-emerald-600/90 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold backdrop-blur-md border border-emerald-400/30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                已自動恢復您的填寫資料
            </div>
        </div>
      )}

      {showMapModal && createPortal(mapModalContent, document.body)}

      <div className="bg-slate-900/60 rounded-xl p-5 border border-gold-500/30 mb-8 relative overflow-hidden shadow-lg">
         <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/10 blur-[40px] rounded-full pointer-events-none"></div>
         <div className="mb-5 border-b border-white/10 pb-3">
            <h4 className="text-gold-400 font-bold flex items-center gap-2 text-lg font-sans">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                訂製規格與費用
            </h4>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold mt-2 ml-7 font-sans">
               🗓️ 2026/2/2 起依序出貨
            </div>
         </div>
         <div className="space-y-6">
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
               <label className={`text-sm font-medium font-sans flex items-center gap-2 mb-3 ${errors.wristSize ? 'text-red-400' : 'text-white'}`}>
                 <span>📏 手圍尺寸 (cm)</span>
                 {!isStandard && <span className="text-red-400 text-xs bg-red-900/20 px-1.5 py-0.5 rounded border border-red-500/20">*必填</span>}
               </label>
               {isStandard ? (
                   <div className="space-y-4">
                       {!isCustomSize && (
                           <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-green-500/30">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div>
                                    <p className="text-white text-sm font-bold font-sans">固定手圍 14cm</p>
                                    <p className="text-xs text-slate-400 font-sans">若有其他尺寸需求，請勾選客製選項</p>
                                </div>
                           </div>
                       )}
                       <label className="flex items-center gap-3 cursor-pointer group select-none">
                            <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={isCustomSize}
                                    onChange={(e) => {
                                        setIsCustomSize(e.target.checked);
                                        if (!e.target.checked) setWristSize('14'); 
                                        else setWristSize('');
                                    }}
                                    className="peer sr-only" 
                                />
                                <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                            </div>
                            <span className={`text-sm font-sans transition-colors ${isCustomSize ? 'text-gold-400 font-bold' : 'text-slate-400'}`}>
                                客製尺寸 (每條 +NT${pricingStrategy.surcharge})
                            </span>
                       </label>
                       <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCustomSize ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="pt-2 pl-2 border-l-2 border-slate-700 ml-5">
                                <div className="relative w-full max-w-[150px]">
                                    <input
                                        ref={wristRef}
                                        type="text"
                                        value={wristSize}
                                        onChange={handleWristSizeChange}
                                        onFocus={handleFocus}
                                        className={`${getInputClass('wristSize')} text-center text-lg h-12`}
                                        placeholder="例如 15.5"
                                        inputMode="decimal"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">cm</span>
                                </div>
                                {errors.wristSize && <p className="text-xs text-red-400 animate-pulse font-sans mt-1">⚠ {errors.wristSize}</p>}
                            </div>
                       </div>
                   </div>
               ) : (
                   <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="relative w-full max-w-[150px]">
                                <input
                                    ref={wristRef}
                                    type="text"
                                    value={wristSize}
                                    onChange={handleWristSizeChange}
                                    onFocus={handleFocus}
                                    className={`${getInputClass('wristSize')} text-center text-lg`}
                                    placeholder="15.0"
                                    inputMode="decimal"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">cm</span>
                            </div>
                            <div className={`transition-all duration-300 overflow-hidden flex items-center ${isSurchargeApplicable ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                                <span className="text-xs text-gold-400 bg-gold-500/10 px-3 py-1.5 rounded-full border border-gold-500/20 whitespace-nowrap font-bold">
                                  加大費 +${pricingStrategy.surcharge}
                                </span>
                            </div>
                        </div>
                        {errors.wristSize && <p className="text-xs text-red-400 animate-pulse font-sans">⚠ {errors.wristSize}</p>}
                   </div>
               )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5 pt-4">
                <div className="flex items-center gap-3 flex-1">
                   <div className="w-8 h-8 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                   </div>
                   <div className="flex flex-col">
                       <span className="text-sm font-medium text-white">加購淨化袋 (NT$200/個)</span>
                       <span className="text-xs text-slate-400">定期淨化水晶，保持能量純淨</span>
                   </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-950 rounded-full px-2 py-1 border border-slate-700">
                    <button 
                        type="button"
                        onClick={() => setPurificationBagQty(Math.max(0, purificationBagQty - 1))}
                        className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${purificationBagQty === 0 ? 'text-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                    </button>
                    <span className="text-sm font-bold text-white w-4 text-center">{purificationBagQty}</span>
                    <button 
                        type="button"
                        onClick={() => setPurificationBagQty(purificationBagQty + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
            </div>

            <div className="bg-slate-950/50 rounded-lg p-4 flex flex-col gap-4 border border-white/5 w-full">
               {COUPON_CONFIG.isEnabled && !appliedCoupon && (
                   <div className="flex flex-col sm:flex-row gap-2 w-full">
                       <input 
                           type="text" 
                           placeholder="輸入優惠碼" 
                           value={couponInput}
                           onChange={(e) => setCouponInput(e.target.value)}
                           onFocus={handleFocus}
                           className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                       />
                       <button 
                           type="button"
                           onClick={handleApplyCoupon}
                           className="w-full sm:w-auto px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-300 hover:text-white"
                       >
                           套用
                       </button>
                   </div>
               )}
               {couponError && <p className="text-xs text-red-400 font-sans">{couponError}</p>}
               {appliedCoupon && (
                   <div className="flex items-center justify-between bg-green-900/20 border border-green-500/30 p-2 rounded-lg w-full">
                       <div className="flex items-center gap-2 overflow-hidden">
                           <span className="w-5 h-5 rounded-full bg-green-500 text-slate-900 flex items-center justify-center text-xs font-bold">✓</span>
                           <span className="text-sm text-green-400 font-sans truncate">
                               套用 {COUPON_CONFIG.eventName} (單件折 ${COUPON_CONFIG.discountAmount})
                           </span>
                       </div>
                       <button 
                           type="button" 
                           onClick={() => { setAppliedCoupon(null); setCouponInput(''); }}
                           className="text-xs text-slate-400 hover:text-white underline"
                       >
                           移除
                       </button>
                   </div>
               )}
               <div className="h-px bg-white/10 my-1"></div>
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-xs text-slate-400 space-y-1 w-full sm:w-auto font-sans">
                        <div className="flex justify-between sm:justify-start gap-4">
                            <span>商品小計 ({totalQuantity}件):</span> 
                            <span className="text-slate-200">${subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between sm:justify-start gap-4">
                            <span>運費:</span> 
                            {pricingStrategy.shippingCost > 0 ? (
                            <span className="text-slate-200">${pricingStrategy.shippingCost}</span>
                            ) : (
                            <span className="text-green-400 font-bold">免運費 (已含)</span>
                            )}
                        </div>
                        {isSurchargeApplicable && <div className="flex justify-between sm:justify-start gap-4 text-gold-500/80"><span>客製加大費 ({totalQuantity}件):</span> <span>+${surchargeTotal}</span></div>}
                        {purificationBagQty > 0 && <div className="flex justify-between sm:justify-start gap-4 text-gold-500/80"><span>淨化袋 ({purificationBagQty}個):</span> <span>+${purificationBagQty * PURIFICATION_BAG_COST}</span></div>}
                        {appliedCoupon && <div className="flex justify-between sm:justify-start gap-4 text-green-400 font-bold"><span>優惠折抵 ({totalQuantity}件):</span> <span>-${totalDiscount}</span></div>}
                    </div>
                    <div className="flex items-baseline gap-2 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0 w-full sm:w-auto justify-end">
                        <span className="text-sm text-white font-medium">總金額：</span>
                        <span className="text-3xl font-bold text-gold-400 font-sans tracking-wide">
                            ${totalPrice.toLocaleString()}
                        </span>
                    </div>
               </div>
            </div>
         </div>
      </div>

      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-bold font-sans text-white mb-2">填寫出貨資訊</h3>
      </div>

      <form onSubmit={validateAndSubmit} className="space-y-5 relative z-10">
        <div>
          <label className={`block text-sm font-medium mb-1.5 ml-1 font-sans ${errors.realName ? 'text-red-400' : 'text-mystic-100'}`}>
            真實姓名 <span className="text-slate-500 text-xs font-normal">(取貨核對用)</span>
          </label>
          <input
            ref={nameRef}
            type="text"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            onFocus={handleFocus}
            className={getInputClass('realName')}
            placeholder="例如：王小美"
          />
          {errors.realName && <p className="text-xs text-red-400 mt-1.5 animate-pulse font-sans">⚠ {errors.realName}</p>}
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1.5 ml-1 font-sans ${errors.phone ? 'text-red-400' : 'text-mystic-100'}`}>
            手機號碼
          </label>
          <input
              ref={phoneRef}
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              onFocus={handleFocus}
              className={`${getInputClass('phone')} font-mono`}
              placeholder="09xx-xxx-xxx"
              inputMode="numeric"
              maxLength={12}
          />
          {errors.phone && <p className="text-xs text-red-400 mt-1.5 animate-pulse font-sans">⚠ {errors.phone}</p>}
        </div>
        <div className={`p-5 rounded-2xl border ${errors.storeCode || errors.storeName ? 'bg-red-900/10 border-red-500/50' : 'bg-slate-900/30 border-slate-700/50'} space-y-4`}>
            <div className="flex items-center gap-2">
                 <span className="w-1.5 h-4 bg-orange-500 rounded-full"></span>
                 <label className="text-sm font-medium text-mystic-100 font-sans">7-11 店到店資訊</label>
            </div>
            <button 
                type="button"
                onClick={() => setShowMapModal(true)}
                className="w-full py-3 bg-slate-800 border border-slate-600 rounded-xl text-orange-400 font-medium text-sm flex items-center justify-center gap-2"
            >
                查詢 7-11 門市 (獲取店號)
            </button>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                    <input
                        ref={storeCodeRef}
                        type="text"
                        value={storeCode}
                        onChange={handleStoreCodeChange}
                        onFocus={handleFocus}
                        className={`${getInputClass('storeCode')} font-mono text-center`}
                        placeholder="店號 (6碼)"
                        inputMode="numeric"
                    />
                    {errors.storeCode && <p className="text-xs text-red-400 mt-1.5 animate-pulse text-center">⚠ {errors.storeCode}</p>}
                </div>
                <div>
                    <input
                        ref={storeNameRef}
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        onFocus={handleFocus}
                        className={`${getInputClass('storeName')} text-center`}
                        placeholder="門市名稱"
                    />
                        {errors.storeName && <p className="text-xs text-red-400 mt-1.5 animate-pulse text-center">⚠ {errors.storeName}</p>}
                </div>
            </div>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1.5 ml-1 font-sans ${errors.socialId ? 'text-red-400' : 'text-mystic-100'}`}>
            IG 或 FB 帳號
          </label>
          <input
            ref={socialRef}
            type="text"
            value={socialId}
            onChange={(e) => setSocialId(e.target.value)}
            onFocus={handleFocus}
            className={getInputClass('socialId')}
            placeholder="@id_123"
          />
          {errors.socialId && <p className="text-xs text-red-400 mt-1.5 animate-pulse font-sans">⚠ {errors.socialId}</p>}
        </div>
        {pricingStrategy.type === 'custom' && (
            <div>
            <label className="block text-sm font-medium text-mystic-100 mb-3 ml-1 font-sans">
                喜好色系 (多選)
            </label>
            <div className="flex flex-wrap gap-4 mb-4">
                {availableColors.map(color => {
                    const isSelected = preferredColors.includes(color);
                    const colorClass = colorMap[color] || 'bg-slate-800';
                    return (
                        <button
                            key={color}
                            type="button"
                            onClick={() => toggleColor(color)}
                            className={`relative w-10 h-10 rounded-full transition-all ${colorClass} ${isSelected ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-mystic-500 scale-110 z-10' : 'opacity-70'}`}
                        />
                    );
                })}
            </div>
            </div>
        )}
        <div 
           ref={agreementRef}
           className={`border rounded-xl overflow-hidden mt-6 ${errors.agreement ? 'border-red-500/50 bg-red-900/10' : 'border-slate-700/50 bg-slate-900/30'}`}
        >
            <button type="button" onClick={() => setIsTermsOpen(!isTermsOpen)} className="w-full flex justify-between items-center p-4 bg-slate-800/50 text-left">
               <span className={`text-sm font-medium font-sans ${errors.agreement ? 'text-red-400' : 'text-slate-200'}`}>購買須知</span>
               <span className={`transform transition-transform ${isTermsOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${isTermsOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
               <div className="p-4 text-xs text-slate-400 space-y-3 border-t border-slate-700/50 h-64 overflow-y-auto font-sans">
                  <p>1. 由於此商品屬客製化產品，因此恕不接受退換貨服務。</p>
                  <p>2. 天然石或多或少都會有冰棉裂坑或是偶有黑點，這些都是天然的共生所在，並非瑕疵或損壞。</p>
                  <p>3. 每批礦石大小、色澤皆不同，照片僅為參考示意圖。</p>
                  <p>4. 付款後請私訊 IG 確認訂單。</p>
               </div>
            </div>
         </div>
         <label className="flex items-start gap-3 mt-4 cursor-pointer group select-none">
            <div className="relative flex items-center mt-0.5">
               <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="peer sr-only" />
               <div className={`w-5 h-5 border-2 rounded ${errors.agreement ? 'border-red-500 bg-red-900/30' : 'border-slate-500 bg-slate-900/50 peer-checked:bg-mystic-600'}`} />
            </div>
            <span className={`text-sm font-sans ${errors.agreement ? 'text-red-400' : agreed ? 'text-white' : 'text-slate-400'}`}>我已詳閱並同意購買須知</span>
         </label>
         
        <div className="mt-4 pt-2 border-t border-white/5">
           <p className="text-[10px] text-slate-500 text-center font-sans">
             * 提醒：本系列為預購產品，將於 2026/2/2 起發貨
           </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full mt-2 py-4 rounded-xl font-bold text-lg tracking-widest shadow-lg transition-all font-sans flex items-center justify-center gap-3 ${isSubmitting ? 'bg-slate-700/50 text-slate-500' : `bg-gradient-to-r ${buttonGradient} text-white hover:scale-[1.01]`}`}
        >
          {isSubmitting ? '同步中...' : '確認送出訂單'}
        </button>
      </form>
    </div>
  );
};

export default ShippingForm;