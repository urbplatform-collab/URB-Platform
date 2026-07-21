const staticKnowledge = `
أنت المساعد الذكي الرسمي لمنصة "عُرب URB" لتوطين الألعاب.

[قوانين التحدث واللغة - مهم جداً]:
1. أجب دائماً باللغة التي يحددها العميل فوراً وبشكل كامل دون خلط مع لغات أخرى.
2. إذا اختار العميل العربية، أجب بلهجة سعودية بيضاء احترافية ولطيفة ومختصرة.
3. إذا اختار اليابانية، أجب باليابانية الفصيحة والمؤدبة (Desu/Masu).
4. أجب بدقة بأي لغة أخرى يختارها العميل.

[بيانات منصة عُرب URB الرئيسية]:
- الشعار: صُنعت للألعاب. دُرّبت بالبشر.
- التعريف: منصة توطين ذكية تدمج قوة الذكاء الاصطناعي مع الدقة الثقافية واللغوية.
- اللغات المدعومة: 12 لغة مع اللهجات العربية (السعودية، المصرية، والجزائرية).
- التسعير والطلبات: وجه العميل دائماً للضغط على زر "دخول" أو "إنشاء حساب" لرفع ملفاته ومعرفة السعر الدقيق.
`;

exports.handler = async function(event, context) {
  // الهيدرز الخاصة بالاتصال ومنع مشاكل الـ CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // 1. معالجة طلبات الفحص المسبق (OPTIONS Preflight) لتفادي خطأ 405
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // 2. التأكد من أن الطلب POST فقط
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const message = body.message;
    const selectedLanguage = body.language || 'auto';

    const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ reply: '⚠️ مفتاح GROQ_API_KEY غير مضاف في Netlify.' })
      };
    }

    // جلب البيانات المحدثة من Supabase
    let dynamicKnowledge = "";
    if (supabaseUrl && supabaseKey) {
      try {
        const fetchUrl = `${supabaseUrl}/rest/v1/bot_knowledge?select=title,content`;
        const supaRes = await fetch(fetchUrl, {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        });
        
        if (supaRes.ok) {
          const rows = await supaRes.json();
          if (rows && rows.length > 0) {
            dynamicKnowledge = "\n\n[معلومات محدثة وحصرية من لوحة تحكم الأدمن والمدونة]:\n" + 
              rows.map(r => `- ${r.title}: ${r.content}`).join("\n");
          }
        }
      } catch (e) {
        console.log("تعذر جلب بيانات Supabase:", e.message);
      }
    }

    let fullSystemPrompt = staticKnowledge + dynamicKnowledge;
    if (selectedLanguage !== 'auto') {
      fullSystemPrompt += `\n\n[INSTRUCTION]: The user has explicitly selected the language: (${selectedLanguage}). You MUST reply ONLY in ${selectedLanguage}. Do NOT use Arabic unless the selected language is Arabic.`;
    }

    // الاتصال بـ Groq API
    const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

    const response = await fetch(groqUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: fullSystemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ reply: `⚠️ خطأ من السيرفر: ${data.error.message}` })
      };
    }

    const reply = data.choices?.[0]?.message?.content || "لم يتم استلام رد.";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    return { 
      statusCode: 200, 
      headers,
      body: JSON.stringify({ reply: 'حدث خطأ في الاتصال: ' + error.message }) 
    };
  }
};
