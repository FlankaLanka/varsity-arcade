/**
 * Mock Teacher Account Data for Testing
 * 
 * This file provides sample teacher profile data for testing the teacher
 * account features before Firebase integration.
 */

import type { TeacherUserProfile } from '../types/user';

/**
 * Sample teacher profile for testing
 */
export const mockTeacherProfile: TeacherUserProfile = {
  id: 'teacher-001',
  username: 'MrSmith',
  avatar: undefined,
  accountType: 'teacher',
  friends: [],
  notifications: [],
  teacherProfile: {
    yearsOfExperience: 5,
    subjects: ['Mathematics', 'Physics'],
    bio: 'Experienced STEM educator passionate about making learning fun through interactive methods. I believe every student can excel with the right guidance and encouragement.',
    educationCredentials: [
      'M.S. Mathematics, Stanford University',
      'B.S. Physics, UC Berkeley',
      'Teaching Credential, California'
    ]
  }
};

/**
 * Additional mock teachers for testing multiple teacher scenarios
 */
export const mockTeachers: TeacherUserProfile[] = [
  mockTeacherProfile,
  {
    id: 'teacher-002',
    username: 'MsJohnson',
    avatar: undefined,
    accountType: 'teacher',
    friends: [],
    notifications: [],
    teacherProfile: {
      yearsOfExperience: 12,
      subjects: ['Chemistry', 'Biology', 'Environmental Science'],
      bio: 'Chemistry specialist with over a decade of experience teaching high school and college students. Love connecting scientific concepts to real-world applications.',
      educationCredentials: [
        'Ph.D. Chemistry, MIT',
        'B.S. Biochemistry, UCLA'
      ]
    }
  },
  {
    id: 'teacher-003',
    username: 'DrChen',
    avatar: undefined,
    accountType: 'teacher',
    friends: [],
    notifications: [],
    teacherProfile: {
      yearsOfExperience: 8,
      subjects: ['Computer Science', 'Mathematics'],
      bio: 'Former software engineer turned educator. I bring real industry experience to the classroom to prepare students for careers in tech.',
      educationCredentials: [
        'M.S. Computer Science, Carnegie Mellon',
        'B.S. Mathematics, University of Michigan'
      ]
    }
  }
];

/**
 * Get a mock teacher by ID
 */
export function getMockTeacher(id: string): TeacherUserProfile | undefined {
  return mockTeachers.find(teacher => teacher.id === id);
}

/**
 * Check if a user ID corresponds to a mock teacher
 */
export function isMockTeacher(id: string): boolean {
  return mockTeachers.some(teacher => teacher.id === id);
}

