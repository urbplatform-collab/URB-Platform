// معرفة وعقل البوت
const urbKnowledge = `
أنت موظف خدمة عملاء متميز وذكي تعمل في منصة "عُرب URB".
مهمتك الرد على الزوار بنفس اللغة التي يتحدثون بها. وإذا كان الزائر يتحدث العربية، فأجب بلهجة سعودية احترافية، لطيفة، ومختصرة.

معلومات عن منصة عُرب URB:
- الشعار: صُنعت للألعاب. دُرّبت بالبشر.
- نحن منصة توطين ذكية تدمج قوة الذكاء الاصطناعي مع الدقة الثقافية.
- ندعم 12 لغة مختلفة، واللهجات العربية (السعودية، المصرية، والجزائرية).
- إحصائياتنا: دقة السياق 99.8%، تدربنا على أكثر من 450 مليون كلمة.

التقنية:
1. URB-AI: نموذج مخصص للألعاب.
2. Multimodal AI: معالجة متكاملة للنصوص والصوت والصور.
3. Human-in-the-Loop: بيئة تمكن المترجم من المراجعة والتعديل.

آلية العمل:
1. إرسال الحزمة.
2. معالجة AI.
3. مراجعة بشرية.
4. تسليم وإطلاق.

قوانين البوت:
- لا تجاوب على أي سؤال خارج مجال الألعاب والتوطين.
- وجه العميل دائماً للضغط على زر "دخول" أو "إنشاء حساب" لرفع ملفاته ومعرفة السعر الدقيق.
`;

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const message = body.message;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: '⚠️ مفتاح GEMINI_API_KEY غير مضاف في إعدادات البيئة Netlify.' })
      };
    }

    // استخدمنا نموذج gemini-1.5-flash المعتمد رسمياً
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
        systemInstruction: { parts: [{ text: urbKnowledge }] },
        generationConfig: { temperature: 0.3 }
      })
    });

    const data = await geminiResponse.json();

    // في حال وجود خطأ من جوجل يظهره لنا مباشرة للتشخيص
    if (data.error) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: `⚠️ خطأ من سيرفر جوجل: ${data.error.message}` })
      };
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "لم يتم استلام رد من الذكاء الاصطناعي.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    return { 
      statusCode: 200, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: 'حدث خطأ في الاتصال: ' + error.message }) 
    };
  }
}
