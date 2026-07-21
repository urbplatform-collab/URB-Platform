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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. معالجة طلبات البوت على مسار /api/chat
    if (url.pathname === '/api/chat') {
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json; charset=utf-8"
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 200, headers });
      }

      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
      }

      try {
        const body = await request.json().catch(() => ({}));
        const message = body.message;
        const selectedLanguage = body.language || 'auto';

        const apiKey = env.GROQ_API_KEY || env.GEMINI_API_KEY;
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_KEY;

        if (!apiKey) {
          return new Response(JSON.stringify({ reply: '⚠️ مفتاح GROQ_API_KEY غير مضاف في إعدادات Cloudflare.' }), {
            status: 200,
            headers
          });
        }

        // جلب البيانات من Supabase
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
          return new Response(JSON.stringify({ reply: `⚠️ خطأ من السيرفر: ${data.error.message}` }), { status: 200, headers });
        }

        const reply = data.choices?.[0]?.message?.content || "لم يتم استلام رد.";
        return new Response(JSON.stringify({ reply }), { status: 200, headers });

      } catch (error) {
        return new Response(JSON.stringify({ reply: 'حدث خطأ في الاتصال: ' + error.message }), { status: 200, headers });
      }
    }

    // 2. إذا كان الطلب لصفحات الموقع العادية، قم بعرض ملفات الموقع Static
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return fetch(request);
  }
};
