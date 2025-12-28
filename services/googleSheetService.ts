
import { CustomerRecord } from '../types';
import { compressBase64Image } from './imageUtils';

/**
 * Google Apps Script CORS 解決方案
 */
export const syncToGoogleSheet = async (record: CustomerRecord, scriptUrl: string) => {
  if (!scriptUrl) return;

  const sanitize = (val: any) => (val === undefined || val === null) ? "" : val;

  const isStandard = !!record.isStandardProduct;

  const baziStr = record.analysis?.bazi 
    ? `${record.analysis.bazi.year}/${record.analysis.bazi.month}/${record.analysis.bazi.day}/${record.analysis.bazi.time}`
    : isStandard ? "N/A (標準品)" : "";
    
  const elementsStr = record.analysis?.fiveElements
    ? `金:${record.analysis.fiveElements.gold} 木:${record.analysis.fiveElements.wood} 水:${record.analysis.fiveElements.water} 火:${record.analysis.fiveElements.fire} 土:${record.analysis.fiveElements.earth}`
    : isStandard ? "N/A" : "";

  let wishStr = record.wish || ""; 
  if (record.wishes && Array.isArray(record.wishes)) {
    wishStr = record.wishes.map(w => `【${w.type}】${w.description}`).join('\n');
  } else if (isStandard) {
    wishStr = "標準商品訂單";
  }

  const details = record.shippingDetails || {
      realName: '', phone: '', storeCode: '', storeName: '', socialId: '',
      wristSize: '', purificationBagQty: 0, preferredColors: [], totalPrice: 0,
      couponCode: '', discountAmount: 0, totalQuantity: 1, items: []
  };

  // Format Suggested Crystals to include all items and their quantities
  let finalCrystals = sanitize(record.analysis?.suggestedCrystals?.join(', ')) || record.name;
  if (isStandard && details.items && details.items.length > 0) {
      finalCrystals = details.items.map(item => `${item.name} x${item.quantity}`).join(', ');
  }

  let cleanBase64 = '';
  if (record.generatedImageUrl && !record.generatedImageUrl.startsWith('http')) {
      try {
        const compressedDataUrl = await compressBase64Image(record.generatedImageUrl, 0.6);
        if (compressedDataUrl.includes('base64,')) {
          cleanBase64 = compressedDataUrl.split('base64,')[1];
        }
      } catch (e) {
        if (record.generatedImageUrl.includes('base64,')) {
           cleanBase64 = record.generatedImageUrl.split('base64,')[1];
        }
      }
  }

  let colorsStr = isStandard ? "N/A" : (Array.isArray(details.preferredColors) ? details.preferredColors.join(', ') : sanitize(details.preferredColors));

  const payload = {
    id: sanitize(record.id),
    name: sanitize(record.name), 
    gender: sanitize(record.gender) || "N/A",
    birthDate: sanitize(record.birthDate) || "N/A",
    birthTime: isStandard ? "N/A" : (record.isTimeUnsure ? "吉時/未知" : sanitize(record.birthTime)), 
    wish: wishStr, 
    zodiacSign: sanitize(record.analysis?.zodiacSign) || "N/A",
    element: sanitize(record.analysis?.element) || "N/A",
    luckyElement: sanitize(record.analysis?.luckyElement) || "N/A",
    bazi: baziStr,
    fiveElements: elementsStr,
    suggestedCrystals: finalCrystals, 
    reasoning: sanitize(record.analysis?.reasoning) || "標準商品購買",
    visualDescription: sanitize(record.analysis?.visualDescription) || "標準品",
    colorPalette: sanitize(record.analysis?.colorPalette?.join(', ')) || "N/A",
    imageBase64: cleanBase64, 
    createdAt: new Date(record.createdAt).toLocaleString('zh-TW'),
    realName: sanitize(details.realName),
    phone: sanitize(details.phone),
    storeCode: sanitize(details.storeCode),
    storeName: sanitize(details.storeName),
    socialId: sanitize(details.socialId),
    wristSize: details.wristSize ? String(details.wristSize) : "",
    addPurificationBag: details.purificationBagQty > 0 ? `${details.purificationBagQty}個` : '無',
    preferredColors: colorsStr,
    totalPrice: details.totalPrice ? Number(details.totalPrice) : 0,
    couponCode: sanitize(details.couponCode),
    discountAmount: details.discountAmount ? Number(details.discountAmount) : 0
  };

  const sendRequest = async (data: any) => {
    const bodyStr = JSON.stringify(data);
    const cacheBustedUrl = `${scriptUrl}?_t=${Date.now()}`;
    await fetch(cacheBustedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: bodyStr,
      mode: 'no-cors'
    });
    return { status: 'sent' };
  };

  try {
    await sendRequest(payload);
  } catch (error) {
    try {
      await sendRequest({ ...payload, imageBase64: "" });
    } catch (retryError) {}
  }
};

/**
 * 測試連線
 */
export const sendTestPing = async (scriptUrl: string) => {
  const payload = {
    id: `TEST-${Date.now()}`,
    name: '系統測試',
    createdAt: new Date().toLocaleString('zh-TW'),
    totalPrice: 0
  };
  try {
    await fetch(scriptUrl + '?test=1', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return { status: "ok" };
  } catch (error) {
    return { status: "unknown" };
  }
};
