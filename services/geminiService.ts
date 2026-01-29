import { GoogleGenAI, Type } from "@google/genai";
import { CustomerProfile, CrystalAnalysis } from '../types';
import { CRYSTAL_KNOWLEDGE_BASE } from './crystalDatabase';
import { getProductDetails } from './productDatabase';
import { calculateBaziAccurate } from './baziCalculator';

// Initialize Gemini Client
// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ 
  apiKey: process.env.API_KEY 
});

// --- PROMPT CONSTANTS (Refactored for readability) ---

const STRATEGY_A_STRICT_BAZI = `
【模式 A：精確八字排盤 (Time Known)】
你必須採取「嚴格五行平衡」策略。

1. **使用提供的排盤結果**：
   - 系統已經精確計算好四柱與五行分數。
   - **絕對不要重新計算**，直接使用提供的數據。

2. **決定喜用神 (Lucky Element)**：
   - 系統已經計算好喜用神。
   - 根據「扶抑（強者剋洩、弱者生扶）」、「調候（寒暖燥濕）」、「通關」原則。
   - **重要指令**：在此模式下，【忽略用戶的願望】。
   - 即使願望是求財，如果命盤「身弱不勝財」，喜用神必須是【印/比】（生扶），而不是【財】。
   - 喜用神必須是為了讓命盤達到「中和」狀態。

3. **水晶選擇**：
   - **嚴格限制**：選出的水晶必須在資料庫中對應到系統計算的【喜用神】五行。
   - 例如：若喜用神為【木】，只能選 (木) 屬性水晶，不管用戶願望是什麼。

4. **分析撰寫**：
   - 強調你是根據「命盤五行平衡」來挑選，是為了補足先天命理的缺失。
`;

const STRATEGY_B_WISH_ORIENTED = `
【模式 B：主要願望導向 (Time Unsure)】
由於用戶不確定出生時辰，四柱缺一，精確計算身強身弱容易失準。
你必須採取「願望顯化」策略，並嚴格遵守願望分級：

1. **使用提供的排盤結果**：
   - 系統僅排出年、月、日三柱供參考。時柱已標記為 "吉時" 或 "未知"。
   - 五行分數計算僅基於前三柱（權重調整：月令仍最重）。
   - **絕對不要重新計算**。

2. **決定水晶 (Crystal Selection)**：
   - **最高準則**：你的設計與水晶選擇必須**100% 基於【主要願望 (Core Focus)】**。
   - **次要願望處理 (Auxiliary Rules)**：
      - 【次要願望】僅作為參考背景，**絕不能**影響水晶的主體選擇。
      - 如果次要願望需要的水晶與主要願望衝突，**直接忽略次要願望**。
      - 不要為了滿足次要願望而混雜不相關的五行，這會導致能量發散。
   - 從【水晶資料庫】中，找出最能解決【主要願望】的水晶。
   - 例如：主要願望是「招財」，即使次要願望是「愛情」，也必須優先選擇 黃水晶、鈦晶、金髮晶。

3. **反推喜用神 (Lucky Element)**：
   - 系統已經根據願望計算好對應的五行作為喜用神。
   - 直接使用系統提供的喜用神。
   
4. **分析撰寫**：
   - 強調你是為了達成用戶的「主要願望」而凝聚能量。
   - 內文主要解釋如何透過水晶達成【主要願望】。
   - 對於次要願望，僅需一句話帶過或不提，強調設計核心是集中火力在主要願望上。
`;

// Schema for the analysis response including BaZi details
// Correctly uses Type from @google/genai
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    zodiacSign: {
      type: Type.STRING,
      description: "Calculated Western Zodiac Sign (Constellation) based on Month and Day (e.g. 牡羊座, 處女座). Do NOT return Chinese Animal Zodiac."
    },
    element: {
      type: Type.STRING,
      description: "Western astrological element (Fire, Earth, Air, Water) in Traditional Chinese."
    },
    bazi: {
      type: Type.OBJECT,
      properties: {
        year: { type: Type.STRING, description: "Year Pillar (e.g. 甲子)" },
        month: { type: Type.STRING, description: "Month Pillar" },
        day: { type: Type.STRING, description: "Day Pillar" },
        time: { type: Type.STRING, description: "Time Pillar (return '吉時' or '未知' if unknown)" }
      },
      required: ["year", "month", "day", "time"]
    },
    fiveElements: {
      type: Type.OBJECT,
      properties: {
        gold: { type: Type.NUMBER, description: "Score (0-100) of Metal energy." },
        wood: { type: Type.NUMBER, description: "Score (0-100) of Wood energy." },
        water: { type: Type.NUMBER, description: "Score (0-100) of Water energy." },
        fire: { type: Type.NUMBER, description: "Score (0-100) of Fire energy." },
        earth: { type: Type.NUMBER, description: "Score (0-100) of Earth energy." }
      },
      required: ["gold", "wood", "water", "fire", "earth"]
    },
    luckyElement: {
      type: Type.STRING,
      description: "The 'Useful God' (喜用神) element. If Time Unsure, this matches the Primary Wish Crystal's element."
    },
    suggestedCrystals: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3 suggested crystals strictly from the provided database. MUST match the Lucky Element logic."
    },
    reasoning: {
      type: Type.STRING,
      description: "Explanation of choice. If Time Known: Balance based. If Time Unsure: Focus on Primary Wishes."
    },
    visualDescription: {
      type: Type.STRING,
      description: "A short, poetic description of the bracelet's visual style and aesthetic based on the Lucky Element's color."
    },
    colorPalette: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3 color codes (Hex) representing the bracelet's aesthetic."
    }
  },
  required: ["zodiacSign", "element", "bazi", "fiveElements", "luckyElement", "suggestedCrystals", "reasoning", "visualDescription", "colorPalette"]
};

/**
 * Analyzes the user profile to suggest crystals based on BaZi and Knowledge Base.
 */
export const analyzeCustomerProfile = async (profile: CustomerProfile): Promise<CrystalAnalysis> => {
  
  // ✅ === 新增: 本地精確計算八字與五行 ===
  const localBaziData = calculateBaziAccurate(
    profile.birthDate,
    profile.birthTime,
    profile.isTimeUnsure || false
  );
  
  // Split wishes into Primary (Top 3) and Secondary (Rest)
  // The frontend guarantees the order based on user selection
  const primaryWishes = profile.wishes ? profile.wishes.slice(0, 3) : [];
  const secondaryWishes = profile.wishes ? profile.wishes.slice(3) : [];

  const primaryWishesStr = primaryWishes.length > 0 
    ? primaryWishes.map(w => `[${w.type}]: ${w.description}`).join('; ')
    : "無特別願望";

  const secondaryWishesStr = secondaryWishes.length > 0
    ? secondaryWishes.map(w => `[${w.type}]: ${w.description}`).join('; ')
    : "無";

  const timeInfo = profile.isTimeUnsure ? "時辰不確定 (Time Unsure)" : profile.birthTime;

  // Select Strategy
  const strategyInstruction = profile.isTimeUnsure ? STRATEGY_B_WISH_ORIENTED : STRATEGY_A_STRICT_BAZI;

  const promptText = `
    你是一位精通傳統八字命理（BaZi）與五行能量調理的大師。

    【輸入資料】
    出生日期: ${profile.birthDate}
    出生時間: ${timeInfo}
    性別: ${profile.gender}
    (姓名: ${profile.name} - 僅供稱呼，**嚴禁**影響八字排盤)
    
    【主要願望 (Core Focus) - 設計核心】: ${primaryWishesStr}
    【次要願望 (Auxiliary) - 僅供參考】: ${secondaryWishesStr}
    （系統規則：不得以次要願望作為選擇水晶的依據，只能在 Reasoning 中簡短提及背景。）

    ✅ ===【系統已精確計算完成 - 你無需重新計算，直接使用以下數據】===
    
    四柱 (已排盤):
      年柱: ${localBaziData.bazi.year}
      月柱: ${localBaziData.bazi.month}
      日柱: ${localBaziData.bazi.day}
      時柱: ${localBaziData.bazi.time}
    
    五行分數 (已標準化至 0-100):
      金 (Gold): ${localBaziData.fiveElements.gold}
      木 (Wood): ${localBaziData.fiveElements.wood}
      水 (Water): ${localBaziData.fiveElements.water}
      火 (Fire): ${localBaziData.fiveElements.fire}
      土 (Earth): ${localBaziData.fiveElements.earth}
    
    喜用神 (系統已計算): ${localBaziData.luckyElement}
    日主: ${localBaziData.dayMaster} (${localBaziData.strength === 'strong' ? '身強' : '身弱'})

    ${strategyInstruction}

    【你的任務】
    1. **嚴格依照系統提供的「喜用神: ${localBaziData.luckyElement}」**，從水晶資料庫選出 3 顆對應此五行的水晶
    2. 撰寫分析文案 (reasoning)，解釋為何選擇這些水晶
       - 如果是模式 A (時辰已知)：說明如何平衡五行
       - 如果是模式 B (時辰未知)：說明如何達成主要願望
    3. 生成視覺描述 (visualDescription) 與色票 (colorPalette)
    
    【絕對禁止事項】
    - ❌ 不要重新計算四柱
    - ❌ 不要重新計算五行分數
    - ❌ 不要改變喜用神
    - ❌ suggestedCrystals 必須從資料庫中選擇，且必須對應 ${localBaziData.luckyElement} 屬性

    【水晶資料庫】(僅從此挑選):
    ${CRYSTAL_KNOWLEDGE_BASE}

    請以繁體中文回應 JSON 格式。在 JSON 的 bazi、fiveElements、luckyElement 欄位，請直接複製系統提供的數值，不要修改。
  `;

  try {
    // Upgrade to gemini-3-pro-preview for complex reasoning task (BaZi analysis)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1,
      },
    });

    // Directly accessing the .text property on the response object
    const text = response.text;
    if (!text) throw new Error("No response from analysis model");
    
    const analysis = JSON.parse(text) as CrystalAnalysis;

    // ✅ === 強制覆蓋 AI 回傳的數值欄位，確保 100% 使用本地計算結果 ===
    analysis.bazi = localBaziData.bazi;
    analysis.fiveElements = localBaziData.fiveElements;
    analysis.luckyElement = localBaziData.luckyElement;

    // --- INTEGRATION: Product Database Override & Validation ---
    if (analysis.suggestedCrystals && analysis.suggestedCrystals.length > 0) {
      const mainCrystal = analysis.suggestedCrystals[0];
      const productInfo = getProductDetails(mainCrystal);
      
      if (productInfo) {
        analysis.visualDescription = `${analysis.visualDescription} (設計師選用：${productInfo.description})`;
      }
    }

    return analysis;

  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("星盤運算與能量分析失敗，請檢查網路連線或稍後再試。");
  }
};

/**
 * Generates a photorealistic image of the crystal bracelet.
 * 已停用圖片生成功能 - 直接返回空字串
 */
export const generateBraceletImage = async (analysis: CrystalAnalysis, profile: CustomerProfile): Promise<string> => {
  // 不再生成圖片，直接返回空字串
  console.log("[圖片生成] 功能已停用");
  return "";
};
