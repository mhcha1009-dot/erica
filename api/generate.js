export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'POST 요청만 지원합니다.' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
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

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemInstruction + "\n\n사용자 요청: " + prompt }] }
        ]
      })
    });

    const data = await response.json();
    
    // 💡 추가된 부분: API에서 정상적인 응답(candidates)이 오지 않은 경우의 에러 처리
    if (!data.candidates || data.candidates.length === 0) {
      console.error("Gemini API Error Detail:", data); // Vercel 로그에서 정확한 원인 확인 가능
      return res.status(500).json({ 
        error: data.error?.message || 'Gemini API에서 올바른 응답을 받지 못했습니다. API 키가 유효한지 확인해 주세요.' 
      });
    }

    let aiText = data.candidates[0].content.parts[0].text;
    
    // 마크다운 잔여물(```json 등) 제거
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(aiText);
    res.status(200).json(parsedData);

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: '서버에서 계획을 생성하는 중 오류가 발생했습니다.' });
  }
}
