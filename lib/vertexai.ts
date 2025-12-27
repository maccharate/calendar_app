import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Vertex AI初期化（新しいSDK）
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY || '');

// Gemini 3.0 Flash Preview モデル
const model = 'gemini-3-flash-preview';

// システムプロンプト
const SYSTEM_PROMPT = `あなたはChimpan Calendarのアシスタントです。

このアプリは抽選・先着イベントの応募管理アプリで、以下の機能があります：
- イベントへの応募記録
- 当選/落選の結果管理
- 利益計算（購入価格、売却価格、手数料など）
- 統計分析（当選率、サイト別成績など）
- プレゼント企画への参加

ユーザーの質問に対して、親切で分かりやすく回答してください。
統計データが必要な場合は、提供されている関数を使用してください。
日本語で回答してください。`;

// Function Declarations（統計データ取得用）
const tools = {
  functionDeclarations: [
    {
      name: 'get_user_stats',
      description: 'ユーザーの統計情報（総応募数、当選数、当選率など）を取得します',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          period: {
            type: SchemaType.STRING,
            description: '期間を指定（this_month, last_month, all_time）',
            enum: ['this_month', 'last_month', 'all_time'],
          },
        },
        required: ['period'],
      },
    },
    {
      name: 'get_site_stats',
      description: 'サイト別の統計情報（当選率ランキングなど）を取得します',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          limit: {
            type: SchemaType.NUMBER,
            description: '取得する件数（デフォルト: 5）',
          },
        },
      },
    },
    {
      name: 'get_best_profit_events',
      description: '利益が高かったイベントのランキングを取得します',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          limit: {
            type: SchemaType.NUMBER,
            description: '取得する件数（デフォルト: 5）',
          },
        },
      },
    },
    {
      name: 'get_recent_applications',
      description: '最近応募したイベントの一覧を取得します',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          limit: {
            type: SchemaType.NUMBER,
            description: '取得する件数（デフォルト: 5）',
          },
        },
      },
    },
  ],
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  userId: string;
  onFunctionCall?: (functionName: string, args: any) => Promise<any>;
}

/**
 * Geminiとチャット
 */
export async function chatWithGemini(options: ChatOptions) {
  const { messages, userId, onFunctionCall } = options;

  try {
    const generativeModel = genAI.getGenerativeModel({
      model: model,
      systemInstruction: SYSTEM_PROMPT,
      tools: [tools as any],
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    // 会話履歴を構築（最新メッセージ以外）
    let history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // 履歴の最初が'model'ロールの場合はスキップ（Gemini APIでは'user'から始まる必要がある）
    if (history.length > 0 && history[0].role === 'model') {
      history = history.slice(1);
    }

    // チャットセッション開始
    const chat = generativeModel.startChat({
      history: history.length > 0 ? history : undefined,
    });

    // 最新のメッセージを送信
    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const response = result.response;

    // Function Callがあるかチェック
    const candidate = response.candidates?.[0];
    const functionCall = candidate?.content?.parts?.find((part: any) => part.functionCall)?.functionCall;

    if (functionCall && onFunctionCall) {
      const functionName = functionCall.name;
      const functionArgs = functionCall.args;

      console.log('Function Call:', functionName, functionArgs);

      // 関数を実行
      const functionResult = await onFunctionCall(functionName, functionArgs);

      // 関数の結果をGeminiに返す
      const functionResponse = await chat.sendMessage({
        parts: [{
          functionResponse: {
            name: functionName,
            response: functionResult,
          },
        }],
      });

      return {
        content: functionResponse.response.text() || '',
        tokensUsed: estimateTokens(messages, functionResponse.response.text() || ''),
      };
    }

    // 通常のレスポンス
    return {
      content: response.text() || '',
      tokensUsed: estimateTokens(messages, response.text() || ''),
    };
  } catch (error) {
    console.error('Vertex AI Error:', error);
    throw new Error('AIとの通信に失敗しました');
  }
}

/**
 * トークン数を推定（簡易版）
 * 実際のトークン数はVertex AIのAPIレスポンスから取得することもできます
 */
function estimateTokens(messages: ChatMessage[], response: string): number {
  const totalText = messages.map(m => m.content).join('') + response;
  // 英語: 1トークン ≈ 4文字、日本語: 1トークン ≈ 1-2文字
  // 簡易的に文字数 / 2 で計算
  return Math.ceil(totalText.length / 2);
}
