import { z } from "zod";

export const createExam = z.object({
  body: z.object({
    collegeId: z.string(),
    code: z.string(),
    name: z.string(),
    examType: z.string(),
    scheduleDate: z.string(),
    duration: z.number().or(z.string().transform(Number)),
    courses: z.array(z.string()).optional().default([]),
    subjects: z.array(z.string()),
    totalMarks: z.number().or(z.string().transform(Number)),
    passingMarks: z.number().or(z.string().transform(Number)),
    gradingScheme: z.array(z.object({
      grade: z.string(),
      minMarks: z.number().or(z.string().transform(Number)),
      maxMarks: z.number().or(z.string().transform(Number)),
      gradePoint: z.number().or(z.string().transform(Number))
    })).optional().default([])
  })
});

export const enterMarks = z.object({
  body: z.object({
    studentId: z.string(),
    subjectId: z.string(),
    courseId: z.string(),
    batchId: z.string(),
    components: z.array(z.object({
      name: z.string(),
      maxMarks: z.number(),
      obtainedMarks: z.number(),
      weight: z.number().optional()
    })),
  })
});

export const bulkImportMarks = z.object({
  body: z.object({
    records: z.array(z.object({
      studentId: z.string(),
      subjectId: z.string(),
      components: z.array(z.object({
        name: z.string(),
        maxMarks: z.number(),
        obtainedMarks: z.number(),
        weight: z.number().optional()
      })),
    }))
  })
});

export const publishResults = z.object({
  params: z.object({
    examId: z.string(),
  })
});
