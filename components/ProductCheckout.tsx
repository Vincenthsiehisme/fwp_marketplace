import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CustomerRecord, ShippingDetails, PricingStrategy, CartItem } from '../types';
import ShippingForm from './ShippingForm';
import { ProductEntry, getProductList } from '../services/productDatabase';

interface ProductCheckoutProps {
  record: CustomerRecord;
  product: ProductEntry;
  onBack: () => void;
  onShippingSubmit: (details: ShippingDetails) => void;
  isSyncing: boolean;
}

const ProductCheckout: React.FC<ProductCheckoutProps> = ({ record, product, onBack, onShippingSubmit, isSyncing }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaymentUrlCopied, setIsPaymentUrlCopied] = useState(false);

  // Multi-item Cart State
  const [cart, setCart] = useState<Record<string, number>>({
    [record.name]: 1
  });

  const allProducts = useMemo(() => getProductList(), []);
  
  const isMounted = useRef(false);

  // Derive cart items for the pricing strategy
  const cartItems: CartItem[] = useMemo(() => {
    // Explicitly cast Object.entries to avoid 'unknown' type inference on quantity in some TS environments
    return (Object.entries(cart) as [string, number][])
      .filter(([_, qty]) => qty > 0)
      .map(([name, qty]) => {
        const prod = allProducts.find(p => p.name === name);
        return {
          name,
          quantity: qty,
          price: prod?.price || 0,
          imageUrl: prod?.imageUrl
        };
      });
  }, [cart, allProducts]);

  const STANDARD_STRATEGY: PricingStrategy = {
      type: 'standard',
      basePrice: product.price, 
      shippingCost: 0,          
      sizeThreshold: 14,        
      surcharge: 200,
      cartItems: cartItems
  };

  useEffect(() => {
    if (isMounted.current) {
        if (record.shippingDetails && successRef.current) {
            successRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } else {
        isMounted.current = true;
    }
  }, [record.shippingDetails]);
  
  useEffect(() => {
    if (showPaymentModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showPaymentModal]);

  const updateQuantity = (name: string, delta: number) => {
    setCart(prev => {
        const current = prev[name] || 0;
        const next = Math.max(name === record.name ? 1 : 0, current + delta);
        return { ...prev, [name]: next };
    });
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText("0897979032175");
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyPaymentUrl = () => {
    const url = "https://p.ecpay.com.tw/4BCFFAA";
    navigator.clipboard.writeText(url).then(() => {
        setIsPaymentUrlCopied(true);
        setTimeout(() => setIsPaymentUrlCopied(false), 2000);
    }).catch(() => {
        alert("無法自動複製，請手動長按網址複製");
    });
  };

  const paymentModalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans touch-none" style={{ margin: 0 }}>
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => setShowPaymentModal(false)}></div>
        <div 
          className="relative z-10 bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-[320px] shadow-2xl animate-scale-in flex flex-col gap-5 text-center"
          onClick={(e) => e.stopPropagation()}
        >
            <div>
                <div className="w-14 h-14 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl border border-emerald-500/30 text-emerald-400">
                    💳
                </div>
                <h3 className="text-xl font-bold text-white mb-2">線上付款</h3>
                <p className="text-sm text-slate-400">複製網址至 Safari 或 Chrome 開啟</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 cursor-pointer" onClick={handleCopyPaymentUrl}>
                <div className="text-left overflow-hidden pl-2">
                    <p className="text-[10px] text-slate-600 font-bold uppercase mb-0.5">Payment Link</p>
                    <p className="text-sm text-emerald-400 font-mono truncate">p.ecpay.com.tw</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isPaymentUrlCopied ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {isPaymentUrlCopied ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
                </div>
            </div>
            <button onClick={() => setShowPaymentModal(false)} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold">完成複製 / 關閉</button>
        </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in-up pb-12 pt-4">
        {showPaymentModal && createPortal(paymentModalContent, document.body)}

        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition bg-slate-800/50 px-4 py-2 rounded-full border border-white/5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            回到市集
        </button>

        <div className="flex flex-col lg:flex-row gap-8 items-start mb-10">
            <div className="w-full lg:w-1/2 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative bg-slate-900/50 h-fit backdrop-blur-md">
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={record.name} className="relative z-10 w-full h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] animate-float" />
                ) : (
                    <div className="w-full min-h-[400px] flex items-center justify-center text-slate-500">💎 暫無實品圖</div>
                )}
            </div>

            <div className="w-full lg:w-1/2 space-y-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold font-display text-white mb-4 leading-tight tracking-wide">{record.name}</h1>
                    <div className="h-1 w-20 bg-gold-500 rounded-full mb-6"></div>
                    <p className="text-slate-300 leading-relaxed text-left text-base md:text-lg opacity-90 font-light whitespace-pre-line tracking-wide">
                        {product.description}
                    </p>
                </div>
            </div>
        </div>

        {/* IMMERSIVE ADD-ON HORIZONTAL SLIDER */}
        <div className="w-full mb-12">
            <div className="flex items-center justify-between mb-6 px-1">
                <h3 className="text-gold-400 font-bold flex items-center gap-3 text-sm uppercase tracking-[0.2em]">
                    <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse"></span>
                    好事連連：能量加乘加購
                </h3>
                <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500/50"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                </div>
            </div>

            <div className="relative">
                {/* Scroll track with Snap logic */}
                <div className="flex overflow-x-auto pb-6 gap-5 snap-x snap-mandatory no-scrollbar -mx-4 px-4 scroll-smooth">
                    {allProducts.map(p => {
                        const qty = cart[p.name] || 0;
                        const isMain = p.name === record.name;
                        
                        return (
                            <div 
                                key={p.name} 
                                className={`
                                    snap-center shrink-0 w-[200px] rounded-3xl border transition-all duration-500 flex flex-col group overflow-hidden
                                    ${qty > 0 ? 'bg-slate-800/80 border-gold-500/40 shadow-[0_10px_30px_rgba(245,158,11,0.15)]' : 'bg-slate-900/60 border-white/5'}
                                    ${isMain ? 'ring-2 ring-gold-500/30' : ''}
                                    hover:bg-slate-800/90 hover:border-white/20
                                `}
                            >
                                {/* Mini Product Thumbnail */}
                                <div className="h-[180px] w-full bg-slate-950/50 flex items-center justify-center relative">
                                    {isMain && (
                                        <div className="absolute top-3 left-3 z-10">
                                            <span className="bg-gold-500 text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">主品項</span>
                                        </div>
                                    )}
                                    <img 
                                        src={p.imageUrl} 
                                        alt={p.name} 
                                        className={`w-4/5 h-4/5 object-contain drop-shadow-lg transition-transform duration-700 ${qty > 0 ? 'scale-110' : 'group-hover:scale-105 group-hover:brightness-110'}`} 
                                    />
                                    {/* Light Overlay on Hover */}
                                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                </div>

                                {/* Content Info */}
                                <div className="p-4 flex flex-col items-center text-center gap-1">
                                    <h4 className="text-sm font-bold text-white truncate w-full">{p.name}</h4>
                                    <p className="text-xs text-gold-400 font-sans mb-3">${p.price.toLocaleString()}</p>
                                    
                                    {/* Control Bar */}
                                    <div className="flex items-center gap-4 bg-slate-950/80 rounded-full px-3 py-1.5 border border-white/10 shadow-inner">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateQuantity(p.name, -1); }}
                                            className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${qty <= (isMain ? 1 : 0) ? 'text-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                            disabled={qty <= (isMain ? 1 : 0)}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                                        </button>
                                        <span className="text-xs font-black text-white w-3">{qty}</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateQuantity(p.name, 1); }}
                                            className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {/* Ghost card for padding */}
                    <div className="shrink-0 w-4"></div>
                </div>
                {/* Horizontal Indicators for mobile hint */}
                <div className="md:hidden text-center mt-2">
                    <span className="text-[10px] text-slate-500 font-sans animate-pulse">左右滑動發現更多能量</span>
                </div>
            </div>
        </div>

        <div ref={scrollRef} className="border-t border-white/10 pt-12 mt-4">
            <h3 className="text-3xl font-bold text-white mb-2 text-center font-display">立即訂購</h3>
            <p className="text-center text-slate-400 mb-10 font-sans">填寫訂單資料及相關資訊</p>
            
            {!record.shippingDetails ? (
                <ShippingForm 
                    onSubmit={onShippingSubmit} 
                    isSubmitting={isSyncing} 
                    pricingStrategy={STANDARD_STRATEGY} 
                />
            ) : (
                <div ref={successRef} className="bg-slate-800/40 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden animate-fade-in-up">
                    <div className="text-center mb-10">
                       <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                       </div>
                       <h3 className="text-3xl font-sans font-bold text-white mb-2">訂單資料已送出</h3>
                    </div>

                    <div className="space-y-10 max-w-lg mx-auto relative before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-700/50">
                        <div className="relative pl-16">
                            <div className="absolute left-0 top-1 w-10 h-10 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 font-bold z-10 font-display">1</div>
                            <h4 className="text-xl font-bold text-white mb-2 font-sans">確認付款</h4>
                            <div className="mb-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5 block">
                               <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-sans">結帳清單</p>
                               <ul className="space-y-2 mb-4">
                                   {cartItems.map(item => (
                                       <li key={item.name} className="flex justify-between text-sm text-slate-300 font-sans">
                                           <span>{item.name} x {item.quantity}</span>
                                           <span className="font-mono">${(item.price * item.quantity).toLocaleString()}</span>
                                       </li>
                                   ))}
                                   {record.shippingDetails.purificationBagQty > 0 && (
                                       <li className="flex justify-between text-sm text-slate-300 font-sans">
                                           <span>淨化袋 x {record.shippingDetails.purificationBagQty}</span>
                                           <span className="font-mono">${(record.shippingDetails.purificationBagQty * 200).toLocaleString()}</span>
                                       </li>
                                   )}
                               </ul>
                               <div className="h-px bg-white/5 my-2"></div>
                               <p className="text-sm text-slate-400 font-sans">總金額： <span className="text-gold-400 font-bold text-xl ml-2 font-sans">${(record.shippingDetails.totalPrice).toLocaleString()}</span></p>
                            </div>
                            <button onClick={() => setShowPaymentModal(true)} className="w-full py-3 mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-white font-bold shadow-lg font-sans">線上支付 / 信用卡</button>
                            <div className="bg-slate-900/80 p-5 rounded-2xl border border-gold-500/30">
                               <p className="text-xs text-slate-400 mb-1 font-sans">玉山銀行 (808)</p>
                               <div className="flex items-center justify-between gap-3">
                                  <span className="text-2xl font-mono text-gold-300 font-bold">0897-9790-32175</span>
                                  <button onClick={handleCopyAccount} className={`text-xs px-4 py-2 rounded-lg border font-bold font-sans transition-all ${isCopied ? 'bg-green-600 border-green-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>{isCopied ? '已複製' : '複製'}</button>
                               </div>
                            </div>
                        </div>
                        <div className="relative pl-16">
                            <div className="absolute left-0 top-1 w-10 h-10 bg-mystic-600 border border-mystic-400 rounded-full flex items-center justify-center text-white font-bold z-10 animate-pulse-slow font-display">2</div>
                            <h4 className="text-xl font-bold text-mystic-200 mb-1 font-sans">私訊確認</h4>
                            <a href="https://www.instagram.com/fwp_boutique/" target="_blank" rel="noopener noreferrer" className="w-full text-center py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold flex items-center justify-center gap-3 mt-4 font-sans shadow-lg">私訊 Instagram 確認</a>
                        </div>
                        <div className="relative pl-16">
                            <div className="absolute left-0 top-1 w-10 h-10 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 font-bold z-10 font-display">3</div>
                            <h4 className="text-xl font-bold text-slate-300 mb-1 font-sans">等待製作</h4>
                            <p className="text-sm text-slate-400 font-sans">
                               確認款項後進入排單，<strong className="text-gold-400 font-bold">2026/2/2 起依序發貨</strong>，製作期約 30 工作天。
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default ProductCheckout;