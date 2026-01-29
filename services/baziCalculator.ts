/**
 * 精確八字排盤與五行計算服務
 * 使用 lunar-typescript 開源庫 (MIT License)
 * 確保排盤結果 100% 一致性
 */

import { Solar } from 'lunar-typescript';

interface BaziResult {
  bazi: {
    year: string;
    month: string;
    day: string;
    time: string;
  };
  fiveElements: {
    gold: number;
    wood: number;
    water: number;
    fire: number;
    earth: number;
  };
  luckyElement: string;
  dayMaster: string; // 日主天干
  strength: 'strong' | 'weak'; // 身強/身弱
}

/**
 * 天干五行對照表
 */
const GAN_WUXING_MAP: Record<string, '金' | '木' | '水' | '火' | '土'> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

/**
 * 地支五行對照表 (主氣)
 */
const ZHI_WUXING_MAP: Record<string, '金' | '木' | '水' | '火' | '土'> = {
  '寅': '木', '卯': '木',
  '巳': '火', '午': '火',
  '申': '金', '酉': '金',
  '亥': '水', '子': '水',
  '辰': '土', '戌': '土', '丑': '土', '未': '土',
};

/**
 * 地支藏干對照表
 */
const ZHI_HIDE_GAN_MAP: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

/**
 * 精確計算八字與五行
 */
export const calculateBaziAccurate = (
  birthDate: string,
  birthTime: string,
  isTimeUnsure: boolean = false
): BaziResult => {
  
  // 解析日期時間
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime.split(':').map(Number);

  // 創建陽曆物件
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  
  // 轉農曆並取得八字
  const lunar = solar.getLunar();
  const baziChar = lunar.getEightChar();

  // === 1. 排盤 (使用正確的 API) ===
  const yearGan = baziChar.getYearGan();
  const yearZhi = baziChar.getYearZhi();
  const monthGan = baziChar.getMonthGan();
  const monthZhi = baziChar.getMonthZhi();
  const dayGan = baziChar.getDayGan();
  const dayZhi = baziChar.getDayZhi();
  const timeGan = baziChar.getTimeGan();
  const timeZhi = baziChar.getTimeZhi();

  const pillars = {
    year: yearGan + yearZhi,
    month: monthGan + monthZhi,
    day: dayGan + dayZhi,
    time: isTimeUnsure ? '吉時' : (timeGan + timeZhi),
  };

  // === 2. 精確計算五行分數 ===
  const scores = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };

  // 取得四柱天干地支 (若時辰未知則只取三柱)
  const pillarArray = [
    { gan: yearGan, zhi: yearZhi, isMonth: false },
    { gan: monthGan, zhi: monthZhi, isMonth: true },
    { gan: dayGan, zhi: dayZhi, isMonth: false },
  ];

  if (!isTimeUnsure) {
    pillarArray.push({ 
      gan: timeGan, 
      zhi: timeZhi, 
      isMonth: false 
    });
  }

  pillarArray.forEach((pillar) => {
    const monthWeight = pillar.isMonth ? 1.5 : 1; // 月令權重
    
    // 天干計分 (基礎 10 分)
    const ganName = pillar.gan; // 直接是字串
    const ganElement = GAN_WUXING_MAP[ganName];
    if (ganElement) {
      scores[ganElement] += 10 * monthWeight;
    }
    
    // 地支計分 (基礎 15 分，主氣)
    const zhiName = pillar.zhi; // 直接是字串
    const zhiElement = ZHI_WUXING_MAP[zhiName];
    if (zhiElement) {
      scores[zhiElement] += 15 * monthWeight;
    }
    
    // 藏干計分 (地支內含的天干，各 5 分)
    const hideGans = ZHI_HIDE_GAN_MAP[zhiName] || [];
    hideGans.forEach(hideName => {
      const hideElement = GAN_WUXING_MAP[hideName];
      if (hideElement) {
        scores[hideElement] += 5 * monthWeight;
      }
    });
  });

  // === 3. 標準化到 0-100 ===
  const total = Object.values(scores).reduce((sum, val) => sum + val, 0);
  const normalizedScores = {
    gold: Math.round((scores['金'] / total) * 100),
    wood: Math.round((scores['木'] / total) * 100),
    water: Math.round((scores['水'] / total) * 100),
    fire: Math.round((scores['火'] / total) * 100),
    earth: Math.round((scores['土'] / total) * 100),
  };

  // === 4. 決定喜用神 (最弱元素) ===
  let luckyElement = '金';
  let minScore = 100;
  
  Object.entries(normalizedScores).forEach(([key, score]) => {
    const elementMap: Record<string, string> = {
      gold: '金', wood: '木', water: '水', fire: '火', earth: '土'
    };
    if (score < minScore) {
      minScore = score;
      luckyElement = elementMap[key];
    }
  });

  // === 5. 判斷日主與身強身弱 (簡化版) ===
  const dayMaster = dayGan; // 直接是字串
  const dayMasterElement = GAN_WUXING_MAP[dayMaster];
  
  // 計算生扶日主的五行總分
  const supportScore = calculateSupportScore(dayMasterElement, normalizedScores);
  const strength = supportScore > 50 ? 'strong' : 'weak';

  return {
    bazi: pillars,
    fiveElements: normalizedScores,
    luckyElement,
    dayMaster,
    strength,
  };
};

/**
 * 計算生扶日主的能量
 */
const calculateSupportScore = (
  dayElement: string,
  scores: Record<string, number>
): number => {
  // 五行生剋關係
  const supportMap: Record<string, string[]> = {
    '金': ['土', '金'],  // 土生金，比劫幫身
    '木': ['水', '木'],  
    '水': ['金', '水'],  
    '火': ['木', '火'],  
    '土': ['火', '土'],  
  };

  const supporters = supportMap[dayElement] || [];
  const elementMap: Record<string, string> = {
    gold: '金', wood: '木', water: '水', fire: '火', earth: '土'
  };

  let total = 0;
  Object.entries(scores).forEach(([key, score]) => {
    if (supporters.includes(elementMap[key])) {
      total += score;
    }
  });

  return total;
};

/**
 * 快速驗證函數 (開發用)
 */
export const testBaziConsistency = (birthDate: string, birthTime: string) => {
  const results = [];
  for (let i = 0; i < 3; i++) {
    results.push(calculateBaziAccurate(birthDate, birthTime));
  }
  
  console.log('=== 一致性測試 ===');
  results.forEach((r, i) => {
    console.log(`第 ${i+1} 次:`, r.fiveElements);
  });
  
  // 檢查是否完全一致
  const first = JSON.stringify(results[0].fiveElements);
  const allSame = results.every(r => JSON.stringify(r.fiveElements) === first);
  
  console.log('✅ 結果一致:', allSame);
  return allSame;
};
