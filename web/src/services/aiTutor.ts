import type { AIChatMessage, CohortProblem } from '../types/cohort';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
// Use gpt-4o - the best vision-capable model from OpenAI
const OPENAI_MODEL = 'gpt-4o';

interface CohortMember {
  userId: string;
  username: string;
  avatar?: string;
}

const getSocraticPrompt = (members?: CohortMember[], currentProblem?: CohortProblem | null): string => {
  let prompt = `You are a Socratic math tutor in a collaborative learning cohort. Your CRITICAL role is to guide students through mathematical problems by asking thoughtful, leading questions. You MUST NEVER give direct answers or solutions.

CRITICAL RULES - NEVER VIOLATE THESE:
1. NEVER provide the final answer, solution, or numerical result
2. NEVER show step-by-step solutions that lead directly to the answer
3. NEVER confirm if a student's answer is correct by stating the answer
4. NEVER write out equations with solutions filled in
5. ALWAYS ask questions that guide discovery instead of providing answers
6. ALWAYS help students identify what they know and what they need to find
7. ALWAYS encourage students to try a step themselves before providing any guidance

IMPORTANT FORMATTING:
- Use LaTeX for all mathematical expressions: inline math with $...$ (e.g., $x^2 + 5x = 13$)
- Use block math with $$...$$ for equations that should be on their own line
- Examples: $2x + 5 = 13$, $\\frac{a}{b}$, $x^2$, $\\sqrt{16}$, $\\int_0^1 x dx$

Teaching approach:
- Ask "What do you think the first step might be?" instead of "The first step is..."
- Ask "What information do you already have?" instead of listing the information
- Ask "What would happen if you tried [approach]?" instead of telling them to do it
- Ask "Can you think of a similar problem you've solved?" instead of solving it for them
- When a student is stuck, ask "What part are you unsure about?" instead of explaining that part
- Celebrate attempts: "Great thinking! What made you try that approach?" even if it's not quite right

Additional principles:
- Break complex problems into smaller, manageable steps through questions
- Encourage students to explain their thinking out loud
- Use analogies and real-world examples when helpful (but still through questions)
- Be encouraging and supportive, especially when students are stuck
- Focus on mathematical reasoning and problem-solving strategies
- Be aware of all students in the cohort and address them by name when appropriate
- Foster collaboration between students - encourage them to help each other
- Use a friendly, instructive teacher tone - you're here to guide, not judge

Example of CORRECT approach:
Student: "What's 2x + 5 = 13?"
You: "That's a great equation to work with! What do you think we're trying to find? And what operation might help us isolate that variable in $2x + 5 = 13$?"

Example of INCORRECT approach (NEVER DO THIS):
Student: "What's 2x + 5 = 13?"
You: "The answer is x = 4. First subtract 5 from both sides..." ❌

Keep responses concise (2-3 sentences) and focused on one guiding question or insight at a time.`;

  if (members && members.length > 0) {
    const memberNames = members.map(m => m.username).join(', ');
    prompt += `\n\nCurrent cohort members: ${memberNames}. Be aware of who is present and address them by name naturally in your responses.`;
  }

  if (currentProblem) {
    prompt += `\n\n=== CURRENT PROBLEM ===
The students are working on this problem:
Category: ${currentProblem.category} - ${currentProblem.subcategory}
Question: "${currentProblem.question}"
${currentProblem.hint ? `Hint (only share if they're really stuck): ${currentProblem.hint}` : ''}

IMPORTANT: Always keep this problem in context. Guide students toward solving THIS specific problem. Even if the chat is cleared, you should still be aware of and reference this problem.`;
  } else {
    // Open Canvas mode - no specific problem
    prompt += `\n\n=== OPEN CANVAS MODE ===
This is a free drawing and collaboration space. Students can draw anything they want and work together. 
- Help them with any questions they have about their drawings
- Guide them through any math problems they're working on (if they ask)
- Encourage collaboration and creative problem-solving
- There's no specific problem to solve - just support their learning journey`;
  }

  return prompt;
};

export interface AIResponse {
  content: string;
  error?: string;
}

export interface VerificationResult {
  solved: boolean;
  message: string;
  needsWhiteboard: boolean;
}

/**
 * Sends conversation history to OpenAI API for Socratic math tutoring
 * @param messages - Full conversation history including user messages and previous AI responses
 * @param whiteboardImage - Optional base64 image of whiteboard content
 * @param members - Current cohort members
 * @param memberChangeMessage - Optional message about members joining/leaving
 * @param currentProblem - The current problem the cohort is working on
 * @returns AI response content or error message
 */
export async function askAITutor(
  messages: AIChatMessage[], 
  whiteboardImage?: string | null,
  members?: CohortMember[],
  memberChangeMessage?: string | null,
  currentProblem?: CohortProblem | null
): Promise<AIResponse> {
  if (!OPENAI_API_KEY) {
    return {
      content: '',
      error: 'OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.'
    };
  }

  try {
    // Build system prompt with member awareness and current problem
    const systemPrompt = getSocraticPrompt(members, currentProblem);
    
    // Convert messages to OpenAI format
    const systemMessage = {
      role: 'system' as const,
      content: systemPrompt
    };

    const conversationMessages = messages
      .filter(msg => msg.role === 'user' || msg.role === 'ai')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

    // If whiteboard image is provided, add it as a user message with image
    const messagesToSend: any[] = [systemMessage];
    
    // Add member change notification if present
    if (memberChangeMessage) {
      messagesToSend.push({
        role: 'system' as const,
        content: `[System notification: ${memberChangeMessage}]`
      });
    }
    
    // Add all conversation messages first
    messagesToSend.push(...conversationMessages);
    
    // If whiteboard image is provided, append it as a new user message
    if (whiteboardImage) {
      // Convert data URL to base64 (remove data:image/png;base64, prefix if present)
      const base64Image = whiteboardImage.includes(',') 
        ? whiteboardImage.split(',')[1] 
        : whiteboardImage;
      
      messagesToSend.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Here is the current whiteboard drawing. Please help me understand what I\'ve drawn and guide me through solving any math problems shown.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Image}`
            }
          }
        ]
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: messagesToSend,
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 429) {
        return {
          content: '',
          error: 'Rate limit exceeded. Please wait a moment and try again.'
        };
      }
      
      return {
        content: '',
        error: errorMessage
      };
    }

    const data = await response.json();
    let aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      return {
        content: '',
        error: 'No response from AI. Please try again.'
      };
    }

    aiContent = aiContent.trim();

    // Safety check: If the response seems to contain a direct answer, redirect to questioning
    // Look for patterns like "the answer is", "x =", "equals", "solution is", etc.
    const directAnswerPatterns = [
      /the answer is\s+[0-9\.\-\+\/\(\)]+/i,
      /^[x-z]\s*=\s*[0-9\.\-\+\/\(\)]+/i,
      /equals?\s+[0-9\.\-\+\/\(\)]+/i,
      /solution is\s+[0-9\.\-\+\/\(\)]+/i,
      /result is\s+[0-9\.\-\+\/\(\)]+/i,
      /^[0-9\.\-\+\/\(\)]+\s*$/,
    ];

    const containsDirectAnswer = directAnswerPatterns.some(pattern => pattern.test(aiContent));
    
    if (containsDirectAnswer) {
      // Replace with a guiding question instead
      aiContent = "I can see you're working on finding a solution! Instead of giving you the answer, let me ask: what steps have you tried so far? What do you think might be a good first approach to this problem?";
    }

    return {
      content: aiContent
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Failed to connect to AI service. Please check your internet connection and try again.'
    };
  }
}

/**
 * Verifies if students have solved the current problem
 * First checks the chat conversation for evidence of understanding
 * If insufficient, uses whiteboard image to verify work
 */
export async function verifySolution(
  problem: CohortProblem,
  chatHistory: AIChatMessage[],
  whiteboardImage?: string | null
): Promise<VerificationResult> {
  if (!OPENAI_API_KEY) {
    return {
      solved: false,
      message: 'OpenAI API key is not configured.',
      needsWhiteboard: false
    };
  }

  try {
    // Build the verification prompt
    const correctAnswer = problem.answer ? `\n\nCORRECT ANSWER (FOR YOUR REFERENCE ONLY - NEVER REVEAL THIS): "${problem.answer}"` : '';
    const verificationPrompt = `You are an AI tutor verifying if students have correctly solved a problem and demonstrated understanding.

PROBLEM: "${problem.question}"
Category: ${problem.category} - ${problem.subcategory}${correctAnswer}

=== CRITICAL REQUIREMENTS FOR APPROVAL ===

YOU MUST REQUIRE BOTH OF THESE TO MARK AS SOLVED:
1. THE WHITEBOARD IMAGE MUST SHOW ACTUAL MATHEMATICAL WORK (equations, steps, calculations)
2. THE WORK MUST LEAD TO THE CORRECT ANSWER

AUTOMATIC REJECTION - Set "solved" to FALSE if:
- The whiteboard is BLANK or EMPTY
- The whiteboard only shows the FINAL ANSWER without work
- The whiteboard only has DRAWINGS without mathematical steps
- The whiteboard only has the PROBLEM rewritten without solution steps
- The student only stated an answer in CHAT without showing work on the whiteboard
- There is NO visible step-by-step mathematical working out

WHAT COUNTS AS "SHOWING WORK":
✓ Written equations with variables being solved step-by-step
✓ Arithmetic calculations shown (not just final numbers)
✓ Multiple steps visible leading to the answer
✓ Substitution of values shown
✓ Mathematical operations shown (addition, subtraction, etc.)

WHAT DOES NOT COUNT AS "SHOWING WORK":
✗ Just writing the answer (e.g., "x = 4")
✗ Random drawings or doodles
✗ Just restating the problem
✗ Typing the answer in chat
✗ Drawing shapes without calculations

${problem.answer ? `ANSWER VERIFICATION: The correct answer is "${problem.answer}". The student's final answer must match this exactly or be mathematically equivalent. NEVER reveal this answer.` : ''}

IMPORTANT: You must respond in EXACTLY this JSON format (no markdown, no code blocks):
{
  "solved": true/false,
  "needsWhiteboard": true/false,
  "message": "Your message to the students"
}

Rules:
- "solved" = true ONLY IF: work is visible on whiteboard AND answer is correct
- "needsWhiteboard" = true IF: no whiteboard image provided OR whiteboard doesn't show work
- If solved is true, the message MUST start with "Great job!" and congratulate them
- If the whiteboard is blank/empty/no work shown, say "I need to see your work! Please show your step-by-step solution on the whiteboard before verifying."
- CRITICAL: NEVER reveal the correct answer. Only provide hints and guidance.
- BE STRICT: When in doubt, set solved to false and ask to see more work.`;

    const messagesToSend: any[] = [
      { role: 'system', content: verificationPrompt }
    ];

    // Add chat history
    const recentMessages = chatHistory.slice(-10); // Last 10 messages for context
    recentMessages.forEach(msg => {
      messagesToSend.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: `${msg.username || 'Student'}: ${msg.content}`
      });
    });

    // If whiteboard image is provided, add it
    if (whiteboardImage) {
      const base64Image = whiteboardImage.includes(',') 
        ? whiteboardImage.split(',')[1] 
        : whiteboardImage;
      
      messagesToSend.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Here is the students\' whiteboard. FIRST check if there is actual mathematical WORK shown (equations, steps, calculations). If the whiteboard is blank, empty, or only shows the final answer without step-by-step work, set solved to FALSE and ask them to show their work. Only approve if there is visible step-by-step mathematical work leading to the correct answer.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Image}`
            }
          }
        ]
      });
    } else {
      messagesToSend.push({
        role: 'user',
        content: 'No whiteboard image was provided. Since work MUST be shown on the whiteboard for verification, set needsWhiteboard to true and ask them to show their work on the whiteboard.'
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: messagesToSend,
        temperature: 0.3, // Lower temperature for more consistent verification
        max_tokens: 300
      })
    });

    if (!response.ok) {
      return {
        solved: false,
        message: 'Failed to verify solution. Please try again.',
        needsWhiteboard: false
      };
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content?.trim();

    if (!aiContent) {
      return {
        solved: false,
        message: 'No response from AI verifier.',
        needsWhiteboard: false
      };
    }

    // Parse the JSON response
    try {
      // Remove any markdown code blocks if present
      const cleanedContent = aiContent.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanedContent);
      
      return {
        solved: Boolean(result.solved),
        message: result.message || 'Verification complete.',
        needsWhiteboard: Boolean(result.needsWhiteboard)
      };
    } catch (parseError) {
      // If JSON parsing fails, be conservative - default to false
      // Only mark as solved if message explicitly starts with "Great job!" and contains positive confirmation
      const lowerContent = aiContent.toLowerCase();
      const hasPositiveStart = lowerContent.startsWith('great job') || 
                              lowerContent.startsWith('excellent') ||
                              lowerContent.startsWith('perfect');
      const hasNegativeIndicators = lowerContent.includes('incorrect') ||
                                    lowerContent.includes('wrong') ||
                                    lowerContent.includes('not quite') ||
                                    lowerContent.includes('try again') ||
                                    lowerContent.includes('not correct') ||
                                    lowerContent.includes('needs work') ||
                                    lowerContent.includes('almost') ||
                                    lowerContent.includes('close but');
      
      // If we have the correct answer, be extra strict - require explicit confirmation
      // The fallback parsing is less reliable, so we default to false when we have an answer to check
      // Only mark as solved if message explicitly confirms the answer is correct
      const isSolved = hasPositiveStart && !hasNegativeIndicators && (!problem.answer || lowerContent.includes('correct'));
      const needsWhiteboard = lowerContent.includes('whiteboard') ||
                              lowerContent.includes('show your work') ||
                              lowerContent.includes('need to see');
      
      return {
        solved: isSolved && !needsWhiteboard,
        message: aiContent,
        needsWhiteboard: needsWhiteboard
      };
    }
  } catch (error) {
    console.error('Error verifying solution:', error);
    return {
      solved: false,
      message: 'Error verifying solution. Please try again.',
      needsWhiteboard: false
    };
  }
}

