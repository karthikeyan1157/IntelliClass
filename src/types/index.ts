export type UserRole = 'student' | 'faculty' | 'hod' | 'admin';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  profileCompleted: boolean;
  createdAt: any;
}

export interface StudentProfile {
  name: string;
  regNo: string;
  year: string;
  department: string;
  dob: string;
  section: string;
  internalMarks?: {
    internal1?: number;
    internal2?: number;
  };
}

export interface FacultyProfile {
  name: string;
  facultyId: string;
  department: string;
  advisorOfClass: string;
}

export interface HodProfile {
  name: string;
  hodId: string;
  department: string;
  managedYears: string[];
}

export interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent';
  reason?: string;
  markedBy: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'fee' | 'bus' | 'general' | 'exam' | 'event';
  targetDept?: string;
  targetClass?: string;
  targetRole?: 'student' | 'faculty' | 'all';
  author: string;
  authorRole?: string;
  createdAt: any;
}

export interface UserDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: any;
}
