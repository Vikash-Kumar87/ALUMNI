import { Router, Response } from 'express';
import Groq from 'groq-sdk';
import { db, auth } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';

// Helper: get set of all valid Firebase Auth UIDs
async function getValidAuthUids(): Promise<Set<string>> {
  const validUids = new Set<string>();
  let nextPageToken: string | undefined;
  do {
    const result = await auth.listUsers(1000, nextPageToken);
    result.users.forEach(u => validUids.add(u.uid));
    nextPageToken = result.pageToken;
  } while (nextPageToken);
  return validUids;
}
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
const MODEL = 'llama-3.3-70b-versatile';

// Simple one-shot text generation
const generateText = async (prompt: string, maxTokens = 4096): Promise<string> => {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
  });
  return completion.choices[0]?.message?.content || '';
};

// Helper to detect rate-limit / quota errors
const isQuotaError = (err: any) =>
  err?.status === 429 ||
  (typeof err?.message === 'string' &&
    (err.message.includes('429') || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('rate limit')));

// POST /ai/career-guidance - Career guidance chatbot
router.post('/career-guidance', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const systemContext = `You are an expert career guidance advisor for students and fresh graduates in the technology field.
    You help students with:
    - Career path advice and roadmaps
    - Technology learning resources
    - Interview preparation tips
    - Resume and portfolio guidance
    - Industry trends and job market insights
    Be concise, practical, and encouraging. Format responses with clear sections when appropriate.`;

    // Convert chat history to Groq-format messages
    const historyMessages = (history || []).map((h: any) => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: Array.isArray(h.parts) ? (h.parts[0]?.text || '') : (h.content || ''),
    }));

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemContext },
        ...historyMessages,
        { role: 'user', content: message },
      ],
      max_tokens: 1000,
    });
    const response = completion.choices[0]?.message?.content || '';

    res.status(200).json({ response, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Career guidance error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/interview - Generate interview questions and evaluate answers
router.post('/interview', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { topic, difficulty, action, question, answer } = req.body;

    if (!action) {
      res.status(400).json({ error: 'Action is required (generate | evaluate)' });
      return;
    }

    if (action === 'generate') {
      if (!topic) {
        res.status(400).json({ error: 'Topic is required for generating questions' });
        return;
      }

      const prompt = `Generate 5 ${difficulty || 'medium'} level technical interview questions for ${topic}.
      Format the response as a JSON array with objects containing:
      - "id": number (1-5)
      - "question": string
      - "category": string (e.g., "Conceptual", "Practical", "Problem Solving")
      - "hint": string (a brief hint to guide the answer)
      
      Only return valid JSON, no additional text.`;

      const responseText = (await generateText(prompt)).trim();

      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      res.status(200).json({ questions, topic, difficulty: difficulty || 'medium' });

    } else if (action === 'evaluate') {
      if (!question || !answer || !topic) {
        res.status(400).json({ error: 'Question, answer, and topic are required for evaluation' });
        return;
      }

      const prompt = `You are a technical interviewer evaluating an answer for ${topic}.
      
      Question: ${question}
      Candidate's Answer: ${answer}
      
      Evaluate the answer and provide feedback in this exact JSON format:
      {
        "score": number (0-10),
        "grade": "Excellent" | "Good" | "Average" | "Needs Improvement",
        "strengths": ["strength1", "strength2"],
        "improvements": ["improvement1", "improvement2"],
        "modelAnswer": "A comprehensive model answer",
        "feedback": "Overall feedback paragraph"
      }
      
      Only return valid JSON, no additional text.`;

      const responseText = (await generateText(prompt)).trim();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Could not parse evaluation' };

      res.status(200).json({ evaluation });
    } else {
      res.status(400).json({ error: 'Invalid action. Use generate or evaluate' });
    }
  } catch (error) {
    console.error('Interview AI error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/mentor-recommend - AI-powered mentor recommendation
router.post('/mentor-recommend', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const userDoc = await db.collection('users').doc(uid!).get();
    const studentData = userDoc.data() as {
      skills: string[];
      interests: string[];
      goals: string;
      branch: string;
    };

    // Get all alumni — only those with active Firebase Auth accounts
    const [alumniSnapshot, validUids] = await Promise.all([
      db.collection('users').where('role', '==', 'alumni').get(),
      getValidAuthUids(),
    ]);
    const alumni = alumniSnapshot.docs
      .map(doc => doc.data())
      .filter(a => a.uid && validUids.has(String(a.uid)));

    if (alumni.length === 0) {
      res.status(200).json({ recommendations: [], message: 'No alumni available yet' });
      return;
    }

    const prompt = `You are a mentor matching system. Given a student profile and list of alumni mentors, rank the top 5 best matches.

Student Profile:
- Skills: ${(studentData.skills || []).join(', ')}
- Interests: ${(studentData.interests || []).join(', ')}
- Goals: ${studentData.goals || 'Not specified'}
- Branch: ${studentData.branch || 'Not specified'}

Available Alumni (JSON):
${JSON.stringify(alumni.map(a => ({ uid: a.uid, name: a.name, skills: a.skills, company: a.company, jobRole: a.jobRole, experience: a.experience })), null, 2)}

Return a JSON array of the top 5 recommended alumni UIDs with reasoning:
[
  {
    "uid": "alumni_uid",
    "matchScore": number (0-100),
    "reason": "Brief explanation of why this is a good match"
  }
]

Only return valid JSON array, no additional text.`;

    const responseText = (await generateText(prompt)).trim();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Enrich with full alumni data
    const enriched = recommendations.map((rec: { uid: string; matchScore: number; reason: string }) => {
      const alumniData = alumni.find(a => a.uid === rec.uid);
      return { ...rec, alumni: alumniData };
    }).filter((r: { alumni: unknown }) => r.alumni);

    res.status(200).json({ recommendations: enriched });
  } catch (error) {
    console.error('Mentor recommendation error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/skill-roadmap - Generate skill learning roadmap
router.post('/skill-roadmap', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { goal, currentSkills, timeframe } = req.body;

    if (!goal) {
      res.status(400).json({ error: 'Career goal is required' });
      return;
    }

    const prompt = `Create a detailed learning roadmap for someone who wants to become a ${goal}.

Current skills: ${(currentSkills || []).join(', ') || 'Beginner'}
Available timeframe: ${timeframe || '6 months'}

Generate a structured roadmap as JSON:
{
  "title": "Roadmap title",
  "totalDuration": "estimated duration",
  "phases": [
    {
      "phase": number,
      "title": "Phase title",
      "duration": "2 weeks",
      "topics": ["topic1", "topic2"],
      "resources": [
        {"name": "Resource name", "type": "video|article|course|book", "free": true}
      ],
      "milestone": "What you'll be able to do"
    }
  ],
  "tools": ["tool1", "tool2"],
  "tips": ["tip1", "tip2"]
}

Only return valid JSON, no additional text.`;

    const responseText = (await generateText(prompt)).trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const roadmap = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.status(200).json({ roadmap });
  } catch (error) {
    console.error('Skill roadmap error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/resume-review - AI resume review
router.post('/resume-review', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { resumeText, targetRole } = req.body;

    if (!resumeText) {
      res.status(400).json({ error: 'Resume text is required' });
      return;
    }

    const prompt = `You are a professional resume reviewer. Analyze this resume and provide detailed feedback.

Target Role: ${targetRole || 'Software Engineer'}

Resume Content:
${resumeText}

Provide feedback as JSON:
{
  "overallScore": number (0-100),
  "summary": "Brief overall assessment",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": [
    {
      "section": "Section name",
      "issue": "What's wrong",
      "fix": "How to fix it"
    }
  ],
  "keywords": {
    "present": ["keyword1", "keyword2"],
    "missing": ["keyword3", "keyword4"]
  },
  "atsScore": number (0-100),
  "actionItems": ["action1", "action2"]
}

Only return valid JSON, no additional text.`;

    const responseText = (await generateText(prompt)).trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const review = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.status(200).json({ review });
  } catch (error) {
    console.error('Resume review error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/voice-interview-eval - AI voice answer evaluation
router.post('/voice-interview-eval', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { topic, question, transcript, durationSeconds } = req.body;

    if (!question || !transcript || !topic) {
      res.status(400).json({ error: 'Question, transcript, and topic are required' });
      return;
    }

    const wordCount = transcript.trim().split(/\s+/).length;
    const wpm = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;
    const paceLabel = wpm > 160 ? 'Too Fast' : wpm < 90 ? 'Too Slow' : 'Good Pace';

    const prompt = `You are an expert interview coach evaluating a candidate's spoken interview answer.

Topic: ${topic}
Question: ${question}
Spoken Answer (transcribed): ${transcript}
Speaking Duration: ${durationSeconds}s | Word Count: ${wordCount} | Speaking Pace: ${wpm} wpm (${paceLabel})

Evaluate both CONTENT quality and DELIVERY. Return ONLY valid JSON with NO other text:
{
  "score": number (0-10, content quality),
  "grade": "Excellent" | "Good" | "Average" | "Needs Improvement",
  "strengths": ["content strength 1", "content strength 2"],
  "improvements": ["content improvement 1", "content improvement 2"],
  "modelAnswer": "A comprehensive model answer for this question",
  "feedback": "Overall paragraph feedback on content",
  "voiceInsights": {
    "confidenceScore": number (0-100, based on vocabulary confidence and completeness),
    "tone": "Confident" | "Nervous" | "Monotone" | "Engaging",
    "pace": "${paceLabel}",
    "wpm": ${wpm},
    "clarity": number (0-100, how structured and clear the answer was),
    "tips": ["specific voice coaching tip 1", "specific coaching tip 2", "specific tip 3"],
    "verdict": "One sentence delivery verdict"
  }
}`;

    const responseText = (await generateText(prompt)).trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.status(200).json({ evaluation });
  } catch (error) {
    console.error('Voice interview eval error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/discussion-answer - AI Smart Answer for Discussion Questions
router.post('/discussion-answer', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { question, tags } = req.body;

    if (!question) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    const tagContext = tags?.length ? `Related topics: ${tags.join(', ')}.` : '';

    const prompt = `You are an expert mentor and senior engineer answering a community discussion question.

Question: ${question}
${tagContext}

Provide a clear, helpful, and beginner-friendly answer. Also suggest 3 specific, real learning resources with URLs.

Return ONLY valid JSON with NO other text:
{
  "answer": "A detailed but concise answer (3-5 paragraphs max)",
  "keyPoints": ["key takeaway 1", "key takeaway 2", "key takeaway 3"],
  "resources": [
    { "title": "Resource title", "url": "https://...", "type": "docs" | "article" | "video" | "course" },
    { "title": "Resource title", "url": "https://...", "type": "docs" | "article" | "video" | "course" },
    { "title": "Resource title", "url": "https://...", "type": "docs" | "article" | "video" | "course" }
  ],
  "confidence": "high" | "medium" | "low"
}`;

    const responseText = (await generateText(prompt)).trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.status(200).json({ result });
  } catch (error) {
    console.error('Discussion answer error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/session-summary - AI Mentor Session Summarizer
router.post('/session-summary', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messages, mentorName, studentName } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const transcript = messages
      .map((m: { senderName: string; text: string }) => `${m.senderName}: ${m.text}`)
      .join('\n');

    const prompt = `You are an expert mentor session analyst. Analyze this mentorship conversation between ${mentorName} (mentor/alumni) and ${studentName} (student) and create a professional session summary.

Conversation Transcript:
${transcript}

Return ONLY valid JSON with NO other text:
{
  "title": "A concise session title (8 words max)",
  "overview": "A 2-3 sentence professional summary of what was discussed",
  "keyPoints": ["Key insight or topic 1", "Key insight or topic 2", "Key insight or topic 3"],
  "actionItems": [
    { "task": "Specific task to complete", "assignedTo": "${studentName}" },
    { "task": "Follow-up action", "assignedTo": "${mentorName}" }
  ],
  "resources": [
    { "title": "Relevant resource title", "url": "https://...", "type": "docs" | "article" | "video" | "course" }
  ],
  "mood": "productive" | "exploratory" | "problem-solving" | "motivational",
  "nextSteps": "One sentence about what the student should focus on next"
}`;

    const responseText = (await generateText(prompt)).trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const summary = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.status(200).json({ summary });
  } catch (error) {
    console.error('Session summary error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/cover-letter - AI Cover Letter Generator
router.post('/cover-letter', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicantName, targetRole, company, jobDescription, background, tone } = req.body;

    if (!targetRole || !company) {
      res.status(400).json({ error: 'Target role and company are required' });
      return;
    }

    const toneGuide: Record<string, string> = {
      professional: 'formal, polished, confident, corporate language',
      enthusiastic: 'warm, energetic, passionate, personable, uses light enthusiasm',
      creative:     'bold, creative, distinctive, shows personality and originality',
    };

    const prompt = `You are an expert cover letter writer. Write a compelling, personalised cover letter.

Applicant Name: ${applicantName || 'Applicant'}
Target Role: ${targetRole}
Company: ${company}
Job Description: ${jobDescription || 'Not provided'}
Applicant Background & Skills: ${background || 'Not provided'}
Tone: ${tone || 'professional'} — ${toneGuide[tone] || toneGuide['professional']}

Return ONLY a valid JSON object with NO other text:
{
  "subject": "Email subject line for this application",
  "body": "Full cover letter body text. Use double newlines (\\n\\n) between paragraphs. Include: opening hook, why this role/company, relevant skills/experience, closing call to action. 3-4 paragraphs.",
  "wordCount": number,
  "tone": "${tone || 'professional'}"
}`;

    const responseText = (await generateText(prompt)).trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const letter = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.status(200).json({ letter });
  } catch (error) {
    console.error('Cover letter error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/job-match - AI Job Match Score
router.post('/job-match', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobTitle, jobDescription, jobRequirements, candidateSkills, candidateBio, candidateGoals } = req.body;

    if (!jobTitle || !jobDescription) {
      res.status(400).json({ error: 'Job title and description are required' });
      return;
    }

    const prompt = `You are an expert AI recruiter. Analyze how well a candidate matches a job posting.

Job Posting:
- Title: ${jobTitle}
- Description: ${jobDescription}
- Requirements: ${Array.isArray(jobRequirements) ? jobRequirements.join(', ') : jobRequirements || 'Not specified'}

Candidate Profile:
- Skills: ${candidateSkills || 'Not specified'}
- Bio: ${candidateBio || 'Not provided'}
- Goals: ${candidateGoals || 'Not provided'}

Return ONLY a valid JSON object with NO other text:
{
  "matchScore": number (0-100),
  "matchLevel": "Excellent" | "Good" | "Fair" | "Low",
  "summary": "2-3 sentence match summary",
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "suggestions": [
    { "title": "Short title", "detail": "Specific actionable advice" }
  ],
  "verdict": "One sentence recommendation"
}`;

    const responseText = (await generateText(prompt)).trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.status(200).json({ result });
  } catch (error) {
    console.error('Job match error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/skill-gap - Analyze skill gap
router.post('/skill-gap', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentSkills, targetRole } = req.body;

    if (!targetRole) {
      res.status(400).json({ error: 'Target role is required' });
      return;
    }

    const prompt = `Analyze the skill gap for someone who wants to become a ${targetRole}.

Current Skills: ${(currentSkills || []).join(', ') || 'None specified'}

Provide a skill gap analysis as JSON:
{
  "targetRole": "${targetRole}",
  "requiredSkills": [
    {
      "skill": "Skill name",
      "importance": "Essential|Important|Nice to have",
      "currentLevel": "None|Beginner|Intermediate|Advanced",
      "targetLevel": "Beginner|Intermediate|Advanced|Expert",
      "resources": ["resource1", "resource2"]
    }
  ],
  "gapScore": number (0-100, how much gap exists),
  "estimatedTime": "Time to bridge the gap",
  "prioritizedLearningPath": ["skill1", "skill2", "skill3"]
}

Only return valid JSON, no additional text.`;

    const responseText = (await generateText(prompt)).trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.status(200).json({ analysis });
  } catch (error) {
    console.error('Skill gap error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/weekly-report - Personalized Weekly Career Report
router.post('/weekly-report', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, skills, goals, interests, branch, targetRole } = req.body;

    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekLabel = `${fmt(monday)}–${fmt(sunday)}, ${now.getFullYear()}`;

    const prompt = `You are an expert AI career coach. Generate a personalized weekly career report for a student.

Student Profile:
- Name: ${name || 'Student'}
- Skills: ${(skills || []).join(', ') || 'Not specified'}
- Goals: ${goals || 'Not specified'}
- Interests: ${(interests || []).join(', ') || 'Not specified'}
- Branch/Major: ${branch || 'Computer Science'}
- Target Role: ${targetRole || goals || 'Software Developer'}
- Week: ${weekLabel}

Generate a rich, actionable weekly career report. Make it feel personal and motivating.

Return ONLY valid JSON with NO other text:
{
  "greeting": "Hey ${name || 'there'}, here's your career briefing for this week! 🚀",
  "weekLabel": "${weekLabel}",
  "energyLevel": "leveling_up" | "momentum" | "focused" | "catching_up",
  "learn": [
    {
      "topic": "Specific skill/topic to learn this week",
      "why": "Why this is relevant to their profile and goals (1-2 sentences)",
      "estimatedHours": number (2-8),
      "resources": [
        { "title": "Resource title", "url": "https://...", "type": "video" | "article" | "course" | "docs" }
      ]
    }
  ],
  "jobs": [
    {
      "title": "Job title",
      "company": "Company name (realistic)",
      "matchReason": "Why this matches their profile (1 sentence)",
      "urgency": "hot" | "normal",
      "skills": ["skill1", "skill2", "skill3"]
    }
  ],
  "mentors": [
    {
      "name": "Realistic mentor name",
      "role": "Senior title",
      "company": "Tech company",
      "matchReason": "Why this mentor suits them (1 sentence)",
      "skills": ["skill1", "skill2", "skill3"]
    }
  ],
  "skillGaps": [
    {
      "skill": "Skill name",
      "priority": "high" | "medium" | "low",
      "gap": "Why they need this skill and what's missing (1 sentence)"
    }
  ],
  "trending": ["trend1", "trend2", "trend3", "trend4", "trend5"],
  "weeklyGoal": "One specific, achievable goal for this week (1 sentence)",
  "quote": "An inspiring quote relevant to their career journey",
  "stats": {
    "profileStrength": number (60-95),
    "weeklyOpportunities": number (8-25),
    "mentorMatches": number (2-5)
  }
}

Rules:
- learn: exactly 2-3 items, each with 2 resources with real URLs
- jobs: exactly 3 items, realistic titles matching their skills/goals
- mentors: exactly 2-3 items with realistic names
- skillGaps: exactly 3 items relevant to their target role
- trending: exactly 5 current trending technologies in their field
- Make everything highly specific to their actual skills and goals`;

    const responseText = (await generateText(prompt, 3000)).trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const report = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.status(200).json({ report });
  } catch (error) {
    console.error('Weekly report error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /ai/icebreaker - Generate personalized opening message for mentorship request
router.post('/icebreaker', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      studentName, studentSkills, studentGoals, studentBranch, studentBio,
      mentorName, mentorSkills, mentorCompany, mentorRole, mentorBio,
    } = req.body;

    const prompt = `You are an expert networking coach. Generate 3 distinct, personalized opening messages for a student reaching out to an alumni mentor on a platform called AlumniConnect.

Student Profile:
- Name: ${studentName || 'Student'}
- Branch/Major: ${studentBranch || 'Engineering'}
- Skills: ${(studentSkills || []).join(', ') || 'Not specified'}
- Goals: ${studentGoals || 'Not specified'}
- Bio: ${studentBio || 'Not provided'}

Mentor Profile:
- Name: ${mentorName || 'Mentor'}
- Role: ${mentorRole || 'Software Engineer'}
- Company: ${mentorCompany || 'Tech Company'}
- Expertise: ${(mentorSkills || []).join(', ') || 'Not specified'}
- Bio: ${mentorBio || 'Not provided'}

Generate exactly 3 opening messages, each with a different tone:
1. Professional & formal
2. Enthusiastic & direct
3. Story-driven & personal

Each message:
- Is 2-3 sentences max (under 60 words)
- References specific details from BOTH profiles to show genuine interest
- Has a clear ask or intent
- Sounds natural and human

Respond with ONLY valid JSON (no markdown, no code block):
{
  "messages": [
    { "tone": "Professional", "emoji": "💼", "text": "...", "highlight": "one word reason why this works" },
    { "tone": "Enthusiastic", "emoji": "🚀", "text": "...", "highlight": "one word reason" },
    { "tone": "Personal",      "emoji": "✨", "text": "...", "highlight": "one word reason" }
  ]
}`;

    const responseText = (await generateText(prompt, 1000)).trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { messages: [] };
    res.status(200).json(result);
  } catch (error) {
    console.error('Icebreaker error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable.' });
  }
});

// POST /ai/success-story - Generate formatted success story / bio for alumni
router.post('/success-story', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, currentRole, company, journey, biggestWin, challengesFaced, adviceForJuniors, funFact, tone, skills } = req.body;

    const toneGuide: Record<string, string> = {
      inspiring:    'uplifting, motivational, and empowering — meant to inspire students',
      professional: 'polished, concise, LinkedIn-style — third-person professional bio',
      storytelling: 'first-person narrative arc with emotional depth — like a personal essay',
    };

    const prompt = `You are an expert biography writer. Write a compelling success story / profile bio for a mentor on an alumni platform called AlumniConnect.

Alumni Details:
- Name: ${name || 'Alumni'}
- Current Role: ${currentRole || 'Professional'}
- Company: ${company || 'Not specified'}
- Skills: ${(skills || []).join(', ') || 'Not specified'}
- Journey: ${journey}
- Biggest Win / Achievement: ${biggestWin || 'Not provided'}
- Challenges Overcome: ${challengesFaced || 'Not provided'}
- Advice for Students: ${adviceForJuniors || 'Not provided'}
- Fun Fact: ${funFact || 'Not provided'}

Tone: ${tone || 'inspiring'} — ${toneGuide[tone] || toneGuide['inspiring']}

Write a 250-350 word success story that:
1. Opens with a powerful hook sentence about who they are today
2. Describes their journey from student to professional with specific details
3. Highlights their biggest achievement(s) with context
4. Briefly mentions challenges they overcame (makes them relatable)
5. Closes with their advice or vision for the next generation
6. If a fun fact was provided, weave it in naturally

Rules:
- Use natural paragraphs (3-4 paragraphs total)
- Avoid buzzwords like 'passionate', 'guru', 'ninja'
- Make it feel authentic and human, not like a press release
- Do NOT include a title or heading, just the story text
- Output only the story text, nothing else`;

    const story = (await generateText(prompt, 1200)).trim();
    res.status(200).json({ story });
  } catch (error) {
    console.error('Success story error:', error);
    if (isQuotaError(error)) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please wait and try again.' });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable.' });
  }
});

export default router;
