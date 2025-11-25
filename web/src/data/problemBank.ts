import type { CohortProblem } from '../types/cohort';

// Subject categories and their subcategories
export const SUBJECT_CATEGORIES = {
  Math: ['Algebra', 'Calculus', 'Basic Arithmetic'],
  English: ['Spelling', 'Grammar'],
  History: ['US History', 'World History'],
  'Open Canvas': [], // No subcategories - free drawing mode
} as const;

export type SubjectCategory = keyof typeof SUBJECT_CATEGORIES;
export type SubjectSubcategory<T extends SubjectCategory> = typeof SUBJECT_CATEGORIES[T][number];

// Problem bank organized by category and subcategory
const problemBank: Record<string, Record<string, CohortProblem[]>> = {
  Math: {
    Algebra: [
      {
        id: 'algebra-1',
        question: 'Solve for x: 2x + 5 = 13',
        category: 'Math',
        subcategory: 'Algebra',
        hint: 'Try isolating x by first subtracting 5 from both sides.',
      },
      {
        id: 'algebra-2',
        question: 'Solve for x: 3(x - 4) = 15',
        category: 'Math',
        subcategory: 'Algebra',
        hint: 'Start by distributing the 3, or divide both sides by 3 first.',
      },
      {
        id: 'algebra-3',
        question: 'Find the value of y: y/4 + 7 = 12',
        category: 'Math',
        subcategory: 'Algebra',
        hint: 'Subtract 7 from both sides first.',
      },
      {
        id: 'algebra-4',
        question: 'Solve the system: x + y = 10 and x - y = 4',
        category: 'Math',
        subcategory: 'Algebra',
        hint: 'Try adding the two equations together.',
      },
      {
        id: 'algebra-5',
        question: 'Factor the expression: x² + 5x + 6',
        category: 'Math',
        subcategory: 'Algebra',
        hint: 'Find two numbers that multiply to 6 and add to 5.',
      },
    ],
    Calculus: [
      {
        id: 'calc-1',
        question: 'Find the derivative of f(x) = 3x² + 2x - 5',
        category: 'Math',
        subcategory: 'Calculus',
        hint: 'Use the power rule: d/dx(xⁿ) = nxⁿ⁻¹',
      },
      {
        id: 'calc-2',
        question: 'Evaluate the integral: ∫(4x³)dx',
        category: 'Math',
        subcategory: 'Calculus',
        hint: 'Use the reverse power rule: add 1 to the exponent and divide.',
      },
      {
        id: 'calc-3',
        question: 'Find the limit: lim(x→2) (x² - 4)/(x - 2)',
        category: 'Math',
        subcategory: 'Calculus',
        hint: 'Try factoring the numerator.',
      },
      {
        id: 'calc-4',
        question: 'Find f\'(x) if f(x) = sin(2x)',
        category: 'Math',
        subcategory: 'Calculus',
        hint: 'Use the chain rule with the derivative of sin.',
      },
    ],
    'Basic Arithmetic': [
      {
        id: 'arith-1',
        question: 'Calculate: 347 + 289',
        category: 'Math',
        subcategory: 'Basic Arithmetic',
        hint: 'Try breaking it down: 347 + 300 - 11',
      },
      {
        id: 'arith-2',
        question: 'Calculate: 15 × 12',
        category: 'Math',
        subcategory: 'Basic Arithmetic',
        hint: 'Try 15 × 10 + 15 × 2',
      },
      {
        id: 'arith-3',
        question: 'What is 144 ÷ 12?',
        category: 'Math',
        subcategory: 'Basic Arithmetic',
        hint: 'Think: what times 12 equals 144?',
      },
      {
        id: 'arith-4',
        question: 'Calculate: 1000 - 347',
        category: 'Math',
        subcategory: 'Basic Arithmetic',
        hint: 'Try counting up from 347 to 1000.',
      },
      {
        id: 'arith-5',
        question: 'What is 25% of 80?',
        category: 'Math',
        subcategory: 'Basic Arithmetic',
        hint: '25% is the same as 1/4.',
      },
    ],
  },
  English: {
    Spelling: [
      {
        id: 'spell-1',
        question: 'Spell the word that means "the act of receiving": r_c_ _pt',
        category: 'English',
        subcategory: 'Spelling',
        hint: 'It has a silent "p" in it.',
      },
      {
        id: 'spell-2',
        question: 'Which is correct: "necessary" or "neccessary"?',
        category: 'English',
        subcategory: 'Spelling',
        hint: 'One collar (c) and two socks (ss).',
      },
      {
        id: 'spell-3',
        question: 'Complete the word: acco_ _odation',
        category: 'English',
        subcategory: 'Spelling',
        hint: 'Double "c" and double "m".',
      },
      {
        id: 'spell-4',
        question: 'Spell the opposite of "separate": t_g_th_r',
        category: 'English',
        subcategory: 'Spelling',
        hint: 'Think "to get her".',
      },
    ],
    Grammar: [
      {
        id: 'gram-1',
        question: 'Choose the correct word: "Their/There/They\'re going to the store."',
        category: 'English',
        subcategory: 'Grammar',
        hint: 'Which one is a contraction of "they are"?',
      },
      {
        id: 'gram-2',
        question: 'Fix the sentence: "Me and him went to school."',
        category: 'English',
        subcategory: 'Grammar',
        hint: 'Use subject pronouns before the verb.',
      },
      {
        id: 'gram-3',
        question: 'Which is correct: "less books" or "fewer books"?',
        category: 'English',
        subcategory: 'Grammar',
        hint: 'Use "fewer" for countable nouns.',
      },
    ],
  },
  History: {
    'US History': [
      {
        id: 'ush-1',
        question: 'In what year was the Declaration of Independence signed?',
        category: 'History',
        subcategory: 'US History',
        hint: 'It was during the American Revolution in the late 1700s.',
      },
      {
        id: 'ush-2',
        question: 'Who was the first President of the United States?',
        category: 'History',
        subcategory: 'US History',
        hint: 'He was also a general in the Revolutionary War.',
      },
      {
        id: 'ush-3',
        question: 'What was the main cause of the American Civil War?',
        category: 'History',
        subcategory: 'US History',
        hint: 'Think about the disagreement between Northern and Southern states.',
      },
      {
        id: 'ush-4',
        question: 'What year did World War II end for the United States?',
        category: 'History',
        subcategory: 'US History',
        hint: 'It was in the mid-1940s.',
      },
    ],
    'World History': [
      {
        id: 'wh-1',
        question: 'Which ancient civilization built the pyramids at Giza?',
        category: 'History',
        subcategory: 'World History',
        hint: 'They ruled along the Nile River.',
      },
      {
        id: 'wh-2',
        question: 'Who was the first Emperor of Rome?',
        category: 'History',
        subcategory: 'World History',
        hint: 'He was the adopted son of Julius Caesar.',
      },
      {
        id: 'wh-3',
        question: 'In what year did World War I begin?',
        category: 'History',
        subcategory: 'World History',
        hint: 'It started after an assassination in 1914.',
      },
    ],
  },
};

/**
 * Get a random problem from a specific category and subcategory
 * Returns null for "Open Canvas" category (no problems)
 */
export function getRandomProblem(category: string, subcategory: string): CohortProblem | null {
  // Open Canvas has no problems
  if (category === 'Open Canvas') return null;
  
  const categoryProblems = problemBank[category];
  if (!categoryProblems) return null;

  const subcategoryProblems = categoryProblems[subcategory];
  if (!subcategoryProblems || subcategoryProblems.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * subcategoryProblems.length);
  return subcategoryProblems[randomIndex];
}

/**
 * Get a random problem that is different from the current one
 * Returns null for "Open Canvas" category (no problems)
 */
export function getNextProblem(category: string, subcategory: string, currentProblemId?: string): CohortProblem | null {
  // Open Canvas has no problems
  if (category === 'Open Canvas') return null;
  
  const categoryProblems = problemBank[category];
  if (!categoryProblems) return null;

  const subcategoryProblems = categoryProblems[subcategory];
  if (!subcategoryProblems || subcategoryProblems.length === 0) return null;

  // Filter out the current problem
  const availableProblems = currentProblemId 
    ? subcategoryProblems.filter(p => p.id !== currentProblemId)
    : subcategoryProblems;

  // If no other problems available, return any problem
  if (availableProblems.length === 0) {
    const randomIndex = Math.floor(Math.random() * subcategoryProblems.length);
    return subcategoryProblems[randomIndex];
  }

  const randomIndex = Math.floor(Math.random() * availableProblems.length);
  return availableProblems[randomIndex];
}

/**
 * Get all problems for a category and subcategory
 */
export function getProblemsForSubject(category: string, subcategory: string): CohortProblem[] {
  return problemBank[category]?.[subcategory] ?? [];
}

