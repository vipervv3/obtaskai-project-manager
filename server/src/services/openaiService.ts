import OpenAI from 'openai';
import { createError } from '../middleware/errorHandler';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface MeetingAnalysis {
  summary: string;
  action_items: Array<{
    id: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
    assignee?: string;
    deadline?: string;
  }>;
  key_decisions: string[];
  next_steps: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  topics_discussed: string[];
}

export async function analyzeMeetingTranscript(transcript: string): Promise<MeetingAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw createError('OpenAI API key not configured', 500);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant specialized in analyzing meeting transcripts. 
          Extract and organize key information from the meeting in a structured format.
          Be concise but comprehensive. Focus on actionable items and important decisions.`
        },
        {
          role: 'user',
          content: `Analyze this meeting transcript and provide:
          1. A brief summary (2-3 sentences)
          2. Action items with priority levels and suggested assignees (if mentioned)
          3. Key decisions made
          4. Next steps
          5. Overall sentiment
          6. Main topics discussed
          
          Transcript:
          ${transcript}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(response);
    
    // Ensure the response has the expected structure
    return {
      summary: analysis.summary || 'No summary available',
      action_items: (analysis.action_items || []).map((item: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        content: item.content || item.description || item.task,
        priority: item.priority || 'medium',
        assignee: item.assignee,
        deadline: item.deadline
      })),
      key_decisions: analysis.key_decisions || [],
      next_steps: analysis.next_steps || [],
      sentiment: analysis.sentiment || 'neutral',
      topics_discussed: analysis.topics_discussed || []
    };
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    throw createError('Failed to analyze meeting transcript', 500);
  }
}

export async function generateTaskBreakdown(task: {
  title: string;
  description?: string;
  priority?: string;
}): Promise<{
  subtasks: Array<{
    title: string;
    description: string;
    estimated_hours: number;
    priority: 'low' | 'medium' | 'high';
  }>;
  suggestions: string[];
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw createError('OpenAI API key not configured', 500);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a project management expert. Break down tasks into smaller, 
          actionable subtasks with time estimates. Consider best practices and common patterns.`
        },
        {
          role: 'user',
          content: `Break down this task into subtasks:
          Title: ${task.title}
          Description: ${task.description || 'No description provided'}
          Priority: ${task.priority || 'medium'}
          
          Provide 3-5 subtasks with realistic time estimates and appropriate priorities.
          Also suggest any best practices or considerations for this type of task.`
        }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(response);
    
    return {
      subtasks: result.subtasks || [],
      suggestions: result.suggestions || result.best_practices || []
    };
  } catch (error) {
    console.error('OpenAI task breakdown error:', error);
    throw createError('Failed to generate task breakdown', 500);
  }
}

export async function generateAIInsights(prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw createError('OpenAI API key not configured', 500);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that provides concise, actionable insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
    });

    return completion.choices[0].message.content || 'No insights generated';
  } catch (error) {
    console.error('OpenAI insights error:', error);
    throw createError('Failed to generate insights', 500);
  }
}

export async function generateProjectInsights(projectData: {
  tasks: any[];
  meetings: any[];
  teamMembers: any[];
}): Promise<{
  insights: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw createError('OpenAI API key not configured', 500);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a project management analyst. Analyze project data to provide 
          actionable insights, identify risks and opportunities, and make recommendations.`
        },
        {
          role: 'user',
          content: `Analyze this project data:
          - ${projectData.tasks.length} tasks (${projectData.tasks.filter(t => t.status === 'done').length} completed)
          - ${projectData.meetings.length} meetings held
          - ${projectData.teamMembers.length} team members
          
          Task breakdown by status: ${JSON.stringify(
            projectData.tasks.reduce((acc, task) => {
              acc[task.status] = (acc[task.status] || 0) + 1;
              return acc;
            }, {})
          )}
          
          Provide insights, risks, opportunities, and recommendations.`
        }
      ],
      temperature: 0.4,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(response);
  } catch (error) {
    console.error('OpenAI insights error:', error);
    throw createError('Failed to generate project insights', 500);
  }
}