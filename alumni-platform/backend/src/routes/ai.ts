import { Router, Response } from 'express';
import Groq from 'groq-sdk';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
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

    // Get all alumni
    const alumniSnapshot = await db.collection('users').where('role', '==', 'alumni').get();
    const alumni = alumniSnapshot.docs.map(doc => doc.data());

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

export default router;
