export default async function handler(req, res) {
  // CORS 설정 (필요시)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,GET');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  try {
    const { prompt } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Vercel 환경변수(GEMINI_API_KEY)가 설정되지 않았거나 비어 있습니다.' });
    }

    if (!prompt) {
      return res.status(400).json({ error: '프롬프트(요청 내용)가 전달되지 않았습니다.' });
    }

    const systemInstruction = `
      당신은 학생들의 학습 및 일상 계획을 세워주는 친절한 AI 멘토입니다.
      사용자의 요청에 따라 계획을 짜주세요.
      반드시 아래의 순수 JSON 형식으로만 응답해야 합니다. 다른 텍스트는 절대 포함하지 마세요.
      {
        "timetable": [
          { "time": "09:00", "task": "수학 공부" },
          { "time": "10:30", "task": "휴식 및 간식" }
        ],
        "explanation": "오늘 하루 수학을 집중적으로 공부하면서 충분한 휴식을 취하는 편안한 일정이에요. 화이팅!"
      }
      주의: time은 반드시 24시간 형식의 "HH:MM" (예: 09:00, 14:30)으로 작성해야 알람이 정상 작동합니다.
    `;

    // 가장 기본적이고 널리 쓰이는 gemini-1.5-flash 모델 사용
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemInstruction + "\n\n사용자 요청: " + prompt }] }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok || !data.candidates || data.candidates.length === 0) {
      const errorMsg = data.error?.message || 'Gemini API 호출 중 알 수 없는 오류가 발생했습니다.';
      console.error("Gemini API Error:", data);
      return res.status(500).json({ error: errorMsg });
    }

    let aiText = data.candidates[0].content.parts[0].text;
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(aiText);
    return res.status(200).json(parsedData);

  } catch (error) {
    console.error('Server Catch Error:', error);
    return res.status(500).json({ error: '서버 내부 오류: ' + error.message });
  }
}
